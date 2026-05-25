/**
 * @module Handler/VscodeAPI/DebugNamespace
 * @description
 * Factory for the vscode.debug namespace shim. Bridges registrations and
 * session lifecycle to Mountain via `register_debug_adapter`,
 * `start_debugging`, `stop_debugging` gRPC RPCs. Session events fire via
 * `Context.Emitter` on the `"debug.*"` channels emitted by Mountain.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapDebugNamespace from "../Wrap/Debug/Namespace.js";

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

// Per-session inline DAP adapter tracker. Populated lazily when Mountain
// fires `debug.didStartSession`; a matching factory entry in the
// ExtensionRegistry is asked for an adapter, the adapter's `onDidSendMessage`
// is wired back to Mountain via `debug.dap-response`, and `handleMessage` is
// called from the ExtHostDebug$sendDAPRequest dispatcher (see gRPC server).
const InitialiseDAPSessionTracker = (Context: HandlerContext): void => {
	const Anchor = Context as unknown as {
		__dapAdapters?: Map<string, any>;
		__dapTrackerInstalled?: boolean;
	};
	if (Anchor.__dapTrackerInstalled) {
		return;
	}
	Anchor.__dapTrackerInstalled = true;
	Anchor.__dapAdapters ??= new Map();

	const ResolveFactory = (DebugType: string): unknown => {
		const FactoryKey = `__debugAdapterFactory:${DebugType}`;
		return (Context.ExtensionRegistry as any)?.get(FactoryKey);
	};

	Context.Emitter.on("debug.didStartSession", (Session: any) => {
		const SessionId = Session?.id ?? Session?.sessionId;
		const DebugType = Session?.type ?? Session?.configuration?.type;
		if (!SessionId || !DebugType) return;
		const Factory = ResolveFactory(String(DebugType));
		if (!Factory) return;
		try {
			const Descriptor = (Factory as any).createDebugAdapterDescriptor?.(
				Session,
				undefined,
			);
			const Resolve = (Value: any) => {
				const Impl = Value?.implementation ?? Value;
				if (!Impl || typeof Impl.handleMessage !== "function") return;
				try {
					Impl.onDidSendMessage?.((Message: unknown) => {
						Context.SendToMountain("debug.dap-response", {
							sessionId: SessionId,
							message: Message,
						}).catch(() => {});
					});
				} catch {
					/* adapter has no event subscription support */
				}
				Anchor.__dapAdapters!.set(String(SessionId), Impl);
			};
			if (Descriptor && typeof (Descriptor as any).then === "function") {
				(Descriptor as Promise<unknown>).then(Resolve, () => {});
			} else {
				Resolve(Descriptor);
			}
		} catch {
			/* factory rejected - leave session adapter-less, Mountain
			 * surfaces the error via the SendCommand return value */
		}
	});

	Context.Emitter.on("debug.didTerminateSession", (Session: any) => {
		const SessionId = Session?.id ?? Session?.sessionId;
		if (!SessionId) return;
		const Adapter = Anchor.__dapAdapters!.get(String(SessionId));
		try {
			Adapter?.dispose?.();
		} catch {
			/* ignore */
		}
		Anchor.__dapAdapters!.delete(String(SessionId));
	});
};

const CreateDebugNamespace = (Context: HandlerContext) => {
	InitialiseDAPSessionTracker(Context);
	return WrapDebugNamespace({
		registerDebugAdapterDescriptorFactory: (
			DebugType: string,

			Factory: unknown,
		) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_debug_adapter", {
				handle: Handle,
				debugType: DebugType,
				extensionId: "",
			}).catch(() => {});
			// Stash factory by type so the ExtHostDebug$sendDAPRequest gRPC
			// dispatch can look it up. `DebugAdapterInlineImplementation`
			// adapters live entirely inside Cocoon's process - Mountain never
			// gets a stdin pipe to write to, so DAP frames for those sessions
			// reverse-RPC into Cocoon and are dispatched here.
			const FactoryKey = `__debugAdapterFactory:${DebugType}`;
			Context.ExtensionRegistry.set(FactoryKey, Factory);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(FactoryKey);
					Context.SendToMountain("unregister_debug_adapter", {
						handle: Handle,
					}).catch(() => {});
				},
			};
		},

		registerDebugConfigurationProvider: (
			DebugType: string,

			Provider: unknown,

			_TriggerKind?: unknown,
		) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_debug_configuration_provider", {
				handle: Handle,
				debugType: DebugType,
			}).catch(() => {});
			// Stash locally so ExtHostDebug$resolveDebugConfiguration can call back.
			const ProviderKey = `__debugConfigProvider:${Handle}`;
			Context.ExtensionRegistry.set(ProviderKey, Provider);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(ProviderKey);
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
			const All: unknown[] = ((Context as any).__breakpoints ??= []);
			All.push(...Breakpoints);
			Context.SendToMountain("debug.addBreakpoints", {
				breakpoints: Breakpoints,
			}).catch(() => {});
		},

		removeBreakpoints: (Breakpoints: unknown[]) => {
			const All: unknown[] = ((Context as any).__breakpoints ??= []);
			const Ids = new Set((Breakpoints as any[]).map((B) => B?.id));
			(Context as any).__breakpoints = All.filter(
				(B: unknown) => !Ids.has((B as any)?.id),
			);
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

		get activeDebugSession() {
			return (Context as any).__activeDebugSession ?? undefined;
		},

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

		get breakpoints() {
			return (Context as any).__breakpoints ?? [];
		},

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
};

export default CreateDebugNamespace;
