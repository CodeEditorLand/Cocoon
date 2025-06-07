/*
 * File: Cocoon/Source/Shim/DialogService.ts
 * Responsibility: Implements the VS Code dialog API methods, acting as a shim to proxy open/save dialog requests to the native Mountain backend for display using system-native UI elements.
 * Modified: 2025-06-07 00:57:44 UTC
 * Dependency: vs/base/common/uri
 * Export: IExtHostDialogServiceShape, ShimExtHostDialogService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog`.
 * These methods proxy requests to Mountain via direct IPC to display native file dialogs.
 *
 * Responsibilities:
 * - Implementing `showOpenDialog` and `showSaveDialog` APIs.
 * - Marshalling dialog options (e.g., `defaultUri`, `filters`, titles, labels) for IPC.
 *   `defaultUri` (a `VscodeUri`) is converted to `UriComponents` DTO.
 *   `filters` (`{ [name: string]: readonly string[] }`) are converted to
 *   `{ name: string, extensions: readonly string[] }[]`.
 * - Sending requests to Mountain (`ui_showOpenDialog`, `ui_showSaveDialog`) via IPC.
 * - Receiving URI DTOs from Mountain and reviving them to `vscode.Uri`.
 * - Handling user cancellation, `CancellationToken`, and IPC errors gracefully by returning
 *   `undefined` as per the API contract.
 *
 * Key Interactions:
 * - Part of `vscode.window` API via API factory.
 * - Uses `BaseCocoonShim` for IPC, marshalling, logging, error refinement.
 * - Relies on Mountain IPC handlers for native dialog display.
 *
 * IPC Contract with Mountain (Assumed):
 * - Method "ui_showOpenDialog":
 *   - Cocoon Params: `OpenDialogOptionsForIpc`
 *   - Mountain Response (Success): `{ params: UriComponentsDto[] | null | undefined }`
 *   - Mountain Response (Error): VineErrorPayload
 * - Method "ui_showSaveDialog":
 *   - Cocoon Params: `SaveDialogOptionsForIpc`
 *   - Mountain Response (Success): `{ params: UriComponentsDto | null | undefined }`
 *   - Mountain Response (Error): VineErrorPayload
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For URI DTOs
import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import {
	// API URI type
	Uri as VscodeUri,
	type CancellationToken,
	type OpenDialogOptions as VscodeOpenDialogOptions,
	type SaveDialogOptions as VscodeSaveDialogOptions,
} from "vscode";

import {
	BaseCocoonShim,
	// refineErrorForShim, // refineErrorForShim is used internally by _ipcRequestResponse
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions for IPC ---

/**
 * Serializable DTO for `VscodeOpenDialogOptions.filters`.
 * Example: `[{ name: 'Images', extensions: ['png', 'jpg'] }]`
 * This matches VS Code's internal `IFileDialogFilter`.
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
	defaultUri?: VSCodeInternalUriComponents; // Marshalled VscodeUri
	filters?: FileFilterForIpc[]; // Serialized filters
}

/**
 * Serializable options for `showSaveDialog` sent via IPC to Mountain.
 */
interface SaveDialogOptionsForIpc
	extends Omit<VscodeSaveDialogOptions, "defaultUri" | "filters"> {
	defaultUri?: VSCodeInternalUriComponents; // Marshalled VscodeUri DTO
	filters?: FileFilterForIpc[]; // Serialized filters
}

// Array of UriComponents DTOs or undefined/null
type OpenDialogResponseFromMountain =
	| VSCodeInternalUriComponents[]
	| null
	| undefined;
// Single UriComponents DTO or undefined/null
type SaveDialogResponseFromMountain =
	| VSCodeInternalUriComponents
	| null
	| undefined;

/** Defines the service interface for Dialog operations. */
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

/** Cocoon's implementation of Dialog services. */
export class ShimExtHostDialogService
	extends BaseCocoonShim
	implements IExtHostDialogServiceShape
{
	public readonly _serviceBrand: undefined;
	private static readonly DEFAULT_DIALOG_TIMEOUT_MS = 0; // 0 for indefinite, as user interaction time is unknown

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDialogService", rpcService, logService);
		this._logDebug("Initialized.");
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Uses direct IPC

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
			const defaultUriDto = this._convertApiArgToInternal(
				options.defaultUri,
			);
			if (
				defaultUriDto &&
				typeof defaultUriDto === "object" &&
				"scheme" in defaultUriDto
			) {
				ipcOptions.defaultUri =
					defaultUriDto as VSCodeInternalUriComponents;
			} else {
				this._logWarn(
					"Failed to marshal defaultUri for showOpenDialog, it will be omitted.",
					"Input URI:",
					options.defaultUri,
					"Marshalled:",
					defaultUriDto,
				);
				delete ipcOptions.defaultUri;
			}
		} else {
			delete ipcOptions.defaultUri;
		}
		ipcOptions.filters = this._serializeFiltersForIpc(options?.filters);

		this._logDebug(
			`showOpenDialog: Sending to Mountain via IPC 'ui_showOpenDialog'. Options (summary):`,
			JSON.stringify({
				...ipcOptions,
				defaultUri: ipcOptions.defaultUri
					? `Scheme: ${ipcOptions.defaultUri.scheme}`
					: "none",
				filters: ipcOptions.filters
					? `${ipcOptions.filters.length} filter(s)`
					: "none",
			}).substring(0, 250) + "...",
		);

		try {
			// The result from _ipcRequestResponse is already the `params` field of the IPC message.
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showOpenDialog",
				ipcOptions, // Send the whole options object as the single param for Mountain
				ShimExtHostDialogService.DEFAULT_DIALOG_TIMEOUT_MS,
			)) as OpenDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showOpenDialog cancelled post-IPC call before result processing.",
				);
				return undefined;
			}
			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					"showOpenDialog dismissed by user or no selection (Mountain returned undefined/null).",
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
				// BaseCocoonShim._reviveApiArgument handles the conversion from DTO to VscodeUri
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
			// Error is already refined by _ipcRequestResponse to be an Error instance
			this._logError(
				"showOpenDialog IPC request 'ui_showOpenDialog' failed:",
				e as Error, // refineErrorForShim is implicitly called by _ipcRequestResponse
			);
			return undefined; // API contract: return undefined on UI error
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
			const defaultUriDto = this._convertApiArgToInternal(
				options.defaultUri,
			);
			if (
				defaultUriDto &&
				typeof defaultUriDto === "object" &&
				"scheme" in defaultUriDto
			) {
				ipcOptions.defaultUri =
					defaultUriDto as VSCodeInternalUriComponents;
			} else {
				this._logWarn(
					"Failed to marshal defaultUri for showSaveDialog, it will be omitted.",
					"Input URI:",
					options.defaultUri,
					"Marshalled:",
					defaultUriDto,
				);
				delete ipcOptions.defaultUri;
			}
		} else {
			delete ipcOptions.defaultUri;
		}
		ipcOptions.filters = this._serializeFiltersForIpc(options?.filters);

		this._logDebug(
			`showSaveDialog: Sending to Mountain via IPC 'ui_showSaveDialog'. Options (summary):`,
			JSON.stringify({
				...ipcOptions,
				defaultUri: ipcOptions.defaultUri
					? `Scheme: ${ipcOptions.defaultUri.scheme}`
					: "none",
				filters: ipcOptions.filters
					? `${ipcOptions.filters.length} filter(s)`
					: "none",
			}).substring(0, 250) + "...",
		);

		try {
			const resultFromMountain = (await this._ipcRequestResponse(
				"ui_showSaveDialog",
				ipcOptions,
				ShimExtHostDialogService.DEFAULT_DIALOG_TIMEOUT_MS,
			)) as SaveDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
				this._logDebug(
					"showSaveDialog cancelled post-IPC call before result processing.",
				);
				return undefined;
			}
			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					"showSaveDialog dismissed by user or no selection (Mountain returned undefined/null).",
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
				e as Error,
			);
			return undefined; // API contract: return undefined on UI error
		}
	}

	public override dispose(): void {
		super.dispose();
		this._logDebug("Disposed.");
	}
}
