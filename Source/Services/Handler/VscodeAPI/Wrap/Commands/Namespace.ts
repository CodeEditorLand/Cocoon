/**
 * @module Handler/VscodeAPI/WrapCommandsNamespace
 * @description
 * Per-namespace wrapper for `vscode.commands`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown command-surface methods
 * return heuristic stubs rather than `TypeError: not a function`.
 *
 * Existing methods (`registerCommand`, `registerTextEditorCommand`,
 * `executeCommand`, `getCommands`, `onDidExecuteCommand`,
 * `registerDiffInformationCommand`) remain the hot path; the Proxy
 * only intercepts unknown property access.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapCommandsNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("commands", Concrete);

export default WrapCommandsNamespace;
