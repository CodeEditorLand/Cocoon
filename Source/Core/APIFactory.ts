/**
 * @module APIFactory
 * @description The main module for the `APIFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import { Effect, Layer } from "effect";

import * as Service from "../../Service.js";
import { CreateAPIFactory } from "./APIFactory/Create.js";
import { Tag } from "./APIFactory/Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 */
export const Live = Layer.effect(
	Tag,
	Effect.gen(function* () {
		// --- Inject all necessary services ---
		const LogService = yield* Service.Log.Tag;
		const ProposedAPIService = yield* Service.ProposedAPI.Tag;
		const DeprecationService = yield* Service.APIDeprecation.Tag;
		const CommandService = yield* Service.Command.Tag;
		const WorkSpaceService = yield* Service.WorkSpace.Tag;
		const WindowService = yield* Service.Window.Tag;
		const LanguageFeatureService = yield* Service.LanguageFeature.Tag;
		const DebugService = yield* Service.Debug.Tag;
		const TaskService = yield* Service.Task.Tag;
		const ExtensionService = yield* Service.Extension.Tag;
		const WebViewPanelService = yield* Service.WebViewPanel.Tag;
		const TreeViewService = yield* Service.TreeView.Tag;
		const StatusBarService = yield* Service.StatusBar.Tag;
		// Assuming Service.CustomEditor is available, if not, this will need to be mocked or imported
		// const CustomEditorService = yield* Service.CustomEditor.Tag;

		// --- Construct the factory with all its dependencies ---
		return CreateAPIFactory(
			{
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
				// CustomEditorService,
				TreeViewService,
				StatusBarService,
			},
			// This part is missing, assuming it should be a placeholder or another service
		);
	}),
);
