/**
 * @module ApiFactory
 * @description The main module for the `ApiFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import { Context, Effect, Layer } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as Vscode from "vscode";

import * as Service from "../../Service/mod.js";
import { CreateApiFactory } from "./CreateApiFactory.js";

/**
 * The interface for the `ApiFactory` service.
 */
export interface Interface {
	/**
	 * Creates a new, sandboxed `vscode` API object for a specific extension.
	 * @param Extension The full description of the extension requesting the API.
	 * @returns A frozen `vscode` API object tailored for the extension.
	 */
	readonly Create: (Extension: IExtensionDescription) => typeof Vscode;
}

/**
 * The `Context.Tag` for the `ApiFactory` service.
 */
export const Tag = Context.Tag<Interface>("ApiFactory");

/**
 * The live implementation `Layer` for the `ApiFactory` service.
 *
 * This layer has a comprehensive dependency graph, as it requires every
 * underlying service that contributes to the final `vscode` API object. It
 * injects all of these services into the `CreateApiFactory` function to
 * construct the final service implementation.
 */
export const Live = Layer.effect(
	Tag,
	Effect.gen(function* (_) {
		// --- Inject all necessary services ---
		const LogService = yield* _(Service.Log.Tag);
		const ProposedApiService = yield* _(Service.ProposedApi.Tag);
		const DeprecationService = yield* _(Service.ApiDeprecation.Tag);
		const CommandsService = yield* _(Service.Commands.Tag);
		const WorkspaceService = yield* _(Service.Workspace.Tag);
		const WindowService = yield* _(Service.Window.Tag);
		const LanguageFeaturesService = yield* _(Service.LanguageFeatures.Tag);
		const DebugService = yield* _(Service.Debug.Tag);
		const TasksService = yield* _(Service.Tasks.Tag);
		const ExtensionService = yield* _(Service.Extension.Tag);
		const WebviewPanelService = yield* _(Service.WebviewPanel.Tag);
		const CustomEditorService = yield* _(Service.CustomEditor.Tag);
		const TreeViewService = yield* _(Service.TreeView.Tag);
		const StatusBarService = yield* _(Service.StatusBar.Tag);
		// Add other services here as they are implemented.

		// --- Construct the factory with all its dependencies ---
		return CreateApiFactory(
			LogService,
			ProposedApiService,
			DeprecationService,
			CommandsService,
			WorkspaceService,
			WindowService,
			LanguageFeaturesService,
			DebugService,
			TasksService,
			ExtensionService,
			WebviewPanelService,
			CustomEditorService,
			TreeViewService,
			StatusBarService,
		);
	}),
);
