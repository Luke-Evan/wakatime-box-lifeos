import { getDisplayModeInfo, type DisplayMode } from "./display";
import type { Summary, SummaryEntry } from "./model";

/** Language of the fenced code block managed by this plugin. */
export const BOX_LANGUAGE = "wakatime";

/** How many rows are written into the box. */
export const MAX_ITEMS = 6;

/** Width of the bar chart, counted in full block characters. */
export const BAR_WIDTH = 20;

const OPEN_FENCE = "```" + BOX_LANGUAGE;
const CLOSE_FENCE = "```";
const FULL_BLOCK = "\u2588";
const EMPTY_BLOCK = "\u2591";
const PARTIAL_BLOCKS = ["\u2591", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"];
const BOX_PATTERN = /```wakatime[^\r\n]*\r?\n[\s\S]*?```/;
const COLUMN_GAP = "     ";
/** Characters that take two columns in a monospace font (CJK and friends). */
const WIDE_CHARACTER = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

/**
 * Renders the fenced code block that is written into the daily note.
 * Falls back to a short placeholder when WakaTime has no data for the day.
 */
export function renderWakaTimeBox(summary: Summary | undefined, mode: DisplayMode, maxItems: number = MAX_ITEMS): string {
	const info = getDisplayModeInfo(mode);
	const day = summary?.data?.[0];
	const items = (day ? info.pick(day) : [])
		.filter((item) => (item.total_seconds ?? 0) > 0)
		.slice(0, maxItems);

	const lines: string[] = [OPEN_FENCE];
	if (items.length === 0) {
		lines.push(`No ${info.noun} activity`, CLOSE_FENCE);
		return lines.join("\n");
	}

	const nameWidth = widest(items, (item) => displayWidth(item.name));
	const durationWidth = widest(items, (item) => item.text.length);
	const percentWidth = widest(items, (item) => formatPercent(item.percent).length);

	for (const item of items) {
		const name = padEndWide(item.name, nameWidth);
		const duration = item.text.padEnd(durationWidth, " ");
		const percent = formatPercent(item.percent).padStart(percentWidth, " ");
		lines.push([name, duration, renderBar(item.percent), percent + " %"].join(COLUMN_GAP));
	}
	lines.push(CLOSE_FENCE);
	return lines.join("\n");
}

/**
 * Replaces the existing box in a note, or appends one when the note has none.
 * Returns the note unchanged when nothing has to be written.
 */
export function withWakaTimeBox(content: string, box: string): string {
	if (BOX_PATTERN.test(content)) {
		// A replacer function keeps "$" sequences inside the box literal.
		return content.replace(BOX_PATTERN, () => box);
	}
	const trimmed = content.trimEnd();
	return trimmed.length === 0 ? box + "\n" : `${trimmed}\n\n${box}\n`;
}

/** Text bar chart, for example "████████░░░░░░░░░░░░". */
export function renderBar(percent: number, size: number = BAR_WIDTH): string {
	const clamped = Math.min(100, Math.max(0, percent));
	const fraction = Math.floor((size * 8 * clamped) / 100);
	const full = Math.floor(fraction / 8);
	if (full >= size) {
		return FULL_BLOCK.repeat(size);
	}
	const partial = PARTIAL_BLOCKS[fraction % 8] ?? EMPTY_BLOCK;
	return (FULL_BLOCK.repeat(full) + partial).padEnd(size, EMPTY_BLOCK);
}

export function formatPercent(percent: number): string {
	return (Number.isFinite(percent) ? percent : 0).toFixed(1);
}

/** Column width of a string, counting CJK characters as two columns. */
export function displayWidth(text: string): number {
	let width = 0;
	for (const character of text) {
		width += WIDE_CHARACTER.test(character) ? 2 : 1;
	}
	return width;
}

function padEndWide(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - displayWidth(text)));
}

function widest(items: SummaryEntry[], measure: (item: SummaryEntry) => number): number {
	return items.reduce((max, item) => Math.max(max, measure(item)), 0);
}