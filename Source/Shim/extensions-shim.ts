/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim (shims/extensions-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace. This service allows extensions to
 * query information about other installed and running extensions, get their exported APIs,
 *
 * and listen for changes in the set of available extensions.
 *
 * Unlike many other shims that might simulate or proxy functionality, this shim heavily
 * relies on the *real* `IExtHostExtensionService` (from VS Code's sources, instantiated
 * in the Cocoon environment) as its backend. It acts as an adapter, transforming the
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
 * - Registered with Dependency Injection (e.g., in `Cocoon/index.ts`) as `IExtHostExtensions` (a VS Code internal service ID).
 * - An instance is made available to extensions as `vscode.extensions` via the API factory (e.g., in `index.ts`).
 * - Crucially depends on an injected instance of the real `IExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging and disposable management.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable } from "vs/base/common/lifecycle";
// For Extension.extensionUri scheme evaluation
import { Schemas } from "vs/base/common/network";
import { type IExtensionDescription } from "vs/platform/extensions/common/extensions";
// For ActivationKind when an extension calls another's activate() method.
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
// DI Key for the real ExtHostExtensionService. This is the service this shim adapts.
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
// Import vscode API types
import {
	// The public API enum
	ExtensionKind as VscodeExtensionKind,
	Uri as VscodeUri,
	// The public API type vscode.Extension<T>
	type Extension as VscodeExtension,
} from "vscode";

// Assuming path to the API type definitions

import { BaseCocoonShim, type ILogServiceForShim } from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.extensions` that this shim implements for DI.
 * Aligns with the public `vscode.extensions` namespace.
 */
export interface IExtHostExtensionsShape {
	// For DI registration (VS Code pattern)
	readonly _serviceBrand: undefined;

	getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;

	/**
	 * Gets an extension by its full identifier.
	 * @param extensionId Extension id.
	 * @param includeNonListed_INTERNAL_USE_ONLY_ Internal VS Code parameter, typically ignored by public API.
	 */
	getExtension<T>(
		extensionId: string,

		includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined;

	readonly all: readonly VscodeExtension<any>[];

	readonly onDidChange: VscodeEvent<void>;

	// TODO: Add other methods like `getExtensionUri(extensionId, relativePath)` if they are part of the
	// ExtHost service interface this shim might be adapting for (less common on public API).
}

/**
 * Cocoon's implementation of the `vscode.extensions` API.
 * It delegates to the real `IExtHostExtensionService` for extension information,
 *
 *
 *
 *
 * acting as an adapter to the public API shape.
 */
export class ShimExtHostExtensions
	extends BaseCocoonShim
	implements IExtHostExtensionsShape
{
	public readonly _serviceBrand: undefined;

	// The REAL service instance
	private readonly _extHostExtensionService: IExtHostExtensionService;

	private readonly _onDidChangeExtensionsEmitter = new VscodeEmitter<void>();

	public readonly onDidChange: VscodeEvent<void> =
		this._onDidChangeExtensionsEmitter.event;

	/**
	 * Creates an instance of ShimExtHostExtensions.
	 * @param logService The logging service for shim-specific messages.
	 * @param extHostExtensionService The real `IExtHostExtensionService` instance, injected via DI.
	 */
	constructor(
		logService: ILogServiceForShim | undefined,

		extHostExtensionService: IExtHostExtensionService,
	) {
		super(
			// Service identifier for logging
			"ExtHostExtensions",

			// rpcService is not directly used by this shim for its primary functions
			undefined,

			logService,
		);

		this._extHostExtensionService = extHostExtensionService;

		this._log(
			"Initialized. Adapting real IExtHostExtensionService for vscode.extensions API.",
		);

		// Listen to the real ExtHostExtensionService's onDidRegisterExtensions event.
		// This event fires when the set of known extensions changes (e.g., after a delta update).
		if (
			this._extHostExtensionService &&
			this._extHostExtensionService.onDidRegisterExtensions
		) {
			this._instanceDisposables.add(
				// Manage this subscription using disposables from BaseCocoonShim
				this._extHostExtensionService.onDidRegisterExtensions(() => {
					this._log(
						"Received onDidRegisterExtensions from real IExtHostExtensionService. Firing vscode.extensions.onDidChange.",
					);

					this._onDidChangeExtensionsEmitter.fire();
				}),
			);
		} else {
			this._logError(
				"Critical dependency IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. `vscode.extensions.onDidChange` will not function.",
			);
		}
	}

	/**
	 * Indicates whether this shim requires RPC communication.
	 * This shim primarily adapts a local service (`IExtHostExtensionService`) and
	 * does not make RPC calls itself for its core functions.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Converts an internal `IExtensionDescription` (VS Code's internal representation of an extension)
	 * into the public `vscode.Extension<T>` API object that extensions can interact with.
	 * @param description The internal extension description.
	 * @returns The `vscode.Extension<T>` object, frozen to prevent modification.
	 */
	private _createApiExtensionObject<T>(
		description: IExtensionDescription,
	): VscodeExtension<T> {
		// Capture `this` for use in closures (getters, activate method).
		const self = this;

		const extensionIdString = description.identifier.value;

		return Object.freeze({
			get id(): string {
				return extensionIdString;
			},

			get extensionUri(): VscodeUri {
				return VscodeUri.from(description.extensionLocation);
			},

			get extensionPath(): string {
				return description.extensionLocation.fsPath;
			},

			get isActive(): boolean {
				return self._extHostExtensionService.isActivated(
					description.identifier,
				);
			},

			// The `packageJSON` for the public API is the `IExtensionDescription` itself in VS Code's ExtHost,

			// as it contains all manifest data plus resolved paths and other metadata.
			get packageJSON(): any {
				return description;
			},

			get extensionKind(): VscodeExtensionKind {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (which is ExtensionHostKind[])
				// or fallback to location.
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
				// Typically, remote extensions are Workspace. Local extensions in a Node-based host
				// that are not UI specific can also be considered Workspace.
				return description.extensionLocation.scheme ===
					Schemas.vscodeRemote
					? // Extension runs in a remote workspace context
						VscodeExtensionKind.Workspace
					: // Default for Cocoon-like environment (local Node host implies workspace context for non-UI)
						VscodeExtensionKind.Workspace;
			},

			get exports(): T {
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},

			async activate(): Promise<T> {
				// Activation requested via `vscode.Extension<T>.activate()`.
				// This should call the underlying ExtHostExtensionService to perform activation.
				await self._extHostExtensionService.activateById(
					description.identifier,

					{
						// Not a startup activation
						startup: false,

						// The extension being activated
						extensionId: description.identifier,

						// Indicates activation was triggered by an API call (standard reason string)
						activationEvent: `api`,

						// Explicitly an API-triggered activation
						activationKind: ActivationKind.Api,
					},
				);

				// After successful activation, return the exports.
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},
		}) as VscodeExtension<T>;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.getExtension}
	 *
	 *
	 *
	 */
	public getExtension<T>(
		extensionId: string,

		_includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined {
		// The `_includeNonListed_INTERNAL_USE_ONLY_` parameter is an internal VS Code detail related to
		// extensions not meant to be listed in UI, usually ignored by public API consumers.
		// Verbose logging, uncomment if needed for debugging:
		// this._log(`getExtension requested for ID: '${extensionId}'`);

		// Delegate to the real IExtHostExtensionService to find the extension description.
		const desc = this._extHostExtensionService.getExtensionDescriptionById(
			extensionId,

			// Synchronous call
		);

		if (desc) {
			return this._createApiExtensionObject<T>(desc);
		}

		// Verbose logging, uncomment if needed for debugging:
		// this._logWarn(`Extension with ID '${extensionId}' not found by real IExtHostExtensionService.`);

		return undefined;
	}

	/**
	 * {@inheritDoc IExtHostExtensionsShape.all}
	 *
	 *
	 *
	 */
	get all(): readonly VscodeExtension<any>[] {
		// Verbose logging, uncomment if needed for debugging:
		// this._log("Getting all extensions from real IExtHostExtensionService.");

		// Get all known extension descriptions from the real service.
		const allDescriptions =
			// Synchronous call
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
	 * This primarily involves disposing of the event emitter and any subscriptions
	 * managed by `_instanceDisposables` from `BaseCocoonShim`.
	 */
	public override dispose(): void {
		// Disposes _instanceDisposables, which includes the listener for onDidRegisterExtensions
		super.dispose();

		this._onDidChangeExtensionsEmitter.dispose();

		this._log("Disposed.");
	}
}
