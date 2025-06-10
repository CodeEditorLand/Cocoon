/**
 * @module Type (Documents)
 * @description Defines internal types for the Document service.
 */

import type { TextDocument, TextDocumentChangeEvent } from "vscode";

/**
 * A union type representing all possible document lifecycle events that can be
 * published to the internal event hub.
 */
export type DocumentEvent =
	| { readonly _tag: "Open"; readonly Document: TextDocument }
	| { readonly _tag: "Close"; readonly Document: TextDocument }
	| { readonly _tag: "Change"; readonly Event: TextDocumentChangeEvent }
	| { readonly _tag: "Save"; readonly Document: TextDocument };
