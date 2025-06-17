/*
 * File: Cocoon/Source/Service/StatusBar/Definition.ts
 * Responsibility: The live implementation of the StatusBar service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Definition (StatusBar)
 * @description The live implementation of the StatusBar service.
 */

import { Effect, Ref } from "effect";
import { Disposable, StatusBarAlignment } from "vscode";

import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import StatusBarItemImplementation from "./StatusBarItemImplementation.js";

let EntryIDCounter = 0;

/**
 * An Effect that builds the live implementation of the StatusBar service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Command = yield* G(CommandService);
	const ActiveEntriesRef = yield* G(
		Ref.make(new Map<string, StatusBarItemImplementation>()),
	);

	const StatusBarImplementation: Service["Type"] = {
		CreateStatusBarItem: (Extension, ID, Alignment, Priority) =>
			Effect.sync(() => {
				const EntryID = `ext-statusbar-${EntryIDCounter++}`;
				const ItemID = ID ?? `${Extension.identifier.value}.${EntryID}`;
				const FinalAlignment = Alignment ?? StatusBarAlignment.Left;

				const OnDispose = () => {
					Effect.runSync(
						Ref.update(
							ActiveEntriesRef,
							(Map) => (Map.delete(EntryID), Map),
						),
					);
				};

				const Entry = new StatusBarItemImplementation(
					EntryID,
					IPC,
					Command, // Pass the CommandService instance
					OnDispose,
					ItemID,
					FinalAlignment,
					Priority,
				);
				Effect.runSync(
					Ref.update(ActiveEntriesRef, (Map) =>
						Map.set(EntryID, Entry),
					),
				);

				return Entry;
			}),

		SetStatusBarMessage: (Text, HideOrPromise) => {
			const HideId = `status.message.${EntryIDCounter++}`;
			const ShowEffect = IPC.SendNotification("$setStatusBarMessage", [
				HideId,
				Text,
			]);
			const HideEffect = IPC.SendNotification(
				"$disposeStatusBarMessage",
				[HideId],
			);

			Effect.runFork(ShowEffect);

			if (typeof HideOrPromise === "number") {
				setTimeout(() => Effect.runFork(HideEffect), HideOrPromise);
			} else if (HideOrPromise) {
				HideOrPromise.then(() => Effect.runFork(HideEffect));
			}

			return new Disposable(() => Effect.runFork(HideEffect));
		},
	};

	return StatusBarImplementation;
});
