/**
 * @module Handler/VscodeAPI/ExtensionsNamespace
 * @description
 * Factory for the vscode.extensions namespace shim.
 * Backed by HandlerContext.ExtensionRegistry — populated by
 * `InitializeExtensionHost` from Mountain.
 * Provides: getExtension, all, onDidChange.
 */

import LandFixLog from "../../../Utility/LandFixLog.js";
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

// Mountain ships `extensionLocation` as either a `file://` URL string or an
// already-shaped UriComponents object. `vscode.extensions.all[…].extensionUri`
// is handed straight to `Uri.joinPath(uri, …)` by the language-features
// extensions; that call throws `cannot call joinPath on URI without path`
// unless the value is a real `URI` instance (or at minimum an object with a
// non-empty `.path` and a working `.with({ path })`). Normalise every
// reasonable shape into a single filesystem path + real URI.
const NormalizeLocation = (
	Raw: unknown,
): { ExtensionPath: string; ExtensionUri: any } => {
	const VsCodeUri = (globalThis as any).__cocoonVscodeAPI?.Uri;
	const UriFactoryAvailable =
		VsCodeUri && typeof VsCodeUri.file === "function";
	const MakeUri = (Path: string): any => {
		if (UriFactoryAvailable) {
			return VsCodeUri.file(Path);
		}
		return {
			scheme: "file",
			authority: "",
			path: Path,
			query: "",
			fragment: "",
			fsPath: Path,
			with(this: any, Change: any) {
				return { ...this, ...Change };
			},
			toString: () => `file://${Path}`,
			toJSON() {
				return { scheme: "file", path: Path };
			},
		};
	};

	if (typeof Raw === "string" && Raw.length > 0) {
		let Path = Raw;
		if (Raw.startsWith("file:")) {
			try {
				Path = decodeURIComponent(new URL(Raw).pathname);
			} catch (Error: unknown) {
				LandFixLog.Warn(
					"ExtNs",
					`URL parse failed for ${Raw}: ${Error instanceof Error ? Error.message : String(Error)}; using fallback strip`,
				);
				Path = Raw.replace(/^file:\/\//, "");
			}
		}
		Path = Path.replace(/\/$/, "");
		if (UriFactoryAvailable) {
			LandFixLog.DebugOnce(
				"ExtNs",
				`string:${Path}`,
				`string extensionLocation ${Raw} → path=${Path} (factory=real)`,
			);
		} else {
			LandFixLog.InfoOnce(
				"ExtNs",
				`string-fallback:${Path}`,
				`string extensionLocation ${Raw} → path=${Path} (factory=FALLBACK)`,
			);
		}
		return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
	}

	if (Raw && typeof Raw === "object") {
		const Obj = Raw as Record<string, unknown>;
		const Path =
			(typeof Obj["fsPath"] === "string" && (Obj["fsPath"] as string)) ||
			(typeof Obj["path"] === "string" && (Obj["path"] as string)) ||
			(typeof Obj["external"] === "string"
				? NormalizeLocation(Obj["external"]).ExtensionPath
				: "");
		if (UriFactoryAvailable) {
			LandFixLog.DebugOnce(
				"ExtNs",
				`object:${Path}`,
				`object extensionLocation keys=[${Object.keys(Obj).join(",")}] → path=${Path} (factory=real)`,
			);
		} else {
			LandFixLog.InfoOnce(
				"ExtNs",
				`object-fallback:${Path}`,
				`object extensionLocation keys=[${Object.keys(Obj).join(",")}] → path=${Path} (factory=FALLBACK)`,
			);
		}
		return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
	}

	LandFixLog.Warn(
		"ExtNs",
		`extensionLocation missing or unsupported type: ${typeof Raw}; using empty path`,
	);
	return { ExtensionPath: "", ExtensionUri: MakeUri("") };
};

const ToExtensionObject = (Context: HandlerContext, Id: string, Raw: any) => {
	const Exports = MakePermissiveExports();
	const { ExtensionPath, ExtensionUri } = NormalizeLocation(
		Raw?.extensionLocation,
	);
	return {
		id: Id,
		extensionUri: ExtensionUri,
		extensionPath: ExtensionPath,
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

// Registry entries whose key starts with `__` are provider/handler stashes
// registered from WindowNamespace / WorkspaceNamespace (uriHandler,
// fileDecorationProvider, terminalLinkProvider, terminalProfileProvider),
// not real extension descriptions. Exclude them from the extensions.*
// getters so ToExtensionObject isn't fed Raw = undefined on
// extensionLocation — otherwise NormalizeLocation emits a WARN and returns
// a bogus extension with empty path.
const IsExtensionKey = (Key: string) => !Key.startsWith("__");

const CreateExtensionsNamespace = (Context: HandlerContext) => ({
	getExtension: (Identifier: string) => {
		if (!IsExtensionKey(Identifier)) return undefined;
		const Raw = Context.ExtensionRegistry.get(Identifier);
		return Raw ? ToExtensionObject(Context, Identifier, Raw) : undefined;
	},
	get all() {
		return [...Context.ExtensionRegistry.entries()]
			.filter(([Id]) => IsExtensionKey(Id))
			.map(([Id, Raw]) => ToExtensionObject(Context, Id, Raw));
	},
	// Some extensions (html-language-features) iterate
	// `extensions.allAcrossExtensionHosts`; return the same array as `all`
	// so `for (...of...)` does not throw on `is not iterable`.
	get allAcrossExtensionHosts() {
		return [...Context.ExtensionRegistry.entries()]
			.filter(([Id]) => IsExtensionKey(Id))
			.map(([Id, Raw]) => ToExtensionObject(Context, Id, Raw));
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
