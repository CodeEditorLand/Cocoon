/**
 * @module SecretStorage
 * @description Defines the service for securely storing and retrieving secrets,
 * such as API tokens. It provides a factory for creating `vscode.SecretStorage`
 * instances scoped to a specific extension.
 */
import { Effect } from "effect";
import type { SecretStorage } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface SecretStorageFactory
 * @description The contract for the SecretStorage factory service.
 */
export interface SecretStorageFactory {
    readonly CreateStorage: (ExtensionId: string) => SecretStorage;
}
declare const SecretStorageService_base: Effect.Service.Class<SecretStorageService, "Service/SecretStorage", {
    readonly effect: Effect.Effect<{
        CreateStorage: (ExtensionId: string) => SecretStorage;
    }, never, LoggerService | IPCService>;
}>;
/**
 * @class SecretStorageService
 * @description The `Effect.Service` for the SecretStorage factory.
 */
export declare class SecretStorageService extends SecretStorageService_base {
}
export {};
