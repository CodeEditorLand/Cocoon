/**
 * @module Handler/VscodeAPI/AuthenticationNamespace
 * @description
 * Factory for the vscode.authentication namespace shim.
 * Provides stub implementations for authentication provider registration,
 * session retrieval, and session change events.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateAuthenticationNamespace = (
	_Context: HandlerContext,
) => ({
	registerAuthenticationProvider: () => ({ dispose: () => {} }),
	getSession: async () => undefined,
	onDidChangeSessions: () => ({ dispose: () => {} }),
});

export default CreateAuthenticationNamespace;
