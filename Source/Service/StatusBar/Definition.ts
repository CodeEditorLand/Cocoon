/*
 * File: Cocoon/Source/Service/StatusBar/Definition.ts
 *
 * This file contains the live implementation of the StatusBar service. Its responsibilities
 * include providing factory methods for creating status bar items, managing temporary
 * messages, proxying state changes to the host, and tracking active items.
 */

import { Effect, Ref } from "effect";
import { generateUuid as GenerateUUID } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, StatusBarAlignment, type StatusBarItem } from "vscode";

import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import StatusBarItemImplementation from "./StatusBarItemImplementation.js";

/**
 * An Effect that builds the live implementation of the StatusBar service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Command = yield* G(CommandService);
	const ActiveItemsRef = yield* G(
		Ref.make(new Map<string, StatusBarItemImplementation>()),
	);

	const StatusBarImplementation: Service = {
		CreateStatusBarItem: (
			Extension: IExtensionDescription,
			ID?: string,
			Alignment?: StatusBarAlignment,
			Priority?: number,
		) =>
			Effect.sync(() => {
				// Internal, unique ID for this instance.
				const EntryID = GenerateUUID();
				const ItemID = ID ?? `${Extension.identifier.value}.${EntryID}`;
				const FinalAlignment = Alignment ?? StatusBarAlignment.Left;

				// Callback for when the item is disposed, to remove it from the active map.
				const OnDispose = () => {
					Effect.runSync(
						Ref.update(
							ActiveItemsRef,
							(Map) => (Map.delete(EntryID), Map),
						),
					);
				};

				const Entry = new StatusBarItemImplementation(
					EntryID,
					Extension.identifier.value,
					IPC,
					Command,
					OnDispose,
					ItemID,
					FinalAlignment,
					Priority,
				);

				Effect.runSync(
					Ref.update(ActiveItemsRef, (Map) =>
						Map.set(EntryID, Entry),
					),
				);
				return Entry;
			}),

		SetStatusBarMessage: (Text, HideOrPromise) => {
			const HideId = `status.message.${GenerateUUID()}`;
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
				// Hide after a timeout
				setTimeout(() => Effect.runFork(HideEffect), HideOrPromise);
			} else if (HideOrPromise) {
				// Hide when the promise resolves
				HideOrPromise.then(() => Effect.runFork(HideEffect));
			}

			// Return a disposable to allow manual hiding.
			return new Disposable(() => Effect.runFork(HideEffect));
		},
	};

	return StatusBarImplementation;
});
