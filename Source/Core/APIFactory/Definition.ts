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
import * as ExtHostTypes from "../../Type/ExtHostTypes.js";
import AsExtensionEvent from "./AsExtensionEvent.js";
import CreateCommandNamespace from "./CreateCommandNamespace.js";
import CreateDebugNamespace from "./CreateDebugNamespace.js";
import CreateLanguagesNamespace from "./CreateLanguagesNamespace.js";
import CreateTasksNamespace from "./CreateTasksNamespace.js";
import CreateWindowNamespace from "./CreateWindowNamespace.js";
import CreateWorkSpaceNamespace from "./CreateWorkSpaceNamespace.js";
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

	const CreateAPI = (
		ExtensionDescription: IExtensionDescription,
	): typeof VSCode => {
		const AsEvent = <T>(Event: VSCode.Event<T>) =>
			AsExtensionEvent(ExtensionDescription.identifier, Log, Event);

		const CommandNamespace = CreateCommandNamespace(
			Command,
			ExtensionDescription,
		);
		const WorkSpaceNamespace = CreateWorkSpaceNamespace(
			WorkSpace,
			APIDeprecation,
			AsEvent,
			ExtensionDescription,
		);
		const WindowNamespace = CreateWindowNamespace(
			Window,
			WorkSpace,
			StatusBar,
			WebViewPanel,
			TreeView,
			AsEvent,
			ExtensionDescription,
		);
		const LanguagesNamespace = CreateLanguagesNamespace(
			LanguageFeature,
			ExtensionDescription,
		);
		const DebugNamespace = CreateDebugNamespace(
			Debug,
			AsEvent,
			ExtensionDescription,
		);
		const TasksNamespace = CreateTasksNamespace(
			Task,
			AsEvent,
			ExtensionDescription,
		);

		const API: any = {
			version: "1.85.0",
			commands: CommandNamespace,
			window: WindowNamespace,
			workspace: WorkSpaceNamespace,
			languages: LanguagesNamespace,
			debug: DebugNamespace,
			tasks: TasksNamespace,
			extensions: Extension,
			...ExtHostTypes,
		};

		if (
			ProposedAPI.IsEnabled(
				ExtensionDescription.identifier,
				"someProposedApi",
			)
		) {
			// Object.assign(API, { someProposedApi: ... });
		}

		for (const Key in API) {
			if (Object.prototype.hasOwnProperty.call(API, Key)) {
				const Property = (API as any)[Key];
				if (typeof Property === "object" && Property !== null) {
					Object.freeze(Property);
				}
			}
		}

		return Object.freeze(API) as typeof VSCode;
	};

	const APIFactoryImplementation: Service["Type"] = {
		CreateAPI,
	};

	return APIFactoryImplementation;
});
