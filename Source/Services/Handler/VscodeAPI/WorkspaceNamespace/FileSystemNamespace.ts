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
import { Call } from "./Helpers.js";
import {
	ExtractFsPath,
	ExtractScheme,
	Route,
	type FileSystemRoute,
} from "./FileSystemRoute.js";

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

const LogRoute = (Operation: string, Uri: unknown, Decision: FileSystemRoute): void => {
	// Guarded with env var so release builds stay silent on the default
	// `LAND_DEV_LOG=` setup. Mountain's stdout tail already tags this
	// under `[DEV:COCOON]`; adding a stable `[DEV:FS-ROUTE]` prefix makes
	// grep patterns (route=native / route=mountain) trivial.
	if (!process.env["LAND_DEV_LOG"]) return;
	process.stdout.write(
		`[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${String(Uri)}\n`,
	);
};

const ThrowFileNotFound = (Uri: unknown): never => {
	const Api = (globalThis as any).__cocoonVscodeAPI;
	const FileNotFound = Api?.FileSystemError?.FileNotFound;
	if (typeof FileNotFound === "function") throw FileNotFound(Uri);
	const Synthetic: any = new Error(
		`EntryNotFound (FileSystemError): ${String(Uri)}`,
	);
	Synthetic.code = "FileNotFound";
	Synthetic.name = "FileSystemError";
	throw Synthetic;
};

const MetadataToStat = (
	Metadata: { isDirectory: () => boolean; isSymbolicLink: () => boolean; size: number; mtimeMs: number; ctimeMs: number },
): StatShape => ({
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
			(await Call<StatShape>(Context, "FileSystem.Stat", [String(Uri)])) ?? {
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
		const UriString = String(Uri);
		try {
			const Raw = await Context.MountainClient?.sendRequest(
				"FileSystem.ReadFile",
				[UriString],
			);
			if (Raw == null) return Buffer.alloc(0);
			if (Array.isArray(Raw)) return Buffer.from(Raw as readonly number[]);
			if (Raw instanceof Uint8Array) return Buffer.from(Raw);
			return Buffer.from(String(Raw), "utf8");
		} catch (Err: unknown) {
			const Message = Err instanceof Error ? Err.message : String(Err);
			if (/resource not found|ENOENT|not found/i.test(Message)) {
				process.stdout.write(
					`[LandFix:FsRead] 404 → FileNotFound for ${UriString}\n`,
				);
				ThrowFileNotFound(Uri);
			}
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
		await Call<void>(Context, "FileSystem.WriteFile", [String(Uri), Text]);
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
		return (
			((await Call<Array<[string, number]>>(
				Context,
				"FileSystem.ReadDirectory",
				[String(Uri)],
			)) ?? []) as Array<[string, number]>
		);
	},

	createDirectory: async (Uri: any): Promise<void> => {
		const Decision = Route(Uri);
		LogRoute("createDirectory", Uri, Decision);
		if (Decision === "native") {
			const Path = ExtractFsPath(Uri)!;
			await FsPromises.mkdir(Path, { recursive: true });
			return;
		}
		await Call<void>(Context, "FileSystem.CreateDirectory", [String(Uri)]);
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
			String(Uri),
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
			String(Source),
			String(Target),
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
			String(Source),
			String(Target),
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
