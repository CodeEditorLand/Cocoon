/**
 * @module Handler/VscodeAPI/WrapTasksNamespace
 * @description
 * Per-namespace wrapper for `vscode.tasks`. Delegates to
 * `WrapNamespaceWithHeuristics` so unknown tasks-surface methods
 * (proposed APIs, newer event subscriptions) return heuristic stubs
 * rather than `TypeError: not a function`.
 */

import WrapNamespaceWithHeuristics from "../Namespace/With/Heuristics.js";

const WrapTasksNamespace = <T extends object>(Concrete: T): T =>
	WrapNamespaceWithHeuristics("tasks", Concrete;

export default WrapTasksNamespace;
