/**
 * @module InvokeProcessingService
 * @description An Effect that invokes the text processing service on the Mountain backend.
 */

import { Effect } from "effect";

import { ProcessingServiceError } from "../../Command/ProcessUserData/Error.js"; // Re-using the error type
import { IpcProvider } from "../Ipc/mod.js";

/**
 * The expected structure of the successful result from the processing service.
 */
interface ProcessingResult {
	readonly Id: string;
	readonly Status: "Success";
}

/**
 * An Effect that sends text content to the Mountain backend for processing via
 * the main IPC channel.
 *
 * This function abstracts the underlying RPC call, making it a reusable business
 * action. It depends on the `IpcProvider` service to handle the communication.
 *
 * @param TextContent - The text content to be sent for processing.
 * @returns An `Effect` that resolves with the `ProcessingResult` from the backend,
 *   or fails with a `ProcessingServiceError`.
 */
export const InvokeProcessingService = (
	TextContent: string,
): Effect.Effect<ProcessingResult, ProcessingServiceError> =>
	Effect.gen(function* (_) {
		const Ipc = yield* _(IpcProvider.Tag);

		const Result = yield* _(
			Ipc.SendRequest<ProcessingResult, Error>(
				"$processText", // The conventional RPC method name
				{ Content: TextContent },
			),
			// Map any generic IPC error into our specific, tagged error for this workflow.
			Effect.mapError((cause) => new ProcessingServiceError({ cause })),
		);

		return Result;
	});
