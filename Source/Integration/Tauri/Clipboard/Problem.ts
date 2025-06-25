/**
 * @module Problem
 * @description Defines a placeholder for the IntegrationClipboardProblem type.
 * This file is a stub to resolve import errors. A real implementation would
 * define concrete error types from the Tauri integration layer.
 */

import { Data } from "effect";

/**
 * @class IntegrationClipboardProblem
 * @description A placeholder error type for clipboard-related failures at the
 * integration layer.
 */
export class IntegrationClipboardProblem extends Data.TaggedError(
	"IntegrationClipboardProblem",
)<{
	readonly Cause?: unknown;
}> {}
