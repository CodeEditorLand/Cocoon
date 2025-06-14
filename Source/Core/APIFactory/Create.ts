/**
 * @module CreateAPIFactory
 * @description The primary factory function that constructs the `vscode` API
 * object for a given extension.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type * as Service from "../../Service.js";
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import { AsExtensionEvent } from "./AsExtensionEvent.js";
import { CreateCommandNamespace } from "./CreateCommandNamespace.js";
import { CreateDebugNamespace } from "./CreateDebugNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateTasksNamespace } from "./CreateTasksNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkSpaceNamespace } from "./CreateWorkSpaceNamespace.js";
import type { Interface as APIFactory } from "./Service.js";

interface ServiceCollection {
	LogService: Service.Log.Interface;
	ProposedAPIService: Service.ProposedAPI.Interface;
	DeprecationService: Service.APIDeprecation.Interface;
	CommandService: Service.Command.Interface;
	WorkSpaceService: Service.WorkSpace.Interface;
	WindowService: Service.Window.Interface;
	LanguageFeatureService: Service.LanguageFeature.Interface;
	DebugService: Service.Debug.Interface;
	TaskService: Service.Task.Interface;
	ExtensionService: Service.Extension.Interface;
	WebViewPanelService: Service.WebViewPanel.Interface;
	// CustomEditorService: Service.CustomEditor.Interface,
	TreeViewService: Service.TreeView.Interface;
	StatusBarService: Service.StatusBar.Interface;
}

export function CreateAPIFactory(Services: ServiceCollection): APIFactory {
	return {
		CreateAPI: (Extension: IExtensionDescription): typeof VSCode => {
			const {
				LogService,
				DeprecationService,
				CommandService,
				WorkSpaceService,
				WindowService,
				LanguageFeatureService,
				DebugService,
				TaskService,
				ExtensionService,
				WebViewPanelService,
				TreeViewService,
				StatusBarService,
				ProposedAPIService,
			} = Services;

			const AsEvent = <T>(event: VSCode.Event<T>) =>
				AsExtensionEvent(Extension.identifier, LogService, event);

			const CommandNamespace = CreateCommandNamespace(
				CommandService,
				Extension,
			);
			const WorkSpaceNamespace = CreateWorkSpaceNamespace(
				WorkSpaceService,
				DeprecationService,
				AsEvent,
				Extension,
			);
			const WindowNamespace = CreateWindowNamespace(
				WindowService,
				WorkSpaceService,
				StatusBarService,
				WebViewPanelService,
				// CustomEditorService,
				TreeViewService,
				AsEvent,
				Extension,
			);
			const LanguagesNamespace = CreateLanguagesNamespace(
				LanguageFeatureService,
				Extension,
			);
			const DebugNamespace = CreateDebugNamespace(
				DebugService,
				AsEvent,
				Extension,
			);
			const TasksNamespace = CreateTasksNamespace(
				TaskService,
				AsEvent,
				Extension,
			);

			const API = {
				// TODO: CHANGE THIS TO ALWAYS BE 0.0.1 EVERYWHERE
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
				ProposedAPIService.IsEnabled(
					Extension.identifier,
					"someProposedApi",
				)
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
}
