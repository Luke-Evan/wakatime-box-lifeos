import { normalizePath, requestUrl } from "obsidian";
import type { DataAdapter } from "obsidian";
import { API_KEY_URL } from "./constants";
import type { Summary } from "./model";

const SUMMARIES_URL = "https://wakatime.com/api/v1/users/current/summaries";

/** A cached response is reused for one hour, matching the automatic refresh interval. */
const CACHE_TTL_MS = 60 * 60 * 1000;

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
	constructor(private readonly adapter: DataAdapter, private readonly cacheDir: string) {}

	/**
	 * Returns the summary of one day ("YYYY-MM-DD"), from the cache when it is
	 * fresh enough, otherwise from the API. Throws a {@link WakaTimeError}.
	 */
	async getSummary(apiKey: string, date: string, force = false): Promise<SummaryResult> {
		if (!force) {
			const cached = await this.readCache(date);
			if (cached) {
				return { summary: cached, fromCache: true };
			}
		}
		const summary = await this.requestSummary(apiKey, date);
		await this.writeCache(date, summary);
		return { summary, fromCache: false };
	}

	private async requestSummary(apiKey: string, date: string): Promise<Summary> {
		const url = `${SUMMARIES_URL}?start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}`;
		try {
			const response = await requestUrl({
				url,
				method: "GET",
				// The API key travels in a header instead of the query string.
				headers: {
					Authorization: `Basic ${toBase64(apiKey)}`,
					Accept: "application/json",
				},
				throw: false,
			});
			if (response.status !== 200) {
				throw new WakaTimeError(describeStatus(response.status), response.status);
			}
			return response.json as Summary;
		} catch (error) {
			throw toWakaTimeError(error);
		}
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

function describeStatus(status: number): string {
	switch (status) {
		case 401:
			return `WakaTime rejected the API key (401). Copy it again from ${API_KEY_URL}`;
		case 403:
			return `WakaTime refused the request (403). Check the API key in the plugin settings`;
		case 429:
			return "the WakaTime rate limit was reached (429). Try again later";
		default:
			return `the WakaTime API returned status ${status}`;
	}
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