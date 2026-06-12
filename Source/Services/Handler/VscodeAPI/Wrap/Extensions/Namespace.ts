/**
 * @module Handler/VscodeAPI/WrapExtensionsNamespace
 * @description
 * Per-namespace wrapper for `vscode.extensions`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown extensions-surface methods
 * return heuristic stubs rather than `TypeError: not a function`.
 *
 * Note: this wraps the *namespace* level only. The objects returned
 * by `getExtension(id).exports` already use a separate
 * `MakePermissiveExports` Proxy (defined inline in
 * `ExtensionsNamespace.ts`) - keep that intact; this wrapper handles
 * the namespace-level surface (`onDidChange`, future event additions,
 * proposed APIs).
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapExtensionsNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("extensions", Concrete;

export default WrapExtensionsNamespace;
