

/**
 * @module Live (APIFactory)
 * @description The live implementation `Layer` for the `APIFactory` service.
 */

import { Layer } from "effect";

import APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import CommandService from "../../Service/Command/Service.js";
import DebugService from "../../Service/Debug/Service.js";
import DocumentService from "../../Service/Document/Service.js";
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
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 * It provides all the necessary service layers required by the `Definition`.
 */
const Live: Layer.Layer<
	Service,
	never,
	| LogService
	| ProposedAPIService
	| APIDeprecationService
	| CommandService
	| WorkSpaceService
	| DocumentService
	| WindowService
	| LanguageFeatureService
	| DebugService
	| TaskService
	| ExtensionService
	| WebViewPanelService
	| TreeViewService
	| StatusBarService
> = Layer.effect(Service, Definition);

export default Live;
