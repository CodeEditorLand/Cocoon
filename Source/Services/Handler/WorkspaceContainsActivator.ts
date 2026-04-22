/**
 * @module Handler/WorkspaceContainsActivator
 * @description
 * Re-activation pass for extensions that declared `workspaceContains:<glob>`
 * in their `activationEvents`. Fires whenever Mountain dispatches
 * `$deltaWorkspaceFolders`: for every newly-added folder, scan each
 * registered extension's activation events and match the folder contents
 * against the declared globs. A match triggers `$activateByEvent` with the
 * specific `workspaceContains:<glob>` event so the extension activates
 * against the fresh workspace.
 *
 * Without this pass, `vscode.npm`, `vscode.eslint`, and every
 * language-features extension silently stay dormant after Open Folder, even
 * though the user's workspace contains `package.json` or a source file the
 * extension declares interest in. The boot-time `*` activation burst covers
 * `activationEvents: ["*"]` but not the workspace-bound triggers.
 *
 * Matching is cheap: plain filenames like `package.json` or `pyproject.toml`
 * use a single `stat` via Mountain's `FileSystem.Stat`; glob patterns fall
 * back to a bounded `findFiles` with `cap=1`. The scan runs on the next
 * event-loop tick so the notification handler returns immediately.
 */

import GlobToRegex from "../../Utility/GlobToRegex.js";
import type { HandlerContext } from "./HandlerContext.js";

type WorkspaceFolderWire = {
	uri?: string;
	name?: string;
	index?: number;
};

const WORKSPACE_CONTAINS_PREFIX = "workspaceContains:";

/**
 * Strip `file://` from a workspace folder URI to get a filesystem path. Mirrors
 * the helper in WorkspaceNamespace - kept local to avoid circular imports.
 */
const UriToFsPath = (Uri: unknown): string | undefined => {
	const Raw =
		typeof Uri === "string"
			? Uri
			: ((Uri as Record<string, unknown>)?.["fsPath"] ??
				(Uri as Record<string, unknown>)?.["path"] ??
				(Uri as Record<string, unknown>)?.["external"]);
	if (typeof Raw !== "string" || Raw.length === 0) return undefined;
	if (Raw.startsWith("file:")) {
		try {
			return decodeURIComponent(new URL(Raw).pathname);
		} catch {
			return Raw.replace(/^file:\/\//, "");
		}
	}
	return Raw;
};

/**
 * Check whether the given glob matches at least one entry in the workspace
 * folder. Plain filenames (no `*`, `?`, `[`) fast-path via a single stat;
 * everything else recurses through `readdir` with hard caps to avoid
 * pathological patterns. Returns the first hit and stops.
 */
const FolderContainsGlob = async (
	FsPath: string,
	Glob: string,
): Promise<boolean> => {
	const { stat, readdir } = await import("node:fs/promises");
	const { join, relative, sep } = await import("node:path");

	// Fast-path: literal file probe. Most of VS Code's shipped
	// workspaceContains triggers are plain names (`package.json`,
	// `Cargo.toml`, `pyproject.toml`, `requirements.txt`, …).
	const IsLiteral = !/[*?[\]]/.test(Glob);
	if (IsLiteral) {
		try {
			await stat(join(FsPath, Glob));
			return true;
		} catch {
			return false;
		}
	}

	// Glob path. Compile once, walk bounded.
	let Matcher: RegExp;
	try {
		Matcher = GlobToRegex(Glob);
	} catch {
		return false;
	}
	const ExcludeSegments = new Set([
		".git",
		"node_modules",
		".astro",
		".next",
		".cache",
		".turbo",
		"Target",
		"target",
		"dist",
		"out",
		"build",
	]);
	const MaxDepth = 8; // workspaceContains rarely needs to reach deep
	const DeadlineAt = Date.now() + 1_500;

	const Walk = async (Current: string, Depth: number): Promise<boolean> => {
		if (Depth > MaxDepth) return false;
		if (Date.now() > DeadlineAt) return false;
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
			return false;
		}
		const SubDirs: string[] = [];
		for (const Entry of Entries) {
			const Name = Entry.name;
			if (ExcludeSegments.has(Name)) continue;
			if (
				typeof Entry.isSymbolicLink === "function" &&
				Entry.isSymbolicLink()
			)
				continue;
			const Full = join(Current, Name);
			const Rel = relative(FsPath, Full).split(sep).join("/");
			if (Matcher.test(Rel)) return true;
			if (Entry.isDirectory()) SubDirs.push(Full);
		}
		for (const Sub of SubDirs) {
			if (await Walk(Sub, Depth + 1)) return true;
		}
		return false;
	};

	return Walk(FsPath, 0);
};

const GetActivationEvents = (Extension: unknown): string[] => {
	const Events = (Extension as { activationEvents?: unknown })
		?.activationEvents;
	return Array.isArray(Events)
		? (Events.filter((E) => typeof E === "string") as string[])
		: [];
};

const GetWorkspaceContainsGlobs = (Extension: unknown): string[] =>
	GetActivationEvents(Extension)
		.filter((Event) => Event.startsWith(WORKSPACE_CONTAINS_PREFIX))
		.map((Event) => Event.slice(WORKSPACE_CONTAINS_PREFIX.length))
		.filter((Glob) => Glob.length > 0);

/**
 * Run the workspaceContains activation pass against the freshly-added folders.
 *
 * For every extension that declares at least one `workspaceContains:<glob>`
 * trigger, check each glob against each new folder. The first match fires
 * `$activateByEvent` via the existing ExtensionHostHandler. Already-active
 * extensions are a no-op in that handler, so we don't need to dedupe here -
 * the single-activation guard inside `ActivateExtension` covers it.
 */
export const ActivateWorkspaceContainsExtensions = async (
	Context: HandlerContext,
	AddedFolders: WorkspaceFolderWire[],
): Promise<void> => {
	if (AddedFolders.length === 0) return;

	const FolderPaths = AddedFolders.map((Folder) => ({
		FsPath: UriToFsPath(Folder?.uri),
		Uri: Folder?.uri ?? "",
	})).filter(
		(Record): Record is { FsPath: string; Uri: string } =>
			typeof Record.FsPath === "string" && Record.FsPath.length > 0,
	);
	if (FolderPaths.length === 0) return;

	// Snapshot the registry so a concurrent $deltaExtensions doesn't race.
	const Extensions: Array<{ Identifier: string; Globs: string[] }> = [];
	for (const [Identifier, Extension] of Context.ExtensionRegistry.entries()) {
		const Globs = GetWorkspaceContainsGlobs(Extension);
		if (Globs.length === 0) continue;
		if (Context.ActivatedExtensions.has(Identifier)) continue;
		Extensions.push({ Identifier, Globs });
	}
	if (Extensions.length === 0) {
		try {
			process.stdout.write(
				"[LandFix:Activator] No pending workspaceContains extensions; skipping scan.\n",
			);
		} catch {}
		return;
	}

	// Lazy-load ExtensionHostHandler to avoid a circular import with the
	// handler suite - NotificationHandler imports this module at load time.
	const { default: ExtensionHostHandler } = await import(
		"./ExtensionHostHandler.js"
	);

	let ActivationCount = 0;
	for (const { Identifier, Globs } of Extensions) {
		let MatchingGlob: string | undefined;
		let MatchingFolder: string | undefined;
		for (const Folder of FolderPaths) {
			for (const Glob of Globs) {
				// eslint-disable-next-line no-await-in-loop
				if (await FolderContainsGlob(Folder.FsPath, Glob)) {
					MatchingGlob = Glob;
					MatchingFolder = Folder.FsPath;
					break;
				}
			}
			if (MatchingGlob) break;
		}
		if (!MatchingGlob) continue;

		try {
			process.stdout.write(
				`[LandFix:Activator] workspaceContains match: extension=${Identifier} glob=${MatchingGlob} folder=${MatchingFolder}\n`,
			);
		} catch {}

		try {
			// eslint-disable-next-line no-await-in-loop
			await ExtensionHostHandler.HandleActivateByEvent(Context, {
				activationEvent: `${WORKSPACE_CONTAINS_PREFIX}${MatchingGlob}`,
			});
			ActivationCount += 1;
		} catch (CaughtError: unknown) {
			const Message =
				CaughtError instanceof globalThis.Error
					? CaughtError.message
					: String(CaughtError);
			try {
				process.stdout.write(
					`[LandFix:Activator] activate failed for ${Identifier}: ${Message}\n`,
				);
			} catch {}
		}
	}

	try {
		process.stdout.write(
			`[LandFix:Activator] Pass complete: ${ActivationCount} extension(s) activated against ${FolderPaths.length} folder(s).\n`,
		);
	} catch {}
};

export default ActivateWorkspaceContainsExtensions;
