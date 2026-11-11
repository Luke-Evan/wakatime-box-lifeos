import { PluginSettingTab } from "obsidian";
import type { App, SettingDefinition } from "obsidian";
import { TOKEN_URL } from "./constants";
import { DEFAULT_DISPLAY_MODE, DISPLAY_MODES, isDisplayMode, type DisplayMode } from "./display";
import { MAX_ITEMS } from "./render";
import type WakaTimeBoxPlugin from "./main";

export interface WakaTimeBoxSettings {
	/** WakaTime personal OAuth token (or a legacy API key), stored in the vault's plugin data. */
	token: string;
	/** Which WakaTime breakdown is written into the daily note. */
	displayMode: DisplayMode;
}

export const DEFAULT_SETTINGS: WakaTimeBoxSettings = {
	token: "",
	displayMode: DEFAULT_DISPLAY_MODE,
};

/**
 * Merges the persisted data with the defaults and drops values this version of
 * the plugin does not understand, so a stale `data.json` can never break it.
 */
export function normalizeSettings(data: unknown): WakaTimeBoxSettings {
	const stored = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
	return {
		// "apiKey" is the name 1.2.0 and older used for the same field.
		token: firstText(stored.token, stored.apiKey),
		displayMode: isDisplayMode(stored.displayMode) ? stored.displayMode : DEFAULT_SETTINGS.displayMode,
	};
}

/** First non-empty string of the candidates, so renamed fields keep working. */
function firstText(...candidates: unknown[]): string {
	for (const candidate of candidates) {
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate.trim();
		}
	}
	return DEFAULT_SETTINGS.token;
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
				name: "WakaTime OAuth token",
				desc:
					"WakaTime only lets API keys send activity, so reading your stats needs a personal OAuth token from " +
					`${TOKEN_URL}. It is stored in this vault only.`,
				aliases: ["api key", "token", "secret"],
				control: {
					type: "text",
					key: "token",
					placeholder: "waka_tok_...",
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

	/** Keeps stored values sane: trim the token, ignore unknown display modes. */
	setControlValue(key: string, value: unknown): void | Promise<void> {
		if (key === "token" && typeof value === "string") {
			value = value.trim();
		}
		if (key === "displayMode" && !isDisplayMode(value)) {
			return;
		}
		return super.setControlValue(key, value);
	}
}
