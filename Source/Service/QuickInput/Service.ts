/*
 * File: Cocoon/Source/Service/QuickInput/Service.ts
 * Role: Defines the QuickInput service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for showing quick pick lists and input boxes.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	InputBox,
	InputBoxOptions,
	QuickPick,
	QuickPickItem,
	QuickPickOptions,
} from "vscode";
import QuickInputConverter from "../../TypeConverter/QuickInput.js";
import { IPC as IPCService } from "../IPC/Service.js";

export class QuickInput extends Effect.Service<QuickInput>()(
	"Service/QuickInput",
	{
		effect: Effect.gen(function* (Generator) {
			const IPC = yield* Generator(IPCService);

			const ShowQuickPickEffect = <T extends QuickPickItem>(
				Items: readonly T[] | Promise<readonly T[]>,
				Option: QuickPickOptions = {},
				Token?: CancellationToken,
			): Effect.Effect<T | T[] | undefined, Error> =>
				Effect.gen(function* (Generator) {
					if (Token?.isCancellationRequested) {
						return yield* Generator(Effect.interrupt);
					}
					const ResolvedItems = yield* Generator(
						Effect.tryPromise({
							try: () => Promise.resolve(Items),
							catch: (e) => e as Error,
						}),
					);
					const IPCOptions = {
						...Option,
						items: QuickInputConverter.SerializeItems(
							ResolvedItems,
						),
						buttons: QuickInputConverter.SerializeButtons(
							(Option as any).buttons,
						),
					};
					const ResultHandles = yield* Generator(
						IPC.SendRequest<number[] | number | undefined>(
							"$showQuickPick",
							[IPCOptions],
						).pipe(
							Effect.catchIf(isCancellationError, () =>
								Effect.succeed(undefined),
							),
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						),
					);
					if (Option?.canPickMany) {
						if (!Array.isArray(ResultHandles)) return undefined;
						const SelectedIndices = new Set(
							ResultHandles as number[],
						);
						return ResolvedItems.filter((_, index) =>
							SelectedIndices.has(index),
						) as T[];
					}
					if (
						typeof ResultHandles === "number" &&
						ResultHandles >= 0
					) {
						return ResolvedItems[ResultHandles] as T;
					}
					return undefined;
				});

			const ShowInputBoxEffect = (
				Option?: InputBoxOptions,
				Token?: CancellationToken,
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* (Generator) {
					if (Token?.isCancellationRequested) {
						return yield* Generator(Effect.interrupt);
					}
					const IPCOptions = {
						...Option,
						buttons: QuickInputConverter.SerializeButtons(
							(Option as any)?.buttons,
						),
					};
					return yield* Generator(
						IPC.SendRequest<string | undefined>("$showInputBox", [
							IPCOptions,
						]).pipe(
							Effect.catchIf(isCancellationError, () =>
								Effect.succeed(undefined),
							),
							Effect.mapError(
								(cause) => new Error(String(cause)),
							),
						),
					);
				});

			return {
				ShowQuickPick: ShowQuickPickEffect,
				ShowInputBox: ShowInputBoxEffect,
				CreateQuickPick: () => {
					throw new Error(
						"Controller-based QuickPick is not implemented in Cocoon.",
					);
				},
				CreateInputBox: () => {
					throw new Error(
						"Controller-based InputBox is not implemented in Cocoon.",
					);
				},
			};
		}),
	},
) {}
