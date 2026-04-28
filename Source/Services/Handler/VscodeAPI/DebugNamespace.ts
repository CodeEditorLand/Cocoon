/**
 * @module Handler/VscodeAPI/DebugNamespace
 * @description
 * Factory for the vscode.debug namespace shim. Bridges registrations and
 * session lifecycle to Mountain via `register_debug_adapter`,
 * `start_debugging`, `stop_debugging` gRPC RPCs. Session events fire via
 * `Context.Emitter` on the `"debug.*"` channels emitted by Mountain.
 */

import { NextProviderHandle } from "../../LanguageProviderRegistry.js";
import type { HandlerContext } from "../HandlerContext.js";
import WrapDebugNamespace from "./WrapDebugNamespace.js";

const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on(EventName, Listener);
		return {
			dispose: () => {
				Context.Emitter.off(EventName, Listener);
			},
		};
	};

const CreateDebugNamespace = (Context: HandlerContext) =>
	WrapDebugNamespace({
		registerDebugAdapterDescriptorFactory: (
			DebugType: string,
			_Factory: unknown,
		) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_debug_adapter", {
				handle: Handle,
				debugType: DebugType,
				extensionId: "",
			}).catch(() => {});
			return {
				dispose: () => {
					Context.SendToMountain("unregister_debug_adapter", {
						handle: Handle,
					}).catch(() => {});
				},
			};
		},

		registerDebugConfigurationProvider: (
			DebugType: string,
			_Provider: unknown,
		) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_debug_configuration_provider", {
				handle: Handle,
				debugType: DebugType,
			}).catch(() => {});
			return {
				dispose: () => {
					Context.SendToMountain(
						"unregister_debug_configuration_provider",
						{
							handle: Handle,
						},
					).catch(() => {});
				},
			};
		},

		registerDebugAdapterTrackerFactory: () => ({ dispose: () => {} }),

		// Proposed API (`vscode.proposed.debugVisualization.d.ts`). Custom
		// debug-variable renderers (e.g. Microsoft's JS debugger providing
		// rich object views) opt in via `enabledApiProposals`. Stub until a
		// renderer consumer lands - real wiring routes through Mountain's
		// DebugService.
		registerDebugVisualizationProvider: (
			_Id: string,
			_Provider: unknown,
		) => ({ dispose: () => {} }),
		registerDebugVisualizationTreeProvider: (
			_Id: string,
			_Provider: unknown,
		) => ({ dispose: () => {} }),

		startDebugging: async (
			Folder: unknown,
			NameOrConfig: unknown,
			ParentSession?: unknown,
		): Promise<boolean> => {
			try {
				// Routed by CreateEffectForRequest as Debug.Start.
				const Response = await Context.MountainClient?.sendRequest(
					"Debug.Start",
					[Folder, NameOrConfig, ParentSession],
				);
				return Boolean((Response as { success?: boolean })?.success);
			} catch {
				return false;
			}
		},

		stopDebugging: async (Session?: unknown): Promise<void> => {
			try {
				// Mountain's CreateEffectForRequest now routes `Debug.Stop`
				// directly to `DebugService::StopDebugging(SessionId)`.
				const SessionId =
					typeof Session === "string"
						? Session
						: ((Session as { id?: unknown })?.id ?? "");
				await Context.MountainClient?.sendRequest("Debug.Stop", [
					SessionId,
				]);
			} catch {}
		},

		addBreakpoints: (Breakpoints: unknown[]) => {
			Context.SendToMountain("debug.addBreakpoints", {
				breakpoints: Breakpoints,
			}).catch(() => {});
		},

		removeBreakpoints: (Breakpoints: unknown[]) => {
			Context.SendToMountain("debug.removeBreakpoints", {
				breakpoints: Breakpoints,
			}).catch(() => {});
		},

		asDebugSourceUri: (Source: unknown) => Source,

		onDidStartDebugSession: EventSubscriber(
			Context,
			"debug.didStartSession",
		),
		onDidTerminateDebugSession: EventSubscriber(
			Context,
			"debug.didTerminateSession",
		),
		onDidChangeActiveDebugSession: EventSubscriber(
			Context,
			"debug.didChangeActiveSession",
		),
		onDidReceiveDebugSessionCustomEvent: EventSubscriber(
			Context,
			"debug.didReceiveCustomEvent",
		),
		onDidChangeBreakpoints: EventSubscriber(
			Context,
			"debug.didChangeBreakpoints",
		),

		activeDebugSession: undefined as unknown,
		activeDebugConsole: {
			append: (Value: string) => {
				Context.SendToMountain("debug.consoleAppend", {
					value: Value,
				}).catch(() => {});
			},
			appendLine: (Value: string) => {
				Context.SendToMountain("debug.consoleAppend", {
					value: `${Value}\n`,
				}).catch(() => {});
			},
		},
		breakpoints: [] as unknown[],

		// Stable 1.88+ surface: current selected debug stack item. Land's
		// debug service doesn't track per-frame selection yet, so this reads
		// as undefined and the associated event never fires. Real subscribe
		// path is still a proper disposable so the extension teardown works.
		activeStackItem: undefined as unknown,
		onDidChangeActiveStackItem: EventSubscriber(
			Context,
			"debug.didChangeActiveStackItem",
		),
	});

export default CreateDebugNamespace;
