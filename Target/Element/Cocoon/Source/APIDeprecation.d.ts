/**
 * @module APIDeprecation
 * @description Defines the service for reporting and handling the usage of
 * deprecated APIs by extensions.
 */
import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface APIDeprecation
 * @description The contract for the APIDeprecation service.
 */
export interface APIDeprecation {
    /**
     * Creates an `Effect` that logs a warning about deprecated API usage.
     * @param ExtensionId The identifier of the extension using the API.
     * @param Usage A string identifying the specific deprecated API used (e.g., 'workspace.rootPath').
     * @param Message A message explaining the deprecation and suggesting alternatives.
     * @returns A `void` `Effect`.
     */
    readonly Report: (ExtensionId: ExtensionIdentifier, Usage: string, Message: string) => Effect.Effect<void, never>;
    /**
     * A property decorator that automatically reports usage of a deprecated property.
     * @param ExtensionId The identifier of the extension owning the deprecated property.
     * @param Feature The name of the feature or class containing the property.
     * @param Message A message explaining the deprecation.
     * @returns A `PropertyDecorator`.
     */
    readonly Deprecated: (ExtensionId: ExtensionIdentifier, Feature: string, Message: string) => PropertyDecorator;
}
declare const APIDeprecationService_base: Effect.Service.Class<APIDeprecationService, "Service/APIDeprecation", {
    readonly effect: Effect.Effect<{
        Report: (ExtensionId: ExtensionIdentifier, Usage: string, Message: string) => Effect.Effect<void, never>;
        Deprecated: (ExtensionId: ExtensionIdentifier, Feature: string, Message: string) => PropertyDecorator;
    }, never, LoggerService>;
}>;
/**
 * @class APIDeprecation
 * @description The `Effect.Service` for handling API deprecations. It provides
 * methods to report usage and a decorator to automatically wrap deprecated properties.
 */
export declare class APIDeprecationService extends APIDeprecationService_base {
}
export {};
