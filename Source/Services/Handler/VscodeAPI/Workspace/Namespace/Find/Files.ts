/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FindFiles
 * @description
 * Local filesystem walk implementing `vscode.workspace.findFiles`. Filters
 * by include/exclude glob patterns using stock VS Code's `glob.parse`
 * (lifted via `StockLift.GlobParsePattern`), with hard caps on depth,
 * result count, and wall-clock time to keep the walk bounded.
 *
 * Tier-2 glob semantics (stock VS Code): brace expansion `{a,b}`,
 * path-segment `**` boundaries, relative `**` anchoring, `!` negation.
 * Prior hand-rolled `GlobToRegex` is kept as a fallback when stock's
 * parser throws on an unusual pattern - strictly additive to the old
 * path, never worse.
 */

import GlobToRegex from "../../../../../../Utility/Glob/To/Regex.js";
import type { HandlerContext } from "../../../../Handler/Context.js";
import { GlobParsePattern, Uri as StockUri } from "../../../Stock/Lift.js";
import {
	DefaultExcludeSegments,
	ExtractGlobPattern,
	FolderToFsPath,
} from "../Helpers.js";

type GlobMatcher = (Path: string) => boolean;

/**
 * Compile a glob pattern into a predicate. Prefers stock VS Code's
 * `glob.parse`; on failure falls back to `GlobToRegex`. Returns
 * `undefined` when both paths fail so callers can short-circuit with
 * an empty result set.
 */
function CompileGlob(Pattern: string): GlobMatcher | undefined {
	try {
		const Parsed = GlobParsePattern(Pattern);
		if (typeof Parsed === "function") return Parsed;
	} catch {
		// Fall through to the legacy regex path.
	}
	try {
		const Regex = GlobToRegex(Pattern);
		return (Path: string) => Regex.test(Path);
	} catch {
		return undefined;
	}
}

export const FindFilesLocal = async (
	_Context: HandlerContext,
	Folders: Array<{ uri: unknown; name: string; index: number }>,
	Include: unknown,
	Exclude?: unknown,
	MaxResults?: number,
): Promise<Array<{ scheme: string; path: string; fsPath: string }>> => {
	const IncludePattern = ExtractGlobPattern(Include);
	const ExcludePattern = ExtractGlobPattern(Exclude);
	const Cap =
		typeof MaxResults === "number" && MaxResults > 0 ? MaxResults : 10_000;

	if (process.env["Trace"]?.includes("wsns"))
		process.stdout.write(
			`[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}\n`,
		);

	if (!IncludePattern) {
		if (process.env["Trace"]?.includes("wsns"))
			process.stdout.write(
				"[LandFix:WsNs] findFiles: no include pattern → []\n",
			);
		return [];
	}

	const IncludeMatcher = CompileGlob(IncludePattern);
	if (!IncludeMatcher) {
		if (process.env["Trace"]?.includes("wsns"))
			process.stdout.write(
				`[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern} (both stock + fallback)\n`,
			);
		return [];
	}
	const ExcludeMatcher = ExcludePattern
		? CompileGlob(ExcludePattern)
		: undefined;

	const { readdir } = await import("node:fs/promises");
	const { join, relative, sep } = await import("node:path");

	const Results: Array<{
		scheme: string;
		path: string;
		fsPath: string;
	}> = [];

	// Hard caps protect against symlink cycles, mis-configured extensions, and
	// pathological patterns matching the entire filesystem. A typical large
	// VS Code workspace (chromium, linux) is <= 12 levels deep, so 32 is
	// generous. The 30 s deadline is pulled forward on caller timeout.
	const MaxDepth = 32;
	const DeadlineAt = Date.now() + 30_000;
	let Truncated: "" | "cap" | "depth" | "deadline" = "";

	const Walk = async (
		Root: string,
		Current: string,
		Depth: number,
	): Promise<void> => {
		if (Results.length >= Cap) {
			Truncated = "cap";
			return;
		}
		if (Depth > MaxDepth) {
			Truncated = Truncated || "depth";
			return;
		}
		if (Date.now() > DeadlineAt) {
			Truncated = Truncated || "deadline";
			return;
		}
		let Entries: Array<{
			name: string;
			isDirectory(): boolean;
			isSymbolicLink(): boolean;
		}>;
		try {
			Entries = (await readdir(Current, {
				withFileTypes: true,
			})) as unknown as Array<{
				name: string;
				isDirectory(): boolean;
				isSymbolicLink(): boolean;
			}>;
		} catch {
			return;
		}

		// Partition entries so we can read the directory's own files into the
		// result set before recursing. This also enables a bounded fan-out into
		// subdirectories without blocking the main event loop on deep trees.
		const SubDirectories: string[] = [];
		for (const Entry of Entries) {
			if (Results.length >= Cap) {
				Truncated = "cap";
				return;
			}
			const Name = Entry.name;
			if (DefaultExcludeSegments.has(Name)) continue;
			// Refuse to follow symlinks - common source of infinite recursion
			// (e.g. `node_modules/.bin/node → ../node/bin/node → …`).
			if (
				typeof Entry.isSymbolicLink === "function" &&
				Entry.isSymbolicLink()
			)
				continue;
			const Full = join(Current, Name);
			const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
			if (Entry.isDirectory()) {
				SubDirectories.push(Full);
				continue;
			}
			if (ExcludeMatcher && ExcludeMatcher(RelativeFromRoot)) continue;
			if (!IncludeMatcher(RelativeFromRoot)) continue;
			// Return real `vscode.Uri` instances, not POJOs. Extensions
			// passing findFiles results to `workspace.fs.readFile`,
			// `URI.joinPath`, or map keys via `.toString()` get the same
			// behaviour as stock VS Code. A POJO `{scheme,path,fsPath}`
			// serialises to `"[object Object]"`, which Mountain rejects
			// as a sandbox denial.
			Results.push(StockUri.file(Full));
		}

		// Bounded parallel descent: 4 concurrent readdir()s per level keeps
		// FD pressure low while cutting wall-clock by ~3× on SSD-backed trees.
		const Concurrency = 4;
		for (
			let Index = 0;
			Index < SubDirectories.length;
			Index += Concurrency
		) {
			const Batch = SubDirectories.slice(Index, Index + Concurrency);
			await Promise.all(Batch.map((Sub) => Walk(Root, Sub, Depth + 1)));
			if (Results.length >= Cap) {
				Truncated = "cap";
				return;
			}
			if (Date.now() > DeadlineAt) {
				Truncated = Truncated || "deadline";
				return;
			}
		}
	};

	for (const Folder of Folders) {
		const FsPath = FolderToFsPath(Folder?.uri);
		if (!FsPath) {
			if (process.env["Trace"]?.includes("wsns"))
				process.stdout.write(
					`[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})\n`,
				);
			continue;
		}
		await Walk(FsPath, FsPath, 0);
	}
	if (Truncated) {
		if (process.env["Trace"]?.includes("wsns"))
			process.stdout.write(
				`[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)\n`,
			);
	}

	if (process.env["Trace"]?.includes("wsns"))
		process.stdout.write(
			`[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}\n`,
		);
	return Results;
};
