/*
 * File: Cocoon/Source/Shim/HostKindPicker.ts
 * Responsibility: Implements the VS Code IExtensionHostKindPicker interface to determine extension host compatibility for Cocoon, ensuring Node.js-based extensions can run in Land's LocalProcess environment by validating manifest declarations.
 * Modified: 2025-06-07 05:37:38 UTC
 * Dependency: vs/base/common/network, vs/platform/extensions/common/extensions
 * Export: ShimExtensionHostKindPicker
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service interface from VS Code. This service
 * is pivotal in determining the most appropriate type of extension host environment
 * (e.g., `ExtensionHostKind.LocalProcess` for Node.js extensions, `ExtensionHostKind.Web`
 * for Web Worker based extensions) for running a given VS Code extension.
 *
 * In the context of Cocoon, which primarily functions as a Node.js sidecar that simulates
 * a standard `ExtensionHostKind.LocalProcess` environment, this shim's main role is to:
 *  1. Validate if an extension, based on its manifest, is designed to run in a Node.js
 *     environment compatible with what Cocoon provides.
 *  2. Normalize the diverse `extensionKind` declarations found in extension
 *     manifests into a canonical array of `ExtensionHostKind` enum values.
 *
 * Responsibilities:
 * - Faithfully implementing the `PickExtensionHostKind(...)` method as defined by the
 *   `IExtensionHostKindPicker` interface.
 * - Parsing and normalizing various forms of `extensionKind` manifest declarations into a
 *   standardized `ExtensionHostKind[]` array through the `_NormalizeExtensionManifestKind` method.
 * - Returning `ExtensionHostKind.LocalProcess` if an extension declares or implies
 *   compatibility with a local Node.js runtime environment.
 * - Returning `null` if the extension is deemed unsuitable for execution within Cocoon.
 *
 * Key Interactions:
 * - An instance of `ShimExtensionHostKindPicker` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts`.
 * - This service is critically consumed by the `ExtHostExtensionService` to decide if an
 *   extension can be loaded in the current Cocoon host instance.
 * - It relies on the `ExtensionHostKind` enum and `IExtensionDescription` type definitions.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from "vs/base/common/network";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import {
	ExtensionHostKind,
	type IExtensionHostKindPicker,
} from "vs/workbench/services/extensions/common/extensionHostKind";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_BaseShim";

type ExtensionRunningPreference = any;

/**
 * Cocoon's implementation of `IExtensionHostKindPicker`.
 * This service determines if a given extension is suitable to run in the Cocoon
 * environment, which simulates a `LocalProcess` (Node.js-based) extension host.
 */
export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	public readonly _serviceBrand: undefined;

	constructor(
		RpcService: IRpcProtocolServiceAdapter | undefined,
		LogService: ILogServiceForShim | undefined,
	) {
		super("ExtensionHostKindPicker", RpcService, LogService);
		this._LogInfo("Initialized.");
	}

	/**
	 * This shim's core decision logic is local and does not require RPC communication.
	 */
	protected override _RequireRpc(): boolean {
		return false;
	}

	/**
	 * Normalize the `extensionKind` property from a manifest into a canonical array.
	 * @param ExtensionIdentifier The identifier of the extension, for logging.
	 * @param ManifestKind The `extensionKind` value from the manifest.
	 * @returns An array of `ExtensionHostKind` enum values.
	 */
	private _NormalizeExtensionManifestKind(
		ExtensionIdentifier: IExtensionDescription["identifier"],
		ManifestKind: (string | ExtensionHostKind)[] | string | undefined,
	): ExtensionHostKind[] {
		if (
			!ManifestKind ||
			(Array.isArray(ManifestKind) && ManifestKind.length === 0)
		) {
			this._LogWarnOnce(
				`No extension kind declared in manifest for '${ExtensionIdentifier.value}'. Defaulting to LocalProcess compatibility.`,
			);
			return [ExtensionHostKind.LocalProcess];
		}

		const KindInputArray = Array.isArray(ManifestKind)
			? ManifestKind
			: [ManifestKind];
		const NormalizedKindSet = new Set<ExtensionHostKind>();

		for (const Kind of KindInputArray) {
			if (typeof Kind === "string") {
				switch (Kind.toLowerCase()) {
					case "ui":
					case "workspace":
						NormalizedKindSet.add(ExtensionHostKind.LocalProcess);
						break;
					case "web":
						NormalizedKindSet.add(ExtensionHostKind.Web);
						break;
					default:
						this._LogWarn(
							`Unknown string value '${Kind}' in 'extensionKind' for '${ExtensionIdentifier.value}'. Ignoring.`,
						);
						break;
				}
			} else if (
				typeof Kind === "number" &&
				Object.values(ExtensionHostKind).includes(
					Kind as ExtensionHostKind,
				)
			) {
				NormalizedKindSet.add(Kind as ExtensionHostKind);
			} else {
				this._LogWarn(
					`Invalid 'extensionKind' value '${String(Kind)}' for '${ExtensionIdentifier.value}'. Ignoring.`,
				);
			}
		}
		return [...NormalizedKindSet];
	}

	/**
	 * Determines the appropriate host kind for an extension.
	 * In Cocoon, this will always be `LocalProcess` if the extension supports it.
	 */
	public PickExtensionHostKind(
		ExtensionIdentifier: IExtensionDescription["identifier"],
		ExtensionManifestKind: (string | ExtensionHostKind)[],
		IsInstalledLocally: boolean,
		IsInstalledRemotely: boolean,
		Preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		const DeclaredHostKind = this._NormalizeExtensionManifestKind(
			ExtensionIdentifier,
			ExtensionManifestKind,
		);

		this._LogDebug(
			`PickExtensionHostKind for '${ExtensionIdentifier.value}': Normalized Kind = [${DeclaredHostKind.map((k) => ExtensionHostKind[k]).join(", ")}]`,
		);

		if (DeclaredHostKind.includes(ExtensionHostKind.LocalProcess)) {
			this._LogDebug(
				` -> Extension '${ExtensionIdentifier.value}' declares LocalProcess. Selecting LocalProcess for Cocoon.`,
			);
			return ExtensionHostKind.LocalProcess;
		}

		const IsExclusivelyWeb = DeclaredHostKind.every(
			(Kind) =>
				Kind === ExtensionHostKind.Web ||
				Kind === ExtensionHostKind.LocalWebWorker,
		);
		if (IsExclusivelyWeb) {
			this._LogDebug(
				` -> Extension '${ExtensionIdentifier.value}' targets only Web/WebWorker. Cocoon (LocalProcess) is not suitable. Returning null.`,
			);
			return null;
		}

		this._LogWarn(
			` -> Extension '${ExtensionIdentifier.value}' declares kind [${DeclaredHostKind.map((k) => ExtensionHostKind[k]).join(", ")}] not suitable for Cocoon. Returning null.`,
		);
		return null;
	}

	/**
	 * A convenience wrapper for `PickExtensionHostKind` that accepts an `IExtensionDescription`.
	 */
	public PickExtensionHostKindForDescription(
		ExtensionDescription: IExtensionDescription,
		IsInstalledLocally: boolean,
		IsInstalledRemotely: boolean,
		Preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		if (
			ExtensionDescription.extensionLocation.scheme ===
			Schemas.vscodeRemote
		) {
			const NormalizedKind = this._NormalizeExtensionManifestKind(
				ExtensionDescription.identifier,
				ExtensionDescription.extensionKinds,
			);
			if (!NormalizedKind.includes(ExtensionHostKind.LocalProcess)) {
				this._LogDebug(
					`Extension '${ExtensionDescription.identifier.value}' is remote and does not declare LocalProcess compatibility. Unsuitable for Cocoon.`,
				);
				return null;
			}
		}

		return this.PickExtensionHostKind(
			ExtensionDescription.identifier,
			ExtensionDescription.extensionKinds || [],
			IsInstalledLocally,
			IsInstalledRemotely,
			Preference,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override Dispose(): void {
		super.Dispose();
	}
}
