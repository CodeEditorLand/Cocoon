/**
 * @module ExtensionHost
 * @description Defines the core service for managing the lifecycle of all extensions.
 * It handles loading, activating, and deactivating extensions, and serves as the
 * central orchestrator for the extension ecosystem.
 */
import { Effect } from "effect";
import type { ExtensionIdentifier, IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface ExtensionActivationReason
 * @description Describes the reason an extension is being activated.
 */
export interface ExtensionActivationReason {
    readonly startup: boolean;
    readonly extensionId: ExtensionIdentifier;
    readonly activationEvent: string;
}
/**
 * @interface ExtensionHost
 * @description The contract for the ExtensionHost service.
 */
export interface ExtensionHost {
    readonly ActivateById: (Id: ExtensionIdentifier, Reason: ExtensionActivationReason) => Effect.Effect<void, never>;
    readonly GetExtensionDescription: (Id: string | ExtensionIdentifier) => Effect.Effect<IExtensionDescription | undefined, never>;
    readonly GetExtensionExports: (Id: ExtensionIdentifier) => Effect.Effect<any, Error>;
    readonly IsActivated: (Id: ExtensionIdentifier) => Effect.Effect<boolean, never>;
    readonly DeactivateAll: () => Effect.Effect<void, never>;
    readonly OnDidActivateExtension: (callback: (extension: IExtensionDescription) => void) => Effect.Effect<void, never>;
}
declare const ExtensionHostService_base: Effect.Service.Class<ExtensionHostService, "Service/ExtensionHost", {
    readonly effect: Effect.Effect<{
        ActivateById: (Id: any, Reason: any) => Effect.Effect<void, never, never>;
        GetExtensionDescription: (Id: any) => Effect.Effect<Readonly<import("vs/platform/extensions/common/extensions.js").IRelaxedExtensionDescription> | undefined, never, never>;
        GetExtensionExports: (Id: any) => Effect.Effect<any, Error, never>;
        IsActivated: (Id: any) => Effect.Effect<boolean, never, never>;
        DeactivateAll: () => Effect.Effect<void, never, never>;
        OnDidActivateExtension: (_callback: (extension: IExtensionDescription) => void) => Effect.Effect<void, never, never>;
    }, never, LoggerService | import("vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData | import("vs/workbench/api/common/extHostTelemetry.js").IExtHostTelemetry | IPCService>;
}>;
/**
 * @class ExtensionHostService
 * @description The `Effect.Service` for the ExtensionHost.
 */
export declare class ExtensionHostService extends ExtensionHostService_base {
}
export {};
