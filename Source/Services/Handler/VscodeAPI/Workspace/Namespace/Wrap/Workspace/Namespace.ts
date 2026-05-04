/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/WrapWorkspaceNamespace
 * @description
 * Per-namespace wrapper for `vscode.workspace`. Delegates the Proxy
 * heuristic to the shared `WrapNamespaceWithHeuristics` helper so
 * unknown methods (e.g. `requestResourceTrust`, `isResourceTrusted` -
 * the proposed-API trust family vscode.git uses before opening a
 * repository) get sensible defaults instead of `TypeError: not a
 * function`.
 *
 * The 44 hand-shimmed methods on `Concrete` stay the hot path; the
 * Proxy only intercepts unknown property access. This is purely
 * additive - no existing call site sees a different value for any
 * pre-existing key.
 */

import WrapNamespaceWithHeuristics from "../../../../Wrap/Namespace/With/Heuristics.js";

const WrapWorkspaceNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("workspace", Concrete);

export default WrapWorkspaceNamespace;
