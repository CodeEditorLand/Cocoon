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
// Synthesizing missing imports based on dependencies
import { CreateDebugNamespace } from "./CreateDebugNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateTasksNamespace } from "./CreateTasksNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkSpaceNamespace } from "./CreateWorkSpaceNamespace.js";
import type { Interface as APIFactory } from "./Service.js";

/**
 * Creates an `APIFactory` instance.
 *
 * This function uses a dependency injection pattern, taking all necessary
 * extension host services as arguments. It returns a factory object with a
- * `Create` method, which is then used to construct the specific `vscode` API
+ * `CreateAPI` method, which is then used to construct the specific `vscode` API
 * object for each individual extension.
 *
 * @param LogService The service for logging messages.
 * @param DeprecationService The service for handling API deprecations.
 * @param CommandService The service for command registration and execution.
 * @param WorkSpaceService The service for workspace-related information and events.
 * @param WindowService The service for window-related UI and events.
 * @param LanguageFeatureService The service for registering language providers.
 * @param DebugService The service for debugging features.
 * @param TaskService The service for task management.
 * @param StatusBarService The service for managing status bar items.
 * @param WebViewPanelService The service for creating and managing webview panels.
 * @param CustomEditorService The service for registering custom editors.
 * @param TreeViewService The service for creating and managing tree views.
 * @returns An `APIFactory` object capable of creating `vscode` API instances.
 */
export function CreateAPIFactory(
	LogService: Service.Log.Interface,
	ProposedAPIService: Service.ProposedAPI.Interface,
	DeprecationService: Service.APIDeprecation.Interface,
	CommandService: Service.Command.Interface,
	WorkSpaceService: Service.WorkSpace.Interface,
	WindowService: Service.Window.Interface,
	LanguageFeatureService: Service.LanguageFeature.Interface,
	DebugService: Service.Debug.Interface,
	TaskService: Service.Task.Interface,
	ExtensionService: Service.Extension.Interface,
	WebViewPanelService: Service.WebViewPanel.Interface,
	CustomEditorService: Service.CustomEditor.Interface,
	TreeViewService: Service.TreeView.Interface,
	StatusBarService: Service.StatusBar.Interface,
): APIFactory {
	return {
		/**
		 * Creates a new, sandboxed `vscode` API object for a specific extension.
		 * @param Extension The full description of the extension.
		 * @returns A frozen `vscode` API object.
		 */
		CreateAPI: (Extension: IExtensionDescription): typeof VSCode => {
			// --- Create Namespaces ---
			const CommandNamespace = CreateCommandNamespace(
				CommandService,
				Extension,
			);
			const WorkSpaceNamespace = CreateWorkSpaceNamespace(
				WorkSpaceService,
				DeprecationService,
				Extension,
			);
			const WindowNamespace = CreateWindowNamespace(
				WindowService,
				WorkSpaceService,
				StatusBarService,
				WebViewPanelService,
				CustomEditorService,
				TreeViewService,
				(Event) =>
					AsExtensionEvent(Extension.identifier, LogService, Event),
				Extension,
			);
			const LanguagesNamespace = CreateLanguagesNamespace(
				LanguageFeatureService,
				Extension,
			);
			const DebugNamespace = CreateDebugNamespace(
				DebugService,
				Extension,
			);
			const TasksNamespace = CreateTasksNamespace(TaskService, Extension);

			// --- Assemble Final API Object ---
			const API = {
				// This version should come from a centralized product service.
				version: "1.85.0",
				commands: CommandNamespace,
				window: WindowNamespace,
				workspace: WorkSpaceNamespace,
				languages: LanguagesNamespace,
				debug: DebugNamespace,
				tasks: TasksNamespace,
				// Other namespaces would be added here.
				extensions: ExtensionService, // The extensions API is often top-level

				// --- Static Types and Enums from VS Code ---
				...ExtHostType,
			};

			// --- Propose API features if enabled for this extension ---
			if (
				ProposedAPIService.IsEnabled(
					Extension.identifier,
					"someProposedApi",
				)
			) {
				// Object.assign(API, { someProposedApi: ... });
			}

			// --- Freeze API to prevent runtime modification by extensions ---
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
