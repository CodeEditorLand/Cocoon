/*---------------------------------------------------------------------------------------------
 * Cocoon File System Information Shim (file-system-info-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostFileSystemInfo` service interface for the Cocoon environment.
 * This service is responsible for providing information about the capabilities of
 * different filesystem providers, with a primary focus on path case sensitivity.
 * This information is crucial for URI comparisons, relative path calculations, and
 * ensuring correct behavior of filesystem operations across various schemes.
 *
 * The shim determines case sensitivity for the local 'file' scheme based on the
 * operating system (`process.platform`) where Cocoon is running. For other URI schemes,
 * 
 * 
 * 
 * it can receive capability updates from the Mountain host via RPC.
 *
 * It also instantiates and exposes an `ExtUri` instance (`this.extUri`), which is a
 * URI utility class from VS Code that respects case sensitivity rules based on the
 * capabilities provided by this service.
 *
 * Responsibilities:
 * - Implementing the `IExtHostFileSystemInfo` interface.
 * - Implementing the `ExtHostFileSystemInfoShape` for RPC calls from Mountain.
 * - Providing `getCapabilities(scheme: string)`:
 *     - For the 'file' scheme, determines capabilities (especially PathCaseSensitive)
 *       based on `isWindows` (from `vs/base/common/platform`).
 *     - For other schemes, returns capabilities previously set via `$acceptProviderInfos`.
 * - Exposing `extUri: IExtUri`, configured with the appropriate case-sensitivity logic
 *   derived from this service's capabilities.
 * - Handling `$acceptProviderInfos` RPC calls from Mountain to update the capabilities
 *   of (potentially dynamically registered) filesystem providers.
 *
 * Key Interactions:
 * - Registered with Dependency Injection in `Cocoon/index.ts`.
 * - Used by other ExtHost services that deal with URIs and require case-sensitive
 *   comparisons or path operations (e.g., `ShimExtHostWorkspace`).
 * - Uses `process.platform` (via `vs/base/common/platform.isWindows`) for 'file' scheme logic.
 * - Relies on `ExtUri` and `FileSystemProviderCapabilities` from VS Code's base/platform.
 * - Receives RPC calls from `MainThreadFileSystemInfo` (or similar) on Mountain
 *   via the `$acceptProviderInfos` method.
 *

 *--------------------------------------------------------------------------------------------*/

// For Schemas.file and other standard URI schemes
import { Schemas } from "vs/base/common/network";
// For platform check to determine default 'file' scheme case sensitivity
import { isWindows } from "vs/base/common/platform";
// VS Code's URI utility that respects case sensitivity
import { ExtUri, type IExtUri } from "vs/base/common/resources";
// For type of URI components in RPC calls
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
// Enum for filesystem provider capabilities
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// Not used for getting a proxy *from* this service
	// MainContext,
	type ExtHostFileSystemInfoShape as VscodeExtHostFileSystemInfoShape,
} from "vs/workbench/api/common/extHost.protocol";
// Actual VS Code interface this shim implements for DI and API consistency
import type { IExtHostFileSystemInfo as VscodeIExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

import {
	BaseCocoonShim,
	// Though not used to get a proxy *from* this service
	ProxyIdentifier,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Cocoon's implementation of `IExtHostFileSystemInfo`.
 * It provides filesystem capability information, primarily path case sensitivity.
 */
export class ShimExtHostFileSystemInfo
	extends BaseCocoonShim
	implements VscodeIExtHostFileSystemInfo, VscodeExtHostFileSystemInfoShape
{
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	/**
	 * A URI utility instance (`ExtUri`) that performs comparisons and path operations
	 * respecting the case sensitivity rules defined by this service for different URI schemes.
	 */
	public readonly extUri: IExtUri;

	// Stores capabilities for various URI schemes.
	// Key: URI scheme string (e.g., "file", "untitled", "vscode-remote").
	// Value: FileSystemProviderCapabilities bitmask.
	private readonly _providerCapabilities = new Map<
		string,
		FileSystemProviderCapabilities
	>();

	/**
	 * Creates an instance of ShimExtHostFileSystemInfo.
	 * @param rpcService The RPC service adapter, used to register this service for calls from MainThread.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostFileSystemInfo", rpcService, logService);

		this._log("Initializing...");

		// Initialize extUri. The callback it takes determines if path casing should be ignored (case-insensitive)
		// for a given URI. It does this by checking the capabilities provided by this service.
		this.extUri = new ExtUri((uriComponents) => {
			// The uriComponents here can be `vscode.Uri` or `vs/base/common/uri.URI` or `UriComponents`.
			// We need its scheme to get capabilities.
			// Default to 'file' if scheme is missing
			const scheme =
				typeof uriComponents.scheme === "string"
					? uriComponents.scheme
					: Schemas.file;

			const capabilities = this.getCapabilities(scheme);

			if (capabilities === undefined) {
				// For unknown schemes, VS Code's ExtUri defaults to case-sensitive behavior.
				// Case-sensitive means NOT ignoring case.
				// false means: "do not ignore casing" (i.e., case-sensitive)
				return false;
			}

			// If PathCaseSensitive capability is NOT set, then ignore case (case-insensitive).
			// `!(capabilities & FileSystemProviderCapabilities.PathCaseSensitive)`
			//   true = ignore case (case-insensitive)
			//   false = do not ignore case (case-sensitive)
			return !(
				capabilities & FileSystemProviderCapabilities.PathCaseSensitive
			);
		});

		// Set default capabilities for the local 'file' scheme based on the host OS.
		this._providerCapabilities.set(
			Schemas.file,

			isWindows
				? // Windows is typically case-insensitive.
					FileSystemProviderCapabilities.FileReadWrite
				: // Other OS (Linux, macOS) are case-sensitive.
					FileSystemProviderCapabilities.FileReadWrite |
						FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Set default capabilities for 'untitled' scheme (typically case-sensitive like an in-memory store).
		this._providerCapabilities.set(
			Schemas.untitled,

			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Set default capabilities for 'vscode-interactive-input' scheme
		this._providerCapabilities.set(
			Schemas.vscodeInteractiveInput,

			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Register this service with RPC so MainThread can call `$acceptProviderInfos`.
		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostFileSystemInfo as ProxyIdentifier<VscodeExtHostFileSystemInfoShape>,

					this,
				);

				this._log(
					"Registered self for RPC calls from MainThread (ExtHostFileSystemInfo).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostFileSystemInfo):",

					e,
				);
			}
		} else {
			// If no RPC, $acceptProviderInfos will not be callable from MainThread.

			this._logWarn(
				"RPCService not available. Dynamic updates to provider capabilities via $acceptProviderInfos will not be possible.",
			);
		}

		this._log(
			`Initialized. 'file' scheme case-sensitive: ${!isWindows}. extUri configured with dynamic capability lookup.`,
		);
	}

	// --- IExtHostFileSystemInfo Implementation ---

	/**
	 * Retrieves the filesystem capabilities for a given URI scheme.
	 * @param scheme The URI scheme (e.g., "file", "untitled", "vscode-remote").
	 * @returns The `FileSystemProviderCapabilities` for the scheme, or `undefined` if unknown.
	 */
	public getCapabilities(
		scheme: string,
	): FileSystemProviderCapabilities | undefined {
		return this._providerCapabilities.get(scheme);
	}

	// --- ExtHostFileSystemInfoShape RPC Method (called by MainThread) ---

	/**
	 * Accepts filesystem provider information (capabilities) from the MainThread.
	 * This is called when new filesystem providers are registered or their capabilities change.
	 * @param uriComponents URI components identifying the scheme of the provider (only `scheme` is used).
	 * @param capabilities The new capabilities bitmask, or `null` if the provider is being unregistered.
	 */
	public $acceptProviderInfos(
		// Only scheme is typically used from here.
		uriComponents: VSCodeInternalUriComponents,

		// Type is number (bitmask)
		capabilities: FileSystemProviderCapabilities | null,
	): void {
		const scheme = uriComponents.scheme;

		if (!scheme) {
			this._logError(
				"$acceptProviderInfos called with URI components lacking a scheme.",

				uriComponents,
			);

			return;
		}

		// this._log(`RPC $acceptProviderInfos: scheme='${scheme}', new capabilities=${capabilities === null ? "'removed'" : capabilities}`);

		if (capabilities === null) {
			// Provider for this scheme is being unregistered or capabilities cleared.
			if (this._providerCapabilities.delete(scheme)) {
				this._log(`Capabilities for scheme '${scheme}' removed.`);
			}
		} else {
			this._providerCapabilities.set(scheme, capabilities);

			this._log(
				`Capabilities for scheme '${scheme}' updated to: ${capabilities}. Current map size: ${this._providerCapabilities.size}`,
			);
		}

		// Note: `this.extUri`'s behavior is dynamic because its callback calls `this.getCapabilities()`
		// each time it needs to determine case sensitivity. So, no explicit update to `extUri` itself is needed here.
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// No specific event emitters or complex resources in this shim to dispose beyond what base handles.
	}
}
