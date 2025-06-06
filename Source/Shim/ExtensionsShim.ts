/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim 
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace. This service allows extensions to
 * query information about other installed and running extensions, get their exported APIs,
 * and listen for changes in the set of available extensions.
 *
 * Unlike many other shims that might simulate or proxy functionality to Mountain, this
 * shim primarily acts as an **adapter** to the *real* `IExtHostExtensionService`
 * (from VS Code's sources, instantiated and managed by Cocoon's `index.ts`). It
 * transforms the internal representations and methods of the real `IExtHostExtensionService`
 * into the public `vscode.extensions` API surface that extensions consume.
 *
 * Responsibilities:
 * - Implementing the `vscode.extensions` API interface (as defined by `IExtHostExtensionsShape`).
 * - Providing `getExtension(extensionId)`: Fetches an extension's internal description
 *   (`IExtensionDescription`) from the real `IExtHostExtensionService` and wraps it
 *   in a public `vscode.Extension<T>` API object.
 * - Providing `extensions.all`: Returns a list of all known extensions, obtained from the
 *   real service and wrapped as `vscode.Extension<any>` objects.
 * - Providing `extensions.onDidChange`: An event that fires when the list of known
 *   extensions changes. This event is triggered by subscribing to the
 *   `IExtHostExtensionService.onDidRegisterExtensions` event from the real service.
 * - Constructing `vscode.Extension<T>` API objects that correctly delegate properties
 *   (like `isActive`, `exports`, `extensionKind`) and the `activate()` method to the underlying
 *   real `IExtHostExtensionService`.
 *
 * Key Interactions:
 * - Registered with Dependency Injection (DI) in `Cocoon/index.ts`.
 * - An instance is made available to extensions as `vscode.extensions` via the main API
 *   factory provider in `Cocoon/index.ts`.
 * - Critically depends on an injected instance of the real `IExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging and management of disposables (like event subscriptions).
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// IExtensionDescription contains extensionLocation which is a URI.
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
// For ActivationKind when an extension calls another's activate() method.
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
// DI Key for the real ExtHostExtensionService. This is the service this shim adapts.
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// Import public vscode API types from Cocoon's bundled API definitions
import {
	ExtensionKind as VscodeExtensionKind, // The public API enum
	Uri as VscodeUri,
	type Extension as VscodeExtension, // The public API type vscode.Extension<T>
} from "vscode";

// Assuming path to the API type definitions

import { BaseCocoonShim, type ILogServiceForShim } from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.extensions` that this shim implements.
 * This aligns with the public `vscode.extensions` namespace and can be used for DI.
 */
export interface IExtHostExtensionsShape {
	readonly _serviceBrand: undefined; // Standard VS Code DI mechanism pattern
	getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;
	// VS Code's internal signature often includes an optional second boolean parameter
	getExtension<T>(
		extensionId: string,
		includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined;
	readonly all: readonly VscodeExtension<any>[];
	readonly onDidChange: VscodeEvent<void>;
}

/**
 * Cocoon's implementation of the `vscode.extensions` API.
 * It acts as an adapter, delegating to the real `IExtHostExtensionService`.
 */
export class ShimExtHostExtensions
	extends BaseCocoonShim
	implements IExtHostExtensionsShape
{
	public readonly _serviceBrand: undefined;
	private readonly _extHostExtensionService: IExtHostExtensionService; // The REAL IExtHostExtensionService

	private readonly _onDidChangeExtensionsEmitter =
		this._instanceDisposables.add(new VscodeEmitter<void>());
	public readonly onDidChange: VscodeEvent<void> =
		this._onDidChangeExtensionsEmitter.event;

	/**
	 * Creates an instance of ShimExtHostExtensions.
	 * @param logService The logging service.
	 * @param extHostExtensionService The real `IExtHostExtensionService` instance, injected via DI.
	 */
	constructor(
		logService: ILogServiceForShim | undefined,
		extHostExtensionService: IExtHostExtensionService, // Injected real service
	) {
		super(
			"ExtHostExtensions", // Service identifier for logging
			undefined /* rpcService not directly used by this shim for its primary functions */,
			logService,
		);
		this._extHostExtensionService = extHostExtensionService;
		this._logInfo(
			"Initialized. Adapting real IExtHostExtensionService for vscode.extensions API.",
		);

		// Listen to the real ExtHostExtensionService's onDidRegisterExtensions event.
		// This event fires when the set of known extensions changes (e.g., after a delta update).
		if (
			this._extHostExtensionService &&
			this._extHostExtensionService.onDidRegisterExtensions
		) {
			this._instanceDisposables.add(
				// Manage this subscription
				this._extHostExtensionService.onDidRegisterExtensions(() => {
					this._logDebug(
						"Received onDidRegisterExtensions from real IExtHostExtensionService. Firing vscode.extensions.onDidChange.",
					);
					this._onDidChangeExtensionsEmitter.fire();
				}),
			);
		} else {
			this._logError(
				"Critical dependency IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. " +
					"`vscode.extensions.onDidChange` will not function.",
			);
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
	private _createApiExtensionObject<T>(
		description: IExtensionDescription,
	): VscodeExtension<T> {
		const self = this; // Capture `this` for use in closures (getters, activate method).
		const extensionIdString = description.identifier.value;

		return Object.freeze({
			get id(): string {
				return extensionIdString;
			},
			get extensionUri(): VscodeUri {
				return VscodeUri.from(description.extensionLocation);
			},
			get extensionPath(): string {
				// Ensure fsPath is correct, especially if extensionLocation might not be a 'file' scheme.
				// For a Node-based host like Cocoon, we generally expect 'file' scheme for local extensions.
				return description.extensionLocation.scheme === "file"
					? description.extensionLocation.fsPath
					: description.extensionLocation.toString(); // Fallback for non-file schemes
			},
			get isActive(): boolean {
				if (!self._extHostExtensionService) {
					self._logError(
						`Cannot get isActive for '${extensionIdString}': Real IExtHostExtensionService unavailable. Returning false.`,
					);
					return false;
				}
				// Pass the ExtensionIdentifier object, not just the string ID
				return self._extHostExtensionService.isActivated(
					description.identifier,
				);
			},
			// The `packageJSON` for the public API is the `IExtensionDescription` itself in VS Code's ExtHost.
			get packageJSON(): any {
				return description;
			},
			get extensionKind(): VscodeExtensionKind {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (string[])
				// This reflects the primary kind suitable for a Node-based host like Cocoon.
				// The `extensionKind` in `IExtensionDescription` is an array like ['ui', 'workspace', 'web'].
				// The order or presence indicates its nature.
				if (description.extensionKind?.includes("web")) {
					return VscodeExtensionKind.Web; // Treat 'web' as the most specific kind if present
				}
				if (description.extensionKind?.includes("workspace")) {
					return VscodeExtensionKind.Workspace;
				}
				if (description.extensionKind?.includes("ui")) {
					return VscodeExtensionKind.UI;
				}
				// Default for extensions running in a Node-based host if no specific kind is determined
				// or if it's an older extension without `extensionKind`.
				return VscodeExtensionKind.Workspace;
			},
			get exports(): T {
				if (!self._extHostExtensionService) {
					self._logError(
						`Cannot get exports for '${extensionIdString}': Real IExtHostExtensionService unavailable. Returning undefined.`,
					);
					return undefined as T; // Or throw, but API usually returns undefined
				}
				// Pass the ExtensionIdentifier object
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},
			async activate(): Promise<T> {
				// Activation requested via `vscode.Extension<T>.activate()`.
				if (!self._extHostExtensionService) {
					const errorMsg = `Cannot activate '${extensionIdString}': Real IExtHostExtensionService unavailable.`;
					self._logError(errorMsg);
					throw new Error(errorMsg); // API spec implies activate can throw
				}
				// Check if already active to avoid redundant activation calls, though the service might handle this.
				if (
					!self._extHostExtensionService.isActivated(
						description.identifier,
					)
				) {
					// This should call the underlying ExtHostExtensionService to perform activation.
					await self._extHostExtensionService.activateById(
						description.identifier, // Pass ExtensionIdentifier
						{
							startup: false, // Not a startup activation
							extensionId: description.identifier, // The extension being activated
							activationEvent: `api`, // Indicates activation was triggered by an API call
							activationKind: ActivationKind.Api, // Explicitly an API activation
						},
					);
				}
				// Pass the ExtensionIdentifier object
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},
		}) as VscodeExtension<T>;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.getExtension}
	 */
	public getExtension<T>(
		extensionId: string,
		_includeNonListed_INTERNAL_USE_ONLY_?: boolean, // Internal VS Code detail, generally ignored.
	): VscodeExtension<T> | undefined {
		this._logDebug(
			`API getExtension requested for ID: '${extensionId}' (includeNonListed: ${!!_includeNonListed_INTERNAL_USE_ONLY_})`,
		);
		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot getExtension: Real IExtHostExtensionService unavailable. Returning undefined.",
			);
			return undefined;
		}
		// `getExtensionDescription` is synchronous and takes the string ID.
		const desc =
			this._extHostExtensionService.getExtensionDescription(extensionId);
		if (desc) {
			return this._createApiExtensionObject<T>(desc);
		}
		this._logDebug(
			`Extension with ID '${extensionId}' not found by real IExtHostExtensionService.`,
		);
		return undefined;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.all}
	 */
	get all(): readonly VscodeExtension<any>[] {
		this._logDebug("API vscode.extensions.all accessed.");
		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot get extensions.all: Real IExtHostExtensionService unavailable. Returning empty array.",
			);
			return Object.freeze([]);
		}
		// `getExtensionDescriptions` is synchronous.
		const allDescriptions =
			this._extHostExtensionService.getExtensionDescriptions();
		return Object.freeze(
			allDescriptions.map((desc) =>
				this._createApiExtensionObject<any>(desc),
			),
		);
	}

	/**
	 * Disposes of resources held by this shim instance, primarily the event emitter subscription.
	 */
	public override dispose(): void {
		super.dispose(); // Disposes _instanceDisposables, which includes the listener and the emitter.
		this._logInfo("Disposed.");
	}
}
