/**
 * @module Service (Document)
 * @description Defines the interface and Context.Tag for the Document service.
 * This service is the single source of truth for the state of all open text
 * documents in the extension host.
 */

import { Context, type Effect } from "effect";
import type { Event, TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

export default class extends Context.Tag("Service/Document")<
	any,
	{
		/** A read-only array of all text documents known to this extension host. */
		readonly TextDocuments: readonly TextDocument[];

		/** An event that is emitted when a text document is opened. */
		readonly onDidOpenTextDocument: Event<TextDocument>;
		/** An event that is emitted when a text document is closed. */
		readonly onDidCloseTextDocument: Event<TextDocument>;
		/** An event that is emitted when a text document is changed. */
		readonly onDidChangeTextDocument: Event<TextDocumentChangeEvent>;
		/** An event that is emitted when a text document is saved. */
		readonly onDidSaveTextDocument: Event<TextDocument>;

		/**
		 * Retrieves a text document for a given URI.
		 * @param URI The URI of the document to retrieve.
		 * @returns An `Effect` that resolves to the document, or `undefined` if not found.
		 */
		readonly GetDocument: (
			URI: Uri,
		) => Effect.Effect<TextDocument | undefined, never>;
	}
>() {}
