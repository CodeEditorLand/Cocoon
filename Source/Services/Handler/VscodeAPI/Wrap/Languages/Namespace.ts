/**
 * @module Handler/VscodeAPI/WrapLanguagesNamespace
 * @description
 * Per-namespace wrapper for `vscode.languages`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown languages-surface methods
 * (proposed APIs around language model providers, semantic tokens
 * legends, document drop edits, etc.) return heuristic stubs rather
 * than `TypeError: not a function`.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapLanguagesNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("languages", Concrete;

export default WrapLanguagesNamespace;
