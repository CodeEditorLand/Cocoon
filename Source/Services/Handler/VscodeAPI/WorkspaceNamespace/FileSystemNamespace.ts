/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FileSystemNamespace
 * @description
 * Builds the `workspace.fs` sub-namespace: stat, readFile, writeFile,
 * readDirectory, createDirectory, delete, rename, copy, isWritableFileSystem.
 * All operations proxy to Mountain via `FileSystem.*` gRPC requests.
 */

import type { HandlerContext } from "../../HandlerContext.js";
import { Call } from "./Helpers.js";

export const BuildFileSystemNamespace = (Context: HandlerContext) => ({
	stat: async (Uri: any) =>
		(await Call<unknown>(Context, "FileSystem.Stat", [
			String(Uri),
		])) ?? {
			type: 1,
			size: 0,
			ctime: 0,
			mtime: 0,
		},
	readFile: async (Uri: any): Promise<Uint8Array> => {
		// Use raw sendRequest so we can discriminate a benign
		// "Resource not found" (extensions probing for optional cache
		// files) from a genuine I/O error. The raw-error path throws
		// a vscode `FileSystemError.FileNotFound`, which extensions'
		// own try/catch handles cleanly instead of the previous
		// empty-bytes-then-SyntaxError chain (see terminal-suggest on
		// first run).
		//
		// Mountain's `FileSystem.ReadFile` effect returns the file bytes
		// as `json!(Vec<u8>)` which serde serialises as a JSON NUMBER
		// array `[123, 34, ...]`, not a string. The previous TextEncoder
		// path stringified that to `"123,34,..."` and `JSON.parse` of an
		// extension's package.json then threw "Unexpected non-whitespace
		// character after JSON at position 2" (redhat.java). Accept
		// both shapes: number array → Uint8Array byte-for-byte; string →
		// UTF-8 encode.
		const UriString = String(Uri);
		try {
			const Raw = await Context.MountainClient?.sendRequest(
				"FileSystem.ReadFile",
				[UriString],
			);
			if (Raw == null) return new Uint8Array();
			if (Array.isArray(Raw)) {
				return Uint8Array.from(
					Raw as readonly number[],
					(N) => Number(N) & 0xff,
				);
			}
			if (Raw instanceof Uint8Array) return Raw;
			return new TextEncoder().encode(String(Raw));
		} catch (Err: unknown) {
			const Message =
				Err instanceof Error ? Err.message : String(Err);
			const LooksLike404 =
				/resource not found|ENOENT|not found/i.test(Message);
			if (LooksLike404) {
				process.stdout.write(
					`[LandFix:FsRead] 404 → FileNotFound for ${UriString}\n`,
				);
				const Api = (globalThis as any).__cocoonVscodeAPI;
				const FileNotFound = Api?.FileSystemError?.FileNotFound;
				if (typeof FileNotFound === "function") {
					throw FileNotFound(Uri);
				}
				// Fallback: shape a VS Code-ish error so `instanceof`
				// and `.code` checks work even without the real class.
				const Synthetic: any = new Error(
					`EntryNotFound (FileSystemError): ${UriString}`,
				);
				Synthetic.code = "FileNotFound";
				Synthetic.name = "FileSystemError";
				throw Synthetic;
			}
			process.stdout.write(
				`[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}\n`,
			);
			throw Err;
		}
	},
	writeFile: async (Uri: any, Content: Uint8Array) => {
		const Text = new TextDecoder().decode(Content);
		await Call<void>(Context, "FileSystem.WriteFile", [
			String(Uri),
			Text,
		]);
	},
	readDirectory: async (Uri: any): Promise<unknown[]> =>
		(await Call<unknown[]>(Context, "FileSystem.ReadDirectory", [
			String(Uri),
		])) ?? [],
	createDirectory: async (Uri: any) => {
		await Call<void>(Context, "FileSystem.CreateDirectory", [
			String(Uri),
		]);
	},
	delete: async (Uri: any, Options?: { recursive?: boolean }) => {
		await Call<void>(Context, "FileSystem.Delete", [
			String(Uri),
			Options?.recursive ?? false,
		]);
	},
	rename: async (Source: any, Target: any, _Options?: unknown) => {
		await Call<void>(Context, "FileSystem.Rename", [
			String(Source),
			String(Target),
		]);
	},
	copy: async (Source: any, Target: any, _Options?: unknown) => {
		await Call<void>(Context, "FileSystem.Copy", [
			String(Source),
			String(Target),
		]);
	},
	isWritableFileSystem: (_Scheme: string) => true,
});
