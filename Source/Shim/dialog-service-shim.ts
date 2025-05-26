/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim (shims/dialog-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog` APIs.
 * These methods allow extensions to request the display of native operating system
 * file dialogs for opening files/folders or saving files.
 *
 * This shim proxies these requests to the Mountain host process (main process) via direct IPC,
 *
 *
 * which is then responsible for invoking the native dialogs.
 *
 * Responsibilities:
 * - Implementing `showOpenDialog` and `showSaveDialog` as defined in `vscode.d.ts`.
 * - Marshalling dialog options (especially `defaultUri`) into a serializable format for IPC.
 * - Sending requests to Mountain (e.g., `ui_showOpenDialog`, `ui_showSaveDialog` IPC messages)
 *   using the `_ipcRequestResponse` method from `BaseCocoonShim`.
 * - Receiving responses from Mountain (URIs of selected files/folders or save location)
 *   and reviving them into `vscode.Uri` objects using `_reviveApiArgument`.
 * - Handling user cancellation (dialog dismissed), token cancellation, and IPC errors gracefully
 *   by returning `undefined` as per the API contract.
 *
 * Key Interactions:
 * - Provides parts of the `vscode.window` API namespace, typically made available through
 *   the main API factory in the Cocoon environment (e.g., `index.ts`).
 * - Uses `BaseCocoonShim` for common utilities like IPC, argument marshalling/revival,
 *
 *
 *   and logging.
 * - Relies on corresponding handlers in the Mountain process to display native OS dialogs
 *   and return the results.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	// API type for URIs
	Uri as VscodeUri,
	type CancellationToken,
	// API types for Dialog options
	type OpenDialogOptions as VscodeOpenDialogOptions,
	type SaveDialogOptions as VscodeSaveDialogOptions,
	// API type for cancellation
} from "vscode";

import {
	BaseCocoonShim,
	// Use the shim-specific error refiner
	refineErrorForShim,
	// Specific logger type for shims
	type ILogServiceForShim,
	// Expected by BaseCocoonShim constructor
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Serializable options for `showOpenDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present (e.g., to `UriComponents`).
 */
interface OpenDialogOptionsForIpc
	extends Omit<VscodeOpenDialogOptions, "defaultUri"> {
	// Marshalled VscodeUri (e.g., UriComponents from _convertApiArgToInternal)
	defaultUri?: any;
}

/**
 * Serializable options for `showSaveDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present.
 */
interface SaveDialogOptionsForIpc
	extends Omit<VscodeSaveDialogOptions, "defaultUri"> {
	// Marshalled VscodeUri
	defaultUri?: any;
}

/**
 * Expected response structure from Mountain for `ui_showOpenDialog`.
 * An array of marshalled `vscode.Uri` DTOs (e.g., `UriComponents`), or `undefined` if cancelled.
 */
type OpenDialogResponseFromMountain = any[] | undefined;

/**
 * Expected response structure from Mountain for `ui_showSaveDialog`.
 * A single marshalled `vscode.Uri` DTO, or `undefined` if cancelled.
 */
type SaveDialogResponseFromMountain = any | undefined;

/**
 * Defines the service interface for Dialog operations, part of `vscode.window`.
 * This interface is used for DI (Dependency Injection) if this service is registered.
 */
export interface IExtHostDialogServiceShape {
	// Standard DI mechanism
	readonly _serviceBrand: undefined;

	showOpenDialog(
		options?: VscodeOpenDialogOptions,

		token?: CancellationToken,
	): Promise<VscodeUri[] | undefined>;

	showSaveDialog(
		options?: VscodeSaveDialogOptions,

		token?: CancellationToken,
	): Promise<VscodeUri | undefined>;
}

/**
 * Cocoon's implementation of Dialog services (`showOpenDialog`, `showSaveDialog`).
 * It proxies UI interactions to the Mountain host process via direct IPC calls.
 */
export class ShimExtHostDialogService
	extends BaseCocoonShim
	implements IExtHostDialogServiceShape
{
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimExtHostDialogService.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim, though this shim primarily uses direct IPC).
	 * @param logService The logging service for shim-specific messages.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDialogService", rpcService, logService);

		this._log("Initialized.");
	}

	/**
	 * Indicates whether this shim requires RPC communication.
	 * This shim uses direct IPC (`_ipcRequestResponse`) provided by `BaseCocoonShim`
	 * and does not strictly require the RPC proxy setup for its core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/** {@inheritDoc IExtHostDialogServiceShape.showOpenDialog} */
	async showOpenDialog(
		options?: VscodeOpenDialogOptions,

		token?: CancellationToken,
	): Promise<VscodeUri[] | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showOpenDialog cancelled by token before IPC call.");

			return undefined;
		}

		// Prepare options for IPC: clone to avoid modifying the original, and marshal defaultUri.
		let ipcOptions: OpenDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			// Explicitly delete if not present to avoid sending `defaultUri: undefined` over IPC.
			delete ipcOptions.defaultUri;
		}

		this._log(
			`showOpenDialog: Sending options via IPC: ${JSON.stringify(ipcOptions)}`,
		);

		try {
			// Use a long timeout (0 for indefinite, as user interaction time is unpredictable).
			// Mountain (main process) should handle the actual dialog display and timeout if any.
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showOpenDialog",

				ipcOptions,

				0,
			)) as OpenDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._log(
					"showOpenDialog cancelled by token after IPC call completion.",
				);

				return undefined;
			}

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._log(
					"showOpenDialog dismissed by user or no selection made (Mountain returned undefined/null).",
				);

				return undefined;
			}

			if (!Array.isArray(resultFromMountain)) {
				this._logError(
					"showOpenDialog IPC response was not an array of URI components as expected.",

					{ response: resultFromMountain },
				);

				return undefined;
			}

			// Revive marshalled URI components back into vscode.Uri objects.
			const uris: VscodeUri[] = [];

			for (const uriComponent of resultFromMountain) {
				const revivedUri =
					this._reviveApiArgument<VscodeUri>(uriComponent);

				if (revivedUri instanceof VscodeUri) {
					uris.push(revivedUri);
				} else {
					this._logWarn(
						"showOpenDialog: Failed to revive URI component from Mountain's response:",

						{ component: uriComponent },
					);
				}
			}

			// Return undefined if no URIs were successfully revived or selected.
			return uris.length > 0 ? uris : undefined;
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				// If cancellation happened during or just after the await but before this catch block handled it.
				this._log(
					"showOpenDialog cancelled by token during IPC error handling.",
				);

				return undefined;
			}

			this._logError(
				"showOpenDialog IPC request failed:",

				refineErrorForShim(e, this._logService, "showOpenDialog"),
			);

			// API usually returns undefined on UI error/cancellation.
			return undefined;
		}
	}

	/** {@inheritDoc IExtHostDialogServiceShape.showSaveDialog} */
	async showSaveDialog(
		options?: VscodeSaveDialogOptions,

		token?: CancellationToken,
	): Promise<VscodeUri | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showSaveDialog cancelled by token before IPC call.");

			return undefined;
		}

		let ipcOptions: SaveDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			delete ipcOptions.defaultUri;
		}

		this._log(
			`showSaveDialog: Sending options via IPC: ${JSON.stringify(ipcOptions)}`,
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showSaveDialog",

				ipcOptions,

				0,
			)) as SaveDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._log(
					"showSaveDialog cancelled by token after IPC call completion.",
				);

				return undefined;
			}

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._log(
					"showSaveDialog dismissed by user (Mountain returned undefined/null).",
				);

				return undefined;
			}

			const revivedUri =
				this._reviveApiArgument<VscodeUri>(resultFromMountain);

			if (revivedUri instanceof VscodeUri) {
				return revivedUri;
			} else {
				this._logError(
					"showSaveDialog: Failed to revive URI component from Mountain's response:",

					{ response: resultFromMountain },
				);

				return undefined;
			}
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				this._log(
					"showSaveDialog cancelled by token during IPC error handling.",
				);

				return undefined;
			}

			this._logError(
				"showSaveDialog IPC request failed:",

				refineErrorForShim(e, this._logService, "showSaveDialog"),
			);

			return undefined;
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * Currently, this shim does not hold complex resources requiring explicit disposal
	 * beyond what `BaseCocoonShim` handles.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this._log("Disposed.");
	}
}
