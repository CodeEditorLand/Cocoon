/**
 * @module WorkSpace
 * @description Defines the service that implements the `vscode.workspace` API.
 * It manages and exposes workspace-level state (e.g., folders, name) and editor state,
 * orchestrating complex operations like finding files and applying edits.
 */

import { Effect, Option, Ref, Schedule } from "effect";
import { Emitter } from "vs/base/common/event.js";
import {
	Disposable,
	type CancellationToken,
	type Event,
	type FileSystem as VSCodeFileSystem,
	type GlobPattern,
	type TextDocument,
	type TextEditor,
	type TextEditorOptionsChangeEvent,
	type TextEditorSelectionChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type TextEditorVisibleRangesChangeEvent,
	type Uri,
	type WorkspaceConfiguration,
	type WorkspaceEdit,
	type WorkspaceFolder,
	type WorkspaceFoldersChangeEvent,
	type TextDocumentContentProvider,
} from "vscode";
import { URI } from "vscode-uri";

import { FromDTO as WorkspaceFolderFromDTO } from "./TypeConverter/Main/WorkspaceFolder.js";
import { FromAPI as WorkspaceEditFromAPI } from "./TypeConverter/WorkSpaceEdit.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { ConfigurationService } from "./ApplicationConfiguration.js";
import { DocumentService } from "./Document.js";
import { FileSystemService } from "./FileSystem.js";
import { IPCService } from "./IPC.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";

class InternalWorkspace {
	constructor(
		public readonly ID: string,
		public readonly Name: string,
		public readonly Folders: readonly WorkspaceFolder[],
		public readonly Configuration: Uri | undefined,
	) {}
}

/**
 * @interface WorkSpace
 * @description The contract for the WorkSpace service, mirroring `vscode.workspace`.
 */
export interface WorkSpace {
	readonly name: string | undefined;
	readonly workspaceFile: Uri | undefined;
	readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
	readonly isTrusted: boolean;
	readonly fs: VSCodeFileSystem;
	readonly activeTextEditor: TextEditor | undefined;
	readonly visibleTextEditors: readonly TextEditor[];
	readonly onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
	readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
	readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
	readonly getWorkspaceFolder: (uri: Uri) => WorkspaceFolder | undefined;
	readonly findFiles: (
		include: GlobPattern,
		exclude?: GlobPattern | null,
		maxResults?: number,
		token?: CancellationToken,
	) => Effect.Effect<Uri[], Error>;
	readonly openTextDocument: (
		uriOrOptions?: Uri | { language?: string; content?: string },
	) => Effect.Effect<TextDocument, Error>;
	readonly getConfiguration: (
		section?: string,
		scope?: any,
	) => Effect.Effect<WorkspaceConfiguration, Error>;
	readonly applyEdit: (edit: WorkspaceEdit) => Effect.Effect<boolean, Error>;
	readonly registerTextDocumentContentProvider: (
		scheme: string,
		provider: TextDocumentContentProvider,
	) => Disposable;
	readonly onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
	readonly onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
	readonly onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
	readonly onDidChangeTextEditorViewColumn: Event<TextEditorViewColumnChangeEvent>;
}

/**
 * @class WorkSpaceService
 * @description The `Effect.Service` for the `vscode.workspace` API.
 */
export class WorkSpaceService extends Effect.Service<WorkSpaceService>()(
	"Service/WorkSpace",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Document = yield* DocumentService;
			const FileSystem = yield* FileSystemService;
			const Configuration = yield* ConfigurationService;

			const InternalWorkspaceRef = yield* Ref.make<
				InternalWorkspace | undefined
			>(undefined);
			const TextEditorsMapRef = yield* Ref.make(
				new Map<string, TextEditor>(),
			);
			const ActiveTextEditorRef = yield* Ref.make<TextEditor | undefined>(
				undefined,
			);
			const VisibleTextEditorsRef = yield* Ref.make<
				readonly TextEditor[]
			>([]);

			const OnDidChangeFoldersEvent =
				new Emitter<WorkspaceFoldersChangeEvent>();
			const {
				event: OnDidChangeActiveTextEditor,
				Fire: FireActiveEditor,
			} = CreateEventStream<TextEditor | undefined>();
			const {
				event: OnDidChangeVisibleTextEditors,
				Fire: FireVisibleEditors,
			} = CreateEventStream<readonly TextEditor[]>();

			const AcceptWorkspaceData = (Data: any) =>
				Effect.gen(function* () {
					const OldWorkspace = yield* Ref.get(InternalWorkspaceRef);
					const NewWorkspace = new InternalWorkspace(
						Data.id,
						Data.name,
						Data.folders.map((FolderDTO: any) =>
							WorkspaceFolderFromDTO(FolderDTO),
						),
						Data.configuration
							? UriToAPI(Data.configuration)
							: undefined,
					);
					yield* Ref.set(InternalWorkspaceRef, NewWorkspace);
					const OldFolders: readonly WorkspaceFolder[] =
						OldWorkspace?.Folders ?? [];
					const NewFolders = NewWorkspace.Folders;
					const AddedFolders = NewFolders.filter(
						(Folder) =>
							!OldFolders.some(
								(OldFolder) =>
									OldFolder.uri.toString() ===
									Folder.uri.toString(),
							),
					);
					const RemovedFolders = OldFolders.filter(
						(Folder) =>
							!NewFolders.some(
								(NewFolder) =>
									NewFolder.uri.toString() ===
									Folder.uri.toString(),
							),
					);
					if (AddedFolders.length > 0 || RemovedFolders.length > 0) {
						OnDidChangeFoldersEvent.fire({
							added: AddedFolders,
							removed: RemovedFolders,
						});
					}
				});

			const AcceptEditorState = (
				ActiveEditorId: string | undefined,
				VisibleEditorIds: string[],
			) =>
				Effect.gen(function* () {
					const EditorsMap = yield* Ref.get(TextEditorsMapRef);
					const NewActiveEditor = ActiveEditorId
						? EditorsMap.get(ActiveEditorId)
						: undefined;
					const NewVisibleEditors = VisibleEditorIds.map((ID) =>
						EditorsMap.get(ID),
					).filter((Editor): Editor is TextEditor => !!Editor);
					yield* Ref.set(ActiveTextEditorRef, NewActiveEditor);
					yield* Ref.set(VisibleTextEditorsRef, NewVisibleEditors);
					yield* FireActiveEditor(NewActiveEditor);
					yield* FireVisibleEditors(NewVisibleEditors);
				});

			IPC.RegisterInvokeHandler("$acceptWorkspaceData", ([Data]) =>
				Effect.runPromise(AcceptWorkspaceData(Data)),
			);
			IPC.RegisterInvokeHandler(
				"$acceptEditorState",
				([ActiveId, VisibleIds]) =>
					Effect.runPromise(AcceptEditorState(ActiveId, VisibleIds)),
			);

			const service: WorkSpace = {
				get name() {
					return Ref.get(InternalWorkspaceRef)?.Name;
				},
				get workspaceFile() {
					return Ref.get(InternalWorkspaceRef)?.Configuration;
				},
				get workspaceFolders() {
					return Ref.get(InternalWorkspaceRef)?.Folders;
				},
				isTrusted: true,
				fs: FileSystem,
				get activeTextEditor() {
					return Ref.get(ActiveTextEditorRef);
				},
				get visibleTextEditors() {
					return Ref.get(VisibleTextEditorsRef);
				},
				onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
				onDidChangeActiveTextEditor,
				onDidChangeVisibleTextEditors,
				getWorkspaceFolder: (uri: Uri) => {
					const Folders =
						Ref.get(InternalWorkspaceRef)?.Folders ?? [];
					return Folders.find((Folder) =>
						uri.fsPath.startsWith(Folder.uri.fsPath),
					);
				},
				findFiles: (Include, Exclude, MaxResults, Token) =>
					IPC.SendRequest<(Uri | null | undefined)[]>("findFiles", [
						Include,
						Exclude,
						MaxResults,
						Token ? 1 : 0,
					]).pipe(
						Effect.map((Uris) => Uris.filter((u): u is Uri => !!u)),
						Effect.mapError((Cause) => new Error(String(Cause))),
					),
				openTextDocument: (OptionsOrUri?: any) =>
					Effect.gen(function* () {
						const IsUri = OptionsOrUri instanceof URI;
						const UriToOpen = IsUri ? OptionsOrUri : undefined;
						if (UriToOpen) {
							const ExistingDocument =
								yield* Document.GetDocument(UriToOpen);
							if (Option.isSome(ExistingDocument)) {
								return ExistingDocument.value;
							}
						}
						const DTO = IsUri
							? OptionsOrUri.toJSON()
							: OptionsOrUri;
						const ResultDTO = yield* IPC.SendRequest<any>(
							"$openTextDocument",
							[DTO],
						);
						const ResultUri = UriToAPI(ResultDTO.uri);
						const WaitForDocument = Document.GetDocument(
							ResultUri,
						).pipe(
							Effect.repeat({
								schedule: Schedule.spaced(50).pipe(
									Schedule.whileInput((o) =>
										Option.isNone(o),
									),
									Schedule.compose(Schedule.recurs(100)),
								),
							}),
							Effect.flatMap(Option.getOrThrow),
							Effect.mapError(
								() =>
									new Error(
										`Failed to find newly opened document: ${ResultUri.toString()}`,
									),
							),
						);
						return yield* WaitForDocument;
					}),
				getConfiguration: (section?: string, scope?: any) =>
					Effect.sync(() =>
						Configuration.getValue(section, scope),
					) as any,
				applyEdit: (Edit: WorkspaceEdit) =>
					IPC.SendRequest<boolean>("$applyWorkspaceEdit", [
						WorkspaceEditFromAPI(Edit),
					]).pipe(
						Effect.mapError((Cause) => new Error(String(Cause))),
					),
				registerTextDocumentContentProvider:
					Document.RegisterTextDocumentContentProvider,
				onDidChangeTextEditorSelection: new Emitter<any>().event,
				onDidChangeTextEditorVisibleRanges: new Emitter<any>().event,
				onDidChangeTextEditorOptions: new Emitter<any>().event,
				onDidChangeTextEditorViewColumn: new Emitter<any>().event,
			};
			return service;
		}),
	},
) {}
