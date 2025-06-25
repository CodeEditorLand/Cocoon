/**
 * @module ApplicationConfigurationProblem
 * @description Defines a domain-specific, tagged error for configuration operations.
 */
import type { IntegrationConfigurationProblem } from "../Integration/Tauri/Configuration/Problem.js";
declare const ApplicationConfigurationProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ApplicationConfigurationProblem";
} & Readonly<A>;
/**
 * @class ApplicationConfigurationProblem
 * @description Represents a failure within the ApplicationConfiguration application service.
 * This error acts as a wrapper around a more specific problem from the
 * Integration layer (e.g., a file system error or a JSON parsing error).
 * This allows higher-level code to catch a single, well-defined error type
 * for this domain while preserving the original cause for logging.
 */
export declare class ApplicationConfigurationProblem extends ApplicationConfigurationProblem_base<{
    /** The underlying problem from the Integration layer that caused this failure. */
    readonly Cause: IntegrationConfigurationProblem;
    /** A string describing the context of the operation (e.g., 'FailedToResolveConfiguration'). */
    readonly Context: string;
}> {
}
export {};
