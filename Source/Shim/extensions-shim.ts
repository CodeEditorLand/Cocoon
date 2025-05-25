// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/102_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 2bedbbc9d408664649b18a1ab6ad7c3646c78f0d4c368f9232af5295cce20c98
// Extracted to File: Backup/TSFMSC/Code/extensions-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.993Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE extensions-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim (shims/extensions-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace, allowing extensions to query information
 * about installed extensions and listen for changes.
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { Schemas } from "vs/base/common/network"; // For Extension.extensionUri scheme
import { ExtensionIdentifier, type IExtensionDescription } from "vs/platform/extensions/common/extensions";
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService"; // DI Key for the real service
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator"; // For activate() reason

// Import vscode API types
import {
    Uri as VscodeUri,
    ExtensionKind as VscodeExtensionKind,
    type Extension as VscodeExtension, // The public API type
    // type ExtensionContext as VscodeExtensionContext, // Not directly used here
} from "vscode";

import { BaseCocoonShim, type ILogService } from "./_baseShim";
import { Disposable } from "vs/base/common/lifecycle"; // For NOP disposable if needed

// --- Type Definitions ---

// Interface for the service this shim provides (matches vscode.extensions)
export interface IExtHostExtensionsShape {
    readonly _serviceBrand: undefined; // For DI
    getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;
    // VS Code's internal signature often includes an optional second boolean parameter
    getExtension<T>(extensionId: string, includeNonListed_INTERNAL_USE_ONLY_?: boolean): VscodeExtension<T> | undefined;
    readonly all: readonly VscodeExtension<any>[];
    readonly onDidChange: VscodeEvent<void>;
    // TODO: Add other methods like `getExtensionUri` if they are part of IExtHostExtensions
}

export class ShimExtHostExtensions extends BaseCocoonShim implements IExtHostExtensionsShape {
    public readonly _serviceBrand: undefined;

    private readonly _extHostExtensionService: IExtHostExtensionService; // The REAL service instance

    // The onDidChange event for vscode.extensions.onDidChange
    private readonly _onDidChangeExtensions = new VscodeEmitter<void>();
    public readonly onDidChange: VscodeEvent<void> = this._onDidChangeExtensions.event;

    constructor(
        logService: ILogService | undefined,
        // Injected by DI from index.ts
        extHostExtensionService: IExtHostExtensionService,
    ) {
        super("ExtHostExtensions", undefined /* rpcService not directly used by this shim */, logService);
        this._extHostExtensionService = extHostExtensionService;
        this._log("Initialized.");

        // Listen to the real ExtHostExtensionService's onDidChange event
        // (or onDidRegisterExtensions if that's more appropriate for "list changed")
        // The real ExtHostExtensionService has `onDidRegisterExtensions`.
        if (this._extHostExtensionService && this._extHostExtensionService.onDidRegisterExtensions) {
            this._instanceDisposables.add( // Use instanceDisposables from BaseCocoonShim
                this._extHostExtensionService.onDidRegisterExtensions(() => {
                    this._log("Noticed onDidRegisterExtensions from real ExtHostExtensionService, firing onDidChange.");
                    this._onDidChangeExtensions.fire();
                })
            );
        } else {
            this._logWarn("Real IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. vscode.extensions.onDidChange will not fire.");
        }
    }

    private _createApiExtensionObject<T>(description: IExtensionDescription): VscodeExtension<T> {
        // This helper converts an IExtensionDescription (internal representation)
        // to a vscode.Extension<T> (public API object).
        // It uses methods from the real ExtHostExtensionService.
        const self = this; // For closures
        const extensionId = description.identifier.value;

        return Object.freeze({
            get id(): string { return extensionId; },
            get extensionUri(): VscodeUri { return VscodeUri.from(description.extensionLocation); },
            get extensionPath(): string { return description.extensionLocation.fsPath; },
            get isActive(): boolean { return self._extHostExtensionService.isActivated(extensionId); },
            get packageJSON(): any { return description; }, // The IExtensionDescription is effectively the packageJSON plus more
            get extensionKind(): VscodeExtensionKind {
                // Determine kind based on location or manifest (desc.extensionKind)
                if (description.extensionKind && description.extensionKind.length > 0) {
                    // Map from ExtensionHostKind[] (internal) to VscodeExtensionKind (API)
                    // This is a simplified mapping. Real VS Code has more complex logic involving _remoteAuthority.
                    if (description.extensionKind.includes('ui' as any)) return VscodeExtensionKind.UI;
                    if (description.extensionKind.includes('workspace' as any)) return VscodeExtensionKind.Workspace;
                    if (description.extensionKind.includes('web' as any)) return VscodeExtensionKind.UI; // Or a distinct Web kind if API has it
                }
                // Fallback based on location (less accurate)
                return description.extensionLocation.scheme === Schemas.vscodeRemote
                    ? VscodeExtensionKind.Workspace
                    : VscodeExtensionKind.Workspace; // Default to Workspace for local Node host
            },
            get exports(): T { return self._extHostExtensionService.getExtensionExports(extensionId); },
            async activate(): Promise<T> {
                // The activate call on Extension<T> should trigger activation if not already active
                // and then return the exports.
                await self._extHostExtensionService.activateById(description.identifier, {
                    startup: false, // API activation is not startup
                    extensionId: description.identifier, // Reason includes the ID of the extension requesting activation
                    activationEvent: `onDemandRequest:api`, // Activation via API call
                    activationKind: ActivationKind.Api // ActivationKind.Api
                });
                return self._extHostExtensionService.getExtensionExports(extensionId);
            }
        }) as VscodeExtension<T>;
    }

    public getExtension<T>(extensionId: string, _includeNonListed_INTERNAL_USE_ONLY_?: boolean): VscodeExtension<T> | undefined {
        // _includeNonListed_INTERNAL_USE_ONLY_ is from VS Code's internal signature, ignore for public API.
        // Can be verbose
        // this._log(`getExtension requested for ID: ${extensionId}`);
        const desc = this._extHostExtensionService.getExtensionDescription(extensionId); // Sync call
        if (desc) {
            return this._createApiExtensionObject<T>(desc);
        }
        // this._logWarn(`Extension with ID '${extensionId}' not found.`);
        return undefined;
    }

    get all(): readonly VscodeExtension<any>[] {
        // this._log("Getting all extensions");
        const allDescriptions = this._extHostExtensionService.getExtensionDescriptions(); // Sync call
        return Object.freeze(allDescriptions.map(desc => this._createApiExtensionObject<any>(desc)));
    }

    // determineExtensionUri(extensionId: string, relativePath: string): Uri; (VS Code internal, not typical API)
    // If needed for some internal VS Code component, it could be:
    // public determineExtensionUri(extensionId: string, relativePath: string): VscodeUri | undefined {
    //     const ext = this.getExtension(extensionId);
    //     if (ext) {
    //         return VscodeUri.joinPath(ext.extensionUri, relativePath);
    //     }
    //     return undefined;
    // }

    public dispose(): void {
        super.dispose(); // Calls this._instanceDisposables.dispose();
        this._onDidChangeExtensions.dispose();
    }
}
--- END OF FILE extensions-shim.ts ---
// --- APPENDED_CONTENT_BELOW ---
// Block SHA256: e3cd6bb0565a04da84287e485b01a3defb9ad08d54a9b9a706e6feb43a7149f2
// Timestamp: 2025-05-25T14:02:57.084Z
// Source Markdown File (Name): 160_MODEL.md
// Source Markdown File (Path): Backup/TSFMSC/Document/160_MODEL.md
// Source Block Index (Overall): 1
// Original Fence Info String: (empty)
// Appended to File: extensions-shim.ts (Full path when appended: Backup/TSFMSC/Code/extensions-shim.ts)
// ---
--- START OF FILE extensions-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim (shims/extensions-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace. This service allows extensions to
 * query information about other installed and running extensions, get their exported APIs,
 * and listen for changes in the set of available extensions.
 *
 * Unlike many other shims that might simulate or proxy functionality, this shim heavily
 * relies on the *real* `IExtHostExtensionService` (from VS Code's sources, instantiated
 * in `Cocoon/index.ts`) as its backend. It acts as an adapter, transforming the
 * internal representations and methods of `IExtHostExtensionService` into the public
 * `vscode.extensions` API surface.
 *
 * Responsibilities:
 * - Implementing the `vscode.extensions` API interface.
 * - Providing `getExtension(extensionId)`: Fetches an extension's description from the
 *   real `IExtHostExtensionService` and wraps it in a `vscode.Extension<T>` object.
 * - Providing `extensions.all`: Returns a list of all known extensions, wrapped as
 *   `vscode.Extension<any>` objects.
 * - Providing `extensions.onDidChange`: An event that fires when the list of known
 *   extensions changes (triggered by `IExtHostExtensionService.onDidRegisterExtensions`).
 * - Constructing `vscode.Extension<T>` API objects that correctly delegate properties
 *   (like `isActive`, `exports`) and the `activate()` method to the underlying
 *   `IExtHostExtensionService`.
 *
 * Key Interactions:
 * - Registered with Dependency Injection in `Cocoon/index.ts` as `IExtHostExtensions` (a VS Code internal service ID).
 * - An instance is made available to extensions as `vscode.extensions` via the API factory in `index.ts`.
 * - Crucially depends on an injected instance of the real `IExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging and disposable management.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { Emitter as VscodeEmitter, Event as VscodeEvent } from "vs/base/common/event";
import { Schemas } from "vs/base/common/network"; // For Extension.extensionUri scheme evaluation
import { ExtensionIdentifier, type IExtensionDescription } from "vs/platform/extensions/common/extensions";
// DI Key for the real ExtHostExtensionService. This is the service this shim adapts.
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// For ActivationKind when an extension calls another's activate() method.
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";

// Import vscode API types
import {
	Uri as VscodeUri,
	ExtensionKind as VscodeExtensionKind, // The public API enum
	type Extension as VscodeExtension,   // The public API type vscode.Extension<T>
} from "vscode"; // Assuming path to the API type definitions

import { BaseCocoonShim, type ILogServiceForShim } from "./_baseShim";
import { Disposable } from "vs/base/common/lifecycle"; // For NOP disposable if needed

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.extensions` that this shim implements.
 * Aligns with the public `vscode.extensions` namespace.
 */
export interface IExtHostExtensionsShape {
	readonly _serviceBrand: undefined; // For DI registration if needed (VS Code uses this pattern)
	getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;
	// VS Code's internal signature often includes an optional second boolean parameter
	getExtension<T>(extensionId: string, includeNonListed_INTERNAL_USE_ONLY_?: boolean): VscodeExtension<T> | undefined;
	readonly all: readonly VscodeExtension<any>[];
	readonly onDidChange: VscodeEvent<void>;
	// TODO: Add other methods like `getExtensionUri(extensionId, relativePath)` if they are part of the
	// ExtHost service interface this shim might be adapting for (less common on public API).
}

/**
 * Cocoon's implementation of the `vscode.extensions` API.
 * It delegates to the real `IExtHostExtensionService` for extension information.
 */
export class ShimExtHostExtensions extends BaseCocoonShim implements IExtHostExtensionsShape {
	public readonly _serviceBrand: undefined;

	private readonly _extHostExtensionService: IExtHostExtensionService; // The REAL service instance

	private readonly _onDidChangeExtensionsEmitter = new VscodeEmitter<void>();
	public readonly onDidChange: VscodeEvent<void> = this._onDidChangeExtensionsEmitter.event;

	/**
	 * Creates an instance of ShimExtHostExtensions.
	 * @param logService The logging service.
	 * @param extHostExtensionService The real `IExtHostExtensionService` instance, injected via DI.
	 */
	constructor(
		logService: ILogServiceForShim | undefined,
		extHostExtensionService: IExtHostExtensionService,
	) {
		super(
			"ExtHostExtensions", // Service identifier for logging
			undefined,             // rpcService is not directly used by this shim for its primary functions
			logService,
		);
		this._extHostExtensionService = extHostExtensionService;
		this._log("Initialized. Adapting real IExtHostExtensionService for vscode.extensions API.");

		// Listen to the real ExtHostExtensionService's onDidRegisterExtensions event.
		// This event fires when the set of known extensions changes (e.g., after a delta update).
		if (this._extHostExtensionService && this._extHostExtensionService.onDidRegisterExtensions) {
			this._instanceDisposables.add( // Manage this subscription
				this._extHostExtensionService.onDidRegisterExtensions(() => {
					this._log("Received onDidRegisterExtensions from real IExtHostExtensionService. Firing vscode.extensions.onDidChange.");
					this._onDidChangeExtensionsEmitter.fire();
				}),
			);
		} else {
			this._logError("Critical dependency IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. `vscode.extensions.onDidChange` will not function.");
		}
	}

    /**
     * This shim primarily adapts a local service and doesn't make RPC calls itself for its core functions.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	/**
	 * Converts an internal `IExtensionDescription` into the public `vscode.Extension<T>` API object.
	 * @param description The internal extension description.
	 * @returns The `vscode.Extension<T>` object.
	 */
	private _createApiExtensionObject<T>(description: IExtensionDescription): VscodeExtension<T> {
		const self = this; // Capture `this` for use in closures (getters, activate method).
		const extensionIdString = description.identifier.value;

		return Object.freeze({
			get id(): string { return extensionIdString; },
			get extensionUri(): VscodeUri { return VscodeUri.from(description.extensionLocation); },
			get extensionPath(): string { return description.extensionLocation.fsPath; },
			get isActive(): boolean { return self._extHostExtensionService.isActivated(extensionIdString); },
			// The `packageJSON` for the public API is the `IExtensionDescription` itself in VS Code's ExtHost.
			get packageJSON(): any { return description; },
			get extensionKind(): VscodeExtensionKind {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (which is ExtensionHostKind[])
				// or fallback to location.
				if (description.extensionKind && description.extensionKind.length > 0) {
					// `description.extensionKind` is an array of `ExtensionHostKind` (string enum from VS Code internals).
					// Mapping: 'ui' or 'web' typically map to VscodeExtensionKind.UI.
					// 'workspace' maps to VscodeExtensionKind.Workspace.
					if (description.extensionKind.some(kind => kind === 'ui' || kind === 'web')) {
						return VscodeExtensionKind.UI;
					}
					if (description.extensionKind.some(kind => kind === 'workspace')) {
						return VscodeExtensionKind.Workspace;
					}
				}
				// Fallback logic if `extensionKind` array is not definitive or not present.
				// Typically, remote extensions are Workspace, local non-UI might also be Workspace.
				return description.extensionLocation.scheme === Schemas.vscodeRemote
					? VscodeExtensionKind.Workspace
					: VscodeExtensionKind.Workspace; // Default for Cocoon (local Node host)
			},
			get exports(): T {
				return self._extHostExtensionService.getExtensionExports(extensionIdString) as T;
			},
			async activate(): Promise<T> {
				// Activation requested via `vscode.Extension<T>.activate()`.
				// This should call the underlying ExtHostExtensionService to perform activation.
				await self._extHostExtensionService.activateById(description.identifier, {
					startup: false, // Not a startup activation
					extensionId: description.identifier, // The extension being activated
					activationEvent: `api`, // Indicates activation was triggered by an API call
					activationKind: ActivationKind.Api,  // Explicitly an API activation
				});
				return self._extHostExtensionService.getExtensionExports(extensionIdString) as T;
			}
		}) as VscodeExtension<T>;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.getExtension}
	 */
	public getExtension<T>(extensionId: string, _includeNonListed_INTERNAL_USE_ONLY_?: boolean): VscodeExtension<T> | undefined {
		// The `_includeNonListed_INTERNAL_USE_ONLY_` parameter is an internal VS Code detail and usually ignored by public API consumers.
		// This log can be verbose if called frequently.
		// this._log(`getExtension requested for ID: '${extensionId}'`);
		const desc = this._extHostExtensionService.getExtensionDescription(extensionId); // Synchronous call to the real service
		if (desc) {
			return this._createApiExtensionObject<T>(desc);
		}
		// this._logWarn(`Extension with ID '${extensionId}' not found by real IExtHostExtensionService.`);
		return undefined;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.all}
	 */
	get all(): readonly VscodeExtension<any>[] {
		// This log can be verbose if `vscode.extensions.all` is accessed often.
		// this._log("Getting all extensions from real IExtHostExtensionService.");
		const allDescriptions = this._extHostExtensionService.getExtensionDescriptions(); // Synchronous call
		return Object.freeze(allDescriptions.map(desc => this._createApiExtensionObject<any>(desc)));
	}

	/**
	 * Disposes of resources held by this shim instance, primarily the event emitter subscription.
	 */
	public override dispose(): void {
		super.dispose(); // Disposes _instanceDisposables, which includes the listener
		this._onDidChangeExtensionsEmitter.dispose();
	}
}
--- END OF FILE extensions-shim.ts ---