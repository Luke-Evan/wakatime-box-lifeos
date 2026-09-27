import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
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

export class WakaTimeBoxSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: WakaTimeBoxPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("p", {
			text: "Writes your WakaTime stats into the LifeOS daily note of the same day. The note is refreshed " +
				"once per hour and whenever LifeOS creates today's note. Sync immediately with the buttons below, " +
				"or bind hotkeys to the refresh commands in Obsidian's hotkeys settings.",
		});

		new Setting(containerEl)
			.setName("WakaTime API key")
			.setDesc("It is stored in this vault only.")
			.addText((text) => {
				text.setPlaceholder("Enter your API key");
				text.setValue(this.plugin.settings.apiKey);
				void text.onChange(async (value) => {
					this.plugin.settings.apiKey = value.trim();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Display data")
			.setDesc(`WakaTime breakdown written into the note, up to ${MAX_ITEMS} rows.`)
			.addDropdown((dropdown) => {
				for (const mode of DISPLAY_MODES) {
					dropdown.addOption(mode.value, mode.label);
				}
				dropdown.setValue(this.plugin.settings.displayMode);
				void dropdown.onChange(async (value) => {
					this.plugin.settings.displayMode = isDisplayMode(value) ? value : DEFAULT_DISPLAY_MODE;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Sync now")
			.setDesc("Fetch the latest stats from WakaTime and update the daily note right away.")
			.addButton((button) => {
				button.setButtonText("Today").onClick(() => this.plugin.syncToday());
			})
			.addButton((button) => {
				button.setButtonText("Yesterday").onClick(() => this.plugin.syncYesterday());
			});

		new Setting(containerEl)
			.setName("LifeOS daily note")
			.setDesc(this.plugin.describeDailyNoteTarget());
	}
}
