/**
 * @module Handler/VscodeAPI/Window/EventSubscriber
 *
 * Factory for VS Code event-subscription functions. Each event in the
 * vscode.window namespace (onDidChangeActiveTextEditor, onDidOpenTerminal,
 * etc.) is backed by `MakeEventSubscriber` which wraps Context.Emitter with
 * the standard `(listener, thisArg?, disposables?)` contract.
 */

import type { HandlerContext } from "../../Handler/Context.js";

type Listener<T> = (Event: T) => unknown;

/**
 * Create a VS Code-compatible event function for `EventName` on
 * `Context.Emitter`. Binds the listener to `ThisArg` when provided so
 * extensions using class methods as listeners don't lose `this`.
 * Returns a `Disposable` and optionally pushes it into `Disposables`.
 */
export const MakeEventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(
		Callback: Listener<unknown>,

		ThisArg?: unknown,

		Disposables?: { push: (D: { dispose: () => void }) => unknown },
	) => {
		const Bound =
			ThisArg === undefined
				? Callback
				: (Callback as (...Args: unknown[]) => unknown).bind(ThisArg;

		Context.Emitter.on(EventName, Bound as Listener<unknown>;

		const Subscription = {
			dispose: () => {
				Context.Emitter.off(EventName, Bound as Listener<unknown>;
			},
		};

		if (Disposables && typeof Disposables.push === "function") {
			Disposables.push(Subscription;
		}

		return Subscription;
	};
