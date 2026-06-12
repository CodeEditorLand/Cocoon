/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/Helpers
 * @description
 * Shared utilities for the WorkspaceNamespace shim: event subscription helper,
 * generic gRPC call wrapper, default exclude segments, glob-pattern extraction,
 * folder URI → fs-path conversion, and workspace folder resolution.
 */

import type { HandlerContext } from "../../../Handler/Context.js";

/**
 * Curried helper that subscribes a listener to a named event on
 * `Context.WorkspaceEventEmitter` and returns a disposable.
 */
export const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {

		Context.WorkspaceEventEmitter.on(EventName, Listener;

		return {
			dispose: () => {
				Context.WorkspaceEventEmitter.removeListener(
					EventName,

					Listener,
				;
			},
		};
	};

/**
 * Fire a `sendRequest` on the Mountain client, swallowing any error and
 * returning `undefined` instead so callers never have to guard individually.
 */
export const Call = async <T>(
	Context: HandlerContext,

	Method: string,

	Parameters: unknown,
): Promise<T | undefined> => {
	try {
		return (await Context.MountainClient?.sendRequest(
			Method,

			Parameters,
		)) as T | undefined;
	} catch {
		return undefined;
	}
};

// Directories that nearly every extension wants excluded from `findFiles`. The
// stub previously returned `[]`, which was conservative but broke
// `npm.hasPackageJson`, TS tsconfig discovery, and a handful of others. Now we
// walk the workspace ourselves; these prefixes keep the walk bounded.
export const DefaultExcludeSegments = new Set([
	".git",

	"node_modules",

	".astro",

	".next",

	".nuxt",

	".cache",

	".turbo",

	".pnpm",

	"Target",

	"target",

	"dist",

	"out",

	"build",

	".DS_Store",
];

/**
 * Normalise VS Code's GlobPattern overloads to a plain string. Accepts a raw
 * string, a RelativePattern-shaped object, or a Uri-shaped object. We only
 * need the pattern - base resolution is handled by the workspace walk.
 */
export const ExtractGlobPattern = (Raw: unknown): string | undefined => {
	if (typeof Raw === "string" && Raw.length > 0) return Raw;

	if (Raw && typeof Raw === "object") {
		const Obj = Raw as Record<string, unknown>;

		if (typeof Obj["pattern"] === "string") return Obj["pattern"] as string;

		if (typeof Obj["glob"] === "string") return Obj["glob"] as string;
	}

	return undefined;
};

/**
 * Strip `file://` from a workspace-folder URI (string or UriComponents-ish
 * object) to get a filesystem path we can walk with `fs.readdir`.
 */
export const FolderToFsPath = (FolderUri: unknown): string | undefined => {
	const Raw =
		typeof FolderUri === "string"
			? FolderUri
			: ((FolderUri as Record<string, unknown>)?.["fsPath"] ??
				(FolderUri as Record<string, unknown>)?.["path"] ??
				(FolderUri as Record<string, unknown>)?.["external"];

	if (typeof Raw !== "string" || Raw.length === 0) return undefined;

	if (Raw.startsWith("file:")) {
		try {
			return decodeURIComponent(new URL(Raw).pathname;
		} catch {
			return Raw.replace(/^file:\/\//, "";
		}
	}

	return Raw;
};

export type WorkspaceFolderRecord = {
	uri: unknown;

	name: string;

	index: number;

	FsPath?: string;
};

export const ResolveWorkspaceFolders = (
	Context: HandlerContext,
): WorkspaceFolderRecord[] => {
	const InitWorkspace = (Context.ExtensionHostInitData?.workspace ??
		Context.ExtensionHostInitData?.workspaceData ??
		{}) as {
		folders?: Array<{ uri: unknown; name: string; index: number }>;
	};

	return (InitWorkspace.folders ?? []).map(
		(Folder): WorkspaceFolderRecord => {
			const FsPath = FolderToFsPath(Folder?.uri;

			const Record: WorkspaceFolderRecord = { ...Folder };

			if (typeof FsPath === "string") Record.FsPath = FsPath;

			return Record;
		},
	;
};
