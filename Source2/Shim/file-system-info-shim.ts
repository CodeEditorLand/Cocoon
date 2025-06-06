/*---------------------------------------------------------------------------------------------
 * Cocoon File System Information Shim 
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
 * Last Reviewed/Updated: Based on latest merge timestamp.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from "vs/base/common/network";
import { isWindows } from "vs/base/common/platform";
import { ExtUri, type IExtUri } from "vs/base/common/resources";
import { type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files";
import {
	ExtHostContext,
	type ExtHostFileSystemInfoShape as VscodeExtHostFileSystemInfoShape,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostFileSystemInfo as VscodeIExtHostFileSystemInfo } from "vs/workbench/api/common/extHostFileSystemInfo";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
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
	public readonly _serviceBrand: undefined;
	public readonly extUri: IExtUri;
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
			const scheme = uriComponentsToCheck.scheme || Schemas.file;
			const capabilities = this.getCapabilities(scheme); // Use the public getter

			if (capabilities === undefined) {
				this._logService?.trace(
					`[ExtUri Callback] No explicit capabilities for scheme '${scheme}', defaulting to case-sensitive.`,
				);
				return false; // Default to case-sensitive (do NOT ignore case)
			}
			const ignoreCase = !(
				capabilities & FileSystemProviderCapabilities.PathCaseSensitive
			);
			this._logService?.trace(
				`[ExtUri Callback] Scheme '${scheme}', PathCaseSensitive flag: ${!!(capabilities & FileSystemProviderCapabilities.PathCaseSensitive)}. extUri will ignoreCase: ${ignoreCase}.`,
			);
			return ignoreCase;
		});

		// Set default capabilities for known schemes. These can be overridden by Mountain.
		this._providerCapabilities.set(
			Schemas.untitled,
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);
		this._providerCapabilities.set(
			Schemas.vscodeInteractiveInput,
			FileSystemProviderCapabilities.FileReadWrite |
				FileSystemProviderCapabilities.PathCaseSensitive,
		);
		// The 'file' scheme capabilities are derived by getCapabilities if not explicitly set by Mountain.

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostFileSystemInfo,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostContext.ExtHostFileSystemInfo).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self for RPC (ExtHostFileSystemInfo):",
					e,
				);
			}
		} else {
			this._logWarn(
				"RPCService not available. Dynamic updates to filesystem provider capabilities via $acceptProviderInfos will not be possible.",
			);
		}

		this._logInfo(
			`Initialized. Default 'file' scheme capabilities will be derived from OS if not updated by Mountain. 'extUri' instance is configured.`,
		);
	}

	public getCapabilities(
		scheme: string,
	): FileSystemProviderCapabilities | undefined {
		const capabilities = this._providerCapabilities.get(scheme);
		if (capabilities !== undefined) {
			return capabilities;
		}
		// If not in map, derive for 'file' scheme, otherwise undefined.
		if (scheme === Schemas.file) {
			const fileCapabilities = isWindows
				? FileSystemProviderCapabilities.FileReadWrite // Case-insensitive by default
				: FileSystemProviderCapabilities.FileReadWrite |
					FileSystemProviderCapabilities.PathCaseSensitive; // Case-sensitive
			this._logService?.trace(
				`[getCapabilities] Derived capabilities for 'file' scheme (OS: ${isWindows ? "Windows" : "Non-Windows"}): ${fileCapabilities}`,
			);
			return fileCapabilities;
		}
		return undefined;
	}

	public $acceptProviderInfos(
		uriComponentsDto: VSCodeInternalUriComponents,
		capabilities: FileSystemProviderCapabilities | null,
	): void {
		let scheme: string;
		try {
			if (
				uriComponentsDto &&
				typeof uriComponentsDto.scheme === "string" &&
				uriComponentsDto.scheme.trim().length > 0
			) {
				scheme = uriComponentsDto.scheme;
			} else {
				this._logError(
					"$acceptProviderInfos RPC: Invalid URI components DTO (no valid 'scheme').",
					"DTO:",
					uriComponentsDto,
				);
				return;
			}
		} catch (e) {
			this._logError(
				"$acceptProviderInfos RPC: Error processing URI components DTO.",
				"DTO:",
				uriComponentsDto,
				"Error:",
				e,
			);
			return;
		}

		this._logService?.trace(
			`RPC $acceptProviderInfos: Updating capabilities for scheme='${scheme}'. New Capabilities = ${capabilities === null ? "'cleared/removed'" : capabilities}`,
		);

		if (capabilities === null) {
			if (this._providerCapabilities.delete(scheme)) {
				this._logInfo(
					`Capabilities for URI scheme '${scheme}' were removed/cleared based on update from MainThread.`,
				);
			} else {
				this._logService?.trace(
					`$acceptProviderInfos: Scheme '${scheme}' received null capabilities, but no prior capabilities were stored for it (or it was using defaults like 'file').`,
				);
			}
		} else {
			this._providerCapabilities.set(scheme, capabilities);
			this._logInfo(
				`Capabilities for URI scheme '${scheme}' were updated from MainThread to: ${capabilities}. Total explicitly known schemes: ${this._providerCapabilities.size}.`,
			);
		}
	}

	public override dispose(): void {
		super.dispose();
		this._providerCapabilities.clear();
		this._logInfo("Disposed and cleared provider capabilities cache.");
	}
}
