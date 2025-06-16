/**
 * @module Create (APIFactory)
 * @description The primary factory function that constructs the `vscode` API
 * object for a given extension. This serves as the `Definition` for the service.
 */

import { Effect, Layer } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import type CommandService from "../../Service/Command/Service.js";
import { Live as DebugLive } from "../../Service/Debug.js";
import type DebugService from "../../Service/Debug/Service.js";
import type ExtensionService from "../../Service/Extension/Service.js";
import type LanguageFeatureService from "../../Service/LanguageFeature/Service.js";
import type LogService from "../../Service/Log/Service.js";
import type ProposedAPIService from "../../Service/ProposedAPI/Service.js";
import type StatusBarService from "../../Service/StatusBar/Service.js";
import type TaskService from "../../Service/Task/Service.js";
import type TreeViewService from "../../Service/TreeView/Service.js";
import type WebViewPanelService from "../../Service/WebViewPanel/Service.js";
import type WindowService from "../../Service/Window/Service.js";
import type WorkSpaceService from "../../Service/WorkSpace/Service.js";
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import AsExtensionEvent from "./AsExtensionEvent.js";
import CreateCommandNamespace from "./CreateCommandNamespace.js";
import CreateDebugNamespace from "./CreateDebugNamespace.js";
import CreateLanguagesNamespace from "./CreateLanguagesNamespace.js";
import CreateTasksNamespace from "./CreateTasksNamespace.js";
import CreateWindowNamespace from "./CreateWindowNamespace.js";
import CreateWorkSpaceNamespace from "./CreateWorkSpaceNamespace.js";

interface ServiceCollection {
	Log: LogService["Type"];
	ProposedAPI: ProposedAPIService["Type"];
	APIDeprecation: APIDeprecationService["Type"];
	Command: CommandService["Type"];
	WorkSpace: WorkSpaceService["Type"];
	Window: WindowService["Type"];
	LanguageFeature: LanguageFeatureService["Type"];
	Debug: DebugService["Type"];
	Task: TaskService["Type"];
	Extension: ExtensionService["Type"];
	WebViewPanel: WebViewPanelService["Type"];
	TreeView: TreeViewService["Type"];
	StatusBar: StatusBarService["Type"];
}

const CreateAPIFactory = (Services: ServiceCollection) => {
	return {
		CreateAPI: (Extension: IExtensionDescription): typeof VSCode => {
			const {
				Log,
				APIDeprecation,
				Command,
				WorkSpace,
				Window,
				LanguageFeature,
				Debug,
				Task,
				Extension: ExtensionService,
				WebViewPanel,
				TreeView,
				StatusBar,
				ProposedAPI,
			} = Services;

			const AsEvent = <T>(event: VSCode.Event<T>) =>
				AsExtensionEvent(Extension.identifier, Log, event);

			const CommandNamespace = CreateCommandNamespace(Command, Extension);
			const WorkSpaceNamespace = CreateWorkSpaceNamespace(
				WorkSpace,
				APIDeprecation,
				AsEvent,
				Extension,
			);
			const WindowNamespace = CreateWindowNamespace(
				Window,
				WorkSpace,
				StatusBar,
				WebViewPanel,
				TreeView,
				AsEvent,
				Extension,
			);
			const LanguagesNamespace = CreateLanguagesNamespace(
				LanguageFeature,
				Extension,
			);

			// Create the Debug namespace by running its constructor Effect synchronously
			// after providing its specific dependencies.
			const DebugNamespace = Effect.runSync(
				Effect.provide(
					CreateDebugNamespace(AsEvent, Extension),
					DebugLive({ MountainAddress: "", CocoonAddress: "" }),
				),
			);

			const TasksNamespace = CreateTasksNamespace(
				Task,
				AsEvent,
				Extension,
			);

			const API: any = {
				version: "1.85.0",
				commands: CommandNamespace,
				window: WindowNamespace,
				workspace: WorkSpaceNamespace,
				languages: LanguagesNamespace,
				debug: DebugNamespace,
				tasks: TasksNamespace,
				extensions: ExtensionService,
				...ExtHostType,
			};

			if (
				ProposedAPI.IsEnabled(Extension.identifier, "someProposedApi")
			) {
				// Object.assign(API, { someProposedApi: ... });
			}

			for (const key in API) {
				if (Object.prototype.hasOwnProperty.call(API, key)) {
					const prop = (API as any)[key];
					if (typeof prop === "object" && prop !== null) {
						Object.freeze(prop);
					}
				}
			}

			return Object.freeze(API) as typeof VSCode;
		},
	};
};

export default CreateAPIFactory;
