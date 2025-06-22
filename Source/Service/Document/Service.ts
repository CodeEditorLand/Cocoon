/*
 * File: Cocoon/Source/Service/Document/Service.ts
 *
 * This file defines the interface and Context.Tag for the Document service.
 * This service is the single source of truth for the state of all open text
 * documents in the extension host.
 */

import { Context, Option, type Effect } from "effect";
import type { Event, TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

export default class DocumentService extends Context.Tag("Service/Document")<
	DocumentService,
	{
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
		 * @param URI The URI of the document to retrieve.
		 * @returns An `Effect` that resolves to the document, or `undefined` if not found.
		 */
		readonly GetDocument: (
			URI: Uri,
		) => Effect.Effect<Option.Option<TextDocument>, never>;
	}
>() {}
