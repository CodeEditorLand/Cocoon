/**
 * @module QuickInput
 * @description Defines the service for interacting with VS Code's Quick Pick
 * and Input Box UI elements.
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
import { IPCService } from "./IPC.js";
import {
	SerializeButtons,
	SerializeItems,
} from "./TypeConverter/QuickInput.js";

/**
 * @interface QuickInput
 * @description The contract for the QuickInput service.
 */
export interface QuickInput {
	readonly ShowQuickPick: <T extends QuickPickItem>(
		items: readonly T[] | Promise<readonly T[]>,
		options?: QuickPickOptions,
		token?: CancellationToken,
	) => Effect.Effect<T | T[] | undefined, Error>;
	readonly ShowInputBox: (
		options?: InputBoxOptions,
		token?: CancellationToken,
	) => Effect.Effect<string | undefined, Error>;
	readonly CreateQuickPick: <T extends QuickPickItem>() => QuickPick<T>;
	readonly CreateInputBox: () => InputBox;
}

/**
 * @class QuickInput
 * @description The `Effect.Service` for the QuickInput service.
 */
export class QuickInputService extends Effect.Service<QuickInputService>()(
	"Service/QuickInput",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;

			const ShowQuickPick = <T extends QuickPickItem>(
				Items: readonly T[] | Promise<readonly T[]>,
				Option: QuickPickOptions = {},
				Token?: CancellationToken,
			): Effect.Effect<T | T[] | undefined, Error> =>
				Effect.gen(function* () {
					if (Token?.isCancellationRequested) {
						return yield* Effect.interrupt;
					}
					const ResolvedItems = yield* Effect.tryPromise({
						try: () => Promise.resolve(Items),
						catch: (e) => e as Error,
					});
					const IPCOptions = {
						...Option,
						items: SerializeItems(ResolvedItems),
						buttons: SerializeButtons((Option as any).buttons),
					};
					const ResultHandles = yield* IPC.SendRequest<
						number[] | number | undefined
					>("$showQuickPick", [IPCOptions]).pipe(
						Effect.catchIf(isCancellationError, () =>
							Effect.succeed(undefined),
						),
						Effect.mapError((cause) => new Error(String(cause))),
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

			const ShowInputBox = (
				Option?: InputBoxOptions,
				Token?: CancellationToken,
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* () {
					if (Token?.isCancellationRequested) {
						return yield* Effect.interrupt;
					}
					const IPCOptions = {
						...Option,
						buttons: SerializeButtons((Option as any)?.buttons),
					};
					return yield* IPC.SendRequest<string | undefined>(
						"$showInputBox",
						[IPCOptions],
					).pipe(
						Effect.catchIf(isCancellationError, () =>
							Effect.succeed(undefined),
						),
						Effect.mapError((cause) => new Error(String(cause))),
					);
				});

			return {
				ShowQuickPick,
				ShowInputBox,
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
