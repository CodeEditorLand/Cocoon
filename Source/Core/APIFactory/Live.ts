/**
 * @module Live (APIFactory)
 * @description The live implementation `Layer` for the `APIFactory` service.
 */

import { Layer } from "effect";

import { APIDeprecationLive } from "../../Service/APIDeprecation.js";
import { Live as CommandLive } from "../../Service/Command.js";
import { Live as DebugLive } from "../../Service/Debug.js";
import { Live as ExtensionLive } from "../../Service/Extension.js";
import { Live as LanguageFeatureLive } from "../../Service/LanguageFeature.js";
import { Live as LogLive } from "../../Service/Log.js";
import { Live as ProposedAPILive } from "../../Service/ProposedAPI.js";
import { Live as StatusBarLive } from "../../Service/StatusBar.js";
import { Live as TaskLive } from "../../Service/Task.js";
import { Live as TreeViewLive } from "../../Service/TreeView.js";
import { Live as WebViewPanelLive } from "../../Service/WebViewPanel.js";
import { Live as WindowLive } from "../../Service/Window.js";
import { Live as WorkSpaceLive } from "../../Service/WorkSpace.js";
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
