/*
 * File: Cocoon/Source/Service/WorkSpace/Definition.ts
 * Role: Provides the live implementation of the Workspace service.
 * Responsibilities:
 *   - Implements the `vscode.workspace` API surface.
 *   - Manages and exposes workspace-level state (e.g., folders, name).
 *   - Manages and exposes editor state (e.g., active and visible editors).
 *   - Orchestrates complex operations like finding files, opening documents, and
 *     applying workspace edits by delegating to the host via the IPC service.
 */

import { Effect, Option, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type {
	CancellationToken,
	GlobPattern,
	TextDocument,
	TextEditor,
	Uri,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
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
import { Workspace } from "./Service.js";
import { InternalWorkspace } from "./State.js";

/**
 * An `Effect` that builds the live implementation of the `Workspace` service.
 */
const Definition = Effect.gen(function* (Generator) {
	// --- Service Dependencies ---
	const IPCService = yield* Generator(IPC);
	const DocumentService = yield* Generator(Document);
	const FileSystemService = yield* Generator(FileSystem);
	const ConfigurationService = yield* Generator(Configuration);

	// --- Internal State Management ---
	const InternalWorkspaceRef = yield* Generator(
		Ref.make<InternalWorkspace | undefined>(undefined),
	);
	// This state is duplicated from the Window service for now. In a full architecture,
	// this would be the single source of truth, and the Window service would consume it.
	const TextEditorsMapRef = yield* Generator(
		Ref.make(new Map<string, TextEditor>()),
	);
	const ActiveTextEditorRef = yield* Generator(
		Ref.make<TextEditor | undefined>(undefined),
	);
	const VisibleTextEditorsRef = yield* Generator(
		Ref.make<readonly TextEditor[]>([]),
	);

	// --- Event Emitters ---
	const OnDidChangeFoldersEvent = new Emitter<any>();
	const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } =
		CreateEventStream<TextEditor | undefined>();
	const {
		event: OnDidChangeVisibleTextEditorsEvent,
		Fire: FireVisibleEditors,
	} = CreateEventStream<readonly TextEditor[]>();

	// --- RPC Handlers ---
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

			yield* Generator(Ref.set(InternalWorkspaceRef, NewWorkspace));

			const OldFolders: readonly WorkspaceFolder[] =
				OldWorkspace?.Folders ?? [];
			const NewFolders = NewWorkspace.Folders;

			// Fire event if folders have changed.
			const AddedFolders = NewFolders.filter(
				(Folder) =>
					!OldFolders.some(
						(OldFolder) =>
							OldFolder.uri.toString() === Folder.uri.toString(),
					),
			);
			const RemovedFolders = OldFolders.filter(
				(Folder) =>
					!NewFolders.some(
						(NewFolder) =>
							NewFolder.uri.toString() === Folder.uri.toString(),
					),
			);

			if (AddedFolders.length > 0 || RemovedFolders.length > 0) {
				OnDidChangeFoldersEvent.fire({
					added: AddedFolders,
					removed: RemovedFolders,
				});
			}
		});

	const AcceptEditorStateEffect = (
		ActiveEditorId: string | undefined,
		VisibleEditorIds: string[],
	) =>
		Effect.gen(function* (Generator) {
			const EditorsMap = yield* Generator(Ref.get(TextEditorsMapRef));
			const NewActiveEditor = ActiveEditorId
				? EditorsMap.get(ActiveEditorId)
				: undefined;
			const NewVisibleEditors = VisibleEditorIds.map((ID) =>
				EditorsMap.get(ID),
			).filter((Editor): Editor is TextEditor => !!Editor);

			yield* Generator(Ref.set(ActiveTextEditorRef, NewActiveEditor));
			yield* Generator(Ref.set(VisibleTextEditorsRef, NewVisibleEditors));
			yield* Generator(FireActiveEditor(NewActiveEditor));
			yield* Generator(FireVisibleEditors(NewVisibleEditors));
		});

	// Register handlers to react to state changes pushed from the host.
	yield* Generator(
		Effect.sync(() => {
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
		}),
	);

	// --- Service Implementation ---
	const ServiceImplementation: Workspace["Type"] = {
		// --- Workspace Properties ---
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
			// This would be driven by the host in a full implementation.
			return true;
		},

		// --- Editor State Properties ---
		get activeTextEditor() {
			return Ref.unsafeGet(ActiveTextEditorRef);
		},
		get visibleTextEditors() {
			return Ref.unsafeGet(VisibleTextEditorsRef);
		},

		// --- Events ---
		onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
		onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
		onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,
		onDidChangeTextEditorSelection: new Emitter<any>().event, // Stubbed
		onDidChangeTextEditorVisibleRanges: new Emitter<any>().event, // Stubbed
		onDidChangeTextEditorOptions: new Emitter<any>().event, // Stubbed
		onDidChangeTextEditorViewColumn: new Emitter<any>().event, // Stubbed

		// --- Methods ---
		getWorkspaceFolder: (uri: Uri) => {
			const Folders = Ref.unsafeGet(InternalWorkspaceRef)?.Folders ?? [];
			return Folders.find((Folder) =>
				uri.fsPath.startsWith(Folder.uri.fsPath),
			);
		},

		findFiles: (Include, Exclude, MaxResults, Token) =>
			IPCService.SendRequest<Uri[]>("findFiles", [
				Include,
				Exclude,
				MaxResults,
				// A real implementation would use a cancellation service.
				Token ? 1 : 0,
			]).pipe(
				Effect.map((Uris) => Uris.map(URI.revive)),
				Effect.mapError((Cause) => new Error(String(Cause))),
			),

		openTextDocument: (OptionsOrUri?: any) =>
			Effect.gen(function* (Generator) {
				const IsUri = OptionsOrUri instanceof URI;
				const UriToOpen = IsUri ? OptionsOrUri : undefined;

				if (UriToOpen) {
					const ExistingDocument = yield* Generator(
						DocumentService.GetDocument(UriToOpen),
					);
					if (Option.isSome(ExistingDocument)) {
						return ExistingDocument.value;
					}
				}

				const DTO = IsUri
					? URIConverter.FromAPI(OptionsOrUri)
					: OptionsOrUri;
				const ResultDTO = yield* Generator(
					IPCService.SendRequest<any>("$openTextDocument", [DTO]),
				);
				const ResultUri = URIConverter.ToAPI(ResultDTO.uri);

				// After requesting, we must wait for the document to actually be created.
				// We poll the DocumentService until the document appears.
				const WaitForDocument = DocumentService.GetDocument(
					ResultUri,
				).pipe(
					Effect.repeat({
						schedule: Schedule.spaced(50).pipe(
							Schedule.whileInput((Option) => Option.isNone()),
							Schedule.compose(Schedule.recurs(100)), // Timeout after 5s
						),
					}),
					Effect.flatMap(Option.toEffect),
					Effect.mapError(
						() =>
							new Error(
								`Failed to find newly opened document: ${ResultUri.toString()}`,
							),
					),
				);

				return yield* Generator(WaitForDocument);
			}),

		getConfiguration: ConfigurationService.GetConfiguration,

		applyEdit: (Edit: WorkspaceEdit) =>
			IPCService.SendRequest<boolean>("$applyWorkspaceEdit", [
				WorkspaceEditConverter.FromAPI(Edit),
			]).pipe(Effect.mapError((Cause) => new Error(String(Cause)))),

		fs: FileSystemService,
		registerTextDocumentContentProvider: () => new Disposable(() => {}), // Stubbed
	};

	return ServiceImplementation;
});

export default Definition;
