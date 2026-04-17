/**
 * @module Handler/VscodeAPI/ExtensionsNamespace
 * @description
 * Factory for the vscode.extensions namespace shim.
 * Backed by HandlerContext.ExtensionRegistry — populated by
 * `InitializeExtensionHost` from Mountain.
 * Provides: getExtension, all, onDidChange.
 */

import type { HandlerContext } from "../HandlerContext.js";

// When an extension reads `vscode.extensions.getExtension('X').exports`,
// the caller expects the exporter's public API. For built-ins like
// `vscode.git-base`, `vscode.git`, `vscode.github`, the consumer calls
// methods like `onDidChangeEnablement(...)`, `getAPI()`, `repositories`,
// etc. Returning `undefined` or a plain function causes activation to
// throw on the first unexpected access pattern.
//
// The strategy: every unknown property access returns the same shared
// `Stub` value, a Proxy that is simultaneously **callable** (function
// target), **iterable** (`Symbol.iterator` yields nothing), and
// **chainable** (any property access returns the same Stub). This
// single object satisfies every idiomatic consumer:
//
//   gitAPI.repositories          → Stub (iterable → 0 repos)
//   for (const r of gitAPI.repositories)  → 0 iterations
//   gitAPI.getAPI(1)             → Stub (callable → Stub)
//   gitAPI.registerPushErrorHandler(...) → NoopDisposable (explicit)
//   gitAPI.repositories.length   → 0
//   gitAPI.repositories.map(...) → [] (array delegation)
//
// Explicit special cases are still handled first so common VS Code
// idioms (`onDid*`, `register*`, `dispose`) return proper shapes.
const NoopDisposable = { dispose: () => {} };

const MakeMultiStub = (): any => {
	const StubTarget: any = function MultiStub() {
		return StubProxy;
	};
	StubTarget.dispose = () => {};
	StubTarget.length = 0;
	StubTarget[Symbol.iterator] = function* () {
		// Empty iterator — `for (...of stub)` completes with 0 elements.
	};
	// Delegate array-ish methods to an empty array so `.map`, `.filter`,
	// `.forEach`, `.find`, etc. behave without throwing.
	const ArrayShim: readonly unknown[] = [];
	const ArrayMethods: ReadonlyArray<keyof Array<unknown>> = [
		"forEach",
		"map",
		"filter",
		"find",
		"findIndex",
		"some",
		"every",
		"reduce",
		"reduceRight",
		"includes",
		"indexOf",
		"lastIndexOf",
		"slice",
		"concat",
		"join",
		"entries",
		"keys",
		"values",
		"flat",
		"flatMap",
	];
	for (const Name of ArrayMethods) {
		(StubTarget as Record<string, unknown>)[Name as string] = (
			ArrayShim as Record<string, unknown>
		)[Name as string];
	}
	const StubProxy: any = new Proxy(StubTarget, {
		get(Target, Property) {
			if (Property in Target) {
				return (Target as Record<PropertyKey, unknown>)[
					Property as string
				];
			}
			if (Property === "then") return undefined;
			if (typeof Property === "symbol") return undefined;
			return StubProxy;
		},
		apply() {
			return StubProxy;
		},
		has() {
			return true;
		},
	});
	return StubProxy;
};

// One shared Stub is enough — it's stateless and idempotent.
const Stub = MakeMultiStub();

const MakePermissiveExports = (): any => {
	const Base: Record<string, unknown> = {
		enabled: true,
	};
	return new Proxy(Base, {
		get(Target, Property) {
			if (Property in Target) {
				return (Target as Record<PropertyKey, unknown>)[Property];
			}
			if (typeof Property !== "string") {
				// For well-known symbols (e.g. `Symbol.iterator`,
				// `Symbol.asyncIterator`) delegate to the multi-stub so
				// the exports object itself is iterable when consumers try.
				return (Stub as Record<PropertyKey, unknown>)[
					Property as PropertyKey
				];
			}
			// Not a thenable — must not look like a promise to `await`.
			if (Property === "then") return undefined;
			// Event subscriptions: `onDidX(cb)` / `onWillX(cb)` → disposable.
			if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
				return (_Listener?: unknown) => NoopDisposable;
			}
			// Registration APIs: return disposable so `disposables.add(...)` works.
			if (Property.startsWith("register")) {
				return (..._Args: unknown[]) => NoopDisposable;
			}
			// Factory-style: `getAPI(v)`, `getGitAPI()`, etc. return another
			// permissive proxy so chained access succeeds AND the result is
			// also iterable/callable (covers `gitAPI.repositories` access).
			if (Property.startsWith("get") || Property.startsWith("create")) {
				return (..._Args: unknown[]) => MakePermissiveExports();
			}
			// Fallback — the multi-stub: callable, iterable, chainable.
			return Stub;
		},
	});
};

const ToExtensionObject = (Context: HandlerContext, Id: string, Raw: any) => {
	const Exports = MakePermissiveExports();
	return {
		id: Id,
		extensionUri: Raw?.extensionLocation ?? {
			scheme: "file",
			path: "",
			fsPath: "",
		},
		extensionPath:
			Raw?.extensionLocation?.fsPath ??
			Raw?.extensionLocation?.path ??
			"",
		// Reporting `isActive: true` mirrors VS Code's behaviour for
		// built-ins that have completed activation; without it, callers
		// like the `github` extension treat the extension as missing.
		isActive: true,
		packageJSON: Raw,
		extensionKind: 1,
		exports: Exports,
		// Critical: `activate()` must resolve to the SAME exports object
		// so consumers like `vscode.github` can chain
		// `gitExtension.activate().then(api => api.onDidChangeEnablement(...))`.
		activate: async () => Exports,
	};
};

const CreateExtensionsNamespace = (Context: HandlerContext) => ({
	getExtension: (Identifier: string) => {
		const Raw = Context.ExtensionRegistry.get(Identifier);
		return Raw ? ToExtensionObject(Context, Identifier, Raw) : undefined;
	},
	get all() {
		return [...Context.ExtensionRegistry.entries()].map(([Id, Raw]) =>
			ToExtensionObject(Context, Id, Raw),
		);
	},
	// Some extensions (html-language-features) iterate
	// `extensions.allAcrossExtensionHosts`; return the same array as `all`
	// so `for (...of...)` does not throw on `is not iterable`.
	get allAcrossExtensionHosts() {
		return [...Context.ExtensionRegistry.entries()].map(([Id, Raw]) =>
			ToExtensionObject(Context, Id, Raw),
		);
	},
	onDidChange: (Listener: () => void) => {
		Context.Emitter.on("deltaExtensions", Listener);
		return {
			dispose: () => {
				Context.Emitter.off("deltaExtensions", Listener);
			},
		};
	},
});

export default CreateExtensionsNamespace;
