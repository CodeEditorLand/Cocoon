/**
 * @module ApplicationClipboardProblem
 * @description Defines a domain-specific, tagged error for clipboard operations
 * within the application service layer.
 */

import { Data } from "effect";
import type { IntegrationClipboardProblem } from "../Integration/Tauri/Clipboard/Problem.js";

/**
 * @class ApplicationClipboardProblem
 * @description Represents a failure within the Clipboard application service.
 * It wraps a more specific problem from the Integration layer to provide
 * context while allowing for domain-specific error handling.
 */
export class ApplicationClipboardProblem extends Data.TaggedError(
	"ApplicationClipboardProblem",
)<{
	/** The underlying problem from the Integration layer that caused this failure. */
	readonly Cause: IntegrationClipboardProblem;
}> {}
