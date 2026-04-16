/**
 * @module Handler/VscodeAPI/EnvNamespace
 * @description
 * Factory for the vscode.env namespace shim.
 * Provides: appName, appRoot, language, machineId, sessionId,
 * uriScheme, clipboard.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateEnvNamespace = (
	_Context: HandlerContext,
) => ({
	appName: "CodeEditorLand",
	appRoot: "",
	language: "en",
	machineId: "land",
	sessionId: "land-session",
	uriScheme: "vscode",
	clipboard: { readText: async () => "", writeText: async () => {} },
});

export default CreateEnvNamespace;
