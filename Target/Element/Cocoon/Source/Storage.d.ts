/**
 * @module Storage
 * @description Defines the service for providing persistent, scoped key-value
 * storage (`Memento`) for extensions. It fetches all storage data on init,
 * caches it locally, provides a fast in-memory proxy, and batches writes to the host.
 */
import { Effect } from "effect";
import type { Memento } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface Storage
 * @description The contract for the Storage factory service.
 */
export interface Storage {
    readonly CreateMemento: (ExtensionId: string, IsGlobal: boolean) => Memento;
}
declare const StorageService_base: Effect.Service.Class<StorageService, "Service/Storage", {
    readonly scoped: Effect.Effect<{
        CreateMemento: (ExtensionId: string, IsGlobal: boolean) => Memento;
    }, never, LoggerService | IPCService>;
}>;
/**
 * @class StorageService
 * @description The `Effect.Service` for the Storage service factory.
 */
export declare class StorageService extends StorageService_base {
}
export {};
