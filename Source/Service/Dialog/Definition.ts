/**
 * @module Definition (Dialog)
 * @description The live implementation of the Dialog service.
 */

import { Context, Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type { CancellationToken } from "vscode";

import * as DialogConverter from "../../TypeConverter/Dialog.js";
import IPCService from "../IPC/Service.js";
import DialogError from "./Error/DialogError.js";

function CreateDialogEffect<Option, DTO, Result>(
	IPC: IPCService,
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

		const DTO = optionsToDTO(options);

		const RPCResult = yield* _(
			IPC.SendRequest<any>(ipcMethod, [DTO]),
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

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);

	const ServiceImplementation: Context.Tag.Service<any> = {
		ShowOpenDialog: (Option, Token) =>
			CreateDialogEffect(
				IPC,
				"$showOpenDialog",
				Option,
				Token,
				DialogConverter.OpenDialogOption.ToDTO,
				DialogConverter.DialogResult.ToURIArray,
			),

		ShowSaveDialog: (Option, Token) =>
			CreateDialogEffect(
				IPC,
				"$showSaveDialog",
				Option,
				Token,
				DialogConverter.SaveDialogOption.ToDTO,
				DialogConverter.DialogResult.ToURI,
			),
	};

	return ServiceImplementation;
});
