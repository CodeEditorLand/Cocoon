/*
 * File: Cocoon/Source/Service/QuickInput/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:01:41 UTC
 * Dependency: ../../TypeConverter/QuickInput.js, ../IPC/Service.js, ./Service.js, effect, vs/base/common/errors.js
 */

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

import { QuickInput as QuickInputConverter } from "../../TypeConverter/QuickInput.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;

	const ShowQuickPick = <T extends QuickPickItem>(
		Items: readonly T[] | Promise<readonly T[]>,
		Option: QuickPickOptions = {},
		Token?: CancellationToken,
	) =>
		Effect.gen(function* () {
			if (Token?.isCancellationRequested) {
				return yield* Effect.interrupt;
			}

			const ResolvedItems = yield* Effect.tryPromise({
				try: () => Promise.resolve(Items),
				catch: (e) => e,
			});

			const IPCOptions = {
				...Option,
				items: QuickInputConverter.SerializeItems(ResolvedItems),
				buttons: QuickInputConverter.SerializeButtons(Option.buttons),
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
		Effect.gen(function* () {
			if (Token?.isCancellationRequested) {
				return yield* Effect.interrupt;
			}

			const IPCOptions = {
				...Option,
				buttons: QuickInputConverter.SerializeButtons(Option?.buttons),
			};

			return yield* IPC.SendRequest<string | undefined>("$showInputBox", [
				IPCOptions,
			]).pipe(
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
				Effect.mapError((cause) => new Error(String(cause))),
			);
		});

	const ServiceImplementation: Service["Type"] = {
		showQuickPick: ShowQuickPick,
		showInputBox: ShowInputBox,
		createQuickPick: () => {
			throw new Error(
				"Controller-based QuickPick is not implemented in Cocoon.",
			);
		},
		createInputBox: () => {
			throw new Error(
				"Controller-based InputBox is not implemented in Cocoon.",
			);
		},
	};

	return ServiceImplementation;
});
