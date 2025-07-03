/**
 * @module Extension
 * @description Defines the service that implements the `vscode.extensions` API.
 * It manages access to extension descriptions, activation state, and provides
 * the public-facing `vscode.Extension` API objects.
 */
import { Effect, Option } from "effect";
import { type Event, type Extension as VSCodeExtension } from "vscode";
import { ExtensionHostService } from "./ExtensionHost.js";
/**
 * @interface Extension
 * @description The contract for the Extension service.
 */
export interface Extension {
    readonly onDidChange: Event<void>;
    readonly GetExtension: <T>(ExtensionId: string) => Effect.Effect<Option.Option<VSCodeExtension<T>>, never>;
    readonly GetAll: () => Effect.Effect<readonly VSCodeExtension<any>[], never>;
    readonly Activate: <T>(ExtensionId: string) => Effect.Effect<VSCodeExtension<T>, Error>;
}
declare const ExtensionService_base: Effect.Service.Class<ExtensionService, "Service/Extension", {
    readonly effect: Effect.Effect<{
        onDidChange: import("@codeeditorland/output/vs/workbench/workbench.web.main.internal.js").Event<void>;
        GetExtension: <T>(ExtensionId: string) => Effect.Effect<Option.Option<VSCodeExtension<T_1>>, never, never>;
        GetAll: () => Effect.Effect<readonly VSCodeExtension<any>[], never, never>;
        Activate: <T>(ExtensionId: string) => Effect.Effect<any, Error, never>;
    }, never, import("@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js").IExtensionHostInitData | ExtensionHostService>;
}>;
/**
 * @class ExtensionService
 * @description The `Effect.Service` for the Extension service.
 */
export declare class ExtensionService extends ExtensionService_base {
}
export {};
//# sourceMappingURL=Extension.d.ts.map