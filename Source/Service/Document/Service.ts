/*
 * File: Cocoon/Source/Service/Document/Service.ts
 * Role: Defines the service interface and Effect.Service for the Document service.
 * Responsibilities:
 *   - Declare the contract for the service that acts as the single source of
 *     truth for the state of all open text documents in the extension host.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect, Option } from "effect";
import type { Event, TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

/**
 * The `Effect.Service` for the Document service.
 *
 * This service manages the lifecycle of text documents (open, close, change, save)
 * and provides the `vscode.workspace.textDocuments` API surface.
 */
export class Document extends Effect.Service<Document>("Service/Document")<{
	/** A read-only array of all text documents known to this extension host. */
	readonly TextDocuments: readonly TextDocument[];

	/** An event that is emitted when a text document is opened. */
	readonly OnDidOpenTextDocument: Event<TextDocument>;

	/** An event that is emitted when a text document is closed. */
	readonly OnDidCloseTextDocument: Event<TextDocument>;

	/** An event that is emitted when a text document is changed. */
	readonly OnDidChangeTextDocument: Event<TextDocumentChangeEvent>;

	/** An event that is emitted when a text document is saved. */
	readonly OnDidSaveTextDocument: Event<TextDocument>;

	/**
	 * Retrieves a text document for a given URI.
	 * @param DocumentURI - The URI of the document to retrieve.
	 * @returns An `Effect` that resolves to an `Option<TextDocument>`.
	 */
	readonly GetDocument: (
		DocumentURI: Uri,
	) => Effect.Effect<Option.Option<TextDocument>, never>;
}>() {}
