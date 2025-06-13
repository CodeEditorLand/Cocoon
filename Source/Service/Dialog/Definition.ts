/**
 * @module Definition (Dialog)
 * @description The live implementation of the Dialog service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type { CancellationToken } from "vscode";

import * as DialogConverter from "../../TypeConverter/Dialog.js";
import { IpcProvider } from "../Ipc.js";
import type { Interface } from "./Service.js";
import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

const createDialogEffect = <Options, Dto, Result>(
	ipcMethod: string,
	options: Options | undefined,
	token: CancellationToken | undefined,
	optionsToDto: (opts: Options | undefined) => Dto,
	resultFromDto: (res: any) => Result,
) =>
	Effect.gen(function* (_) {
		if (token?.isCancellationRequested) {
			return yield* _(Effect.interrupt);
		}

		const Ipc = yield* _(IpcProvider.Tag);
		const Dto = optionsToDto(options);

		const RpcResult = yield* _(
			Ipc.SendRequest<any>(ipcMethod, Dto),
			// Gracefully handle user cancellation as a success with an empty value.
			Effect.catchIf(isCancellationError, () =>
				Effect.succeed(undefined),
			),
		);

		return resultFromDto(RpcResult);
	});

export const Definition = Effect.succeed({
	ShowOpenDialog: (Options, Token) =>
		createDialogEffect(
			"ui_showOpenDialog",
			Options,
			Token,
			DialogConverter.OpenDialogOptions.ToDto,
			DialogConverter.DialogResult.ToUriArray,
		),

	ShowSaveDialog: (Options, Token) =>
		createDialogEffect(
			"ui_showSaveDialog",
			Options,
			Token,
			DialogConverter.SaveDialogOptions.ToDto,
			DialogConverter.DialogResult.ToUri,
		),
} satisfies Interface);
