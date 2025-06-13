/**
 * @module Definition (QuickInput)
 * @description The live implementation of the QuickInput service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	InputBox,
	InputBoxOption,
	QuickPick,
	QuickPickItem,
} from "vscode";

import * as QuickInputConverter from "../../TypeConverter/QuickInput.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);

	const ShowQuickPickEffect = <T extends QuickPickItem | string>(
		Items: ReadonlyArray<T> | Promise<ReadonlyArray<T>>,
		Option: any = {},
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested)
				return yield* _(Effect.interrupt);

			const ResolvedItems = yield* _(
				Effect.promise(() => Promise.resolve(Items)),
			);

			const IPCOption = {
				...Option,
				items: QuickInputConverter.QuickPick.SerializeItems(
					ResolvedItems,
				),
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Option.buttons,
				),
			};

			const ResultHandles = yield* _(
				IPC.SendRequest<number[] | number | undefined>(
					"ui_showQuickPick",
					IPCOption,
				),
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
			);

			if (Option?.canPickMany) {
				if (!Array.isArray(ResultHandles)) return undefined;
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

	const ShowInputBoxEffect = (
		Option?: InputBoxOption,
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested)
				return yield* _(Effect.interrupt);

			const IPCOption = {
				...Option,
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Option?.buttons,
				),
			};

			return yield* _(
				IPC.SendRequest<string | undefined>(
					"ui_showInputBox",
					IPCOption,
				),
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
			);
		});

	const ServiceImplementation: Interface = {
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

	return ServiceImplementation;
});
