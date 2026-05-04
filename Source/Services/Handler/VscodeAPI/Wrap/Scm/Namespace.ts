/**
 * @module Handler/VscodeAPI/WrapScmNamespace
 * @description
 * Per-namespace wrapper for `vscode.scm`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown scm-surface methods return
 * heuristic stubs rather than `TypeError: not a function`. The hand-
 * shimmed `createSourceControl` + `inputBox` stay the hot path.
 *
 * Note: this wraps the namespace object only. The objects returned
 * by `createSourceControl` (the SourceControl instance itself, with
 * its dynamically-created resource groups) are NOT wrapped here -
 * those are constructed per-extension and have their own contracts.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapScmNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("scm", Concrete);

export default WrapScmNamespace;
