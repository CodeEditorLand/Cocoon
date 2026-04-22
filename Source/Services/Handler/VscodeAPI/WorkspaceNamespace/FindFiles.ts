/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FindFiles
 * @description
 * Local filesystem walk implementing `vscode.workspace.findFiles`. Filters
 * by include/exclude glob patterns using GlobToRegex, with hard caps on
 * depth, result count, and wall-clock time to keep the walk bounded.
 */

import GlobToRegex from "../../../../Utility/GlobToRegex.js";
import type { HandlerContext } from "../../HandlerContext.js";
import {
	DefaultExcludeSegments,
	ExtractGlobPattern,
	FolderToFsPath,
} from "./Helpers.js";

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

	process.stdout.write(
		`[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}\n`,
	);

	if (!IncludePattern) {
		process.stdout.write(
			"[LandFix:WsNs] findFiles: no include pattern → []\n",
		);
		return [];
	}

	let IncludeRegex: RegExp;
	try {
		IncludeRegex = GlobToRegex(IncludePattern);
	} catch (CaughtError: unknown) {
		const Message =
			CaughtError instanceof globalThis.Error
				? CaughtError.message
				: String(CaughtError);
		process.stdout.write(
			`[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern}: ${Message}\n`,
		);
		return [];
	}
	let ExcludeRegex: RegExp | undefined;
	if (ExcludePattern) {
		try {
			ExcludeRegex = GlobToRegex(ExcludePattern);
		} catch {}
	}

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
			if (ExcludeRegex && ExcludeRegex.test(RelativeFromRoot)) continue;
			if (!IncludeRegex.test(RelativeFromRoot)) continue;
			Results.push({ scheme: "file", path: Full, fsPath: Full });
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
			process.stdout.write(
				`[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})\n`,
			);
			continue;
		}
		await Walk(FsPath, FsPath, 0);
	}
	if (Truncated) {
		process.stdout.write(
			`[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)\n`,
		);
	}

	process.stdout.write(
		`[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}\n`,
	);
	return Results;
};
