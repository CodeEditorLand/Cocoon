/**
 * @module APIFactory
 * @description The main module for the `APIFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 * It provides the `Live` implementation Layer for the service.
 */

import { Effect, Layer } from "effect";

import * as Service from "../../Service.js";
import { CreateAPIFactory } from "./APIFactory/Create.js";
import { Tag } from "./APIFactory/Service.js";

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
		const LanguageFeatureService = yield* _(Service.LanguageFeature.Tag);
		const DebugService = yield* _(Service.Debug.Tag);
		const TaskService = yield* _(Service.Task.Tag);
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
			LanguageFeatureService,
			DebugService,
			TaskService,
			ExtensionService,
			WebViewPanelService,
			CustomEditorService,
			TreeViewService,
			StatusBarService,
		);
	}),
);
