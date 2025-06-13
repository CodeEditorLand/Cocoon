/**
 * @module Definition (Window)
 * @description The live implementation of the core Window service.
 */

import { Effect, Ref } from "effect";
import type { WindowState } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);

	// State and events are managed by Refs and Hubs, updated by host messages.
	const WindowStateRef = yield* _(
		Ref.make<WindowState>({ focused: true, active: true, visible: true }),
	);
	const OnDidChangeWindowState = CreateEventStream<WindowState>();

	// Register RPC handlers
	IPC.RegisterInvokeHandler("$acceptWindowStateChanged", ([state]) => {
		return Ref.set(WindowStateRef, state).pipe(
			Effect.flatMap(() => OnDidChangeWindowState.Fire(state)),
			Effect.runPromise,
		);
	});

	const ServiceImplementation: Interface = {
		get state() {
			return Ref.get(WindowStateRef).pipe(Effect.runSync);
		},
		onDidChangeWindowState: OnDidChangeWindowState.Stream,

		// Properties like activeTextEditor would be managed by a separate TextEditor service.
		// This is a simplified stub.
		get activeTextEditor() {
			return undefined;
		},
		get visibleTextEditors() {
			return [];
		},
		onDidChangeActiveTextEditor: CreateEventStream<any>().Stream,
		onDidChangeVisibleTextEditors: CreateEventStream<any>().Stream,

		ShowTextDocument: (doc, opts, preserve) => {
			// This would make an RPC call to Mountain to reveal an editor.
			return Effect.fail(
				new Error("'showTextDocument' not fully implemented."),
			);
		},
	};

	return ServiceImplementation;
});
