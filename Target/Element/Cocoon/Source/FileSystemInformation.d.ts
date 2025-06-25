/**
 * @module FileSystemInformation
 * @description Defines the service responsible for providing metadata about
 * available filesystem providers, such as their capabilities (e.g., case-sensitivity,
 * read-only status) and for firing file change events.
 */
import { Effect } from "effect";
import { type IExtUri } from "vs/base/common/resources.js";
import { FileSystemProviderCapabilities } from "vs/platform/files/common/files.js";
import type { Event, FileChangeEvent } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface FileSystemInformation
 * @description The contract for the FileSystemInformation service.
 */
export interface FileSystemInformation {
    readonly ExtURI: IExtUri;
    readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
    readonly GetCapabilities: (Scheme: string) => Effect.Effect<FileSystemProviderCapabilities | undefined, never>;
    readonly IsWritableFileSystem: (Scheme: string) => boolean | undefined;
}
declare const FileSystemInformationService_base: Effect.Service.Class<FileSystemInformationService, "Service/FileSystemInformation", {
    readonly effect: Effect.Effect<{
        ExtURI: IExtUri;
        GetCapabilities: (Scheme: string) => Effect.Effect<number | undefined, never, never>;
        onDidChangeFile: import("vs/workbench/workbench.web.main.internal.js").Event<readonly FileChangeEvent[]>;
        IsWritableFileSystem: (Scheme: string) => boolean;
    }, never, LoggerService | IPCService>;
}>;
/**
 * @class FileSystemInformationService
 * @description The `Effect.Service` for providing filesystem metadata.
 */
export declare class FileSystemInformationService extends FileSystemInformationService_base {
}
export {};
