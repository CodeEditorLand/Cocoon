/**
 * @module ProcessUserData
 * @description This module defines the complete, self-contained workflow for
 * the 'ProcessUserData' command. It orchestrates getting text from the active
 * editor, sending it to a backend service for processing, and then displaying
 * the result to the user, with declarative, type-safe error handling.
 */

import { Data, Effect, Option } from "effect";
import { type IPC, IPCService } from "./IPC.js";
import { WindowService } from "./Window.js";

// --- Custom Errors ---

/**
 * @class ActiveEditorNotFoundProblem
 * @description An error indicating that no text editor is currently active.
 */
export class ActiveEditorNotFoundProblem extends Data.TaggedError(
	"ActiveEditorNotFoundProblem",
)<{}> {
	public override readonly message: string;
	constructor() {
		super();
		this.message =
			"No active text editor found. Please open a file to process.";
	}
}

/**
 * @class ProcessingServiceProblem
 * @description An error indicating a failure to communicate with the backend processing service.
 */
export class ProcessingServiceProblem extends Data.TaggedError(
	"ProcessingServiceProblem",
)<{
	readonly Cause: unknown;
}> {
	public override readonly message: string;
	constructor(Properties: { readonly Cause: unknown }) {
		super(Properties);
		const CauseMessage =
			this.Cause instanceof Error
				? this.Cause.message
				: String(this.Cause);
		this.message = `Failed to connect to the processing service: ${CauseMessage}`;
	}
}

// --- Helper Effects ---

/**
 * @description An Effect that safely retrieves the active text editor using the Window service.
 * @returns An `Effect` resolving to an `Option<vscode.TextEditor>`.
 */
const GetActiveTextEditor = Effect.gen(function* () {
	// A full implementation would get this from the WorkSpace service.
	// For now, this is a stub.
	const TheWindow = yield* WindowService;
	return Option.fromNullable(TheWindow.activeTextEditor);
});

/**
 * @description An Effect that synchronously retrieves the full text content of a document.
 * @param Document The `vscode.TextDocument` to read from.
 * @returns A synchronous `Effect` resolving to the document's text.
 */
const GetDocumentText = (
	Document: import("vscode").TextDocument,
): Effect.Effect<string, never> => {
	return Effect.sync(() => Document.getText());
};

/**
 * @interface ProcessingResult
 * @description The expected success response from the backend service.
 */
export interface ProcessingResult {
	readonly ID: string;
	readonly Status: "Success";
}

/**
 * @description An Effect that makes an RPC call to a backend service via IPC.
 * @param TextContent The text to be processed.
 * @returns An `Effect` that resolves to the `ProcessingResult` or fails with a `ProcessingServiceProblem`.
 */
const InvokeProcessingService = (
	TextContent: string,
): Effect.Effect<ProcessingResult, ProcessingServiceProblem, IPC> => {
	return Effect.gen(function* () {
		const TheIPC = yield* IPCService;
		return yield* TheIPC.SendRequest<ProcessingResult>("$processText", [
			TextContent,
		]).pipe(
			Effect.mapError((Cause) => new ProcessingServiceProblem({ Cause })),
		);
	});
};

const ShowInformationMessage = (message: string) =>
	Effect.flatMap(WindowService, (w) =>
		(w as any).ShowInformationMessage(message),
	);

/**
 * @description An `Effect` that encapsulates the entire workflow for processing user data.
 */
export const ProcessUserData = Effect.gen(function* () {
	const MaybeEditor = yield* GetActiveTextEditor;
	const Editor = yield* Effect.mapError(
		MaybeEditor,
		() => new ActiveEditorNotFoundProblem(),
	);
	const TextContent = yield* GetDocumentText(Editor.document);
	const ProcessingResult = yield* InvokeProcessingService(TextContent);
	yield* ShowInformationMessage(
		`Processing complete: ${ProcessingResult.ID}`,
	);
}).pipe(
	// Declaratively handle all known, tagged failure cases for this workflow.
	Effect.catchTags({
		ActiveEditorNotFoundProblem: (Error: { message: string }) =>
			ShowInformationMessage(Error.message),
		ProcessingServiceProblem: (Error: { message: string }) =>
			ShowInformationMessage(Error.message),
	}),
	// Catch any other unexpected error.
	Effect.catchAll((Error: any) =>
		ShowInformationMessage(
			`An unexpected error occurred: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,
		),
	),
);
