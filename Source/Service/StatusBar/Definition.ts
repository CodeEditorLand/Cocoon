/**
 * @module Definition (StatusBar)
 * @description The live implementation of the StatusBar service.
 */

import { Effect, Ref } from "effect";
import { Disposable, StatusBarAlignment } from "vscode";

import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import StatusBarItemImplementation from "./StatusBarItemImplementation.js";

let EntryIDCounter = 0;

/**
 * An Effect that builds the live implementation of the StatusBar service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const ActiveEntries = yield* Ref.make(
		new Map<string, StatusBarItemImplementation>(),
	);

	// Register RPC handler for when Mountain needs a tooltip.
	// This would be used if the tooltip were a complex object needing resolution.
	IPC.RegisterInvokeHandler("$provideStatusbarTooltip", ([_EntryID]) =>
		Effect.gen(function* () {
			// Logic to find the entry in ActiveEntries and call a potential tooltip provider function.
			return null;
		}).pipe(Effect.runPromise),
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
							ActiveEntries,
							(Map) => (Map.delete(EntryID), Map),
						),
					);
				};

				const Entry = new StatusBarItemImplementation(
					EntryID,
					IPC,
					OnDispose,
					ItemID,
					FinalAlignment,
					Priority,
				);
				Effect.runSync(
					Ref.update(ActiveEntries, (Map) => Map.set(EntryID, Entry)),
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
