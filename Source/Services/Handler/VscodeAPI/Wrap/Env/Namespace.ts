/**
 * @module Handler/VscodeAPI/WrapEnvNamespace
 * @description
 * Per-namespace wrapper for `vscode.env`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown env-surface methods (e.g.
 * `onDidChangeMeteredConnection` - a newer event vscode.git's
 * `Repository` constructor subscribes to) return heuristic stubs
 * rather than `TypeError: not a function`.
 *
 * Existing hand-shimmed env values (appName, appRoot, machineId,
 * clipboard, openExternal, etc.) remain the hot path; the Proxy only
 * intercepts unknown property access.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapEnvNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("env", Concrete);

export default WrapEnvNamespace;
