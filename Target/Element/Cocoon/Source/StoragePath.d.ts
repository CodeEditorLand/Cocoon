/**
 * @module StoragePath
 * @description Defines the service for resolving filesystem URIs for extension-specific
 * storage locations (both global and workspace-scoped). It ensures that the
 * necessary directories exist before they are accessed.
 */
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";
import { type FileSystem } from "./FileSystem.js";
import { type Logger } from "./Logger.js";
/**
 * @interface StoragePath
 * @description The contract for the StoragePath service.
 */
export interface StoragePath {
    readonly GetWorkSpaceStorageUri: (Extension: IExtensionDescription) => Uri | undefined;
    readonly GetGlobalStorageUri: (Extension: IExtensionDescription) => Uri;
}
declare const StoragePathService_base: Effect.Service.Class<StoragePathService, "Service/StoragePath", {
    readonly effect: Effect.Effect<{
        GetWorkSpaceStorageUri: (Extension: IExtensionDescription) => Uri | undefined;
        GetGlobalStorageUri: (Extension: IExtensionDescription) => Uri;
    }, never, Logger | import("vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData | FileSystem>;
}>;
/**
 * @class StoragePathService
 * @description The `Effect.Service` for resolving extension storage paths.
 */
export declare class StoragePathService extends StoragePathService_base {
}
export {};
