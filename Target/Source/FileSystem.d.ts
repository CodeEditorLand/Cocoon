/**
 * @module FileSystem
 * @description Defines the service that implements the `vscode.workspace.fs` API,
 * proxying filesystem operations to the host process.
 */
import { Effect } from "effect";
import { type Event, type FileChangeEvent, type FileSystem as VSCodeFileSystem } from "vscode";
import { FileSystemInformationService } from "./FileSystemInformation.js";
import { IPCService } from "./IPC.js";
/**
 * @interface FileSystem
 * @description The contract for the FileSystem service, extending `vscode.FileSystem`.
 */
export interface FileSystem extends VSCodeFileSystem {
    readonly onDidChangeFile: Event<readonly FileChangeEvent[]>;
}
declare const FileSystemService_base: Effect.Service.Class<FileSystemService, "Service/FileSystem", {
    readonly effect: Effect.Effect<FileSystem, never, IPCService | FileSystemInformationService>;
}>;
/**
 * @class FileSystemService
 * @description The `Effect.Service` for the `vscode.workspace.fs` API.
 */
export declare class FileSystemService extends FileSystemService_base {
}
export {};
//# sourceMappingURL=FileSystem.d.ts.map