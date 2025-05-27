/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim (workspace-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostWorkspace` service interface, providing the core functionalities
 * for the `vscode.workspace` API namespace in the Cocoon extension host environment.
 * This service is central to how extensions perceive and interact with the workspace,
 *
 * including its structure (folders, name, configuration file), trust state, and file system.
 *
 * It maintains an internal representation of the workspace (`CocoonInternalWorkspace`) and
 * synchronizes this state with the Mountain host process (main process) via RPC calls.
 * Document-related aspects of `vscode.workspace` (such as `textDocuments` and document
 * lifecycle events like `onDidOpenTextDocument`) are delegated to an injected
 * `CocoonDocumentService` instance. The `vscode.workspace.fs` API, providing structured
 * filesystem access, is exposed via an injected `ShimFileSystemApi` instance.
 *
 * Core Responsibilities:
 * - Receiving initial workspace data (e.g., folders, name, configuration URI, trust state)
 *   and subsequent updates from Mountain through RPC methods like `$initializeWorkspace`
 *   and `$acceptWorkspaceData`.
 * - Maintaining an internal model (`CocoonInternalWorkspace`) of the current workspace.
 *   This model uses `VSCodeInternalURI` (VS Code's internal URI class) and `IExtUri`
 *   (for case-sensitive path operations) to manage workspace folders and metadata.
 * - Providing getters for `vscode.workspace` properties, including:
 *   - `workspaceFolders`: A readonly array of `vscode.WorkspaceFolder` objects.
 *   - `name`: The name of the workspace (e.g., from a `.code-workspace` file or the root folder name).
 *   - `workspaceFile`: The `vscode.Uri` of the `.code-workspace` file, if applicable.
 *   - `isTrusted`: A boolean indicating if the workspace is trusted.
 * - Implementing `vscode.workspace.getWorkspaceFolder(uri)` using an efficient
 *   `TernarySearchTree` for URI-to-folder lookups, respecting filesystem case sensitivity
 *   via the injected `IExtHostFileSystemInfo.extUri`.
 * - Proxying operations to Mountain via RPC:
 *   - `vscode.workspace.findFiles(...)`: For searching files based on glob patterns.
 *   - `vscode.workspace.requestWorkspaceTrust(...)`: For requesting the user to trust the workspace.
 * - Implementing `vscode.workspace.openTextDocument(...)` by:
 *   - Coordinating with `MainThreadDocuments` on Mountain (via RPC calls like
 *     `$tryOpenDocument` or `$tryCreateDocument`) to ensure the document model exists
 *     on the main thread.
 *   - Retrieving the corresponding `vscode.TextDocument` object from the local
 *     `CocoonDocumentService` after Mountain acknowledges the document.
 * - Delegating `vscode.workspace.getConfiguration(...)` to an injected `IExtHostConfiguration`
 *   service instance (obtained via `IInstantiationService`).
 * - Delegating `vscode.workspace.textDocuments` property and all document lifecycle events
 *   (e.g., `onDidOpenTextDocument`, `onDidChangeTextDocument`) to the injected
 *   `CocoonDocumentService`.
 * - Exposing `vscode.workspace.fs` by returning the injected `ShimFileSystemApi` instance.
 * - Managing and firing `onDidChangeWorkspaceFolders` and `onDidGrantWorkspaceTrust` events
 *   when notified by Mountain.
 * - Stubbing or marking as "not implemented" several advanced or less critical
 *   `vscode.workspace` APIs for the Cocoon MVP. This includes features like full text
 *   search within files, edit session management, and programmatic updates to workspace
 *   folders by extensions (`updateWorkspaceFolders`).
 *
 * Key Interactions:
 * - An instance of `ShimExtHostWorkspace` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts` as `IExtHostWorkspace`.
 * - The `vscode.workspace` API object, as provided to extensions via the API factory,
 *
 *   delegates its calls to this service instance.
 * - Communicates with `MainContext.MainThreadWorkspace` (for workspace structure, findFiles, trust)
 *   and `MainContext.MainThreadDocuments` (for opening documents) on Mountain via RPC.
 * - Implements `VscodeExtHostWorkspaceShape` and registers itself as an RPC service target
 *   for calls from Mountain (identified by `ExtHostContext.ExtHostWorkspace`), allowing
 *   Mountain to push workspace state updates.
 * - Depends on several injected services:
 *   - `IExtHostInitDataService`: For initial workspace data from Mountain.
 *   - `IExtHostFileSystemInfo`: For the `extUri` instance used for case-sensitive URI operations.
 *   - `CocoonDocumentService`: For all document-related aspects of `vscode.workspace`.
 *   - `ShimFileSystemApi`: To provide the `vscode.workspace.fs` implementation.
 *   - `IInstantiationService`: To dynamically retrieve other services like `IExtHostConfiguration`.
 * - Uses `BaseCocoonShim` for common utilities (logging, RPC proxy, marshalling/revival).
 *
 *--------------------------------------------------------------------------------------------*/

// For path.sep in getRelativePath
import * as path from "node:path";
// For diffing workspace folder arrays
import { delta as arrayDelta } from "vs/base/common/arrays";
// For synchronizing initialization
import { Barrier } from "vs/base/common/async";
import type { CancellationToken } from "vs/base/common/cancellation";
import { isCancellationError } from "vs/base/common/errors";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore /* toDisposable, */,
	type IDisposable,
} from "vs/base/common/lifecycle";
// For URI DTO $mid property
import { MarshalledId } from "vs/base/common/marshalling";
// For URI schemes like 'file', 'untitled'
import { Schemas } from "vs/base/common/network";
import {
	// URI utility
	basenameOrAuthority,
	// URI utility
	dirname,
	// Interface for case-sensitive URI operations
	type IExtUri,
} from "vs/base/common/resources";
// For string comparison
import { compare } from "vs/base/common/strings";
// For efficient folder lookup
import { TernarySearchTree } from "vs/base/common/ternarySearchTree";
import {
	// VS Code's internal URI class
	URI as VSCodeInternalURI,
	// DTO for URI components
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
// ExtensionIdentifier and IExtensionDescription not directly used in this shim's core logic, but often related to workspace context
// import { ExtensionIdentifier, type IExtensionDescription } from "vs/platform/extensions/common/extensions";

import {
	/* createDecorator, */ type IInstantiationService,
} from "vs/platform/instantiation/common/instantiation";
import {
	// RPC context identifiers
	ExtHostContext,
	MainContext,
	// DTO for glob patterns
	type IRelativePatternDto as RpcRelativePattern,
	// Base DTO for workspace data
	type IWorkspaceData as RpcWorkspaceData,
	// Base DTO for workspace folder data
	type IWorkspaceFolderData as RpcWorkspaceFolderData,
	// RPC shape this service implements
	type ExtHostWorkspaceShape as VscodeExtHostWorkspaceShape,
} from "vs/workbench/api/common/extHost.protocol";
// For getConfiguration delegation
import type { IExtHostConfiguration } from "vs/workbench/api/common/extHostConfiguration";
// Dependency
import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import type {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
// Dependency for initial data

// Import from public 'vscode' API definition for types used in the public surface
import {
	// Public API type for relative glob patterns
	RelativePattern as VscodeApiRelativePattern,
	// Public API URI type
	Uri as VscodeApiUri,
	// For getConfiguration scope parameter
	type ConfigurationScope,
	type FileCreateEvent,
	type FileDeleteEvent,
	type FileRenameEvent,
	// The vscode.FileSystem type, provided by ShimFileSystemApi
	type FileSystem,
	// For stubbed APIs (types for methods that are NOPs or throw)
	type FileSystemProvider,
	type FileWillCreateEvent,
	type FileWillDeleteEvent,
	type FileWillRenameEvent,
	type TaskProvider,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	type TextDocumentWillSaveEvent,
	// Union type for glob patterns
	type GlobPattern as VscodeApiGlobPattern,
	// Public API type for workspace folders
	type WorkspaceFolder as VscodeApiWorkspaceFolder,
	// Event payload type
	type WorkspaceFoldersChangeEvent as VscodeWorkspaceFoldersChangeEvent,
	type WorkspaceConfiguration,
	type WorkspaceTrustRequestOptions,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
// Dependency (concrete class)
import type { CocoonDocumentService } from "./document-shim";
// Dependency (concrete class for workspace.fs)
import type { ShimFileSystemApi } from "./fs-api-shim";

// --- Type Definitions for RPC and Internal State ---

/** DTO for URI components sent/received over RPC, aligning with VS Code's internal `UriComponents`. */
type UriComponentsForRpc = VSCodeInternalUriComponents;

/** DTO for a single workspace folder sent/received over RPC, extending VS Code's `RpcWorkspaceFolderData`. */
interface WorkspaceFolderDtoForRpc extends RpcWorkspaceFolderData {
	// Ensures `uri` is the DTO type, not a live URI object.
	uri: UriComponentsForRpc;
}

/** DTO for the entire workspace data structure sent/received over RPC, extending `RpcWorkspaceData`. */
interface WorkspaceDataDtoForRpc extends RpcWorkspaceData {
	// Array of workspace folder DTOs.
	folders: WorkspaceFolderDtoForRpc[];

	// URI DTO of the .code-workspace file, if applicable.
	configuration?: UriComponentsForRpc | null;
}

/** Defines the RPC interface for `MainThreadWorkspace` methods relevant to this shim. */
interface MainThreadWorkspaceProxyShim {
	$findFiles(
		// Glob pattern or string
		include: RpcRelativePattern | string,

		// Optional exclude pattern
		exclude?: RpcRelativePattern | string | null,

		options?: {
			// Search options
			maxResults?: number | null;

			// Respect .gitignore, etc.
			useIgnoreFiles?: boolean;

			// Follow symbolic links
			followSymlinks?: boolean;

			// Allow other potential options
			[key: string]: any;
		},

		// token?: CancellationToken - VS Code RPC often handles cancellation implicitly via message IDs
		// Returns array of URI DTOs
	): Promise<UriComponentsForRpc[]>;

	$requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined>;

	// If extensions could update folders
	// $updateWorkspaceFolders?(extensionId: string, start: number, deleteCount: number | null, foldersToAddDto: { uri: UriComponentsForRpc, name?: string }[]): Promise<void>;

	// If using a pull model for initial folders
	// $getWorkspaceFolders?(): Promise<WorkspaceFolderDtoForRpc[]>;
}

/** Defines the RPC interface for `MainThreadDocuments` methods relevant to opening documents. */
interface MainThreadDocumentsProxyShim {
	// For existing files
	$tryOpenDocument(uri: UriComponentsForRpc): Promise<void>;

	$tryCreateDocument(options?: {
		languageId?: string;

		content?: string;

		// For new untitled files, returns URI DTO of new doc
	}): Promise<UriComponentsForRpc>;
}

/**
 * Internal representation of the workspace state, managing folders, name, configuration URI,
 *
 * and other metadata. This class is similar in concept to VS Code's internal `ExtHostWorkspaceImpl._actual`.
 */
class CocoonInternalWorkspace {
	// TernarySearchTree for efficient prefix-based lookup of workspace folders by URI.
	private readonly _structure: TernarySearchTree<
		VSCodeInternalURI,
		VscodeApiWorkspaceFolder
	>;

	// Array of `vscode.WorkspaceFolder` API objects, kept sorted by index.
	public readonly foldersApiObjects: VscodeApiWorkspaceFolder[];

	// `IExtUri` instance for case-sensitive and scheme-aware URI operations.
	public readonly extUri: IExtUri;

	constructor(
		// Unique ID of the workspace.
		public readonly id: string,

		// Mutable display name of the workspace.
		public nameInternal: string,

		// Initial set of workspace folders (API type).
		initialFoldersData: VscodeApiWorkspaceFolder[],

		// True if the workspace is not persisted (e.g., an empty window).
		public readonly transient: boolean,

		// `VSCodeInternalURI` of the .code-workspace file, or null.
		public configurationInternal: VSCodeInternalURI | null,

		// True if it's an untitled workspace (e.g., a folder opened without a .code-workspace file).
		public isUntitledInternal: boolean,

		// Injected for `extUri`.
		extHostFileSystemInfo: IExtHostFileSystemInfo,
	) {
		this.extUri = extHostFileSystemInfo.extUri;

		this.foldersApiObjects = [];

		this._structure = TernarySearchTree.forUris<VscodeApiWorkspaceFolder>(
			// Callback to determine if URI path casing should be ignored for tree lookups.
			// It uses the `extUri` instance, which is configured by `ShimExtHostFileSystemInfo`
			// to respect the case-sensitivity of the URI's scheme.
			(uri) => this.extUri.ignorePathCasing(uri as VSCodeInternalURI),

			// useCanonical बताता है कि क्या tree को यूआरआई को canonicalize करना चाहिए।
			// Default is true, but can be set to a function if specific canonicalization needed.
			// For `resources.ts` TernarySearchTree, this is `useKeyResourcePath`.
			() => true,
		);

		// Populate initial folders.
		this.updateFolders(initialFoldersData);
	}

	/** Updates the internal list of workspace folders and the TernarySearchTree. */
	public updateFolders(newApiFolders: VscodeApiWorkspaceFolder[]): void {
		// Clear array in-place while keeping reference.
		(this.foldersApiObjects as VscodeApiWorkspaceFolder[]).length = 0;

		// Clear the search tree.
		this._structure.clear();

		newApiFolders.forEach((folder) => {
			// folder.uri is already VscodeApiUri
			this.foldersApiObjects.push(folder);

			// The TernarySearchTree keys should be VSCodeInternalURI for consistency with extUri operations.
			this._structure.set(VSCodeInternalURI.from(folder.uri), folder);
		});

		// Ensure sorted by index.
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

	/**
	 * Finds the `vscode.WorkspaceFolder` that contains the given URI.
	 * @param uri The URI to find the folder for.
	 * @param resolveParent If true, and `uri` directly matches a folder's URI, try its parent. (Not standard VS Code behavior for `getWorkspaceFolder`).
	 * @returns The `VscodeApiWorkspaceFolder` or `undefined`.
	 */
	public getWorkspaceFolder(
		uri: VscodeApiUri,

		resolveParent_custom?: boolean,
	): VscodeApiWorkspaceFolder | undefined {
		// Convert API URI to internal URI for tree.
		const internalCandidateUri = VSCodeInternalURI.from(uri);

		let candidateForTreeLookup = internalCandidateUri;

		// This `resolveParent_custom` logic is specific and not part of standard `getWorkspaceFolder`.
		// Standard `getWorkspaceFolder` finds the folder whose URI is a prefix of the input URI.
		if (resolveParent_custom) {
			const directMatch = this._structure.get(candidateForTreeLookup);

			if (
				directMatch &&
				this.extUri.isEqual(
					VSCodeInternalURI.from(directMatch.uri),

					candidateForTreeLookup,
				)
			) {
				// If the URI *is* a folder URI, look for a folder containing its parent.
				candidateForTreeLookup = this.extUri.dirname(
					candidateForTreeLookup,
				);
			}
		}

		// `findSubstr` finds the longest prefix match, which is correct for `getWorkspaceFolder`.
		return this._structure.findSubstr(candidateForTreeLookup);
	}

	/** Resolves a URI to a workspace folder if the URI exactly matches a folder's URI. */
	public resolveWorkspaceFolder(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._structure.get(VSCodeInternalURI.from(uri));
	}
}

/**
 * Cocoon's implementation of `IExtHostWorkspace` (and `VscodeExtHostWorkspaceShape` for RPC).
 * This service provides the functionalities for the `vscode.workspace` API namespace.
 */
export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements VscodeExtHostWorkspaceShape
{
	// For DI registration if using VS Code's IExtHostWorkspace key.
	public readonly _serviceBrand: undefined;

	// Store full, revived initData.
	readonly #initData: ExtHostInitData;

	// State confirmed by MainThread.
	#confirmedWorkspaceState: CocoonInternalWorkspace | undefined = undefined;

	// For optimistic updates before MainThread confirmation.
	#unconfirmedWorkspaceState: CocoonInternalWorkspace | undefined = undefined;

	// Local cache of workspace trust state.
	#isWorkspaceTrusted = false;

	// Barrier to ensure critical operations wait for `$initializeWorkspace` from MainThread.
	readonly #initializedBarrier = new Barrier();

	// RPC Proxies to MainThread services.
	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceProxyShim | null =
		null;

	readonly #mainThreadDocsProxy: MainThreadDocumentsProxyShim | null = null;

	// Injected dependencies.
	readonly #extHostDocuments: CocoonDocumentService;

	readonly #extHostFileSystemInfo: IExtHostFileSystemInfo;

	// Provides vscode.workspace.fs.
	readonly #fileSystemApiService: FileSystem;

	// For DI, e.g., to get IExtHostConfiguration.
	readonly #instantiationService: IInstantiationService;

	// Event Emitters for `vscode.workspace` events.
	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<VscodeWorkspaceFoldersChangeEvent>();

	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();

	// Document-related events are forwarded from CocoonDocumentService.
	public readonly onDidOpenTextDocument: VscodeEvent<TextDocument>;

	public readonly onDidCloseTextDocument: VscodeEvent<TextDocument>;

	public readonly onDidChangeTextDocument: VscodeEvent<TextDocumentChangeEvent>;

	public readonly onDidSaveTextDocument: VscodeEvent<TextDocument>;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		// Provides revived ExtHostInitData.
		initDataService: IExtHostInitDataService,

		extHostFileSystemInfo: IExtHostFileSystemInfo,

		logService: ILogServiceForShim | undefined,

		extHostDocuments: CocoonDocumentService,

		// For vscode.workspace.fs
		fileSystemApiService: FileSystem,

		// For getConfiguration()
		instantiationService: IInstantiationService,
	) {
		super("ExtHostWorkspace", rpcService, logService);

		// Store the revived initData.
		this.#initData = initDataService.value;

		this.#extHostDocuments = extHostDocuments;

		this.#extHostFileSystemInfo = extHostFileSystemInfo;

		this.#fileSystemApiService = fileSystemApiService;

		this.#instantiationService = instantiationService;

		// Use Info for major lifecycle events.
		this._logInfo("Initializing...");

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

				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostContext.ExtHostWorkspace).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostWorkspace:",

					e,
				);
			}
		}

		if (!this.#mainThreadWorkspaceProxy) {
			this._logError(
				"MainThreadWorkspace RPC proxy is unavailable. Features like `findFiles` and `requestWorkspaceTrust` will fail.",
			);
		}

		if (!this.#mainThreadDocsProxy) {
			this._logError(
				"MainThreadDocuments RPC proxy is unavailable. `openTextDocument` will fail.",
			);
		}

		// Initialize trust state from initData.
		this.#isWorkspaceTrusted =
			this.#initData.workspace?.trusted ??
			this.#initData.environment.isTrusted ??
			// Default to trusted.
			true;

		// Set up a preliminary workspace state from `initData` if available.
		// This state is "unconfirmed" until `$initializeWorkspace` is called by MainThread.
		if (this.#initData.workspace) {
			const { workspace: preliminaryWorkspace } =
				this._convertDtoToInternalWorkspace(
					// Cast: initData.workspace is IWorkspaceData, should be compatible.
					this.#initData.workspace as WorkspaceDataDtoForRpc,

					// No previous confirmed state yet.
					undefined,

					// No previous unconfirmed state yet.
					undefined,
				);

			this.#unconfirmedWorkspaceState = preliminaryWorkspace ?? undefined;

			this._logDebug(
				`Preliminary workspace state set from initData. Name='${this.#unconfirmedWorkspaceState?.name ?? "N/A"}', Folders=${this.#unconfirmedWorkspaceState?.workspaceFolders.length ?? 0}. Awaiting $initializeWorkspace confirmation.`,
			);
		}

		// Forward document lifecycle events from CocoonDocumentService to be exposed on `vscode.workspace`.
		this.onDidOpenTextDocument =
			this.#extHostDocuments.onDidOpenTextDocument;

		this.onDidCloseTextDocument =
			this.#extHostDocuments.onDidCloseTextDocument;

		this.onDidChangeTextDocument =
			this.#extHostDocuments.onDidChangeTextDocument;

		this.onDidSaveTextDocument =
			this.#extHostDocuments.onDidSaveTextDocument;

		this._logDebug(
			"Document event subscriptions configured to forward from CocoonDocumentService.",
		);
	}

	// --- RPC Methods Called by MainThread (Implementation of VscodeExtHostWorkspaceShape) ---

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$initializeWorkspace} */
	public $initializeWorkspace(
		workspaceDto: WorkspaceDataDtoForRpc | null,

		trusted: boolean,
	): void {
		const folderCount = workspaceDto?.folders?.length ?? 0;

		this._logInfo(
			`RPC $initializeWorkspace received. Workspace Name='${workspaceDto?.name ?? "None"}', Folders=${folderCount}, IsTrusted=${trusted}`,
		);

		this.#isWorkspaceTrusted = trusted;

		// This call processes the DTO, updates `#confirmedWorkspaceState`, and fires events if needed.
		this.$acceptWorkspaceData(workspaceDto);

		if (!this.#initializedBarrier.isOpen()) {
			// Signal that the workspace is now fully initialized.
			this.#initializedBarrier.open();

			this._logInfo(
				"Workspace initialized barrier opened. `vscode.workspace` is now fully ready.",
			);
		} else {
			this._logWarn(
				"$initializeWorkspace called after already initialized. State will be updated.",
			);
		}
	}

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$acceptWorkspaceData} */
	public $acceptWorkspaceData(
		workspaceDto: WorkspaceDataDtoForRpc | null,
	): void {
		const folderCount = workspaceDto?.folders?.length ?? 0;

		this._logDebug(
			`RPC $acceptWorkspaceData received. Workspace Name='${workspaceDto?.name ?? "None"}', Folders=${folderCount}`,
		);

		// Convert the DTO from MainThread into the internal `CocoonInternalWorkspace` representation.
		// This diffs against the current state to determine what changed (added/removed folders).
		const {
			workspace: newWorkspace,

			added,

			removed,
		} = this._convertDtoToInternalWorkspace(
			workspaceDto,

			// Diff against the last confirmed state.
			this.#confirmedWorkspaceState,

			// If an optimistic update was pending, diff against that too.
			this.#unconfirmedWorkspaceState,
		);

		// Update the confirmed state.
		this.#confirmedWorkspaceState = newWorkspace ?? undefined;

		// Clear any unconfirmed state as we now have a new confirmed one.
		this.#unconfirmedWorkspaceState = undefined;

		// If workspace folders were added or removed, fire the `onDidChangeWorkspaceFolders` event.
		if (added.length > 0 || removed.length > 0) {
			this._logInfo(
				`Firing onDidChangeWorkspaceFolders: Added ${added.length} folder(s), Removed ${removed.length} folder(s).`,
			);

			this.#onDidChangeWorkspaceFoldersEmitter.fire(
				Object.freeze({
					// Ensure event payload is immutable.
					added: Object.freeze(added),

					removed: Object.freeze(removed),
				}),
			);
		}
	}

	/** {@inheritDoc VscodeExtHostWorkspaceShape.$onDidGrantWorkspaceTrust} */
	public $onDidGrantWorkspaceTrust(): void {
		this._logInfo(
			"RPC $onDidGrantWorkspaceTrust received from MainThread.",
		);

		if (!this.#isWorkspaceTrusted) {
			// If trust state actually changed.
			this.#isWorkspaceTrusted = true;

			this.#onDidGrantWorkspaceTrustEmitter.fire();

			this._logInfo(
				"Workspace trust granted. Fired onDidGrantWorkspaceTrust event.",
			);
		} else {
			this._logDebug(
				"Received $onDidGrantWorkspaceTrust, but workspace was already trusted. No event fired.",
			);
		}
	}

	// --- Helper to convert DTO to internal workspace representation and diff changes ---
	private _convertDtoToInternalWorkspace(
		// New workspace data DTO from MainThread
		dto: WorkspaceDataDtoForRpc | null,

		// Last confirmed workspace state
		previousConfirmed: CocoonInternalWorkspace | undefined,

		// Optimistically updated state (if any)
		previousUnconfirmed: CocoonInternalWorkspace | undefined,
	): {
		// The new internal workspace object, or null if no workspace
		workspace: CocoonInternalWorkspace | null;

		// Array of workspace folders that were added
		added: VscodeApiWorkspaceFolder[];

		// Array of workspace folders that were removed
		removed: VscodeApiWorkspaceFolder[];
	} {
		if (!dto) {
			// No workspace data means it's an empty workspace (e.g., empty VS Code window).
			const removedFolders = previousConfirmed?.workspaceFolders
				? [...previousConfirmed.workspaceFolders]
				: [];

			return { workspace: null, added: [], removed: removedFolders };
		}

		const {
			id,

			name,

			folders: folderDtos,

			configuration: configDto,

			transient,

			isUntitled,
		} = dto;

		const newApiFolders: VscodeApiWorkspaceFolder[] = [];

		// Determine the "old" state to diff against: prefer unconfirmed if it exists (from an optimistic update),

		// otherwise use the last confirmed state.
		const oldWorkspaceForDiff = previousUnconfirmed || previousConfirmed;

		if (Array.isArray(folderDtos)) {
			folderDtos.forEach((folderDataDto, index) => {
				// Revive folder URI DTO to a vscode.Uri (API type)
				const folderApiUri = this._reviveUriDtoToVscodeApiUri(
					folderDataDto.uri,
				);

				if (!folderApiUri) {
					this._logError(
						"Failed to revive workspace folder URI DTO to VscodeApiUri during DTO conversion. Skipping this folder.",

						"Received DTO:",

						folderDataDto.uri,
					);

					// Skip this folder if its URI is invalid.
					return;
				}

				// Try to reuse existing vscode.WorkspaceFolder API objects to maintain object identity if the URI matches.
				// This helps extensions that might hold references to WorkspaceFolder objects.
				const existingApiFolder =
					oldWorkspaceForDiff?.workspaceFolders.find((f) =>
						this.#extHostFileSystemInfo.extUri.isEqual(
							f.uri,

							folderApiUri,

							// Case-sensitive comparison via extUri
						),
					);

				if (existingApiFolder) {
					// If folder with same URI existed, update its properties in-place.
					// Mutable cast for update
					(existingApiFolder as any).name = folderDataDto.name;

					(existingApiFolder as any).index =
						// Update index
						folderDataDto.index ?? index;

					newApiFolders.push(existingApiFolder);
				} else {
					// New folder, create a new API object.
					newApiFolders.push({
						uri: folderApiUri,

						name: folderDataDto.name,

						// Use provided index or array index as fallback.
						index: folderDataDto.index ?? index,
					});
				}
			});
		}

		// Ensure folders are sorted by index for consistency.
		newApiFolders.sort((a, b) => a.index - b.index);

		// Revive the workspace configuration file URI DTO (if present) to an internal VSCodeInternalURI.
		const internalConfigUri = configDto
			? this._reviveUriDtoToInternalVSCodeUri(configDto)
			: null;

		const newInternalWorkspace = new CocoonInternalWorkspace(
			id,

			name,

			newApiFolders,

			!!transient,

			internalConfigUri,

			!!isUntitled,

			// Pass IExtHostFileSystemInfo for extUri usage
			this.#extHostFileSystemInfo,
		);

		// Calculate the delta (added/removed folders) compared to the old state.
		const { added, removed } = arrayDelta(
			oldWorkspaceForDiff ? oldWorkspaceForDiff.workspaceFolders : [],

			// This is already readonly VscodeApiWorkspaceFolder[]
			newInternalWorkspace.workspaceFolders,

			// Comparator function
			(a, b) => this._compareVscodeWorkspaceFoldersByUri(a, b),
		);

		return { workspace: newInternalWorkspace, added, removed };
	}

	/** Comparator for VscodeApiWorkspaceFolder objects based on their URI, using extUri for correct case handling. */
	private _compareVscodeWorkspaceFoldersByUri(
		a: VscodeApiWorkspaceFolder,

		b: VscodeApiWorkspaceFolder,
	): number {
		return this.#extHostFileSystemInfo.extUri.isEqual(a.uri, b.uri)
			? // URIs are equal according to extUri rules
				0
			: // Fallback to string comparison if not equal
				compare(a.uri.toString(), b.uri.toString());
	}

	// --- URI Conversion Helpers (DTO <-> API Uri <-> Internal Uri) ---
	private _reviveUriDtoToVscodeApiUri(
		uriDto: UriComponentsForRpc | null | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;

		try {
			const internalUri = VSCodeInternalURI.revive(
				uriDto as VSCodeInternalUriComponents,
			);

			// Convert internal VSCodeInternalURI to public VscodeApiUri
			return VscodeApiUri.from(internalUri);
		} catch (e: any) {
			this._logError(
				"Failed to revive URI DTO to VscodeApiUri:",

				"DTO:",

				uriDto,

				"Error:",

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

				"DTO:",

				uriDto,

				"Error:",

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
				"Cannot convert non-VscodeApiUri to DTO for RPC. Input type invalid.",

				"Received:",

				uri,
			);

			return undefined;
		}

		// Convert public VscodeApiUri to internal VSCodeInternalURI
		const internalUri = VSCodeInternalURI.from(uri);

		// Then marshal internal URI to DTO
		return this._internalUriToMarshalledDto(internalUri);
	}

	/** Converts an internal VSCodeInternalURI to a marshalled DTO suitable for RPC. */
	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): UriComponentsForRpc {
		// `_convertApiArgToInternal` from BaseCocoonShim should handle this correctly if URI is passed.
		// This explicit version ensures the DTO structure matches VSCodeInternalUriComponents with a $mid.
		return {
			// Or MarshalledId.Uri if full components are always needed by MainThread
			$mid: MarshalledId.UriSimple,

			scheme: uri.scheme,

			authority: uri.authority,

			path: uri.path,

			query: uri.query,

			fragment: uri.fragment,

			// Optional: external (string representation) and fsPath can be added if MainThread specifically needs them
			// and cannot derive them reliably from the basic components.
			// external: uri.toString(true),

			// fsPath: uri.scheme === Schemas.file ? uri.fsPath : undefined,
		};
	}

	/** Converts a vscode.GlobPattern (string or RelativePattern) to an RPC DTO. */
	private _convertGlobDtoForRpc(
		pattern: VscodeApiGlobPattern,
	): RpcRelativePattern | string | undefined {
		// Simple string glob
		if (typeof pattern === "string") return pattern;

		if (pattern instanceof VscodeApiRelativePattern) {
			const baseUriDto = this._vscodeApiUriToComponentsDto(
				pattern.baseUri,

				// Convert baseUri to DTO
			);

			if (!baseUriDto) {
				this._logWarn(
					`Failed to convert baseUri of RelativePattern to DTO. Pattern: ${pattern.patternString}, BaseUri: ${pattern.baseUri.toString()}. ` +
						`The relative pattern might not be correctly interpreted by MainThread.`,
				);

				// Proceed with pattern string only, or return undefined if base is critical.
				// For now, let's proceed with just the pattern if base URI conversion fails.
			}

			return {
				// The glob pattern string itself
				pattern: pattern.patternString,

				// `base` in RpcRelativePattern is often the string path of the base URI.
				// `baseUriMarker` is the full UriComponents DTO for more precise revival on MainThread.
				// Fallback to direct fsPath if DTO conversion failed but path is available
				base: baseUriDto?.fsPath ?? pattern.baseUri.fsPath,

				baseUriMarker: baseUriDto,

				// Ensure this structure matches RpcRelativePattern
			} as RpcRelativePattern;
		}

		this._logWarn(
			"Unsupported VscodeApiGlobPattern type encountered for DTO conversion. Expected string or RelativePattern instance.",

			"Pattern:",

			pattern,
		);

		return undefined;
	}

	// --- Public API Getters (for `vscode.workspace.*`) ---
	/** Gets the current internal workspace state, preferring unconfirmed (optimistic) if available. */
	private get _currentInternalWorkspace():
		| CocoonInternalWorkspace
		| undefined {
		return this.#unconfirmedWorkspaceState || this.#confirmedWorkspaceState;
	}

	/** {@inheritDoc vscode.workspace.workspaceFile} */
	get workspaceFile(): VscodeApiUri | undefined {
		const internalWs = this._currentInternalWorkspace;

		// No configuration URI means no .code-workspace file.
		if (!internalWs?.configurationUri) return undefined;

		// If it's an untitled workspace, VS Code's API behavior is to return an 'untitled:' schemed URI
		// that often points to where the temporary workspace config *would* be saved if it were a file.
		// The actual `internalWs.configurationUri` might be a `file:` URI to a temp location for untitled workspaces.
		if (
			internalWs.isUntitled &&
			internalWs.configurationUri.scheme === Schemas.file
		) {
			// Try to mimic VS Code's untitled workspace file URI generation if possible.
			// This often involves using the parent directory of the temporary workspace file path.
			// Example: if temp file is /tmp/workspace-XYZ/.vscode/settings.json, then path might be /tmp/workspace-XYZ
			// This logic can be complex and platform-dependent.
			// A simpler approach for the shim if `configurationUri` points to a temp file:
			// Get parent dir of the temp config
			const dirOfTempWorkspaceFile = dirname(internalWs.configurationUri);

			return VscodeApiUri.from({
				// Construct an 'untitled:' URI
				scheme: Schemas.untitled,

				// Path might be basename of temp dir or a placeholder
				path:
					basenameOrAuthority(dirOfTempWorkspaceFile) ||
					"UntitledWorkspace",
			});
		}

		// For titled workspaces, convert the internal VSCodeInternalURI of the .code-workspace file to a VscodeApiUri.
		return VscodeApiUri.from(internalWs.configurationUri);
	}

	/** {@inheritDoc vscode.workspace.name} */
	get name(): string | undefined {
		return this._currentInternalWorkspace?.name;
	}

	/** {@inheritDoc vscode.workspace.workspaceFolders} */
	get workspaceFolders(): readonly VscodeApiWorkspaceFolder[] | undefined {
		return this._currentInternalWorkspace?.workspaceFolders;
	}

	/** {@inheritDoc vscode.workspace.isTrusted} */
	get isTrusted(): boolean {
		return this.#isWorkspaceTrusted;
	}

	// --- Public API Methods (for `vscode.workspace.*`) ---

	/** {@inheritDoc vscode.workspace.getWorkspaceFolder} */
	public async getWorkspaceFolder(
		uri: VscodeApiUri,
	): Promise<VscodeApiWorkspaceFolder | undefined> {
		// Ensure workspace data is fully initialized from MainThread.
		await this.#initializedBarrier.wait();

		if (!(uri instanceof VscodeApiUri)) {
			this._logWarn(
				"getWorkspaceFolder called with an invalid URI type (expected vscode.Uri). Returning undefined.",

				"Received:",

				uri,
			);

			return undefined;
		}

		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	/** {@inheritDoc vscode.workspace.getConfiguration} */
	public async getConfiguration(
		section?: string,

		scope?: ConfigurationScope | VscodeApiUri,
	): Promise<WorkspaceConfiguration> {
		this._logDebug(
			`API getConfiguration called (Section: '${section ?? "(root)"}', Scope: ${scope ? JSON.stringify(scope) : "none"}) -> delegating to IExtHostConfiguration via InstantiationService.`,
		);

		// Use the injected IInstantiationService to get the IExtHostConfiguration service instance.
		const configService = this.#instantiationService.get(
			IExtHostConfiguration,
		);

		return configService.getConfiguration(section, scope);
	}

	/** {@inheritDoc vscode.workspace.findFiles} */
	public async findFiles(
		include: VscodeApiGlobPattern,

		// Can be string, RelativePattern, or null
		exclude?: VscodeApiGlobPattern | null,

		maxResults?: number | null,

		token?: CancellationToken,
	): Promise<VscodeApiUri[]> {
		// Ensure workspace is initialized.
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadWorkspaceProxy) {
			this._logError(
				"Cannot findFiles: MainThreadWorkspace RPC proxy is unavailable. Returning empty array.",
			);

			return [];
		}

		this._logDebug(
			`API findFiles: Include='${String(include)}', Exclude='${String(exclude ?? "null")}', MaxResults=${maxResults ?? "unlimited"}`,
		);

		if (token?.isCancellationRequested) {
			this._logDebug(
				"findFiles operation cancelled by token before RPC call.",
			);

			return [];
		}

		try {
			const includeDto = this._convertGlobDtoForRpc(include);

			const excludeDto = exclude
				? this._convertGlobDtoForRpc(exclude)
				: null;

			// Default search options, similar to VS Code's typical behavior.
			const rpcOptions = {
				// Send undefined if null, as protocol might expect number or undefined
				maxResults: maxResults ?? undefined,

				// Typically true by default
				useIgnoreFiles: true,

				// Typically true by default
				followSymlinks: true,

				// TODO: Add other options if supported by MainThreadWorkspaceProxyShim.$findFiles
			};

			if (!includeDto) {
				this._logWarn(
					"findFiles: Invalid 'include' pattern provided. Cannot proceed with search. Returning empty array.",
				);

				return [];
			}

			const resultsDtoArray =
				await this.#mainThreadWorkspaceProxy.$findFiles(
					// Cast after check
					includeDto as string | RpcRelativePattern,

					// Cast after check
					excludeDto as string | RpcRelativePattern | null,

					rpcOptions,
				);

			if (token?.isCancellationRequested) {
				// Check again after await
				this._logDebug(
					"findFiles operation cancelled by token after RPC call completion.",
				);

				return [];
			}

			return Array.isArray(resultsDtoArray)
				? resultsDtoArray
						// Revive URI DTOs to VscodeApiUri
						.map((dto) => this._reviveUriDtoToVscodeApiUri(dto))
						// Filter out any undefined results from failed revival
						.filter((uri): uri is VscodeApiUri => !!uri)
				: // Return empty array if result is not an array.
					[];
		} catch (e: any) {
			if (isCancellationError(e)) {
				this._logDebug(
					"findFiles operation cancelled by token during RPC execution.",

					e,
				);

				return [];
			}

			this._logError(
				"workspace.findFiles RPC call failed:",

				refineErrorForShim(e, this._logService, "findFiles RPC"),
			);

			// Return empty array on error.
			return [];
		}
	}

	/** {@inheritDoc vscode.workspace.requestWorkspaceTrust} */
	public async requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined> {
		// Ensure workspace context is available.
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadWorkspaceProxy) {
			this._logError(
				"Cannot requestWorkspaceTrust: MainThreadWorkspace RPC proxy is unavailable. Trust cannot be requested.",
			);

			// API contract suggests undefined if trust cannot be determined/requested.
			return undefined;
		}

		this._logInfo(
			"API requestWorkspaceTrust called with options:",

			options,
		);

		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	/** {@inheritDoc vscode.workspace.updateWorkspaceFolders} (Stubbed) */
	public updateWorkspaceFolders(
		// Extension attempting the change (for permission checks on MainThread)
		_extension: IExtensionDescription,

		// Start index in workspaceFolders array to modify
		_start: number | undefined,

		// Number of folders to delete from start index
		_deleteCount: number | null | undefined,

		..._workspaceFoldersToAdd: ReadonlyArray<{
			uri: VscodeApiUri;

			name?: string;

			// Folders to add
		}>
	): boolean {
		// Returns true if the update was accepted (MainThread will confirm asynchronously)
		this._logError(
			"API Not Implemented: vscode.workspace.updateWorkspaceFolders. " +
				"This is a complex and restricted API, primarily for internal use or trusted extensions, and is not supported in Cocoon MVP. " +
				"Operation will not be performed. Returning false.",
		);

		// A full implementation would involve:
		// 1. Validating inputs (e.g., ensuring `_start` and `_deleteCount` are valid).
		// 2. Creating an optimistic `_unconfirmedWorkspaceState` by applying the changes locally.
		// 3. Firing `_onDidChangeWorkspaceFoldersEmitter` with the optimistic change (added/removed folders).
		// 4. Making an RPC call like `this.#mainThreadWorkspaceProxy.$updateWorkspaceFolders(...)` with DTOs of folders to add/remove.
		// 5. `MainThreadWorkspace` would attempt the change (e.g., update the .code-workspace file) and then
		//    call back with `$acceptWorkspaceData` to confirm or reject the change, which would then update
		//    `#confirmedWorkspaceState`.
		// Indicate operation was not successful or not allowed in this shim.
		return false;
	}

	/** {@inheritDoc vscode.workspace.onDidChangeWorkspaceFolders} */
	get onDidChangeWorkspaceFolders(): VscodeEvent<VscodeWorkspaceFoldersChangeEvent> {
		return this.#onDidChangeWorkspaceFoldersEmitter.event;
	}

	/** {@inheritDoc vscode.workspace.onDidGrantWorkspaceTrust} */
	get onDidGrantWorkspaceTrust(): VscodeEvent<void> {
		return this.#onDidGrantWorkspaceTrustEmitter.event;
	}

	/** {@inheritDoc vscode.workspace.textDocuments} */
	get textDocuments(): readonly TextDocument[] {
		return this.#extHostDocuments.getTextDocuments();
	}

	/** {@inheritDoc vscode.workspace.openTextDocument} */
	public async openTextDocument(
		uriOrPathOrOptions?:
			| VscodeApiUri
			| string
			| { language?: string; content?: string },
	): Promise<TextDocument> {
		// Ensure ExtHost is ready for operations involving MainThread.
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadDocsProxy) {
			this._logError(
				"Cannot openTextDocument: MainThreadDocuments RPC proxy is unavailable. Document cannot be opened or created.",
			);

			throw new Error(
				"MainThreadDocuments RPC proxy is unavailable. Cannot open or create document.",
			);
		}

		let targetUriDto: UriComponentsForRpc | undefined;

		let isUntitledCreation = false;

		if (uriOrPathOrOptions instanceof VscodeApiUri) {
			// `vscode.Uri` instance provided.
			targetUriDto =
				this._vscodeApiUriToComponentsDto(uriOrPathOrOptions);
		} else if (typeof uriOrPathOrOptions === "string") {
			// Filesystem path string provided.
			targetUriDto = this._vscodeApiUriToComponentsDto(
				VscodeApiUri.file(uriOrPathOrOptions),
			);
		} else if (
			uriOrPathOrOptions &&
			typeof uriOrPathOrOptions === "object" &&
			(uriOrPathOrOptions.content !== undefined ||
				uriOrPathOrOptions.language !== undefined)
		) {
			// Options for creating a new untitled document.
			isUntitledCreation = true;

			const untitledOptions = {
				languageId: uriOrPathOrOptions.language,

				content: uriOrPathOrOptions.content,
			};

			this._logDebug(
				`API openTextDocument: Requesting creation of new untitled document. ` +
					`Language='${untitledOptions.languageId ?? "default"}', HasContent=${untitledOptions.content !== undefined}`,
			);

			targetUriDto =
				await this.#mainThreadDocsProxy.$tryCreateDocument(
					untitledOptions,
				);

			// $tryCreateDocument returns the URI DTO of the newly created untitled file on MainThread.
		}

		if (!targetUriDto) {
			// If URI could not be determined or created.
			throw new Error(
				"Invalid URI or options provided to openTextDocument, or failed to create URI for untitled document.",
			);
		}

		this._logDebug(
			`API openTextDocument: Attempting to open/ensure document model exists on MainThread via RPC. URI Path/Scheme: '${targetUriDto.path || targetUriDto.scheme}'`,
		);

		// If it was an existing file URI (not an untitled creation), call $tryOpenDocument to ensure MainThread knows about it.
		// For untitled documents created via $tryCreateDocument, MainThread already created the model.
		if (!isUntitledCreation) {
			await this.#mainThreadDocsProxy.$tryOpenDocument(targetUriDto);
		}

		// After the RPC call ensures the document model exists on MainThread (which should trigger
		// `$acceptModelAdded` on `CocoonDocumentService`), retrieve the document from the local cache
		// via `CocoonDocumentService`.
		const documentVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(targetUriDto);

		if (!documentVscodeApiUri) {
			throw new Error(
				"Failed to revive URI DTO to VscodeApiUri after openTextDocument RPC call. Cannot retrieve document from local cache.",
			);
		}

		// Wait a very brief moment to allow for the asynchronous $acceptModelAdded to potentially complete.
		// This is a pragmatic workaround for potential race conditions if $tryOpenDocument resolves before $acceptModelAdded fully processes.
		// A more robust solution might involve a promise from CocoonDocumentService specific to the URI.
		// Yield to event loop
		await new Promise((resolve) => setTimeout(resolve, 0));

		const docData =
			// getDocumentData expects VscodeApiUri
			this.#extHostDocuments.getDocumentData(documentVscodeApiUri);

		if (!docData?.document) {
			this._logError(
				`Document with URI '${documentVscodeApiUri.toString()}' not found in local cache after open/create attempt. ` +
					`This may indicate a synchronization issue with MainThread or that $acceptModelAdded was not yet processed.`,
			);

			throw new Error(
				`Document ${documentVscodeApiUri.toString()} not found locally after open/create. Check CocoonDocumentService synchronization.`,
			);
		}

		return docData.document;
	}

	/** {@inheritDoc vscode.workspace.fs} */
	get fs(): FileSystem {
		return this.#fileSystemApiService;

		// Return the injected ShimFileSystemApi instance.
	}

	/** {@inheritDoc vscode.workspace.getRelativePath} */
	public getRelativePath = (
		pathOrUri: string | VscodeApiUri,

		// If true and path is in a folder, prepends folder name.
		includeWorkspaceFolder?: boolean,
	): string => {
		const resourceToCompare =
			pathOrUri instanceof VscodeApiUri
				? pathOrUri
				: VscodeApiUri.file(pathOrUri);

		// Use a synchronous version of getWorkspaceFolder for this utility method.
		const folder = this.getWorkspaceFolderSync(resourceToCompare);

		if (!folder) {
			// If the resource is not within any known workspace folder.
			// Return the original fsPath (for file URIs) or path (for other schemes) as is.
			// fsPath is generally safe.
			return resourceToCompare.fsPath;
		}

		// Determine if the workspace folder name should be prepended to the relative path.
		// VS Code's default is to include it if there are multiple workspace folders.
		if (typeof includeWorkspaceFolder === "undefined") {
			includeWorkspaceFolder =
				(this._currentInternalWorkspace?.foldersApiObjects.length ??
					0) > 1;
		}

		// Use extUri from IExtHostFileSystemInfo for correct case-insensitivity and path operations.
		// Convert API URI to internal
		const internalFolderUri = VSCodeInternalURI.from(folder.uri);

		// Convert API URI to internal
		const internalResourceUri = VSCodeInternalURI.from(resourceToCompare);

		let relativePathString =
			this.#extHostFileSystemInfo.extUri.relativePath(
				internalFolderUri,

				internalResourceUri,
			);

		if (includeWorkspaceFolder && relativePathString) {
			// Prepend folder name if requested and a relative path was actually computed.
			relativePathString = `${folder.name}${path.sep}${relativePathString}`;
		}

		// Fallback if relativePathString is empty (e.g., resource is the folder itself) or null.
		// In such cases, returning the original path string or fsPath is a reasonable default.
		return (
			relativePathString ||
			(pathOrUri instanceof VscodeApiUri ? pathOrUri.fsPath : pathOrUri)
		);
	};

	/** Synchronous variant of getWorkspaceFolder, uses current internal state. */
	private getWorkspaceFolderSync(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	/** {@inheritDoc vscode.workspace.dispose} */
	public override dispose(): void {
		// Handles _instanceDisposables from BaseCocoonShim
		super.dispose();

		this.#onDidChangeWorkspaceFoldersEmitter.dispose();

		this.#onDidGrantWorkspaceTrustEmitter.dispose();

		// Note: Document-related event emitters are owned and disposed by CocoonDocumentService.
		// Use Info for major lifecycle
		this._logInfo("Disposed.");
	}

	// --- Stubs for APIs not fully shimmed / out of scope for Cocoon MVP ---
	get onWillSaveTextDocument(): VscodeEvent<TextDocumentWillSaveEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onWillSaveTextDocument. Returning NOP event (VscodeEvent.None).",
		);

		return VscodeEvent.None;
	}

	get notebookDocuments(): readonly any[] /* vscode.NotebookDocument[] */ {
		this._logWarnOnce(
			"API STUB: vscode.workspace.notebookDocuments. Returning empty array.",
		);

		return [];
	}

	public async openNotebookDocument(
		_uriOrType?: VscodeApiUri | string,
	): Promise<any /*vscode.NotebookDocument*/> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.openNotebookDocument. This will throw an error.",
		);

		throw new Error(
			"workspace.openNotebookDocument is not implemented in Cocoon.",
		);
	}

	public registerTextDocumentContentProvider(
		_scheme: string,

		_provider: TextDocumentContentProvider,
	): IDisposable {
		this._logWarnOnce(
			"API STUB: vscode.workspace.registerTextDocumentContentProvider. Returning NOP disposable.",
		);

		return DisposableStore.None;
	}

	public registerTaskProvider(
		_type: string,

		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			"API STUB: vscode.workspace.registerTaskProvider. Returning NOP disposable.",
		);

		return DisposableStore.None;
	}

	public registerFileSystemProvider(
		_scheme: string,

		_provider: FileSystemProvider,

		_options?: { isCaseSensitive?: boolean; isReadonly?: boolean },
	): IDisposable {
		this._logWarnOnce(
			"API STUB: vscode.workspace.registerFileSystemProvider. Returning NOP disposable.",
		);

		return DisposableStore.None;
	}

	get onWillCreateFiles(): VscodeEvent<FileWillCreateEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onWillCreateFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidCreateFiles(): VscodeEvent<FileCreateEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onDidCreateFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onWillDeleteFiles(): VscodeEvent<FileWillDeleteEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onWillDeleteFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidDeleteFiles(): VscodeEvent<FileDeleteEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onDidDeleteFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onWillRenameFiles(): VscodeEvent<FileWillRenameEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onWillRenameFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}

	get onDidRenameFiles(): VscodeEvent<FileRenameEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onDidRenameFiles. Returning NOP event.",
		);

		return VscodeEvent.None;
	}
}
