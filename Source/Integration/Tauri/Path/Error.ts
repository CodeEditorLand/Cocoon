/**
 * @module Error
 * @description Defines a placeholder for the IntegrationPathProblem type.
 * This file is a stub to resolve import errors. A real implementation would
 * define concrete error types from the Tauri integration layer.
 */

import { Data } from "effect";

/**
 * @class IntegrationPathProblem
 * @description A placeholder error type for path-related failures at the
 * integration layer.
 */
export class IntegrationPathProblem extends Data.TaggedError(
	"IntegrationPathProblem",
)<{
	readonly Cause?: unknown;
}> {}
