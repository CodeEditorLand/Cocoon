/**
 * @module Definition (APIFactory)
 * @description The live implementation of the APIFactory service. This is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

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
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the APIFactory service.
 * It depends on all other high-level services to construct the full `vscode`
 * API surface.
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;
	const ProposedAPI = yield* ProposedAPIService;
	const APIDeprecation = yield* APIDeprecationService;
	const Command = yield* CommandService;
	const WorkSpace = yield* WorkSpaceService;
	const Window = yield* WindowService;
	const LanguageFeature = yield* LanguageFeatureService;
	const Debug = yield* DebugService;
	const Task = yield* TaskService;
	const Extension = yield* ExtensionService;
	const WebViewPanel = yield* WebViewPanelService;
	const TreeView = yield* TreeViewService;
	const StatusBar = yield* StatusBarService;

	const Factory = CreateAPIFactory({
		Log,
		ProposedAPI,
		APIDeprecation,
		Command,
		WorkSpace,
		Window,
		LanguageFeature,
		Debug,
		Task,
		Extension,
		WebViewPanel,
		TreeView,
		StatusBar,
	});

	const APIFactoryImplementation: Service["Type"] = {
		CreateAPI: (ExtensionDescription: IExtensionDescription) =>
			Factory.CreateAPI(ExtensionDescription),
	};

	return APIFactoryImplementation;
});
