/**
 * @module Handler/VscodeAPI/ExtensionsNamespace
 * @description
 * Factory for the vscode.extensions namespace shim.
 * Provides: getExtension, all, onDidChange.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateExtensionsNamespace = (
	_Context: HandlerContext,
) => ({
	getExtension: (_Identifier: string) => undefined,
	all: [],
	onDidChange: () => ({ dispose: () => {} }),
});

export default CreateExtensionsNamespace;
