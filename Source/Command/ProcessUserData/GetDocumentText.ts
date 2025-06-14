/**
 * @module GetDocumentText
 * @description An Effect that retrieves the full text content of a document.
 */

import { Effect } from "effect";
import type * as VSCode from "vscode";

/**
 * An Effect that gets the full text content of a given document.
 * @param Document The `vscode.TextDocument` to read from.
 * @returns An `Effect` that synchronously resolves to the document's text content.
 */
const GetDocumentText = (
	Document: VSCode.TextDocument,
): Effect.Effect<string, never, never> => {
	return Effect.sync(() => Document.getText());
};

export default GetDocumentText;
