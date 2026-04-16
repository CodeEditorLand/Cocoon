/**
 * @module Handler/VscodeAPI/DebugNamespace
 * @description
 * Factory for the vscode.debug namespace shim.
 * Provides stub implementations for debug adapter registration,
 * session lifecycle events, and breakpoint access.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateDebugNamespace = (
	_Context: HandlerContext,
) => ({
	registerDebugAdapterDescriptorFactory: () => ({ dispose: () => {} }),
	registerDebugConfigurationProvider: () => ({ dispose: () => {} }),
	startDebugging: async () => false,
	onDidStartDebugSession: () => ({ dispose: () => {} }),
	onDidTerminateDebugSession: () => ({ dispose: () => {} }),
	onDidChangeActiveDebugSession: () => ({ dispose: () => {} }),
	onDidReceiveDebugSessionCustomEvent: () => ({ dispose: () => {} }),
	activeDebugSession: undefined,
	breakpoints: [],
});

export default CreateDebugNamespace;
