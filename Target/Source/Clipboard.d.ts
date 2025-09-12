/**
 * @module Clipboard
 * @description Defines the service for interacting with the system clipboard,
 * implementing the `vscode.Clipboard` contract.
 * This service proxies all clipboard operations to the native host (`Mountain`) via IPC.
 */
import { Effect } from "effect";
import type { Clipboard } from "vscode";
declare const ClipboardService_base: Effect.Service.Class<ClipboardService, "vscode/ClipboardService", {
    readonly sync: () => Clipboard;
}>;
/**
 * @class ClipboardService
 * @description The `Effect.Service` for the Clipboard service. It provides
 * an implementation of VS Code's `vscode.Clipboard` interface, where each method
 * returns a `Promise` by running an underlying `Effect`.
 */
export declare class ClipboardService extends ClipboardService_base {
}
export {};
//# sourceMappingURL=Clipboard.d.ts.map