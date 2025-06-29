/**
 * @module ApplicationConfigurationProblem
 * @description Defines a domain-specific, tagged error for configuration operations.
 */

import { Data } from "effect";

import type { IntegrationConfigurationProblem } from "../Integration/Tauri/Configuration/Problem.js";

/**
 * @class ApplicationConfigurationProblem
 * @description Represents a failure within the ApplicationConfiguration application service.
 * This error acts as a wrapper around a more specific problem from the
 * Integration layer (e.g., a file system error or a JSON parsing error).
 * This allows higher-level code to catch a single, well-defined error type
 * for this domain while preserving the original cause for logging.
 */
export class ApplicationConfigurationProblem extends Data.TaggedError(
	"ApplicationConfigurationProblem",
)<{
	/** The underlying problem from the Integration layer that caused this failure. */
	readonly Cause: IntegrationConfigurationProblem;
	/** A string describing the context of the operation (e.g., 'FailedToResolveConfiguration'). */
	readonly Context: string;
}> {}
