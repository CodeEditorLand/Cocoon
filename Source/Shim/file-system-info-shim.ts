/*---------------------------------------------------------------------------------------------
 * Cocoon File System Information Shim (file-system-info-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostFileSystemInfo` service interface for the Cocoon extension host
 * environment. This service is a critical component for understanding and correctly
 * handling filesystem characteristics, particularly path case sensitivity, across various
 * URI schemes that extensions might interact with.
 *
 * The shim determines path case sensitivity for the standard local 'file://' scheme based
 * on the operating system (e.g., case-insensitive on Windows, case-sensitive on Linux/macOS)
 * where the Cocoon sidecar is executing. For other URI schemes, such as those introduced
 * by custom `FileSystemProvider` extensions, this service can receive and store capability
 * updates (including case sensitivity information) from the Mountain host process via RPC.
 *
 * A key feature provided by this service is the `extUri` property. This is an instance
 * of VS Code's `ExtUri` utility class, which is pre-configured to use the case sensitivity
 * rules managed by this `ShimExtHostFileSystemInfo` service. All URI path manipulations,
 * comparisons, and relative path calculations within the extension host should ideally
 * use this `extUri` instance to ensure correctness according to the underlying filesystem's
 * (or provider's) characteristics for a given scheme.
 *
 * Responsibilities:
 * - Implementing the `IExtHostFileSystemInfo` interface (from VS Code platform/workbench).
 * - Implementing the `ExtHostFileSystemInfoShape` (from `extHost.protocol.ts`) to handle
 *   RPC calls from the MainThread (Mountain).
 * - Providing the `getCapabilities(scheme: string)` method:
 *     - For the 'file' URI scheme, it determines capabilities, notably including
 *       `FileSystemProviderCapabilities.PathCaseSensitive`, based on the host OS
 *       (identified via `isWindows` from `vs/base/common/platform`).
 *     - For other URI schemes (e.g., 'untitled', 'vscode-interactive-input', or custom
 *       schemes from extensions), it returns capabilities that have been previously
 *       communicated by Mountain through the `$acceptProviderInfos` RPC method.
 * - Instantiating and exposing `extUri: IExtUri`. The `ExtUri` instance is configured
 *   with a callback that dynamically consults `this.getCapabilities()` to determine
 *   whether path casing should be ignored for URI operations on a given scheme.
 * - Handling the `$acceptProviderInfos(uriComponents, capabilities)` RPC call from Mountain.
 *   This allows Mountain to update Cocoon about the capabilities of various filesystem
 *   providers, especially for custom schemes registered by extensions whose providers
 *   might live on the Mountain side or be managed by it.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostFileSystemInfo` is registered with Dependency Injection
 *   in `Cocoon/index.ts`.
 * - It is a crucial dependency for other ExtHost services that perform URI operations
 *   and need to respect filesystem case sensitivity, such as `ShimExtHostWorkspace`
 *   (for managing workspace folders) and VS Code's internal `ExtensionDescriptionRegistry`
 *   (for resolving extension paths).
 * - Uses `isWindows` from `vs/base/common/platform` to ascertain default capabilities
 *   for the 'file' scheme.
 * - Relies on the `ExtUri` class and `FileSystemProviderCapabilities` enum from VS Code's
 *   `base/common/resources` and `platform/files/common/files` modules, respectively.
 * - Receives RPC calls from a `MainThreadFileSystemInfoService` (or equivalent component)
 *   on the Mountain host via the `$acceptProviderInfos` method. This allows Mountain to
 *   synchronize Cocoon with the capabilities of filesystem providers it manages.
 *
 * Last Reviewed/Updated: 2025-05-26
 *--------------------------------------------------------------------------------------------*/

// For standard URI schemes like Schemas.file, Schemas.untitled
import { Schemas } from "vs/base/common/network";
// For the OS platform check (isWindows) to determine default 'file' scheme case sensitivity.
import { isWindows } from "vs/base/common/platform";
// VS Code's advanced URI utility class that respects case sensitivity rules.
import { ExtUri, type IExtUri } from "vs/base/common/resources";
// For the type of URI components received in RPC calls from the MainThread (Mountain).
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// Enum defining various filesystem provider capabilities (e.g., PathCaseSensitive, FileReadWrite).
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import {
	ExtHostContext, // Used to register this service for RPC calls from the MainThread.
	type ExtHostFileSystemInfoShape as VscodeExtHostFileSystemInfoShape, // The RPC interface this service implements for MainThread calls.
} from "vs/workbench/api/common/extHost.protocol";
// The actual VS Code service interface this shim implements for DI and API consistency.
import type { IExtHostFileSystemInfo as VscodeIExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	// type ProxyIdentifier, // Not needed for direct import if casts are avoided or type is inferred.
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Cocoon's implementation of `IExtHostFileSystemInfo`.
 * This service provides information about filesystem capabilities, most notably path case sensitivity,
 * and offers an `ExtUri` instance configured with these dynamic capabilities.
 */
export class ShimExtHostFileSystemInfo
	extends BaseCocoonShim
	implements VscodeIExtHostFileSystemInfo, VscodeExtHostFileSystemInfoShape
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service type system for DI.

	/**
	 * A URI utility instance (`ExtUri`) that performs comparisons and path operations
	 * respecting the case sensitivity rules dynamically provided by this service for
	 * different URI schemes. This instance should be the preferred tool for any URI
	 * manipulations within the extension host that need to be aware of the underlying
	 * filesystem's (or provider's) case sensitivity characteristics.
	 */
	public readonly extUri: IExtUri;

	// Internal cache storing `FileSystemProviderCapabilities` for various URI schemes.
	// Key: URI scheme string (e.g., "file", "untitled", "custom-scheme").
	// Value: A bitmask of `FileSystemProviderCapabilities`.
	private readonly _providerCapabilities = new Map<
		string,
		FileSystemProviderCapabilities
	>();

	/**
	 * Creates an instance of ShimExtHostFileSystemInfo.
	 * @param rpcService The RPC service adapter, used to register this service for receiving
	 *                   capability updates from the MainThread (Mountain) via `$acceptProviderInfos`.
	 * @param logService The logging service instance for this shim.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostFileSystemInfo", rpcService, logService);
		this._logInfo("Initializing...");

		// Initialize `this.extUri`. The callback function provided to the `ExtUri` constructor
		// is invoked by `ExtUri` methods whenever they need to determine if path casing
		// should be ignored (i.e., treated as case-insensitive) for a given URI.
		// The callback should return `true` to ignore case (case-insensitive) and
		// `false` to respect case (case-sensitive).
		this.extUri = new ExtUri((uriComponentsToCheck) => {
			// `uriComponentsToCheck` can be various URI-like structures (vscode.Uri, vs/base/common/uri.URI, or UriComponents).
			// We primarily need its `scheme` property to look up capabilities.
			const scheme =
				typeof uriComponentsToCheck.scheme === "string"
					? uriComponentsToCheck.scheme
					: Schemas.file; // Default to 'file' scheme if not explicitly present in components.

			const capabilities = this.getCapabilities(scheme);

			if (capabilities === undefined) {
				// For unknown schemes where capabilities haven't been registered,
				// VS Code's `ExtUri` typically defaults to case-sensitive behavior for safety.
				// "Case-sensitive" means "do NOT ignore casing," so the callback returns `false`.
				this._logService?.trace(
					`[ExtUri Callback] No explicit capabilities for scheme '${scheme}', defaulting to case-sensitive.`,
				);
				return false;
			}

			// The `ignoreCase` parameter for `ExtUri` should be `true` if the filesystem is case-insensitive.
			// `FileSystemProviderCapabilities.PathCaseSensitive` is a flag that is *set* (true)
			// if the filesystem *is* case-sensitive.
			// Therefore, we should ignore case (return `true`) if the `PathCaseSensitive` flag is *not* set.
			const ignoreCase = !(
				capabilities & FileSystemProviderCapabilities.PathCaseSensitive
			);
			this._logService?.trace(
				`[ExtUri Callback] Scheme '${scheme}', Capabilities: ${capabilities}, PathCaseSensitive flag set: ${!!(capabilities & FileSystemProviderCapabilities.PathCaseSensitive)}. extUri will ignoreCase: ${ignoreCase}.`,
			);
			return ignoreCase;
		});

		// Set default capabilities for the local 'file' scheme based on the host OS.
		this._providerCapabilities.set(
			Schemas.file, // "file"
			isWindows // `isWindows` is true if `process.platform === 'win32'`.
				? FileSystemProviderCapabilities.FileReadWrite // Windows filesystems are typically case-insensitive by default. PathCaseSensitive flag is NOT set.
				: FileSystemProviderCapabilities.FileReadWrite |
						FileSystemProviderCapabilities.PathCaseSensitive, // Other OS (Linux, macOS) are case-sensitive. PathCaseSensitive flag IS set.
		);

		// Set default capabilities for the 'untitled' scheme (for unsaved files, typically treated as case-sensitive).
		this._providerCapabilities.set(
			Schemas.untitled, // "untitled"
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Set default capabilities for 'vscode-interactive-input' scheme (used for interactive playground inputs, etc.)
		this._providerCapabilities.set(
			Schemas.vscodeInteractiveInput, // "vscode-interactive-input"
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Register this service instance with the RPC system so that the MainThread (Mountain)
		// can call its methods (specifically `$acceptProviderInfos`).
		if (this._rpcService) {
			try {
				// ExtHostContext.ExtHostFileSystemInfo is already of type ProxyIdentifier<ExtHostFileSystemInfoShape>
				// so the explicit cast `as ProxyIdentifier<...>` is redundant.
				this._rpcService.set(
					ExtHostContext.ExtHostFileSystemInfo,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostContext.ExtHostFileSystemInfo).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self for RPC (ExtHostFileSystemInfo) with MainThread:",
					e,
				);
			}
		} else {
			// If no RPC service is available (e.g., in certain testing setups or if RPC failed to initialize),
			// this ExtHost service will not be able to receive dynamic updates to provider capabilities from Mountain.
			// It will operate with its locally defined defaults.
			this._logWarn(
				"RPCService (IRpcProtocolServiceAdapter) not available. Dynamic updates to filesystem provider capabilities via $acceptProviderInfos from MainThread will not be possible.",
			);
		}

		this._logInfo(
			`Initialized. Default 'file' scheme is case-${isWindows ? "insensitive" : "sensitive"}. 'extUri' instance is configured to use dynamic capability lookup for URI operations.`,
		);
	}

	// --- IExtHostFileSystemInfo Implementation ---

	/**
	 * {@inheritDoc VscodeIExtHostFileSystemInfo.getCapabilities}
	 * Retrieves the filesystem capabilities (e.g., case sensitivity, read-only status,
	 * atomic operations support) for a given URI scheme.
	 *
	 * @param scheme The URI scheme string (e.g., "file", "untitled", "vscode-remote", "custom-fs").
	 * @returns The `FileSystemProviderCapabilities` bitmask for the specified scheme,
	 *          or `undefined` if the scheme is unknown or no capabilities have been
	 *          registered for it (e.g., via `$acceptProviderInfos`).
	 */
	public getCapabilities(
		scheme: string,
	): FileSystemProviderCapabilities | undefined {
		return this._providerCapabilities.get(scheme);
	}

	// --- ExtHostFileSystemInfoShape RPC Method (called by MainThread/Mountain) ---

	/**
	 * {@inheritDoc VscodeExtHostFileSystemInfoShape.$acceptProviderInfos}
	 *
	 * Accepts filesystem provider information, specifically their capabilities, from the
	 * MainThread (Mountain). This method is invoked when new filesystem providers are
	 * registered on the Mountain side (e.g., by extensions contributing providers that
	 * run in the main process or are managed by Mountain) or when the capabilities of
	 * existing providers change.
	 *
	 * @param uriComponents URI components DTO received from Mountain. Only the `scheme` property
	 *                      of this DTO is typically relevant and used by this method to identify
	 *                      the provider whose capabilities are being updated.
	 * @param capabilities The new capabilities bitmask (`FileSystemProviderCapabilities`) for the
	 *                     provider associated with the `uriComponents.scheme`. If `null`, it indicates
	 *                     that the provider for this scheme is being unregistered or its known
	 *                     capabilities should be cleared.
	 */
	public $acceptProviderInfos(
		uriComponents: VSCodeInternalUriComponents,
		capabilities: FileSystemProviderCapabilities | null,
	): void {
		const scheme = uriComponents.scheme;
		if (
			!scheme ||
			typeof scheme !== "string" ||
			scheme.trim().length === 0
		) {
			this._logError(
				"$acceptProviderInfos RPC call received URI components DTO without a valid 'scheme' property. Cannot update capabilities. Received DTO:",
				uriComponents,
			);
			return;
		}

		this._logService?.trace(
			`RPC $acceptProviderInfos: Updating capabilities for scheme='${scheme}'. New Capabilities = ${capabilities === null ? "'cleared/removed'" : capabilities}`,
		);

		if (capabilities === null) {
			// If `capabilities` is null, it signifies that the provider for this scheme is being
			// unregistered, or its capabilities are being explicitly cleared.
			if (this._providerCapabilities.delete(scheme)) {
				this._logInfo(
					`Capabilities for URI scheme '${scheme}' were removed/cleared based on update from MainThread.`,
				);
			} else {
				this._logService?.trace(
					`$acceptProviderInfos: Scheme '${scheme}' received null capabilities, but no prior capabilities were stored for it.`,
				);
			}
		} else {
			this._providerCapabilities.set(scheme, capabilities);
			this._logInfo(
				`Capabilities for URI scheme '${scheme}' were updated from MainThread to: ${capabilities}. Total schemes with known capabilities: ${this._providerCapabilities.size}.`,
			);
		}

		// Important Note: The `this.extUri` instance is designed to be dynamic. Its behavior
		// (e.g., for determining case sensitivity in comparisons or path operations) relies on its
		// constructor callback, which in turn calls `this.getCapabilities()`. Therefore, any changes
		// made here to the `_providerCapabilities` map will be automatically and immediately
		// reflected in subsequent operations performed by `this.extUri` without needing to
		// re-initialize or explicitly update the `extUri` instance itself.
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim, handles _instanceDisposables
		this._providerCapabilities.clear(); // Clear the cached capabilities
		this._logInfo("Disposed and cleared provider capabilities cache.");
	}
}
