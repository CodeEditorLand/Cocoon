/**
 * @module Definition (StatusBar)
 * @description The live implementation of the StatusBar service.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, StatusBarAlignment } from "vscode";

import { IpcProvider } from "../Ipc/mod.js";
import type { Interface } from "./Service.js";
import { StatusBarItemImpl } from "./StatusBarItemImpl.js";

let EntryIdCounter = 0;

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const ActiveEntries = yield* _(
		Ref.make(new Map<string, StatusBarItemImpl>()),
	);

	// Register RPC handler for when Mountain needs a tooltip
	Ipc.RegisterInvokeHandler("$provideStatusbarTooltip", ([entryId]) =>
		Effect.gen(function* (_) {
			// Logic to find the entry in ActiveEntries and call a potential tooltip provider function.
			return null;
		}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		CreateStatusBarItem: (Extension, Id, Alignment, Priority) =>
			Effect.sync(() => {
				const EntryId = `ext-statusbar-${EntryIdCounter++}`;
				const ItemId = Id ?? `${Extension.identifier.value}.${EntryId}`;
				const FinalAlignment = Alignment ?? StatusBarAlignment.Left;

				const OnDispose = () => {
					Ref.update(
						ActiveEntries,
						(map) => (map.delete(EntryId), map),
					).pipe(Effect.runSync);
				};

				const Entry = new StatusBarItemImpl(
					EntryId,
					Ipc,
					OnDispose,
					ItemId,
					FinalAlignment,
					Priority,
				);
				Ref.update(ActiveEntries, (map) =>
					map.set(EntryId, Entry),
				).pipe(Effect.runSync);

				return Entry;
			}),

		SetStatusBarMessage: (text, hideOrPromise) => {
			const ShowEffect = Ipc.SendNotification("$setStatusBarMessage", [
				text,
			]);
			const HideEffect = Ipc.SendNotification(
				"$disposeStatusBarMessage",
				[],
			);

			// A real implementation would handle the timeout/Promise logic.
			Effect.runFork(ShowEffect);
			return new Disposable(() => Effect.runFork(HideEffect));
		},
	};

	return ServiceImplementation;
});
