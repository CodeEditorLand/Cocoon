/**
 * @module Workspace
 * @description
 * Implements the VS Code API surface for workspace-level operations.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostWorkspace.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Workspace.ts (borrowed working patterns)
 * - Mountain Integration: Delegates workspace operations via gRPC to backend
 *
 * Dependencies:
 * - IPCService: For communicating with Mountain (main thread equivalent)
 * - ConfigurationService: For workspace configuration management
 * - DocumentService: For text document operations
 * - LoggerService: For operation logging
 *
 * TODOs:
 * - PRIORITY-1: Implement workspace configuration synchronization with Mountain
 * - PRIORITY-1: Add workspace state persistence and recovery
 * - PRIORITY-2: Implement file system operations (findFiles, findTextInFiles)
 * - PRIORITY-2: Complete workspace edit application with delta calculation
 * - PRIORITY-2: Implement text document content provider registration
 * - PRIORITY-3: Collaborative editing support with multiple cursors
 * - ARCHITECTURE-PATTERN: src/vs/workbench/api/browser/mainThreadWorkspace.ts (Mountain side needed)
 * - VSCODE-LIFT: src/vs/workbench/api/common/extHostWorkspace.ts (complete workspace API)
 */

import { Context, Effect, Ref } from "effect";
import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IIPCService } from "../Interfaces/IIPCService.js";
import { MountainGRPCClientService } from "./MountainGRPCClient.js";

// Temporary placeholder types - TODO: Replace with proper interfaces
interface Logger {
	readonly Trace: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Debug: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
	readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	readonly Error: (
		Message: string,
		...Data: unknown[]
	) => Effect.Effect<void>;
}

interface ConfigurationService {
	readonly getValue: <T>(key: string, scope?: number, defaultValue?: T) => T;
	readonly updateValue: <T>(
		key: string,
		value: T,
		scope?: number,
	) => Promise<void>;
}

/**
 * @interface Workspace
 * @description
 * The contract for the Workspace service, mirroring `vscode.workspace` API surface
 * with Effect-TS integration.
 *
 * Specification: src/vs/workbench/api/common/extHostWorkspace.ts (ExtHostWorkspaceShape)
 */
export interface Workspace {
	readonly name: string | undefined;
	readonly workspaceFile: VSCode.Uri | undefined;
	readonly workspaceFolders: readonly VSCode.WorkspaceFolder[] | undefined;
	readonly isTrusted: boolean;
	readonly activeTextEditor: VSCode.TextEditor | undefined;
	readonly visibleTextEditors: readonly VSCode.TextEditor[];
	readonly GetWorkspaceFolder: (
		uri: VSCode.Uri,
	) => VSCode.WorkspaceFolder | undefined;
	readonly FindFiles: (
		include: VSCode.GlobPattern,
		exclude?: VSCode.GlobPattern | null,
		maxResults?: number,
	) => Effect.Effect<VSCode.Uri[], Error>;
	readonly FindTextInFiles: (
		query: VSCode.TextSearchQuery,
		options?: VSCode.FindTextInFilesOptions,
	) => Effect.Effect<VSCode.Uri[] | null, Error>;
	readonly OpenTextDocument: (
		uriOrOptions?: VSCode.Uri | { language?: string; content?: string },
	) => Effect.Effect<VSCode.TextDocument, Error>;
	readonly SaveAll: (
		includeUntitled?: boolean,
	) => Effect.Effect<boolean, Error>;
	readonly ApplyEdit: (
		edit: VSCode.WorkspaceEdit,
	) => Effect.Effect<boolean, Error>;
	readonly GetConfiguration: (
		section?: string,
		scope?: VSCode.ConfigurationScope | null,
	) => VSCode.WorkspaceConfiguration;
	readonly OnDidChangeWorkspaceFolders: VSCode.Event<VSCode.WorkspaceFoldersChangeEvent>;
	readonly OnDidChangeActiveTextEditor: VSCode.Event<
		VSCode.TextEditor | undefined
	>;
	readonly OnDidChangeVisibleTextEditors: VSCode.Event<
		readonly VSCode.TextEditor[]
	>;
	readonly OnDidChangeTextDocument: VSCode.Event<VSCode.TextDocumentChangeEvent>;
	readonly OnDidChangeConfiguration: VSCode.Event<VSCode.ConfigurationChangeEvent>;
}

/**
 * Internal workspace representation
 *
 * TODO: Lift from VSCode's InternalWorkspace pattern
 * ARCHITECTURE-PATTERN: src/vs/workbench/services/extensions/common/workspace.ts
 */
interface InternalWorkspace {
	readonly ID: string;
	readonly Name: string;
	readonly Folders: readonly VSCode.WorkspaceFolder[];
	readonly Configuration: VSCode.Uri | undefined;
}

/**
 * @class WorkspaceService
 * @description
 * The Effect-TS service for the Workspace service. Manages workspace state,
 * folder structure, configuration, and file operations by delegating to
 * Mountain's backend implementation.
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (ExtHostWorkspace)
 * Implementation: Effect-TS service with Ref-based state management
 *
 * TODOs:
 * - PERFORMANCE: Track workspace operations latency
 * - PERSISTENCE: Save and restore workspace state
 * - DELTA-CALCULATION: Optimize workspace folder change detection
 * - TELEMETRY: Track workspace usage patterns
 * - SYNC: Implement bidirectional configuration sync with Mountain
 */
export class WorkspaceService extends Effect.Service<WorkspaceService>()(
	"Service/Workspace",
	{
		effect: Effect.gen(function* () {
			// Resolve service dependencies
			const IPC = yield* Context.Tag<IIPCService>("IIPCService");
			const Configuration = yield* Context.Tag<ConfigurationService>(
				"Service/Configuration",
			);
			const Logger = yield* Context.Tag<Logger>("Service/Logger");

			// Internal workspace state
			const InternalWorkspaceRef = yield* Ref.make<
				InternalWorkspace | undefined
			>(undefined);

			// Text editor tracking
			const TextEditorsMapRef = yield* Ref.make(
				new Map<string, VSCode.TextEditor>(),
			);
			const ActiveTextEditorRef = yield* Ref.make<
				VSCode.TextEditor | undefined
			>(undefined);
			const VisibleTextEditorsRef = yield* Ref.make<
				readonly VSCode.TextEditor[]
			>([]);

			// TODO: Implement event stream emitters
			// ARCHITECTURE-PATTERN: Source/Utility/EventStream.ts needs integration
			const OnDidChangeWorkspaceFoldersListeners = new Set<
				(event: VSCode.WorkspaceFoldersChangeEvent) => void
			>();
			const OnDidChangeActiveTextEditorListeners = new Set<
				(editor: VSCode.TextEditor | undefined) => void
			>();
			const OnDidChangeVisibleTextEditorsListeners = new Set<
				(editors: readonly VSCode.TextEditor[]) => void
			>();
			const OnDidChangeTextDocumentListeners = new Set<
				(event: VSCode.TextDocumentChangeEvent) => void
			>();
			const OnDidChangeConfigurationListeners = new Set<
				(event: VSCode.ConfigurationChangeEvent) => void
			>();

			/**
			 * Accept workspace data from Mountain
			 *
			 * TODO: Wire this up to gRPC notification handler in GRPCServerService
			 * TYPECONVERTR: Integrate TypeConverter for WorkspaceFolder conversion
			 */
			const AcceptWorkspaceData = (Data: any) =>
				Effect.gen(function* () {
					const OldWorkspace = yield* Ref.get(InternalWorkspaceRef);

					// TODO: Convert DTOs using TypeConverter
					// const Folders = Data.folders.map(WorkspaceFolderFromDTO);
					const Folders: VSCode.WorkspaceFolder[] = [];

					const NewWorkspace: InternalWorkspace = {
						ID: Data.id,
						Name: Data.name,
						Folders,
						Configuration: Data.configuration
							? VSCode.Uri.parse(Data.configuration)
							: undefined,
					};

					yield* Ref.set(InternalWorkspaceRef, NewWorkspace);
					Logger.Info(
						`[WorkspaceService] Workspace updated: ${NewWorkspace.Name} with ${Folders.length} folders`,
					);

					// Calculate delta for folder change event
					const OldFolders = OldWorkspace?.Folders ?? [];
					const AddedFolders = Folders.filter(
						(Folder) =>
							!OldFolders.some(
								(OldFolder) =>
									OldFolder.uri.toString() ===
									Folder.uri.toString(),
							),
					);
					const RemovedFolders = OldFolders.filter(
						(OldFolder) =>
							!Folders.some(
								(Folder) =>
									OldFolder.uri.toString() ===
									OldFolder.uri.toString(),
							),
					);

					if (AddedFolders.length > 0 || RemovedFolders.length > 0) {
						const Event: VSCode.WorkspaceFoldersChangeEvent = {
							added: AddedFolders,
							removed: RemovedFolders,
						};
						OnDidChangeWorkspaceFoldersListeners.forEach(
							(listener) => listener(Event),
						);
					}
				});

			/**
			 * Accept text editor state from Mountain
			 *
			 * TODO: Wire this up to gRPC notification handler in GRPCServerService
			 * TYPECONVERTR: Integrate TypeConverter for TextEditor conversion
			 */
			const AcceptEditorState = (
				ActiveEditorId: string | undefined,
				VisibleEditorIds: string[],
			) =>
				Effect.gen(function* () {
					const TextEditorsMap = yield* Ref.get(TextEditorsMapRef);

					// Update active editor
					const OldActiveEditor = yield* Ref.get(ActiveTextEditorRef);
					const NewActiveEditor = ActiveEditorId
						? TextEditorsMap.get(ActiveEditorId)
						: undefined;
					yield* Ref.set(ActiveTextEditorRef, NewActiveEditor);

					if (OldActiveEditor !== NewActiveEditor) {
						Logger.Debug(
							`[WorkspaceService] Active text editor changed: ${NewActiveEditor?.document.uri.toString() ?? "none"}`,
						);
						OnDidChangeActiveTextEditorListeners.forEach(
							(listener) => listener(NewActiveEditor),
						);
					}

					// Update visible editors
					const NewVisibleEditors = VisibleEditorIds.map((id) =>
						TextEditorsMap.get(id),
					).filter(
						(editor): editor is VSCode.TextEditor =>
							editor !== undefined,
					);
					yield* Ref.set(VisibleTextEditorsRef, NewVisibleEditors);

					OnDidChangeVisibleTextEditorsListeners.forEach((listener) =>
						listener(NewVisibleEditors),
					);
				});

			/**
			 * Get workspace folder containing the given URI
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (getWorkspaceFolder)
			 */
			const GetWorkspaceFolder = (
				uri: VSCode.Uri,
			): VSCode.WorkspaceFolder | undefined => {
				const Workspace = Effect.runSync(Ref.get(InternalWorkspaceRef));
				if (!Workspace) {
					return undefined;
				}

				const UriString = uri.toString();
				return Workspace.Folders.find((folder) => {
					const FolderUri = folder.uri.toString();
					return UriString.startsWith(FolderUri);
				});
			};

			/**
			 * Find files matching a pattern
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (findFiles)
			 *
			 * TODOs:
			 * - IMPLEMENT: Actual file search implementation
			 * - TYPECONVERTR: Integrate TypeConverter/GlobPattern for conversion
			 * - PERFORMANCE: Implement incremental file search with cancellation
			 */
			const FindFiles = (
				include: VSCode.GlobPattern,
				exclude?: VSCode.GlobPattern | null,
				maxResults?: number,
			): Effect.Effect<VSCode.Uri[], Error> =>
				Effect.gen(function* () {
					Logger.Debug(
						`[WorkspaceService] Finding files: ${include}${exclude ? `, excluding: ${exclude}` : ""}` +
							(maxResults ? `, maxResults: ${maxResults}` : ""),
					);

					// Implement actual gRPC call to Mountain
					// ARCHITECTURE-PATTERN: Mountain needs to implement file search
					const mountainClient = yield* MountainGRPCClientService;
					const pattern =
						typeof include === "string" ? include : include.pattern;
					const excludePatterns = exclude
						? typeof exclude === "string"
							? [exclude]
							: exclude.pattern
						: undefined;

					const files = yield* mountainClient.findFiles(
						pattern,
						excludePatterns,
					);

					// Return URIs
					return files.map((uri: string) => ({
						scheme: "file",
						authority: "",
						path: uri,
						query: "",
						fragment: "",
						fsPath: uri,
						with: () => ({ scheme: "file", path: uri }),
						toString: () => uri,
					}));
				});

			/**
			 * Find text in files
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (findTextInFiles)
			 */
			const FindTextInFiles = (
				query: VSCode.TextSearchQuery,
				options?: VSCode.FindTextInFilesOptions,
			): Effect.Effect<VSCode.Uri[] | null, Error> =>
				Effect.gen(function* () {
					Logger.Debug(`[WorkspaceService] Finding text in files`);

					// Implement actual gRPC call to Mountain
					const mountainClient = yield* MountainGRPCClientService;
					const pattern = query.pattern;
					const includePatterns = options?.include
						? Array.isArray(options.include)
							? options.include.map((p: any) =>
									typeof p === "string" ? p : p.pattern,
								)
							: [
									typeof options.include === "string"
										? options.include
										: options.include.pattern,
								]
						: undefined;
					const excludePatterns = options?.exclude
						? Array.isArray(options.exclude)
							? options.exclude.map((p: any) =>
									typeof p === "string" ? p : p.pattern,
								)
							: [
									typeof options.exclude === "string"
										? options.exclude
										: options.exclude.pattern,
								]
						: undefined;

					const matches = yield* mountainClient.findTextInFiles(
						pattern,
						includePatterns,
						excludePatterns,
					);

					// Return matches or null
					return matches.length > 0
						? matches.map((m: any) => ({
								scheme: "file",
								authority: "",
								path: m.uri,
								query: "",
								fragment: "",
								fsPath: m.uri,
								with: () => ({ scheme: "file", path: m.uri }),
								toString: () => m.uri,
							}))
						: null;
				});

			/**
			 * Open text document
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostDocuments.ts
			 * TODO: Integrate with DocumentService
			 */
			const OpenTextDocument = (
				uriOrOptions?:
					| VSCode.Uri
					| { language?: string; content?: string },
			): Effect.Effect<VSCode.TextDocument, Error> =>
				Effect.gen(function* () {
					let Uri: VSCode.Uri;
					let Language: string | undefined;
					let Content: string | undefined;

					if (uriOrOptions) {
						if ("uri" in uriOrOptions) {
							Uri = uriOrOptions;
						} else {
							// Create untitled document
							Uri = VSCode.Uri.parse(
								`untitled:${Language}-${Date.now()}`,
							);
							Language = uriOrOptions.language;
							Content = uriOrOptions.content;
						}
					} else {
						// Open current active document
						const ActiveEditor =
							yield* Ref.get(ActiveTextEditorRef);
						if (!ActiveEditor) {
							return yield* Effect.fail(
								new Error(
									"[WorkspaceService] No active text editor to open",
								),
							);
						}
						return ActiveEditor.document;
					}

					Logger.Debug(
						`[WorkspaceService] Opening text document: ${Uri}`,
					);

					// Implement actual gRPC call to Mountain
					const mountainClient = yield* MountainGRPCClientService;

					// Open document in Mountain
					yield* mountainClient.openDocument(Uri.toString());

					// For now, return a mock document
					// TODO: Get actual document from Mountain response
					return {
						uri: Uri,
						languageId: Language || "plaintext",
						version: 1,
						isDirty: false,
						isClosed: false,
						getText: () => Content || "",
						lineCount: Content?.split("\n").length || 0,
						lineAt: (lineOrPos: any) => ({
							text:
								Content?.split("\n")[
									typeof lineOrPos === "number"
										? lineOrPos
										: lineOrPos.line
								] || "",
						}),
						offsetAt: () => 0,
						positionAt: () => ({ line: 0, character: 0 }),
						getWordRangeAtPosition: () => undefined,
						validateRange: () => ({
							start: { line: 0, character: 0 },
							end: { line: 0, character: 0 },
						}),
						validatePosition: () => ({ line: 0, character: 0 }),
						save: () => Promise.resolve(true),
						eol: 1,
					} as VSCode.TextDocument;
				});

			/**
			 * Save all text documents
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (saveAll)
			 */
			const SaveAll = (
				includeUntitled?: boolean,
			): Effect.Effect<boolean, Error> =>
				Effect.gen(function* () {
					Logger.Debug(
						`[WorkspaceService] Saving all documents${includeUntitled ? " (including untitled)" : ""}`,
					);

					// Implement actual gRPC call to Mountain
					const mountainClient = yield* MountainGRPCClientService;
					yield* mountainClient.saveAll(includeUntitled ?? false);
					return true;
				});

			/**
			 * Apply workspace edit
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (applyEdit)
			 * TODO: Integrate TypeConverter/WorkspaceEdit.ts for serialization
			 */
			const ApplyEdit = (
				edit: VSCode.WorkspaceEdit,
			): Effect.Effect<boolean, Error> =>
				Effect.gen(function* () {
					Logger.Info(
						`[WorkspaceService] Applying workspace edit with ${edit.entries()?.length ?? 0} changes`,
					);

					// Serialize edit using TypeConverter
					// TODO: Use proper TypeConverter/WorkspaceEdit.ts for serialization
					// For now, apply edits per document

					const mountainClient = yield* MountainGRPCClientService;

					// Get all document edits
					for (const entry of edit.entries() ?? []) {
						const [uri, edits] = entry;
						const textEdits = edits.map((e: any) => ({
							range: {
								start: {
									line: e.range.start.line,
									character: e.range.start.character,
								},
								end: {
									line: e.range.end.line,
									character: e.range.end.character,
								},
							},
							newText: e.newText,
						}));

						yield* mountainClient.applyEdit(
							uri.toString(),
							textEdits,
						);
					}

					return true;
				});

			/**
			 * Get workspace configuration
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (getConfiguration)
			 * TODO: Implement WorkspaceConfiguration wrapper with change events
			 */
			const GetConfiguration = (
				section?: string,
				_scope?: VSCode.ConfigurationScope | null,
			): VSCode.WorkspaceConfiguration => {
				const Workspace = Effect.runSync(Ref.get(InternalWorkspaceRef));

				// TODO: Implement proper WorkspaceConfiguration object
				// For now, create a simple wrapper around ConfigurationService
				return {
					get: <T>(key?: string, defaultValue?: T): T => {
						const FullKey = section
							? key
								? `${section}.${key}`
								: section
							: (key ?? "");
						return Configuration.getValue(
							FullKey,
							1,
							defaultValue,
						) as T;
					},
					has: (HasKey: string): boolean => {
						const FullKey = section
							? `${section}.${HasKey}`
							: HasKey;
						return Configuration.hasKey(FullKey, 1);
					},
					update: <T>(
						key: string,
						value: T,
						_configurationTarget?: VSCode.ConfigurationTarget,
					) => {
						const FullKey = section ? `${section}.${key}` : key;
						Configuration.updateValue(FullKey, value, 1);
					},
					inspect: (InspectKey?: string) => {
						const FullKey = section
							? InspectKey
								? `${section}.${InspectKey}`
								: section
							: (InspectKey ?? "");
						return {
							key: FullKey,
							defaultValue: Configuration.getValue(
								FullKey,
								0,
								undefined,
							),
							globalValue: Configuration.getValue(
								FullKey,
								1,
								undefined,
							),
							workspaceValue: Configuration.getValue(
								FullKey,
								2,
								undefined,
							),
							workspaceFolderValue: undefined,
						};
					},
				} as unknown as VSCode.WorkspaceConfiguration;
			};

			/**
			 * Register event handler for workspace folder changes
			 */
			const OnDidChangeWorkspaceFolders = (
				listener: (e: VSCode.WorkspaceFoldersChangeEvent) => any,
				// TODO: Add disposables support
			): VSCode.Disposable => {
				OnDidChangeWorkspaceFoldersListeners.add(listener);
				return {
					dispose: () => {
						OnDidChangeWorkspaceFoldersListeners.delete(listener);
					},
				};
			};

			/**
			 * Register event handler for active text editor changes
			 */
			const OnDidChangeActiveTextEditor = (
				listener: (e: VSCode.TextEditor | undefined) => any,
				// TODO: Add disposables support
			): VSCode.Disposable => {
				OnDidChangeActiveTextEditorListeners.add(listener);
				return {
					dispose: () => {
						OnDidChangeActiveTextEditorListeners.delete(listener);
					},
				};
			};

			/**
			 * Register event handler for visible text editors changes
			 */
			const OnDidChangeVisibleTextEditors = (
				listener: (e: readonly VSCode.TextEditor[]) => any,
				// TODO: Add disposables support
			): VSCode.Disposable => {
				OnDidChangeVisibleTextEditorsListeners.add(listener);
				return {
					dispose: () => {
						OnDidChangeVisibleTextEditorsListeners.delete(listener);
					},
				};
			};

			/**
			 * Register event handler for text document changes
			 */
			const OnDidChangeTextDocument = (
				listener: (e: VSCode.TextDocumentChangeEvent) => any,
				// TODO: Add disposables support
			): VSCode.Disposable => {
				OnDidChangeTextDocumentListeners.add(listener);
				return {
					dispose: () => {
						OnDidChangeTextDocumentListeners.delete(listener);
					},
				};
			};

			/**
			 * Register event handler for configuration changes
			 */
			const OnDidChangeConfiguration = (
				listener: (e: VSCode.ConfigurationChangeEvent) => any,
				// TODO: Add disposables support
			): VSCode.Disposable => {
				OnDidChangeConfigurationListeners.add(listener);
				return {
					dispose: () => {
						OnDidChangeConfigurationListeners.delete(listener);
					},
				};
			};

			// Return the service implementation
			const ServiceImplementation: Workspace = {
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
				get isTrusted() {
					// DEPENDENCY: Mountain trust status - default to true until Mountain provides trust state
					return true;
				},
				get activeTextEditor() {
					return Effect.runSync(Ref.get(ActiveTextEditorRef));
				},
				get visibleTextEditors() {
					return Effect.runSync(Ref.get(VisibleTextEditorsRef));
				},
				GetWorkspaceFolder,
				FindFiles,
				FindTextInFiles,
				OpenTextDocument,
				SaveAll,
				ApplyEdit,
				GetConfiguration,
				OnDidChangeWorkspaceFolders,
				OnDidChangeActiveTextEditor,
				OnDidChangeVisibleTextEditors,
				OnDidChangeTextDocument,
				OnDidChangeConfiguration,
			};

			return ServiceImplementation;
		}),
	},
) {}

/**
 * Workspace interface compatible with public VSCode API
 * This is what extensions see when they access vscode.workspace
 *
 * TODO: Implement this as a namespace factory in APIFactoryService
 */
export interface VSCodeWorkspaceAPI {
	readonly name: string;
	readonly workspaceFile: VSCode.Uri | undefined;
	readonly workspaceFolders: readonly VSCode.WorkspaceFolder[] | undefined;
	readonly rootPath: string | undefined;
	readonly isTrusted: boolean;
	readonly onDidChangeWorkspaceFolders: VSCode.Event<VSCode.WorkspaceFoldersChangeEvent>;
	readonly onDidChangeActiveTextEditor: VSCode.Event<
		VSCode.TextEditor | undefined
	>;
	readonly onDidChangeVisibleTextEditors: VSCode.Event<
		readonly VSCode.TextEditor[]
	>;
	readonly onDidChangeTextDocument: VSCode.Event<VSCode.TextDocumentChangeEvent>;
	readonly onDidChangeConfiguration: VSCode.Event<VSCode.ConfigurationChangeEvent>;
	getWorkspaceFolder(uri: VSCode.Uri): VSCode.WorkspaceFolder | undefined;
	findFiles(
		include: VSCode.GlobPattern,
		exclude?: VSCode.GlobPattern | null,
		maxResults?: number,
	): Thenable<VSCode.Uri[]>;
	findTextInFiles(
		query: VSCode.TextSearchQuery,
		options?: VSCode.FindTextInFilesOptions,
	): Thenable<VSCode.Uri[]>;
	openTextDocument(
		uriOrOptions?: VSCode.Uri | { language?: string; content?: string },
	): Thenable<VSCode.TextDocument>;
	saveAll(includeUntitled?: boolean): Thenable<boolean>;
	applyEdit(edit: VSCode.WorkspaceEdit): Thenable<boolean>;
	getConfiguration(
		section?: string,
		scope?: VSCode.ConfigurationScope | null,
	): VSCode.WorkspaceConfiguration;
}
