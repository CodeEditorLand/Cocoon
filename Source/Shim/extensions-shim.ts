/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim (extensions-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace. This service allows extensions to
 * query information about other installed and running extensions, get their exported APIs,
 *
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
 *   (like `isActive`, `exports`) and the `activate()` method to the underlying
 *   real `IExtHostExtensionService`.
 *
 * Key Interactions:
 * - Registered with Dependency Injection (DI) in `Cocoon/index.ts` as `IExtHostExtensions`
 *   (a VS Code internal service DI key, if this shim is registered under that key).
 * - An instance is made available to extensions as `vscode.extensions` via the main API
 *   factory provider in `Cocoon/index.ts`.
 * - Critically depends on an injected instance of the real `IExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging and management of disposables (like event subscriptions).
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For Extension.extensionUri scheme evaluation
import { Schemas } from "vs/base/common/network";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions";
// For ActivationKind when an extension calls another's activate() method via the API.
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
// DI Key for the real ExtHostExtensionService. This is the core service this shim adapts.
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// Import public vscode API types from Cocoon's bundled API definitions
import {
	// The public API enum
	ExtensionKind as VscodeExtensionKind,
	Uri as VscodeUri,
	// The public API type vscode.Extension<T>
	type Extension as VscodeExtension,
} from "vscode";

import { BaseCocoonShim, type ILogServiceForShim } from "./_baseShim";

// IDisposable is used for the event subscription.
// Disposable from lifecycle might be needed for NOP disposables if any were used, but not directly here.

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.extensions` that this shim implements.
 * This aligns with the public `vscode.extensions` namespace and can be used for DI.
 */
export interface IExtHostExtensionsShape {
	// Standard VS Code DI mechanism pattern
	readonly _serviceBrand: undefined;

	getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;

	/**
	 * Gets an extension by its full identifier (e.g., "publisher.name").
	 * @param extensionId The extension identifier string.
	 * @param _includeNonListed_INTERNAL_USE_ONLY_ An internal VS Code parameter, typically ignored by public API consumers.
	 */
	getExtension<T>(
		extensionId: string,

		_includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined;

	/** A readonly array of all known extensions. */
	readonly all: readonly VscodeExtension<any>[];

	/** An event that fires when the list of extensions changed (extensions are added or removed). */
	readonly onDidChange: VscodeEvent<void>;

	// TODO: Consider adding other methods like `getExtensionUri(extensionId, relativePath)`
	// if they are part of a more complete `IExtHostExtensions` service interface this shim aims to adapt,

	// though such methods are less common on the direct `vscode.extensions` public API.
}

/**
 * Cocoon's implementation of the `vscode.extensions` API.
 * It acts as an adapter, delegating to the real `IExtHostExtensionService` for
 * retrieving extension information and managing their lifecycle.
 */
export class ShimExtHostExtensions
	extends BaseCocoonShim
	implements IExtHostExtensionsShape
{
	public readonly _serviceBrand: undefined;

	// The REAL IExtHostExtensionService instance, injected via constructor.
	private readonly _extHostExtensionService: IExtHostExtensionService;

	private readonly _onDidChangeExtensionsEmitter = new VscodeEmitter<void>();

	public readonly onDidChange: VscodeEvent<void> =
		this._onDidChangeExtensionsEmitter.event;

	/**
	 * Creates an instance of ShimExtHostExtensions.
	 * @param logService The logging service instance.
	 * @param extHostExtensionService The real `IExtHostExtensionService` instance, injected via DI.
	 *                                This is the backbone for all functionality provided by this shim.
	 */
	constructor(
		logService: ILogServiceForShim | undefined,

		extHostExtensionService: IExtHostExtensionService,
	) {
		super(
			// Service identifier for logging
			"ExtHostExtensions",

			// rpcService is not directly used by this shim for its primary functions.
			undefined,

			logService,
		);

		this._extHostExtensionService = extHostExtensionService;

		this._logInfo(
			"Initialized. Adapting the real IExtHostExtensionService for the vscode.extensions API.",
		);

		// Listen to the real ExtHostExtensionService's onDidRegisterExtensions event.
		// This event signals that the set of known extensions has changed (e.g., after a delta update from MainThread).
		if (
			this._extHostExtensionService &&
			this._extHostExtensionService.onDidRegisterExtensions
		) {
			this._instanceDisposables.add(
				// Manage this subscription using _instanceDisposables from BaseCocoonShim
				this._extHostExtensionService.onDidRegisterExtensions(() => {
					this._logDebug(
						"Received onDidRegisterExtensions event from real IExtHostExtensionService. Firing vscode.extensions.onDidChange.",
					);

					this._onDidChangeExtensionsEmitter.fire();
				}),
			);
		} else {
			this._logError(
				"Critical dependency IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. " +
					"`vscode.extensions.onDidChange` will not function, and extensions relying on it may behave unexpectedly.",
			);
		}
	}

	/**
	 * This shim primarily adapts a local service (`IExtHostExtensionService`) and
	 * does not make RPC calls itself for its core functions.
	 * @returns `false` as RPC is not required by this shim.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Converts an internal `IExtensionDescription` (VS Code's comprehensive internal
	 * representation of an extension) into the public `vscode.Extension<T>` API object
	 * that extensions interact with.
	 * @param description The internal `IExtensionDescription` of the extension.
	 * @returns The `vscode.Extension<T>` API object, frozen to prevent modification by extensions.
	 */
	private _createApiExtensionObject<T>(
		description: IExtensionDescription,
	): VscodeExtension<T> {
		// Capture `this` (ShimExtHostExtensions instance) for use in closures (getters, activate method).
		const self = this;

		// Canonical "publisher.name" string.
		const extensionIdString = description.identifier.value;

		return Object.freeze({
			// Ensure the returned API object is immutable.
			get id(): string {
				return extensionIdString;
			},

			get extensionUri(): VscodeUri {
				return VscodeUri.from(description.extensionLocation);

				// Convert internal URI to API URI
			},

			get extensionPath(): string {
				return description.extensionLocation.fsPath;

				// Filesystem path
			},

			get isActive(): boolean {
				// Delegate to the real service to check activation status.
				return self._extHostExtensionService.isActivated(
					extensionIdString,
				);
			},

			get packageJSON(): any {
				// The IExtensionDescription itself contains all manifest data plus resolved paths and other metadata,

				// serving as the packageJSON for the public API in VS Code's ExtHost.
				return description;
			},

			get extensionKind(): VscodeExtensionKind {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (string[])
				// or fallback based on the extension's location.
				if (
					description.extensionKind &&
					description.extensionKind.length > 0
				) {
					// `description.extensionKind` is an array of `ExtensionHostKind` (string enum from VS Code internals, e.g., 'ui', 'workspace', 'web').
					// Mapping: 'ui' or 'web' typically map to VscodeExtensionKind.UI.
					// 'workspace' maps to VscodeExtensionKind.Workspace.
					if (
						description.extensionKind.some(
							(kind) => kind === "ui" || kind === "web",
						)
					) {
						return VscodeExtensionKind.UI;
					}

					if (
						description.extensionKind.some(
							(kind) => kind === "workspace",
						)
					) {
						return VscodeExtensionKind.Workspace;
					}
				}

				// Fallback logic if `extensionKind` array is not definitive or not present.
				// For Cocoon (local Node.js host), most extensions are Workspace unless explicitly remote.
				return description.extensionLocation.scheme ===
					Schemas.vscodeRemote
					? // Extension runs in a remote workspace context
						VscodeExtensionKind.Workspace
					: // Default for Cocoon-like environment
						VscodeExtensionKind.Workspace;
			},

			get exports(): T {
				// Delegate to the real service to get the extension's exported API.
				return self._extHostExtensionService.getExtensionExports(
					extensionIdString,
				) as T;
			},

			async activate(): Promise<T> {
				// Activation requested via `vscode.Extension<T>.activate()`.
				// This should call the underlying ExtHostExtensionService to perform the activation if not already active.
				await self._extHostExtensionService.activateById(
					description.identifier,

					{
						// This is not a startup-triggered activation.
						startup: false,

						// The extension being programmatically activated.
						extensionId: description.identifier,

						// Standard reason string for API-triggered activation.
						activationEvent: `api`,

						// Explicitly an API-triggered activation.
						activationKind: ActivationKind.Api,
					},
				);

				// After successful activation (or if already active), return the exports.
				return self._extHostExtensionService.getExtensionExports(
					extensionIdString,
				) as T;
			},
		}) as VscodeExtension<T>;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.getExtension}
	 *
	 * Retrieves an extension by its identifier string (e.g., "publisher.name").
	 * @param extensionId The identifier of the extension to retrieve.
	 * @param _includeNonListed_INTERNAL_USE_ONLY_ An internal VS Code parameter, typically ignored.
	 * @returns The `vscode.Extension<T>` API object if the extension is found, otherwise `undefined`.
	 */
	public getExtension<T>(
		extensionId: string,

		_includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined {
		// The `_includeNonListed_INTERNAL_USE_ONLY_` parameter is an internal VS Code detail
		// related to extensions not meant to be listed in UI, usually ignored by public API consumers.
		this._logDebug(`API getExtension requested for ID: '${extensionId}'`);

		// Delegate to the real IExtHostExtensionService to find the extension description.
		// `getExtensionDescription` is a synchronous call on the real service.
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
	 *
	 * A readonly array of all known extensions.
	 */
	get all(): readonly VscodeExtension<any>[] {
		this._logDebug(
			"API vscode.extensions.all accessed. Retrieving all extensions from real IExtHostExtensionService.",
		);

		// Get all known extension descriptions from the real service. This is a synchronous call.
		const allDescriptions =
			this._extHostExtensionService.getExtensionDescriptions();

		// Convert each description to the public API `vscode.Extension` object and freeze the array.
		return Object.freeze(
			allDescriptions.map((desc) =>
				this._createApiExtensionObject<any>(desc),
			),
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * This primarily involves disposing of the event emitter for `onDidChange` and
	 * any subscriptions managed by `_instanceDisposables` from `BaseCocoonShim`
	 * (which includes the listener for `onDidRegisterExtensions` from the real service).
	 */
	public override dispose(): void {
		// Disposes _instanceDisposables, which includes the listener for onDidRegisterExtensions.
		super.dispose();

		this._onDidChangeExtensionsEmitter.dispose();

		this._logInfo("Disposed.");
	}
}
