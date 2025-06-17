/*
 * File: Cocoon/Source/Service/Command/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../TypeConverter/Command.js, ../IPC/Service.js, ../Telemetry/Service.js, ../WorkSpace/Service.js, ./Service.js, ./Type.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module Definition (Command)
 * @description The live implementation of the Command service.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable } from "vscode";

// This import is unused in the file's logic.
// import { Definition as CommandConverterDefinition } from "../../TypeConverter/Command.js";
import IPCService from "../IPC/Service.js";
import TelemetryService from "../Telemetry/Service.js";
import WorkSpaceService from "../WorkSpace/Service.js";
import type Service from "./Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Type.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Telemetry = yield* TelemetryService;
	const WorkSpace = yield* WorkSpaceService;
	const CommandRegistry = yield* Ref.make(
		new Map<string, CommandHandlerEntry>(),
	);

	const ExecuteCommand = <T>(
		ID: string,
		...Arguments: any[]
	): Effect.Effect<T, Error> =>
		Effect.gen(function* () {
			const Registry = yield* Ref.get(CommandRegistry);
			const Entry = Registry.get(ID);

			if (Entry) {
				const { Handler, ThisArgument, Extension } = Entry;
				return yield* Effect.tryPromise({
					try: () =>
						Promise.resolve(Handler.apply(ThisArgument, Arguments)),
					catch: (e) =>
						new Error(`Command '${ID}' execution failed: ${e}`),
				}).pipe(
					Effect.catchAll((e) =>
						Effect.flatMap(
							Effect.sync(() =>
								Telemetry.onExtensionError(
									Extension.identifier,
									e,
								),
							),
							() => Effect.fail(e),
						),
					),
				);
			}

			// Arguments are not marshalled here because VS Code's RPCProtocol handles it.
			// This simplifies our implementation significantly.
			const Result = yield* IPC.SendRequest("$executeCommand", [
				ID,
				...Arguments,
			]).pipe(Effect.mapError((cause) => new Error(String(cause))));
			return Result as T;
		});

	const Register = (
		ID: string,
		Handler: CommandHandler,
		IsTextEditorCommand: boolean,
		ThisArgument?: any,
		Extension?: IExtensionDescription,
	) => {
		const Entry: CommandHandlerEntry = {
			Handler,
			ThisArgument,
			Extension: Extension!,
			IsTextEditorCommand,
		};
		const registerEffect = Ref.update(CommandRegistry, (map) =>
			map.set(ID, Entry),
		).pipe(
			Effect.flatMap(() =>
				IPC.SendNotification("$registerCommand", [ID]),
			),
		);
		Effect.runFork(registerEffect);

		return new Disposable(() => {
			const unregisterEffect = Ref.update(
				CommandRegistry,
				(map) => (map.delete(ID), map),
			).pipe(
				Effect.flatMap(() =>
					IPC.SendNotification("$unregisterCommand", [ID]),
				),
			);
			Effect.runFork(unregisterEffect);
		});
	};

	const ServiceImplementation: Service["Type"] = {
		ExecuteCommand,

		RegisterCommand: (ID, Handler, ThisArgument, Extension) => {
			return Register(ID, Handler, false, ThisArgument, Extension);
		},

		RegisterTextEditorCommand: (ID, Handler, ThisArgument, Extension) => {
			const WrappedHandler: CommandHandler = (...args: any[]) => {
				const editor = WorkSpace.activeTextEditor;
				if (!editor) {
					console.warn(
						`Cannot execute text editor command "${ID}" without an active text editor.`,
					);
					return;
				}
				return editor.edit((editBuilder) => {
					Handler(editor, editBuilder, ...args);
				});
			};
			return Register(ID, WrappedHandler, true, ThisArgument, Extension);
		},

		GetCommands: (FilterInternal = false) =>
			IPC.SendRequest<string[]>("$getCommands", []).pipe(
				Effect.mapError((cause) => new Error(String(cause))),
				Effect.flatMap((RemoteCommands) =>
					Ref.get(CommandRegistry).pipe(
						Effect.map((LocalRegistry) => {
							const LocalCommands = Array.from(
								LocalRegistry.keys(),
							);
							const AllCommands = [
								...new Set([
									...RemoteCommands,
									...LocalCommands,
								]),
							];
							return FilterInternal
								? AllCommands.filter(
										(cmd) => !cmd.startsWith("_"),
									)
								: AllCommands;
						}),
					),
				),
			),
	};

	return ServiceImplementation;
});
