import { Modal, Notice, Setting } from "obsidian";
import { moment } from "./moment";
import type { App } from "obsidian";
import { DATE_FORMAT, NOTICE_PREFIX } from "./constants";

/** Asks for a single day and hands the validated date to {@link onSubmit}. */
export class DatePromptModal extends Modal {
	private date = moment().format(DATE_FORMAT);

	constructor(app: App, private readonly onSubmit: (date: string) => void) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText("WakaTime Box");
		this.contentEl.createEl("p", {
			text: "Fetch one day of WakaTime stats and copy the box to the clipboard.",
		});

		new Setting(this.contentEl)
			.setName("Date")
			.setDesc(`Format: ${DATE_FORMAT}`)
			.addText((text) => {
				text.setValue(this.date);
				text.onChange((value) => {
					this.date = value.trim();
				});
				text.inputEl.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						this.submit();
					}
				});
			});

		new Setting(this.contentEl).addButton((button) => {
			button.setButtonText("Copy stats").setCta().onClick(() => this.submit());
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		const parsed = moment(this.date, DATE_FORMAT, true);
		if (!parsed.isValid()) {
			new Notice(`${NOTICE_PREFIX}use the date format ${DATE_FORMAT}.`, 5000);
			return;
		}
		this.close();
		this.onSubmit(parsed.format(DATE_FORMAT));
	}
}