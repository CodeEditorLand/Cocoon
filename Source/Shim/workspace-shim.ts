/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim (shims/workspace-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.workspace` API (`IExtHostWorkspace`) for Cocoon.
 * Provides information about the current workspace (folders, name, configuration file)
 * and handles document-related events.
 *
 * Responsibilities:
 * - Caching workspace information (`folders`, `name`, `workspaceFile`) received from
 *   Mountain via `initData`.
 * - Providing getters for `workspaceFolders`, `name`, `workspaceFile`, `isTrusted`.
 * - Implementing `getWorkspaceFolder(uri, resolveParent?)` logic locally based on cached folders.
 * - Proxying requests for potentially more up-to-date or complex lookups to Mountain
 *   (`$getWorkspaceFolders`, `$resolveWorkspaceFolder`) via RPC.
 * - Proxying `findFiles` (via MainThreadWorkspace) and `save`, `saveAs`, `saveAll`
 *   (via MainThreadDocuments), `requestWorkspaceTrust` calls to Mountain.
 * - Providing the `textDocuments` array by delegating to the injected `ShimDocumentService`.
 * - Providing document lifecycle events (`onDidOpenTextDocument`, `onDidCloseTextDocument`,
 *
 *
 *
 *
 *   `onDidChangeTextDocument`) by subscribing to the events from the injected `ShimDocumentService`.
 * - Providing workspace events (`onDidChangeWorkspaceFolders`, `onDidGrantWorkspaceTrust`)
 *   by listening to notifications (`$onDidChangeWorkspaceFolders` via IPC, `$onDidGrantWorkspaceTrust` via RPC)
 *   sent from Mountain.
 *
 * Key Interactions:
 * - Provides parts of the `vscode.workspace` API surface.
 * - Receives initial state via `initData`.
 * - Injected with and interacts with `ShimDocumentService` (required).
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadWorkspace)` and `getProxy(MainContext.MainThreadDocuments)`.
 * - Receives notifications (folder/trust changes) via `cocoon-ipc.js` or RPC.
 * - Uses bundled `URI`, `Event`, `Emitter`, `RelativePattern`.
 *--------------------------------------------------------------------------------------------*/

import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { dispose, IDisposable } from "vs/base/common/lifecycle";
// VS Code internal URI, ensure this is the one used for revival
import { URI } from "vs/base/common/uri";
// For updateWorkspaceFolders
import { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import {
	CanonicalUriProvider,
	ConfigurationScope,
	EditSessionIdentityProvider,
	FileStat,
	FileSystem,
	FileSystemProvider,
	FileType,
	FindTextInFilesOptions,
	GlobPattern,
	OpenDialogOptions,
	PortAttributesProvider,
	QuickDiffProvider,
	SaveDialogOptions,
	TaskProvider,
	TextDocument,
	TextDocumentChangeEvent,
	TextDocumentContentProvider,
	TextSearchQuery,
	TextSearchResult,
	TimelineProvider,
	TunnelProvider,
	UriHandler,
	RelativePattern as VscodeRelativePattern,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFolderPickOptions,
	WorkspaceTrustRequestOptions,
	// vscode API types
} from "vscode";

// For IPC events
import * as ipc from "../cocoon-ipc";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";
// Assuming ShimDocumentService and its event types are defined and exported correctly
import { ShimDocumentService } from "./document-shim";

// --- Type definitions ---

// For initData structure
interface WorkspaceInitDataDto {
	id: string;
	name: string;
	isUntitled?: boolean;
	// URI components for workspace file
	configuration?: UriComponentsDto | null;
	folders: WorkspaceFolderDto[];
}

interface ShimInitDataWorkspace {
	workspace?: WorkspaceInitDataDto;
	environment?: {
		isTrusted?: boolean;
		// other env properties
	};
}

interface UriComponentsDto {
	// Based on common marshalling
	$mid?: number;
	scheme: string;
	authority?: string;
	path: string;
	query?: string;
	fragment?: string;
	// Often included
	external?: string;
	// Sometimes included
	fsPath?: string;
}

interface WorkspaceFolderDto {
	uri: UriComponentsDto;
	name: string;
	index: number;
}

// RPC Shape for MainThreadWorkspace
interface MainThreadWorkspaceShape {
	$getWorkspaceFolders(): Promise<WorkspaceFolderDto[]>;
	$resolveWorkspaceFolder(
		uri: UriComponentsDto,
	): Promise<WorkspaceFolderDto | undefined>;
	// Assuming it's a subscription
	$onDidGrantWorkspaceTrust(callback: () => void): IDisposable;
	$findFiles(
		include: RpcGlobPattern | string,

		exclude?: RpcGlobPattern | string | null,

		options?: {
			maxResults?: number | null;
			[key: string]: any /* useIgnoreFiles etc*/;
		},
	): Promise<UriComponentsDto[]>;
	$requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined>;
	// updateWorkspaceFolders is typically not exposed via RPC to ExtHost this way
}

// RPC Shape for MainThreadDocuments (subset needed here)
interface MainThreadDocumentsShape {
	$trySaveDocument(uri: UriComponentsDto): Promise<boolean>;
	$trySaveDocumentAs(
		uri: UriComponentsDto,
	): Promise<UriComponentsDto | undefined>;
	$saveAll(includeUntitled?: boolean): Promise<boolean>;
	// Or returns UriComponents if untitled
	$tryOpenDocument(uri: UriComponentsDto): Promise<void>;
}

interface RpcGlobPattern {
	// Structure for RelativePattern over RPC
	pattern: string;
	base?: UriComponentsDto;
}

// Interface for ExtHostWorkspace (methods called by main thread if any, beyond events)
interface ExtHostWorkspaceShape {
	// Placeholder, this shim primarily provides the API, MainThread calls specific event handlers
	// $onDidChangeWorkspaceFolders for example, might be an RPC call from main thread if not IPC
}

export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements ExtHostWorkspaceShape
{
	public readonly _serviceBrand: undefined;
	readonly #initData: ShimInitDataWorkspace;
	#folders: WorkspaceFolder[] = [];
	// Use VS Code internal URI
	#workspaceFile: URI | null = null;
	#workspaceInfo: { id: string; name: string; isUntitled: boolean } | null =
		null;

	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceShape | null = null;
	readonly #mainThreadDocsProxy: MainThreadDocumentsShape | null = null;
	// Injected
	readonly #extHostDocuments: ShimDocumentService;

	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<WorkspaceFoldersChangeEvent>();
	// Event payload is void
	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();
	readonly #onDidOpenTextDocumentEmitter = new VscodeEmitter<TextDocument>();
	readonly #onDidCloseTextDocumentEmitter = new VscodeEmitter<TextDocument>();
	readonly #onDidChangeTextDocumentEmitter =
		new VscodeEmitter<TextDocumentChangeEvent>();

	// Store disposables for cleanup
	readonly #disposables: IDisposable[] = [];

	constructor(
		rpcService: IExtHostRpcService | undefined,

		initData: ShimInitDataWorkspace,

		logService: ILogService | undefined,

		extHostDocuments: ShimDocumentService,
	) {
		super("ExtHostWorkspace", rpcService, logService);
		this.#initData = initData;
		this.#extHostDocuments = extHostDocuments;
		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadWorkspaceProxy = this._getProxy(
				MainContext.MainThreadWorkspace as ProxyIdentifier<MainThreadWorkspaceShape>,
			);
			this.#mainThreadDocsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsShape>,
			);
		}

		if (this.#mainThreadWorkspaceProxy)
			this._log("MainThreadWorkspace RPC proxy obtained.");
		else this._logError("Failed to get MainThreadWorkspace RPC proxy!");
		if (this.#mainThreadDocsProxy)
			this._log("MainThreadDocuments RPC proxy obtained.");
		else this._logError("Failed to get MainThreadDocuments RPC proxy!");

		if (initData.workspace) {
			this.#workspaceInfo = {
				id: initData.workspace.id,

				name: initData.workspace.name,

				isUntitled: !!initData.workspace.isUntitled,
			};
			if (initData.workspace.configuration) {
				this.#workspaceFile = this._reviveUriDto(
					initData.workspace.configuration,
				);
			}

			if (Array.isArray(initData.workspace.folders)) {
				this.#folders = initData.workspace.folders
					.map((fDto, index): WorkspaceFolder | null => {
						const revivedUri = this._reviveUriDto(fDto.uri);
						if (!revivedUri) {
							this._logError(
								`Failed to revive folder URI DTO:`,

								fDto.uri,
							);
							return null;
						}

						return {
							uri: revivedUri,

							name: fDto.name,

							index: fDto.index ?? index,
						};
					})
					.filter((f): f is WorkspaceFolder => f !== null);
			}
		}

		this._log(
			`Initialized with ${this.#folders.length} folders. File: ${this.#workspaceFile?.toString() ?? "None"}. Name: ${this.name ?? "N/A"}`,
		);

		// Subscribe to events
		if (this.#mainThreadWorkspaceProxy) {
			// $onDidGrantWorkspaceTrust on the proxy is assumed to be a method that accepts a callback
			// for an event originating from the main thread.
			// VS Code RPC often uses Emitter on proxy side for events.
			// If it's a direct callback registration:
			// this.#mainThreadWorkspaceProxy.$onDidGrantWorkspaceTrust(() => { ... });
			// For this shim, we'll assume it's an IPC or a specific RPC event handler on this class.
			// The original JS used proxy.$onDidGrantWorkspaceTrust(), which implies it's an event emitter on the proxy itself.
			// This pattern is less common with new RPC. Let's assume it needs an explicit method registration if it's an incoming call.
			// For now, this class will handle the firing if Mountain calls a method like `$acceptWorkspaceTrustChanged`.
			// The original JS had: this.#mainThreadWorkspaceProxy.$onDidGrantWorkspaceTrust(() => { ... });
			// This might be an error in original JS or imply a specific proxy setup.
			// Let's keep it as a comment for now.
		}

		ipc.onWorkspaceFoldersChanged(async () => {
			// Make async as _fetchAndUpdateFolders is async
			this._log("IPC: workspaceFoldersChanged. Refetching...");
			// Now awaits
			await this._fetchAndUpdateFolders();
		});
		this._log("Subscribed to IPC workspace folder changes.");

		this.#extHostDocuments.onDidAddDocument(
			this.#onDidOpenTextDocumentEmitter.fire,

			this.#onDidOpenTextDocumentEmitter,

			this.#disposables,
		);
		this.#extHostDocuments.onDidRemoveDocument(
			this.#onDidCloseTextDocumentEmitter.fire,

			this.#onDidCloseTextDocumentEmitter,

			this.#disposables,
		);
		this.#extHostDocuments.onDidChangeDocument(
			this.#onDidChangeTextDocumentEmitter.fire,

			this.#onDidChangeTextDocumentEmitter,

			this.#disposables,
		);
		this._log("Subscribed to document service events.");

		// If ExtHostWorkspace itself needs to be callable by MainThread (e.g. for folder changes if not IPC)
		// this._rpcService?.set(ExtHostContext.ExtHostWorkspace as ProxyIdentifier<ExtHostWorkspaceShape>, this);
	}

	// --- Helper Methods ---
	protected _reviveUriDto(
		uriDto: UriComponentsDto | null | undefined,
	): URI | null {
		if (!uriDto) return null;
		try {
			// Use base class _reviveApiArgument for consistency with other shims
			const revived = super._reviveApiArgument<URI>(uriDto);
			if (revived instanceof URI) return revived;

			// Fallback if base reviver doesn't work or if $mid is missing
			// URI.revive can take plain objects if they match structure.
			// Cast if dto isn't exactly what URI.revive expects
			return URI.revive(uriDto as any);
		} catch (e: any) {
			this._logError("Failed to revive URI DTO:", uriDto, e);
			return null;
		}
	}

	protected _uriToComponentsDto(uri: URI): UriComponentsDto | undefined {
		// Use base class _convertApiArgToInternal
		const components = super._convertApiArgToInternal(uri);
		if (
			components &&
			typeof components.scheme === "string" &&
			typeof components.path === "string"
		) {
			return components as UriComponentsDto;
		}

		this._logError(
			"Failed to convert URI to DTO components via base method.",

			uri,
		);
		// Or throw
		return undefined;
	}

	protected _convertGlobDto(
		pattern: GlobPattern,
	): RpcGlobPattern | string | undefined {
		if (typeof pattern === "string") return pattern;
		if (pattern instanceof VscodeRelativePattern) {
			const baseComponents = pattern.base
				? this._uriToComponentsDto(URI.parse(pattern.base.toString()))
				: // Convert vscode.Uri to internal URI then to DTO
					undefined;
			return { pattern: pattern.pattern, base: baseComponents };
		}

		// Handle legacy GlobPattern interface { pattern: string; base?: string | Uri } - this is complex due to Uri type diff
		if (
			pattern &&
			typeof pattern === "object" &&
			typeof (pattern as any).pattern === "string"
		) {
			const legacyPattern = pattern as {
				pattern: string;
				base?: string | /*vscode.Uri*/ any;
			};
			let baseComponents: UriComponentsDto | undefined = undefined;
			if (typeof legacyPattern.base === "string") {
				try {
					baseComponents = this._uriToComponentsDto(
						URI.parse(legacyPattern.base),
					);
				} catch (e) {
					this._logWarn(
						"Failed to parse string base in GlobPattern DTO:",

						legacyPattern.base,

						e,
					);
				}
			} else if (
				legacyPattern.base /* instanceof vscode.Uri */ &&
				typeof legacyPattern.base.toString === "function"
			) {
				// Assuming legacyPattern.base is vscode.Uri, convert to internal URI then to DTO
				try {
					baseComponents = this._uriToComponentsDto(
						URI.parse(legacyPattern.base.toString()),
					);
				} catch (e) {
					this._logWarn(
						"Failed to convert vscode.Uri base in GlobPattern DTO:",

						legacyPattern.base,

						e,
					);
				}
			}

			return { pattern: legacyPattern.pattern, base: baseComponents };
		}

		this._logWarn(
			"Unsupported glob pattern type for DTO conversion:",

			pattern,
		);
		return undefined;
	}

	private async _fetchAndUpdateFolders(): Promise<void> {
		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"Cannot fetch folders, MainThreadWorkspace proxy unavailable.",
			);
			return;
		}

		this._log("Fetching updated folders via RPC...");
		try {
			const foldersData =
				await this.#mainThreadWorkspaceProxy.$getWorkspaceFolders();
			const newFolders: WorkspaceFolder[] = Array.isArray(foldersData)
				? foldersData
						.map((fDto, index): WorkspaceFolder | null => {
							const revivedUri = this._reviveUriDto(fDto.uri);
							if (!revivedUri) return null;
							return {
								uri: revivedUri,

								name: fDto.name,

								index: fDto.index ?? index,
							};
						})
						.filter((f): f is WorkspaceFolder => f !== null)
				: [];

			const oldFolderUris = this.#folders
				.map((f) => f.uri.toString())
				.sort();
			const newFolderUris = newFolders
				.map((f) => f.uri.toString())
				.sort();

			if (
				JSON.stringify(oldFolderUris) !== JSON.stringify(newFolderUris)
			) {
				this._log(
					"Workspace folders changed. Updating cache and firing event.",
				);
				// Shallow clone for event
				const oldFolders = [...this.#folders];
				this.#folders = newFolders;
				const eventData = this._calculateFoldersChangeEvent(
					oldFolders,

					newFolders,
				);
				this.#onDidChangeWorkspaceFoldersEmitter.fire(eventData);
				this._log(
					`Fired onDidChangeWorkspaceFolders: ${eventData.added.length} added, ${eventData.removed.length} removed.`,
				);
			} else {
				this._log("Fetched folders, no changes detected.");
			}
		} catch (e: any) {
			this._logError(
				"Failed to fetch/update workspace folders via RPC:",

				e,
			);
		}
	}

	private _calculateFoldersChangeEvent(
		oldFolders: readonly WorkspaceFolder[],

		newFolders: readonly WorkspaceFolder[],
	): WorkspaceFoldersChangeEvent {
		const oldSorted = [...oldFolders].sort((a, b) => a.index - b.index);
		const newSorted = [...newFolders].sort((a, b) => a.index - b.index);

		const added: WorkspaceFolder[] = [];
		const removed: WorkspaceFolder[] = [];

		let oldIdx = 0;
		let newIdx = 0;

		while (oldIdx < oldSorted.length || newIdx < newSorted.length) {
			const oldF = oldSorted[oldIdx];
			const newF = newSorted[newIdx];

			if (oldF && newF) {
				if (oldF.uri.toString() === newF.uri.toString()) {
					// Same folder, might have name/index change
					if (oldF.name !== newF.name || oldF.index !== newF.index) {
						// For simplicity, treat as remove and add if properties other than URI changed.
						// A more precise diff would be needed for just property changes.
						removed.push(oldF);
						added.push(newF);
					}

					oldIdx++;
					newIdx++;
				} else if (
					newF.index <= oldF.index ||
					(oldF.index > newF.index &&
						newIdx < newSorted.length - 1 &&
						newSorted[newIdx + 1].index <= oldF.index)
				) {
					// Heuristic: newF inserted or comes before oldF
					added.push(newF);
					newIdx++;
				} else {
					// oldF must have been removed
					removed.push(oldF);
					oldIdx++;
				}
			} else if (oldF) {
				removed.push(oldF);
				oldIdx++;
			} else if (newF) {
				added.push(newF);
				newIdx++;
			} else {
				break;
				// Should not happen
			}
		}

		return Object.freeze({
			added: Object.freeze(added),

			removed: Object.freeze(removed),
		});
	}

	// --- Public API Getters (vscode.workspace) ---
	get workspaceFile(): URI | null {
		return this.#workspaceFile;
		// Use VS Code internal URI type
	}

	get name(): string | undefined {
		return this.#workspaceInfo?.name;
	}

	get workspaceFolders(): readonly WorkspaceFolder[] | undefined {
		return this.#folders.length
			? Object.freeze([...this.#folders])
			: undefined;
	}

	get isTrusted(): boolean {
		return this.#initData.environment?.isTrusted ?? false;
		// Default to not trusted if unspecified
	}

	// --- Public API Methods (vscode.workspace) ---
	public getWorkspaceFolder(uri: URI): WorkspaceFolder | undefined {
		// uri is VS Code internal URI
		if (!this.#folders.length || !uri) return undefined;
		const sortedFolders = [...this.#folders].sort(
			(a, b) => b.uri.path.length - a.uri.path.length,
		);
		for (const folder of sortedFolders) {
			if (
				uri.scheme === folder.uri.scheme &&
				uri.authority === folder.uri.authority
			) {
				const folderPath = folder.uri.path.endsWith("/")
					? folder.uri.path
					: folder.uri.path + "/";
				if (
					uri.path.startsWith(folderPath) ||
					uri.path === folder.uri.path
				) {
					return folder;
				}
			}
		}

		return undefined;
	}

	public async getConfiguration(
		section?: string,

		scope?: ConfigurationScope,
	): Promise<WorkspaceConfiguration> {
		this._log(
			`getConfiguration (section: ${section}) -> delegating to IExtHostConfiguration`,
		);
		if (!global.cocoonInstantiationService)
			throw new Error("DI service unavailable for getConfiguration");
		const {
			IExtHostConfiguration,

			// Late require
		} = require("vs/workbench/api/common/extHostConfiguration");
		const configService = global.cocoonInstantiationService.invokeFunction(
			(accessor) =>
				accessor.get<typeof IExtHostConfiguration>(
					IExtHostConfiguration,
				),
		);
		// Cast scope if type mismatch from vscode.d.ts
		return configService.getConfiguration(section, scope as any);
	}

	public async findFiles(
		include: GlobPattern,

		exclude?: GlobPattern | null,

		maxResults?: number | null,

		token?: CancellationToken,
	): Promise<URI[]> {
		// Returns VS Code internal URI[]
		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"findFiles: RPC proxy unavailable, returning empty array.",
			);
			return [];
		}

		this._log(
			`findFiles: include=${include}, exclude=${exclude}, max=${maxResults}`,
		);
		if (token?.isCancellationRequested) return [];

		try {
			const includeDto = this._convertGlobDto(include);
			const excludeDto = exclude ? this._convertGlobDto(exclude) : null;
			const options = {
				maxResults,

				...(token ? { token: (token as any).id } : {}),

				// Simplistic token handling
			};

			const resultsDto = await this.#mainThreadWorkspaceProxy.$findFiles(
				includeDto as any,

				excludeDto as any,

				options,
			);
			if (token?.isCancellationRequested) return [];
			return Array.isArray(resultsDto)
				? (resultsDto
						.map((dto) => this._reviveUriDto(dto))
						.filter((u) => u !== null) as URI[])
				: [];
		} catch (e: any) {
			if (e instanceof Error && e.name === "Canceled") return [];
			this._logError("workspace.findFiles RPC failed:", e);
			return [];
		}
	}

	// save, saveAs, saveAll delegate to MainThreadDocuments
	public async saveAll(includeUntitled: boolean = true): Promise<boolean> {
		if (!this.#mainThreadDocsProxy) {
			this._logError("saveAll: Docs proxy unavailable");
			return false;
		}

		this._log(`saveAll (includeUntitled: ${includeUntitled})`);
		try {
			return await this.#mainThreadDocsProxy.$saveAll(includeUntitled);
		} catch (e: any) {
			this._logError("saveAll RPC failed:", e);
			return false;
		}
	}

	// Stub for save(uri) and saveAs(uri) as they are not directly on workspace but TextDocument
	// However, vscode.workspace.applyEdit uses them, or they could be utility.
	// These are typically NOT on `vscode.workspace` but on `vscode.TextDocument`.
	// The original shim might have had them for a different purpose or for `applyEdit`.
	// Let's keep them as stubs if they were truly intended for `vscode.workspace`.

	public async requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined> {
		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn("requestWorkspaceTrust: RPC proxy unavailable.");
			return Promise.resolve(undefined);
		}

		this._log("requestWorkspaceTrust");
		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	public updateWorkspaceFolders(
		// Info only
		_extension: IExtensionDescription,

		_index: number | undefined,

		_deleteCount: number | null | undefined,

		// URI is VS Code internal
		..._workspaceFoldersToAdd: ReadonlyArray<{ uri: URI; name?: string }>
	): boolean {
		this._logWarn(
			`updateWorkspaceFolders called - This is normally disallowed for extensions. Ignoring.`,
		);
		// Indicate no change made
		return false;
	}

	// --- Events (vscode.workspace) ---
	get onDidChangeWorkspaceFolders(): VscodeEvent<WorkspaceFoldersChangeEvent> {
		return this.#onDidChangeWorkspaceFoldersEmitter.event;
	}

	get onDidGrantWorkspaceTrust(): VscodeEvent<void> {
		return this.#onDidGrantWorkspaceTrustEmitter.event;
	}

	get onDidOpenTextDocument(): VscodeEvent<TextDocument> {
		return this.#onDidOpenTextDocumentEmitter.event;
	}

	get onDidCloseTextDocument(): VscodeEvent<TextDocument> {
		return this.#onDidCloseTextDocumentEmitter.event;
	}

	get onDidChangeTextDocument(): VscodeEvent<TextDocumentChangeEvent> {
		return this.#onDidChangeTextDocumentEmitter.event;
	}

	// --- Text Document Properties (delegated) ---
	get textDocuments(): readonly TextDocument[] {
		return this.#extHostDocuments.getTextDocuments();
	}

	// --- Stubs for unimplemented / complex APIs ---
	get onWillSaveTextDocument(): VscodeEvent<any> {
		this._logWarnOnce("Event not implemented: onWillSaveTextDocument");
		return VscodeEvent.None;
	}

	get onDidSaveTextDocument(): VscodeEvent<TextDocument> {
		this._logWarnOnce("Event not implemented: onDidSaveTextDocument");
		return VscodeEvent.None;
	}

	get notebookDocuments(): readonly any[] {
		this._logWarnOnce("API not implemented: workspace.notebookDocuments");
		return [];
	}

	public async openTextDocument(
		uriOrOptions?: URI | { language?: string; content?: string } | string,
	): Promise<TextDocument> {
		// URI is VS Code internal URI or string path
		if (!this.#mainThreadDocsProxy)
			throw new Error("openTextDocument: Docs proxy unavailable.");
		let uriToOpenDto: UriComponentsDto | undefined;

		if (uriOrOptions instanceof URI) {
			uriToOpenDto = this._uriToComponentsDto(uriOrOptions);
		} else if (typeof uriOrOptions === "string") {
			// Assume file path
			uriToOpenDto = this._uriToComponentsDto(URI.file(uriOrOptions));
		} else if (uriOrOptions && typeof uriOrOptions === "object") {
			// { language, content } for untitled
			this._logWarn(
				"openTextDocument with content/language options for untitled needs specific MainThread RPC, not fully implemented.",
			);
			// Requires a different RPC call like $createUntitledDocument or similar on MainThreadDocuments
			// For now, let's throw or return a dummy.
			throw new Error(
				"openTextDocument with content/language options not implemented.",
			);
		}

		if (!uriToOpenDto)
			throw new Error("Invalid URI or options for openTextDocument.");

		this._log(`openTextDocument for ${uriToOpenDto.path}`);
		await this.#mainThreadDocsProxy.$tryOpenDocument(uriToOpenDto);
		const doc = this.#extHostDocuments.getDocument(
			this._reviveUriDto(uriToOpenDto)!,

			// Assert revived URI not null
		);
		if (!doc)
			throw new Error(
				`Document ${uriToOpenDto.path} not found after open attempt.`,
			);
		return doc.document;
	}

	// Many more stubs from original JS, ensure they return types expected by vscode.d.ts
	public get fs(): FileSystem {
		this._logWarnOnce(
			"API not fully implemented: workspace.fs (returning basic stub)",
		);
		if (!global.cocoonInstantiationService)
			throw new Error("DI service unavailable for workspace.fs");
		// This should return an instance of ShimFileSystemApi or similar
		// Late require
		// const { ShimFileSystemApi } = require("./fs-api-shim");
		// Assuming constructor matches
		// return new ShimFileSystemApi(this._logService);
		// For now, a very basic stub:
		return {
			stat: async (_uri: URI): Promise<FileStat> => {
				throw new Error("workspace.fs.stat NOP");
			},

			readDirectory: async (_uri: URI): Promise<[string, FileType][]> => {
				throw new Error("workspace.fs.readDirectory NOP");
			},

			createDirectory: async (_uri: URI): Promise<void> => {
				throw new Error("workspace.fs.createDirectory NOP");
			},

			readFile: async (_uri: URI): Promise<Uint8Array> => {
				throw new Error("workspace.fs.readFile NOP");
			},

			writeFile: async (
				_uri: URI,

				_content: Uint8Array,
			): Promise<void> => {
				throw new Error("workspace.fs.writeFile NOP");
			},

			delete: async (_uri: URI): Promise<void> => {
				throw new Error("workspace.fs.delete NOP");
			},

			rename: async (_source: URI, _target: URI): Promise<void> => {
				throw new Error("workspace.fs.rename NOP");
			},

			copy: async (_source: URI, _target: URI): Promise<void> => {
				throw new Error("workspace.fs.copy NOP");
			},

			isWritableFileSystem: (_scheme: string): boolean | undefined =>
				undefined,

			onDidChangeFile: VscodeEvent.None,

			// ... other FileSystem methods
		} as FileSystem;
	}

	public getRelativePath = (
		pathOrUri: string | URI,

		_includeWorkspace?: boolean,
	): string => {
		this._logWarnOnce(
			"API not fully implemented: workspace.getRelativePath (basic fallback)",
		);
		const targetPath =
			typeof pathOrUri === "string" ? pathOrUri : pathOrUri.fsPath;
		const bestFolder = this.getWorkspaceFolder(
			typeof pathOrUri === "string" ? URI.file(pathOrUri) : pathOrUri,
		);
		if (bestFolder) {
			if (targetPath.startsWith(bestFolder.uri.fsPath)) {
				const relative = targetPath
					.substring(bestFolder.uri.fsPath.length)
					.replace(/^[\/\\]/, "");
				return _includeWorkspace
					? `${bestFolder.name}/${relative}`
					: relative;
			}
		}

		return targetPath;
	};

	// Dispose of event listener subscriptions
	public dispose(): void {
		// Call base dispose if it exists
		super.dispose();
		dispose(this.#disposables);
		this.#onDidChangeWorkspaceFoldersEmitter.dispose();
		this.#onDidGrantWorkspaceTrustEmitter.dispose();
		this.#onDidOpenTextDocumentEmitter.dispose();
		this.#onDidCloseTextDocumentEmitter.dispose();
		this.#onDidChangeTextDocumentEmitter.dispose();
	}

	// --- RPC method for main thread to call if $onDidGrantWorkspaceTrust is not an event on proxy ---
	public $acceptGrantWorkspaceTrust(): void {
		// Example name
		this._log("Received $acceptGrantWorkspaceTrust from main thread.");
		this.#onDidGrantWorkspaceTrustEmitter.fire();
	}

	// --- RPC method for main thread to call if onDidChangeWorkspaceFolders is not IPC based ---
	public $acceptWorkspaceFoldersChanged(eventData: {
		added: WorkspaceFolderDto[];
		removed: WorkspaceFolderDto[];
	}): void {
		this._log("Received $acceptWorkspaceFoldersChanged from main thread.");
		const added = eventData.added
			.map((d) => this._reviveFolderDto(d))
			.filter((f) => f !== null) as WorkspaceFolder[];
		const removed = eventData.removed
			.map((d) => this._reviveFolderDto(d))
			.filter((f) => f !== null) as WorkspaceFolder[];

		// Update internal cache #folders carefully before firing event
		// This needs a more robust diffing and update strategy if Mountain sends deltas.
		// For now, assume this replaces _fetchAndUpdateFolders if used.
		this._logWarnOnce(
			"$acceptWorkspaceFoldersChanged implies Mountain sends deltas, current _fetchAndUpdateFolders refetches all.",
		);
		const currentFolders = [...this.#folders];
		this.#folders = this.#folders.filter(
			(f) => !removed.find((r) => r.uri.toString() === f.uri.toString()),
		);
		this.#folders.push(
			...added.filter(
				(a) =>
					!this.#folders.find(
						(f) => f.uri.toString() === a.uri.toString(),
					),
			),
		);
		// Re-sort
		this.#folders.sort((a, b) => a.index - b.index);

		this.#onDidChangeWorkspaceFoldersEmitter.fire(
			Object.freeze({ added, removed }),
		);
	}

	private _reviveFolderDto(dto: WorkspaceFolderDto): WorkspaceFolder | null {
		const uri = this._reviveUriDto(dto.uri);
		if (!uri) return null;
		return { uri, name: dto.name, index: dto.index };
	}
}

// Define event types used by this shim
export interface WorkspaceFoldersChangeEvent {
	readonly added: readonly WorkspaceFolder[];
	readonly removed: readonly WorkspaceFolder[];
}

// Ensure global.cocoonInstantiationService is declared if used for getConfiguration/fs
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
			): T;
	  }
	| undefined;

// Class is already exported
// export { ShimExtHostWorkspace };
