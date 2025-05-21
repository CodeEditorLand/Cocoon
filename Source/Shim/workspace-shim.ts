/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim (workspace-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.workspace` API (via `IExtHostWorkspace`) for Cocoon.
 * Based on insights from VS Code's `ExtHostWorkspace.ts`.
 *
 * Responsibilities (Simplified for Cocoon):
 * - Managing workspace data (folders, name, config file) from `initData`.
 * - Providing `vscode.workspace` getters and `getWorkspaceFolder`.
 * - Proxying `findFiles` and `requestWorkspaceTrust` to Mountain.
 * - Delegating document management and events to `ShimDocumentService`.
 * - Handling workspace folder change events (via IPC or RPC).
 *
 * NOTE: This shim simplifies many aspects of VS Code's `ExtHostWorkspace`,
 *
 *
 *
 * especially search, detailed folder update logic, edit sessions, and encoding.
 * The `save`, `saveAs`, `saveAll` methods are NOT part of the standard `vscode.workspace` API
 * surface provided by `ExtHostWorkspace` and should be on document/editor services.
 *--------------------------------------------------------------------------------------------*/

import { Barrier } from "vs/base/common/async";
import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore,
	dispose,
	IDisposable,
} from "vs/base/common/lifecycle";
// For untitled scheme
import { Schemas } from "vs/base/common/network";
// For case-insensitive comparisons
import { ExtUri } from "vs/base/common/resources";
// For folder lookup
import { TernarySearchTree } from "vs/base/common/ternarySearchTree";
// VS Code internal URI
import { URI as VSCodeInternalURI } from "vs/base/common/uri";
import { IExtensionDescription } from "vs/platform/extensions/common/extensions";
// For ignorePathCasing
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import {
	ExtHostContext,
	IRelativePatternDto as IRpcRelativePattern,
	IWorkspaceData as IRpcWorkspaceData,
	IWorkspaceFolderData as IRpcWorkspaceFolderData,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";

// For IPC events like onWorkspaceFoldersChanged
import * as ipc from "../cocoon-ipc";
import {
	ConfigurationScope,
	FileStat,
	FileSystem,
	FileType,
	FindTextInFilesOptions,
	TextDocument,
	TextDocumentChangeEvent,
	TextSearchQuery,
	TextSearchResult,
	GlobPattern as VscodeGlobPattern,
	RelativePattern as VscodeRelativePattern,
	// vscode API types
	Uri as VscodeUri,
	WorkspaceFolder as VscodeWorkspaceFolder,
	WorkspaceConfiguration,
	WorkspaceTrustRequestOptions,
	// TODO: Add other types like WorkspaceEdit, TextDocumentContentProvider etc. if those APIs are shimmed here.
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
	refineError,
} from "./_baseShim";
// For IExtHostDocuments functionality
import { ShimDocumentService } from "./document-shim";

// --- Type Definitions ---

// DTOs for RPC (subset of what VS Code might use)
interface UriComponentsDtoShim {
	scheme: string;

	path: string;

	authority?: string;

	query?: string;

	fragment?: string;

	external?: string;

	fsPath?: string;

	$mid?: 1;
}

interface WorkspaceFolderDtoShim extends IRpcWorkspaceFolderData {
	uri: UriComponentsDtoShim;

	// Ensure uri is our DTO
}

interface WorkspaceDataDtoShim extends IRpcWorkspaceData {
	// Ensure nested DTOs are used
	folders: WorkspaceFolderDtoShim[];

	configuration?: UriComponentsDtoShim | null;
}

// RPC Shape for MainThreadWorkspace (simplified for Cocoon)
// TODO: This MUST align with Mountain's MainThreadWorkspace implementation.
interface MainThreadWorkspaceShapeShim {
	// Use $initializeWorkspace or $acceptWorkspaceData instead
	// $getWorkspaceFolders(): Promise<WorkspaceFolderDtoShim[]>;

	// Might not be needed if ExtHost manages structure
	// $resolveWorkspaceFolder(uri: UriComponentsDtoShim): Promise<WorkspaceFolderDtoShim | undefined>;

	$findFiles(
		include: IRpcRelativePattern | string,

		exclude?: IRpcRelativePattern | string | null,

		options?: {
			maxResults?: number | null;

			useIgnoreFiles?: boolean /* and others */;
		},
	): Promise<UriComponentsDtoShim[]>;

	$requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined>;

	// For eventing if not IPC based:
	// $onDidChangeWorkspaceFolders(listener: () => void): IDisposable;

	// $onDidGrantWorkspaceTrust(listener: () => void): IDisposable;

	// If main thread handles updates
	// $updateWorkspaceFolders?(extensionName: string, index: number, deleteCount: number, foldersToAdd: {uri: UriComponentsDtoShim, name?: string}[]): Promise<void>;
}

// RPC Shape for MainThreadDocuments (for openTextDocument, not save which is on TextDocument itself)
interface MainThreadDocumentsShapeShim {
	// Or return UriComponents for untitled
	$tryOpenDocument(uri: UriComponentsDtoShim): Promise<void>;

	// save methods are usually on TextDocument.save() via ExtHostDocumentData, not on ExtHostWorkspace directly
}

// Interface for this ExtHostWorkspace shim (methods called by Mountain)
// TODO: Align with actual ExtHostWorkspaceShape from VS Code if this service receives many direct RPC calls.
interface ExtHostWorkspaceRpcShapeShim {
	$acceptWorkspaceData(data: WorkspaceDataDtoShim | null): void;

	// If trust changes are pushed via RPC
	$onDidGrantWorkspaceTrust(): void;

	// $acceptWorkspaceFoldersChanged (if folder changes are pushed via RPC instead of IPC)
}

// Internal representation of a workspace, similar to VS Code's ExtHostWorkspaceImpl
class CocoonWorkspaceInternal {
	private readonly _structure: TernarySearchTree<
		VSCodeInternalURI,
		VscodeWorkspaceFolder
	>;

	public readonly folders: VscodeWorkspaceFolder[];

	constructor(
		public readonly id: string,

		// Mutable for $acceptWorkspaceData
		public nameInternal: string,

		initialFolders: VscodeWorkspaceFolder[],

		public readonly transient: boolean,

		// Mutable
		public configurationInternal: VSCodeInternalURI | null,

		// Mutable
		public isUntitledInternal: boolean,

		// For case-insensitive comparisons
		private readonly _uriComparer: ExtUri,
	) {
		// Will be populated and sorted
		this.folders = [];

		this._structure = TernarySearchTree.forUris<VscodeWorkspaceFolder>(
			(uri) => this._uriComparer.ignorePathCasing(uri),

			() => true,
		);

		this.updateFolders(initialFolders);
	}

	public updateFolders(newFoldersData: VscodeWorkspaceFolder[]): void {
		// Clear and repopulate
		(this.folders as VscodeWorkspaceFolder[]) = [];

		newFoldersData.forEach((folder, index) => {
			const newFolder: VscodeWorkspaceFolder = {
				uri: folder.uri,

				name: folder.name,

				index: folder.index ?? index,
			};

			this.folders.push(newFolder);

			// Use VscodeUri for consistency
			this._structure.set(newFolder.uri, newFolder);
		});

		this.folders.sort((a, b) => a.index - b.index);
	}

	get name(): string {
		return this.nameInternal;
	}

	get configuration(): VSCodeInternalURI | null {
		return this.configurationInternal;
	}

	get isUntitled(): boolean {
		return this.isUntitledInternal;
	}

	get workspaceFolders(): readonly VscodeWorkspaceFolder[] {
		return Object.freeze([...this.folders]);
	}

	public getWorkspaceFolder(
		uri: VscodeUri,

		resolveParent?: boolean,
	): VscodeWorkspaceFolder | undefined {
		if (resolveParent && this._structure.get(uri)) {
			// uri is VscodeUri
			uri = VscodeUri.joinPath(uri, "..");
		}

		return this._structure.findSubstr(uri);
	}

	public resolveWorkspaceFolder(
		uri: VscodeUri,
	): VscodeWorkspaceFolder | undefined {
		return this._structure.get(uri);
	}
}

export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements ExtHostWorkspaceRpcShapeShim
{
	/*, vscode.Workspace */ // For IExtHostWorkspace DI
	public readonly _serviceBrand: undefined;

	readonly #initData: ShimInitDataWorkspace;

	#confirmedWorkspace: CocoonWorkspaceInternal | undefined;

	// For optimistic updates
	#unconfirmedWorkspace: CocoonWorkspaceInternal | undefined;

	#isTrusted: boolean = false;

	// For ensuring $initializeWorkspace is called
	readonly #barrier = new Barrier();

	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceShapeShim | null =
		null;

	readonly #mainThreadDocsProxy: MainThreadDocumentsShapeShim | null = null;

	readonly #extHostDocuments: ShimDocumentService;

	// Placeholder, real one needed for ExtUri
	readonly #extHostFileSystemInfo: IExtHostFileSystemInfo;

	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<vscode.WorkspaceFoldersChangeEvent>();

	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();

	readonly #onDidOpenTextDocumentEmitter = new VscodeEmitter<TextDocument>();

	readonly #onDidCloseTextDocumentEmitter = new VscodeEmitter<TextDocument>();

	readonly #onDidChangeTextDocumentEmitter =
		new VscodeEmitter<TextDocumentChangeEvent>();

	readonly #disposables = new DisposableStore();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		// This is the raw initData for IExtHostInitDataService
		initData: ShimInitDataWorkspace,

		// Injected for URI comparison
		extHostFileSystemInfo: IExtHostFileSystemInfo,

		logService: ILogService | undefined,

		extHostDocuments: ShimDocumentService,
	) {
		super("ExtHostWorkspace", rpcService, logService);

		this.#initData = initData;

		this.#extHostDocuments = extHostDocuments;

		this.#extHostFileSystemInfo = extHostFileSystemInfo;

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadWorkspaceProxy = this._getProxy(
				MainContext.MainThreadWorkspace as ProxyIdentifier<MainThreadWorkspaceShapeShim>,
			);

			this.#mainThreadDocsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsShapeShim>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostWorkspace as ProxyIdentifier<ExtHostWorkspaceRpcShapeShim>,

					this,
				);

				this._log("Registered self for RPC calls (ExtHostWorkspace).");
			} catch (e: any) {
				this._logError("Failed to set ExtHostWorkspace for RPC:", e);
			}
		}

		if (!this.#mainThreadWorkspaceProxy)
			this._logError("MainThreadWorkspace RPC proxy unavailable!");

		if (!this.#mainThreadDocsProxy)
			this._logError("MainThreadDocuments RPC proxy unavailable!");

		// Initial workspace data is now set by $initializeWorkspace
		// The original initData.workspace can provide a very early, unconfirmed state if needed.
		// If initData.workspace is present, we can use it to set up a preliminary _unconfirmedWorkspace
		if (initData.workspace) {
			const {
				workspace: initialWs,

				added,

				removed,
			} = this._toExtHostWorkspace(
				initData.workspace,

				undefined,

				undefined,
			);

			// Start with unconfirmed from initData
			this._unconfirmedWorkspace = initialWs ?? undefined;

			this._log(
				`Preliminary workspace set from initData: ${this._unconfirmedWorkspace?.name}`,
			);
		}

		// Subscribe to IPC workspace folder changes
		ipc.onWorkspaceFoldersChanged(async () => {
			this._log(
				"IPC: workspaceFoldersChanged. MainThread should send $acceptWorkspaceData or we need $getWorkspaceFolders.",
			);

			// In VS Code, this IPC often just signals the MainThread, which then pushes data via RPC.
			// If Mountain doesn't push, we'd need to fetch.
			// This method would call $getWorkspaceFolders
			// await this._fetchAndUpdateFoldersFromMainThread();
		});

		// Forward document events
		this.#disposables.add(
			this.#extHostDocuments.onDidAddDocument((doc) =>
				this.#onDidOpenTextDocumentEmitter.fire(doc),
			),
		);

		this.#disposables.add(
			this.#extHostDocuments.onDidRemoveDocument((doc) =>
				this.#onDidCloseTextDocumentEmitter.fire(doc),
			),
		);

		this.#disposables.add(
			this.#extHostDocuments.onDidChangeDocument((e) =>
				this.#onDidChangeTextDocumentEmitter.fire(e),
			),
		);

		this._log("Subscribed to document and IPC events.");
	}

	// --- RPC Methods Called by MainThread ---
	public $initializeWorkspace(
		data: WorkspaceDataDtoShim | null,

		trusted: boolean,
	): void {
		this._log(
			`$initializeWorkspace received. Trusted: ${trusted}, Workspace name: ${data?.name}`,
		);

		this.#isTrusted = trusted;

		// Process the workspace data
		this.$acceptWorkspaceData(data);

		// Signal that initial data is received
		this._barrier.open();
	}

	public $acceptWorkspaceData(data: WorkspaceDataDtoShim | null): void {
		this._log(
			`$acceptWorkspaceData: id=${data?.id}, name=${data?.name}, folders=${data?.folders?.length ?? 0}`,
		);

		const { workspace, added, removed } = this._toExtHostWorkspace(
			data,

			this.#confirmedWorkspace,

			this.#unconfirmedWorkspace,
		);

		this.#confirmedWorkspace = workspace ?? undefined;

		// Clear unconfirmed state
		this.#unconfirmedWorkspace = undefined;

		if (added.length > 0 || removed.length > 0) {
			this._log(
				`Firing onDidChangeWorkspaceFolders: added ${added.length}, removed ${removed.length}`,
			);

			this.#onDidChangeWorkspaceFoldersEmitter.fire(
				Object.freeze({ added, removed }),
			);
		}
	}

	public $onDidGrantWorkspaceTrust(): void {
		this._log("RPC: $onDidGrantWorkspaceTrust received.");

		if (!this.#isTrusted) {
			this.#isTrusted = true;

			this.#onDidGrantWorkspaceTrustEmitter.fire();
		}
	}

	// --- Helper to convert DTO to internal workspace representation ---
	private _toExtHostWorkspace(
		data: WorkspaceDataDtoShim | null,

		previousConfirmed: CocoonWorkspaceInternal | undefined,

		previousUnconfirmed: CocoonWorkspaceInternal | undefined,
	): {
		workspace: CocoonWorkspaceInternal | null;

		added: VscodeWorkspaceFolder[];

		removed: VscodeWorkspaceFolder[];
	} {
		if (!data) {
			const removed = previousConfirmed?.workspaceFolders
				? [...previousConfirmed.workspaceFolders]
				: [];

			return { workspace: null, added: [], removed };
		}

		const {
			id,

			name,

			folders: folderDtos,

			configuration: configDto,

			transient,

			isUntitled,
		} = data;

		const newFoldersInternal: VscodeWorkspaceFolder[] = [];

		const oldWorkspaceForDiff = previousUnconfirmed || previousConfirmed;

		if (oldWorkspaceForDiff) {
			// Try to preserve existing VscodeWorkspaceFolder objects
			folderDtos.forEach((folderData, index) => {
				const folderUri = this._reviveUriDtoToVscodeUri(folderData.uri);

				if (!folderUri) {
					this._logError(
						"Failed to revive folder URI in _toExtHostWorkspace",

						folderData.uri,
					);

					return;
				}

				const existingFolder =
					oldWorkspaceForDiff.workspaceFolders.find((f) =>
						this._areUrisEqual(f.uri, folderUri),
					);

				if (existingFolder) {
					// Update mutable properties
					(existingFolder as any).name = folderData.name;

					(existingFolder as any).index = folderData.index ?? index;

					newFoldersInternal.push(existingFolder);
				} else {
					newFoldersInternal.push({
						uri: folderUri,

						name: folderData.name,

						index: folderData.index ?? index,
					});
				}
			});
		} else {
			folderDtos.forEach((folderData, index) => {
				const folderUri = this._reviveUriDtoToVscodeUri(folderData.uri);

				if (!folderUri) {
					this._logError(
						"Failed to revive folder URI DTO",

						folderData.uri,
					);

					return;
				}

				newFoldersInternal.push({
					uri: folderUri,

					name: folderData.name,

					index: folderData.index ?? index,
				});
			});
		}

		// Ensure sorted by index
		newFoldersInternal.sort((a, b) => a.index - b.index);

		const workspace = new CocoonWorkspaceInternal(
			id,

			name,

			newFoldersInternal,

			!!transient,

			configDto ? this._reviveUriDtoToInternalUri(configDto) : null,

			!!isUntitled,

			new ExtUri((uri) => this._ignorePathCasing(uri)),
		);

		const { added, removed } = delta(
			oldWorkspaceForDiff ? oldWorkspaceForDiff.workspaceFolders : [],

			workspace.workspaceFolders,

			// Use helper for VscodeWorkspaceFolder
			(a, b) => this._compareVscodeWorkspaceFoldersByUri(a, b),
		);

		return { workspace, added, removed };
	}

	private _ignorePathCasing(uri: VSCodeInternalURI | VscodeUri): boolean {
		// getCapabilities expects scheme string
		const capabilities = this.#extHostFileSystemInfo.getCapabilities(
			uri.scheme,
		);

		return !(
			capabilities &&
			capabilities & FileSystemProviderCapabilities.PathCaseSensitive
		);
	}

	private _areUrisEqual(uriA: VscodeUri, uriB: VscodeUri): boolean {
		return new ExtUri((u) => this._ignorePathCasing(u)).isEqual(uriA, uriB);
	}

	private _compareVscodeWorkspaceFoldersByUri(
		a: VscodeWorkspaceFolder,

		b: VscodeWorkspaceFolder,
	): number {
		return this._areUrisEqual(a.uri, b.uri)
			? 0
			: compare(a.uri.toString(), b.uri.toString());
	}

	// --- URI Conversion Helpers ---
	protected _reviveUriDtoToVscodeUri(
		uriDto: UriComponentsDtoShim | null | undefined,
	): VscodeUri | undefined {
		if (!uriDto) return undefined;

		try {
			// BaseCocoonShim._reviveApiArgument should handle this DTO.
			const revived = super._reviveApiArgument<VscodeUri>(uriDto);

			// If it returns vscode.Uri directly
			if (revived instanceof VscodeUri) return revived;

			if (revived instanceof VSCodeInternalURI)
				// Convert internal to API
				return VscodeUri.from(revived);

			this._logWarn(
				"Failed to revive DTO to VscodeUri, attempting VscodeUri.from",

				uriDto,
			);

			// Cast if dto isn't exactly what VscodeUri.from expects
			return VscodeUri.from(uriDto as any);
		} catch (e: any) {
			this._logError("Failed to revive URI DTO to VscodeUri:", uriDto, e);

			return undefined;
		}
	}

	protected _reviveUriDtoToInternalUri(
		uriDto: UriComponentsDtoShim | null | undefined,
	): VSCodeInternalURI | null {
		if (!uriDto) return null;

		try {
			const revived = super._reviveApiArgument<VSCodeInternalURI>(uriDto);

			if (revived instanceof VSCodeInternalURI) return revived;

			this._logWarn(
				"Failed to revive DTO to VSCodeInternalURI via base, attempting URI.revive",

				uriDto,
			);

			return VSCodeInternalURI.revive(uriDto as any);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VSCodeInternalURI:",

				uriDto,

				e,
			);

			return null;
		}
	}

	protected _vscodeUriToComponentsDto(
		uri: VscodeUri,
	): UriComponentsDtoShim | undefined {
		// BaseCocoonShim._convertApiArgToInternal should handle vscode.Uri
		const components = super._convertApiArgToInternal(uri);

		if (
			components &&
			components.$mid === MarshalledId.UriSimple /* or similar check */
		) {
			return components as UriComponentsDtoShim;
		}

		this._logError(
			"Failed to convert VscodeUri to DTO via base method.",

			uri,
		);

		return undefined;
	}

	protected _internalUriToComponentsDto(
		uri: VSCodeInternalURI,
	): UriComponentsDtoShim | undefined {
		// BaseCocoonShim._convertApiArgToInternal should handle internal VSCode URI if it's a known marshallable type
		// or if URI implements toJSON() correctly for marshalling.
		// For safety, explicitly convert its parts.
		return {
			// MarshalledId.UriSimple
			$mid: 1,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			external: uri.toString(true),

			fsPath: uri.fsPath,
		};
	}

	protected _convertGlobDtoForRpc(
		pattern: VscodeGlobPattern,
	): IRpcRelativePattern | string | undefined {
		if (typeof pattern === "string") return pattern;

		if (pattern instanceof VscodeRelativePattern) {
			// VscodeRelativePattern.base is vscode.Uri or string
			let baseComponents: UriComponentsDtoShim | undefined;

			if (typeof pattern.base === "string") {
				try {
					baseComponents = this._vscodeUriToComponentsDto(
						VscodeUri.file(pattern.base),
					);
				} catch (e) {
					// Assume file path
					this._logWarn(
						"Failed to parse string base in VscodeRelativePattern:",

						pattern.base,

						e,
					);
				}
			} else if (pattern.base instanceof VscodeUri) {
				baseComponents = this._vscodeUriToComponentsDto(pattern.base);
			}

			return { pattern: pattern.pattern, base: baseComponents };
		}

		this._logWarn(
			"Unsupported glob pattern type for DTO conversion:",

			pattern,
		);

		return undefined;
	}

	// --- Public API Getters (vscode.workspace) ---
	private get _currentWorkspace(): CocoonWorkspaceInternal | undefined {
		return this.#unconfirmedWorkspace || this.#confirmedWorkspace;
	}

	get workspaceFile(): VscodeUri | undefined {
		// API returns vscode.Uri
		const internalWsFile = this._currentWorkspace?.configuration;

		if (internalWsFile) {
			if (this._currentWorkspace?.isUntitled) {
				// For untitled workspaces, workspaceFile points to a non-existent file used for settings.
				// The path might be derived. VS Code often shows parent folder name.
				return VscodeUri.from({
					scheme: Schemas.untitled,

					path: path.basename(internalWsFile.fsPath),
				});
			}

			return VscodeUri.from(internalWsFile);
		}

		return undefined;
	}

	get name(): string | undefined {
		return this._currentWorkspace?.name;
	}

	get workspaceFolders(): readonly VscodeWorkspaceFolder[] | undefined {
		return this._currentWorkspace?.workspaceFolders;
	}

	get isTrusted(): boolean {
		return this.#isTrusted;
	}

	// --- Public API Methods (vscode.workspace) ---
	public getWorkspaceFolder(
		uri: VscodeUri,
	): VscodeWorkspaceFolder | undefined {
		return this._currentWorkspace?.getWorkspaceFolder(uri);
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

		// Late require to avoid circular dependency issues if types are complex
		const { IExtHostConfiguration } =
			require("vs/workbench/api/common/extHostConfiguration") as {
				IExtHostConfiguration: typeof createDecorator;
			};

		const configService = global.cocoonInstantiationService.invokeFunction(
			(accessor) =>
				accessor.get<IExtHostConfigurationShape>(IExtHostConfiguration),
		);

		// Delegate to config shim
		return configService.getConfiguration(section, scope);
	}

	public async findFiles(
		include: VscodeGlobPattern,

		exclude?: VscodeGlobPattern | null,

		maxResults?: number | null,

		token?: CancellationToken,
	): Promise<VscodeUri[]> {
		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"findFiles: RPC proxy unavailable, returning empty array.",
			);

			return [];
		}

		this._log(
			`findFiles: include=${String(include)}, exclude=${String(exclude)}, max=${maxResults}`,
		);

		if (token?.isCancellationRequested) return [];

		try {
			const includeDto = this._convertGlobDtoForRpc(include);

			const excludeDto = exclude
				? this._convertGlobDtoForRpc(exclude)
				: null;

			// TODO: Properly handle `useIgnoreFiles` and other options for $findFiles RPC based on `vscode.FindFilesOptions` if needed.
			const options = {
				maxResults,

				useIgnoreFiles: true /* Default VS Code behavior */,
			};

			const resultsDto = await this.#mainThreadWorkspaceProxy.$findFiles(
				includeDto as any,

				excludeDto as any,

				options,
			);

			if (token?.isCancellationRequested) return [];

			return Array.isArray(resultsDto)
				? (resultsDto
						.map((dto) => this._reviveUriDtoToVscodeUri(dto))
						.filter((u) => u !== undefined) as VscodeUri[])
				: [];
		} catch (e: any) {
			if (isCancellationError(e)) {
				this._log("findFiles cancelled.");

				return [];
			}

			this._logError(
				"workspace.findFiles RPC failed:",

				refineError(e, this._logService),
			);

			return [];
		}
	}

	public async requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined> {
		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn("requestWorkspaceTrust: RPC proxy unavailable.");

			return undefined;
		}

		this._log("requestWorkspaceTrust called");

		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	public updateWorkspaceFolders(
		// For logging/attribution
		extension: IExtensionDescription,

		// start index
		index: number | undefined,

		deleteCount: number | null | undefined,

		...workspaceFoldersToAddDto: ReadonlyArray<{
			uri: VscodeUri;

			name?: string;
		}>
	): boolean {
		// This logic is complex and relies on MainThread approving the change.
		// VS Code's `ExtHostWorkspace` has detailed validation and optimistic update logic.
		// For Cocoon shim, a simplified approach or disallowing might be pragmatic.
		// The original VS Code logic is very extensive here.
		// TODO: Implement full updateWorkspaceFolders logic or keep as restricted.
		this._logWarn(
			`updateWorkspaceFolders called by ext '${extension.identifier.value}' - This is a powerful API. Simplified shim logic or disallow.`,
		);

		// For now, returning false as the original shim did, indicating no change applied by ext host side.
		// A full impl would call this.#mainThreadWorkspaceProxy.$updateWorkspaceFolders
		// and then optimistically update with this.#unconfirmedWorkspace.
		return false;
	}

	// --- Events (vscode.workspace) ---
	get onDidChangeWorkspaceFolders(): VscodeEvent<vscode.WorkspaceFoldersChangeEvent> {
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

	get textDocuments(): readonly TextDocument[] {
		return this.#extHostDocuments.getTextDocuments();
	}

	// --- Stubs for other vscode.workspace APIs ---
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

		// TODO: Type with vscode.NotebookDocument
	}

	public async openTextDocument(
		uriOrOptions?:
			| VscodeUri
			| { language?: string; content?: string }
			| string,
	): Promise<TextDocument> {
		if (!this.#mainThreadDocsProxy)
			throw new Error(
				"openTextDocument: MainThreadDocuments RPC proxy unavailable.",
			);

		let uriToOpenDto: UriComponentsDtoShim | undefined;

		if (uriOrOptions instanceof VscodeUri) {
			uriToOpenDto = this._vscodeUriToComponentsDto(uriOrOptions);
		} else if (typeof uriOrOptions === "string") {
			// Assume it's a file path
			uriToOpenDto = this._vscodeUriToComponentsDto(
				VscodeUri.file(uriOrOptions),
			);
		} else if (
			uriOrOptions &&
			typeof uriOrOptions === "object" &&
			(uriOrOptions.content !== undefined ||
				uriOrOptions.language !== undefined)
		) {
			// This is for creating an untitled document.
			// TODO: This requires a different RPC call to MainThreadDocuments like `$createUntitledDocument(content, language)`
			// which would return the UriComponents of the new untitled file.
			this._logError(
				"openTextDocument with content/language options (for untitled) is not fully implemented. Needs specific RPC.",
			);

			throw new Error(
				"openTextDocument for untitled files not fully implemented.",
			);
		}

		if (!uriToOpenDto)
			throw new Error("Invalid URI or options for openTextDocument.");

		this._log(
			`Attempting to open document: ${uriToOpenDto.path || uriToOpenDto.scheme}`,
		);

		await this.#mainThreadDocsProxy.$tryOpenDocument(uriToOpenDto);

		// After main thread acknowledges open, the document should be available via ShimDocumentService
		// (because Mountain would have sent $acceptModelAdded to ShimDocumentService)
		const documentUri = this._reviveUriDtoToVscodeUri(uriToOpenDto);

		if (!documentUri)
			throw new Error(
				"Failed to revive URI after openTextDocument RPC call.",
			);

		const docData = this.#extHostDocuments.getDocument(documentUri);

		if (!docData?.document)
			throw new Error(
				`Document ${documentUri.toString()} not found in local cache after open attempt.`,
			);

		return docData.document;
	}

	public get fs(): FileSystem {
		this._logWarnOnce(
			"workspace.fs: Returning instance of ShimFileSystemApi. Ensure DI provides it correctly if used elsewhere.",
		);

		// This should be provided via DI from index.ts if it's a shared service.
		// For direct construction as part of the API object:
		if (!global.cocoonInstantiationService) {
			this._logError(
				"DI service (global.cocoonInstantiationService) unavailable for workspace.fs. Returning basic NOP FS.",
			);

			return {
				/* Basic NOP FileSystem methods */
				// Basic NOP
			} as FileSystem;
		}

		// Assuming ShimFileSystemApi is NOT registered with DI but created by the API factory
		// This was the pattern in the original index.js
		const { ShimFileSystemApi: FsApiShim } =
			require("./shims/fs-api-shim") as {
				ShimFileSystemApi: typeof ShimFileSystemApi;
			};

		return new FsApiShim(this._logService);
	}

	public getRelativePath = (
		pathOrUri: string | VscodeUri,

		includeWorkspaceFolder?: boolean,
	): string => {
		// Use VS Code's ExtUri for robust relative path calculation, requires IExtHostFileSystemInfo
		const resourceToCompare =
			pathOrUri instanceof VscodeUri
				? pathOrUri
				: VscodeUri.file(pathOrUri);

		// Pass VscodeUri
		const folder = this.getWorkspaceFolder(resourceToCompare);

		if (!folder) {
			return pathOrUri instanceof VscodeUri
				? pathOrUri.fsPath
				: pathOrUri;
		}

		// Use default from VS Code's implementation
		if (typeof includeWorkspaceFolder === "undefined") {
			includeWorkspaceFolder =
				(this._currentWorkspace?.folders.length ?? 0) > 1;
		}

		// Must convert to internal URI for ExtUri.relativePath
		const internalFolderUri = VSCodeInternalURI.from(folder.uri);

		const internalResourceUri = VSCodeInternalURI.from(resourceToCompare);

		let relative = new ExtUri((uri) =>
			this._ignorePathCasing(uri),
		).relativePath(internalFolderUri, internalResourceUri);

		if (includeWorkspaceFolder) {
			relative = `${folder.name}/${relative}`;
		}

		return (
			relative ||
			(pathOrUri instanceof VscodeUri ? pathOrUri.fsPath : pathOrUri)
			// Fallback if relative is empty
		);
	};

	public dispose(): void {
		// From BaseCocoonShim if it has one
		super.dispose();

		this.#disposables.dispose();

		this.#onDidChangeWorkspaceFoldersEmitter.dispose();

		this.#onDidGrantWorkspaceTrustEmitter.dispose();

		this.#onDidOpenTextDocumentEmitter.dispose();

		this.#onDidCloseTextDocumentEmitter.dispose();

		this.#onDidChangeTextDocumentEmitter.dispose();
	}
}

// Event type for onDidChangeWorkspaceFolders
// TODO: Ensure this matches vscode.WorkspaceFoldersChangeEvent
export interface WorkspaceFoldersChangeEvent {
	readonly added: readonly VscodeWorkspaceFolder[];

	readonly removed: readonly VscodeWorkspaceFolder[];
}

// Make cocoonInstantiationService globally available for shims that might need it (like getConfiguration)
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
			): T;
	  }
	| undefined;
