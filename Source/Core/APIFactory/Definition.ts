/*
 * File: Cocoon/Source/Core/APIFactory/Definition.ts
 * Role: Provides the live implementation of the APIFactory service.
 * Responsibilities:
 *   - Gathers all necessary sub-services (Commands, Workspace, Window, etc.).
 *   - Constructs the complete, sandboxed `vscode` API object for a given extension
 *     by composing the various API namespaces.
 */

import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { Position, Range, Selection } from "vscode";
import { APIDeprecation } from "../../Service/APIDeprecation/Service.js";
import { Command } from "../../Service/Command/Service.js";
import { Debug } from "../../Service/Debug/Service.js";
import { Document } from "../../Service/Document/Service.js";
import { Extension } from "../../Service/Extension/Service.js";
import { LanguageFeature } from "../../Service/LanguageFeature/Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { ProposedAPI } from "../../Service/ProposedAPI/Service.js";
import { StatusBar } from "../../Service/StatusBar/Service.js";
import { Task } from "../../Service/Task/Service.js";
import { TreeView } from "../../Service/TreeView/Service.js";
import { WebViewPanel } from "../../Service/WebViewPanel/Service.js";
import { Window } from "../../Service/Window/Service.js";
import { Workspace } from "../../Service/WorkSpace/Service.js";
import { AsExtensionEvent } from "./AsExtensionEvent.js";
import { CreateCommandNamespace } from "./CreateCommandNamespace.js";
import { CreateDebugNamespace } from "./CreateDebugNamespace.js";
import { CreateLanguagesNamespace } from "./CreateLanguagesNamespace.js";
import { CreateTasksNamespace } from "./CreateTasksNamespace.js";
import { CreateWindowNamespace } from "./CreateWindowNamespace.js";
import { CreateWorkspaceNamespace } from "./CreateWorkSpaceNamespace.js";

/**
 * A factory function that constructs the `vscode.extensions` namespace object.
 * @param ExtensionService - The central service for extension management.
 * @returns An object implementing the `vscode.extensions` API.
 */
const CreateExtensionsAPI = (
	ExtensionService: Extension["Type"],
): typeof VSCode.extensions => ({
	getExtension: (ExtensionId: string) =>
		Effect.runSync(ExtensionService.GetExtension(ExtensionId)),
	get all() {
		return Effect.runSync(ExtensionService.GetAll());
	},
	get allAcrossExtensionHosts() {
		// Not supported in this architecture.
		return [];
	},
	onDidChange: new Emitter<void>().event,
});

/**
 * An `Effect` that builds the live implementation of the `APIFactory` service.
 * It gathers all dependent services and uses them to construct the API factory function.
 */
const Definition = Effect.gen(function* (Generator) {
	// Gather all services required to build the full API surface.
	const LogService = yield* Generator(Logger);
	const ProposedAPIService = yield* Generator(ProposedAPI);
	const APIDeprecationService = yield* Generator(APIDeprecation);
	const CommandService = yield* Generator(Command);
	const WorkspaceService = yield* Generator(Workspace);
	const DocumentService = yield* Generator(Document);
	const WindowService = yield* Generator(Window);
	const LanguageFeatureService = yield* Generator(LanguageFeature);
	const DebugService = yield* Generator(Debug);
	const TaskService = yield* Generator(Task);
	const ExtensionService = yield* Generator(Extension);
	const WebViewPanelService = yield* Generator(WebViewPanel);
	const TreeViewService = yield* Generator(TreeView);
	const StatusBarService = yield* Generator(StatusBar);

	const CreateAPI = (
		ExtensionDescription: IExtensionDescription,
	): typeof VSCode => {
		const CreateSafeEvent = <T>(SourceEvent: VSCode.Event<T>) =>
			AsExtensionEvent(
				ExtensionDescription.identifier,
				LogService,
				SourceEvent,
			);

		// Construct each namespace of the `vscode` API by passing the relevant services
		// to their respective factory functions.
		const CommandNamespace = CreateCommandNamespace(
			CommandService,
			ExtensionDescription,
		);
		const WorkspaceNamespace = CreateWorkspaceNamespace(
			WorkspaceService,
			DocumentService,
			APIDeprecationService,
			CreateSafeEvent,
			ExtensionDescription,
		);
		const WindowNamespace = CreateWindowNamespace(
			WindowService,
			StatusBarService,
			WebViewPanelService,
			TreeViewService,
			CreateSafeEvent,
			ExtensionDescription,
			WorkspaceService, // Pass Workspace for editor properties
		);
		const LanguagesNamespace = CreateLanguagesNamespace(
			LanguageFeatureService,
			ExtensionDescription,
		);
		const TasksNamespace = CreateTasksNamespace(
			TaskService,
			CreateSafeEvent,
			ExtensionDescription,
		);
		const DebugNamespace = CreateDebugNamespace(
			DebugService,
			CreateSafeEvent,
			ExtensionDescription,
		);
		const ExtensionsNamespace = CreateExtensionsAPI(ExtensionService);

		const API: Partial<typeof VSCode> = {
			version: "1.85.0", // A representative version
			commands: CommandNamespace,
			window: WindowNamespace,
			workspace: WorkspaceNamespace,
			languages: LanguagesNamespace,
			debug: DebugNamespace,
			tasks: TasksNamespace,
			extensions: ExtensionsNamespace,
			// Core types that are simple classes can be exposed directly.
			Position,
			Range,
			Selection,
		};

		// Conditionally add proposed APIs if the extension is opted-in.
		if (
			ProposedAPIService.IsEnabled(
				ExtensionDescription.identifier,
				"someProposedApi",
			)
		) {
			// Object.assign(API, { someProposedApi: ... });
		}

		// Deep freeze the final API object to prevent modification by extensions.
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

	return { CreateAPI };
});

export default Definition;
