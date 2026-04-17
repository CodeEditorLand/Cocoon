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
// A permissive Proxy returns no-op functions for anything accessed,
// with a shared `enabled: true` and disposable-producing event hooks.
const MakePermissiveExports = (): unknown =>
	new Proxy(
		{
			enabled: true,
			getAPI: (_Version?: number) => MakePermissiveExports(),
		},
		{
			get(Target, Property) {
				if (Property in Target) {
					return (Target as Record<PropertyKey, unknown>)[Property];
				}
				if (typeof Property === "string") {
					if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
						return () => ({ dispose: () => {} });
					}
					if (Property === "then") return undefined; // not a thenable
				}
				return () => undefined;
			},
		},
	);

const ToExtensionObject = (Context: HandlerContext, Id: string, Raw: any) => ({
	id: Id,
	extensionUri: Raw?.extensionLocation ?? { scheme: "file", path: "", fsPath: "" },
	extensionPath: Raw?.extensionLocation?.fsPath ?? Raw?.extensionLocation?.path ?? "",
	isActive: Context.ActivatedExtensions.has(Id),
	packageJSON: Raw,
	extensionKind: 1,
	exports: MakePermissiveExports(),
	activate: async () => {},
});

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
