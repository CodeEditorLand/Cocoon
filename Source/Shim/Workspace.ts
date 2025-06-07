/*
 * File: Cocoon/Source/Shim/Workspace.ts
 * Responsibility: Implements the VS Code workspace API in the `Cocoon` sidecar, providing a shim for the `vscode.workspace` namespace to enable extensions to interact with the workspace structure, documents, and file system while proxying operations to the native `Mountain` backend.
 * Modified: 2025-06-07 00:57:34 UTC
 * Dependency: ./document-shim, ./fs-api-shim, node:path, vs/base/common/arrays, vs/base/common/async, vs/base/common/cancellation, vs/base/common/errors, vs/base/common/lifecycle, vs/base/common/marshalling, vs/base/common/network, vs/base/common/strings, vs/base/common/ternarySearchTree, vs/platform/extensions/common/extensions, vs/platform/instantiation/common/instantiation, vs/workbench/api/common/extHostConfiguration, vs/workbench/api/common/extHostFileSystemInfo
 * Export: ShimExtHostWorkspace
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Workspace Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostWorkspace` service interface, providing the core functionalities
 * for the `vscode.workspace` API namespace in the Cocoon extension host environment.
 * This service is central to how extensions perceive and interact with the workspace,
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
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import * as path from "node:path";
import { delta as arrayDelta } from "vs/base/common/arrays";
import { Barrier } from "vs/base/common/async";
import type { CancellationToken } from "vs/base/common/cancellation";
import { isCancellationError } from "vs/base/common/errors";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle";
import { MarshalledId } from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network";
import {
	basenameOrAuthority,
	dirname,
	type IExtUri,
} from "vs/base/common/resources";
import { compare } from "vs/base/common/strings";
import { TernarySearchTree } from "vs/base/common/ternarySearchTree";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions"; // Keep for updateWorkspaceFolders signature
import { type IInstantiationService } from "vs/platform/instantiation/common/instantiation";
import {
	ExtHostContext,
	MainContext,
	type IRelativePatternDto as RpcRelativePattern,
	type IWorkspaceData as RpcWorkspaceData,
	type IWorkspaceFolderData as RpcWorkspaceFolderData,
	type ExtHostWorkspaceShape as VscodeExtHostWorkspaceShape,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostConfiguration } from "vs/workbench/api/common/extHostConfiguration";
import type { IExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";
import type {
	ExtHostInitData,
	IExtHostInitDataService,
} from "vs/workbench/api/common/extHostInitDataService";
import {
	RelativePattern as VscodeApiRelativePattern,
	Uri as VscodeApiUri,
	type ConfigurationScope,
	type FileCreateEvent,
	type FileDeleteEvent,
	type FileRenameEvent,
	type FileSystem,
	type FileSystemProvider,
	type FileWillCreateEvent,
	type FileWillDeleteEvent,
	type FileWillRenameEvent,
	type TaskProvider,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	type TextDocumentWillSaveEvent,
	type GlobPattern as VscodeApiGlobPattern,
	type WorkspaceFolder as VscodeApiWorkspaceFolder,
	type WorkspaceFoldersChangeEvent as VscodeWorkspaceFoldersChangeEvent,
	type WorkspaceConfiguration,
	type WorkspaceTrustRequestOptions,
} from "vscode";

// Assumes this path resolves to Cocoon's shimmed 'vscode' API

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";
import type { CocoonDocumentService } from "./document-shim";
import type { ShimFileSystemApi } from "./fs-api-shim";

// --- Type Definitions for RPC and Internal State ---
type UriComponentsForRpc = VSCodeInternalUriComponents;

interface WorkspaceFolderDtoForRpc extends RpcWorkspaceFolderData {
	uri: UriComponentsForRpc;
}

interface WorkspaceDataDtoForRpc extends RpcWorkspaceData {
	folders: WorkspaceFolderDtoForRpc[];
	configuration?: UriComponentsForRpc | null;
}

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
	// $updateWorkspaceFolders?(extensionId: string, start: number, deleteCount: number | null, foldersToAddDto: { uri: UriComponentsForRpc, name?: string }[]): Promise<void>;
}

interface MainThreadDocumentsProxyShim {
	$tryOpenDocument(uri: UriComponentsForRpc): Promise<void>;
	$tryCreateDocument(options?: {
		languageId?: string;
		content?: string;
	}): Promise<UriComponentsForRpc>;
}

class CocoonInternalWorkspace {
	private readonly _structure: TernarySearchTree<
		VSCodeInternalURI,
		VscodeApiWorkspaceFolder
	>;
	public readonly foldersApiObjects: VscodeApiWorkspaceFolder[];
	public readonly extUri: IExtUri;

	constructor(
		public readonly id: string,
		public nameInternal: string,
		initialFoldersData: VscodeApiWorkspaceFolder[],
		public readonly transient: boolean,
		public configurationInternal: VSCodeInternalURI | null,
		public isUntitledInternal: boolean,
		extHostFileSystemInfo: IExtHostFileSystemInfo,
	) {
		this.extUri = extHostFileSystemInfo.extUri;
		this.foldersApiObjects = [];
		this._structure = TernarySearchTree.forUris<VscodeApiWorkspaceFolder>(
			(uri) => this.extUri.ignorePathCasing(uri as VSCodeInternalURI),
			() => true, // useCanonical: useKeyResourcePath (default forUris)
		);
		this.updateFolders(initialFoldersData);
	}

	public updateFolders(newApiFolders: VscodeApiWorkspaceFolder[]): void {
		(this.foldersApiObjects as VscodeApiWorkspaceFolder[]).length = 0;
		this._structure.clear();
		newApiFolders.forEach((folder) => {
			this.foldersApiObjects.push(folder);
			this._structure.set(VSCodeInternalURI.from(folder.uri), folder);
		});
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
		resolveParent_custom?: boolean,
	): VscodeApiWorkspaceFolder | undefined {
		const internalCandidateUri = VSCodeInternalURI.from(uri);
		let candidateForTreeLookup = internalCandidateUri;
		if (resolveParent_custom) {
			// Custom logic, not standard VS Code
			const directMatch = this._structure.get(candidateForTreeLookup);
			if (
				directMatch &&
				this.extUri.isEqual(
					VSCodeInternalURI.from(directMatch.uri),
					candidateForTreeLookup,
				)
			) {
				candidateForTreeLookup = this.extUri.dirname(
					candidateForTreeLookup,
				);
			}
		}
		return this._structure.findSubstr(candidateForTreeLookup);
	}

	public resolveWorkspaceFolder(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._structure.get(VSCodeInternalURI.from(uri));
	}
}

export class ShimExtHostWorkspace
	extends BaseCocoonShim
	implements VscodeExtHostWorkspaceShape
{
	public readonly _serviceBrand: undefined;
	readonly #initData: ExtHostInitData;
	#confirmedWorkspaceState: CocoonInternalWorkspace | undefined = undefined;
	#unconfirmedWorkspaceState: CocoonInternalWorkspace | undefined = undefined;
	#isWorkspaceTrusted = false;
	readonly #initializedBarrier = new Barrier();
	readonly #mainThreadWorkspaceProxy: MainThreadWorkspaceProxyShim | null =
		null;
	readonly #mainThreadDocsProxy: MainThreadDocumentsProxyShim | null = null;
	readonly #extHostDocuments: CocoonDocumentService;
	readonly #extHostFileSystemInfo: IExtHostFileSystemInfo;
	readonly #fileSystemApiService: FileSystem;
	readonly #instantiationService: IInstantiationService;
	readonly #onDidChangeWorkspaceFoldersEmitter =
		new VscodeEmitter<VscodeWorkspaceFoldersChangeEvent>();
	readonly #onDidGrantWorkspaceTrustEmitter = new VscodeEmitter<void>();

	// Document-related events are forwarded from CocoonDocumentService
	public readonly onDidOpenTextDocument: VscodeEvent<TextDocument>;
	public readonly onDidCloseTextDocument: VscodeEvent<TextDocument>;
	public readonly onDidChangeTextDocument: VscodeEvent<TextDocumentChangeEvent>;
	public readonly onDidSaveTextDocument: VscodeEvent<TextDocument>;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		initDataService: IExtHostInitDataService,
		extHostFileSystemInfo: IExtHostFileSystemInfo,
		logService: ILogServiceForShim | undefined,
		extHostDocuments: CocoonDocumentService,
		fileSystemApiService: FileSystem, // Changed from ShimFileSystemApi to FileSystem type
		instantiationService: IInstantiationService,
	) {
		super("ExtHostWorkspace", rpcService, logService);
		this.#initData = initDataService.value;
		this.#extHostDocuments = extHostDocuments;
		this.#extHostFileSystemInfo = extHostFileSystemInfo;
		this.#fileSystemApiService = fileSystemApiService;
		this.#instantiationService = instantiationService;
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
		if (!this.#mainThreadWorkspaceProxy)
			this._logError(
				"MainThreadWorkspace RPC proxy is unavailable. `findFiles` and `requestWorkspaceTrust` will fail.",
			);
		if (!this.#mainThreadDocsProxy)
			this._logError(
				"MainThreadDocuments RPC proxy is unavailable. `openTextDocument` will fail.",
			);

		this.#isWorkspaceTrusted =
			this.#initData.workspace?.trusted ??
			this.#initData.environment.isTrusted ??
			true;

		if (this.#initData.workspace) {
			const { workspace: preliminaryWorkspace } =
				this._convertDtoToInternalWorkspace(
					this.#initData.workspace as WorkspaceDataDtoForRpc, // Cast to DTO
					undefined,
					undefined,
				);
			this.#unconfirmedWorkspaceState = preliminaryWorkspace ?? undefined;
			this._logDebug(
				`Preliminary workspace state set from initData. Name='${this.#unconfirmedWorkspaceState?.name ?? "N/A"}', Folders=${this.#unconfirmedWorkspaceState?.workspaceFolders.length ?? 0}. Awaiting $initializeWorkspace confirmation.`,
			);
		}

		// Forward document lifecycle events from CocoonDocumentService
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

	public $initializeWorkspace(
		workspaceDto: WorkspaceDataDtoForRpc | null,
		trusted: boolean,
	): void {
		const folderCount = workspaceDto?.folders?.length ?? 0;
		this._logInfo(
			`RPC $initializeWorkspace received. Workspace Name='${workspaceDto?.name ?? "None"}', Folders=${folderCount}, IsTrusted=${trusted}`,
		);
		this.#isWorkspaceTrusted = trusted;
		this.$acceptWorkspaceData(workspaceDto);
		if (!this.#initializedBarrier.isOpen()) {
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

	public $acceptWorkspaceData(
		workspaceDto: WorkspaceDataDtoForRpc | null,
	): void {
		const folderCount = workspaceDto?.folders?.length ?? 0;
		this._logDebug(
			`RPC $acceptWorkspaceData received. Workspace Name='${workspaceDto?.name ?? "None"}', Folders=${folderCount}`,
		);
		const {
			workspace: newWorkspace,
			added,
			removed,
		} = this._convertDtoToInternalWorkspace(
			workspaceDto,
			this.#confirmedWorkspaceState,
			this.#unconfirmedWorkspaceState,
		);
		this.#confirmedWorkspaceState = newWorkspace ?? undefined;
		this.#unconfirmedWorkspaceState = undefined;
		if (added.length > 0 || removed.length > 0) {
			this._logInfo(
				`Firing onDidChangeWorkspaceFolders: Added ${added.length} folder(s), Removed ${removed.length} folder(s).`,
			);
			this.#onDidChangeWorkspaceFoldersEmitter.fire(
				Object.freeze({
					added: Object.freeze(added),
					removed: Object.freeze(removed),
				}),
			);
		}
	}

	public $onDidGrantWorkspaceTrust(): void {
		this._logInfo(
			"RPC $onDidGrantWorkspaceTrust received from MainThread.",
		);
		if (!this.#isWorkspaceTrusted) {
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
		const oldWorkspaceForDiff = previousUnconfirmed || previousConfirmed;

		if (Array.isArray(folderDtos)) {
			folderDtos.forEach((folderDataDto, index) => {
				const folderApiUri = this._reviveUriDtoToVscodeApiUri(
					folderDataDto.uri,
				);
				if (!folderApiUri) {
					this._logError(
						"Failed to revive workspace folder URI DTO to VscodeApiUri during DTO conversion. Skipping folder.",
						"DTO:",
						folderDataDto.uri,
					);
					return;
				}
				const existingApiFolder =
					oldWorkspaceForDiff?.workspaceFolders.find((f) =>
						this.#extHostFileSystemInfo.extUri.isEqual(
							f.uri,
							folderApiUri,
						),
					);
				if (existingApiFolder) {
					(existingApiFolder as any).name = folderDataDto.name;
					(existingApiFolder as any).index =
						folderDataDto.index ?? index;
					newApiFolders.push(existingApiFolder);
				} else {
					newApiFolders.push({
						uri: folderApiUri,
						name: folderDataDto.name,
						index: folderDataDto.index ?? index,
					});
				}
			});
		}
		newApiFolders.sort((a, b) => a.index - b.index);
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
			this.#extHostFileSystemInfo,
		);
		const { added, removed } = arrayDelta(
			oldWorkspaceForDiff ? oldWorkspaceForDiff.workspaceFolders : [],
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

	private _reviveUriDtoToVscodeApiUri(
		uriDto: UriComponentsForRpc | null | undefined,
	): VscodeApiUri | undefined {
		if (!uriDto) return undefined;
		try {
			const internalUri = VSCodeInternalURI.revive(
				uriDto as VSCodeInternalUriComponents,
			);
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
				"Cannot convert non-VscodeApiUri to DTO for RPC. Received:",
				uri,
			);
			return undefined;
		}
		const internalUri = VSCodeInternalURI.from(uri);
		return this._internalUriToMarshalledDto(internalUri);
	}

	private _internalUriToMarshalledDto(
		uri: VSCodeInternalURI,
	): UriComponentsForRpc {
		return {
			$mid: MarshalledId.UriSimple, // Or MarshalledId.Uri if full components needed
			scheme: uri.scheme,
			authority: uri.authority,
			path: uri.path,
			query: uri.query,
			fragment: uri.fragment,
			// external: uri.toString(true), fsPath: uri.scheme === Schemas.file ? uri.fsPath : undefined, // Optional
		};
	}

	private _convertGlobDtoForRpc(
		pattern: VscodeApiGlobPattern,
	): RpcRelativePattern | string | undefined {
		if (typeof pattern === "string") return pattern;
		if (pattern instanceof VscodeApiRelativePattern) {
			const baseUriDto = this._vscodeApiUriToComponentsDto(
				pattern.baseUri,
			);
			if (!baseUriDto) {
				this._logWarn(
					`Failed to convert baseUri of RelativePattern to DTO. Pattern: ${pattern.patternString}, BaseUri: ${pattern.baseUri.toString()}.`,
				);
			}
			return {
				pattern: pattern.patternString,
				base: baseUriDto?.fsPath ?? pattern.baseUri.fsPath, // Use fsPath if DTO conversion fails but it's a file URI
				baseUriMarker: baseUriDto,
			} as RpcRelativePattern;
		}
		this._logWarn(
			"Unsupported VscodeApiGlobPattern type encountered for DTO conversion. Expected string or RelativePattern instance.",
			"Pattern:",
			pattern,
		);
		return undefined;
	}

	private get _currentInternalWorkspace():
		| CocoonInternalWorkspace
		| undefined {
		return this.#unconfirmedWorkspaceState || this.#confirmedWorkspaceState;
	}

	get workspaceFile(): VscodeApiUri | undefined {
		const internalWs = this._currentInternalWorkspace;
		if (!internalWs?.configurationUri) return undefined;
		if (
			internalWs.isUntitled &&
			internalWs.configurationUri.scheme === Schemas.file
		) {
			const dirOfTempWorkspaceFile = dirname(internalWs.configurationUri);
			return VscodeApiUri.from({
				scheme: Schemas.untitled,
				path:
					basenameOrAuthority(dirOfTempWorkspaceFile) ||
					"UntitledWorkspace",
			});
		}
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

	public async getWorkspaceFolder(
		uri: VscodeApiUri,
	): Promise<VscodeApiWorkspaceFolder | undefined> {
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

	public async getConfiguration(
		section?: string,
		scope?: ConfigurationScope | VscodeApiUri,
	): Promise<WorkspaceConfiguration> {
		this._logDebug(
			`API getConfiguration called (Section: '${section ?? "(root)"}', Scope: ${scope ? JSON.stringify(scope) : "none"}) -> delegating to IExtHostConfiguration.`,
		);
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
			const rpcOptions = {
				maxResults: maxResults ?? undefined,
				useIgnoreFiles: true,
				followSymlinks: true,
			};
			if (!includeDto) {
				this._logWarn(
					"findFiles: Invalid 'include' pattern. Returning empty array.",
				);
				return [];
			}

			const resultsDtoArray =
				await this.#mainThreadWorkspaceProxy.$findFiles(
					includeDto as string | RpcRelativePattern,
					excludeDto as string | RpcRelativePattern | null,
					rpcOptions,
				);
			if (token?.isCancellationRequested) {
				this._logDebug(
					"findFiles operation cancelled by token after RPC call completion.",
				);
				return [];
			}
			return Array.isArray(resultsDtoArray)
				? resultsDtoArray
						.map((dto) => this._reviveUriDtoToVscodeApiUri(dto))
						.filter((uri): uri is VscodeApiUri => !!uri)
				: [];
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
			return [];
		}
	}

	public async requestWorkspaceTrust(
		options?: WorkspaceTrustRequestOptions,
	): Promise<boolean | undefined> {
		await this.#initializedBarrier.wait();
		if (!this.#mainThreadWorkspaceProxy) {
			this._logError(
				"Cannot requestWorkspaceTrust: MainThreadWorkspace RPC proxy is unavailable.",
			);
			return undefined;
		}
		this._logInfo(
			"API requestWorkspaceTrust called with options:",
			options,
		);
		return this.#mainThreadWorkspaceProxy.$requestWorkspaceTrust(options);
	}

	public updateWorkspaceFolders(
		_extension: IExtensionDescription, // For permission checks on MainThread
		_start: number | undefined,
		_deleteCount: number | null | undefined,
		..._workspaceFoldersToAdd: ReadonlyArray<{
			uri: VscodeApiUri;
			name?: string;
		}>
	): boolean {
		this._logError(
			"API Not Implemented: vscode.workspace.updateWorkspaceFolders. Not supported in Cocoon MVP. Returning false.",
		);
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
				"MainThreadDocuments RPC proxy is unavailable. Cannot open or create document.",
			);
		}
		let targetUriDto: UriComponentsForRpc | undefined;
		let isUntitledCreation = false;

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
			isUntitledCreation = true;
			const untitledOptions = {
				languageId: uriOrPathOrOptions.language,
				content: uriOrPathOrOptions.content,
			};
			this._logDebug(
				`API openTextDocument: Requesting creation of new untitled document. Language='${untitledOptions.languageId ?? "default"}', HasContent=${untitledOptions.content !== undefined}`,
			);
			targetUriDto =
				await this.#mainThreadDocsProxy.$tryCreateDocument(
					untitledOptions,
				);
		}

		if (!targetUriDto) {
			throw new Error(
				"Invalid URI or options for openTextDocument, or failed to create URI for untitled document.",
			);
		}
		this._logDebug(
			`API openTextDocument: Attempting to open/ensure document model on MainThread. URI Path/Scheme: '${targetUriDto.path || targetUriDto.scheme}'`,
		);

		if (!isUntitledCreation) {
			// Only call $tryOpenDocument if not creating new untitled (as $tryCreateDocument handles it)
			await this.#mainThreadDocsProxy.$tryOpenDocument(targetUriDto);
		}

		const documentVscodeApiUri =
			this._reviveUriDtoToVscodeApiUri(targetUriDto);
		if (!documentVscodeApiUri) {
			throw new Error(
				"Failed to revive URI DTO after openTextDocument RPC call.",
			);
		}

		await new Promise((resolve) => setTimeout(resolve, 0)); // Yield for potential $acceptModelAdded processing

		const docData =
			this.#extHostDocuments.getDocumentData(documentVscodeApiUri);
		if (!docData?.document) {
			this._logError(
				`Document with URI '${documentVscodeApiUri.toString()}' not found locally after open/create attempt. Synchronization issue?`,
			);
			throw new Error(
				`Document ${documentVscodeApiUri.toString()} not found locally after open/create.`,
			);
		}
		return docData.document;
	}

	get fs(): FileSystem {
		return this.#fileSystemApiService;
	}

	public getRelativePath = (
		pathOrUri: string | VscodeApiUri,
		includeWorkspaceFolder?: boolean,
	): string => {
		const resourceToCompare =
			pathOrUri instanceof VscodeApiUri
				? pathOrUri
				: VscodeApiUri.file(pathOrUri);
		const folder = this.getWorkspaceFolderSync(resourceToCompare);
		if (!folder) {
			return resourceToCompare.fsPath;
		}
		if (typeof includeWorkspaceFolder === "undefined") {
			includeWorkspaceFolder =
				(this._currentInternalWorkspace?.foldersApiObjects.length ??
					0) > 1;
		}
		const internalFolderUri = VSCodeInternalURI.from(folder.uri);
		const internalResourceUri = VSCodeInternalURI.from(resourceToCompare);
		let relativePathString =
			this.#extHostFileSystemInfo.extUri.relativePath(
				internalFolderUri,
				internalResourceUri,
			);
		if (includeWorkspaceFolder && relativePathString) {
			relativePathString = `${folder.name}${path.sep}${relativePathString}`;
		}
		return (
			relativePathString ||
			(pathOrUri instanceof VscodeApiUri ? pathOrUri.fsPath : pathOrUri)
		);
	};

	private getWorkspaceFolderSync(
		uri: VscodeApiUri,
	): VscodeApiWorkspaceFolder | undefined {
		return this._currentInternalWorkspace?.getWorkspaceFolder(uri);
	}

	public override dispose(): void {
		super.dispose();
		this.#onDidChangeWorkspaceFoldersEmitter.dispose();
		this.#onDidGrantWorkspaceTrustEmitter.dispose();
		this._logInfo("Disposed.");
	}

	// --- Stubs for APIs not fully shimmed / out of scope for Cocoon MVP ---
	get onWillSaveTextDocument(): VscodeEvent<TextDocumentWillSaveEvent> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.onWillSaveTextDocument. Returning NOP event.",
		);
		return VscodeEvent.None;
	}
	get notebookDocuments(): readonly any[] {
		this._logWarnOnce(
			"API STUB: vscode.workspace.notebookDocuments. Returning empty array.",
		);
		return [];
	}
	public async openNotebookDocument(
		_uriOrType?: VscodeApiUri | string,
	): Promise<any> {
		this._logWarnOnce(
			"API STUB: vscode.workspace.openNotebookDocument. Throwing error.",
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
			"API STUB: vscode.workspace.onDidDeleteFiles.Returning NOP event.",
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
