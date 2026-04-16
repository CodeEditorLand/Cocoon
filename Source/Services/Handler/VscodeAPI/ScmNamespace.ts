/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim.
 * Provides: createSourceControl with input box and resource group stubs.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateScmNamespace = (
	_Context: HandlerContext,
) => ({
	createSourceControl: () => ({
		inputBox: { value: "" },
		createResourceGroup: () => ({ resourceStates: [], dispose: () => {} }),
		dispose: () => {},
	}),
});

export default CreateScmNamespace;
