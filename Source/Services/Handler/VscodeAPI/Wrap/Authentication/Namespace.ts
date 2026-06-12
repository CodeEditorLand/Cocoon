/**
 * @module Handler/VscodeAPI/WrapAuthenticationNamespace
 * @description
 * Per-namespace wrapper for `vscode.authentication`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown authentication-surface
 * methods return heuristic stubs rather than `TypeError: not a
 * function`.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapAuthenticationNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("authentication", Concrete;

export default WrapAuthenticationNamespace;
