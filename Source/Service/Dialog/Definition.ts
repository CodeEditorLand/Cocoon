/**
 * @module Definition (Dialog)
 * @description The live implementation of the Dialog service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type { CancellationToken } from "vscode";

import * as DialogConverter from "../../TypeConverter/Dialog.js";
import { IPC } from "../IPC.js";
import { DialogError } from "./Error.js";
import type { Interface } from "./Service.js";

function CreateDialogEffect<Option, DTO, Result>(
	ipcMethod: string,
	options: Option | undefined,
	token: CancellationToken | undefined,
	optionsToDTO: (opts: Option | undefined) => DTO,
	resultFromDTO: (res: any) => Result,
) {
	return Effect.gen(function* (_) {
		if (token?.isCancellationRequested) {
			return yield* _(Effect.interrupt);
		}

		const IPCService = yield* _(IPC.Tag);
		const DTO = optionsToDTO(options);

		const RPCResult = yield* _(
			IPCService.SendRequest<any>(ipcMethod, [DTO]),
			// User cancellation is not an error; it resolves to an empty value.
			Effect.catchIf(isCancellationError, () =>
				Effect.succeed(undefined),
			),
			// Any other error is mapped to our specific DialogError.
			Effect.mapError(
				(cause) =>
					new DialogError({
						cause,
						context: `IPC call to ${ipcMethod} failed`,
					}),
			),
		);

		return resultFromDTO(RPCResult);
	});
}

export const Definition = Effect.succeed({
	ShowOpenDialog: (Option, Token) =>
		CreateDialogEffect(
			"$showOpenDialog",
			Option,
			Token,
			DialogConverter.OpenDialogOption.ToDTO,
			DialogConverter.DialogResult.ToURIArray,
		),

	ShowSaveDialog: (Option, Token) =>
		CreateDialogEffect(
			"$showSaveDialog",
			Option,
			Token,
			DialogConverter.SaveDialogOption.ToDTO,
			DialogConverter.DialogResult.ToURI,
		),
} satisfies Interface);
