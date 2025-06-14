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
		const services = {
			LogService: yield* Service.Log.Tag,
			ProposedAPIService: yield* Service.ProposedAPI.Tag,
			DeprecationService: yield* Service.APIDeprecation.Tag,
			CommandService: yield* Service.Command.Tag,
			WorkSpaceService: yield* Service.WorkSpace.Tag,
			WindowService: yield* Service.Window.Tag,
			LanguageFeatureService: yield* Service.LanguageFeature.Tag,
			DebugService: yield* Service.Debug.Tag,
			TaskService: yield* Service.Task.Tag,
			ExtensionService: yield* Service.Extension.Tag,
			WebViewPanelService: yield* Service.WebViewPanel.Tag,
			TreeViewService: yield* Service.TreeView.Tag,
			StatusBarService: yield* Service.StatusBar.Tag,
			// CustomEditorService remains commented as its existence is uncertain
		};
		return CreateAPIFactory(services as any);
	}),
);
