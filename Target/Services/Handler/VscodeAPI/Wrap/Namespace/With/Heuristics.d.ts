/**
 * @module Handler/VscodeAPI/WrapNamespaceWithHeuristics
 * @description
 * Generic Proxy-based fallback for `vscode.<namespace>` shims. Wraps a
 * concrete namespace object so unknown property access returns a
 * sensible heuristic-derived stub instead of `undefined` (which throws
 * `TypeError: not a function` inside extensions like `vscode.git`,
 * which calls `workspace.requestResourceTrust(...)` before opening any
 * repository).
 *
 * Heuristic resolves by property-name shape:
 *
 *   trust family       async (...) => true       request*Trust*, is*Trusted
 *   onDid* / onWill*   () => Disposable          event subscription
 *   register*          (...) => Disposable       provider/handler registration
 *   is* / has* / should* (non-trust) async (...) => false   boolean predicates
 *   create* / get* / make*  (...) => undefined   factory / lookup
 *   default            async (...) => undefined  unknown call
 *
 * Each invocation flows through an Effect-TS program with
 * `Effect.withSpan(...)` so OpenTelemetry spans pick up automatically
 * once an exporter Layer is provided to the Cocoon runtime; emits a
 * once-per-method `[DEV:VSCODE-API-GAP]` breadcrumb via `LandFixLog`
 * (production-survivable, no `console.*` reliance) and queues a PostHog
 * `cocoon:vscode_api_gap` event so the analytics pipeline sees which
 * surfaces extensions reach for that we haven't formally shimmed.
 *
 * Mirrors `ExtensionsNamespace.ts::MakePermissiveExports` (the
 * Proxy idiom this project already uses for the
 * `extensions.getExtension(...).exports` namespace) extended with the
 * workspace/window/scm/debug/commands family of method-name shapes.
 *
 * Single export default keeps the file aligned with the Cocoon
 * convention; each per-namespace file (`WrapWorkspaceNamespace`,
 * `WrapWindowNamespace`, etc.) imports this and supplies its name +
 * any namespace-specific overrides.
 */
/**
 * Classes the heuristic recognises. `Sync` controls whether the
 * Proxy-returned function calls `Effect.runSync` (sync return shape)
 * or `Effect.runPromise` (Thenable return shape). The wrong choice
 * here breaks consumers: an `onDid*` returning `Promise<Disposable>`
 * fails `disposables.push(...)`, and a `request*Trust(...)` returning
 * a sync `true` fails `await`-driven flows.
 */
type Heuristic = {
    readonly Kind: "trust" | "event" | "register" | "bool-check" | "factory" | "default";
    readonly Sync: boolean;
    readonly Produce: (...Arguments: unknown[]) => unknown;
};
/**
 * Optional per-namespace overrides. Pass a partial map keyed on the
 * exact property name to short-circuit the regex-based classifier.
 * E.g. `WrapWindowNamespace` may want `showInformationMessage` to
 * keep returning `Promise<undefined>` (matches the default heuristic
 * already, but explicit is safer than trusting the regex).
 */
export type HeuristicOverrides = Readonly<Record<string, Heuristic>>;
/**
 * Wrap `ConcreteNamespace` with a Proxy so that any unknown property access
 * returns a heuristic stub instead of `undefined`.
 */
declare const WrapNamespaceWithHeuristics: <T extends object>(NamespaceName: string, ConcreteNamespace: T, Overrides?: HeuristicOverrides) => T;
export default WrapNamespaceWithHeuristics;
//# sourceMappingURL=Heuristics.d.ts.map