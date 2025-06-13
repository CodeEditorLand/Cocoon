/**
 * @module Definition (Command)
 * @description The live implementation of the Command service.
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import { CommandConverter } from "../../TypeConverter/Command.js"; // Assume this exists
import { IPCProvider } from "../IPC.js";
import { TelemetryProvider } from "../Telemetry.js";
import type { Interface } from "./Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Telemetry = yield* _(TelemetryProvider.Tag);
	const CommandRegistry = yield* _(
		Ref.make(new Map<string, CommandHandlerEntry>()),
	);

	// The converter is needed for marshalling args for RPC calls.
	// In a real app, its dependencies would be properly injected.
	const Converter = new CommandConverter({} as any, {} as any);

	const ExecuteCommandEffect = <T>(
		Id: string,
		...Args: any[]
	): Effect.Effect<T, Error> =>
		Effect.gen(function* (_) {
			const Registry = yield* _(Ref.get(CommandRegistry));
			const Entry = Registry.get(Id);

			if (Entry) {
				// Execute the command locally if it's registered in this host.
				const { Handler, ThisArg, Extension } = Entry;
				return yield* _(
					Effect.tryPromise({
						try: () =>
							Promise.resolve(Handler.apply(ThisArg, Args)),
						catch: (e) =>
							new Error(`Command '${Id}' execution failed: ${e}`),
					}),
					Effect.tapError((e) =>
						Telemetry.OnExtensionError(Extension!.identifier, e),
					),
				);
			}

			// If not found locally, proxy the command execution to the Mountain host.
			const MarshalledArgs = Args.map((arg) => Converter.ToInternal(arg));
			const Result = yield* _(
				IPC.SendRequest("$executeCommand", [Id, MarshalledArgs]),
			);
			return Converter.FromInternal(Result) as T;
		});

	const ServiceImplementation: Interface = {
		ExecuteCommand: ExecuteCommandEffect,

		RegisterCommand: (Id, Handler, ThisArg, Extension) => {
			const Entry = { Handler, ThisArg, Extension };
			const registerEffect = Ref.update(CommandRegistry, (map) =>
				map.set(Id, Entry),
			).pipe(
				Effect.flatMap(() =>
					IPC.SendNotification("$registerCommand", [Id]),
				),
			);
			Effect.runFork(registerEffect);

			return new Disposable(() => {
				const unregisterEffect = Ref.update(
					CommandRegistry,
					(map) => (map.delete(Id), map),
				).pipe(
					Effect.flatMap(() =>
						IPC.SendNotification("$unregisterCommand", [Id]),
					),
				);
				Effect.runFork(unregisterEffect);
			});
		},

		RegisterTextEditorCommand: (Id, Handler, ThisArg, Extension) => {
			// In a real implementation, this would wrap the handler to provide the text editor argument.
			return ServiceImplementation.RegisterCommand(
				Id,
				Handler,
				ThisArg,
				Extension,
			);
		},

		GetCommand: (FilterInternal = false) =>
			IPC.SendRequest<string[]>("getCommand", []).pipe(
				Effect.flatMap((RemoteCommand) =>
					Ref.get(CommandRegistry).pipe(
						Effect.map((LocalRegistry) => {
							const LocalCommand = Array.from(
								LocalRegistry.keys(),
							);
							const AllCommand = [
								...new Set([
									...RemoteCommand,
									...LocalCommand,
								]),
							];
							return FilterInternal
								? AllCommand.filter(
										(cmd) => !cmd.startsWith("_"),
									)
								: AllCommand;
						}),
					),
				),
			),
	};

	return ServiceImplementation;
});
