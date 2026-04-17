/**
 * @module Handler/VscodeAPI/ExtensionsNamespace
 * @description
 * Factory for the vscode.extensions namespace shim.
 * Backed by HandlerContext.ExtensionRegistry — populated by
 * `InitializeExtensionHost` from Mountain.
 * Provides: getExtension, all, onDidChange.
 */

import type { HandlerContext } from "../HandlerContext.js";

const ToExtensionObject = (Context: HandlerContext, Id: string, Raw: any) => ({
	id: Id,
	extensionUri: Raw?.extensionLocation ?? { scheme: "file", path: "", fsPath: "" },
	extensionPath: Raw?.extensionLocation?.fsPath ?? Raw?.extensionLocation?.path ?? "",
	isActive: Context.ActivatedExtensions.has(Id),
	packageJSON: Raw,
	extensionKind: 1,
	exports: undefined,
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
