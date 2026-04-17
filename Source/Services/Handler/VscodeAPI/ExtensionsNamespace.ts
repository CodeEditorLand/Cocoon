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
// methods like `onDidChangeEnablement(...)`, `getAPI()`, etc. Returning
// `undefined` causes activation to throw on the first method access.
// A permissive Proxy returns disposable-producing stubs for anything
// accessed. Critical behaviors:
//   - `register*(...)` returns `{ dispose: () => {} }` (VS Code contract)
//   - `onDid*(cb)` / `onWill*(cb)` returns `{ dispose: () => {} }`
//   - `enabled` is `true` (so consumers see the extension as active)
//   - Any other property access yields another permissive proxy so
//     chained calls like `.getAPI(1).registerX()` work.
const NoopDisposable = { dispose: () => {} };
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
				return undefined;
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
			// Factory-style: getAPI(v), getGitAPI(), etc. return another
			// permissive proxy so chained access succeeds.
			if (Property.startsWith("get") || Property.startsWith("create")) {
				return (..._Args: unknown[]) => MakePermissiveExports();
			}
			// Fallback — callable returning undefined.
			return (..._Args: unknown[]) => undefined;
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
