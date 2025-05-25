// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/96_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 46ef5a6c508b90f82ac6ae0c4334fd8e874e6cd181b84fe120edfd3fc66a6010
// Extracted to File: Backup/TSFMSC/Code/dialog-service-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.984Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE dialog-service-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim (shims/dialog-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog` APIs.
 * Proxies requests to Mountain for displaying native OS file dialogs.
 *--------------------------------------------------------------------------------------------*/

import type { CancellationToken } from "vscode"; // API type for cancellation
import {
    Uri as VscodeUri, // API type
    // API types for Dialog options
    type OpenDialogOptions as VscodeOpenDialogOptions,
    type SaveDialogOptions as VscodeSaveDialogOptions,
} from "vscode";

import {
    BaseCocoonShim,
    refineError,
    type IExtHostRpcService, // Not directly used for IPC calls here if BaseShim handles it
    type ILogService,
} from "./_baseShim";

// --- Type Definitions ---

// DTOs for IPC to Mountain
// These should be serializable versions of VscodeOpenDialogOptions and VscodeSaveDialogOptions.
// URIs within options (like defaultUri) need to be marshalled.

interface OpenDialogOptionsForIpc extends Omit<VscodeOpenDialogOptions, 'defaultUri'> {
    defaultUri?: any; // Marshalled VscodeUri (e.g., UriComponents from BaseCocoonShim._convertApiArgToInternal)
}

interface SaveDialogOptionsForIpc extends Omit<VscodeSaveDialogOptions, 'defaultUri'> {
    defaultUri?: any; // Marshalled VscodeUri
}

// Response from Mountain for showOpenDialog: array of marshalled VscodeUris or undefined
type OpenDialogResponseFromMountain = any[] | undefined;
// Response from Mountain for showSaveDialog: marshalled VscodeUri or undefined
type SaveDialogResponseFromMountain = any | undefined;


// Interface for the service this shim provides (part of vscode.window)
export interface IExtHostDialogServiceShape {
    readonly _serviceBrand: undefined;
    showOpenDialog(options?: VscodeOpenDialogOptions, token?: CancellationToken): Promise<VscodeUri[] | undefined>;
    showSaveDialog(options?: VscodeSaveDialogOptions, token?: CancellationToken): Promise<VscodeUri | undefined>;
}

export class ShimExtHostDialogService extends BaseCocoonShim implements IExtHostDialogServiceShape {
    public readonly _serviceBrand: undefined;

    constructor(
        rpcService: IExtHostRpcService | undefined, // BaseCocoonShim expects it
        logService: ILogService | undefined,
    ) {
        super("ExtHostDialogService", rpcService, logService);
        this._log("Initialized.");
    }

    async showOpenDialog(options?: VscodeOpenDialogOptions, token?: CancellationToken): Promise<VscodeUri[] | undefined> {
        if (token?.isCancellationRequested) {
            this._log("showOpenDialog cancelled before IPC call.");
            return undefined;
        }

        let ipcOptions: OpenDialogOptionsForIpc = { ...(options || {}) }; // Clone, ensure options is object
        if (options?.defaultUri) {
            ipcOptions.defaultUri = this._convertApiArgToInternal(options.defaultUri);
        } else {
            // Ensure defaultUri is not on ipcOptions if not provided, to avoid sending undefined
            delete ipcOptions.defaultUri;
        }


        this._log(`showOpenDialog: Sending options: ${JSON.stringify(ipcOptions)}`);

        try {
            // Use a long timeout as user interaction is involved (0 means indefinite or very long, controlled by Mountain)
            const result = await this._ipcRequestResponse("ui_showOpenDialog", ipcOptions, 0 ) as OpenDialogResponseFromMountain;

            if (token?.isCancellationRequested) return undefined;
            if (result === undefined || result === null) return undefined; // User cancelled or no selection

            if (!Array.isArray(result)) {
                this._logError("showOpenDialog IPC response was not an array of URI components.", result);
                return undefined;
            }

            const uris: VscodeUri[] = [];
            for (const uriComponent of result) {
                const revivedUri = this._reviveApiArgument<VscodeUri>(uriComponent);
                if (revivedUri instanceof VscodeUri) {
                    uris.push(revivedUri);
                } else {
                    this._logWarn("showOpenDialog: Failed to revive URI component from response:", uriComponent);
                }
            }
            return uris.length > 0 ? uris : undefined;

        } catch (e: any) {
            if (token?.isCancellationRequested) return undefined; // Check cancellation again after await
            this._logError("showOpenDialog IPC failed:", refineError(e, this._logService, "showOpenDialog"));
            // API expects undefined or throws. Let's be consistent with QuickInput and return undefined on IPC error.
            return undefined;
        }
    }

    async showSaveDialog(options?: VscodeSaveDialogOptions, token?: CancellationToken): Promise<VscodeUri | undefined> {
        if (token?.isCancellationRequested) {
            this._log("showSaveDialog cancelled before IPC call.");
            return undefined;
        }

        let ipcOptions: SaveDialogOptionsForIpc = { ...(options || {}) }; // Clone
        if (options?.defaultUri) {
            ipcOptions.defaultUri = this._convertApiArgToInternal(options.defaultUri);
        } else {
            delete ipcOptions.defaultUri;
        }
        
        this._log(`showSaveDialog: Sending options: ${JSON.stringify(ipcOptions)}`);

        try {
            const result = await this._ipcRequestResponse("ui_showSaveDialog", ipcOptions, 0) as SaveDialogResponseFromMountain;

            if (token?.isCancellationRequested) return undefined;
            if (result === undefined || result === null) return undefined; // User cancelled

            const revivedUri = this._reviveApiArgument<VscodeUri>(result);
            if (revivedUri instanceof VscodeUri) {
                return revivedUri;
            } else {
                this._logError("showSaveDialog: Failed to revive URI component from response:", result);
                return undefined;
            }

        } catch (e: any) {
            if (token?.isCancellationRequested) return undefined;
            this._logError("showSaveDialog IPC failed:", refineError(e, this._logService, "showSaveDialog"));
            return undefined;
        }
    }
}
--- END OF FILE dialog-service-shim.ts ---
// --- APPENDED_CONTENT_BELOW ---
// Block SHA256: b8ae3be7721adc2c0998ad3c4ec9efe019118fe2db82bf5f7fd500b3532fa9ae
// Timestamp: 2025-05-25T14:02:57.077Z
// Source Markdown File (Name): 156_MODEL.md
// Source Markdown File (Path): Backup/TSFMSC/Document/156_MODEL.md
// Source Block Index (Overall): 1
// Original Fence Info String: (empty)
// Appended to File: dialog-service-shim.ts (Full path when appended: Backup/TSFMSC/Code/dialog-service-shim.ts)
// ---
--- START OF FILE dialog-service-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Dialog Service Shim (shims/dialog-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showOpenDialog` and `vscode.window.showSaveDialog` APIs.
 * These methods allow extensions to request the display of native operating system
 * file dialogs for opening files/folders or saving files.
 *
 * This shim proxies these requests to the Mountain host process via direct IPC,
 * which is then responsible for invoking the native dialogs.
 *
 * Responsibilities:
 * - Implementing `showOpenDialog` and `showSaveDialog` as defined in `vscode.d.ts`.
 * - Marshalling dialog options (especially `defaultUri`) into a serializable format for IPC.
 * - Sending requests to Mountain (e.g., `ui_showOpenDialog`, `ui_showSaveDialog`) via IPC.
 * - Receiving responses from Mountain (URIs of selected files/folders or save location)
 *   and reviving them into `vscode.Uri` objects.
 * - Handling user cancellation, token cancellation, and IPC errors gracefully by
 *   returning `undefined`.
 *
 * Key Interactions:
 * - Provides parts of the `vscode.window` API namespace, typically made available through
 *   the main API factory in `index.ts`.
 * - Uses `BaseCocoonShim` for common utilities like IPC (`_ipcRequestResponse`),
 *   argument marshalling (`_convertApiArgToInternal`), argument revival (`_reviveApiArgument`),
 *   and logging.
 * - Relies on corresponding handlers in Mountain to display native OS dialogs.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import type { CancellationToken } from "vscode"; // API type for cancellation
import {
	Uri as VscodeUri, // API type for URIs
	// API types for Dialog options
	type OpenDialogOptions as VscodeOpenDialogOptions,
	type SaveDialogOptions as VscodeSaveDialogOptions,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim, // Use the more specific refineError
	type IRpcProtocolServiceAdapter,
	type ILogServiceForShim,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Serializable options for `showOpenDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present.
 */
interface OpenDialogOptionsForIpc extends Omit<VscodeOpenDialogOptions, 'defaultUri'> {
	defaultUri?: any; // Marshalled VscodeUri (e.g., UriComponents from _convertApiArgToInternal)
}

/**
 * Serializable options for `showSaveDialog` sent via IPC to Mountain.
 * `defaultUri` is marshalled if present.
 */
interface SaveDialogOptionsForIpc extends Omit<VscodeSaveDialogOptions, 'defaultUri'> {
	defaultUri?: any; // Marshalled VscodeUri
}

/** Expected response structure from Mountain for `ui_showOpenDialog`. An array of marshalled VscodeUri DTOs, or undefined. */
type OpenDialogResponseFromMountain = any[] | undefined;
/** Expected response structure from Mountain for `ui_showSaveDialog`. A single marshalled VscodeUri DTO, or undefined. */
type SaveDialogResponseFromMountain = any | undefined;


/**
 * Defines the service interface for Dialog operations, part of `vscode.window`.
 */
export interface IExtHostDialogServiceShape {
	readonly _serviceBrand: undefined; // For DI
	showOpenDialog(options?: VscodeOpenDialogOptions, token?: CancellationToken): Promise<VscodeUri[] | undefined>;
	showSaveDialog(options?: VscodeSaveDialogOptions, token?: CancellationToken): Promise<VscodeUri | undefined>;
}

/**
 * Cocoon's implementation of Dialog services (`showOpenDialog`, `showSaveDialog`).
 * It proxies UI interactions to the Mountain host process via direct IPC.
 */
export class ShimExtHostDialogService extends BaseCocoonShim implements IExtHostDialogServiceShape {
	public readonly _serviceBrand: undefined;

	/**
	 * Creates an instance of ShimExtHostDialogService.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDialogService", rpcService, logService);
		this._log("Initialized.");
	}

    /**
     * This shim uses direct IPC and does not strictly require RPC for its core functionality.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	/** {@inheritDoc IExtHostDialogServiceShape.showOpenDialog} */
	async showOpenDialog(options?: VscodeOpenDialogOptions, token?: CancellationToken): Promise<VscodeUri[] | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showOpenDialog cancelled by token before IPC call.");
			return undefined;
		}

		let ipcOptions: OpenDialogOptionsForIpc = { ...(options || {}) }; // Clone to avoid modifying original
		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(options.defaultUri);
		} else {
            // Explicitly delete if not present to avoid sending `defaultUri: undefined`
            delete ipcOptions.defaultUri;
        }

		this._log(`showOpenDialog: Sending options: ${JSON.stringify(ipcOptions)}`);

		try {
			// Use a long timeout (or 0 for indefinite) as user interaction is involved.
			// Mountain should handle the actual dialog timeout if any.
			const resultFromMountain = await this._ipcRequestResponse("ui_showOpenDialog", ipcOptions, 0) as OpenDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
                this._log("showOpenDialog cancelled by token after IPC call.");
                return undefined;
            }
			if (resultFromMountain === undefined || resultFromMountain === null) {
                this._log("showOpenDialog dismissed by user or no selection made.");
                return undefined;
            }

			if (!Array.isArray(resultFromMountain)) {
				this._logError("showOpenDialog IPC response was not an array of URI components as expected.", resultFromMountain);
				return undefined;
			}

			const uris: VscodeUri[] = [];
			for (const uriComponent of resultFromMountain) {
				const revivedUri = this._reviveApiArgument<VscodeUri>(uriComponent);
				if (revivedUri instanceof VscodeUri) {
					uris.push(revivedUri);
				} else {
					this._logWarn("showOpenDialog: Failed to revive URI component from Mountain's response:", uriComponent);
				}
			}
			return uris.length > 0 ? uris : undefined; // Return undefined if no URIs were successfully revived

		} catch (e: any) {
			if (token?.isCancellationRequested) return undefined;
			this._logError("showOpenDialog IPC request failed:", refineErrorForShim(e, this._logService, "showOpenDialog"));
			// API usually returns undefined on UI error/cancellation
			return undefined;
		}
	}

	/** {@inheritDoc IExtHostDialogServiceShape.showSaveDialog} */
	async showSaveDialog(options?: VscodeSaveDialogOptions, token?: CancellationToken): Promise<VscodeUri | undefined> {
		if (token?.isCancellationRequested) {
			this._log("showSaveDialog cancelled by token before IPC call.");
			return undefined;
		}

		let ipcOptions: SaveDialogOptionsForIpc = { ...(options || {}) }; // Clone
		if (options?.defaultUri) {
			ipcOptions.defaultUri = this._convertApiArgToInternal(options.defaultUri);
		} else {
            delete ipcOptions.defaultUri;
        }
        
		this._log(`showSaveDialog: Sending options: ${JSON.stringify(ipcOptions)}`);

		try {
			const resultFromMountain = await this._ipcRequestResponse("ui_showSaveDialog", ipcOptions, 0) as SaveDialogResponseFromMountain;

			if (token?.isCancellationRequested) {
                this._log("showSaveDialog cancelled by token after IPC call.");
                return undefined;
            }
			if (resultFromMountain === undefined || resultFromMountain === null) {
                this._log("showSaveDialog dismissed by user.");
                return undefined;
            }

			const revivedUri = this._reviveApiArgument<VscodeUri>(resultFromMountain);
			if (revivedUri instanceof VscodeUri) {
				return revivedUri;
			} else {
				this._logError("showSaveDialog: Failed to revive URI component from Mountain's response:", resultFromMountain);
				return undefined;
			}

		} catch (e: any) {
			if (token?.isCancellationRequested) return undefined;
			this._logError("showSaveDialog IPC request failed:", refineErrorForShim(e, this._logService, "showSaveDialog"));
			return undefined;
		}
	}

    /**
     * Disposes of resources held by this shim instance.
     */
    public override dispose(): void {
        super.dispose(); // From BaseCocoonShim
        // No specific event emitters or complex resources in this shim to dispose beyond what base handles.
    }
}
--- END OF FILE dialog-service-shim.ts ---