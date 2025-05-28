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
 *   (like `isActive`, `exports`, `extensionKind`) and the `activate()` method to the underlying
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
// import { Schemas } from "vs/base/common/network"; // Not strictly needed here, as IExtensionDescription.extensionLocation is URI
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator"; // For ActivationKind when an extension calls another's activate()
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService"; // DI Key for the real ExtHostExtensionService

// Import public vscode API types from Cocoon's bundled API definitions
import {
	ExtensionKind as VscodeExtensionKind, // The public API enum
	Uri as VscodeUri,
	type Extension as VscodeExtension, // The public API type vscode.Extension<T>
} from "vscode";

// Assuming resolved to API shim

import { BaseCocoonShim, type ILogServiceForShim } from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the service interface for `vscode.extensions` that this shim implements.
 * This aligns with the public `vscode.extensions` namespace and can be used for DI.
 */
export interface IExtHostExtensionsShape {
	readonly _serviceBrand: undefined; // Standard VS Code DI mechanism pattern
	getExtension<T>(extensionId: string): VscodeExtension<T> | undefined;
	getExtension<T>(
		extensionId: string,
		_includeNonListed_INTERNAL_USE_ONLY_?: boolean,
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

	constructor(
		logService: ILogServiceForShim | undefined,
		extHostExtensionService: IExtHostExtensionService, // Injected real service
	) {
		super(
			"ExtHostExtensions",
			undefined /* rpcService not directly used */,
			logService,
		);
		this._extHostExtensionService = extHostExtensionService;
		this._logInfo(
			"Initialized. Adapting real IExtHostExtensionService for vscode.extensions API.",
		);

		if (
			this._extHostExtensionService &&
			this._extHostExtensionService.onDidRegisterExtensions
		) {
			this._instanceDisposables.add(
				this._extHostExtensionService.onDidRegisterExtensions(() => {
					this._logDebug(
						"Received onDidRegisterExtensions from real service. Firing vscode.extensions.onDidChange.",
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

	protected override _requiresRpc(): boolean {
		return false;
	} // Adapts a local service

	private _createApiExtensionObject<T>(
		description: IExtensionDescription,
	): VscodeExtension<T> {
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
				if (!self._extHostExtensionService) {
					self._logError(
						`Cannot get isActive for '${extensionIdString}': Real IExtHostExtensionService unavailable.`,
					);
					return false;
				}
				return self._extHostExtensionService.isActivated(
					description.identifier,
				); // Use ExtensionIdentifier
			},
			get packageJSON(): any {
				return description;
			}, // IExtensionDescription is the packageJSON
			get extensionKind(): VscodeExtensionKind {
				// Determine VscodeExtensionKind based on IExtensionDescription.extensionKind (string[])
				// This reflects the primary kind suitable for a Node-based host like Cocoon.
				if (description.extensionKind?.includes("web")) {
					return VscodeExtensionKind.Web;
				}
				// If it declares 'workspace', that's its primary kind in a Node host.
				if (description.extensionKind?.includes("workspace")) {
					return VscodeExtensionKind.Workspace;
				}
				// If it's 'ui' but not 'workspace', then it's primarily UI-focused.
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
						`Cannot get exports for '${extensionIdString}': Real IExtHostExtensionService unavailable.`,
					);
					return undefined as T;
				}
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},
			async activate(): Promise<T> {
				if (!self._extHostExtensionService) {
					const errorMsg = `Cannot activate '${extensionIdString}': Real IExtHostExtensionService unavailable.`;
					self._logError(errorMsg);
					throw new Error(errorMsg);
				}
				if (
					!self._extHostExtensionService.isActivated(
						description.identifier,
					)
				) {
					await self._extHostExtensionService.activateById(
						description.identifier,
						{
							startup: false,
							extensionId: description.identifier,
							activationEvent: `api`,
							activationKind: ActivationKind.Api,
						},
					);
				}
				return self._extHostExtensionService.getExtensionExports(
					description.identifier,
				) as T;
			},
		}) as VscodeExtension<T>;
	}

	public getExtension<T>(
		extensionId: string,
		_includeNonListed_INTERNAL_USE_ONLY_?: boolean,
	): VscodeExtension<T> | undefined {
		this._logDebug(
			`API getExtension requested for ID: '${extensionId}' (includeNonListed: ${!!_includeNonListed_INTERNAL_USE_ONLY_})`,
		);
		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot getExtension: Real IExtHostExtensionService unavailable.",
			);
			return undefined;
		}
		// `getExtensionDescription` is synchronous.
		const desc =
			this._extHostExtensionService.getExtensionDescription(extensionId); // Use string ID
		if (desc) {
			return this._createApiExtensionObject<T>(desc);
		}
		this._logDebug(
			`Extension with ID '${extensionId}' not found by real IExtHostExtensionService.`,
		);
		return undefined;
	}

	get all(): readonly VscodeExtension<any>[] {
		this._logDebug("API vscode.extensions.all accessed.");
		if (!this._extHostExtensionService) {
			this._logError(
				"Cannot get extensions.all: Real IExtHostExtensionService unavailable.",
			);
			return Object.freeze([]);
		}
		const allDescriptions =
			this._extHostExtensionService.getExtensionDescriptions();
		return Object.freeze(
			allDescriptions.map((desc) =>
				this._createApiExtensionObject<any>(desc),
			),
		);
	}

	public override dispose(): void {
		super.dispose(); // Handles _onDidChangeExtensionsEmitter via _instanceDisposables
		this._logInfo("Disposed.");
	}
}
