import { moment, normalizePath, Notice, Plugin, TFile } from "obsidian";
import { API_KEY_URL, DATE_FORMAT, NOTICE_PREFIX, REFRESH_INTERVAL_MS } from "./constants";
import { DatePromptModal } from "./dateModal";
import { LifeOsDailyNotes } from "./lifeos";
import type { Summary } from "./model";
import { renderWakaTimeBox, withWakaTimeBox } from "./render";
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
	WakaTimeBoxSettingTab,
	type WakaTimeBoxSettings,
} from "./settings";
import { WakaTimeClient, WakaTimeError } from "./wakatime";

/**
 * Writes the WakaTime stats of a day into the LifeOS daily note of that day.
 *
 * LifeOS owns the periodic notes: it decides where they live and creates them.
 * This plugin only looks up the note of the day and keeps the fenced
 * `wakatime` code block inside it up to date.
 */
export default class WakaTimeBoxPlugin extends Plugin {
	settings: WakaTimeBoxSettings = DEFAULT_SETTINGS;
	private lifeOs!: LifeOsDailyNotes;
	private wakaTime!: WakaTimeClient;

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.lifeOs = new LifeOsDailyNotes(this.app);
		this.wakaTime = new WakaTimeClient(
			this.app.vault.adapter,
			normalizePath(`${this.app.vault.configDir}/plugins/${this.manifest.id}/cache`),
		);

		this.addSettingTab(new WakaTimeBoxSettingTab(this.app, this));
		this.registerCommands();

		this.app.workspace.onLayoutReady(() => this.start());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Describes the note that is updated right now. Shown in the settings tab. */
	describeDailyNoteTarget(): string {
		const problem = this.lifeOs.getProblem();
		if (problem) {
			return `Not ready: ${problem}.`;
		}
		return `Today: ${this.lifeOs.getDailyNotePath(today()) ?? "unknown"}`;
	}

	private registerCommands(): void {
		this.addCommand({
			id: "refresh-today",
			name: "Refresh today's stats",
			callback: () => this.syncToday(),
		});
		this.addCommand({
			id: "refresh-yesterday",
			name: "Refresh yesterday's stats",
			callback: () => this.syncYesterday(),
		});
		this.addCommand({
			id: "copy-stats-for-date",
			name: "Copy the stats of any date to the clipboard",
			callback: () => this.copyStatsForDate(),
		});
	}

	private start(): void {
		// LifeOS creates today's note lazily, so the box is filled as soon as it appears.
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				const date = today();
				if (this.lifeOs.getDailyNotePath(date) === file.path) {
					void this.refresh(date, false);
				}
			}),
		);

		this.registerInterval(
			window.setInterval(() => {
				void this.refresh(today(), false);
			}, REFRESH_INTERVAL_MS),
		);

		const problem = this.readinessProblem();
		if (problem) {
			new Notice(`${NOTICE_PREFIX}${problem}`, 10000);
			return;
		}
		void this.refresh(today(), false);
	}

	/** Re-fetches today's stats and updates today's note right away. */
	syncToday(): void {
		void this.refresh(today(), true);
	}

	/** Re-fetches yesterday's stats and updates yesterday's note right away. */
	syncYesterday(): void {
		void this.refresh(yesterday(), true);
	}

	/** Fetches one day ("YYYY-MM-DD") and updates the matching LifeOS daily note. */
	async refresh(date: string, manual: boolean): Promise<void> {
		const problem = this.readinessProblem();
		if (problem) {
			if (manual) {
				new Notice(`${NOTICE_PREFIX}${problem}`, 10000);
			}
			return;
		}

		try {
			const { summary, fromCache } = await this.wakaTime.getSummary(this.settings.apiKey, date, manual);
			await this.updateDailyNote(date, summary, fromCache, manual);
		} catch (error) {
			if (manual) {
				this.notifyError(error);
			} else {
				console.warn(`WakaTime Box: ${describeError(error)}`);
			}
		}
	}

	private async updateDailyNote(date: string, summary: Summary, fromCache: boolean, manual: boolean): Promise<void> {
		const path = this.lifeOs.getDailyNotePath(date);
		if (!path) {
			const problem = this.lifeOs.getProblem() ?? "the LifeOS daily note path could not be resolved";
			if (manual) {
				new Notice(`${NOTICE_PREFIX}${problem}`, 10000);
			}
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			// Normal while LifeOS has not created the note yet; the create event picks it up later.
			if (manual) {
				new Notice(`${NOTICE_PREFIX}daily note not found: ${path}. Open the note in LifeOS first.`, 10000);
			}
			return;
		}

		const box = renderWakaTimeBox(summary, this.settings.displayMode);
		let changed = false;
		await this.app.vault.process(file, (content) => {
			const next = withWakaTimeBox(content, box);
			changed = next !== content;
			return next;
		});

		if (manual || changed) {
			new Notice(`${NOTICE_PREFIX}${file.basename} ${changed ? "updated" : "is up to date"}`, 4000);
		}
	}

	private copyStatsForDate(): void {
		if (!this.settings.apiKey) {
			new Notice(`${NOTICE_PREFIX}add your WakaTime API key in the plugin settings (${API_KEY_URL}).`, 10000);
			return;
		}
		new DatePromptModal(this.app, (date) => {
			void this.copyStats(date);
		}).open();
	}

	private async copyStats(date: string): Promise<void> {
		try {
			const { summary } = await this.wakaTime.getSummary(this.settings.apiKey, date, true);
			const box = renderWakaTimeBox(summary, this.settings.displayMode);
			const clipboard = navigator.clipboard as Clipboard | undefined;
			if (!clipboard) {
				new Notice(`${NOTICE_PREFIX}the clipboard is not available on this platform.`, 10000);
				return;
			}
			await clipboard.writeText(box);
			new Notice(`${NOTICE_PREFIX}stats of ${date} copied to the clipboard`, 4000);
		} catch (error) {
			this.notifyError(error);
		}
	}

	/** What still has to be configured before the plugin can do its job. */
	private readinessProblem(): string | undefined {
		if (!this.settings.apiKey) {
			return `add your WakaTime API key in the plugin settings (${API_KEY_URL}).`;
		}
		const problem = this.lifeOs.getProblem();
		return problem ? `${problem}.` : undefined;
	}

	private notifyError(error: unknown): void {
		const message = describeError(error);
		console.error(`WakaTime Box: ${message}`, error);
		new Notice(`${NOTICE_PREFIX}${message}`, 10000);
	}
}

function describeError(error: unknown): string {
	if (error instanceof WakaTimeError || error instanceof Error) {
		return error.message;
	}
	return String(error);
}

function today(): string {
	return moment().format(DATE_FORMAT);
}

function yesterday(): string {
	return moment().subtract(1, "day").format(DATE_FORMAT);
}