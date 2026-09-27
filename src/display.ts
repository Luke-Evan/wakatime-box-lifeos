import type { DailySummary, SummaryEntry } from "./model";

/**
 * The WakaTime breakdown that gets written into the daily note.
 * Every value maps to a list of {@link SummaryEntry} in the API response, so
 * supporting one more breakdown only means adding one entry to
 * {@link DISPLAY_MODE_INFO}.
 */
export type DisplayMode = "projects" | "languages" | "editors" | "categories";

export interface DisplayModeInfo {
	value: DisplayMode;
	/** Label shown in the settings dropdown. */
	label: string;
	/** Singular noun used in messages, for example "No editor activity". */
	noun: string;
	/** Picks the matching list out of one day of WakaTime data. */
	pick: (day: DailySummary) => SummaryEntry[];
}

const DISPLAY_MODE_INFO: Record<DisplayMode, DisplayModeInfo> = {
	projects: {
		value: "projects",
		label: "Projects",
		noun: "project",
		pick: (day) => day.projects ?? [],
	},
	languages: {
		value: "languages",
		label: "Languages",
		noun: "language",
		pick: (day) => day.languages ?? [],
	},
	editors: {
		value: "editors",
		label: "Editors",
		noun: "editor",
		pick: (day) => day.editors ?? [],
	},
	categories: {
		value: "categories",
		label: "Categories",
		noun: "category",
		pick: (day) => day.categories ?? [],
	},
};

/** All supported modes, in the order they are offered in the settings. */
export const DISPLAY_MODES: DisplayModeInfo[] = Object.values(DISPLAY_MODE_INFO);

export const DEFAULT_DISPLAY_MODE: DisplayMode = "projects";

export function getDisplayModeInfo(mode: DisplayMode): DisplayModeInfo {
	return DISPLAY_MODE_INFO[mode];
}

/** Guards settings that were written by an older (or newer) version of the plugin. */
export function isDisplayMode(value: unknown): value is DisplayMode {
	return typeof value === "string" && Object.prototype.hasOwnProperty.call(DISPLAY_MODE_INFO, value);
}