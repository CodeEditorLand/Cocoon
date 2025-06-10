/**
 * @module Service (Documents)
 * @description Defines the interface and Context.Tag for the Document service.
 */

import { Context, Effect, Stream } from "effect";
import type { TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

export interface Interface {
	/** A read-only array of all text documents known to this extension host. */
	readonly TextDocuments: readonly TextDocument[];

	/** An event that is emitted when a text document is opened. */
	readonly OnDidOpenTextDocument: Stream.Stream<TextDocument, never>;
	/** An event that is emitted when a text document is closed. */
	readonly OnDidCloseTextDocument: Stream.Stream<TextDocument, never>;
	/** An event that is emitted when a text document is changed. */
	readonly OnDidChangeTextDocument: Stream.Stream<
		TextDocumentChangeEvent,
		never
	>;
	/** An event that is emitted when a text document is saved. */
	readonly OnDidSaveTextDocument: Stream.Stream<TextDocument, never>;

	/**
	 * Retrieves a text document for a given URI.
	 * @returns An Effect that resolves to the document, or `undefined` if not found.
	 */
	readonly GetDocument: (
		Uri: Uri,
	) => Effect.Effect<TextDocument | undefined, never>;
}

export const Tag = Context.Tag<Interface>("Service/Documents");
