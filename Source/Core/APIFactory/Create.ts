/*
 * File: Cocoon/Source/Core/APIFactory/Create.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/APIDeprecation/Service.js, ../../Service/Command/Service.js, ../../Service/Debug/Service.js, ../../Service/Extension/Service.js, ../../Service/IPC/Service.js, ../../Service/LanguageFeature/Service.js, ../../Service/Log/Service.js, ../../Service/ProposedAPI/Service.js, ../../Service/StatusBar/Service.js, ../../Service/Task/Service.js, ../../Service/TreeView/Service.js, ../../Service/WebViewPanel/Service.js, ../../Service/Window/Service.js, ../../Service/WorkSpace/Service.js, ./AsExtensionEvent.js, ./CreateCommandNamespace.js, ./CreateDebugNamespace.js, ./CreateLanguagesNamespace.js, ./CreateTasksNamespace.js, ./CreateWindowNamespace.js, ./CreateWorkSpaceNamespace.js, effect, vs/base/common/event.js, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module Create (APIFactory)
 * @description The primary factory function that constructs the `vscode` API
 * object for a given extension. This serves as the `Definition` for the service.
 */

import { Effect, Layer } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
// Do not import everything from ExtHostTypes, as it clashes with the real vscode types.
// Import only what is needed, or ensure perfect compatibility.
import { Position, Range, Selection } from "vscode";

import APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import CommandService from "../../Service/Command/Service.js";
import DebugService from "../../Service/Debug/Service.js";
import ExtensionService from "../../Service/Extension/Service.js";
import IPCService from "../../Service/IPC/Service.js";
import LanguageFeatureService from "../../Service/LanguageFeature/Service.js";
import LogService from "../../Service/Log/Service.js";
import ProposedAPIService from "../../Service/ProposedAPI/Service.js";
import StatusBarService from "../../Service/StatusBar/Service.js";
import TaskService from "../../Service/Task/Service.js";
import TreeViewService from "../../Service/TreeView/Service.js";
import WebViewPanelService from "../../Service/WebViewPanel/Service.js";
import WindowService from "../../Service/Window/Service.js";
import WorkSpaceService from "../../Service/WorkSpace/Service.js";
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
	IPC: IPCService["Type"];
}

// A stub that conforms to `vscode.extensions`
const createExtensionsApi = (
	_extensionService: ExtensionService["Type"],
): typeof VSCode.extensions => ({
	getExtension: (_extensionId: string) => {
		// This needs an implementation that can synchronously or asynchronously get an extension.
		// For now, it returns undefined.
		return undefined;
	},
	get all() {
		// This needs to synchronously return extensions, which is tricky with an effect-based service.
		// This likely requires caching the extension list.
		return [];
	},
	get allAcrossExtensionHosts() {
		// Similar to `all`, this requires a synchronous way to get extensions.
		return [];
	},
	onDidChange: new Emitter<void>().event, // A simple event emitter stub
});

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
				IPC,
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

			const DebugEffect = CreateDebugNamespace(AsEvent, Extension);
			const DebugNamespace = Effect.runSync(
				Effect.provide(
					DebugEffect,
					Layer.mergeAll(
						Layer.succeed(DebugService, Debug),
						Layer.succeed(IPCService, IPC),
					),
				),
			);

			const TasksNamespace = CreateTasksNamespace(
				Task,
				AsEvent,
				Extension,
			);

			const extensionsNs = createExtensionsApi(ExtensionService);

			const API: Partial<typeof VSCode> = {
				version: "1.85.0",
				commands: CommandNamespace,
				window: WindowNamespace,
				workspace: WorkSpaceNamespace,
				languages: LanguagesNamespace,
				debug: DebugNamespace,
				tasks: TasksNamespace,
				extensions: extensionsNs,
				// Do not spread ExtHostTypes here if they conflict with the official vscode types
				Position,
				Range,
				Selection,
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
