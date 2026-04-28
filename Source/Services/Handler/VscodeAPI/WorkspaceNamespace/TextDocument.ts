/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/TextDocument
 * @description
 * Document lifecycle operations for the workspace shim:
 * openTextDocument, saveAll, applyEdit, updateWorkspaceFolders, and all
 * document/file/notebook event subscriptions.
 */

import { promises as FsPromises } from "node:fs";

import type { HandlerContext } from "../../HandlerContext.js";
import { ExtractFsPath, Route } from "./FileSystemRoute.js";
import { Call, EventSubscriber } from "./Helpers.js";
import {
	DeriveLanguageIdFromUri,
	FireOnLanguageActivation,
} from "./LanguageActivation.js";

export const BuildOpenTextDocument =
	(Context: HandlerContext) => async (UriOrPath: any) => {
		const UriString =
			typeof UriOrPath === "string"
				? UriOrPath
				: (UriOrPath?.toString?.() ?? "");

		// Cache hit short-circuits every backend - typed model registry
		// already holds the latest contents.
		const Cached = Context.DocumentContentCache.get(UriString);
		let Text: string;
		if (Cached !== undefined) {
			Text = Cached;
		} else {
			// Tier-split match: `file://` with no custom provider reads
			// through Cocoon's own Node backend; everything else (Mountain-
			// owned schemes, custom-provider schemes) routes through the
			// FileSystem.ReadFile gRPC effect.
			const Decision = Route(UriOrPath);
			if (Decision === "native") {
				const Path = ExtractFsPath(UriOrPath);
				if (Path !== undefined) {
					if (process.env["Trace"]) {
						process.stdout.write(
							`[DEV:FS-ROUTE] op=openTextDocument route=native uri=${UriString}\n`,
						);
					}
					try {
						Text = await FsPromises.readFile(Path, "utf8");
					} catch {
						Text = "";
					}
				} else {
					Text =
						(await Call<string>(Context, "FileSystem.ReadFile", [
							UriString,
						])) ?? "";
				}
			} else {
				if (process.env["Trace"]) {
					process.stdout.write(
						`[DEV:FS-ROUTE] op=openTextDocument route=mountain uri=${UriString}\n`,
					);
				}
				Text =
					(await Call<string>(Context, "FileSystem.ReadFile", [
						UriString,
					])) ?? "";
			}
		}

		// Derive languageId from the URI so Monaco's tokeniser, the
		// language-features extensions, and the `onLanguage:<id>`
		// activation-event dispatcher all see the real language
		// instead of a blanket `plaintext`. Fire the matching
		// activation event in the background so language-gated
		// extensions (vscode.typescript-language-features,
		// redhat.vscode-yaml, rust-analyzer, …) activate on document
		// open just like they do in stock VS Code.
		const LanguageId = DeriveLanguageIdFromUri(UriString);
		if (LanguageId !== "plaintext") {
			FireOnLanguageActivation(Context, LanguageId);
		}

		return {
			uri: UriOrPath,
			fileName: UriString,
			languageId: LanguageId,
			isDirty: false,
			isClosed: false,
			isUntitled: false,
			version: 1,
			eol: 1,
			lineCount: Text.split("\n").length,
			getText: () => Text,
			save: async () => true,
		};
	};

export const BuildSaveAll =
	(Context: HandlerContext) => async (_IncludeUntitled?: boolean) => {
		await Call<void>(Context, "Document.Save", []);
		return true;
	};

export const BuildApplyEdit =
	(Context: HandlerContext) => async (_Edit: unknown) => {
		// No dedicated dispatcher route yet - fire as notification so Wind
		// can subscribe via the cocoon:workspace.applyEdit Tauri event.
		Context.SendToMountain("workspace.applyEdit", _Edit).catch(() => {});
		return true;
	};

export const BuildUpdateWorkspaceFolders =
	(
		Context: HandlerContext,
		ReadFolders: () => Array<{ uri: unknown; name: string; index: number }>,
	) =>
	(
		Start: number,
		DeleteCount: number | null | undefined,
		...ToAdd: Array<{ uri?: unknown; name?: string }>
	) => {
		const Current = ReadFolders();
		const RemoveCount =
			typeof DeleteCount === "number" && DeleteCount > 0
				? Math.min(DeleteCount, Math.max(Current.length - Start, 0))
				: 0;
		const Removals = Current.slice(Start, Start + RemoveCount).map(
			(Folder) => ({
				uri: {
					value:
						typeof Folder?.uri === "string"
							? Folder.uri
							: ((
									(Folder?.uri as Record<string, unknown>)?.[
										"toString"
									] as (() => string) | undefined
								)?.call(Folder?.uri) ?? String(Folder?.uri)),
				},
			}),
		);
		const Additions = ToAdd.map((Folder) => {
			const Raw = Folder?.uri;
			const Serialized =
				typeof Raw === "string"
					? Raw
					: ((
							(Raw as Record<string, unknown>)?.["toString"] as
								| (() => string)
								| undefined
						)?.call(Raw) ?? String(Raw ?? ""));
			return { uri: { value: Serialized }, name: Folder?.name ?? "" };
		});
		Context.MountainClient?.sendRequest("$updateWorkspaceFolders", {
			additions: Additions,
			removals: Removals,
		}).catch((Error) => {
			const Message =
				Error instanceof globalThis.Error
					? Error.message
					: String(Error);
			try {
				process.stdout.write(
					`[LandFix:WsNs] updateWorkspaceFolders failed: ${Message}\n`,
				);
			} catch {}
		});
		return true;
	};

export const BuildDocumentEventMembers = (Context: HandlerContext) => ({
	onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
	onDidCloseTextDocument: EventSubscriber(Context, "didCloseTextDocument"),
	onDidChangeTextDocument: EventSubscriber(Context, "didChangeTextDocument"),
	onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
	onWillSaveTextDocument: EventSubscriber(Context, "willSaveTextDocument"),
	onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
	onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
	onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
	onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
	onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
	onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
	onDidOpenNotebookDocument: EventSubscriber(
		Context,
		"didOpenNotebookDocument",
	),
	onDidCloseNotebookDocument: EventSubscriber(
		Context,
		"didCloseNotebookDocument",
	),
	onDidChangeNotebookDocument: EventSubscriber(
		Context,
		"didChangeNotebookDocument",
	),
	onDidSaveNotebookDocument: EventSubscriber(
		Context,
		"didSaveNotebookDocument",
	),
	onWillSaveNotebookDocument: EventSubscriber(
		Context,
		"willSaveNotebookDocument",
	),
});
