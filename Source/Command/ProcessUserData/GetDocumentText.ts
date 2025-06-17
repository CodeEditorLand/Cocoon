/*
 * File: Cocoon/Source/Command/ProcessUserData/GetDocumentText.ts
 * Responsibility: Provides a utility function for the Cocoon sidecar to synchronously retrieve the full text content of a VS Code TextDocument, enabling VS Code extension compatibility during MVP Path A development.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect, vscode
 */

/**
 * @module GetDocumentText
 * @description An Effect that retrieves the full text content of a document.
 */

import { Effect } from "effect";
import type { TextDocument } from "vscode";

/**
 * An Effect that gets the full text content of a given document.
 * @param Document The `vscode.TextDocument` to read from.
 * @returns An `Effect` that synchronously resolves to the document's text content.
 */
const GetDocumentText = (
	Document: TextDocument,
): Effect.Effect<string, never, never> => {
	return Effect.sync(() => Document.getText());
};

export default GetDocumentText;
