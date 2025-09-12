/**
 * @module Message
 * @description Defines the service for showing user-facing notifications
 * (`showInformationMessage`, `showWarningMessage`, `showErrorMessage`).
 */
import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";
import { IPCService } from "./IPC.js";
/**
 * @interface Message
 * @description The contract for the Message service.
 */
export interface Message {
    readonly ShowInformationMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => Effect.Effect<T | undefined, Error>;
    readonly ShowWarningMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => Effect.Effect<T | undefined, Error>;
    readonly ShowErrorMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => Effect.Effect<T | undefined, Error>;
}
declare const MessageService_base: Effect.Service.Class<MessageService, "Service/Message", {
    readonly effect: Effect.Effect<{
        ShowInformationMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => any;
        ShowWarningMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => any;
        ShowErrorMessage: <T extends MessageItem>(message: string, ...args: Array<string | T | MessageOptions>) => any;
    }, never, IPCService>;
}>;
/**
 * @class MessageService
 * @description The `Effect.Service` for showing user-facing messages.
 */
export declare class MessageService extends MessageService_base {
}
export {};
//# sourceMappingURL=Message.d.ts.map