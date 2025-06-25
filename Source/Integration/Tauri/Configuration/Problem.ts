/**
 * @module Problem
 * @description Defines a placeholder for the IntegrationConfigurationProblem type.
 * This file is a stub to resolve import errors. A real implementation would
 * define concrete error types from the Tauri integration layer.
 */

import { Data } from "effect";

/**
 * @class IntegrationConfigurationProblem
 * @description A placeholder error type for configuration-related failures at the
 * integration layer.
 */
export class IntegrationConfigurationProblem extends Data.TaggedError(
	"IntegrationConfigurationProblem",
)<{
	readonly Cause?: unknown;
}> {}
