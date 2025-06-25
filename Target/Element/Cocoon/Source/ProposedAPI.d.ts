/**
 * @module ProposedAPI
 * @description Defines the service for managing and checking the enablement
 * status of proposed (experimental) VS Code APIs for extensions.
 */
import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface ProposedAPI
 * @description The contract for the ProposedAPI service.
 */
export interface ProposedAPI {
    readonly IsEnabled: (ExtensionId: ExtensionIdentifier, ProposalName: string) => boolean;
}
declare const ProposedAPIService_base: Effect.Service.Class<ProposedAPIService, "Service/ProposedAPI", {
    readonly effect: Effect.Effect<{
        IsEnabled: (ExtensionId: ExtensionIdentifier, ProposalName: string) => boolean;
    }, never, LoggerService>;
}>;
/**
 * @class ProposedAPIService
 * @description The `Effect.Service` for managing proposed APIs. It reads the
 * configuration at startup and provides a synchronous method to check if a
 * specific proposal is enabled for a given extension.
 */
export declare class ProposedAPIService extends ProposedAPIService_base {
}
export {};
