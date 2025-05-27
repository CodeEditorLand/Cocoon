/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim (host-kind-picker-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service interface from VS Code. This service
 * is pivotal in determining the most appropriate type of extension host environment
 * (e.g., `ExtensionHostKind.LocalProcess` for Node.js extensions, `ExtensionHostKind.Web`
 * for Web Worker based extensions, or a Remote Extension Host) for running a given
 * VS Code extension. The decision process considers the extension's manifest declarations
 * (specifically its `extensionKind` property), its installation location (local vs. remote), *
 * the current workspace context, and potentially user or workspace preferences.
 *
 * In the context of Cocoon, which primarily functions as a Node.js sidecar that simulates
 * a standard `ExtensionHostKind.LocalProcess` environment, this shim's main role is to:
 *  1. Validate if an extension, based on its manifest, is designed to run in a Node.js
 *     environment compatible with what Cocoon provides.
 *  2. Normalize the diverse `extensionKind` declarations that can be found in extension
 *     manifests (e.g., simple strings like "ui", "workspace", "web"; arrays of these; *     or, less commonly in raw manifests, direct `ExtensionHostKind` enum values) into a
 *     canonical array of `ExtensionHostKind` enum values for consistent evaluation.
 *
 * Responsibilities:
 * - Faithfully implementing the `pickExtensionHostKind(...)` and its convenience wrapper
 *   `pickExtensionHostKindForDescription(...)` methods as defined by the
 *   `IExtensionHostKindPicker` interface.
 * - Parsing and normalizing various forms of `extensionKind` manifest declarations into a
 *   standardized `ExtensionHostKind[]` array through the `_normalizeExtensionManifestKinds` method.
 * - Returning `ExtensionHostKind.LocalProcess` if an extension declares or implies
 *   compatibility with a local Node.js runtime environment. This typically includes
 *   extensions with an `extensionKind` of 'workspace'. "UI" extensions that are
 *   Node.js-compatible and intended to run in the main local extension host (which Cocoon
 *   simulates) are also mapped to `LocalProcess`.
 * - Returning `null` if the extension is deemed unsuitable for execution within Cocoon, *
 *   for example, if it's an extension designed exclusively for a Web Worker environment
 *   (`ExtensionHostKind.Web`) and Cocoon is a Node.js host.
 *
 * Key Interactions:
 * - An instance of `ShimExtensionHostKindPicker` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts`.
 * - This service is critically consumed by the real `ExtHostExtensionService` (which runs
 *   within the Cocoon environment) during its extension resolution and activation phase.
 *   The `ExtHostExtensionService` uses this picker to decide if a particular extension
 *   can be loaded and run in the current Cocoon host instance.
 * - It relies on the `ExtensionHostKind` enum and `IExtensionDescription` type definitions, *
 *   which are standard types from VS Code's platform/common modules.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

// For checking URI schemes, e.g., Schemas.vscodeRemote, to determine if an extension's location is remote.
import { Schemas } from "vs/base/common/network";
// VS Code internal types for extension description structure and host kind enumeration.
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	// The enum defining different types of extension hosts (e.g., LocalProcess, Web, Remote).
	ExtensionHostKind,
	// The service interface this shim implements.
	type IExtensionHostKindPicker,
	// This might be relevant in a more complex picker that considers the type of workspace (e.g., virtual workspace).
	// WorkspaceFolderSchemes,
} from "vs/workbench/services/extensions/common/extensionHostKind";

// Base class for Cocoon shims, providing logging utilities and a common structure.
import {
	BaseCocoonShim,
	// For logging via BaseCocoonShim.
	type ILogServiceForShim,
	// For BaseCocoonShim constructor, though not directly used by this shim's logic.
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Placeholder type for the `preference` parameter in the `pickExtensionHostKind` method.
 * In a full VS Code environment, this would likely be a more specific type, potentially an
 * enum (e.g., `ExtensionRunningPreference`), indicating user or workspace preferences for
 * where an extension should ideally run (e.g., "prefer local execution", "prefer remote execution").
 * For this shim's current MVP implementation, the value of this parameter is not used in the
 * core decision-making logic, as Cocoon has a fixed role as a local Node.js host.
 */
// TODO: Replace with actual VS Code type if/when this parameter becomes relevant for Cocoon.
type ExtensionRunningPreference = any;

/**
 * Cocoon's implementation of `IExtensionHostKindPicker`.
 * This service determines if a given VS Code extension is suitable to run in the Cocoon
 * environment, which primarily simulates a `LocalProcess` (Node.js-based) extension host.
 * The decision is made based on the extension's manifest declarations, particularly its `extensionKind`.
 */
export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimExtensionHostKindPicker.
	 * @param rpcService The RPC service adapter. This is passed to the `BaseCocoonShim` constructor
	 *                   but is not directly used by this picker shim's core decision logic, as that
	 *                   logic is local and based on manifest data.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionHostKindPicker", rpcService, logService);

		// Use Info for major lifecycle events.
		this._logInfo("Initialized.");
	}

	/**
	 * This shim's core decision logic is local, based on manifest data provided to its methods.
	 * It does not require RPC communication with Mountain for its primary functionality.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Normalizes the `extensionKind` property from an extension's `package.json` manifest
	 * into a canonical array of `ExtensionHostKind` enum values. Extension manifests can declare
	 * this property in several ways:
	 * - A single string (e.g., "ui", "workspace", "web").
	 * - An array of such strings.
	 * - (Less commonly in raw manifests, but possible internally) An array of `ExtensionHostKind` enum values.
	 * This method handles these variations and produces a consistent output.
	 *
	 * @param extensionId The `ExtensionIdentifier` of the extension, used for contextual logging.
	 * @param manifestKinds The `extensionKind` value(s) as declared in the extension's manifest.
	 *                      This can be `undefined` if not specified in the manifest.
	 * @returns An array of `ExtensionHostKind` enum values derived from the manifest.
	 *          Returns `[ExtensionHostKind.LocalProcess]` as a default assumption if `manifestKinds`
	 *          is empty or undefined, reflecting Cocoon's primary role.
	 */
	private _normalizeExtensionManifestKinds(
		extensionId: ExtensionIdentifier,

		manifestKinds: string | string[] | ExtensionHostKind[] | undefined,
	): ExtensionHostKind[] {
		if (
			!manifestKinds ||
			(Array.isArray(manifestKinds) && manifestKinds.length === 0)
		) {
			// Default Behavior in VS Code: If an extension's manifest does not explicitly specify `extensionKind`,

			// its kind is often inferred by VS Code's extension description processing logic (e.g., an extension
			// with only a `main` Node.js entry point might default to 'workspace' kind).
			// If this picker method receives an empty or undefined `manifestKinds`, it implies either:
			//   a) The manifest had no `extensionKind` declaration.
			//   b) A higher-level resolver (like `ExtensionDescription.constructor` in VS Code's codebase)
			//      should have already processed the manifest and set a default `extensionKind` array.
			// For Cocoon, acting as a `LocalProcess` host, if no specific kind is declared,

			// it's reasonable to assume (as a fallback for this picker) that an older Node.js extension
			// might be intended for such an environment.
			this._logWarnOnce(
				`No extension kinds were declared in the manifest for extension '${extensionId.value}', or the provided list was empty. ` +
					`Defaulting to assume potential LocalProcess compatibility for Cocoon's evaluation. This relies on VS Code's standard ` +
					`extension description processing to have applied more sophisticated defaults if applicable.`,
			);

			// Default assumption for Cocoon if no kinds specified.
			return [ExtensionHostKind.LocalProcess];
		}

		const kindsInputArray = Array.isArray(manifestKinds)
			? manifestKinds
			: [manifestKinds];

		// Use a Set to automatically handle duplicates.
		const normalizedKindsSet = new Set<ExtensionHostKind>();

		for (const kind of kindsInputArray) {
			if (typeof kind === "string") {
				switch (kind.toLowerCase()) {
					case "ui":
						// Mapping for "ui" kind: In VS Code, "ui" extensions contribute to the user interface
						// and often run in the same main extension host process as "workspace" extensions, especially
						// if they are Node.js compatible. Since Cocoon simulates this main local Node.js host,

						// Node-compatible "ui" extensions are considered to run as `LocalProcess`.
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);

						break;

					case "workspace":
						// "workspace" extensions are explicitly designed for a Node.js environment (LocalProcess host).
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);

						break;

					case "web":
						// "web" extensions are designed for browser-based Web Worker extension hosts.
						normalizedKindsSet.add(ExtensionHostKind.Web);

						break;

					default:
						this._logWarn(
							`Unknown string value '${kind}' encountered in 'extensionKind' manifest declaration for extension '${extensionId.value}'. This kind will be ignored by the picker.`,
						);

						break;
				}
			} else if (
				typeof kind === "number" &&
				Object.values(ExtensionHostKind).includes(
					kind as ExtensionHostKind,
				)
			) {
				// The value is already a valid ExtensionHostKind enum member.
				normalizedKindsSet.add(kind as ExtensionHostKind);
			} else {
				this._logWarn(
					`Invalid or unrecognized value '${String(kind)}' (type: ${typeof kind}) found in 'extensionKind' manifest declaration for extension '${extensionId.value}'. This value will be ignored by the picker.`,
				);
			}
		}

		// Convert the Set to an array for the return value.
		return [...normalizedKindsSet];
	}

	/**
	 * {@inheritDoc IExtensionHostKindPicker.pickExtensionHostKind}
	 *
	 *
	 *
	 * This method determines the most suitable `ExtensionHostKind` for running a given extension,
	 *
	 *
	 *
	 * specifically considering Cocoon's role as a `LocalProcess` (Node.js-based) extension host.
	 *
	 * The parameters `_isInstalledLocally`, `_isInstalledRemotely`, and `_preference` are part of
	 * the standard VS Code `IExtensionHostKindPicker` interface. However, in this current shim
	 * implementation for Cocoon (which assumes a single, local Node.js host environment), these
	 * parameters do not influence the core decision logic. They are included for interface
	 * compatibility and could be utilized if Cocoon's hosting capabilities were expanded
	 * (e.g., to support multiple host types or consider remote installations differently).
	 *
	 * @param extensionId The `ExtensionIdentifier` of the extension.
	 * @param extensionManifestKinds The `extensionKind` values from the extension's manifest.
	 * @param _isInstalledLocally Whether the extension is considered installed locally (unused by this shim).
	 * @param _isInstalledRemotely Whether the extension is considered installed remotely (unused by this shim).
	 * @param _preference User or workspace preference for where the extension should run (unused by this shim).
	 * @returns `ExtensionHostKind.LocalProcess` if the extension is deemed compatible with Cocoon's
	 *          Node.js environment based on its manifest. Returns `null` if the extension is
	 *          unsuitable (e.g., if it's exclusively a Web extension).
	 */
	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,

		// Sourced from IExtensionDescription.extensionKinds
		extensionManifestKinds: (string | ExtensionHostKind)[],

		_isInstalledLocally: boolean,

		_isInstalledRemotely: boolean,

		_preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		const declaredHostKinds = this._normalizeExtensionManifestKinds(
			extensionId,

			extensionManifestKinds,
		);

		// For detailed debugging of kind resolution, uncomment the following:
		this._logDebug(
			`pickExtensionHostKind for '${extensionId.value}': Normalized/Declared Kinds = [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}], isLocal=${_isInstalledLocally}, isRemote=${_isInstalledRemotely}, Pref=${String(_preference)}`,
		);

		if (declaredHostKinds.length === 0) {
			this._logError(
				`No valid host kinds could be resolved for extension '${extensionId.value}' after normalization of its manifest kinds. Cannot determine a suitable host environment.`,
			);

			return null;
		}

		// Cocoon's primary function is to act as a LocalProcess (Node.js) extension host.
		// Extensions that declare compatibility with 'workspace' (which implies Node.js)
		// or Node.js-compatible 'ui' kinds are candidates for execution within Cocoon.
		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			this._logDebug(
				// Use Debug for successful internal decision logging
				` -> Extension '${extensionId.value}' (normalized kinds: [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}]) declares or implies LocalProcess compatibility. Selecting LocalProcess for execution in Cocoon.`,
			);

			return ExtensionHostKind.LocalProcess;
		}

		// If an extension is *exclusively* designed for a Web Worker host environment,

		// it cannot be run in Cocoon, which is a Node.js-based host.
		if (
			declaredHostKinds.length === 1 &&
			declaredHostKinds[0] === ExtensionHostKind.Web
		) {
			this._logDebug(
				// Use Debug for clear decision paths
				` -> Extension '${extensionId.value}' (normalized kinds: [Web]) is exclusively a Web extension. Cocoon (LocalProcess host) is not a suitable environment. Returning null.`,
			);

			return null;
		}

		// TODO (Future Consideration): Handle `ExtensionHostKind.LocalWebWorker` if Cocoon ever evolves
		// to support spawning and managing local Web Workers for certain types of extensions.
		// This is generally outside the scope of an MVP focused on Node.js extension compatibility.
		// if (declaredHostKinds.includes(ExtensionHostKind.LocalWebWorker)) { /* ... potentially complex logic ... */ }

		// If none of the above conditions are met, the extension's declared kinds are not
		// suitable for Cocoon's primary role as a LocalProcess host.
		this._logWarn(
			// Warn if an extension seems incompatible after checks
			` -> Extension '${extensionId.value}' declares kinds [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] which are not directly suitable for execution in Cocoon (which primarily serves as a LocalProcess host). No suitable host kind found. Returning null.`,
		);

		return null;
	}

	/**
	 * A convenience method that wraps `pickExtensionHostKind` by accepting a full
	 * `IExtensionDescription` object. It extracts the `extensionKinds` from the
	 * description and also considers the scheme of the `extensionLocation` (e.g., 'file'
	 * vs. 'vscode-remote') to provide additional context, especially for extensions
	 * that might be located on a remote filesystem.
	 *
	 * @param extensionDescription The full `IExtensionDescription` of the extension.
	 * @param isInstalledLocally Whether the extension is considered to be installed locally.
	 * @param isInstalledRemotely Whether the extension is considered to be installed on a remote.
	 * @param preference User or workspace preference regarding where the extension should run.
	 * @returns The chosen `ExtensionHostKind` (typically `ExtensionHostKind.LocalProcess` if suitable
	 *          for Cocoon), or `null` if the extension cannot be run in the current Cocoon host.
	 */
	public pickExtensionHostKindForDescription(
		extensionDescription: IExtensionDescription,

		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		// `extensionDescription.extensionKinds` should ideally be `ExtensionHostKind[]` if it has been
		// fully processed by VS Code's manifest parsing logic. If it can still contain strings
		// (e.g., from older or less processed manifest data), `_normalizeExtensionManifestKinds` will handle it.
		const manifestBasedKinds = extensionDescription.extensionKinds || [];

		// If an extension's `extensionLocation` URI has a scheme like `vscode-remote`,

		// it indicates the extension's files are primarily on a remote system.
		// Such an extension would typically run in a Remote Extension Host.
		// It would only be a candidate for Cocoon (a local host) if it *also* explicitly
		// declares compatibility with `LocalProcess` (e.g., for a UI part of a remote extension
		// that is designed to run locally). For a standard Cocoon setup focused on local
		// extensions, most remote-located extensions would not be its target.
		if (
			extensionDescription.extensionLocation.scheme ===
			Schemas.vscodeRemote
		) {
			const normalizedLocalCandidateKinds =
				this._normalizeExtensionManifestKinds(
					extensionDescription.identifier,

					manifestBasedKinds,
				);

			if (
				!normalizedLocalCandidateKinds.includes(
					ExtensionHostKind.LocalProcess,
				)
			) {
				this._logDebug(
					// Debug log for this specific condition
					`Extension '${extensionDescription.identifier.value}' is primarily remote (location: ${extensionDescription.extensionLocation.toString()}) and does not declare explicit LocalProcess compatibility. It is not suitable for execution in Cocoon.`,
				);

				return null;
			}

			// If the extension is remote-located BUT also declares LocalProcess-compatible kinds,

			// it might be a hybrid extension. We proceed to `pickExtensionHostKind` to see if
			// those local kinds make it a fit for Cocoon. This scenario implies a more complex
			// hosting architecture than a simple standalone Cocoon.
			this._logWarnOnce(
				`Extension '${extensionDescription.identifier.value}' is remote-located but also declares LocalProcess-compatible kinds ` +
					`([${normalizedLocalCandidateKinds.map((k) => ExtensionHostKind[k]).join(", ")}]). Proceeding with kind picking, but this ` +
					`represents a complex hosting scenario that Cocoon's MVP may not fully support.`,
			);
		}

		return this.pickExtensionHostKind(
			extensionDescription.identifier,

			// Pass the kinds obtained from the extension description.
			manifestBasedKinds,

			isInstalledLocally,

			isInstalledRemotely,

			preference,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// Can be verbose for a simple service.
		// this._logDebug("Disposed.");
	}
}
