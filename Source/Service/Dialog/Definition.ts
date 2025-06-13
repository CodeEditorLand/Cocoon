/**
 * @module Definition (Dialog)
 * @description The live implementation of the Dialog service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type { CancellationToken } from "vscode";

import * as DialogConverter from "../../TypeConverter/Dialog.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import type { OpenDialogOption, SaveDialogOption } from "./Type.js";

const createDialogEffect = <Option, DTO, Result>(
	ipcMethod: string,
	options: Option | undefined,
	token: CancellationToken | undefined,
	optionsToDTO: (opts: Option | undefined) => DTO,
	resultFromDTO: (res: any) => Result,
) =>
	Effect.gen(function* (_) {
		if (token?.isCancellationRequested) {
			return yield* _(Effect.interrupt);
		}

		const IPC = yield* _(IPCProvider.Tag);
		const DTO = optionsToDTO(options);

		const RPCResult = yield* _(
			IPC.SendRequest<any>(ipcMethod, DTO),
			// Gracefully handle user cancellation as a success with an empty value.
			Effect.catchIf(isCancellationError, () =>
				Effect.succeed(undefined),
			),
		);

		return resultFromDTO(RPCResult);
	});

export const Definition = Effect.succeed({
	ShowOpenDialog: (Option, Token) =>
		createDialogEffect(
			"ui_showOpenDialog",
			Option,
			Token,
			DialogConverter.OpenDialogOption.ToDTO,
			DialogConverter.DialogResult.ToUriArray,
		),

	ShowSaveDialog: (Option, Token) =>
		createDialogEffect(
			"ui_showSaveDialog",
			Option,
			Token,
			DialogConverter.SaveDialogOption.ToDTO,
			DialogConverter.DialogResult.ToUri,
		),
} satisfies Interface);
