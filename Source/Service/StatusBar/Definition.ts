/**
 * @module Definition (StatusBar)
 * @description The live implementation of the StatusBar service.
 */

import { Context, Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, StatusBarAlignment } from "vscode";

import IPCService from "../IPC/Service.js";
import StatusBarItemImplementation from "./StatusBarItemImplementation.js";

let EntryIDCounter = 0;

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const ActiveEntries = yield* _(
		Ref.make(new Map<string, StatusBarItemImplementation>()),
	);

	// Register RPC handler for when Mountain needs a tooltip.
	// This would be used if the tooltip were a complex object needing resolution.
	IPC.RegisterInvokeHandler("$provideStatusbarTooltip", ([entryID]) =>
		Effect.gen(function* (_) {
			// Logic to find the entry in ActiveEntries and call a potential tooltip provider function.
			return null;
		}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		CreateStatusBarItem: (Extension, ID, Alignment, Priority) =>
			Effect.sync(() => {
				const EntryID = `ext-statusbar-${EntryIDCounter++}`;
				const ItemID = ID ?? `${Extension.identifier.value}.${EntryID}`;
				const FinalAlignment = Alignment ?? StatusBarAlignment.Left;

				const OnDispose = () => {
					Ref.update(
						ActiveEntries,
						(map) => (map.delete(EntryID), map),
					).pipe(Effect.runSync);
				};

				const Entry = new StatusBarItemImplementation(
					EntryID,
					IPC,
					OnDispose,
					ItemID,
					FinalAlignment,
					Priority,
				);
				Ref.update(ActiveEntries, (map) =>
					map.set(EntryID, Entry),
				).pipe(Effect.runSync);

				return Entry;
			}),

		SetStatusBarMessage: (text, hideOrPromise) => {
			const HideId = `status.message.${EntryIDCounter++}`;
			const ShowEffect = IPC.SendNotification("$setStatusBarMessage", [
				HideId,
				text,
			]);
			const HideEffect = IPC.SendNotification(
				"$disposeStatusBarMessage",
				[HideId],
			);

			Effect.runFork(ShowEffect);

			if (typeof hideOrPromise === "number") {
				setTimeout(() => Effect.runFork(HideEffect), hideOrPromise);
			} else if (hideOrPromise) {
				hideOrPromise.then(() => Effect.runFork(HideEffect));
			}

			return new Disposable(() => Effect.runFork(HideEffect));
		},
	};

	return ServiceImplementation;
});
