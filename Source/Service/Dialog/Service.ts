/*
 * File: Cocoon/Source/Service/Dialog/Service.ts
 * Role: Defines the Dialog service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for showing native file dialogs.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import type { CancellationToken, Uri } from "vscode";
import DialogConverter from "../../TypeConverter/Dialog.js";
import { IPC as IPCService } from "../IPC/Service.js";
import { DialogError, type DialogProblem } from "./Error/DialogError.js";
import type { OpenDialogOptions, SaveDialogOptions } from "./Type.js";

// --- Internal Helper ---
const CreateDialogEffect = <Option, DTO, Result>(
	IPC: IPCService,
	IPCMethod: string,
	Options: Option | undefined,
	Token: CancellationToken | undefined,
	OptionsToDTO: (Options: Option | undefined) => DTO,
	ResultFromDTO: (Result: any) => Result,
): Effect.Effect<Result, DialogProblem> => {
	return Effect.gen(function* (Generator) {
		if (Token?.isCancellationRequested) {
			return yield* Generator(Effect.interrupt);
		}
		const DTO = OptionsToDTO(Options);
		const RPCResult = yield* Generator(
			IPC.SendRequest<any>(IPCMethod, [DTO]).pipe(
				Effect.catchIf(isCancellationError, () =>
					Effect.succeed(undefined),
				),
				Effect.mapError(
					(cause) =>
						new DialogError({
							cause,
							context: `IPC call to ${IPCMethod} failed`,
						}),
				),
			),
		);
		return ResultFromDTO(RPCResult);
	});
};

// --- Service Definition ---
export class Dialog extends Effect.Service<Dialog>()("Service/Dialog", {
	effect: Effect.gen(function* (Generator) {
		const IPC = yield* Generator(IPCService);

		const ServiceImplementation = {
			ShowOpenDialog: (
				Options?: OpenDialogOptions,
				Token?: CancellationToken,
			) =>
				CreateDialogEffect<OpenDialogOptions, any, Uri[] | undefined>(
					IPC,
					"$showOpenDialog",
					Options,
					Token,
					(Opts?: OpenDialogOptions) =>
						DialogConverter.OpenDialogOption.ToDTO(Opts),
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

		return ServiceImplementation;
	}),
}) {}
