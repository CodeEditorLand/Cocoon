/**
 * @module InvokeProcessingService
 * @description An Effect that sends text to a backend service for processing.
 */

import { Effect } from "effect";

import { ProcessingServiceError } from "./Error.js";

interface ProcessingResult {
	Id: string;
	Status: "Success";
}

/**
 * An Effect that makes a `fetch` request to a local backend service.
 * @param TextContent - The text to be processed.
 * @returns An `Effect` that resolves to the JSON result from the service,
 *   or fails with a `ProcessingServiceError`.
 */
export const InvokeProcessingService = (
	TextContent: string,
): Effect.Effect<ProcessingResult, ProcessingServiceError> =>
	Effect.tryPromise({
		try: () =>
			fetch("http://localhost:3000/process", {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: TextContent,
			}).then((Response) => {
				if (!Response.ok) {
					throw new Error(
						`Server responded with status: ${Response.status}`,
					);
				}
				return Response.json() as Promise<ProcessingResult>;
			}),
		catch: (cause) => new ProcessingServiceError({ cause }),
	});
