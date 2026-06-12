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

		// Direct call - no Effect fiber on every VS Code API invocation.
		try {
			try {
				RecordGap(NamespaceName, Property, Heuristic.Kind);
			} catch {}

			return Heuristic.Produce(...Arguments);
		} catch {
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
 * Wrap `ConcreteNamespace` with a Proxy so that any unknown property access
 * returns a heuristic stub instead of `undefined`.
 */
const WrapNamespaceWithHeuristics = <T extends object>(
	NamespaceName: string,

	ConcreteNamespace: T,

	Overrides?: HeuristicOverrides,
): T =>
	new Proxy(ConcreteNamespace, {
		get(Target, Property: string | symbol) {
			const Key = String(Property);

			if (Property === "then" || Property === Symbol.toPrimitive)

				return undefined;

			const Existing = (Target as Record<string, unknown>)[Key];

			// A property that EXISTS on the concrete namespace must be
			// returned faithfully even when its value is `undefined` -
			// data getters like `window.activeTextEditor` legitimately
			// return `undefined` (no active editor). Substituting a
			// heuristic function makes the value truthy, so extension
			// guards like `if (!editor) return` pass and the next access
			// (`editor.document.languageId`) crashes. Heuristics are only
			// for properties the shim does not define at all.
			if (Existing !== undefined || Reflect.has(Target, Key))

				return Existing;

			const Heuristic = Overrides?.[Key] ?? ClassifyProperty(Key);

			return BuildHeuristicMethod(NamespaceName, Key, Heuristic);
		},

		// `'x' in ns` guards must agree with the `get` trap: every string
		// property resolves to either the concrete value or a heuristic
		// stub, so report presence for all strings (target first so
		// symbol-keyed and inherited members stay truthful).
		has(Target, Property) {
			return Reflect.has(Target, Property) || typeof Property === "string";
		},

		// `Object.getOwnPropertyDescriptor(ns, 'x')` mirrors the `get`
		// trap for string props the target lacks. `ownKeys` is left as
		// the target's own keys - adding phantom keys breaks Proxy
		// invariants - so `Object.keys(ns)` still under-reports; that is
		// the safe trade.
		getOwnPropertyDescriptor(Target, Property) {
			const Real = Reflect.getOwnPropertyDescriptor(Target, Property);

			if (Real !== undefined) return Real;

			if (typeof Property !== "string") return undefined;

			return {
				configurable: true,

				enumerable: false,

				writable: true,

				value:
					Property === "then"
						? undefined
						: BuildHeuristicMethod(
								NamespaceName,

								Property,

								Overrides?.[Property] ??
									ClassifyProperty(Property),
							),
			};
		},
	});

export default WrapNamespaceWithHeuristics;
