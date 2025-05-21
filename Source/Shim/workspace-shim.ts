/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim (workspace-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements parts of the `vscode.workspace` API (via `IExtHostWorkspace`) for Cocoon.
 * This version is refined based on VS Code's `ExtHostWorkspace.ts` and `extHost.protocol.ts`.
 *
 * Responsibilities (Aligned more with VS Code's ExtHostWorkspace):
 * - Receiving initial workspace data and updates from Mountain via RPC (`$initializeWorkspace`, `$acceptWorkspaceData`).
 * - Managing an internal representation of the workspace (`CocoonInternalWorkspace`)
 *   using `URI` (vs/base/common/uri) and `ExtUri` for comparisons.
 * - Providing `vscode.workspace` getters (`workspaceFolders`, `name`, `workspaceFile`, `isTrusted`).
 * - Implementing `getWorkspaceFolder()` using efficient lookups.
 * - Proxying `findFiles()` and `requestWorkspaceTrust()` to Mountain using defined DTOs.
 * - Delegating document-related APIs and events to an injected `ShimDocumentService`.
 * - Handling `onDidChangeWorkspaceFolders` and `onDidGrantWorkspaceTrust` events.
 *
 * NOTE: This shim simplifies or omits several advanced features from VS Code's full
 * ExtHostWorkspace, such as: full search capabilities (text search), edit sessions,
 *
 * canonical URI providers, file encoding/decoding, and complex `updateWorkspaceFolders` logic.
 * The `save`, `saveAs`, `saveAll` methods are NOT part of `vscode.workspace` API surface here.
 *--------------------------------------------------------------------------------------------*/

import { delta as arrayDelta } from "vs/base/common/arrays";
import { Barrier } from "vs/base/common/async";
import type { CancellationToken } from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	DisposableStore,
	type IDisposable,
	toDisposable,
} from "vs/base/common/lifecycle";
import { Schemas } from "vs/base/common/network";
import {
	ExtUri,
	type IExtUri,
	basenameOrAuthority,
	dirname,
	relativePath as resourcesRelativePath,
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
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
// For service IDs
import type { createDecorator } from "vs/platform/instantiation/common/instantiation";
import {
	// RPC Contexts
	ExtHostContext,
	MainContext,
	// DTO from protocol
	type IRelativePatternDto as RpcRelativePattern,
	// DTO from protocol
	type IWorkspaceData as RpcWorkspaceData,
	// DTO from protocol
	type IWorkspaceFolderData as RpcWorkspaceFolderData,
	// RPC Shape for methods called by MainThread
	type ExtHostWorkspaceShape as VscodeExtHostWorkspaceShape,
} from "vs/workbench/api/common/extHost.protocol";
// Interface for dependency
import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

// vscode API types (from ../Shim/out/vscode or actual vscode namespace)
import {
	CanonicalUriProvider,
	type ConfigurationScope,
	EditSessionIdentityProvider,
	type FileSystem,
	type FileSystemProvider,
	FindTextInFilesOptions,
	PortAttributesProvider,
	QuickDiffProvider,
	type TaskProvider,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	// Stubs for less critical/complex APIs for now
	TextSearchQuery,
	TextSearchResult,
	TimelineProvider,
	TunnelProvider,
	UriHandler,
	type GlobPattern as VscodeApiGlobPattern,
	RelativePattern as VscodeApiRelativePattern,
	Uri as VscodeApiUri,
	type WorkspaceFolder as VscodeApiWorkspaceFolder,
	type WorkspaceFoldersChangeEvent as VscodeWorkspaceFoldersChangeEvent,
	type WorkspaceConfiguration,
	type WorkspaceTrustRequestOptions,
	// TODO: Add other types from vscode.d.ts as needed for the API surface
} from "../Shim/out/vscode";
// For IPC events like onWorkspaceFoldersChanged
import * as ipc from "../cocoon-ipc";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";
// For IExtHostConfiguration type
import type { ShimExtHostConfiguration } from "./configuration-shim";
// Cocoon specific shims
import type { ShimDocumentService } from "./document-shim";
// For workspace.fs
import { ShimFileSystemApi } from "./fs-api-shim";

// --- Type Definitions ---

// DTO for MainThreadWorkspace methods (ensure alignment with extHost.protocol.ts)
// TODO: These DTOs should ideally be directly from extHost.protocol.ts if fully compatible.
// Use VS Code internal UriComponents for RPC DTOs
type UriComponentsForRpc = VSCodeInternalUriComponents;

interface WorkspaceFolderDtoForRpc extends RpcWorkspaceFolderData {
	uri: UriComponentsForRpc;
}

interface WorkspaceDataDtoForRpc extends RpcWorkspaceData {
	folders: WorkspaceFolderDtoForRpc[];

	configuration?: UriComponentsForRpc | null;
}

// RPC Shape for MainThreadWorkspace (focused on Cocoon's needs)
interface MainThreadWorkspaceProviderShim {
	// Renamed to avoid conflict if VS Code type is imported
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

	// $updateWorkspaceFolders might be called by this shim if implemented fully
	// Less likely if using push model ($acceptWorkspaceData)
	// $getWorkspaceFolders(): Promise<WorkspaceFolderDtoForRpc[]>;
}

// RPC Shape for MainThreadDocuments (subset for openTextDocument)
interface MainThreadDocumentsProviderShim {
	// Or returns UriComponents for untitled
	$tryOpenDocument(uri: UriComponentsForRpc): Promise<void>;

	// Note: save methods are on TextDocument via ExtHostDocumentData, not here.
}

// Internal representation of a workspace, similar to VS Code's ExtHostWorkspaceImpl
class CocoonInternalWorkspace {
	private readonly _structure: TernarySearchTree<
		VSCodeInternalURI,
		VscodeApiWorkspaceFolder
	>;

	// Uses vscode.WorkspaceFolder for API consistency
	public readonly folders: VscodeApiWorkspaceFolder[];

	public readonly extUri: IExtUri;

	constructor(
		public readonly id: string,

		public nameInternal: string,

		// Expects folders already using VscodeApiUri
		initialFoldersData: VscodeApiWorkspaceFolder[],

		public readonly transient: boolean,

		public configurationInternal: VSCodeInternalURI | null,

		public isUntitledInternal: boolean,

		extHostFileSystemInfo: IExtHostFileSystemInfo,
	) {
		// Use injected extUri for comparisons
		this.extUri = extHostFileSystemInfo.extUri;

		this.folders = [];

		this._structure = TernarySearchTree.forUris<VscodeApiWorkspaceFolder>(
			(uri) => this.extUri.ignorePathCasing(uri),

			() => true,
		);

		this.updateFolders(initialFoldersData);
	}

	public updateFolders(newFolders: VscodeApiWorkspaceFolder[]): void {
		// Clear and repopulate
		(this.folders as VscodeApiWorkspaceFolder[]) = [];

		// Clear the tree before repopulating
		this._structure.clear();

		newFolders.forEach((folder, index) => {
			// Ensure folder.uri is VSCodeInternalURI for TernarySearchTree if it expects that
			// But for API consistency, we store VscodeApiWorkspaceFolder which has VscodeApiUri
			const folderForApi: VscodeApiWorkspaceFolder = {
				// This is VscodeApiUri
				uri: folder.uri,

				name: folder.name,

				index: folder.index ?? index,
			};

			this.folders.push(folderForApi);

			// TernarySearchTree needs VSCodeInternalURI as key if extUri methods expect that.
			// This might require conversion if VscodeApiUri and VSCodeInternalURI are different types.
			// For now, assume they are compatible enough or extUri can handle VscodeApiUri.
			this._structure.set(folderForApi.uri, folderForApi);
		});

		this.folders.sort((a, b) => a.index - b.index);
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
		return Object.freeze([...this.folders]);
	}

	public getWorkspaceFolder(
		uri: VscodeApiUri,

		resolveParent?: boolean,
	): VscodeApiWorkspaceFolder | undefined {
		let candidate = uri;

		if (resolveParent) {
			// Check if uri itself is a folder root
			const directMatch = this._structure.get(candidate);

			if (
				directMatch &&
				this.extUri.isEqual(directMatch.uri, candidate)
			) {
				// Get parent
				candidate = VscodeApiUri.joinPath(candidate, "..");
			} else {
				// If not a direct match, findSubstr will already find the parent container
			}
		}

		return this._structure.findSubstr(candidate);
	}

	public resolveWorkspaceFolder(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._structure.get(uri);
	}
}

// This service provides the `vscode.workspace` API
export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements VscodeExtHostWorkspaceShape
{
	// For IExtHostWorkspace if used with full DI
	public readonly _serviceBrand: undefined;

	// Raw init data
	#initData: ShimInitDataWorkspace;

	#confirmedWorkspaceState: CocoonInternalWorkspace | undefined;

	// For optimistic updates from updateWorkspaceFolders
	#unconfirmedWorkspaceState: CocoonInternalWorkspace | undefined;

	#isWorkspaceTrusted = false;

	readonly #initializedBarrier = new Barrier();

	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceProviderShim | null =
		null;

	readonly #mainThreadDocsProxy: MainThreadDocumentsProviderShim | null =
		null;

	readonly #extHostDocuments: ShimDocumentService;

	// Injected for URI comparisons
	readonly #extHostFileSystemInfo: IExtHostFileSystemInfo;

	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<VscodeWorkspaceFoldersChangeEvent>();

	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();

	readonly #onDidOpenTextDocumentEmitter = new VscodeEmitter<TextDocument>();

	readonly #onDidCloseTextDocumentEmitter = new VscodeEmitter<TextDocument>();

	readonly #onDidChangeTextDocumentEmitter =
		new VscodeEmitter<TextDocumentChangeEvent>();

	readonly #instanceDisposableStore = new DisposableStore();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		initDataService: {
			value: ExtHostInitData;
		} /* IExtHostInitDataService, but value for direct access */,

		extHostFileSystemInfo: IExtHostFileSystemInfo,

		logService: ILogService | undefined,

		extHostDocuments: ShimDocumentService,
	) {
		super("ExtHostWorkspace", rpcService, logService);

		// Assuming initDataService.value has the raw data
		this.#initData = initDataService.value as ShimInitDataWorkspace;

		this.#extHostDocuments = extHostDocuments;

		this.#extHostFileSystemInfo = extHostFileSystemInfo;

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadWorkspaceProxy = this._getProxy(
				MainContext.MainThreadWorkspace as ProxyIdentifier<MainThreadWorkspaceProviderShim>,
			);

			this.#mainThreadDocsProxy = this._getProxy(
				MainContext.MainThreadDocuments as ProxyIdentifier<MainThreadDocumentsProviderShim>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostWorkspace as ProxyIdentifier<VscodeExtHostWorkspaceShape>,

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
			this._logError(
				"MainThreadDocuments RPC proxy for openTextDocument unavailable!",
			);

		// Initial trust state from initData
		this.#isWorkspaceTrusted = !!this.#initData.environment?.isTrusted;

		// Note: Workspace data is now primarily set via $initializeWorkspace, not directly from constructor initData.
		// However, a very early preliminary state can be set if initData.workspace is available.
		if (this.#initData.workspace) {
			const { workspace } = this._convertDtoToInternalWorkspace(
				this.#initData.workspace,

				undefined,

				undefined,
			);

			// Start with unconfirmed
			this.#unconfirmedWorkspaceState = workspace ?? undefined;

			this._log(
				`Preliminary workspace from initData: ${this.#unconfirmedWorkspaceState?.name}`,
			);
		}

		// Subscribe to IPC for workspace folder changes (alternative to RPC push)
		ipc.onWorkspaceFoldersChanged(async () => {
			this._log(
				"IPC: onWorkspaceFoldersChanged received. MainThread should push $acceptWorkspaceData. Fetching is fallback.",
			);

			// In a push model, this IPC might just be a signal to the MainThread, which then calls $acceptWorkspaceData.
			// If it's a pull model from ExtHost, we'd call a $getWorkspaceData method here.
			// await this._rpcFetchAndUpdateWorkspaceData();
		});

		// Forward document events
		this.#instanceDisposableStore.add(
			this.#extHostDocuments.onDidAddDocument((doc) =>
				this.#onDidOpenTextDocumentEmitter.fire(doc),
			),
		);

		this.#instanceDisposableStore.add(
			this.#extHostDocuments.onDidRemoveDocument((doc) =>
				this.#onDidCloseTextDocumentEmitter.fire(doc),
			),
		);

		this.#instanceDisposableStore.add(
			this.#extHostDocuments.onDidChangeDocument((e) =>
				this.#onDidChangeTextDocumentEmitter.fire(e),
			),
		);

		this._log("Subscribed to document and IPC events.");
	}

	// --- RPC Methods Called by MainThread (VscodeExtHostWorkspaceShape) ---
	public $initializeWorkspace(
		workspaceDto: WorkspaceDataDtoForRpc | null,

		trusted: boolean,
	): void {
		this._log(
			`RPC $initializeWorkspace: Name='${workspaceDto?.name}', Trusted=${trusted}`,
		);

		this.#isWorkspaceTrusted = trusted;

		this.$acceptWorkspaceData(workspaceDto);

		// Signal that initial data is ready
		this.#initializedBarrier.open();
	}

	public $acceptWorkspaceData(
		workspaceDto: WorkspaceDataDtoForRpc | null,
	): void {
		this._log(
			`RPC $acceptWorkspaceData: Name='${workspaceDto?.name}', Folders=${workspaceDto?.folders?.length ?? 0}`,
		);

		const { workspace, added, removed } =
			this._convertDtoToInternalWorkspace(
				workspaceDto,

				this.#confirmedWorkspaceState,

				this.#unconfirmedWorkspaceState,
			);

		this.#confirmedWorkspaceState = workspace ?? undefined;

		// Clear unconfirmed state
		this.#unconfirmedWorkspaceState = undefined;

		if (added.length > 0 || removed.length > 0) {
			this._log(
				`Firing onDidChangeWorkspaceFolders: Added=${added.length}, Removed=${removed.length}`,
			);

			this.#onDidChangeWorkspaceFoldersEmitter.fire(
				Object.freeze({ added, removed }),
			);
		}
	}

	public $onDidGrantWorkspaceTrust(): void {
		this._log("RPC $onDidGrantWorkspaceTrust received.");

		if (!this.#isWorkspaceTrusted) {
			this.#isWorkspaceTrusted = true;

			this.#onDidGrantWorkspaceTrustEmitter.fire();
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

		const oldWorkspaceForDiff = previousUnconfirmed || previousConfirmed;

		if (Array.isArray(folderDtos)) {
			folderDtos.forEach((folderData, index) => {
				const folderApiUri = this._reviveUriDtoToVscodeApiUri(
					folderData.uri,

					// Convert DTO to vscode.Uri
				);

				if (!folderApiUri) {
					this._logError(
						"Failed to revive folder DTO to VscodeApiUri",

						folderData.uri,
					);

					return;
				}

				// Try to reuse existing vscode.WorkspaceFolder objects to maintain identity if URI matches
				const existingApiFolder =
					oldWorkspaceForDiff?.workspaceFolders.find((f) =>
						this.#extHostFileSystemInfo.extUri.isEqual(
							f.uri,

							folderApiUri,
						),
					);

				if (existingApiFolder) {
					// Update name
					(existingApiFolder as any).name = folderData.name;

					(existingApiFolder as any).index =
						// Update index
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
			// BaseCocoonShim._reviveApiArgument expects any DTO and returns the revived object.
			// We need to ensure it returns a VscodeApiUri compatible object or cast.
			// For URIs from RPC (UriComponents), they should be revived to VSCodeInternalURI first, then to VscodeApiUri.
			const internalUri = VSCodeInternalURI.revive(
				uriDto as VSCodeInternalUriComponents,

				// Revive to vs/base/common/uri.URI
			);

			// Convert vs/base/common/uri.URI to vscode.Uri
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
			// DTO from protocol usually maps to internal URI
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
		// Convert vscode.Uri to vs/base/common/uri.URI, then to components
		const internalUri = VSCodeInternalURI.from(uri);

		return this._internalUriToComponentsDto(internalUri);
	}

	private _internalUriToComponentsDto(
		uri: VSCodeInternalURI,
	): UriComponentsForRpc {
		// This should use the official marshalling if available, or manual conversion
		return {
			// MarshalledId.UriSimple (VS Code internal convention)
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

	private _convertGlobDtoForRpc(
		pattern: VscodeApiGlobPattern,
	): RpcRelativePattern | string | undefined {
		// Convert vscode.GlobPattern (string | vscode.RelativePattern) to DTO for RPC
		if (typeof pattern === "string") return pattern;

		if (pattern instanceof VscodeApiRelativePattern) {
			let baseComponents: UriComponentsForRpc | undefined;

			if (typeof pattern.baseUri === "string") {
				// VscodeApiRelativePattern uses baseUri which is string
				try {
					baseComponents = this._vscodeApiUriToComponentsDto(
						VscodeApiUri.parse(pattern.baseUri),
					);
				} catch (e) {
					this._logWarn(
						"Failed to parse string baseUri in VscodeApiRelativePattern:",

						pattern.baseUri,

						e,
					);
				}
			} else {
				// It's a VscodeApiUri
				baseComponents = this._vscodeApiUriToComponentsDto(
					pattern.baseUri,
				);
			}

			return {
				pattern: pattern.pattern,

				base:
					baseComponents?.external ??
					pattern.base?.toString() /* base is string in DTO */,

				baseUri: baseComponents,
			};
		}

		this._logWarn(
			"Unsupported glob pattern type for DTO conversion:",

			pattern,
		);

		return undefined;
	}

	// --- Public API Getters (vscode.workspace) ---
	private get _currentInternalWorkspace():
		| CocoonInternalWorkspace
		| undefined {
		// Prefer unconfirmed if it exists (optimistic update), otherwise confirmed.
		return this.#unconfirmedWorkspaceState || this.#confirmedWorkspaceState;
	}

	get workspaceFile(): VscodeApiUri | undefined {
		const internalWs = this._currentInternalWorkspace;

		if (!internalWs) return undefined;

		const internalConfigUri = internalWs.configurationUri;

		if (internalConfigUri) {
			if (internalWs.isUntitled) {
				// Based on VS Code's ExtHostWorkspace.workspaceFile logic for untitled
				const dir = dirname(internalConfigUri);

				return VscodeApiUri.from({
					scheme: Schemas.untitled,

					path: basenameOrAuthority(dir),
				});
			}

			return VscodeApiUri.from(internalConfigUri);
		}

		return undefined;
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

	// --- Public API Methods (vscode.workspace) ---
	public async getWorkspaceFolder(
		uri: VscodeApiUri,
	): Promise<VscodeApiWorkspaceFolder | undefined> {
		// VS Code API uses Promise
		// Ensure workspace is initialized
		await this.#initializedBarrier.wait();

		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	public async getConfiguration(
		section?: string,

		scope?: ConfigurationScope | VscodeApiUri,
	): Promise<WorkspaceConfiguration> {
		this._log(
			`getConfiguration (section: ${section}) -> delegating to IExtHostConfiguration`,
		);

		if (!global.cocoonInstantiationService)
			throw new Error(
				"DI service (global.cocoonInstantiationService) unavailable for getConfiguration",
			);

		// Late require for types
		const { IExtHostConfiguration } =
			require("vs/workbench/api/common/extHostConfiguration") as {
				IExtHostConfiguration: ReturnType<typeof createDecorator>;
			};

		const configService = global.cocoonInstantiationService.invokeFunction(
			(accessor) =>
				accessor.get<ShimExtHostConfiguration>(IExtHostConfiguration),
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

		this._log(
			`findFiles: include=${String(include)}, exclude=${String(exclude)}, max=${maxResults}`,
		);

		if (token?.isCancellationRequested) return [];

		try {
			const includeDto = this._convertGlobDtoForRpc(include);

			const excludeDto = exclude
				? this._convertGlobDtoForRpc(exclude)
				: null;

			// VS Code's findFiles options are more complex (FindFilesArgs).
			// This shim passes a simplified set.
			// TODO: Align options with MainThreadWorkspaceShapeShim.$findFiles if it takes more (e.g., useIgnoreFiles).
			const rpcOptions = {
				maxResults,

				useIgnoreFiles: true,

				followSymlinks: true /* common defaults */,
			};

			const resultsDto = await this.#mainThreadWorkspaceProxy.$findFiles(
				includeDto as any,

				excludeDto as any,

				rpcOptions,
			);

			if (token?.isCancellationRequested) return [];

			return Array.isArray(resultsDto)
				? (resultsDto
						.map((dto) => this._reviveUriDtoToVscodeApiUri(dto))
						.filter((u) => u !== undefined) as VscodeApiUri[])
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
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadWorkspaceProxy) {
			this._logWarn(
				"requestWorkspaceTrust: MainThreadWorkspace RPC proxy unavailable.",
			);

			return undefined;
		}

		this._log("requestWorkspaceTrust called");

		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	public updateWorkspaceFolders(
		extension: IExtensionDescription,

		start: number | undefined,

		deleteCount: number | null | undefined,

		...workspaceFoldersToAdd: ReadonlyArray<{
			uri: VscodeApiUri;

			name?: string;
		}>
	): boolean {
		this._logWarn(
			`updateWorkspaceFolders called by ext '${extension.identifier.value}'. This is a complex API. Current shim returns false (restricted).`,
		);

		// TODO: For a fuller implementation, this would involve:
		// 1. Validating inputs thoroughly (as in VS Code's ExtHostWorkspace.updateWorkspaceFolders).
		// 2. Creating an `_unconfirmedWorkspaceState` by applying the changes optimistically.
		// 3. Firing `_onDidChangeWorkspaceFoldersEmitter` with the optimistic change.
		// 4. Calling `this.#mainThreadWorkspaceProxy.$updateWorkspaceFolders(...)` with DTOs.
		// 5. `MainThreadWorkspace` would attempt the change and then call back with `$acceptWorkspaceData` to confirm or reject.
		// This shim currently simplifies by disallowing direct updates from extensions.
		return false;
	}

	get onDidChangeWorkspaceFolders(): VscodeEvent<VscodeWorkspaceFoldersChangeEvent> {
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

	public async openTextDocument(
		uriOrPathOrOptions?:
			| VscodeApiUri
			| string
			| { language?: string; content?: string },
	): Promise<TextDocument> {
		await this.#initializedBarrier.wait();

		if (!this.#mainThreadDocsProxy)
			throw new Error(
				"openTextDocument: MainThreadDocuments RPC proxy unavailable.",
			);

		let uriToOpenDto: UriComponentsForRpc | undefined;

		if (uriOrPathOrOptions instanceof VscodeApiUri) {
			uriToOpenDto =
				this._vscodeApiUriToComponentsDto(uriOrPathOrOptions);
		} else if (typeof uriOrPathOrOptions === "string") {
			uriToOpenDto = this._vscodeApiUriToComponentsDto(
				VscodeApiUri.file(uriOrPathOrOptions),
			);
		} else if (
			uriOrPathOrOptions &&
			typeof uriOrPathOrOptions === "object" &&
			(uriOrPathOrOptions.content !== undefined ||
				uriOrPathOrOptions.language !== undefined)
		) {
			// TODO: This requires a different RPC call like `$tryCreateDocument` on MainThreadDocuments.
			this._logError(
				"openTextDocument with content/language (for untitled) not fully implemented. Needs specific RPC for creation.",
			);

			throw new Error(
				"openTextDocument for untitled files not fully implemented in shim.",
			);

			// Example of what it might look like:
			// const untitledUriDto = await this.#mainThreadDocsProxy.$tryCreateDocument(uriOrPathOrOptions);

			// uriToOpenDto = untitledUriDto;
		}

		if (!uriToOpenDto)
			throw new Error("Invalid URI or options for openTextDocument.");

		this._log(
			`Attempting to open document via RPC: ${uriToOpenDto.path || uriToOpenDto.scheme}`,
		);

		await this.#mainThreadDocsProxy.$tryOpenDocument(uriToOpenDto);

		const documentUri = this._reviveUriDtoToVscodeApiUri(uriToOpenDto);

		if (!documentUri)
			throw new Error(
				"Failed to revive URI after openTextDocument RPC call.",
			);

		// getDocument expects vscode.Uri
		const docData = this.#extHostDocuments.getDocument(documentUri);

		if (!docData?.document)
			throw new Error(
				`Document ${documentUri.toString()} not found in local cache after open attempt.`,
			);

		return docData.document;
	}

	public get fs(): FileSystem {
		// This should return the ShimFileSystemApi instance, typically created by index.ts's ApiFactory
		// and injected or made available.
		this._logWarnOnce(
			"workspace.fs: Returning new instance of ShimFileSystemApi. Ideally injected or from factory context.",
		);

		if (!global.cocoonFileSystemApiService) {
			// Check if fs service was set globally by ApiFactory
			this._logError(
				"FileSystem API service (global.cocoonFileSystemApiService) not available for workspace.fs. Returning NOP.",
			);

			return {
				/* Basic NOP FileSystem methods */
			} as FileSystem;
		}

		return global.cocoonFileSystemApiService as FileSystem;
	}

	public getRelativePath = (
		pathOrUri: string | VscodeApiUri,

		includeWorkspaceFolder?: boolean,
	): string => {
		const resourceToCompare =
			pathOrUri instanceof VscodeApiUri
				? pathOrUri
				: VscodeApiUri.file(pathOrUri);

		// Use a sync variant if available for this utility
		const folder = this.getWorkspaceFolderSync(resourceToCompare);

		if (!folder) {
			return pathOrUri instanceof VscodeApiUri
				? pathOrUri.fsPath
				: pathOrUri;
		}

		if (typeof includeWorkspaceFolder === "undefined") {
			includeWorkspaceFolder =
				(this._currentInternalWorkspace?.folders.length ?? 0) > 1;
		}

		// This must use extUri from IExtHostFileSystemInfo for correct case-insensitivity.
		// And it needs to operate on the same URI types (e.g. VscodeApiUri or VSCodeInternalURI).
		// For simplicity, if extUri.relativePath needs internal URIs:
		const internalFolderUri = VSCodeInternalURI.from(folder.uri);

		const internalResourceUri = VSCodeInternalURI.from(resourceToCompare);

		let relative = this.#extHostFileSystemInfo.extUri.relativePath(
			internalFolderUri,

			internalResourceUri,
		);

		if (includeWorkspaceFolder) {
			// Use platform path separator
			relative = `${folder.name}${path.sep}${relative}`;
		}

		return (
			relative ||
			(pathOrUri instanceof VscodeApiUri ? pathOrUri.fsPath : pathOrUri)
		);
	};

	// Sync version for getRelativePath, as original ExtHostWorkspace often has this private sync variant.
	private getWorkspaceFolderSync(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		// This uses the current state without await, suitable for utility functions.
		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	public dispose(): void {
		// From BaseCocoonShim if it has one
		super.dispose();

		this.#instanceDisposableStore.dispose();

		this.#onDidChangeWorkspaceFoldersEmitter.dispose();

		this.#onDidGrantWorkspaceTrustEmitter.dispose();

		this.#onDidOpenTextDocumentEmitter.dispose();

		this.#onDidCloseTextDocumentEmitter.dispose();

		this.#onDidChangeTextDocumentEmitter.dispose();

		this._log("Disposed.");
	}

	// --- Stubs for APIs not fully shimmed / out of scope for Cocoon MVP ---
	// These should throw or return NOPs to match vscode.d.ts contracts.
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

	public async openNotebookDocument(
		_uriOrType?: VscodeApiUri | string,
	): Promise<any /*vscode.NotebookDocument*/> {
		this._logWarnOnce(
			"API not implemented: workspace.openNotebookDocument",
		);

		throw new Error("openNotebookDocument not implemented.");
	}

	public registerTextDocumentContentProvider(
		_scheme: string,

		_provider: TextDocumentContentProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerTextDocumentContentProvider",
		);

		return Disposable.None;
	}

	public registerTaskProvider(
		_type: string,

		_provider: TaskProvider,
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerTaskProvider",
		);

		return Disposable.None;
	}

	public registerFileSystemProvider(
		_scheme: string,

		_provider: FileSystemProvider,

		_options?: { isCaseSensitive?: boolean; isReadonly?: boolean },
	): IDisposable {
		this._logWarnOnce(
			"API not implemented: workspace.registerFileSystemProvider",
		);

		return Disposable.None;
	}

	// ... many more registration methods from ExtHostWorkspace that are complex ...
}

// Type for onDidChangeWorkspaceFolders event payload (from vscode.d.ts)
// Moved to be exported with the class
// export interface VscodeWorkspaceFoldersChangeEvent {

// 	readonly added: readonly VscodeApiWorkspaceFolder[];

// 	readonly removed: readonly VscodeApiWorkspaceFolder[];

// }

// Make cocoonInstantiationService globally available for shims that might need it (like getConfiguration)
// And a new one for the fs service if it's injected this way.
declare var cocoonInstantiationService:
	| {
			invokeFunction<T>(
				callback: (accessor: { get: <Svc>(id: any) => Svc }) => T,
			): T;
	  }
	| undefined;

// For workspace.fs
declare var cocoonFileSystemApiService: FileSystem | undefined;
