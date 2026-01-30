/**
 * @module ExtensionHost
 * @description Defines the core service for managing the lifecycle of all extensions.
 * It handles loading, activating, and deactivating extensions, and serves as the
 * central orchestrator for the extension ecosystem.
 */
import type { ExtensionIdentifier, IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
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
 * @interface ActivatedExtension
 * @description Represents the internal state of an activated extension, holding
 * its module, exports, and subscriptions.
 */
export interface ActivatedExtension {
    readonly Id: ExtensionIdentifier;
    readonly Module: {
        readonly activate?: Function;
        readonly deactivate?: Function;
    };
    readonly Exports: any;
    readonly Subscriptions: readonly import("vscode").Disposable[];
    readonly ActivationFailed: boolean;
    readonly ActivationError: Error | null;
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
        ActivateById: (Id: ExtensionIdentifier, Reason: ExtensionActivationReason) => Effect.Effect<void, never, never>;
        GetExtensionDescription: (Id: string | ExtensionIdentifier) => Effect.Effect<any, never, never>;
        GetExtensionExports: (Id: ExtensionIdentifier) => Effect.Effect<any, Error, never>;
        IsActivated: (Id: ExtensionIdentifier) => Effect.Effect<boolean, never, never>;
        DeactivateAll: () => Effect.Effect<void, never, never>;
        OnDidActivateExtension: (_callback: (extension: IExtensionDescription) => void) => Effect.Effect<void, never, never>;
    }, never, LoggerService | IPCService | import("@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData | import("@codeeditorland/output/vs/workbench/api/common/extHostTelemetry.js").IExtHostTelemetry>;
}>;
/**
 * @class ExtensionHostService
 * @description The `Effect.Service` for the ExtensionHost.
 */
export declare class ExtensionHostService extends ExtensionHostService_base {
}
export {};
//# sourceMappingURL=ExtensionHost.d.ts.map