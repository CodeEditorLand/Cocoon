/**
 * @module WorkSpace
 * @description Defines the service that implements the `vscode.workspace` API.
 * It manages and exposes workspace-level state (e.g., folders, name) and editor state,
 * orchestrating complex operations like finding files and applying edits.
 */

import { Effect, Option, Ref, Schedule } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { IConfigurationValue } from "vs/platform/configuration/common/configuration.js";
import type {
	CancellationToken,
	ConfigurationScope,
	Disposable,
	Event,
	GlobPattern,
	TextDocument,
	TextDocumentContentProvider,
	TextEditor,
	TextEditorOptionsChangeEvent,
	TextEditorSelectionChangeEvent,
	TextEditorViewColumnChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	Uri,
	FileSystem as VSCodeFileSystem,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
} from "vscode";
import { URI } from "vscode-uri";

import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { DocumentService } from "./Document.js";
import { FileSystemService } from "./FileSystem.js";
import { IPCService } from "./IPC.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";
import { FromDTO as WorkspaceFolderFromDTO } from "./TypeConverter/Main/WorkspaceFolder.js";
import { FromAPI as WorkspaceEditFromAPI } from "./TypeConverter/WorkSpaceEdit.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";

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
		scope?: ConfigurationScope | null,
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
			const ApplicationConfiguration =
				yield* ApplicationConfigurationService;

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
				event: onDidChangeActiveTextEditor,
				Fire: FireActiveEditor,
			} = CreateEventStream<TextEditor | undefined>();
			const {
				event: onDidChangeVisibleTextEditors,
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
					return Effect.runSync(Ref.get(InternalWorkspaceRef))?.Name;
				},
				get workspaceFile() {
					return Effect.runSync(Ref.get(InternalWorkspaceRef))
						?.Configuration;
				},
				get workspaceFolders() {
					return Effect.runSync(Ref.get(InternalWorkspaceRef))
						?.Folders;
				},
				isTrusted: true,
				fs: FileSystem,
				get activeTextEditor() {
					return Effect.runSync(Ref.get(ActiveTextEditorRef));
				},
				get visibleTextEditors() {
					return Effect.runSync(Ref.get(VisibleTextEditorsRef));
				},
				onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
				onDidChangeActiveTextEditor,
				onDidChangeVisibleTextEditors,
				getWorkspaceFolder: (uri: Uri) => {
					const Folders =
						Effect.runSync(Ref.get(InternalWorkspaceRef))
							?.Folders ?? [];
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
				openTextDocument: (
					OptionsOrUri?:
						| Uri
						| { language?: string; content?: string },
				): Effect.Effect<TextDocument, Error> =>
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
						).pipe(
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						);
						const ResultUri = UriToAPI(ResultDTO.uri);
						const WaitForDocument = Document.GetDocument(
							ResultUri,
						).pipe(
							Effect.repeat(
								Schedule.spaced(50).pipe(
									Schedule.whileInput(
										(o: Option.Option<TextDocument>) =>
											Option.isNone(o),
									),
									Schedule.compose(Schedule.recurs(100)),
								),
							),
							Effect.flatMap(
								Option.match({
									onNone: () =>
										Effect.fail(
											new Error(
												`Failed to find newly opened document after timeout: ${ResultUri.toString()}`,
											),
										),
									onSome: Effect.succeed,
								}),
							),
						);
						return yield* WaitForDocument;
					}),
				getConfiguration: (
					section?: string,
					scope?: ConfigurationScope | null,
				): Effect.Effect<WorkspaceConfiguration, Error> =>
					Effect.succeed({
						get: <T>(key: string, defaultValue?: T): T => {
							const fullKey = section ? `${section}.${key}` : key;
							const value = ApplicationConfiguration.getValue<
								T | undefined
							>(fullKey, scope ?? undefined);
							if (value === undefined) {
								return defaultValue as T;
							}
							return value as T;
						},
						has: (key: string): boolean => {
							const fullKey = section ? `${section}.${key}` : key;
							return (
								ApplicationConfiguration.getValue(
									fullKey,
									scope ?? undefined,
								) !== undefined
							);
						},
						inspect: <T>(key: string) => {
							const fullKey = section ? `${section}.${key}` : key;
							return ApplicationConfiguration.inspect<T>(
								fullKey,
								scope ?? undefined,
							) as IConfigurationValue<T>;
						},
						update: (
							key: string,
							value: any,
							configurationTarget?:
								| boolean
								| ConfigurationScope
								| null,
						): Promise<void> => {
							const fullKey = section ? `${section}.${key}` : key;
							return ApplicationConfiguration.updateValue(
								fullKey,
								value,
								configurationTarget ?? undefined,
							);
						},
					}),
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
