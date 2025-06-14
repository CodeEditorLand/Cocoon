/**
 * @module Live (APIFactory)
 * @description The live implementation `Layer` for the `APIFactory` service.
 */

import { Layer } from "effect";

import APIDeprecationLive from "../../Service/APIDeprecation/Live.js";
import CommandLive from "../../Service/Command/Live.js";
import DebugLive from "../../Service/Debug/Live.js";
import ExtensionLive from "../../Service/Extension/Live.js";
import LanguageFeatureLive from "../../Service/LanguageFeature/Live.js";
import LogLive from "../../Service/Log/Live.js";
import ProposedAPILive from "../../Service/ProposedAPI/Live.js";
import StatusBarLive from "../../Service/StatusBar/Live.js";
import TaskLive from "../../Service/Task/Live.js";
import TreeViewLive from "../../Service/TreeView/Live.js";
import WebViewPanelLive from "../../Service/WebViewPanel/Live.js";
import WindowLive from "../../Service/Window/Live.js";
import WorkSpaceLive from "../../Service/WorkSpace/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 * It provides all the necessary service layers required by the `Definition`.
 */
const Live = Layer.effect(Service, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			LogLive,
			ProposedAPILive,
			APIDeprecationLive,
			CommandLive,
			WorkSpaceLive,
			WindowLive,
			LanguageFeatureLive,
			DebugLive,
			TaskLive,
			ExtensionLive,
			WebViewPanelLive,
			TreeViewLive,
			StatusBarLive,
		),
	),
);

export default Live;
