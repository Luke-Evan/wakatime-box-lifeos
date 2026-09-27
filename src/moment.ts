import * as obsidian from "obsidian";

/**
 * The subset of moment this plugin uses.
 *
 * Obsidian re-exports moment, but its types are only available when the
 * `moment` package happens to be resolvable. Declaring the surface we rely
 * on keeps every call site fully typed in any environment (editor, build,
 * reviewers' tooling).
 */
export interface MomentLike {
	format(spec?: string): string;
	isValid(): boolean;
	subtract(amount: number, unit: string): MomentLike;
}

export interface MomentCreator {
	(input?: string, format?: string, strict?: boolean): MomentLike;
}

export const moment = (obsidian as unknown as { moment: MomentCreator }).moment;
