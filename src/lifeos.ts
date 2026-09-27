import { moment, normalizePath, TFile } from "obsidian";
import type { App } from "obsidian";

/** Plugin id of LifeOS (https://github.com/quanru/obsidian-lifeos). */
export const LIFEOS_PLUGIN_ID = "periodic-para";
export const LIFEOS_URL = "https://github.com/quanru/obsidian-lifeos";

const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
const DEFAULT_PERIODIC_NOTES_PATH = "PeriodicNotes";

/** The subset of the LifeOS settings this plugin reads. */
export interface LifeOsSettings {
	usePeriodicNotes?: boolean;
	periodicNotesPath?: string;
	dailyNoteFormat?: string;
}

interface PluginsApi {
	getPlugin(id: string): { settings?: LifeOsSettings } | undefined;
}

interface AppWithPlugins extends App {
	plugins?: PluginsApi;
}

/**
 * Resolves the LifeOS daily note of a given day.
 *
 * LifeOS stores daily notes as
 * `<periodic notes path>/<YYYY>/Daily/<MM>/<daily note format>.md`, which is
 * mirrored here so the box can be written without LifeOS having to expose an
 * API. Settings are read on every call, so changes in LifeOS apply at once.
 */
export class LifeOsDailyNotes {
	constructor(private readonly app: App) {}

	/** Settings of the LifeOS plugin, or undefined when it is not enabled. */
	getSettings(): LifeOsSettings | undefined {
		return (this.app as AppWithPlugins).plugins?.getPlugin(LIFEOS_PLUGIN_ID)?.settings;
	}

	/** Vault relative path of the daily note, or undefined when LifeOS cannot provide one. */
	getDailyNotePath(date: string): string | undefined {
		const settings = this.getSettings();
		if (!settings?.usePeriodicNotes) {
			return undefined;
		}
		const day = moment(date, "YYYY-MM-DD", true);
		if (!day.isValid()) {
			return undefined;
		}
		const root = settings.periodicNotesPath?.trim() || DEFAULT_PERIODIC_NOTES_PATH;
		const format = settings.dailyNoteFormat?.trim() || DEFAULT_DAILY_NOTE_FORMAT;
		const folder = `${root}/${day.format("YYYY")}/Daily/${day.format("MM")}`;
		return normalizePath(`${folder}/${day.format(format)}.md`);
	}

	/** The daily note file, or undefined when LifeOS has not created it yet. */
	getDailyNote(date: string): TFile | undefined {
		const path = this.getDailyNotePath(date);
		if (!path) {
			return undefined;
		}
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? file : undefined;
	}

	/**
	 * Explains what still has to be set up in LifeOS, or undefined when
	 * everything this plugin needs is in place.
	 */
	getProblem(): string | undefined {
		const settings = this.getSettings();
		if (!settings) {
			return `the LifeOS plugin is not enabled. Install and enable LifeOS first: ${LIFEOS_URL}`;
		}
		if (!settings.usePeriodicNotes) {
			return 'enable "Periodic Notes" in the LifeOS settings';
		}
		if (!this.getDailyNotePath(moment().format("YYYY-MM-DD"))) {
			return 'check the "Periodic Notes" path in the LifeOS settings';
		}
		return undefined;
	}
}