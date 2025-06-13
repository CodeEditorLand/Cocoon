/**
 * @module Definition (QuickInput)
 * @description The live implementation of the QuickInput service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	InputBoxOptions,
	QuickPickItem,
	QuickPickOptions,
} from "vscode";

import * as QuickInputConverter from "../../TypeConverter/QuickInput.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);

	const ShowQuickPick = <T extends QuickPickItem>(
		Items: readonly T[] | Promise<readonly T[]>,
		Option: QuickPickOptions = {},
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested) {
				return yield* _(Effect.interrupt);
			}

			const ResolvedItems = yield* _(
				Effect.tryPromise(() => Promise.resolve(Items)),
			);

			const IPCOptions = {
				...Option,
				items: QuickInputConverter.QuickPick.SerializeItems(
					ResolvedItems,
				),
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Option.buttons,
				),
			};

			const ResultHandles = yield* _(
				IPCService.SendRequest<number[] | number | undefined>(
					"$showQuickPick",
					[IPCOptions],
				),
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
			);

			if (Option?.canPickMany) {
				if (!Array.isArray(ResultHandles)) {
					return undefined;
				}
				const SelectedIndices = new Set(ResultHandles as number[]);
				return ResolvedItems.filter((_, index) =>
					SelectedIndices.has(index),
				) as T[];
			}

			if (typeof ResultHandles === "number" && ResultHandles >= 0) {
				return ResolvedItems[ResultHandles] as T;
			}
			return undefined;
		});

	const ShowInputBox = (
		Option?: InputBoxOptions,
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested) {
				return yield* _(Effect.interrupt);
			}

			const IPCOptions = {
				...Option,
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Option?.buttons,
				),
			};

			return yield* _(
				IPCService.SendRequest<string | undefined>("$showInputBox", [
					IPCOptions,
				]),
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
			);
		});

	const ServiceImplementation: Interface = {
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

	return ServiceImplementation;
});
