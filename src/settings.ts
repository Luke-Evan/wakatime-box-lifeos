import { PluginSettingTab } from "obsidian";
import type { App, SettingDefinition } from "obsidian";
import { DEFAULT_DISPLAY_MODE, DISPLAY_MODES, isDisplayMode, type DisplayMode } from "./display";
import { MAX_ITEMS } from "./render";
import type WakaTimeBoxPlugin from "./main";

export interface WakaTimeBoxSettings {
	/** WakaTime API key, stored in the vault's plugin data. */
	apiKey: string;
	/** Which WakaTime breakdown is written into the daily note. */
	displayMode: DisplayMode;
}

export const DEFAULT_SETTINGS: WakaTimeBoxSettings = {
	apiKey: "",
	displayMode: DEFAULT_DISPLAY_MODE,
};

/**
 * Merges the persisted data with the defaults and drops values this version of
 * the plugin does not understand, so a stale `data.json` can never break it.
 */
export function normalizeSettings(data: unknown): WakaTimeBoxSettings {
	const stored = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
	const apiKey = typeof stored.apiKey === "string" ? stored.apiKey.trim() : DEFAULT_SETTINGS.apiKey;
	return {
		apiKey,
		displayMode: isDisplayMode(stored.displayMode) ? stored.displayMode : DEFAULT_SETTINGS.displayMode,
	};
}

/**
 * The settings tab, defined declaratively: Obsidian renders the rows, indexes
 * them in the global settings search, and persists control values for us.
 */
export class WakaTimeBoxSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: WakaTimeBoxPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinition[] {
		return [
			{
				name: "How it works",
				desc: "Writes your WakaTime stats into the LifeOS daily note of the same day. The note is " +
					"refreshed once per hour and whenever LifeOS creates today's note. Bind hotkeys to the " +
					"refresh commands in Obsidian's hotkeys settings to sync with a single key press.",
			},
			{
				name: "WakaTime API key",
				desc: "It is stored in this vault only.",
				aliases: ["token", "secret"],
				control: {
					type: "text",
					key: "apiKey",
					placeholder: "Enter your API key",
				},
			},
			{
				name: "Display data",
				desc: `WakaTime breakdown written into the note, up to ${MAX_ITEMS} rows.`,
				control: {
					type: "dropdown",
					key: "displayMode",
					options: Object.fromEntries(DISPLAY_MODES.map((mode) => [mode.value, mode.label])),
					defaultValue: DEFAULT_DISPLAY_MODE,
				},
			},
			{
				name: "Sync now",
				desc: "Fetch the latest stats from WakaTime and update the daily note right away.",
				render: (setting) => {
					setting.addButton((button) => {
						button.setButtonText("Today").onClick(() => this.plugin.syncToday());
					});
					setting.addButton((button) => {
						button.setButtonText("Yesterday").onClick(() => this.plugin.syncYesterday());
					});
				},
			},
			{
				name: "LifeOS daily note",
				desc: this.plugin.describeDailyNoteTarget(),
			},
		];
	}

	/** Keeps stored values sane: trim the key, ignore unknown display modes. */
	setControlValue(key: string, value: unknown): void | Promise<void> {
		if (key === "apiKey" && typeof value === "string") {
			value = value.trim();
		}
		if (key === "displayMode" && !isDisplayMode(value)) {
			return;
		}
		return super.setControlValue(key, value);
	}
}
