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

import { Effect } from "effect";

// Telemetry import kept lazy so prod bundles drop the bridge.
// `process.env.NODE_ENV !== "production"` is define-substituted to
// `false` literal by esbuild for prod, dead-coding the whole emit
// pathway including the dynamic import.
import LandFixLog from "../../../../../../Utility/Land/Fix/Log.js";

type CaptureEventFn = (
	Name: string,
	Properties?: Record<string, unknown>,
) => void;
let LazyCaptureEvent: CaptureEventFn | undefined;
if (process.env["NODE_ENV"] !== "production") {
	void import("../../../../../../Telemetry/Post/Hog/Bridge.js")
		.then((Module) => {
			LazyCaptureEvent = Module.CaptureEvent as CaptureEventFn;
		})
		.catch(() => {});
}

/** Stable disposable shape used by every event/registration heuristic. */
const NoopDisposable = { dispose: () => {} };

/**
 * Classes the heuristic recognises. `Sync` controls whether the
 * Proxy-returned function calls `Effect.runSync` (sync return shape)
 * or `Effect.runPromise` (Thenable return shape). The wrong choice
 * here breaks consumers: an `onDid*` returning `Promise<Disposable>`
 * fails `disposables.push(...)`, and a `request*Trust(...)` returning
 * a sync `true` fails `await`-driven flows.
 */
type Heuristic = {
	readonly Kind:
		| "trust"
		| "event"
		| "register"
		| "bool-check"
		| "factory"
		| "default";
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

/** Stable "trust" matcher - covers the two vscode.git APIs and any
 * future trust-family additions (`requestPortTrust`, `isOriginTrusted`,
 * etc.). Single-window dev runtime → permissive default `true`. */
const IsTrustFamily = (Property: string): boolean =>
	Property === "requestResourceTrust" ||
	Property === "isResourceTrusted" ||
	Property === "requestWorkspaceTrust" ||
	/^(?:request|is|has)[A-Za-z]*Trust(?:ed)?$/.test(Property);

/** Heuristic classifier given only the property name. Pure function. */
const ClassifyProperty = (Property: string): Heuristic => {
	if (IsTrustFamily(Property)) {
		return {
			Kind: "trust",
			Sync: false,
			Produce: () => true,
		} satisfies Heuristic;
	}
	if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
		return {
			Kind: "event",
			Sync: true,
			Produce: () => NoopDisposable,
		} satisfies Heuristic;
	}
	if (Property.startsWith("register")) {
		return {
			Kind: "register",
			Sync: true,
			Produce: () => NoopDisposable,
		} satisfies Heuristic;
	}
	if (
		Property.startsWith("is") ||
		Property.startsWith("has") ||
		Property.startsWith("should")
	) {
		return {
			Kind: "bool-check",
			Sync: false,
			Produce: () => false,
		} satisfies Heuristic;
	}
	if (
		Property.startsWith("create") ||
		Property.startsWith("get") ||
		Property.startsWith("make")
	) {
		return {
			Kind: "factory",
			Sync: true,
			Produce: () => undefined,
		} satisfies Heuristic;
	}
	return {
		Kind: "default",
		Sync: false,
		Produce: () => undefined,
	} satisfies Heuristic;
};

/**
 * Side-effect channel: log + telemetry. Folded inside an `Effect.sync`
 * so the Effect-TS runtime owns the ordering relative to the heuristic
 * call. `LandFixLog.InfoOnce` handles per-process de-dupe of the
 * `[DEV:VSCODE-API-GAP]` line; PostHog batches every call (count is
 * the signal - which APIs extensions reach for that we haven't yet
 * formally shimmed).
 */
const RecordGap = (
	NamespaceName: string,
	Property: string,
	Kind: Heuristic["Kind"],
): void => {
	const Key = `${NamespaceName}.${Property}`;
	LandFixLog.InfoOnce(
		"VSCODE-API-GAP",
		Key,
		`${NamespaceName}.${Property} → ${Kind}`,
	);
	if (process.env["NODE_ENV"] !== "production") {
		LazyCaptureEvent?.("land:cocoon:vscode_api_gap", {
			namespace: NamespaceName,
			method: Property,
			kind: Kind,
		});
	}
};

/**
 * Build the function the Proxy hands back for an unknown property.
 * The function's body is an Effect program wrapped in
 * `Effect.withSpan` - OTEL pickup is automatic when the Cocoon runtime
 * gains an OTLP exporter Layer. `Effect.runSync` / `Effect.runPromise`
 * select the return shape from the heuristic's `Sync` flag.
 */
const BuildHeuristicMethod =
	(NamespaceName: string, Property: string, Heuristic: Heuristic) =>
	(...Arguments: unknown[]): unknown => {
		const SpanName = `vscode.${NamespaceName}.${Property}`;
		const Program = Effect.gen(function* () {
			yield* Effect.sync(() => {
				try {
					RecordGap(NamespaceName, Property, Heuristic.Kind);
				} catch {
					/* telemetry/log failure must not break the
					 * heuristic stub itself */
				}
			});
			// Wrap `Produce` so a buggy override (custom heuristic
			// that throws on certain argument shapes) degrades to the
			// safe default rather than propagating the throw to the
			// extension caller. Stock VS Code's missing-API access
			// returns `undefined`; matching that shape here keeps
			// extensions defensively coded against `undefined` happy.
			try {
				return Heuristic.Produce(...Arguments);
			} catch {
				switch (Heuristic.Kind) {
					case "trust":
						return true;
					case "event":
						return NoopDisposable;
					case "register":
						return NoopDisposable;
					case "bool-check":
						return false;
					case "factory":
					case "default":
					default:
						return undefined;
				}
			}
		}).pipe(
			Effect.withSpan(SpanName, {
				attributes: {
					"vscode.namespace": NamespaceName,
					"vscode.method": Property,
					"vscode.heuristic": Heuristic.Kind,
				},
			}),
		);
		try {
			return Heuristic.Sync
				? Effect.runSync(Program)
				: Effect.runPromise(Program);
		} catch {
			// Effect.runSync rethrows the program's error. If the
			// safe-default fallback above somehow still threw (Effect
			// runtime panic), return the cheapest no-op shape so the
			// extension caller doesn't crash. Same kind switch as
			// above so trust/event/etc. callers see a usable shape.
			switch (Heuristic.Kind) {
				case "trust":
					return Heuristic.Sync ? true : Promise.resolve(true);
				case "event":
				case "register":
					return NoopDisposable;
				case "bool-check":
					return Heuristic.Sync ? false : Promise.resolve(false);
				default:
					return Heuristic.Sync
						? undefined
						: Promise.resolve(undefined);
			}
		}
	};

/**
 * Wrap a concrete namespace object with the heuristic Proxy fallback.
 *
 * - Defined keys on `Concrete` pass through unchanged (zero behavior
 *   change for the hand-written shim methods).
 * - Unknown string keys go through the classifier → Effect program →
 *   heuristic stub.
 * - Symbol keys / `then` / `Symbol.toPrimitive` return `undefined` so
 *   the wrapped namespace doesn't accidentally look like a Thenable
 *   to `await` consumers, doesn't break console formatting, and
 *   doesn't throw on incidental probes.
 *
 * The wrapper is purely additive: the existing `Concrete` literal
 * stays as-is and remains the hot path. The Proxy only intercepts
 * `Property in Concrete === false` accesses, so no existing call site
 * changes shape.
 */
const WrapNamespaceWithHeuristics = <T extends object>(
	NamespaceName: string,
	Concrete: T,
	Overrides?: HeuristicOverrides,
): T =>
	new Proxy(Concrete, {
		get(Target, Property) {
			if (Reflect.has(Target, Property)) {
				return Reflect.get(Target, Property);
			}
			if (typeof Property !== "string") return undefined;
			if (Property === "then") return undefined;
			// `toJSON` is consulted by `JSON.stringify` whenever a
			// consumer serialises the namespace (workbench state
			// snapshots, telemetry payloads, devtools console
			// inspection). The default heuristic returns
			// `Promise<undefined>` which is wrong here - `toJSON` must
			// return a plain serialisable value (NOT a thenable) so
			// `JSON.stringify` produces something coherent. Return a
			// shallow representation of the concrete object's own keys
			// without firing the audit-log path.
			if (Property === "toJSON") {
				return () => {
					const Out: Record<string, unknown> = {
						_namespace: NamespaceName,
					};
					for (const Key of Object.keys(Target)) {
						const Value = (Target as Record<string, unknown>)[Key];
						const T = typeof Value;
						Out[Key] =
							T === "function"
								? "[Function]"
								: T === "object" && Value !== null
									? "[Object]"
									: Value;
					}
					return Out;
				};
			}
			// `toString` / `valueOf` should NOT be heuristic-stubbed -
			// JS falls back to `Object.prototype.*` which yields the
			// stable `[object Object]` shape consumers expect.
			if (Property === "toString" || Property === "valueOf") {
				return undefined;
			}
			const Heuristic =
				Overrides?.[Property] ?? ClassifyProperty(Property);
			return BuildHeuristicMethod(NamespaceName, Property, Heuristic);
		},
		has(Target, Property) {
			// Reflect ownership for defined keys; report `true` for unknown
			// strings so `"requestResourceTrust" in workspace` reads as
			// truthy (vscode.git's defensive pre-check) and the call hits
			// our Proxy on access.
			if (Reflect.has(Target, Property)) return true;
			return typeof Property === "string" && Property !== "then";
		},
	}) satisfies T;

export default WrapNamespaceWithHeuristics;
