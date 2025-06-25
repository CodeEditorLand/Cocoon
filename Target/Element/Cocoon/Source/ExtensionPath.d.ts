/**
 * @module ExtensionPath
 * @description Defines the service for mapping a file URI to its owner extension.
 * This is a critical utility for interceptors that need to determine which
 * extension is making a request.
 */
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";
/**
 * @interface ExtensionPath
 * @description The contract for the ExtensionPath service.
 */
export interface ExtensionPath {
    readonly FindSubstr: (PathUri: Uri) => IExtensionDescription | undefined;
}
declare const ExtensionPathService_base: Effect.Service.Class<ExtensionPathService, "Service/ExtensionPath", {
    readonly effect: Effect.Effect<{
        FindSubstr: (PathUri: Uri) => IExtensionDescription | undefined;
    }, never, import("vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData>;
}>;
/**
 * @class ExtensionPath
 * @description The `Effect.Service` for mapping file paths to extensions.
 * It builds an in-memory index of all extension paths on initialization for
 * fast, synchronous lookups.
 */
export declare class ExtensionPathService extends ExtensionPathService_base {
}
export {};
