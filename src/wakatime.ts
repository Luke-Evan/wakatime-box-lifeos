import { normalizePath, requestUrl } from "obsidian";
import type { DataAdapter, RequestUrlResponse } from "obsidian";
import { TOKEN_URL } from "./constants";
import type { Summary } from "./model";

const SUMMARIES_URL = "https://wakatime.com/api/v1/users/current/summaries";

/** A cached response is reused for one hour, matching the automatic refresh interval. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * OAuth access tokens carry this prefix, so the shape of the stored value tells
 * us which auth scheme WakaTime expects. Everything else is treated as the
 * legacy API key that only WakaTime's own plugins may still use for writes.
 */
const OAUTH_TOKEN_PREFIX = "waka_tok_";

/** How the token travels in the request. OAuth reads use Bearer, API keys use Basic. */
type AuthScheme = "bearer" | "basic";

/** Any failure of the WakaTime API, with the HTTP status when there was one. */
export class WakaTimeError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "WakaTimeError";
		this.status = status;
	}
}

export interface SummaryResult {
	summary: Summary;
	fromCache: boolean;
}

/**
 * Talks to the WakaTime API and keeps the last response of every day in a
 * small on-disk cache, so restarting Obsidian does not hit the API again.
 */
export class WakaTimeClient {
	/** Scheme that worked last time, so the fallback is only tried once. */
	private scheme?: AuthScheme;

	constructor(private readonly adapter: DataAdapter, private readonly cacheDir: string) {}

	/**
	 * Returns the summary of one day ("YYYY-MM-DD"), from the cache when it is
	 * fresh enough, otherwise from the API. Throws a {@link WakaTimeError}.
	 */
	async getSummary(token: string, date: string, force = false): Promise<SummaryResult> {
		if (!force) {
			const cached = await this.readCache(date);
			if (cached) {
				return { summary: cached, fromCache: true };
			}
		}
		const summary = await this.requestSummary(token, date);
		await this.writeCache(date, summary);
		return { summary, fromCache: false };
	}

	/**
	 * WakaTime reads need an OAuth access token; API keys are refused for stats
	 * since they are meant to be write-only. The token shape decides which
	 * scheme is tried first, and the other one gets a single chance as well, so
	 * a token pasted in either format works.
	 */
	private async requestSummary(token: string, date: string): Promise<Summary> {
		const url = `${SUMMARIES_URL}?start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}`;
		let failure: WakaTimeError | undefined;
		for (const scheme of this.schemesFor(token)) {
			try {
				return await this.requestWith(url, token, scheme);
			} catch (error) {
				const next = toWakaTimeError(error);
				if (!isAuthFailure(next.status)) {
					throw next;
				}
				// Keep the first failure: it describes the scheme that fits the token.
				failure ??= next;
			}
		}
		throw failure ?? new WakaTimeError("the WakaTime request failed");
	}

	private async requestWith(url: string, token: string, scheme: AuthScheme): Promise<Summary> {
		const response = await requestUrl({
			url,
			method: "GET",
			// The token travels in a header instead of the query string.
			headers: {
				Authorization: authHeader(token, scheme),
				Accept: "application/json",
			},
			throw: false,
		});
		if (response.status !== 200) {
			throw new WakaTimeError(describeStatus(response.status, serverMessage(response)), response.status);
		}
		this.scheme = scheme;
		return response.json as Summary;
	}

	private schemesFor(token: string): AuthScheme[] {
		const preferred = this.scheme ?? (token.startsWith(OAUTH_TOKEN_PREFIX) ? "bearer" : "basic");
		return preferred === "bearer" ? ["bearer", "basic"] : ["basic", "bearer"];
	}

	private cachePath(date: string): string {
		return normalizePath(`${this.cacheDir}/${date}.json`);
	}

	private async readCache(date: string): Promise<Summary | undefined> {
		const path = this.cachePath(date);
		try {
			if (!(await this.adapter.exists(path))) {
				return undefined;
			}
			const stat = await this.adapter.stat(path);
			if (!stat?.mtime || Date.now() - stat.mtime > CACHE_TTL_MS) {
				return undefined;
			}
			return JSON.parse(await this.adapter.read(path)) as Summary;
		} catch (error) {
			console.warn(`WakaTime Box: ignoring unreadable cache file ${path}`, error);
			return undefined;
		}
	}

	private async writeCache(date: string, summary: Summary): Promise<void> {
		const path = this.cachePath(date);
		try {
			if (!(await this.adapter.exists(this.cacheDir))) {
				await this.adapter.mkdir(this.cacheDir);
			}
			await this.adapter.write(path, JSON.stringify(summary));
		} catch (error) {
			console.warn(`WakaTime Box: could not write cache file ${path}`, error);
		}
	}
}

function authHeader(token: string, scheme: AuthScheme): string {
	return scheme === "bearer" ? `Bearer ${token}` : `Basic ${toBase64(token)}`;
}

function isAuthFailure(status: number | undefined): boolean {
	return status === 401 || status === 403;
}

function describeStatus(status: number, detail?: string): string {
	const suffix = detail ? ` WakaTime says: ${detail}` : "";
	switch (status) {
		case 401:
			return `WakaTime rejected the token (401). Copy your personal OAuth token again from ${TOKEN_URL}.${suffix}`;
		case 403:
			return (
				"WakaTime refused the request (403). " +
				`API keys can only send activity, so paste a personal OAuth token from ${TOKEN_URL}.${suffix}`
			);
		case 429:
			return `the WakaTime rate limit was reached (429). Try again later.${suffix}`;
		default:
			return `the WakaTime API returned status ${status}.${suffix}`;
	}
}

/** Pulls the human readable reason out of an error body, when the API sent one. */
function serverMessage(response: RequestUrlResponse): string | undefined {
	let body: unknown;
	try {
		body = response.json;
	} catch {
		return undefined;
	}
	if (typeof body !== "object" || body === null) {
		return undefined;
	}
	const record = body as { error?: unknown; errors?: unknown };
	if (typeof record.error === "string" && record.error.trim().length > 0) {
		return sentence(record.error);
	}
	if (Array.isArray(record.errors)) {
		const joined = record.errors.filter((entry): entry is string => typeof entry === "string").join(" ");
		return joined.trim().length > 0 ? sentence(joined) : undefined;
	}
	return undefined;
}

/** Normalizes whitespace and drops the trailing period the API likes to add. */
function sentence(text: string): string {
	const collapsed = text.replace(/\s+/g, " ").trim();
	return collapsed.endsWith(".") ? collapsed.slice(0, -1) : collapsed;
}

function toWakaTimeError(error: unknown): WakaTimeError {
	if (error instanceof WakaTimeError) {
		return error;
	}
	const status = extractStatus(error);
	if (status !== undefined) {
		return new WakaTimeError(describeStatus(status), status);
	}
	const message = error instanceof Error ? error.message : String(error);
	return new WakaTimeError(message.trim() || "the WakaTime request failed");
}

/** Obsidian rejects failed requests with an error that carries the HTTP status. */
function extractStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null) {
		return undefined;
	}
	const status = (error as { status?: unknown }).status;
	return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}

/** WakaTime expects the raw API key, base64 encoded, after "Basic ". */
function toBase64(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}
