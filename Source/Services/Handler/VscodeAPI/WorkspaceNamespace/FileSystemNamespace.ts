/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FileSystemNamespace
 * @description
 * Builds the `workspace.fs` sub-namespace. Operations route via two tiers
 * per `FileSystemRoute::Route(uri)`:
 *
 *   Tier A (native) - Cocoon's own `fs.promises` backend. Taken when the
 *                     scheme is `file://` AND no extension has claimed
 *                     the `file` scheme via `registerFileSystemProvider`.
 *                     Zero Mountain round-trip. ~0.3 ms.
 *   Tier C (mountain) - every other scheme OR `file://` after a custom
 *                       FS provider claimed it. Forwards to Mountain's
 *                       `FileSystem.*` gRPC effects. ~3-15 ms.
 *
 * Every call emits a `[DEV:FS-ROUTE]` stdout line (read by Mountain's
 * `[DEV:COCOON]` stdout tail) so the tier distribution can be verified
 * empirically against any workload.
 *
 * Errors shape: Tier A translates Node `ENOENT` to VS Code's
 * `FileSystemError.FileNotFound` so extensions' `instanceof` /
 * `.code === "FileNotFound"` checks work identically in both tiers.
 */

import { promises as FsPromises } from "node:fs";
import { dirname as PathDirname } from "node:path";

import type { HandlerContext } from "../../HandlerContext.js";
import { ToUri as StockToUri } from "../StockLift.js";
import {
	ExtractFsPath,
	ExtractScheme,
	Route,
	type FileSystemRoute,
} from "./FileSystemRoute.js";
import { Call } from "./Helpers.js";

/**
 * Serialise any URI shape - real `vscode.Uri` instance, UriComponents
 * POJO, plain string - into the canonical `scheme://authority/path`
 * string Mountain's handlers expect.
 *
 * `String(uri)` returns `"[object Object]"` when `uri` is a POJO
 * without a custom `toString`. Built-in extensions (findFiles results
 * hydrated by the workbench, `workspace.fs.stat(uri)` calls with wire
 * UriComponents, etc.) sometimes pass such POJOs into the shim - the
 * PostHog `[object Object]` sandbox denials in the last run trace
 * directly to this.
 *
 * Resolution order:
 *   1. Real `vscode.Uri` instance → `.toString()` (mangler-safe, handles
 *      percent-encoding and slash normalisation).
 *   2. POJO with `scheme` → hydrate via `StockLift.ToUri` then
 *      `.toString()`.
 *   3. Plain string that looks like a URL → return verbatim.
 *   4. Path string starting with `/` → prefix with `file://`.
 *   5. Anything else → `String(value)` (last-resort; won't panic but
 *      Mountain will reject "[object Object]" with a clear error).
 */
const UriToString = (Value: unknown): string => {
	if (Value == null) return "";
	if (typeof Value === "string") {
		if (Value.startsWith("/")) return `file://${Value}`;
		return Value;
	}
	if (typeof Value === "object") {
		const WithToString = Value as { toString?: () => string };
		if (
			typeof WithToString.toString === "function" &&
			WithToString.toString !== Object.prototype.toString
		) {
			const Rendered = WithToString.toString();
			if (Rendered && Rendered !== "[object Object]") return Rendered;
		}
		const Hydrated = StockToUri(Value);
		if (Hydrated) return Hydrated.toString();
		const WithParts = Value as {
			scheme?: unknown;
			authority?: unknown;
			path?: unknown;
			query?: unknown;
			fragment?: unknown;
			fsPath?: unknown;
		};
		if (typeof WithParts.scheme === "string") {
			const Scheme = WithParts.scheme;
			const Authority =
				typeof WithParts.authority === "string"
					? WithParts.authority
					: "";
			const PathPart =
				typeof WithParts.path === "string" ? WithParts.path : "";
			const Query =
				typeof WithParts.query === "string" &&
				WithParts.query.length > 0
					? `?${WithParts.query}`
					: "";
			const Fragment =
				typeof WithParts.fragment === "string" &&
				WithParts.fragment.length > 0
					? `#${WithParts.fragment}`
					: "";
			return `${Scheme}://${Authority}${PathPart}${Query}${Fragment}`;
		}
		if (typeof WithParts.fsPath === "string") {
			return `file://${WithParts.fsPath}`;
		}
	}
	return String(Value);
};

type StatShape = {
	readonly type: number;
	readonly size: number;
	readonly ctime: number;
	readonly mtime: number;
};

const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64,
} as const;

const LogRoute = (
	Operation: string,
	Uri: unknown,
	Decision: FileSystemRoute,
): void => {
	// Per-call route decision - 14k+ lines per session under a normal
	// extension activation (svelte's `detect` alone reads thousands of
	// files). Gate under the explicit `fs-route` tag so the default
	// `short` / empty setting stays quiet. The IPC side already logs
	// FileSystem.ReadFile round-trip timing, so nothing useful is lost.
	const Enabled = process.env["Trace"];
	if (!Enabled || !Enabled.includes("fs-route")) return;
	process.stdout.write(
		`[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${UriToString(Uri)}\n`,
	);
};

const ThrowFileNotFound = (Uri: unknown): never => {
	const Api = (globalThis as any).__cocoonVscodeAPI;
	const FileNotFound = Api?.FileSystemError?.FileNotFound;
	if (typeof FileNotFound === "function") throw FileNotFound(Uri);
	const Synthetic: any = new Error(
		`EntryNotFound (FileSystemError): ${UriToString(Uri)}`,
	);
	Synthetic.code = "FileNotFound";
	Synthetic.name = "FileSystemError";
	throw Synthetic;
};

const MetadataToStat = (Metadata: {
	isDirectory: () => boolean;
	isSymbolicLink: () => boolean;
	size: number;
	mtimeMs: number;
	ctimeMs: number;
}): StatShape => ({
	type: Metadata.isSymbolicLink()
		? FileType.SymbolicLink
		: Metadata.isDirectory()
			? FileType.Directory
			: FileType.File,
	size: Metadata.size,
	mtime: Math.floor(Metadata.mtimeMs),
	ctime: Math.floor(Metadata.ctimeMs),
});

export const BuildFileSystemNamespace = (Context: HandlerContext) => ({
	stat: async (Uri: any): Promise<StatShape> => {
		const Decision = Route(Uri);
		LogRoute("stat", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			try {
				const Metadata = await FsPromises.lstat(Path);
				return MetadataToStat(Metadata);
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
				throw Err;
			}
		}
		return (
			(await Call<StatShape>(Context, "FileSystem.Stat", [
				UriToString(Uri),
			])) ?? {
				type: FileType.File,
				size: 0,
				ctime: 0,
				mtime: 0,
			}
		);
	},

	readFile: async (Uri: any): Promise<Uint8Array> => {
		const Decision = Route(Uri);
		LogRoute("readFile", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			try {
				return await FsPromises.readFile(Path);
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
				throw Err;
			}
		}

		// Mountain path preserves the Buffer-shape handling from before:
		// `FileSystem.ReadFile` returns a number[] that extensions MUST
		// be able to pass directly to `JSON.parse(...)` - a plain
		// `Uint8Array` fails because its `.toString()` is comma-joined.
		// Node `Buffer` extends `Uint8Array` and decodes UTF-8 by default.
		const UriString = UriToString(Uri);
		try {
			const Raw = await Context.MountainClient?.sendRequest(
				"FileSystem.ReadFile",
				[UriString],
			);
			if (Raw == null) return Buffer.alloc(0);
			if (Array.isArray(Raw))
				return Buffer.from(Raw as readonly number[]);
			if (Raw instanceof Uint8Array) return Buffer.from(Raw);
			return Buffer.from(String(Raw), "utf8");
		} catch (Err: unknown) {
			const Message = Err instanceof Error ? Err.message : String(Err);
			const Code = (Err as { code?: number | string } | null)?.code;
			const TraceFsRead =
				process.env["Trace"]?.includes("fs-read");
			if (
				Code === -32004 ||
				/resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2/i.test(
					Message,
				)
			) {
				// 404 is the expected path for extensions probing for
				// optional files (terminal-suggest cache, Gemfile.lock,
				// composer.json, rust-toolchain.toml). Silent by default;
				// `Trace=fs-read` re-enables the trace.
				if (TraceFsRead) {
					process.stdout.write(
						`[LandFix:FsRead] 404 → FileNotFound for ${UriString}\n`,
					);
				}
				ThrowFileNotFound(Uri);
			}
			// Non-404 failures surface unconditionally - these indicate
			// genuine IO / permission / protocol problems.
			process.stdout.write(
				`[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}\n`,
			);
			throw Err;
		}
	},

	writeFile: async (Uri: any, Content: Uint8Array): Promise<void> => {
		const Decision = Route(Uri);
		LogRoute("writeFile", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			// Create parent directory best-effort - stock VS Code's
			// DiskFileSystemProvider does the same (`EnsureDir` before
			// writeFile). Silent failure is correct when the parent
			// already exists; a real permission failure will surface on
			// the write itself.
			const Parent = PathDirname(Path);
			if (Parent && Parent !== Path) {
				await FsPromises.mkdir(Parent, { recursive: true }).catch(
					() => {},
				);
			}
			await FsPromises.writeFile(Path, Content);
			return;
		}
		const Text = new TextDecoder().decode(Content);
		await Call<void>(Context, "FileSystem.WriteFile", [
			UriToString(Uri),
			Text,
		]);
	},

	readDirectory: async (Uri: any): Promise<Array<[string, number]>> => {
		const Decision = Route(Uri);
		LogRoute("readDirectory", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			try {
				const Entries = await FsPromises.readdir(Path, {
					withFileTypes: true,
				});
				return Entries.map((Entry) => {
					const Type = Entry.isSymbolicLink()
						? FileType.SymbolicLink
						: Entry.isDirectory()
							? FileType.Directory
							: FileType.File;
					return [Entry.name, Type] as [string, number];
				});
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
				throw Err;
			}
		}
		return ((await Call<Array<[string, number]>>(
			Context,
			"FileSystem.ReadDirectory",
			[UriToString(Uri)],
		)) ?? []) as Array<[string, number]>;
	},

	createDirectory: async (Uri: any): Promise<void> => {
		const Decision = Route(Uri);
		LogRoute("createDirectory", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			await FsPromises.mkdir(Path, { recursive: true });
			return;
		}
		await Call<void>(Context, "FileSystem.CreateDirectory", [
			UriToString(Uri),
		]);
	},

	delete: async (
		Uri: any,
		Options?: { recursive?: boolean; useTrash?: boolean },
	): Promise<void> => {
		const Decision = Route(Uri);
		LogRoute("delete", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			try {
				await FsPromises.rm(Path, {
					recursive: Options?.recursive ?? false,
					force: false,
				});
				return;
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
				throw Err;
			}
		}
		await Call<void>(Context, "FileSystem.Delete", [
			UriToString(Uri),
			Options?.recursive ?? false,
		]);
	},

	rename: async (
		Source: any,
		Target: any,
		_Options?: { overwrite?: boolean },
	): Promise<void> => {
		// Rename routes tier-wise on the SOURCE uri; cross-scheme rename
		// is technically a Mountain problem because native `fs.rename`
		// can't move file://foo to vscode-userdata://User/bar.
		const SourceRoute = Route(Source);
		const TargetRoute = Route(Target);
		const Decision: FileSystemRoute =
			SourceRoute === "native" && TargetRoute === "native"
				? "native"
				: "mountain";
		LogRoute("rename", Source, Decision);
		if (Decision === "native") {
			const SourcePath = ExtractFsPath(Source)!;
			const TargetPath = ExtractFsPath(Target)!;
			try {
				await FsPromises.rename(SourcePath, TargetPath);
				return;
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
				throw Err;
			}
		}
		await Call<void>(Context, "FileSystem.Rename", [
			UriToString(Source),
			UriToString(Target),
		]);
	},

	copy: async (
		Source: any,
		Target: any,
		_Options?: { overwrite?: boolean },
	): Promise<void> => {
		const SourceRoute = Route(Source);
		const TargetRoute = Route(Target);
		const Decision: FileSystemRoute =
			SourceRoute === "native" && TargetRoute === "native"
				? "native"
				: "mountain";
		LogRoute("copy", Source, Decision);
		if (Decision === "native") {
			const SourcePath = ExtractFsPath(Source)!;
			const TargetPath = ExtractFsPath(Target)!;
			// Ensure parent exists, matching writeFile's contract.
			const Parent = PathDirname(TargetPath);
			if (Parent && Parent !== TargetPath) {
				await FsPromises.mkdir(Parent, { recursive: true }).catch(
					() => {},
				);
			}
			try {
				await FsPromises.copyFile(SourcePath, TargetPath);
				return;
			} catch (Err: any) {
				if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
				throw Err;
			}
		}
		await Call<void>(Context, "FileSystem.Copy", [
			UriToString(Source),
			UriToString(Target),
		]);
	},

	isWritableFileSystem: (Scheme: string): boolean => {
		// `file` is always writable (local disk). Custom-provider schemes
		// inherit their `isReadonly` flag from the registration - we
		// don't have that flag locally, so default to writable and let
		// the provider return an error on attempted writes.
		if (Scheme === "file") return true;
		return true;
	},
});
