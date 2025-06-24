/*
 * File: Cocoon/Source/Service/Workspace/Service.ts
 * Role: Defines the Workspace service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide an abstraction over `vscode.workspace`.
 *   - Manage workspace-level state (folders, name).
 *   - Act as the single source of truth for the state of active and visible text editors.
 */

import { Effect, Option, Ref, Schedule } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	CancellationToken,
	Event,
	FileSystem as VscFileSystem,
	GlobPattern,
	TextDocument,
	TextEditor,
	TextEditorOptionsChangeEvent,
	TextEditorSelectionChangeEvent,
	TextEditorViewColumnChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	Uri,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
} from "vscode";
import { URI } from "vscode-uri";

import { URI as URIConverter } from "../../TypeConverter/Main/URI.js";
import { WorkspaceFolder as WorkspaceFolderConverter } from "../../TypeConverter/Main/WorkspaceFolder.js";
import { WorkspaceEdit as WorkspaceEditConverter } from "../../TypeConverter/WorkSpaceEdit.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { Configuration } from "../Configuration/Service.js";
import { Document } from "../Document/Service.js";
import { FileSystem } from "../FileSystem/Service.js";
import { IPC } from "../IPC/Service.js";

// --- Internal State Class ---
class InternalWorkspace {
	constructor(
		public readonly ID: string,
		public readonly Name: string,
		public readonly Folders: readonly WorkspaceFolder[],
		public readonly Configuration: Uri | undefined,
	) {}
}

export class Workspace extends Effect.Service<Workspace>()(
	"Service/Workspace",
	{
		effect: Effect.gen(function* (Generator) {
			const IPCService = yield* Generator(IPC);
			const DocumentService = yield* Generator(Document);
			const FileSystemService = yield* Generator(FileSystem);
			const ConfigurationService = yield* Generator(Configuration);

			const InternalWorkspaceRef = yield* Generator(
				Ref.make<InternalWorkspace | undefined>(undefined),
			);
			const TextEditorsMapRef = yield* Generator(
				Ref.make(new Map<string, TextEditor>()),
			);
			const ActiveTextEditorRef = yield* Generator(
				Ref.make<TextEditor | undefined>(undefined),
			);
			const VisibleTextEditorsRef = yield* Generator(
				Ref.make<readonly TextEditor[]>([]),
			);

			const OnDidChangeFoldersEvent =
				new Emitter<WorkspaceFoldersChangeEvent>();
			const {
				event: OnDidChangeActiveTextEditorEvent,
				Fire: FireActiveEditor,
			} = CreateEventStream<TextEditor | undefined>();
			const {
				event: OnDidChangeVisibleTextEditorsEvent,
				Fire: FireVisibleEditors,
			} = CreateEventStream<readonly TextEditor[]>();

			const AcceptWorkspaceDataEffect = (Data: any) =>
				Effect.gen(function* (Generator) {
					const OldWorkspace = yield* Generator(
						Ref.get(InternalWorkspaceRef),
					);
					const NewWorkspace = new InternalWorkspace(
						Data.id,
						Data.name,
						Data.folders.map((FolderDTO: any) =>
							WorkspaceFolderConverter.FromDTO(FolderDTO),
						),
						Data.configuration
							? URIConverter.ToAPI(Data.configuration)
							: undefined,
					);
					yield* Generator(
						Ref.set(InternalWorkspaceRef, NewWorkspace),
					);
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
					if (AddedFolders.length > 0 || RemovedFolders.length > 0)
						OnDidChangeFoldersEvent.fire({
							added: AddedFolders,
							removed: RemovedFolders,
						});
				});

			const AcceptEditorStateEffect = (
				ActiveEditorId: string | undefined,
				VisibleEditorIds: string[],
			) =>
				Effect.gen(function* (Generator) {
					const EditorsMap = yield* Generator(
						Ref.get(TextEditorsMapRef),
					);
					const NewActiveEditor = ActiveEditorId
						? EditorsMap.get(ActiveEditorId)
						: undefined;
					const NewVisibleEditors = VisibleEditorIds.map((ID) =>
						EditorsMap.get(ID),
					).filter((Editor): Editor is TextEditor => !!Editor);
					yield* Generator(
						Ref.set(ActiveTextEditorRef, NewActiveEditor),
					);
					yield* Generator(
						Ref.set(VisibleTextEditorsRef, NewVisibleEditors),
					);
					yield* Generator(FireActiveEditor(NewActiveEditor));
					yield* Generator(FireVisibleEditors(NewVisibleEditors));
				});

			IPCService.RegisterInvokeHandler("$acceptWorkspaceData", ([Data]) =>
				Effect.runPromise(AcceptWorkspaceDataEffect(Data)),
			);
			IPCService.RegisterInvokeHandler(
				"$acceptEditorState",
				([ActiveId, VisibleIds]) =>
					Effect.runPromise(
						AcceptEditorStateEffect(ActiveId, VisibleIds),
					),
			);

			const ServiceImplementation = {
				get name() {
					return Ref.unsafeGet(InternalWorkspaceRef)?.Name;
				},
				get workspaceFile() {
					return Ref.unsafeGet(InternalWorkspaceRef)?.Configuration;
				},
				get workspaceFolders() {
					return Ref.unsafeGet(InternalWorkspaceRef)?.Folders;
				},
				get isTrusted() {
					return true;
				},
				get activeTextEditor() {
					return Ref.unsafeGet(ActiveTextEditorRef);
				},
				get visibleTextEditors() {
					return Ref.unsafeGet(VisibleTextEditorsRef);
				},
				onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
				onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
				onDidChangeVisibleTextEditors:
					OnDidChangeVisibleTextEditorsEvent,
				onDidChangeTextEditorSelection: new Emitter<any>().event,
				onDidChangeTextEditorVisibleRanges: new Emitter<any>().event,
				onDidChangeTextEditorOptions: new Emitter<any>().event,
				onDidChangeTextEditorViewColumn: new Emitter<any>().event,

				getWorkspaceFolder: (uri: Uri) => {
					const Folders =
						Ref.unsafeGet(InternalWorkspaceRef)?.Folders ?? [];
					return Folders.find((Folder) =>
						uri.fsPath.startsWith(Folder.uri.fsPath),
					);
				},
				findFiles: (
					Include: GlobPattern,
					Exclude?: GlobPattern | null,
					MaxResults?: number,
					Token?: CancellationToken,
				) =>
					IPCService.SendRequest<Uri[]>("findFiles", [
						Include,
						Exclude,
						MaxResults,
						Token ? 1 : 0,
					]).pipe(
						Effect.map((Uris) => Uris.map(URI.revive)),
						Effect.mapError((Cause) => new Error(String(Cause))),
					),
				openTextDocument: (
					OptionsOrUri?: any,
				): Effect.Effect<TextDocument, Error> =>
					Effect.gen(function* (Generator) {
						const IsUri = OptionsOrUri instanceof URI;
						if (IsUri) {
							const Existing = yield* Generator(
								DocumentService.GetDocument(OptionsOrUri),
							);
							if (Option.isSome(Existing)) return Existing.value;
						}
						const DTO = IsUri
							? URIConverter.FromAPI(OptionsOrUri)
							: OptionsOrUri;
						const ResultDTO = yield* Generator(
							IPCService.SendRequest<any>("$openTextDocument", [
								DTO,
							]),
						);
						const ResultUri = URIConverter.ToAPI(ResultDTO.uri);
						return yield* Generator(
							DocumentService.GetDocument(ResultUri).pipe(
								Effect.repeat({
									schedule: Schedule.spaced(50).pipe(
										Schedule.whileInput((o) => o.isNone()),
										Schedule.compose(Schedule.recurs(100)),
									),
								}),
								Effect.flatMap(Option.toEffect),
								Effect.mapError(
									() =>
										new Error(
											`Failed to find newly opened document: ${ResultUri.toString()}`,
										),
								),
							),
						);
					}),
				getConfiguration: (section?: string, scope?: any) =>
					ConfigurationService.GetConfiguration(
						section,
						scope ?? undefined,
					),
				applyEdit: (Edit: WorkspaceEdit) =>
					IPCService.SendRequest<boolean>("$applyWorkspaceEdit", [
						WorkspaceEditConverter.FromAPI(Edit),
					]).pipe(
						Effect.mapError((Cause) => new Error(String(Cause))),
					),
				fs: FileSystemService,
				registerTextDocumentContentProvider: () =>
					new Disposable(() => {}),
			};

			return ServiceImplementation;
		}),
	},
) {}
