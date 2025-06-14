/**
 * @module Live (APIFactory)
 * @description The live implementation `Layer` for the `APIFactory` service.
 */

import { Effect, Layer } from "effect";

import APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import CommandService from "../../Service/Command/Service.js";
import DebugService from "../../Service/Debug/Service.js";
import ExtensionService from "../../Service/Extension/Service.js";
import LanguageFeatureService from "../../Service/LanguageFeature/Service.js";
import LogService from "../../Service/Log/Service.js";
import ProposedAPIService from "../../Service/ProposedAPI/Service.js";
import StatusBarService from "../../Service/StatusBar/Service.js";
import TaskService from "../../Service/Task/Service.js";
import TreeViewService from "../../Service/TreeView/Service.js";
import WebViewPanelService from "../../Service/WebViewPanel/Service.js";
import WindowService from "../../Service/Window/Service.js";
import WorkSpaceService from "../../Service/WorkSpace/Service.js";
import CreateAPIFactory from "./Create.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 */
export default Layer.effect(
	Service,
	Effect.gen(function* () {
		const services = {
			Log: yield* LogService,
			ProposedAPI: yield* ProposedAPIService,
			APIDeprecation: yield* APIDeprecationService,
			Command: yield* CommandService,
			WorkSpace: yield* WorkSpaceService,
			Window: yield* WindowService,
			LanguageFeature: yield* LanguageFeatureService,
			Debug: yield* DebugService,
			Task: yield* TaskService,
			Extension: yield* ExtensionService,
			WebViewPanel: yield* WebViewPanelService,
			TreeView: yield* TreeViewService,
			StatusBar: yield* StatusBarService,
		};
		return CreateAPIFactory(services);
	}),
);
