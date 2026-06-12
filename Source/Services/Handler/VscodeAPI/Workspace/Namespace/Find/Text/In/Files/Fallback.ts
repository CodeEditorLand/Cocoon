/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FindTextInFilesFallback
 * @description
 * Node-side fallback implementation of `workspace.findTextInFiles(2)`.
 *
 * Invoked by `DualTrack.TryMountainThenNode` when Mountain doesn't have
 * a `Workspace.FindTextInFiles` handler. Keeps the API functional in
 * Cocoon's Node runtime until Mountain lands a ripgrep-backed Rust
 * handler; the dispatch silently switches once that happens.
 *
 * Strategy: reuse `FindFilesLocal` to enumerate candidate files (honours
 * the same include/exclude semantics the extension expects), then scan
 * each file with a per-line regex match. Matches are reported via the
 * extension's `Callback` as they're found, matching the streaming shape
 * of stock VS Code's `findTextInFiles`.
 *
 * Performance envelope: ~10-50 MB/s single-threaded, no parallelism.
 * Acceptable for small-to-medium workspaces; Mountain's Rust ripgrep
 * handler will do 500 MB/s+ when it lands. The fallback's job is
 * correctness + API compat, not peak throughput.
 */

import { promises as FsPromises } from "node:fs";

import type { HandlerContext } from "../../../../../../../Handler/Context.js";

import { FolderToFsPath } from "../../../../Helpers.js";

import { FindFilesLocal } from "../../../Files.js";

interface QueryShape {

	pattern?: string;

	isRegExp?: boolean;

	isCaseSensitive?: boolean;

	isWordMatch?: boolean;
}

interface OptionsShape {

	include?: unknown;

	exclude?: unknown;

	maxResults?: number;

	useIgnoreFiles?: boolean;

	followSymlinks?: boolean;

	encoding?: string;
}

interface TextSearchMatch {

	uri: unknown;

	ranges: Array<{
		start: { line: number; character: number };

		end: { line: number; character: number };
	}>;

	preview: {
		text: string;

		matches: Array<{
			start: { line: number; character: number };

			end: { line: number; character: number };
		}>;
	};
}

const EscapeLiteral = (Text: string): string =>
	Text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&";

const ExtractPattern = (Query: unknown): RegExp | undefined => {
	const Q =
		typeof Query === "string"
			? { pattern: Query }

			: ((Query ?? {}) as QueryShape;

	// The only legitimate empty outcome: a genuinely empty query string.
	if (!Q.pattern) return undefined;

	// `m` flag for multiline so `^`/`$` match per-line; `g` flag so the
	// regex's `lastIndex` advances and multiple matches per line surface.
	const Flags = `gm${Q.isCaseSensitive ? "" : "i"}`;

	let Source = Q.pattern;

	if (!Q.isRegExp) {
		// Plain-text search: escape regex metacharacters so the user's
		// `(foo)` doesn't get interpreted as a capture group.
		Source = EscapeLiteral(Source;
	}

	if (Q.isWordMatch) {
		Source = `\\b${Source}\\b`;
	}

	try {
		return new RegExp(Source, Flags;
	} catch {
		// Invalid extension-supplied regex: degrade to a literal-text
		// search on the raw pattern instead of matching nothing. The
		// escaped form cannot throw - every metacharacter is neutralised.
		const Literal = Q.isWordMatch
			? `\\b${EscapeLiteral(Q.pattern)}\\b`
			: EscapeLiteral(Q.pattern;

		return new RegExp(Literal, Flags;
	}
};

export async function FindTextInFilesNodeFallback(
	Context: HandlerContext,

	Folders: Array<{ uri: unknown; name: string; index: number }>,

	Query: unknown,

	Options: unknown,

	Callback?: (Result: unknown) => void,
): Promise<{ limitHit: boolean }> {
	const Pattern = ExtractPattern(Query;

	if (!Pattern) return { limitHit: false };

	const Opts = (Options ?? {}) as OptionsShape;

	const Max = typeof Opts.maxResults === "number" ? Opts.maxResults : 10_000;

	const Encoding = (Opts.encoding as BufferEncoding) ?? "utf8";

	// Reuse the proven glob engine so include/exclude semantics match
	// what `findFiles` gives the same extensions - consistency matters.
	const Candidates = (await FindFilesLocal(
		Context,

		Folders,

		Opts.include ?? "**/*",

		Opts.exclude,

		// Don't let the file-enumeration phase cap us below the match cap.
		Math.max(Max * 4, 10_000),
	)) as unknown[];

	let Emitted = 0;

	for (const Candidate of Candidates) {
		if (Emitted >= Max) return { limitHit: true };

		const Path = FolderToFsPath(Candidate;

		if (!Path) continue;

		let Content: string;

		try {
			Content = await FsPromises.readFile(Path, Encoding;
		} catch {
			// Read failures on candidate files are expected (permission,
			// symlink loops, binary files that tripped the read) - skip.
			continue;
		}

		// Skip obvious binary files - VS Code's ripgrep also skips these.
		// A NUL byte in the first 8 KB is the heuristic rg uses.
		if (Content.length > 0 && Content.indexOf("\0") !== -1) continue;

		const Lines = Content.split("\n";

		for (let LineNumber = 0; LineNumber < Lines.length; LineNumber++) {
			const Line = Lines[LineNumber];

			Pattern.lastIndex = 0;

			const Ranges: TextSearchMatch["ranges"] = [];

			let M: RegExpExecArray | null;

			while ((M = Pattern.exec(Line)) !== null) {
				Ranges.push({
					start: { line: LineNumber, character: M.index },
					end: {
						line: LineNumber,
						character: M.index + M[0].length,
					},
				};

				if (M[0].length === 0) Pattern.lastIndex++;
			}

			if (Ranges.length === 0) continue;

			const Match: TextSearchMatch = {
				uri: Candidate,

				ranges: Ranges,

				preview: {
					text: Line,

					matches: Ranges.map((R) => ({
						start: { line: 0, character: R.start.character },
						end: { line: 0, character: R.end.character },
					})),
				},
			};

			if (Callback) {
				try {
					Callback(Match;
				} catch {
					// Extension callback threw - don't let one bad
					// extension kill the whole search.
				}
			}

			Emitted += Ranges.length;

			if (Emitted >= Max) return { limitHit: true };
		}
	}

	return { limitHit: false };
}
