/**
 * @module Services/DevLog
 * @description
 * Cocoon-side tag-filtered logger. Mirrors Mountain's `dev_log!` macro:
 * reads `Trace=tag1,tag2,...` at startup and only emits lines
 * whose tag is in that set (or `all` / `short`).
 *
 * Output goes to `process.stdout`. Mountain captures Cocoon's stdout
 * into its own dev-log file under `[Cocoon stdout] ...` so
 * `Trace=config-prime tail -f Mountain.dev.log` shows Cocoon's
 * tagged lines alongside Mountain's own `dev_log!` output.
 *
 * ## Usage
 *
 *     import { CocoonDevLog } from "./Log.js";
 *     CocoonDevLog("config-prime", `prepopulate ext=${Id} seeded=${N}`);
 *
 * ## When NOT to use
 *
 * For unconditional stdout that should always appear (e.g.
 * `[LandFix:Bootstrap] Stage X OK`), keep using bare `process.stdout`.
 * The tag gate is for diagnostic streams that would otherwise flood
 * the log.
 */

const Raw = process.env["Trace"] ?? "";

const ParsedTags = Raw.split(",")
	.map((Segment) => Segment.trim().toLowerCase())
	.filter((Segment) => Segment.length > 0);

const TagSet = new Set(ParsedTags);

const IsShort = TagSet.has("short");

const HasAll = TagSet.has("all");

const IsEnabled = (Tag: string): boolean => {

	if (TagSet.size === 0) return false;

	if (HasAll || IsShort) return true;

	return TagSet.has(Tag.toLowerCase());
};

/**
 * Emit a tagged diagnostic line to stdout. Silent when the tag isn't
 * enabled via `Trace`. Line format matches Mountain's
 * `[DEV:<TAG>]` prefix so grep patterns work across both sources.
 */
export const CocoonDevLog = (Tag: string, Message: string): void => {

	if (!IsEnabled(Tag)) return;

	const TagUpper = Tag.toUpperCase();

	process.stdout.write(`[DEV:${TagUpper}] ${Message}\n`);
};

export default CocoonDevLog;
