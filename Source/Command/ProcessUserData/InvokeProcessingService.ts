/**
 * @module InvokeProcessingService
 * @description An Effect that sends text to a backend service for processing.
 * This version uses the internal IPC service instead of a direct `fetch`.
 */

import { Effect } from "effect";

import { IPC } from "../../Service/IPC.js";
import { ProcessingServiceError } from "./Error.js";

interface ProcessingResult {
	ID: string;
	Status: "Success";
}

/**
 * An Effect that makes an RPC call to a backend service.
 * @param TextContent The text to be processed.
 * @returns An `Effect` that resolves to the result from the service,
 *   or fails with a `ProcessingServiceError`.
 */
export function InvokeProcessingService(
	TextContent: string,
): Effect.Effect<ProcessingResult, ProcessingServiceError> {
	return Effect.gen(function* (_) {
		const IPCService = yield* _(IPC.Tag);
		return yield* _(
			IPCService.SendRequest<ProcessingResult>("$processText", [
				TextContent,
			]),
			Effect.mapError((cause) => new ProcessingServiceError({ cause })),
		);
	});
}
