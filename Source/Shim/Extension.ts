/*
 * File: Cocoon/Source/Shim/Extension.ts
 * Responsibility: Implements the VS Code extensions API shim for the Cocoon sidecar, adapting the IExtHostExtensionService to provide extension management capabilities while bridging between VS Code's extension model and Land's architecture.
 * Modified: 2025-06-07 05:37:39 UTC
 * Dependency: ./_BaseShim, vs/platform/extensions/common/extensions, vs/workbench/api/common/extHostExtensionActivator, vs/workbench/api/common/extHostExtensionService
 * Export: IExtHostExtensionsShape, ShimExtHostExtensions
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Extensions API Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.extensions` API namespace. This service allows extensions to
 * query information about other installed extensions, get their exported APIs,
 * and listen for changes.
 *
 * This shim primarily acts as an **adapter** to the *real* `IExtHostExtensionService`
 * from VS Code's sources. It transforms the internal representations and methods of the
 * real service into the public `vscode.extensions` API surface.
 *
 * Responsibilities:
 * - Implementing the `vscode.extensions` API interface.
 * - Providing `GetExtension(ExtensionIdentifier)`: Fetches an extension's internal description
 *   and wraps it in a public `vscode.Extension<T>` API object.
 * - Providing `All`: Returns a list of all known extensions, wrapped as `vscode.Extension<any>` objects.
 * - Providing `OnDidChange`: An event that fires when the set of extensions changes.
 * - Constructing `vscode.Extension<T>` API objects that correctly delegate properties
 *   and the `Activate()` method to the underlying real `IExtHostExtensionService`.
 *
 * Key Interactions:
 * - Registered with Dependency Injection (DI) in `Cocoon/index.ts`.
 * - Critically depends on an injected instance of the real `IExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging and management of disposables.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator";
import { IExtHostExtensionService } from "vs/workbench/api/common/extHostExtensionService";
import {
	ExtensionKind as VscodeExtensionKind,
	Uri as VscodeUri,
	type Extension as VscodeExtension,
} from "vscode";

import { BaseCocoonShim, type ILogServiceForShim } from "./_BaseShim";

/**
 * Defines the service interface for `vscode.extensions` that this shim implements.
 */
export interface IExtHostExtensionsShape {
	readonly _serviceBrand: undefined;
	GetExtension<T>(
		ExtensionIdentifier: string,
	): VscodeExtension<T> | undefined;
	readonly All: readonly VscodeExtension<any>[];
	readonly OnDidChange: VscodeEvent<void>;
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
	private readonly _ExtHostExtensionService: IExtHostExtensionService;

	private readonly _OnDidChangeExtensionEmitter =
		this._InstanceDisposables.add(new VscodeEmitter<void>());
	public readonly OnDidChange: VscodeEvent<void> =
		this._OnDidChangeExtensionEmitter.event;

	constructor(
		LogService: ILogServiceForShim | undefined,
		ExtHostExtensionService: IExtHostExtensionService,
	) {
		super("ExtHostExtensions", undefined, LogService);
		this._ExtHostExtensionService = ExtHostExtensionService;
		this._LogInfo(
			"Initialized. Adapting real IExtHostExtensionService for vscode.extensions API.",
		);

		if (
			this._ExtHostExtensionService &&
			this._ExtHostExtensionService.onDidRegisterExtensions
		) {
			this._InstanceDisposables.add(
				this._ExtHostExtensionService.onDidRegisterExtensions(() => {
					this._LogDebug(
						"Received onDidRegisterExtensions from real service. Firing OnDidChange.",
					);
					this._OnDidChangeExtensionEmitter.fire();
				}),
			);
		} else {
			this._LogError(
				"Critical dependency IExtHostExtensionService or its onDidRegisterExtensions event is unavailable. OnDidChange will not function.",
			);
		}
	}

	protected override _RequireRpc(): boolean {
		return false;
	}

	private _CreateApiExtensionObject<T>(
		Description: IExtensionDescription,
	): VscodeExtension<T> {
		const Self = this;
		const ExtensionIdentifierString = Description.identifier.value;

		return Object.freeze({
			get id(): string {
				return ExtensionIdentifierString;
			},
			get extensionUri(): VscodeUri {
				return VscodeUri.from(Description.extensionLocation);
			},
			get extensionPath(): string {
				return Description.extensionLocation.scheme === "file"
					? Description.extensionLocation.fsPath
					: Description.extensionLocation.toString();
			},
			get isActive(): boolean {
				if (!Self._ExtHostExtensionService) {
					Self._LogError(
						`Cannot check IsActive for '${ExtensionIdentifierString}': Real service unavailable.`,
					);
					return false;
				}
				return Self._ExtHostExtensionService.isActivated(
					Description.identifier,
				);
			},
			get packageJSON(): any {
				return Description;
			},
			get extensionKind(): VscodeExtensionKind {
				if (Description.extensionKind?.includes("web"))
					return VscodeExtensionKind.Web;
				if (Description.extensionKind?.includes("workspace"))
					return VscodeExtensionKind.Workspace;
				if (Description.extensionKind?.includes("ui"))
					return VscodeExtensionKind.UI;
				return VscodeExtensionKind.Workspace; // Default
			},
			get exports(): T {
				if (!Self._ExtHostExtensionService) {
					Self._LogError(
						`Cannot get exports for '${ExtensionIdentifierString}': Real service unavailable.`,
					);
					return undefined as T;
				}
				return Self._ExtHostExtensionService.getExtensionExports(
					Description.identifier,
				) as T;
			},
			async Activate(): Promise<T> {
				if (!Self._ExtHostExtensionService) {
					const ErrorMessage = `Cannot activate '${ExtensionIdentifierString}': Real service unavailable.`;
					Self._LogError(ErrorMessage);
					throw new Error(ErrorMessage);
				}
				if (
					!Self._ExtHostExtensionService.isActivated(
						Description.identifier,
					)
				) {
					await Self._ExtHostExtensionService.activateById(
						Description.identifier,
						{
							startup: false,
							extensionId: Description.identifier,
							activationEvent: `api`,
							activationKind: ActivationKind.Api,
						},
					);
				}
				return Self._ExtHostExtensionService.getExtensionExports(
					Description.identifier,
				) as T;
			},
		}) as VscodeExtension<T>;
	}

	public GetExtension<T>(
		ExtensionIdentifier: string,
		IncludeNonListed?: boolean,
	): VscodeExtension<T> | undefined {
		this._LogDebug(
			`GetExtension requested for ID: '${ExtensionIdentifier}'`,
		);
		if (!this._ExtHostExtensionService) {
			this._LogError("Cannot GetExtension: Real service unavailable.");
			return undefined;
		}
		const Description =
			this._ExtHostExtensionService.getExtensionDescription(
				ExtensionIdentifier,
			);
		if (Description) {
			return this._CreateApiExtensionObject<T>(Description);
		}
		this._LogDebug(`Extension with ID '${ExtensionIdentifier}' not found.`);
		return undefined;
	}

	public get All(): readonly VscodeExtension<any>[] {
		this._LogDebug("Property All accessed.");
		if (!this._ExtHostExtensionService) {
			this._LogError("Cannot get All: Real service unavailable.");
			return Object.freeze([]);
		}
		const AllDescription =
			this._ExtHostExtensionService.getExtensionDescriptions();
		return Object.freeze(
			AllDescription.map((Description) =>
				this._CreateApiExtensionObject<any>(Description),
			),
		);
	}

	public override Dispose(): void {
		super.Dispose();
		this._LogInfo("Disposed.");
	}
}
