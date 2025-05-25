// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/92_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 9783d5596cfffad49f0ff042e008f81c115698ca5ec158d2f342dc620d9681ae
// Extracted to File: Backup/TSFMSC/Code/message-service-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:56.978Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE message-service-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Message Service Shim (shims/message-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showInformationMessage`, `showWarningMessage`,
 * and `showErrorMessage` APIs, providing the functionality for extensions to display
 * notifications to the user.
 *
 * This service proxies these calls to the Mountain host process.
 *--------------------------------------------------------------------------------------------*/

import {
    // For RPC if used with MainThreadMessageService
    // MainContext,
    // MainThreadMessageServiceShape as VscodeMainThreadMessageServiceShape, // Example if using strict shapes
    Severity // VS Code's Severity enum for mapping
} from "vs/platform/notification/common/notification"; // Assuming Severity is here
import type {
    MessageItem as VscodeMessageItem,
    MessageOptions as VscodeMessageOptions,
} from "vscode"; // API types

import {
    BaseCocoonShim,
    refineError,
    type IExtHostRpcService,
    type ILogService,
    type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

// NotificationSeverity matches values used in previous ShimExtHostUiAndEnv for IPC
enum NotificationSeverityForIpc {
	Ignore = 0,
	Info = 1,
	Warning = 2,
	Error = 3,
}

// If using RPC, this would be the shape of MainThreadMessageService
// interface MainThreadMessageServiceProxyShape {
//     $showMessage(
//         severity: Severity,
//         message: string,
//         options: VscodeMessageOptions, // Or a DTO
//         items: ({ title: string, handle: number, isCloseAffordance?: boolean })[] // Items with handles for callback
//     ): Promise<number | undefined>; // Returns selected item handle
// }

export interface IExtHostMessageServiceInterface {
    readonly _serviceBrand: undefined;
    showInformationMessage(message: string, ...args: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined>;
    showWarningMessage(message: string, ...args: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined>;
    showErrorMessage(message: string, ...args: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined>;
    // TODO: Add withProgress if it's part of this service in VS Code
}

export class ShimExtHostMessageService extends BaseCocoonShim implements IExtHostMessageServiceInterface {
    public readonly _serviceBrand: undefined;
    // #mainThreadMessageServiceProxy: MainThreadMessageServiceProxyShape | null = null;

    constructor(
        rpcService: IExtHostRpcService | undefined, // Optional for direct IPC, required for RPC proxy
        logService: ILogService | undefined,
    ) {
        super("ExtHostMessageService", rpcService, logService);
        this._log("Initialized.");

        // if (this._rpcService) {
        //     this.#mainThreadMessageServiceProxy = this._getProxy(
        //         MainContext.MainThreadMessageService as ProxyIdentifier<MainThreadMessageServiceProxyShape>
        //     );
        // }
        // if (!this.#mainThreadMessageServiceProxy) {
        //     this._logWarn("MainThreadMessageService proxy NOT available. Messages will use direct IPC if available, or fail.");
        // }
    }

    private _parseMessageArgs(rest: (VscodeMessageOptions | string | VscodeMessageItem)[]): {
        options: VscodeMessageOptions;
        items: (string | VscodeMessageItem)[];
    } {
        let options: VscodeMessageOptions = {};
        const items: (string | VscodeMessageItem)[] = [];

        if (rest.length > 0) {
            // Check if the first arg is MessageOptions (and not a MessageItem string/object)
            // A MessageItem object must have a 'title' string property.
            if (typeof rest[0] === 'object' && rest[0] !== null &&
                !(typeof (rest[0] as VscodeMessageItem).title === 'string')
            ) {
                options = rest.shift() as VscodeMessageOptions;
            }
            // Remaining args are items (string or VscodeMessageItem objects)
            for (const itemCandidate of rest) {
                if (typeof itemCandidate === 'string') {
                    items.push(itemCandidate);
                } else if (typeof itemCandidate === 'object' && itemCandidate !== null && typeof itemCandidate.title === 'string') {
                    items.push(itemCandidate as VscodeMessageItem);
                } else {
                    this._logWarn("Invalid message item in showMessage arguments, skipping:", itemCandidate);
                }
            }
        }
        return { options, items };
    }

    private async _showMessage(
        severityForIpc: NotificationSeverityForIpc,
        message: string,
        options: VscodeMessageOptions,
        items: (string | VscodeMessageItem)[]
    ): Promise<string | VscodeMessageItem | undefined> {
        const ipcMethodName = "ui_showMessage"; // Matches direct IPC method previously used
        const itemsForIpc = items.map((item, index) => ({
            title: typeof item === 'string' ? item : item.title,
            handle: index, // Simple handle for now, Mountain can use this to report back
            isCloseAffordance: typeof item === 'object' ? !!item.isCloseAffordance : false,
        }));

        const params = {
            severity: severityForIpc,
            message,
            options: { modal: options.modal, detail: options.detail }, // Send relevant options
            items: itemsForIpc, // Send structured items for Mountain to display as buttons
        };

        this._log(`_showMessage (IPC: ${ipcMethodName}): Sev=${NotificationSeverityForIpc[severityForIpc]}, Msg="${message.substring(0,50)}...", Items=${itemsForIpc.length}`);

        try {
            // Using direct IPC method `_ipcRequestResponse` inherited from BaseCocoonShim
            // Mountain might return the handle (index) or the title of the selected item.
            const resultHandleOrTitle = await this._ipcRequestResponse(ipcMethodName, params, 300000) as number | string | undefined;

            if (resultHandleOrTitle === undefined || resultHandleOrTitle === null) {
                return undefined; // No selection or dialog dismissed
            }

            if (typeof resultHandleOrTitle === 'number') { // Mountain returned a handle (index)
                const selectedItemDto = itemsForIpc.find(item => item.handle === resultHandleOrTitle);
                if (selectedItemDto) {
                    // Find the original VscodeMessageItem or string from the `items` array
                    return items.find(origItem => (typeof origItem === 'string' ? origItem : origItem.title) === selectedItemDto.title);
                }
            } else if (typeof resultHandleOrTitle === 'string') { // Mountain returned the title string
                 const selectedItem = items.find(origItem => (typeof origItem === 'string' ? origItem : origItem.title) === resultHandleOrTitle);
                 return selectedItem || resultHandleOrTitle; // Return item if matched, else the title itself (though API expects MessageItem if object was passed)
            }
            this._logWarn("Unexpected response type from ui_showMessage:", resultHandleOrTitle);
            return undefined; // Fallback
        } catch (e: any) {
            this._logError(`IPC call to ${ipcMethodName} failed:`, refineError(e, this._logService, ipcMethodName));
            // Do not rethrow, as showMessage in vscode.d.ts typically returns undefined on failure/dismissal by user
            return undefined;
        }
    }

    public showInformationMessage(message: string, ...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined> {
        const { options, items } = this._parseMessageArgs(rest);
        return this._showMessage(NotificationSeverityForIpc.Info, message, options, items);
    }

    public showWarningMessage(message: string, ...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined> {
        const { options, items } = this._parseMessageArgs(rest);
        return this._showMessage(NotificationSeverityForIpc.Warning, message, options, items);
    }

    public showErrorMessage(message: string, ...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]): Promise<string | VscodeMessageItem | undefined> {
        const { options, items } = this._parseMessageArgs(rest);
        return this._showMessage(NotificationSeverityForIpc.Error, message, options, items);
    }

    // TODO: Implement withProgress if it belongs to this service according to VS Code's IExtHostMessageService.
    // public withProgress<R>(options: VscodeProgressOptions, task: (progress: VscodeProgress<{ message?: string; increment?: number }>, token: VscodeCancellationToken) => Thenable<R>): Thenable<R> {
    //     this._logWarnOnce("window.withProgress is not fully implemented in Cocoon shim.");
    //     // Minimal implementation: run the task, ignore progress reporting
    //     const cancellationTokenSource = new CancellationTokenSource();
    //     const progressStub = { report: () => {} };
    //     try {
    //         return Promise.resolve(task(progressStub, cancellationTokenSource.token));
    //     } catch (err) {
    //         return Promise.reject(err);
    //     } finally {
    //          cancellationTokenSource.dispose();
    //     }
    // }
}
--- END OF FILE message-service-shim.ts ---