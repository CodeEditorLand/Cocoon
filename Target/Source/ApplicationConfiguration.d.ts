/**
 * @module ApplicationConfiguration
 * @description Defines the service for providing access to merged user, workspace,
 * and application-default settings. It implements the `IConfigurationService`
 * contract from VS Code for high fidelity.
 */
import type { IConfigurationService } from "@codeeditorland/output/vs/platform/configuration/common/configuration.js";
import { Effect } from "effect";
import { ApplicationConfigurationProblem } from "./ApplicationConfiguration/ApplicationConfigurationProblem.js";
declare const ApplicationConfigurationService_base: Effect.Service.Class<IConfigurationService, "vscode/ApplicationConfigurationService", {
    readonly effect: Effect.Effect<IConfigurationService, ApplicationConfigurationProblem, never>;
}>;
/**
 * @class ApplicationConfigurationService
 * @description The `Effect.Service` for the ApplicationConfiguration service. It resolves the
 * complete configuration on initialization and provides methods to access the merged
 * settings.
 */
export declare class ApplicationConfigurationService extends ApplicationConfigurationService_base {
}
export {};
//# sourceMappingURL=ApplicationConfiguration.d.ts.map