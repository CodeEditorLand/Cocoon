/**
 * @module Handler/VscodeAPI/WrapWindowNamespace
 * @description
 * Per-namespace wrapper for `vscode.window`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown methods on the window
 * surface (proposed APIs, newer-version additions) return heuristic
 * stubs rather than `TypeError: not a function`.
 *
 * Window-specific note: most `show*` calls are async and naturally
 * match the default heuristic's `async () => undefined`. The default
 * heuristic is therefore correct for `showInformationMessage`,
 * `showWarningMessage`, `showErrorMessage`, etc. when called from a
 * surface we haven't shimmed - they resolve `undefined` (no user
 * choice), which workbench callers already null-check.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapWindowNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("window", Concrete;

export default WrapWindowNamespace;
