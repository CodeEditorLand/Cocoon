/**
 * @module Dialog
 * @description Defines the service for showing native file dialogs, such as 'Open'
 * and 'Save' dialogs. This service proxies requests to the host process via IPC.
 */
import { Effect } from "effect";
import type { CancellationToken, OpenDialogOptions, SaveDialogOptions, Uri } from "vscode";
import { DialogProblem } from "./Dialog/DialogProblem.js";
import { IPCService } from "./IPC.js";
/**
 * @interface Dialog
 * @description The contract for the Dialog service.
 */
export interface Dialog {
    readonly ShowOpenDialog: (options?: OpenDialogOptions, token?: CancellationToken) => Effect.Effect<Uri[] | undefined, DialogProblem>;
    readonly ShowSaveDialog: (options?: SaveDialogOptions, token?: CancellationToken) => Effect.Effect<Uri | undefined, DialogProblem>;
}
declare const DialogService_base: Effect.Service.Class<DialogService, "Service/Dialog", {
    readonly effect: Effect.Effect<{
        ShowOpenDialog: (Options?: OpenDialogOptions, Token?: CancellationToken) => Effect.Effect<Uri[], DialogProblem, never>;
        ShowSaveDialog: (Options?: SaveDialogOptions, Token?: CancellationToken) => Effect.Effect<Uri, DialogProblem, never>;
    }, never, IPCService>;
}>;
/**
 * @class DialogService
 * @description The `Effect.Service` for handling native dialogs.
 */
export declare class DialogService extends DialogService_base {
}
export {};
//# sourceMappingURL=Dialog.d.ts.map