/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim (dialog-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog`.
 * These methods proxy requests to Mountain via direct IPC to display native file dialogs.
 *
 * Responsibilities:
 * - Implementing `showOpenDialog` and `showSaveDialog` APIs.
 * - Marshalling dialog options (e.g., `defaultUri`, `filters`, titles, labels) for IPC.
 * - Sending requests to Mountain (`ui_showOpenDialog`, `ui_showSaveDialog`).
 * - Receiving URI DTOs from Mountain and reviving them to `vscode.Uri`.
 * - Handling user cancellation, `CancellationToken`, and IPC errors.
 *
 * Key Interactions:
 * - Part of `vscode.window` API via API factory.
 * - Uses `BaseCocoonShim` for IPC, marshalling, logging, error refinement.
 * - Relies on Mountain IPC handlers for native dialog display.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	// API URI type
	Uri as VscodeUri,
	type CancellationToken,
	type OpenDialogOptions as VscodeOpenDialogOptions,
	type SaveDialogOptions as VscodeSaveDialogOptions,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions for IPC ---

/**
 * Serializable DTO for `VscodeOpenDialogOptions.filters`.
 * Example: `[{ name: 'Images', extensions: ['png', 'jpg'] }]`
 */
interface FileFilterForIpc {
	name: string;

	extensions: readonly string[];
}

/**
 * Serializable options for `showOpenDialog` sent via IPC to Mountain.
 */
interface OpenDialogOptionsForIpc
	extends Omit<VscodeOpenDialogOptions, "defaultUri" | "filters"> {
	// Marshalled VscodeUri (e.g., UriComponents DTO)
	defaultUri?: any;

	// Serialized filters
	filters?: FileFilterForIpc[];
}

/**
 * Serializable options for `showSaveDialog` sent via IPC to Mountain.
 */
interface SaveDialogOptionsForIpc
	extends Omit<VscodeSaveDialogOptions, "defaultUri" | "filters"> {
	// Marshalled VscodeUri DTO
	defaultUri?: any;

	// Serialized filters
	filters?: FileFilterForIpc[];
}

// Array of UriComponents DTOs or undefined
type OpenDialogResponseFromMountain = any[] | undefined;

// Single UriComponents DTO or undefined
type SaveDialogResponseFromMountain = any | undefined;

/**
 * Defines the service interface for Dialog operations.
 */
export interface IExtHostDialogServiceShape {
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
 * Cocoon's implementation of Dialog services.
 */
export class ShimExtHostDialogService
	extends BaseCocoonShim
	implements IExtHostDialogServiceShape
{
	public readonly _serviceBrand: undefined;

	// 0 for indefinite, as user interaction time is unknown
	private static readonly DEFAULT_DIALOG_TIMEOUT_MS = 0;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDialogService", rpcService, logService);

		this._logDebug("Initialized.");
	}

	protected override _requiresRpc(): boolean {
		// Uses direct IPC
		return false;
	}

	private _serializeFiltersForIpc(filters?: {
		[name: string]: readonly string[];
	}): FileFilterForIpc[] | undefined {
		if (!filters || Object.keys(filters).length === 0) {
			return undefined;
		}

		return Object.entries(filters).map(([name, extensions]) => ({
			name,

			extensions,
		}));
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

		const ipcOptions: OpenDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			// _convertApiArgToInternal should produce UriComponents DTO for VscodeUri
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			delete ipcOptions.defaultUri;
		}

		ipcOptions.filters = this._serializeFiltersForIpc(options?.filters);

		this._logDebug(
			`showOpenDialog: Sending to Mountain via IPC 'ui_showOpenDialog'. Options:`,

			JSON.stringify(ipcOptions).substring(0, 200) + "...",
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showOpenDialog",

				ipcOptions,

				ShimExtHostDialogService.DEFAULT_DIALOG_TIMEOUT_MS,
			)) as OpenDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug("showOpenDialog cancelled post-IPC call.");

				return undefined;
			}

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					"showOpenDialog dismissed by user (Mountain returned undefined/null).",
				);

				return undefined;
			}

			if (!Array.isArray(resultFromMountain)) {
				this._logError(
					"showOpenDialog IPC response was not an array of URI components.",

					"Received:",

					resultFromMountain,
				);

				return undefined;
			}

			const uris: VscodeUri[] = [];

			for (const uriComponent of resultFromMountain) {
				const revivedUri =
					this._reviveApiArgument<VscodeUri>(uriComponent);

				if (revivedUri instanceof VscodeUri) {
					uris.push(revivedUri);
				} else {
					this._logWarn(
						"showOpenDialog: Failed to revive URI component from Mountain's response.",

						"Component:",

						uriComponent,
					);
				}
			}

			return uris.length > 0 ? uris : undefined;
		} catch (e: any) {
			if (token?.isCancellationRequested) {
				this._logDebug(
					"showOpenDialog cancelled during/after IPC error.",
				);

				return undefined;
			}

			this._logError(
				"showOpenDialog IPC request 'ui_showOpenDialog' failed:",

				refineErrorForShim(e, this._logService, "showOpenDialog IPC"),
			);

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

		const ipcOptions: SaveDialogOptionsForIpc = { ...(options || {}) };

		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(
				options.defaultUri,
			);
		} else {
			delete ipcOptions.defaultUri;
		}

		ipcOptions.filters = this._serializeFiltersForIpc(options?.filters);

		this._logDebug(
			`showSaveDialog: Sending to Mountain via IPC 'ui_showSaveDialog'. Options:`,

			JSON.stringify(ipcOptions).substring(0, 200) + "...",
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showSaveDialog",

				ipcOptions,

				ShimExtHostDialogService.DEFAULT_DIALOG_TIMEOUT_MS,
			)) as SaveDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug("showSaveDialog cancelled post-IPC call.");

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
					"showSaveDialog cancelled during/after IPC error.",
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

	public override dispose(): void {
		super.dispose();

		this._logDebug("Disposed.");
	}
}
