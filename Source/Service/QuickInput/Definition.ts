/**
 * @module Definition (QuickInput)
 * @description The live implementation of the QuickInput service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	InputBox,
	InputBoxOptions,
	QuickPick,
	QuickPickItem,
} from "vscode";

import * as QuickInputConverter from "../../TypeConverter/QuickInput.js";
import { IpcProvider } from "../Ipc/mod.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);

	const ShowQuickPickEffect = <T extends QuickPickItem | string>(
		Items: ReadonlyArray<T> | Promise<ReadonlyArray<T>>,
		Options: any = {},
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested)
				return yield* _(Effect.interrupt);

			const ResolvedItems = yield* _(
				Effect.promise(() => Promise.resolve(Items)),
			);

			const IpcOptions = {
				...Options,
				items: QuickInputConverter.QuickPick.SerializeItems(
					ResolvedItems,
				),
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Options.buttons,
				),
			};

			const ResultHandles = yield* _(
				Ipc.SendRequest<number[] | number | undefined>(
					"ui_showQuickPick",
					IpcOptions,
				),
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
			);

			if (Options?.canPickMany) {
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
		Options?: InputBoxOptions,
		Token?: CancellationToken,
	) =>
		Effect.gen(function* (_) {
			if (Token?.isCancellationRequested)
				return yield* _(Effect.interrupt);

			const IpcOptions = {
				...Options,
				buttons: QuickInputConverter.QuickPick.SerializeButtons(
					Options?.buttons,
				),
			};

			return yield* _(
				Ipc.SendRequest<string | undefined>(
					"ui_showInputBox",
					IpcOptions,
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
