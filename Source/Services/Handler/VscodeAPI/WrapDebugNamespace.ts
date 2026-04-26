/**
 * @module Handler/VscodeAPI/WrapDebugNamespace
 * @description
 * Per-namespace wrapper for `vscode.debug`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown debug-surface methods
 * (proposed APIs around debug visualisation, custom adapter trackers,
 * stack-item events) return heuristic stubs rather than `TypeError:
 * not a function`.
 *
 * Existing hand-shimmed methods on `CreateDebugNamespace` remain the
 * hot path; the Proxy only intercepts unknown property access.
 */

import WrapNamespaceWithHeuristics from "./WrapNamespaceWithHeuristics.js";

const WrapDebugNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("debug", Concrete);

export default WrapDebugNamespace;
