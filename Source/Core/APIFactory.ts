/**
 * @module APIFactory
 * @description The main module for the `APIFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import { Context, Effect, Layer } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import * as Service from "../../Service.js";
import { CreateAPIFactory } from "./CreateAPIFactory.js";

/**
 * The interface for the `APIFactory` service.
 */
export interface Interface {
	/**
	 * Creates a new, sandboxed `vscode` API object for a specific extension.
	 * @param Extension The full description of the extension requesting the API.
	 * @returns A frozen `vscode` API object tailored for the extension.
	 */
	readonly Create: (Extension: IExtensionDescription) => typeof VSCode;
}

/**
 * The `Context.Tag` for the `APIFactory` service.
 */
export const Tag = Context.Tag<Interface>("APIFactory");

/**
 * The live implementation `Layer` for the `APIFactory` service.
 *
 * This layer has a comprehensive dependency graph, as it requires every
 * underlying service that contributes to the final `vscode` API object. It
 * injects all of these services into the `CreateAPIFactory` function to
 * construct the final service implementation.
 */
export const Live = Layer.effect(
	Tag,
	Effect.gen(function* (_) {
		// --- Inject all necessary services ---
		const LogService = yield* _(Service.Log.Tag);
		const ProposedAPIService = yield* _(Service.ProposedAPI.Tag);
		const DeprecationService = yield* _(Service.APIDeprecation.Tag);
		const CommandService = yield* _(Service.Command.Tag);
		const WorkSpaceService = yield* _(Service.WorkSpace.Tag);
		const WindowService = yield* _(Service.Window.Tag);
		const LanguageFeaturesService = yield* _(Service.LanguageFeatures.Tag);
		const DebugService = yield* _(Service.Debug.Tag);
		const TasksService = yield* _(Service.Tasks.Tag);
		const ExtensionService = yield* _(Service.Extension.Tag);
		const WebViewPanelService = yield* _(Service.WebViewPanel.Tag);
		const CustomEditorService = yield* _(Service.CustomEditor.Tag);
		const TreeViewService = yield* _(Service.TreeView.Tag);
		const StatusBarService = yield* _(Service.StatusBar.Tag);
		// Add other services here as they are implemented.

		// --- Construct the factory with all its dependencies ---
		return CreateAPIFactory(
			LogService,
			ProposedAPIService,
			DeprecationService,
			CommandService,
			WorkSpaceService,
			WindowService,
			LanguageFeaturesService,
			DebugService,
			TasksService,
			ExtensionService,
			WebViewPanelService,
			CustomEditorService,
			TreeViewService,
			StatusBarService,
		);
	}),
);
