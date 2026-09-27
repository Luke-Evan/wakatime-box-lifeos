/**
 * Types for the WakaTime Summaries API.
 * https://wakatime.com/developers#get-summaries
 */

/**
 * One row of a WakaTime breakdown.
 * Projects, languages, editors, categories, operating systems and dependencies
 * all share this shape.
 */
export interface SummaryEntry {
	name: string;
	/** Human readable duration, for example "3 hrs 12 mins". */
	text: string;
	/** Duration as "H:MM:SS". */
	digital: string;
	/** Duration in decimal hours, for example "3.21". */
	decimal: string;
	total_seconds: number;
	hours: number;
	minutes: number;
	seconds: number;
	/** Share of the day in percent, for example 42.5. */
	percent: number;
}

export interface ProjectEntry extends SummaryEntry {
	color?: string | null;
}

export interface MachineEntry extends SummaryEntry {
	machine_name_id: string;
}

export interface GrandTotal {
	text: string;
	digital: string;
	decimal: string;
	total_seconds: number;
	hours: number;
	minutes: number;
}

/** The day a {@link DailySummary} belongs to. */
export interface DateRange {
	date: string;
	start: string;
	end: string;
	text: string;
	timezone: string;
}

/** Every breakdown WakaTime reports for a single day. */
export interface DailySummary {
	categories: SummaryEntry[];
	dependencies: SummaryEntry[];
	editors: SummaryEntry[];
	languages: SummaryEntry[];
	machines: MachineEntry[];
	operating_systems: SummaryEntry[];
	projects: ProjectEntry[];
	grand_total: GrandTotal;
	range: DateRange;
}

export interface CumulativeTotal {
	decimal: string;
	digital: string;
	seconds: number;
	text: string;
}

export interface DailyAverage {
	days_including_holidays: number;
	days_minus_holidays: number;
	holidays: number;
	seconds: number;
	seconds_including_other_language: number;
	text: string;
	text_including_other_language: string;
}

/** Response body of GET /api/v1/users/current/summaries. */
export interface Summary {
	cumulative_total: CumulativeTotal;
	daily_average: DailyAverage;
	data: DailySummary[];
	start: string;
	end: string;
}