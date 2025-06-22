/*
 * File: Cocoon/Source/Service/Dialog/Definition.ts
 *
 * This file contains the live implementation of the Dialog service.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	OpenDialogOptions,
	SaveDialogOptions,
	Uri,
} from "vscode";

import DialogConverter from "../../TypeConverter/Dialog.js";
import IPCService from "../IPC/Service.js";
import DialogError from "./Error/DialogError.js";
import type Service from "./Service.js";

const CreateDialogEffect = <Option, DTO, Result>(
	IPC: IPCService["Type"],
	IPCMethod: string,
	Options: Option | undefined,
	Token: CancellationToken | undefined,
	OptionsToDTO: (Options: Option | undefined) => DTO,
	ResultFromDTO: (Result: any) => Result,
) => {
	return Effect.gen(function* () {
		if (Token?.isCancellationRequested) {
			return yield* Effect.interrupt;
		}

		const DTO = OptionsToDTO(Options);
		const RPCResult = yield* IPC.SendRequest<any>(IPCMethod, [DTO]).pipe(
			// User cancellation is not an error; it resolves to an empty value.
			Effect.catchIf(isCancellationError, () =>
				Effect.succeed(undefined),
			),
			// Any other error is mapped to our specific DialogError.
			Effect.mapError(
				(cause) =>
					new DialogError({
						cause: cause,
						context: `IPC call to ${IPCMethod} failed`,
					}),
			),
		);
		return ResultFromDTO(RPCResult);
	});
};

/**
 * An Effect that builds the live implementation of the Dialog service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const DialogImplementation: Service["Type"] = {
		ShowOpenDialog: (
			Options?: OpenDialogOptions,
			Token?: CancellationToken,
		) =>
			CreateDialogEffect<OpenDialogOptions, any, Uri[] | undefined>(
				IPC,
				"$showOpenDialog",
				Options,
				Token,
				(Options?: OpenDialogOptions) =>
					DialogConverter.OpenDialogOption.ToDTO(Options),
				(Result: any): Uri[] | undefined =>
					DialogConverter.DialogResult.ToURIArray(Result),
			),
		ShowSaveDialog: (
			Options?: SaveDialogOptions,
			Token?: CancellationToken,
		) =>
			CreateDialogEffect<SaveDialogOptions, any, Uri | undefined>(
				IPC,
				"$showSaveDialog",
				Options,
				Token,
				DialogConverter.SaveDialogOption.ToDTO,
				(Result: any): Uri | undefined =>
					DialogConverter.DialogResult.ToURI(Result),
			),
	};

	return DialogImplementation;
});
