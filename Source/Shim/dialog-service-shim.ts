/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim (dialog-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog` APIs.
 * These methods allow extensions to request the display of native operating system
 * file dialogs for opening files/folders or saving files.
 *
 * This shim proxies these requests to the Mountain host process via direct IPC calls, * which is then responsible for invoking the native dialogs and returning the user's selection.
 *
 * Responsibilities:
 * - Implementing `showOpenDialog(options?, token?)` and `showSaveDialog(options?, token?)`
 *   as defined in the `vscode.d.ts` API specification.
 * - Marshalling dialog options (e.g., `VscodeOpenDialogOptions`, `VscodeSaveDialogOptions`), *   paying special attention to `defaultUri` which needs conversion to a serializable DTO, *   into a format suitable for IPC.
 * - Sending these marshalled options to Mountain using the `_ipcRequestResponse` helper
 *   from `BaseCocoonShim` (e.g., to IPC methods like `ui_showOpenDialog`, `ui_showSaveDialog`).
 * - Receiving responses from Mountain, which typically consist of URI DTOs (for selected
 *   files/folders or the save location), and reviving them into `vscode.Uri` objects
 *   using `_reviveApiArgument` from `BaseCocoonShim`.
 * - Gracefully handling user cancellation (dialog dismissed without selection), *   `CancellationToken` cancellation, and IPC errors by returning `undefined` as per
 *   the API contract.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostDialogService` is typically made available as part of the
 *   `vscode.window` API namespace through the main API factory provider in `Cocoon/index.ts`.
 * - Uses `BaseCocoonShim` for common utilities:
 *   - `_ipcRequestResponse` for direct IPC communication.
 *   - `_convertApiArgToInternal` for marshalling `defaultUri`.
 *   - `_reviveApiArgument` for unmarshalling URI DTOs in responses.
 *   - Logging methods for tracing operations and errors.
 *   - `refineErrorForShim` for consistent error handling.
 * - Relies on corresponding IPC handlers implemented in the Mountain host process to
 *   display native OS dialogs and return the results.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	// vscode.Uri API type
	Uri as VscodeUri,
	type CancellationToken,
	// API types for Dialog options
	type OpenDialogOptions as VscodeOpenDialogOptions,
	type SaveDialogOptions as VscodeSaveDialogOptions,
} from "vscode";

// vscode.CancellationToken API type

import {
	BaseCocoonShim,
	// Use the more specific error refiner from BaseCocoonShim
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Serializable options for `showOpenDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present. Other complex or function-based options
 * from `VscodeOpenDialogOptions` might need to be omitted or specially handled if added in the future.
 */
interface OpenDialogOptionsForIpc
	extends Omit<VscodeOpenDialogOptions, "defaultUri"> {
	// Marshalled VscodeUri (e.g., UriComponents DTO from _convertApiArgToInternal)
	defaultUri?: any;
}

/**
 * Serializable options for `showSaveDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present.
 */
interface SaveDialogOptionsForIpc
	extends Omit<VscodeSaveDialogOptions, "defaultUri"> {
	// Marshalled VscodeUri DTO
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
 * Defines the service interface for Dialog operations, typically part of `vscode.window`.
 * This interface is used for Dependency Injection if this service is registered.
 */
export interface IExtHostDialogServiceShape {
	// Standard DI mechanism for VS Code services
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

		// Use _logDebug for routine initialization.
		this._logDebug("Initialized.");
	}

	/**
	 * This shim uses direct IPC (`_ipcRequestResponse`) provided by `BaseCocoonShim`
	 * and does not strictly require the main RPC proxy setup for its core dialog functionality.
	 * @returns `false` as RPC is not required for core functionality.
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
			this._logDebug(
				"showOpenDialog cancelled by token before IPC call.",
			);

			return undefined;
		}

		// Clone options to avoid modifying the original, and marshal defaultUri if present.
		let ipcOptions: OpenDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			// Explicitly delete if not present to avoid sending `{ defaultUri: undefined }` over IPC.
			delete ipcOptions.defaultUri;
		}

		this._logDebug(
			`showOpenDialog: Sending options via IPC 'ui_showOpenDialog': ${JSON.stringify(ipcOptions)}`,
		);

		try {
			// Use a long timeout (or 0 for indefinite, if supported by IPC layer) as user interaction time is unpredictable.
			// Mountain (main process) should handle the actual dialog display and its own timeout logic if any.
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showOpenDialog",

				ipcOptions,

				0,
			)) as OpenDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showOpenDialog cancelled by token after IPC call completion but before processing result.",
				);

				return undefined;
			}

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					"showOpenDialog dismissed by user or no selection made (Mountain returned undefined/null).",
				);

				return undefined;
			}

			if (!Array.isArray(resultFromMountain)) {
				this._logError(
					"showOpenDialog IPC response was not an array of URI components as expected.",

					"Received:",

					resultFromMountain,
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
						"showOpenDialog: Failed to revive URI component from Mountain's response. Skipping this item.",

						"Component:",

						uriComponent,
					);
				}
			}

			// Return undefined if no URIs were successfully revived or if the array was empty (though Mountain should return undefined for no selection).
			return uris.length > 0 ? uris : undefined;
		} catch (e: any) {
			// Check cancellation token again after await, in case it was cancelled during the IPC call.
			if (token?.isCancellationRequested) {
				this._logDebug(
					"showOpenDialog cancelled by token during or after IPC error.",
				);

				return undefined;
			}

			this._logError(
				"showOpenDialog IPC request 'ui_showOpenDialog' failed:",

				refineErrorForShim(e, this._logService, "showOpenDialog IPC"),
			);

			// The API contract for showOpenDialog is to return undefined on UI error or user cancellation.
			return undefined;
		}
	}

	/** {@inheritDoc IExtHostDialogServiceShape.showSaveDialog} */
	async showSaveDialog(
		options?: VscodeSaveDialogOptions,

		token?: CancellationToken,
	): Promise<VscodeUri | undefined> {
		if (token?.isCancellationRequested) {
			this._logDebug(
				"showSaveDialog cancelled by token before IPC call.",
			);

			return undefined;
		}

		// Clone
		let ipcOptions: SaveDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			delete ipcOptions.defaultUri;
		}

		this._logDebug(
			`showSaveDialog: Sending options via IPC 'ui_showSaveDialog': ${JSON.stringify(ipcOptions)}`,
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showSaveDialog",

				ipcOptions,

				0,
			)) as SaveDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showSaveDialog cancelled by token after IPC call completion but before processing result.",
				);

				return undefined;
			}

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
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
					"showSaveDialog: Failed to revive URI component from Mountain's response.",

					"Received:",

					resultFromMountain,
				);

				return undefined;
			}
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				this._logDebug(
					"showSaveDialog cancelled by token during or after IPC error.",
				);

				return undefined;
			}

			this._logError(
				"showSaveDialog IPC request 'ui_showSaveDialog' failed:",

				refineErrorForShim(e, this._logService, "showSaveDialog IPC"),
			);

			return undefined;
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * Currently, this shim does not hold complex resources requiring explicit disposal
	 * beyond what `BaseCocoonShim` handles (like `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this._logDebug("Disposed.");
	}
}
