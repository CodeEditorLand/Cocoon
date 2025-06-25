/**
 * @module HostKindPicker
 * @description Defines the service for determining the appropriate runtime host
 * (e.g., Node.js-based local process) for a given VS Code extension based on its
 * manifest properties (`extensionKind`).
 */
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface HostKindPicker
 * @description The contract for the HostKindPicker service.
 */
export interface HostKindPicker {
    /**
     * Determines the appropriate `ExtensionHostKind` for a given extension.
     * @param ExtensionDescription The manifest description of the extension.
     * @returns An `Effect` that resolves to the determined `ExtensionHostKind`
     * or `null` if the extension is not compatible with this host.
     */
    readonly Pick: (ExtensionDescription: IExtensionDescription) => Effect.Effect<ExtensionHostKind | null, never>;
}
declare const HostKindPickerService_base: Effect.Service.Class<HostKindPickerService, "Service/HostKindPicker", {
    readonly effect: Effect.Effect<{
        Pick: (ExtensionDescription: IExtensionDescription) => Effect.Effect<ExtensionHostKind | null, never>;
    }, never, LoggerService>;
}>;
/**
 * @class HostKindPicker
 * @description The `Effect.Service` for determining an extension's host kind.
 * It analyzes an extension's `package.json` to decide if it can run in the
 * Cocoon (Node.js) environment.
 */
export declare class HostKindPickerService extends HostKindPickerService_base {
}
export {};
