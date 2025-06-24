/**
 * @module Dialog
 * @description Defines the service for showing native file dialogs, such as 'Open'
 * and 'Save' dialogs. This service proxies requests to the host process via IPC.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type {
	CancellationToken,
	OpenDialogOptions,
	SaveDialogOptions,
	Uri,
} from "vscode";
import { ToDTO as OpenDialogOptionToDTO } from "./TypeConverter/Dialog/OpenDialogOption.js";
import { ToDTO as SaveDialogOptionToDTO } from "./TypeConverter/Dialog/SaveDialogOption.js";
import {
	ToURI as DTOToURI,
	ToURIArray as DTOToURIArray,
} from "./TypeConverter/Dialog/DialogResult.js";
import { IPC } from "./IPC.js";
import { DialogProblem } from "./Dialog/DialogProblem.js";

/**
 * @description An internal helper to create an Effect for showing a dialog. It handles
 * cancellation tokens, DTO conversion, and error mapping.
 */
const CreateDialogEffect = <Option, DTO, Result>(
	IPCService: IPC,
	IPCMethod: string,
	Options: Option | undefined,
	Token: CancellationToken | undefined,
	OptionsToDTO: (Options: Option | undefined) => DTO,
	ResultFromDTO: (Result: any) => Result,
): Effect.Effect<Result, DialogProblem> => {
	return Effect.gen(function* () {
		if (Token?.isCancellationRequested) {
			return yield* Effect.interrupt;
		}
		const DTO = OptionsToDTO(Options);
		const RPCResult = yield* IPCService.SendRequest<any>(IPCMethod, [
			DTO,
		]).pipe(
			Effect.catchIf(isCancellationError, () =>
				Effect.succeed(undefined),
			),
			Effect.mapError(
				(cause) =>
					new DialogProblem({
						cause,
						context: `IPC call to ${IPCMethod} failed`,
					}),
			),
		);
		return ResultFromDTO(RPCResult);
	});
};

/**
 * @interface Dialog
 * @description The contract for the Dialog service.
 */
export interface Dialog {
	readonly ShowOpenDialog: (
		options?: OpenDialogOptions,
		token?: CancellationToken,
	) => Effect.Effect<Uri[] | undefined, DialogProblem>;
	readonly ShowSaveDialog: (
		options?: SaveDialogOptions,
		token?: CancellationToken,
	) => Effect.Effect<Uri | undefined, DialogProblem>;
}

/**
 * @class Dialog
 * @description The `Effect.Service` for handling native dialogs.
 */
export class Dialog extends Effect.Service<Dialog>()("Service/Dialog", {
	effect: Effect.gen(function* () {
		const IPCService = yield* IPC;

		return {
			ShowOpenDialog: (Options, Token) =>
				CreateDialogEffect<OpenDialogOptions, any, Uri[] | undefined>(
					IPCService,
					"$showOpenDialog",
					Options,
					Token,
					(Opts?: OpenDialogOptions) => OpenDialogOptionToDTO(Opts),
					(Result: any): Uri[] | undefined => DTOToURIArray(Result),
				),
			ShowSaveDialog: (Options, Token) =>
				CreateDialogEffect<SaveDialogOptions, any, Uri | undefined>(
					IPCService,
					"$showSaveDialog",
					Options,
					Token,
					SaveDialogOptionToDTO,
					(Result: any): Uri | undefined => DTOToURI(Result),
				),
		};
	}),
}) {}
