/**
 * @module InvokeProcessingService
 * @description An Effect that sends text to a backend service for processing.
 * This version uses the internal IPC service instead of a direct `fetch`.
 */

import { Effect } from "effect";

import IPCService from "../../Service/IPC/Service.js";
import { ProcessingServiceError } from "./Error.js";

interface ProcessingResult {
	readonly ID: string;
	readonly Status: "Success";
}

/**
 * An Effect that makes an RPC call to a backend service.
 * @param TextContent The text to be processed.
 * @returns An `Effect` that resolves to the result from the service,
 *   or fails with a `ProcessingServiceError`.
 */
const InvokeProcessingService = (
	TextContent: string,
): Effect.Effect<ProcessingResult, ProcessingServiceError, IPCService> => {
	return Effect.gen(function* () {
		const IPC = yield* IPCService;
		return yield* IPC.SendRequest<ProcessingResult>("$processText", [
			TextContent,
		]).pipe(
			Effect.mapError((Cause) => new ProcessingServiceError({ Cause })),
		);
	});
};

export default InvokeProcessingService;
