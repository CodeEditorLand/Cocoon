/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim (shims/workspace-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostWorkspace` service interface, providing the core functionalities
 * for the `vscode.workspace` API namespace in the Cocoon environment. This includes
 * managing workspace folder information, workspace name, configuration file URI, trust
 * state, and proxying operations like finding files or opening documents to the
 * Mountain host process.
 *
 * It maintains an internal representation of the workspace (`CocoonInternalWorkspace`)
 * and synchronizes this state with Mountain via RPC calls. Document-related aspects of
 * `vscode.workspace` (like `textDocuments` and document lifecycle events) are delegated
 * to an injected `CocoonDocumentService` instance. The `vscode.workspace.fs` API is
 * provided by an injected `ShimFileSystemApi` instance.
 *
 * Responsibilities:
 * - Receiving initial workspace data and subsequent updates from Mountain via RPC
 *   methods (`$initializeWorkspace`, `$acceptWorkspaceData`).
 * - Maintaining an internal model (`CocoonInternalWorkspace`) of the current workspace,
 *
 *   including its folders, name, and configuration URI, using `VSCodeInternalURI` and
 *   `ExtUri` for path comparisons and operations.
 * - Providing getters for `vscode.workspace` properties: `workspaceFolders`, `name`,
 *
 *   `workspaceFile`, `isTrusted`.
 * - Implementing `vscode.workspace.getWorkspaceFolder(uri)` using efficient lookups
 *   (TernarySearchTree).
 * - Proxying `vscode.workspace.findFiles(...)` and `vscode.workspace.requestWorkspaceTrust(...)`
 *   to Mountain via RPC, using appropriate DTOs for arguments and results.
 * - Implementing `vscode.workspace.openTextDocument(...)` by coordinating with
 *   `MainThreadDocuments` on Mountain (for opening or creating untitled files) and
 *   then retrieving the document from `CocoonDocumentService`.
 * - Delegating `vscode.workspace.getConfiguration(...)` to an injected `IExtHostConfiguration` service.
 * - Delegating `vscode.workspace.textDocuments` and document lifecycle events
 *   (`onDidOpenTextDocument`, etc.) to the injected `CocoonDocumentService`.
 * - Providing `vscode.workspace.fs` via an injected `ShimFileSystemApi` instance.
 * - Managing and firing `onDidChangeWorkspaceFolders` and `onDidGrantWorkspaceTrust` events.
 * - Stubbing or marking as not implemented several advanced or less critical
 *   `vscode.workspace` APIs for the Cocoon MVP (e.g., full text search, edit sessions,
 *
 *   `updateWorkspaceFolders` from extensions).
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts` as `IExtHostWorkspace`.
 * - The `vscode.workspace` API object provided to extensions (via the API factory)
 *   delegates its calls to this service instance.
 * - Communicates with `MainContext.MainThreadWorkspace` and `MainContext.MainThreadDocuments`
 *   on Mountain via RPC.
 * - Is an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostWorkspace`.
 * - Depends on injected services: `IExtHostInitDataService`, `IExtHostFileSystemInfo`,
 *
 *   `CocoonDocumentService`, `ShimFileSystemApi` (for `workspace.fs`), and
 *   `IInstantiationService` (for `getConfiguration`).
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For path.sep in getRelativePath
import * as path from "node:path";

import { delta as arrayDelta } from "vs/base/common/arrays";

import { Barrier } from "vs/base/common/async";

import type { CancellationToken } from "vs/base/common/cancellation";

import { isCancellationError } from "vs/base/common/errors";

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";

import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";

import { Schemas } from "vs/base/common/network";

import {
	basenameOrAuthority,
	dirname,
	type IExtUri,

	// ExtUri is via IExtHostFileSystemInfo
} from "vs/base/common/resources";

import { compare } from "vs/base/common/strings";

import { TernarySearchTree } from "vs/base/common/ternarySearchTree";

import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";

import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";

// FileSystemProviderCapabilities not directly used here, but relevant to IExtHostFileSystemInfo
// import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";

import {
	createDecorator,
	type IInstantiationService,
} from "vs/platform/instantiation/common/instantiation";

import {
	ExtHostContext,
	MainContext,
	type IRelativePatternDto as RpcRelativePattern,
	type IWorkspaceData as RpcWorkspaceData,
	type IWorkspaceFolderData as RpcWorkspaceFolderData,
	type ExtHostWorkspaceShape as VscodeExtHostWorkspaceShape,
} from "vs/workbench/api/common/extHost.protocol";

import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

// For getConfiguration type
import type { IExtHostConfiguration } from "vs/workbench/api/common/extHostConfiguration";

import type {
	ExtHostInitData,
	IExtHostInitDataService,

	// For constructor
} from "vs/workbench/api/common/extHostInitDataService";

// Import from public 'vscode' API definition for types used in the public surface
import {
	RelativePattern as VscodeApiRelativePattern,
	Uri as VscodeApiUri,
	type ConfigurationScope,

	// The vscode.FileSystem type provided by fs-api-shim
	type FileSystem,
	type GlobPattern as VscodeApiGlobPattern,
	type WorkspaceFolder as VscodeApiWorkspaceFolder,
	type WorkspaceFoldersChangeEvent as VscodeWorkspaceFoldersChangeEvent,
	type TextDocument,
	type TextDocumentChangeEvent,
	type WorkspaceConfiguration,
	type WorkspaceTrustRequestOptions,

	// For stubbed APIs
	type FileSystemProvider,
	type TaskProvider,
	type TextDocumentContentProvider,
	type TextDocumentWillSaveEvent,
	type FileWillCreateEvent,
	type FileCreateEvent,
	type FileWillDeleteEvent,
	type FileDeleteEvent,
	type FileWillRenameEvent,
	type FileRenameEvent,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type IRpcProtocolServiceAdapter,
	type ILogServiceForShim,
	type ProxyIdentifier,
} from "./_baseShim";

// Use concrete class
import type { CocoonDocumentService } from "./document-shim";

// Type for injected fs API
import type { ShimFileSystemApi } from "./fs-api-shim";

// --- Type Definitions ---

/** DTO for URI components sent/received over RPC, aligning with VS Code internals. */
type UriComponentsForRpc = VSCodeInternalUriComponents;

/** DTO for a single workspace folder sent/received over RPC. */
interface WorkspaceFolderDtoForRpc extends RpcWorkspaceFolderData {
	// Ensure uri is typed as the RPC DTO
	uri: UriComponentsForRpc;
}

/** DTO for the entire workspace data sent/received over RPC. */
interface WorkspaceDataDtoForRpc extends RpcWorkspaceData {
	folders: WorkspaceFolderDtoForRpc[];

	// Workspace configuration file URI
	configuration?: UriComponentsForRpc | null;
}

/** Defines the RPC interface for `MainThreadWorkspace` relevant to this shim. */
interface MainThreadWorkspaceProxyShim {
	$findFiles(
		include: RpcRelativePattern | string,

		exclude?: RpcRelativePattern | string | null,

		options?: {
			maxResults?: number | null;

			useIgnoreFiles?: boolean;

			followSymlinks?: boolean;

			[key: string]: any;
		},
	): Promise<UriComponentsForRpc[]>;

	$requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined>;

	// If full updates were supported
	// $updateWorkspaceFolders?(extensionId: string, start: number, deleteCount: number | null, foldersToAddDto: { uri: UriComponentsForRpc, name?: string }[]): Promise<void>;

	// If pull model were used
	// $getWorkspaceFolders?(): Promise<WorkspaceFolderDtoForRpc[]>;
}

/** Defines the RPC interface for `MainThreadDocuments` relevant to opening documents. */
interface MainThreadDocumentsProxyShim {
	// For existing files
	$tryOpenDocument(uri: UriComponentsForRpc): Promise<void>;

	$tryCreateDocument(options?: {
		languageId?: string;

		content?: string;

		// For new untitled files
	}): Promise<UriComponentsForRpc>;
}

/**
 * Internal representation of the workspace state, managing folders and metadata.
 * Similar to VS Code's internal `ExtHostWorkspaceImpl._actual`.
 */
class CocoonInternalWorkspace {
	private readonly _structure: TernarySearchTree<
		VSCodeInternalURI,
		VscodeApiWorkspaceFolder
	>;

	// Stores vscode.WorkspaceFolder API objects
	public readonly foldersApiObjects: VscodeApiWorkspaceFolder[];

	// For case-sensitive URI operations
	public readonly extUri: IExtUri;

	constructor(
		public readonly id: string,

		// Mutable name
		public nameInternal: string,

		// Expects folders with VscodeApiUri
		initialFoldersData: VscodeApiWorkspaceFolder[],

		// True if the workspace is not persisted (e.g., empty window)
		public readonly transient: boolean,

		// URI of the .code-workspace file
		public configurationInternal: VSCodeInternalURI | null,

		// True if it's an untitled workspace (folder with no .code-workspace)
		public isUntitledInternal: boolean,

		// Injected for extUri
		extHostFileSystemInfo: IExtHostFileSystemInfo,
	) {
		this.extUri = extHostFileSystemInfo.extUri;

		this.foldersApiObjects = [];

		this._structure = TernarySearchTree.forUris<VscodeApiWorkspaceFolder>(
			// TernarySearchTree often uses internal URI
			(uri) => this.extUri.ignorePathCasing(uri as VSCodeInternalURI),

			// useDefaultUriIgnorePathCasing (based on scheme)
			() => true,
		);

		// Populate folders and tree
		this.updateFolders(initialFoldersData);
	}

	public updateFolders(newApiFolders: VscodeApiWorkspaceFolder[]): void {
		// Clear array in-place
		(this.foldersApiObjects as VscodeApiWorkspaceFolder[]).length = 0;

		this._structure.clear();

		newApiFolders.forEach((folder) => {
			// folder.uri is VscodeApiUri
			this.foldersApiObjects.push(folder);

			// For TernarySearchTree, key should be VSCodeInternalURI if extUri callback expects it.
			// Assuming VscodeApiUri can be used or converted if needed by extUri.
			this._structure.set(VSCodeInternalURI.from(folder.uri), folder);
		});

		// Ensure sorted by index
		this.foldersApiObjects.sort((a, b) => a.index - b.index);
	}

	get name(): string {
		return this.nameInternal;
	}

	get configurationUri(): VSCodeInternalURI | null {
		return this.configurationInternal;
	}

	get isUntitled(): boolean {
		return this.isUntitledInternal;
	}

	get workspaceFolders(): readonly VscodeApiWorkspaceFolder[] {
		return Object.freeze([...this.foldersApiObjects]);
	}

	public getWorkspaceFolder(
		uri: VscodeApiUri,

		resolveParent?: boolean,
	): VscodeApiWorkspaceFolder | undefined {
		// Convert to internal URI for tree
		const internalCandidateUri = VSCodeInternalURI.from(uri);

		let candidateForTree = internalCandidateUri;

		if (resolveParent) {
			const directMatch = this._structure.get(candidateForTree);

			if (
				directMatch &&
				this.extUri.isEqual(
					VSCodeInternalURI.from(directMatch.uri),

					candidateForTree,
				)
			) {
				// Get parent directory
				candidateForTree = this.extUri.dirname(candidateForTree);
			}
		}

		return this._structure.findSubstr(candidateForTree);
	}

	public resolveWorkspaceFolder(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._structure.get(VSCodeInternalURI.from(uri));
	}
}

/**
 * Cocoon's implementation of `IExtHostWorkspace`.
 * Provides the `vscode.workspace` API functionalities.
 */
export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements VscodeExtHostWorkspaceShape
{
	public readonly _serviceBrand: undefined;

	// Store full init data
	readonly #initData: ExtHostInitData;

	#confirmedWorkspaceState: CocoonInternalWorkspace | undefined;

	// For optimistic updates
	#unconfirmedWorkspaceState: CocoonInternalWorkspace | undefined;

	#isWorkspaceTrusted = false;

	// Resolves when $initializeWorkspace is called
	readonly #initializedBarrier = new Barrier();

	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceProxyShim | null =
		null;

	readonly #mainThreadDocsProxy: MainThreadDocumentsProxyShim | null = null;

	readonly #extHostDocuments: CocoonDocumentService;

	readonly #extHostFileSystemInfo: IExtHostFileSystemInfo;

	// The vscode.workspace.fs implementation
	readonly #fileSystemApiService: FileSystem;

	// For getConfiguration
	readonly #instantiationService: IInstantiationService;

	// Event Emitters for vscode.workspace events
	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<VscodeWorkspaceFoldersChangeEvent>();

	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();

	// Document events are forwarded from CocoonDocumentService
	public readonly onDidOpenTextDocument: VscodeEvent<TextDocument>;

	public readonly onDidCloseTextDocument: VscodeEvent<TextDocument>;

	public readonly onDidChangeTextDocument: VscodeEvent<TextDocumentChangeEvent>;

	// Added
	public readonly onDidSaveTextDocument: VscodeEvent<TextDocument>;

	/**
	 * Creates an instance of ShimExtHostWorkspace.
	 * @param rpcService RPC adapter.
	 * @param initDataService Service providing initial host data.
	 * @param extHostFileSystemInfo Service for filesystem info (e.g., case sensitivity).
	 * @param logService Logging service.
	 * @param extHostDocuments Document management service.
	 * @param fileSystemApiService The implementation for `vscode.workspace.fs`.
	 * @param instantiationService For instantiating services like IExtHostConfiguration.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Changed from raw ExtHostInitData to service
		initDataService: IExtHostInitDataService,

		extHostFileSystemInfo: IExtHostFileSystemInfo,

		logService: ILogServiceForShim | undefined,

		extHostDocuments: CocoonDocumentService,

		// Injected
		fileSystemApiService: FileSystem,

		// Injected
		instantiationService: IInstantiationService,
	) {
		super("ExtHostWorkspace", rpcService, logService);

		// Get raw initData
		this.#initData = initDataService.value;

		this.#extHostDocuments = extHostDocuments;

		this.#extHostFileSystemInfo = extHostFileSystemInfo;

		this.#fileSystemApiService = fileSystemApiService;

		this.#instantiationService = instantiationService;

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadWorkspaceProxy = this._getProxy(
				MainContext.MainThreadWorkspace as ProxyIdentifier<MainThreadWorkspaceProxyShim>,
			);

			this.#mainThreadDocsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProxyShim>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostWorkspace as ProxyIdentifier<VscodeExtHostWorkspaceShape>,

					this,
				);

				this._log("Registered self for RPC calls (ExtHostWorkspace).");
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostWorkspace):",

					e,
				);
			}
		}

		if (!this.#mainThreadWorkspaceProxy)
			this._logError(
				"MainThreadWorkspace RPC proxy unavailable! `findFiles` and `requestTrust` will fail.",
			);

		if (!this.#mainThreadDocsProxy)
			this._logError(
				"MainThreadDocuments RPC proxy unavailable! `openTextDocument` will fail.",
			);

		this.#isWorkspaceTrusted =
			this.#initData.workspace?.trusted ??
			this.#initData.environment.isTrusted ??
			true;

		// Initial workspace state (pre-$initializeWorkspace)
		if (this.#initData.workspace) {
			const { workspace } = this._convertDtoToInternalWorkspace(
				this.#initData.workspace,

				undefined,

				undefined,
			);

			// Start with unconfirmed
			this.#unconfirmedWorkspaceState = workspace ?? undefined;

			// this._log(`Preliminary workspace state set from initData: Name='${this.#unconfirmedWorkspaceState?.name}'`);
		}

		// Forward document events from CocoonDocumentService
		this._instanceDisposables.add(
			this.#extHostDocuments.onDidOpenTextDocument((e) =>
				this.#onDidOpenTextDocumentEmitter.fire(e),
			),
		);

		this.onDidOpenTextDocument =
			this.#extHostDocuments.onDidOpenTextDocument;

		this.onDidCloseTextDocument =
			this.#extHostDocuments.onDidCloseTextDocument;

		this.onDidChangeTextDocument =
			this.#extHostDocuments.onDidChangeTextDocument;

		this.onDidSaveTextDocument =
			// Forward save event
			this.#extHostDocuments.onDidSaveTextDocument;

		this._log("Document event subscriptions configured.");
	}

	// --- RPC Methods Called by MainThread (VscodeExtHostWorkspaceShape) ---

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$initializeWorkspace} */
	public $initializeWorkspace(
		workspaceDto: WorkspaceDataDtoForRpc | null,

		trusted: boolean,
	): void {
		this._log(
			`RPC $initializeWorkspace: Name='${workspaceDto?.name ?? "None"}', Folders=${workspaceDto?.folders?.length ?? 0}, Trusted=${trusted}`,
		);

		this.#isWorkspaceTrusted = trusted;

		// This call will update #confirmedWorkspaceState and fire events if needed.
		this.$acceptWorkspaceData(workspaceDto);

		if (!this.#initializedBarrier.isOpen()) {
			this.#initializedBarrier.open();

			this._log("Workspace initialized barrier opened.");
		}
	}

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$acceptWorkspaceData} */
	public $acceptWorkspaceData(
		workspaceDto: WorkspaceDataDtoForRpc | null,
	): void {
		// this._logService?.trace(`RPC $acceptWorkspaceData: Name='${workspaceDto?.name ?? "None"}', Folders=${workspaceDto?.folders?.length ?? 0}`);

		const { workspace, added, removed } =
			this._convertDtoToInternalWorkspace(
				workspaceDto,

				this.#confirmedWorkspaceState,

				// Diff against unconfirmed if it exists (optimistic update)
				this.#unconfirmedWorkspaceState,
			);

		this.#confirmedWorkspaceState = workspace ?? undefined;

		// Clear unconfirmed state after confirmation
		this.#unconfirmedWorkspaceState = undefined;

		if (added.length > 0 || removed.length > 0) {
			this._log(
				`Firing onDidChangeWorkspaceFolders: Added=${added.length}, Removed=${removed.length}`,
			);

			this.#onDidChangeWorkspaceFoldersEmitter.fire(
				Object.freeze({
					added: Object.freeze(added),

					removed: Object.freeze(removed),
				}),
			);
		}
	}

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$onDidGrantWorkspaceTrust} */
	public $onDidGrantWorkspaceTrust(): void {
		this._log("RPC $onDidGrantWorkspaceTrust received.");

		if (!this.#isWorkspaceTrusted) {
			this.#isWorkspaceTrusted = true;

			this.#onDidGrantWorkspaceTrustEmitter.fire();

			this._log(
				"Workspace trust granted. Fired onDidGrantWorkspaceTrust event.",
			);
		}
	}

	// --- Helper to convert DTO to internal workspace representation ---
	private _convertDtoToInternalWorkspace(
		dto: WorkspaceDataDtoForRpc | null,

		previousConfirmed: CocoonInternalWorkspace | undefined,

		previousUnconfirmed: CocoonInternalWorkspace | undefined,
	): {
		workspace: CocoonInternalWorkspace | null;

		added: VscodeApiWorkspaceFolder[];

		removed: VscodeApiWorkspaceFolder[];
	} {
		if (!dto) {
			// No workspace (e.g., empty window)
			const removed = previousConfirmed?.workspaceFolders
				? [...previousConfirmed.workspaceFolders]
				: [];

			return { workspace: null, added: [], removed };
		}

		const {
			id,

			name,

			folders: folderDtos,

			configuration: configDtoVscodeInternal,

			transient,

			isUntitled,
		} = dto;

		const newApiFolders: VscodeApiWorkspaceFolder[] = [];

		// Diff against unconfirmed state if it exists (from an optimistic update), otherwise against confirmed.
		const oldWorkspaceForDiff = previousUnconfirmed || previousConfirmed;

		if (Array.isArray(folderDtos)) {
			folderDtos.forEach((folderData, index) => {
				const folderApiUri = this._reviveUriDtoToVscodeApiUri(
					folderData.uri,

					// Convert DTO to VscodeApiUri
				);

				if (!folderApiUri) {
					this._logError(
						"Failed to revive workspace folder URI DTO to VscodeApiUri during DTO conversion.",

						folderData.uri,
					);

					// Skip this folder
					return;
				}

				// Try to reuse existing vscode.WorkspaceFolder API objects to maintain identity if URI matches.
				const existingApiFolder =
					oldWorkspaceForDiff?.workspaceFolders.find((f) =>
						this.#extHostFileSystemInfo.extUri.isEqual(
							f.uri,

							folderApiUri,
						),
					);

				if (existingApiFolder) {
					// Mutate name if changed
					(existingApiFolder as any).name = folderData.name;

					(existingApiFolder as any).index =
						// Mutate index
						folderData.index ?? index;

					newApiFolders.push(existingApiFolder);
				} else {
					newApiFolders.push({
						uri: folderApiUri,

						name: folderData.name,

						index: folderData.index ?? index,
					});
				}
			});
		}

		// Ensure sorted by index
		newApiFolders.sort((a, b) => a.index - b.index);

		const internalConfigUri = configDtoVscodeInternal
			? this._reviveUriDtoToInternalVSCodeUri(configDtoVscodeInternal)
			: null;

		const newInternalWorkspace = new CocoonInternalWorkspace(
			id,

			name,

			newApiFolders,

			!!transient,

			internalConfigUri,

			!!isUntitled,

			this.#extHostFileSystemInfo,
		);

		const { added, removed } = arrayDelta(
			oldWorkspaceForDiff ? oldWorkspaceForDiff.workspaceFolders : [],

			// This is already readonly VscodeApiWorkspaceFolder[]
			newInternalWorkspace.workspaceFolders,

			(a, b) => this._compareVscodeWorkspaceFoldersByUri(a, b),
		);

		return { workspace: newInternalWorkspace, added, removed };
	}

	private _compareVscodeWorkspaceFoldersByUri(
		a: VscodeApiWorkspaceFolder,

		b: VscodeApiWorkspaceFolder,
	): number {
		// Use extUri for case-insensitive comparison on Windows for file URIs, etc.
		return this.#extHostFileSystemInfo.extUri.isEqual(a.uri, b.uri)
			? 0
			: compare(a.uri.toString(), b.uri.toString());
	}

	// --- URI Conversion Helpers ---
	private _reviveUriDtoToVscodeApiUri(
		uriDto: UriComponentsForRpc | null | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;

		try {
			const internalUri = VSCodeInternalURI.revive(
				uriDto as VSCodeInternalUriComponents,
			);

			// Convert internal URI to API URI
			return VscodeApiUri.from(internalUri);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VscodeApiUri:",

				uriDto,

				e,
			);

			return undefined;
		}
	}

	private _reviveUriDtoToInternalVSCodeUri(
		uriDto: UriComponentsForRpc | null | undefined,
	): VSCodeInternalURI | null {
		if (!uriDto) return null;

		try {
			return VSCodeInternalURI.revive(
				uriDto as VSCodeInternalUriComponents,
			);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VSCodeInternalURI:",

				uriDto,

				e,
			);

			return null;
		}
	}

	private _vscodeApiUriToComponentsDto(
		uri: VscodeApiUri,
	): UriComponentsForRpc | undefined {
		if (!(uri instanceof VscodeApiUri)) {
			this._logError(
				"Cannot convert non-VscodeApiUri to DTO for RPC",

				uri,
			);

			return undefined;
		}

		// Convert VscodeApiUri to VSCodeInternalURI
		const internalUri = VSCodeInternalURI.from(uri);

		// Then marshal to DTO
		return this._internalUriToMarshalledDto(internalUri);
	}

	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): UriComponentsForRpc {
		return {
			// Ensure this DTO is what MainThread expects
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// Only include if strictly needed by MainThread
			// external: uri.toString(true), fsPath: uri.fsPath,
		};
	}

	private _convertGlobDtoForRpc(
		pattern: VscodeApiGlobPattern,
	): RpcRelativePattern | string | undefined {
		if (typeof pattern === "string") return pattern;

		if (pattern instanceof VscodeApiRelativePattern) {
			// VscodeApiRelativePattern.baseUri is VscodeApiUri. Convert to DTO.
			const baseUriDto = this._vscodeApiUriToComponentsDto(
				pattern.baseUri,
			);

			return {
				// patternString from RelativePattern API
				pattern: pattern.patternString,

				// DTO might want string path
				base: baseUriDto?.external ?? pattern.baseUri.toString(),

				// Send full DTO as baseUriMarker if protocol supports it
				baseUriMarker: baseUriDto,

				// Cast, ensure RpcRelativePattern matches this structure
			} as RpcRelativePattern;
		}

		this._logWarn(
			"Unsupported VscodeApiGlobPattern type for DTO conversion:",

			pattern,
		);

		return undefined;
	}

	// --- Public API Getters (for vscode.workspace) ---
	private get _currentInternalWorkspace():
		| CocoonInternalWorkspace
		| undefined {
		return this.#unconfirmedWorkspaceState || this.#confirmedWorkspaceState;
	}

	get workspaceFile(): VscodeApiUri | undefined {
		const internalWs = this._currentInternalWorkspace;

		if (!internalWs?.configurationUri) return undefined;

		// If it's an untitled workspace, the configurationUri might point to a temporary location,

		// but workspaceFile should reflect an untitled scheme.
		if (
			internalWs.isUntitled &&
			internalWs.configurationUri.scheme === Schemas.file
		) {
			// VS Code's logic for untitled workspace file URI
			const dirOfTempWorkspaceFile = dirname(internalWs.configurationUri);

			return VscodeApiUri.from({
				scheme: Schemas.untitled,

				path: basenameOrAuthority(dirOfTempWorkspaceFile),
			});
		}

		// Convert internal URI to API URI
		return VscodeApiUri.from(internalWs.configurationUri);
	}

	get name(): string | undefined {
		return this._currentInternalWorkspace?.name;
	}

	get workspaceFolders(): readonly VscodeApiWorkspaceFolder[] | undefined {
		return this._currentInternalWorkspace?.workspaceFolders;
	}

	get isTrusted(): boolean {
		return this.#isWorkspaceTrusted;
	}

	// --- Public API Methods (for vscode.workspace) ---
	public async getWorkspaceFolder(
		uri: VscodeApiUri,
	): Promise<VscodeApiWorkspaceFolder | undefined> {
		// Ensure workspace data is initialized
		await this.#initializedBarrier.wait();

		if (!(uri instanceof VscodeApiUri)) {
			this._logWarn(
				"getWorkspaceFolder called with invalid URI type:",

				uri,
			);

			return undefined;
		}

		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	public async getConfiguration(
		section?: string,

		scope?: ConfigurationScope | VscodeApiUri,
	): Promise<WorkspaceConfiguration> {
		// this._logService?.trace(`getConfiguration (Section: ${section}) -> delegating to IExtHostConfiguration via InstantiationService.`);

		// Use the injected IInstantiationService to get IExtHostConfiguration
		const configService = this.#instantiationService.get(
			IExtHostConfiguration,
		);

		return configService.getConfiguration(section, scope);
	}

	public async findFiles(
		include: VscodeApiGlobPattern,

		exclude?: VscodeApiGlobPattern | null,

		maxResults?: number | null,

		token?: CancellationToken,
	): Promise<VscodeApiUri[]> {
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"findFiles: MainThreadWorkspace RPC proxy unavailable. Returning empty array.",
			);

			return [];
		}

		// this._logService?.trace(`findFiles: Include='${String(include)}', Exclude='${String(exclude)}', MaxResults=${maxResults}`);

		if (token?.isCancellationRequested) return [];

		try {
			const includeDto = this._convertGlobDtoForRpc(include);

			const excludeDto = exclude
				? this._convertGlobDtoForRpc(exclude)
				: null;

			const rpcOptions = {
				maxResults,

				useIgnoreFiles: true,

				followSymlinks: true /* Common defaults */,
			};

			if (!includeDto) {
				// If include pattern conversion failed
				this._logWarn(
					"findFiles: Invalid 'include' pattern. Returning empty array.",
				);

				return [];
			}

			const resultsDto = await this.#mainThreadWorkspaceProxy.$findFiles(
				includeDto as string | RpcRelativePattern,

				excludeDto as string | RpcRelativePattern | null,

				rpcOptions,
			);

			if (token?.isCancellationRequested) return [];

			return Array.isArray(resultsDto)
				? (resultsDto
						.map((dto) => this._reviveUriDtoToVscodeApiUri(dto))
						// Filter out undefined from failed revival
						.filter(Boolean) as VscodeApiUri[])
				: [];
		} catch (e: any) {
			if (isCancellationError(e)) {
				this._log("findFiles cancelled by token during RPC.");

				return [];
			}

			this._logError(
				"workspace.findFiles RPC failed:",

				refineErrorForShim(e, this._logService),
			);

			return [];
		}
	}

	public async requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined> {
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"requestWorkspaceTrust: MainThreadWorkspace RPC proxy unavailable. Cannot request trust.",
			);

			// Or false, depending on desired behavior for unavailability
			return undefined;
		}

		this._log("requestWorkspaceTrust called with options:", options);

		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	public updateWorkspaceFolders(
		_extension: IExtensionDescription,

		_start: number | undefined,

		_deleteCount: number | null | undefined,

		..._workspaceFoldersToAdd: ReadonlyArray<{
			uri: VscodeApiUri;

			name?: string;
		}>
	): boolean {
		this._logError(
			"API Not Implemented: vscode.workspace.updateWorkspaceFolders. This is a complex, restricted API and is not supported in Cocoon MVP. Returning false.",
		);

		// A full implementation would involve:
		// 1. Validating inputs (as in VS Code's ExtHostWorkspace.updateWorkspaceFolders).
		// 2. Creating an `_unconfirmedWorkspaceState` by applying the changes optimistically.
		// 3. Firing `_onDidChangeWorkspaceFoldersEmitter` with the optimistic change.
		// 4. Calling `this.#mainThreadWorkspaceProxy.$updateWorkspaceFolders(...)` with DTOs.
		// 5. `MainThreadWorkspace` would attempt the change and then call back with `$acceptWorkspaceData` to confirm or reject.
		// Indicate operation was not successful or not allowed.
		return false;
	}

	get onDidChangeWorkspaceFolders(): VscodeEvent<VscodeWorkspaceFoldersChangeEvent> {
		return this.#onDidChangeWorkspaceFoldersEmitter.event;
	}

	get onDidGrantWorkspaceTrust(): VscodeEvent<void> {
		return this.#onDidGrantWorkspaceTrustEmitter.event;
	}

	get textDocuments(): readonly TextDocument[] {
		return this.#extHostDocuments.getTextDocuments();
	}

	public async openTextDocument(
		uriOrPathOrOptions?:
			| VscodeApiUri
			| string
			| { language?: string; content?: string },
	): Promise<TextDocument> {
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadDocsProxy) {
			throw new Error(
				"openTextDocument: MainThreadDocuments RPC proxy unavailable. Cannot open or create document.",
			);
		}

		let targetUriDto: UriComponentsForRpc | undefined;

		let untitledOptions:
			| { languageId?: string; content?: string }
			| undefined;

		if (uriOrPathOrOptions instanceof VscodeApiUri) {
			targetUriDto =
				this._vscodeApiUriToComponentsDto(uriOrPathOrOptions);
		} else if (typeof uriOrPathOrOptions === "string") {
			targetUriDto = this._vscodeApiUriToComponentsDto(
				VscodeApiUri.file(uriOrPathOrOptions),
			);
		} else if (
			uriOrPathOrOptions &&
			typeof uriOrPathOrOptions === "object" &&
			(uriOrPathOrOptions.content !== undefined ||
				uriOrPathOrOptions.language !== undefined)
		) {
			// This is for creating a new untitled document with content/language.
			untitledOptions = {
				languageId: uriOrPathOrOptions.language,

				content: uriOrPathOrOptions.content,
			};

			this._log(
				`openTextDocument: Requesting creation of untitled document. Lang='${untitledOptions.languageId}', HasContent=${!!untitledOptions.content}`,
			);

			targetUriDto = await this.#mainThreadDocsProxy.$tryCreateDocument(
				untitledOptions,

				// Returns URI DTO for the new untitled file
			);
		}

		if (!targetUriDto) {
			throw new Error(
				"Invalid URI or options provided to openTextDocument, or failed to create untitled document URI.",
			);
		}

		// this._logService?.trace(`openTextDocument: Attempting to open/ensure document via RPC: Path='${targetUriDto.path || targetUriDto.scheme}'`);

		// For existing files, $tryOpenDocument ensures it's known on MainThread.
		// For untitled created via $tryCreateDocument, it's already known.
		// If it was an existing file URI and not an untitled creation, call $tryOpenDocument.
		if (!untitledOptions) {
			// Only call $tryOpenDocument if not creating new untitled (as $tryCreateDocument handles it)
			await this.#mainThreadDocsProxy.$tryOpenDocument(targetUriDto);
		}

		// After RPC ensures the document model exists on MainThread (and thus $acceptModelAdded was called),

		// retrieve the document from our local cache via CocoonDocumentService.
		const documentVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(targetUriDto);

		if (!documentVscodeApiUri) {
			throw new Error(
				"Failed to revive URI after openTextDocument RPC call. Cannot retrieve document.",
			);
		}

		const docData =
			// getDocumentData uses VscodeApiUri
			this.#extHostDocuments.getDocumentData(documentVscodeApiUri);

		if (!docData?.document) {
			throw new Error(
				`Document ${documentVscodeApiUri.toString()} not found in local cache after open/create attempt. This indicates a sync issue with MainThread.`,
			);
		}

		return docData.document;
	}

	get fs(): FileSystem {
		return this.#fileSystemApiService;

		// Return injected instance
	}

	public getRelativePath = (
		pathOrUri: string | VscodeApiUri,

		includeWorkspaceFolder?: boolean,
	): string => {
		const resourceToCompare =
			pathOrUri instanceof VscodeApiUri
				? pathOrUri
				: VscodeApiUri.file(pathOrUri);

		// Sync variant, uses _currentInternalWorkspace
		const folder = this.getWorkspaceFolderSync(resourceToCompare);

		if (!folder) {
			// If not within any workspace folder, return original path/fsPath
			// fsPath is safe for both file and non-file URIs (might be path part)
			return resourceToCompare.fsPath;
		}

		// Determine if workspace folder name should be prepended
		if (typeof includeWorkspaceFolder === "undefined") {
			includeWorkspaceFolder =
				(this._currentInternalWorkspace?.foldersApiObjects.length ??
					0) > 1;
		}

		// Use extUri from IExtHostFileSystemInfo for correct case-insensitivity and path operations.
		const internalFolderUri = VSCodeInternalURI.from(folder.uri);

		const internalResourceUri = VSCodeInternalURI.from(resourceToCompare);

		let relativePathString =
			this.#extHostFileSystemInfo.extUri.relativePath(
				internalFolderUri,

				internalResourceUri,
			);

		if (includeWorkspaceFolder && relativePathString) {
			// Prepend folder name if needed and relative path exists
			relativePathString = `${folder.name}${path.sep}${relativePathString}`;
		}

		// Fallback if relativePath is empty (e.g., resource is the folder itself) or null
		return (
			relativePathString ||
			(pathOrUri instanceof VscodeApiUri ? pathOrUri.fsPath : pathOrUri)
		);
	};

	private getWorkspaceFolderSync(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		// This uses the current state without await, suitable for synchronous utility functions.
		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	public override dispose(): void {
		// Handles _instanceDisposables
		super.dispose();

		this.#onDidChangeWorkspaceFoldersEmitter.dispose();

		this.#onDidGrantWorkspaceTrustEmitter.dispose();

		// Document event emitters are owned and disposed by CocoonDocumentService.
		this._log("Disposed.");
	}

	// --- Stubs for APIs not fully shimmed / out of scope for Cocoon MVP ---
	get onWillSaveTextDocument(): VscodeEvent<TextDocumentWillSaveEvent> {
		this._logWarnOnce(
			"Event not implemented: onWillSaveTextDocument. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get notebookDocuments(): readonly any[] /* vscode.NotebookDocument[] */ {
		this._logWarnOnce(
			"API not implemented: workspace.notebookDocuments. Returning empty array.",
		);

		return [];
	}

	public async openNotebookDocument(
		_uriOrType?: VscodeApiUri | string,
	): Promise<any /*vscode.NotebookDocument*/> {
		this._logWarnOnce(
			"API not implemented: workspace.openNotebookDocument. Throwing error.",
		);

		throw new Error("openNotebookDocument not implemented in Cocoon.");
	}

	public registerTextDocumentContentProvider(
		_scheme: string,

		_provider: TextDocumentContentProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerTextDocumentContentProvider. Returning NOP disposable.",
		);

		return Disposable.None;
	}

	public registerTaskProvider(
		_type: string,

		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerTaskProvider. Returning NOP disposable.",
		);

		return Disposable.None;
	}

	public registerFileSystemProvider(
		_scheme: string,

		_provider: FileSystemProvider,

		_options?: { isCaseSensitive?: boolean; isReadonly?: boolean },
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerFileSystemProvider. Returning NOP disposable.",
		);

		return Disposable.None;
	}

	get onWillCreateFiles(): VscodeEvent<FileWillCreateEvent> {
		this._logWarnOnce(
			"Event not implemented: onWillCreateFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidCreateFiles(): VscodeEvent<FileCreateEvent> {
		this._logWarnOnce(
			"Event not implemented: onDidCreateFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onWillDeleteFiles(): VscodeEvent<FileWillDeleteEvent> {
		this._logWarnOnce(
			"Event not implemented: onWillDeleteFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidDeleteFiles(): VscodeEvent<FileDeleteEvent> {
		this._logWarnOnce(
			"Event not implemented: onDidDeleteFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onWillRenameFiles(): VscodeEvent<FileWillRenameEvent> {
		this._logWarnOnce(
			"Event not implemented: onWillRenameFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidRenameFiles(): VscodeEvent<FileRenameEvent> {
		this._logWarnOnce(
			"Event not implemented: onDidRenameFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}
}

// Make cocoonInstantiationService globally available for shims that might need it (like getConfiguration)
// This is a workaround for direct `global.DI` access. It's better if services get IInstantiationService injected.
// This global is now REMOVED in favor of injecting IInstantiationService directly where needed.
// declare var cocoonInstantiationService: IInstantiationService | undefined;

// And a new one for the fs service if it's injected this way.
// This is also REMOVED. workspace.fs gets it via DI.
// declare var cocoonFileSystemApiService: FileSystem | undefined;
