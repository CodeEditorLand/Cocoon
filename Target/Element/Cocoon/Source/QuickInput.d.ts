/**
 * @module QuickInput
 * @description Defines the service for interacting with VS Code's Quick Pick
 * and Input Box UI elements.
 */
import { Effect } from "effect";
import type { CancellationToken, InputBox, InputBoxOptions, QuickPick, QuickPickItem, QuickPickOptions } from "vscode";
import { IPCService } from "./IPC.js";
/**
 * @interface QuickInput
 * @description The contract for the QuickInput service.
 */
export interface QuickInput {
    readonly ShowQuickPick: <T extends QuickPickItem>(items: readonly T[] | Promise<readonly T[]>, options?: QuickPickOptions, token?: CancellationToken) => Effect.Effect<T | T[] | undefined, Error>;
    readonly ShowInputBox: (options?: InputBoxOptions, token?: CancellationToken) => Effect.Effect<string | undefined, Error>;
    readonly CreateQuickPick: <T extends QuickPickItem>() => QuickPick<T>;
    readonly CreateInputBox: () => InputBox;
}
declare const QuickInputService_base: Effect.Service.Class<QuickInputService, "Service/QuickInput", {
    readonly effect: Effect.Effect<{
        ShowQuickPick: <T extends QuickPickItem>(Items: readonly T[] | Promise<readonly T[]>, Option?: QuickPickOptions, Token?: CancellationToken) => Effect.Effect<T | T[] | undefined, Error>;
        ShowInputBox: (Option?: InputBoxOptions, Token?: CancellationToken) => Effect.Effect<string | undefined, Error>;
        CreateQuickPick: () => never;
        CreateInputBox: () => never;
    }, never, IPCService>;
}>;
/**
 * @class QuickInput
 * @description The `Effect.Service` for the QuickInput service.
 */
export declare class QuickInputService extends QuickInputService_base {
}
export {};
