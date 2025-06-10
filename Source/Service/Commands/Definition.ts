/**
 * @module Definition (Commands)
 * @description The live implementation of the Commands service.
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import { CommandsConverter } from "../../TypeConverter/Commands.js"; // Assume this exists
import { IpcProvider } from "../Ipc/mod.js";
import { TelemetryProvider } from "../Telemetry.js";
import type { Interface } from "./Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Telemetry = yield* _(TelemetryProvider.Tag);
	const CommandRegistry = yield* _(
		Ref.make(new Map<string, CommandHandlerEntry>()),
	);

	// The converter is needed for marshalling args for RPC calls.
	// In a real app, its dependencies would be properly injected.
	const Converter = new CommandsConverter({} as any, {} as any);

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
				Ipc.SendRequest("$executeCommand", [Id, MarshalledArgs]),
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
					Ipc.SendNotification("$registerCommand", [Id]),
				),
			);
			Effect.runFork(registerEffect);

			return new Disposable(() => {
				const unregisterEffect = Ref.update(
					CommandRegistry,
					(map) => (map.delete(Id), map),
				).pipe(
					Effect.flatMap(() =>
						Ipc.SendNotification("$unregisterCommand", [Id]),
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

		GetCommands: (FilterInternal = false) =>
			Ipc.SendRequest<string[]>("getCommands", []).pipe(
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
