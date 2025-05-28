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
 * where the Cocoon sidecar is executing, unless explicitly overridden by Mountain.
 * For other URI schemes, this service receives and stores capability
 * updates (including case sensitivity information) from the Mountain host process via RPC.
 *
 * A key feature provided by this service is the `extUri` property. This is an instance
 * of VS Code's `ExtUri` utility class, which is pre-configured to use the case sensitivity
 * rules managed by this `ShimExtHostFileSystemInfo` service. All URI path manipulations,
 *
 * comparisons, and relative path calculations within the extension host should ideally
 * use this `extUri` instance to ensure correctness according to the underlying filesystem's
 * (or provider's) characteristics for a given scheme.
 *
 * Responsibilities:
 * - Implementing the `IExtHostFileSystemInfo` interface (from VS Code platform/workbench).
 * - Implementing the `ExtHostFileSystemInfoShape` (from `extHost.protocol.ts`) to handle
 *   RPC calls from the MainThread (Mountain).
 * - Providing the `getCapabilities(scheme: string)` method:
 *     - It returns capabilities that have been previously communicated by Mountain through
 *       the `$acceptProviderInfos` RPC method or pre-set defaults.
 * - Instantiating and exposing `extUri: IExtUri`. The `ExtUri` instance is configured
 *   with a callback that dynamically consults this service to determine
 *   whether path casing should be ignored for URI operations on a given scheme.
 *   For the 'file' scheme, if not explicitly set by Mountain, it defaults based on the host OS.
 * - Handling the `$acceptProviderInfos(uriComponents, capabilities)` RPC call from Mountain.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostFileSystemInfo` is registered with Dependency Injection
 *   in `Cocoon/index.ts`.
 * - It is a crucial dependency for other ExtHost services that perform URI operations.
 * - Uses `isWindows` from `vs/base/common/platform` for default 'file' scheme capabilities.
 * - Relies on `ExtUri` class and `FileSystemProviderCapabilities` enum from VS Code.
 * - Receives RPC calls from Mountain via `$acceptProviderInfos`.
 *
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from "vs/base/common/network"; // For standard URI schemes
import { isWindows } from "vs/base/common/platform"; // For OS platform check
import { ExtUri, type IExtUri } from "vs/base/common/resources"; // VS Code's advanced URI utility
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri"; // For RPC DTO type
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files"; // Enum for capabilities
import {
	ExtHostContext, // Used to register this service for RPC calls
	type ExtHostFileSystemInfoShape as VscodeExtHostFileSystemInfoShape,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostFileSystemInfo as VscodeIExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo"; // Target interface

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

/** Cocoon's implementation of `IExtHostFileSystemInfo`. */
export class ShimExtHostFileSystemInfo
	extends BaseCocoonShim
	implements VscodeIExtHostFileSystemInfo, VscodeExtHostFileSystemInfoShape
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service type system
	public readonly extUri: IExtUri; // Advanced URI utility instance

	// Internal cache: Map<URI_scheme_string, FileSystemProviderCapabilities_bitmask>
	private readonly _providerCapabilities = new Map<
		string,
		FileSystemProviderCapabilities
	>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostFileSystemInfo", rpcService, logService);
		this._logInfo("Initializing...");

		this.extUri = new ExtUri((uriComponentsToCheck) => {
			const scheme = uriComponentsToCheck.scheme || Schemas.file; // Default to 'file' if scheme is missing
			const capabilities = this._providerCapabilities.get(scheme);

			if (capabilities !== undefined) {
				// If capabilities are explicitly set (by Mountain or defaults below), use them.
				// ignoreCase is true if PathCaseSensitive is NOT set.
				return !(
					capabilities &
					FileSystemProviderCapabilities.PathCaseSensitive
				);
			}

			// If capabilities for the scheme are not in our map:
			if (scheme === Schemas.file) {
				// For 'file' scheme, if not explicitly set, default based on OS.
				// On Windows, ignore case (true). On others, respect case (false).
				this._logService?.trace(
					`[ExtUri Callback] No explicit capabilities for 'file' scheme, defaulting based on OS (isWindows: ${isWindows}).`,
				);
				return isWindows;
			}

			// For other unknown schemes, ExtUri's own default is case-sensitive (ignoreCase: false).
			// Returning undefined from this callback would also make ExtUri use its default.
			// By returning false, we explicitly make unknown schemes case-sensitive via our callback.
			this._logService?.trace(
				`[ExtUri Callback] No explicit capabilities for scheme '${scheme}', defaulting to case-sensitive.`,
			);
			return false;
		});

		// Set initial default capabilities for common schemes.
		// These can be overridden by `$acceptProviderInfos` from Mountain.
		this._providerCapabilities.set(
			Schemas.untitled, // "untitled"
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);
		this._providerCapabilities.set(
			Schemas.vscodeInteractiveInput, // "vscode-interactive-input"
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);
		// Note: 'file' scheme defaults are handled by the extUri callback if not explicitly set by Mountain.

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostFileSystemInfo as ProxyIdentifier<VscodeExtHostFileSystemInfoShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostFileSystemInfo).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self for RPC (ExtHostFileSystemInfo):",
					e,
				);
			}
		} else {
			this._logWarn(
				"RPCService unavailable. Dynamic updates to filesystem provider capabilities from Mountain will not be possible.",
			);
		}

		this._logInfo(
			`Initialized. 'extUri' instance configured. Default 'file' scheme handling based on OS (isWindows: ${isWindows}) unless overridden by Mountain.`,
		);
	}

	public getCapabilities(
		scheme: string,
	): FileSystemProviderCapabilities | undefined {
		const capabilities = this._providerCapabilities.get(scheme);
		if (capabilities !== undefined) {
			return capabilities;
		}
		// If not in map, provide dynamic default for 'file' scheme.
		if (scheme === Schemas.file) {
			return isWindows
				? FileSystemProviderCapabilities.FileReadWrite // Case-insensitive by default on Windows
				: FileSystemProviderCapabilities.FileReadWrite |
						FileSystemProviderCapabilities.PathCaseSensitive; // Case-sensitive otherwise
		}
		return undefined; // Unknown for other schemes not in map.
	}

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
				"$acceptProviderInfos RPC: Invalid URI components DTO (no valid 'scheme').",
				"DTO:",
				uriComponents,
			);
			return;
		}

		this._logDebug(
			`RPC $acceptProviderInfos: Scheme='${scheme}', New Capabilities=${capabilities === null ? "'cleared/removed'" : capabilities}`,
		);

		if (capabilities === null) {
			// Provider for this scheme is being unregistered or capabilities cleared.
			if (this._providerCapabilities.delete(scheme)) {
				this._logInfo(
					`Capabilities for URI scheme '${scheme}' removed per MainThread update.`,
				);
			}
		} else {
			this._providerCapabilities.set(scheme, capabilities);
			this._logInfo(
				`Capabilities for URI scheme '${scheme}' updated from MainThread to: ${capabilities}.`,
			);
		}
		// this.extUri will dynamically use these updated capabilities.
	}

	public override dispose(): void {
		super.dispose();
		this._providerCapabilities.clear();
		this._logInfo("Disposed and cleared provider capabilities cache.");
	}
}
