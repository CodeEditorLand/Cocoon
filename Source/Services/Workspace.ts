/**
 * @module Services/Workspace
 * @description
 * Effect-TS service that backs the `vscode.workspace` namespace inside
 * Cocoon. Every workspace read (name, folders, configuration, findFiles,
 * findTextInFiles, openTextDocument, saveAll, applyEdit) delegates to
 * Mountain via `MountainGRPCClientService`; event-emitting surfaces
 * (onDidChangeWorkspaceFolders, onDidChangeTextDocument, etc.) are driven
 * by `$accept*` notifications that arrive on the reverse-RPC channel and
 * are dispatched through `Services/Handler/NotificationHandler.ts`.
 *
 * ## Architectural lineage
 *
 * - **Upstream contract:** VS Code's `ExtHostWorkspace`
 *   (`src/vs/workbench/api/common/extHostWorkspace.ts`) defines the exact
 *   shape of every method and event this service exposes. When a VS Code
 *   extension imports `vscode.workspace`, it is backed by this service.
 * - **Mountain side:** the complement of every method here lives in
 *   `Mountain/Source/RPC/CocoonService/mod.rs` (`update_workspace_folders`,
 *   `get_workspace_folders`, `init_extension_host`) and in
 *   `Track/Effect/CreateEffectForRequest.rs` (`FileSystem.*`, `Document.*`,
 *   `Search.TextSearch`).
 *
 * ## Dependencies
 *
 * - `MountainGRPCClientService` - the only channel to Mountain. This
 *   service was historically wrapped by a `Cocoon/Services/IPCService`,
 *   but that wrapper was deleted in 2026-04 and all callers now reach
 *   Mountain directly.
 * - `ConfigurationService` - the synchronous cache that `getConfiguration`
 *   reads against; Mountain's async configuration RPCs populate it on
 *   demand.
 * - A local `Logger` tag (Effect-TS context) - see the `interface Logger`
 *   declaration below. The full logger service lives in the Telemetry
 *   layer; this tag is a compile-time handle, not a concrete impl.
 *
 * ## Known gaps (tracked in the Ladder + HANDOFF.md)
 *
 * - `OpenTextDocument` still does a local file read to build the
 *   TextDocument mirror rather than receiving a Mountain-authoritative
 *   document snapshot. Symptom: race between save-from-disk and
 *   Cocoon-side cache when two extensions fight over the same URI.
 * - `ApplyEdit` applies edits per-URI; Mountain needs a bulk-edit RPC to
 *   preserve transactional semantics across files.
 * - `OnDidChangeConfiguration` fires only on Mountain-driven mutations
 *   (via NotificationHandler); in-memory `workspaceConfiguration.update()`
 *   calls are written through but do not yet emit to listeners.
 *
 * ## Follow-ups
 *
 * - Wire `MainThreadWorkspace::$save*` to trigger save participants (the
 *   Effect path exists in Mountain; no Cocoon subscriber yet).
 * - Document content provider registration (`registerTextDocumentContentProvider`)
 *   is a stub; requires a Mountain-side `$registerTextDocumentContentProvider`
 *   effect arm.
 * - Collaborative editing cursors will come through the Mist WebSocket
 *   channel, not the Mountain gRPC channel.
 */

import { Context, Effect } from "effect";
import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { MountainGRPCClientService } from "./Mountain/gRPC/Client.js";

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
 * Lean Effect-TS service mirroring the `vscode.workspace` API surface.
 * Reads and mutations (findFiles, openTextDocument, saveAll, applyEdit)
 * delegate to Mountain through `MountainGRPCClientService`; live state is
 * fed by the notification path through the
 * `globalThis.__COCOON_WORKSPACE_BRIDGE__` global (`AcceptWorkspaceData`,
 * `AcceptEditorState`, `RegisterTextEditor`), installed at service
 * construction for `Handler/Notification/Handler.ts` to call into.
 *
 * State (workspace shape, active/visible editors, listener registries)
 * lives in direct-mutation locals captured by the service closure - not
 * Effect `Ref`s - so synchronous getters (`workspaceFolders`,
 * `activeTextEditor`) serve extensions without running an Effect.
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (ExtHostWorkspace)
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
			const Configuration = yield* Context.Tag<ConfigurationService>(
				"Service/Configuration",
			);

			const Logger = yield* Context.Tag<Logger>("Service/Logger");

			/**
			 * Parse a URI string into a `vscode.Uri`-shaped object. The
			 * `VSCode` import is type-only (erased by esbuild), so
			 * `VSCode.Uri.parse` does not exist at runtime - this local
			 * builder provides the getters extensions rely on (`fsPath`,
			 * `toString`), mirroring the notification handler's stub.
			 */
			const ParseUri = (Raw: string): VSCode.Uri => {
				const Match =
					/^([A-Za-z][A-Za-z0-9+.-]*):(?:\/\/([^/]*))?(.*)$/.exec(
						Raw,
					);

				const Scheme = Match?.[1] ?? "file";

				const Authority = Match?.[2] ?? "";

				const Path = Match ? (Match[3] ?? "") : Raw;

				return {
					scheme: Scheme,
					authority: Authority,
					path: Path,
					query: "",
					fragment: "",
					fsPath: Path,
					toString: () => Raw,
					toJSON: () => ({
						scheme: Scheme,
						authority: Authority,
						path: Path,
					}),
					with: () => ParseUri(Raw),
				} as unknown as VSCode.Uri;
			};

			// Internal workspace state - plain locals, direct mutation
			let _internalWorkspace: InternalWorkspace | undefined;

			// Text editor tracking - keyed by document URI string
			const _textEditorsMap = new Map<string, VSCode.TextEditor>();

			let _activeTextEditor: VSCode.TextEditor | undefined;

			let _visibleTextEditors: readonly VSCode.TextEditor[] = [];

			// Event listener registries (fire on AcceptWorkspaceData / IPC notifications)
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
			 * Accept workspace data from Mountain. Invoked through the
			 * `__COCOON_WORKSPACE_BRIDGE__` global by the live notification
			 * handler (`Handler/Notification/Handler.ts` case
			 * `$deltaWorkspaceFolders`).
			 *
			 * TYPECONVERTR: Integrate TypeConverter for WorkspaceFolder conversion
			 */
			const AcceptWorkspaceData = (Data: any) =>
				Effect.gen(function* () {
					const OldWorkspace = _internalWorkspace;

					// Map incoming workspace folder DTOs to VSCode.WorkspaceFolder objects.
					// Defensive: per-folder try/catch + empty-string skip
					// so a single malformed entry (extension supplied
					// `{uri:""}` during a workspace shape transition,
					// or Mountain forwarded a partial DTO) doesn't tank
					// the whole workspace update. Stock VS Code's
					// MainThreadWorkspace ignores invalid folders rather
					// than throwing.
					const Folders: VSCode.WorkspaceFolder[] = [];

					for (const [Index, F] of (Data.folders ?? []).entries()) {
						try {
							const Source =
								typeof F === "string"
									? F
									: ((F as any).uri ?? (F as any).path ?? F);

							const SourceString =
								typeof Source === "string"
									? Source
									: String(Source ?? "");

							if (!SourceString) continue;

							Folders.push({
								uri: ParseUri(SourceString),
								name:
									(F as any).name ??
									(typeof F === "string"
										? (F.split("/").pop() ?? "")
										: ""),
								index: (F as any).index ?? Index,
							});
						} catch {
							/* skip the bad folder; the rest of the set
							 * is still valid */
						}
					}

					// Same defensive parse for the optional `configuration`
					// URI - empty string would throw `[UriError]`.
					let ConfigurationUri: VSCode.Uri | undefined;

					if (
						typeof Data.configuration === "string" &&
						Data.configuration.length > 0
					) {
						try {
							ConfigurationUri = ParseUri(Data.configuration);
						} catch {
							ConfigurationUri = undefined;
						}
					}

					const NewWorkspace: InternalWorkspace = {
						ID: Data.id,
						Name: Data.name,
						Folders,
						Configuration: ConfigurationUri,
					};

					_internalWorkspace = NewWorkspace;

					yield* Logger.Info(
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
									Folder.uri.toString() ===
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
			 * Invoked through the `__COCOON_WORKSPACE_BRIDGE__` global by the
			 * live notification handler (`Handler/Notification/Handler.ts`
			 * case `window.didChangeActiveTextEditor`). Editor ids are
			 * document URI strings registered via `RegisterTextEditor`.
			 *
			 * TYPECONVERTR: Integrate TypeConverter for TextEditor conversion
			 */
			const AcceptEditorState = (
				ActiveEditorId: string | undefined,

				VisibleEditorIds: string[],
			) =>
				Effect.gen(function* () {
					const TextEditorsMap = _textEditorsMap;

					// Update active editor
					const OldActiveEditor = _activeTextEditor;

					const NewActiveEditor = ActiveEditorId
						? TextEditorsMap.get(ActiveEditorId)
						: undefined;

					_activeTextEditor = NewActiveEditor;

					if (OldActiveEditor !== NewActiveEditor) {
						yield* Logger.Debug(
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

					_visibleTextEditors = NewVisibleEditors;

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
				const Workspace = _internalWorkspace;

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
							Uri = ParseUri(
								`untitled:${Language}-${Date.now()}`,
							);

							Language = uriOrOptions.language;

							Content = uriOrOptions.content;
						}
					} else {
						// Open current active document
						const ActiveEditor = _activeTextEditor;

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

					// Fetch actual file content via fs.readFile to build a real TextDocument
					let DocumentContent = Content ?? "";

					let DocumentLanguage = Language ?? "plaintext";

					if (Uri.scheme === "file") {
						const FileBytes = yield* Effect.either(
							mountainClient.readFile(Uri.toString()),
						);

						if (FileBytes._tag === "Right") {
							DocumentContent = new TextDecoder().decode(
								FileBytes.right,
							);

							const Ext = Uri.fsPath.split(".").pop() ?? "";

							const ExtMap: Record<string, string> = {
								ts: "typescript",
								tsx: "typescriptreact",
								js: "javascript",
								jsx: "javascriptreact",
								rs: "rust",
								py: "python",
								json: "json",
								md: "markdown",
								toml: "toml",
								yaml: "yaml",
								yml: "yaml",
								css: "css",
								html: "html",
								sh: "shellscript",
							};

							DocumentLanguage =
								Language ?? ExtMap[Ext] ?? "plaintext";
						}
					}

					const DocumentLines = DocumentContent.split("\n");

					return {
						uri: Uri,
						languageId: DocumentLanguage,
						version: 1,
						isDirty: false,
						isClosed: false,
						getText: (Range?: any) => {
							if (!Range) return DocumentContent;

							return DocumentLines.slice(
								Range.start.line,

								Range.end.line + 1,
							).join("\n");
						},
						lineCount: DocumentLines.length,
						lineAt: (LineOrPos: any) => {
							const Num =
								typeof LineOrPos === "number"
									? LineOrPos
									: LineOrPos.line;

							const Text = DocumentLines[Num] ?? "";

							return {
								lineNumber: Num,
								text: Text,
								range: {
									start: { line: Num, character: 0 },
									end: { line: Num, character: Text.length },
								},
								firstNonWhitespaceCharacterIndex:
									Text.search(/\S|$/),
							};
						},
						offsetAt: (Pos: any) =>
							DocumentLines.slice(0, Pos.line).reduce(
								(Sum: number, L: string) => Sum + L.length + 1,

								0,
							) + Pos.character,
						positionAt: (Offset: number) => {
							let Remaining = Offset;

							for (let I = 0; I < DocumentLines.length; I++) {
								const Len = DocumentLines[I]!.length + 1;

								if (Remaining < Len)
									return { line: I, character: Remaining };

								Remaining -= Len;
							}

							return {
								line: DocumentLines.length - 1,
								character: 0,
							};
						},
						getWordRangeAtPosition: () => undefined,
						validateRange: (R: any) => R,
						validatePosition: (P: any) => P,
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
			 */
			const GetConfiguration = (
				section?: string,

				_scope?: VSCode.ConfigurationScope | null,
			): VSCode.WorkspaceConfiguration => {
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
					return _internalWorkspace?.Name;
				},
				get workspaceFile() {
					return _internalWorkspace?.Configuration;
				},
				get workspaceFolders() {
					return _internalWorkspace?.Folders;
				},
				get isTrusted() {
					// DEPENDENCY: Mountain trust status - default to true until Mountain provides trust state
					return true;
				},
				get activeTextEditor() {
					return _activeTextEditor;
				},
				get visibleTextEditors() {
					return _visibleTextEditors;
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

			// Bridge for the live notification path. The gRPC notification
			// handler (`Handler/Notification/Handler.ts`) runs outside the
			// Effect layer graph, so it reaches this service through a
			// global registry instead of a Tag. Wrappers run the Effects on
			// the default runtime and swallow failures - notification
			// delivery must never throw into the gRPC dispatcher.
			(globalThis as any).__COCOON_WORKSPACE_BRIDGE__ = {
				AcceptWorkspaceData: (Data: unknown): void => {
					void Effect.runPromise(AcceptWorkspaceData(Data)).catch(
						() => {},
					);
				},

				AcceptEditorState: (
					ActiveEditorId: string | undefined,

					VisibleEditorIds: string[],
				): void => {
					void Effect.runPromise(
						AcceptEditorState(ActiveEditorId, VisibleEditorIds),
					).catch(() => {});
				},

				RegisterTextEditor: (
					Id: string,

					Editor: VSCode.TextEditor,
				): void => {
					_textEditorsMap.set(Id, Editor);
				},
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
