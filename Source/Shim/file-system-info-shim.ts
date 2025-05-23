/*---------------------------------------------------------------------------------------------
 * Cocoon File System Info Shim (file-system-info-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostFileSystemInfo` service for Cocoon.
 * This service provides information about filesystem provider capabilities,
 *
 *
 * primarily path case sensitivity, which is crucial for URI comparisons and
 * relative path calculations.
 *
 * Responsibilities:
 * - Implementing `getCapabilities(scheme: string)`. For the 'file' scheme, it determines
 *   case sensitivity based on `process.platform`. Other schemes might return default
 *   or undefined capabilities.
 * - Providing the `extUri: IExtUri` instance, configured with the correct
 *   case-sensitivity logic.
 * - Optionally handling `$acceptProviderInfos` RPC calls if dynamic file system
 *   providers were to update their capabilities (less critical for Path A MVP).
 *
 * Key Interactions:
 * - Injected into services like `ShimExtHostWorkspace`.
 * - Uses `process.platform` for 'file' scheme capabilities.
 * - Relies on `ExtUri` and `FileSystemProviderCapabilities` from VS Code's base/platform.
 *--------------------------------------------------------------------------------------------*/

// For Schemas.file
import { Schemas } from "vs/base/common/network";
// For platform check
import { isWindows } from "vs/base/common/platform";
import { ExtUri, type IExtUri } from "vs/base/common/resources";
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import type {
	// RPC Shape
	ExtHostFileSystemInfoShape as VscodeExtHostFileSystemInfoShape,
	// Not directly used in this simplified version
	// UriComponents
} from "vs/workbench/api/common/extHost.protocol";
// Actual VS Code interface
import type { IExtHostFileSystemInfo as VscodeIExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

import {
	BaseCocoonShim,
	ProxyIdentifier,
	type IExtHostRpcService,
	type ILogService,
} from "./_baseShim";

// Ensure local interface matches the one from VS Code if not directly implementing the imported one
// For DI, this class should implement VscodeIExtHostFileSystemInfo
export interface CocoonIExtHostFileSystemInfo
	extends VscodeIExtHostFileSystemInfo {
	// Add any Cocoon-specific extensions if necessary (unlikely for this service)
}

export class ShimExtHostFileSystemInfo
	extends BaseCocoonShim
	implements CocoonIExtHostFileSystemInfo, VscodeExtHostFileSystemInfoShape
{
	public readonly _serviceBrand: undefined;

	// This is crucial
	public readonly extUri: IExtUri;

	// Store capabilities provided by the main thread for schemes other than 'file'.
	// For 'file' scheme, capabilities are determined by process.platform.
	private readonly _providerCapabilities = new Map<
		string,
		FileSystemProviderCapabilities
	>();

	constructor(
		// For $acceptProviderInfos if needed
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostFileSystemInfo", rpcService, logService);

		this._log("Initializing...");

		this.extUri = new ExtUri((uri) => {
			// `uri` here can be `vscode.Uri` or `vs/base/common/uri.URI` depending on caller.
			// `getCapabilities` expects a scheme string.
			// Default to file if scheme is missing
			const scheme = typeof uri.scheme === "string" ? uri.scheme : "file";

			const capabilities = this.getCapabilities(scheme);

			if (capabilities === undefined) {
				// Default for unknown schemes: assume case-sensitive for safety, or consult VS Code defaults.
				// VS Code's ExtUri defaults to case-sensitive if capabilities are unknown.
				// Not ignoring case (i.e., case-sensitive)
				return false;
			}

			return !(
				(
					capabilities &
					FileSystemProviderCapabilities.PathCaseSensitive
				)
				// True if should ignore case
			);
		});

		// Set default capabilities for 'file' scheme based on OS
		this._providerCapabilities.set(
			Schemas.file,

			isWindows
				? // Windows is typically case-insensitive for paths by default
					FileSystemProviderCapabilities.FileReadWrite
				: FileSystemProviderCapabilities.FileReadWrite |
						// Others are case-sensitive
						FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// Add other well-known schemes if their capabilities are fixed for Cocoon
		// e.g., Schemas.untitled might be case-sensitive
		this._providerCapabilities.set(
			Schemas.untitled,

			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);

		// TODO: If this service needs to receive RPC calls (like $acceptProviderInfos), register it.
		// if (this._rpcService) {

		//    this._rpcService.set(ExtHostContext.ExtHostFileSystemInfo as ProxyIdentifier<VscodeExtHostFileSystemInfoShape>, this);

		// }

		this._log(
			`Initialized. 'file' scheme case-sensitive: ${!isWindows}. extUri configured.`,
		);
	}

	// --- IExtHostFileSystemInfo Implementation ---

	public getCapabilities(
		scheme: string,
	): FileSystemProviderCapabilities | undefined {
		// For 'file' scheme, we determine it locally based on OS.
		if (scheme === Schemas.file) {
			return this._providerCapabilities.get(Schemas.file);
		}

		// For other schemes, return what MainThread told us (via $acceptProviderInfos) or undefined.
		// For MVP Cocoon, other schemes are less likely to be dynamically registered with capabilities.
		return this._providerCapabilities.get(scheme);
	}

	// --- ExtHostFileSystemInfoShape RPC Method (called by MainThread) ---
	public $acceptProviderInfos(
		uriComponents: VSCodeInternalUriComponents,

		capabilities: number /* FileSystemProviderCapabilities */ | null,
	): void {
		// URI components should have scheme
		const scheme = uriComponents.scheme;

		this._log(
			`RPC $acceptProviderInfos: scheme='${scheme}', capabilities=${capabilities}`,
		);

		if (capabilities === null) {
			// Unregister or clear capabilities for this scheme
			this._providerCapabilities.delete(scheme);

			this._log(`Capabilities for scheme '${scheme}' removed.`);
		} else {
			this._providerCapabilities.set(
				scheme,

				capabilities as FileSystemProviderCapabilities,
			);

			this._log(
				`Capabilities for scheme '${scheme}' updated to: ${capabilities}`,
			);
		}

		// Note: This doesn't automatically update extUri's behavior if it has already been used
		// to create URI instances with assumptions about case sensitivity.
		// A more robust extUri would re-evaluate or this event should trigger updates where extUri is used.
		// However, extUri's callback *does* call this.getCapabilities(), so it should be dynamic.
	}

	// isFreeScheme was on original ExtHostFileSystemInfo, might not be on IExtHostFileSystemInfo
	// public isFreeScheme(scheme: string): boolean {

	//     return !this._providerCapabilities.has(scheme) && !this._systemSchemes.has(scheme);

	// }
}
