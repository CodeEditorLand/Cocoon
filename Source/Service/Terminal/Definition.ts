/*
 * File: Cocoon/Source/Service/Terminal/Definition.ts
 * Role: The live implementation of the Terminal service.
 * Responsibilities:
 *   1. Provides the `vscode.window.createTerminal` factory method.
 *   2. Manages the lifecycle and state of active terminal instances via proxy objects.
 *   3. Handles IPC communication with the Mountain host for all terminal operations.
 *   4. Listens for events from the host (e.g., data, exit) and dispatches them
 *      to the appropriate terminal proxy.
 */

import { Effect, Ref } from "effect";
import { Emitter, type Event } from "vs/base/common/event.js";
import type { Terminal, TerminalOptions, TerminalState } from "vscode";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

/**
 * A proxy class implementing the `vscode.Terminal` interface.
 * It forwards all actions to the Mountain host via IPC.
 */
class TerminalProxyImplementation implements Terminal {
	private readonly _OnDidWrite = new Emitter<string>();
	public readonly onDidWrite: Event<string> = this._OnDidWrite.event;

	private readonly _OnDidClose = new Emitter<void>();
	public readonly onDidClose: Event<void> = this._OnDidClose.event;

	private readonly _OnDidOpen = new Emitter<Terminal>();
	public readonly onDidOpen: Event<Terminal> = this._OnDidOpen.event;

	private readonly _OnDidChangeState = new Emitter<TerminalState>();
	public readonly onDidChangeState: Event<TerminalState> =
		this._OnDidChangeState.event;

	public readonly name: string;
	public readonly processId: Promise<number | undefined>;
	public readonly creationOptions: Readonly<TerminalOptions>;
	public readonly exitStatus = undefined; // Not fully implemented yet.
	public readonly state: TerminalState = { isInteractedWith: false }; // Not fully implemented yet.

	private IsDisposed = false;

	constructor(
		public readonly ID: number, // The ID assigned by Mountain
		private readonly IPC: IPCService["Type"],
		Options: TerminalOptions,
	) {
		this.name = Options.name ?? `terminal-${ID}`;
		this.creationOptions = Object.freeze(Options);
		this.processId = Effect.runPromise(
			this.IPC.SendRequest<number | undefined>("$terminal:pid", [
				this.ID,
			]),
		);
	}

	public sendText(text: string, addNewLine = true): void {
		if (this.IsDisposed) {
			return;
		}
		const Line = text + (addNewLine ? "\r" : "");
		Effect.runFork(
			this.IPC.SendNotification("$terminal:sendText", [this.ID, Line]),
		);
	}

	public show(preserveFocus?: boolean): void {
		if (this.IsDisposed) {
			return;
		}
		Effect.runFork(
			this.IPC.SendNotification("$terminal:show", [
				this.ID,
				preserveFocus,
			]),
		);
	}

	public hide(): void {
		if (this.IsDisposed) {
			return;
		}
		Effect.runFork(this.IPC.SendNotification("$terminal:hide", [this.ID]));
	}

	public dispose(): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
		this._OnDidClose.fire();
		this._OnDidClose.dispose();
		this._OnDidWrite.dispose();
		this._OnDidOpen.dispose();
		this._OnDidChangeState.dispose();
		Effect.runFork(
			this.IPC.SendNotification("$terminal:dispose", [this.ID]),
		);
	}

	// --- Internal methods to be called by the TerminalService ---
	public _FireWrite(data: string): void {
		this._OnDidWrite.fire(data);
	}
	public _FireClose(): void {
		this.dispose();
	}
}

/**
 * An Effect that builds the live implementation of the Terminal service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const ActiveTerminalsRef = yield* G(
		Ref.make(new Map<number, TerminalProxyImplementation>()),
	);
	const ActiveTerminalRef = yield* G(
		Ref.make<TerminalProxyImplementation | undefined>(undefined),
	);

	// --- Event Emitters ---
	const OnDidChangeActiveTerminalEmitter = new Emitter<
		Terminal | undefined
	>();
	const OnDidOpenTerminalEmitter = new Emitter<Terminal>();
	const OnDidCloseTerminalEmitter = new Emitter<Terminal>();

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler("$acceptTerminalProcessData", ([ID, Data]) => {
		const Term = Effect.runSync(Ref.get(ActiveTerminalsRef)).get(ID);
		Term?._FireWrite(Data);
		return Promise.resolve();
	});
	IPC.RegisterInvokeHandler("$acceptTerminalProcessExit", ([ID]) => {
		const Term = Effect.runSync(Ref.get(ActiveTerminalsRef)).get(ID);
		if (Term) {
			Term._FireClose();
			Effect.runSync(
				Ref.update(ActiveTerminalsRef, (Map) => {
					Map.delete(ID);
					return Map;
				}),
			);
			OnDidCloseTerminalEmitter.fire(Term);
		}
		return Promise.resolve();
	});

	// --- Service Implementation ---
	const TerminalImplementation: Service["Type"] = {
		get activeTerminal() {
			return Effect.runSync(Ref.get(ActiveTerminalRef));
		},
		get terminals() {
			return Array.from(
				Effect.runSync(Ref.get(ActiveTerminalsRef)).values(),
			);
		},
		onDidChangeActiveTerminal: OnDidChangeActiveTerminalEmitter.event,
		onDidOpenTerminal: OnDidOpenTerminalEmitter.event,
		onDidCloseTerminal: OnDidCloseTerminalEmitter.event,

		createTerminal(OptionsOrName?: TerminalOptions | string): Terminal {
			const Options =
				typeof OptionsOrName === "string"
					? { name: OptionsOrName }
					: (OptionsOrName ?? {});

			// This is a synchronous API, so we must block on the result.
			// This is a known architectural trade-off when adapting to the VS Code API.
			const Result = Effect.runSync(
				IPC.SendRequest<{ id: number; pid: number; name: string }>(
					"$terminal:create",
					[Options],
				),
			);

			const Proxy = new TerminalProxyImplementation(
				Result.id,
				IPC,
				Options,
			);

			Effect.runSync(
				Ref.update(ActiveTerminalsRef, (Map) =>
					Map.set(Result.id, Proxy),
				),
			);
			OnDidOpenTerminalEmitter.fire(Proxy);

			return Proxy;
		},
	};

	return TerminalImplementation;
});
