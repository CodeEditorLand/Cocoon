/**
 * @module CreateApiFactory
 * @description The primary factory function that constructs the `vscode` API
 * object for a given extension.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as Vscode from "vscode";

import type * as Service from "../../Service.js";
import * as ExtHostType from "../../Type/ExtHostTypes.js";
import { AsExtensionEvent } from "./AsExtensionEvent.js";
import { CreateCommandsNamespace } from "./CreateCommandsNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkspaceNamespace } from "./CreateWorkspaceNamespace.js";
import type { Interface as ApiFactory } from "./Service.js";

// Placeholders for other namespace creators
// import { CreateDebugNamespace } from "./CreateDebugNamespace.js";
// import { CreateTasksNamespace } from "./CreateTasksNamespace.js";
// import { CreateWebviewNamespace } from "./CreateWebviewNamespace.js";

/**
 * Creates an `ApiFactory` instance.
 *
 * This function uses a dependency injection pattern, taking all necessary
 * extension host services as arguments. It returns a factory object with a
 * `Create` method, which is then used to construct the specific `vscode` API
 * object for each individual extension.
 *
 * @param LogService The service for logging messages.
 * @param DeprecationService The service for handling API deprecations.
 * @param CommandsService The service for command registration and execution.
 * @param WorkspaceService The service for workspace-related information and events.
 * @param WindowService The service for window-related UI and events.
 * @param LanguageFeaturesService The service for registering language providers.
 * @param StatusBarService The service for managing status bar items.
 * @param WebviewPanelService The service for creating and managing webview panels.
 * @param CustomEditorService The service for registering custom editors.
 * @param TreeViewService The service for creating and managing tree views.
 * @returns An `ApiFactory` object capable of creating `vscode` API instances.
 */
export const CreateApiFactory = (
	LogService: Service.Log.Interface,
	DeprecationService: Service.ApiDeprecation.Interface,
	CommandsService: Service.Commands.Interface,
	WorkspaceService: Service.Workspace.Interface,
	WindowService: Service.Window.Interface,
	LanguageFeaturesService: Service.LanguageFeatures.Interface,
	StatusBarService: Service.StatusBar.Interface,
	WebviewPanelService: Service.WebviewPanel.Interface,
	CustomEditorService: Service.CustomEditor.Interface,
	TreeViewService: Service.TreeView.Interface,
	// Add other services like Debug, Tasks, etc. as they are implemented
): ApiFactory => ({
	/**
	 * Creates a new, sandboxed `vscode` API object for a specific extension.
	 * @param Extension The full description of the extension.
	 * @returns A frozen `vscode` API object.
	 */
	Create: (Extension: IExtensionDescription): typeof Vscode => {
		// --- Create Namespaces ---
		const CommandsNamespace = CreateCommandsNamespace(
			CommandsService,
			Extension,
		);
		const WorkspaceNamespace = CreateWorkspaceNamespace(
			WorkspaceService,
			DeprecationService,
			Extension,
		);
		const WindowNamespace = CreateWindowNamespace(
			WindowService,
			WorkspaceService,
			StatusBarService,
			WebviewPanelService,
			CustomEditorService,
			TreeViewService,
			(Event) =>
				AsExtensionEvent(Extension.identifier, LogService, Event),
			Extension,
		);
		const LanguagesNamespace = CreateLanguagesNamespace(
			LanguageFeaturesService,
			Extension,
		);
		// const DebugNamespace = CreateDebugNamespace(DebugService, Extension);
		// const TasksNamespace = CreateTasksNamespace(TasksService, Extension);

		// --- Assemble Final API Object ---
		const Api = {
			// This version should come from a centralized product service.
			version: "1.85.0",
			commands: CommandsNamespace,
			window: WindowNamespace,
			workspace: WorkspaceNamespace,
			languages: LanguagesNamespace,
			// Other namespaces would be added here.
			// debug: DebugNamespace,
			// tasks: TasksNamespace,

			// --- Static Types and Enums from VS Code ---
			...ExtHostType,
		};

		// --- Freeze API to prevent runtime modification by extensions ---
		Object.freeze(Api.commands);
		Object.freeze(Api.window);
		Object.freeze(Api.workspace);
		Object.freeze(Api.languages);
		// ... freeze other namespaces ...

		return Object.freeze(Api) as typeof Vscode;
	},
});
