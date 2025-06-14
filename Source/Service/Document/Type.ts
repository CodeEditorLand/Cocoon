/**
 * @module Type (Document)
 * @description Defines internal types for the Document service, specifically
 * the union of all possible document lifecycle events.
 */

import type { TextDocument, TextDocumentChangeEvent } from "vscode";

/**
 * A union type representing all possible document lifecycle events that can be
 * published to the internal event hub. This allows services to react to
 * specific document state changes.
 */
export type Interface =
	| { readonly _tag: "Open"; readonly Document: TextDocument }
	| { readonly _tag: "Close"; readonly Document: TextDocument }
	| { readonly _tag: "Change"; readonly Event: TextDocumentChangeEvent }
	| { readonly _tag: "Save"; readonly Document: TextDocument };
