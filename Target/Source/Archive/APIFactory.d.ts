/**
 * @module APIFactory
 * @description Defines the service responsible for constructing a complete, sandboxed
 * `vscode` API object for a given extension.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type * as VSCode from "vscode";
import { CommandService } from "./Command.js";
import { DebugService } from "./Debug.js";
import { ExtensionService } from "./Extension.js";
import { LanguageFeatureService } from "./LanguageFeature.js";
import { LoggerService } from "./Logger.js";
import { ProposedAPIService } from "./ProposedAPI.js";
import { StatusBarService } from "./StatusBar.js";
import { TaskService } from "./Task.js";
import { TreeViewService } from "./TreeView.js";
import { WebViewPanelService } from "./WebViewPanel.js";
import { WindowService } from "./Window.js";
import { WorkSpaceService } from "./WorkSpace.js";
/**
 * @interface APIFactory
 * @description The contract for the APIFactory service.
 */
export interface APIFactory {
    readonly CreateAPI: (ExtensionDescription: IExtensionDescription) => typeof VSCode;
}
declare const APIFactoryService_base: Effect.Service.Class<APIFactoryService, "Service/APIFactory", {
    readonly effect: Effect.Effect<{
        CreateAPI: (ExtensionDescription: IExtensionDescription) => typeof VSCode;
    }, never, LoggerService | WorkSpaceService | WindowService | CommandService | DebugService | ExtensionService | LanguageFeatureService | ProposedAPIService | StatusBarService | TaskService | TreeViewService | WebViewPanelService>;
}>;
/**
 * @class APIFactoryService
 * @description The `Effect.Service` for the APIFactory.
 */
export declare class APIFactoryService extends APIFactoryService_base {
}
export {};
//# sourceMappingURL=APIFactory.d.ts.map