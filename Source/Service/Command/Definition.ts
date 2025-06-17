/*
 * File: Cocoon/Source/Service/Command/Definition.ts
 * Responsibility: The live implementation of the Command service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Definition (Command)
 * @description The live implementation of the Command service.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable } from "vscode";

import IPCService from "../IPC/Service.js";
import TelemetryService from "../Telemetry/Service.js";
import WindowService from "../Window/Service.js";
import type Service from "./Service.js";
import type { CommandHandler, CommandHandlerEntry } from "./Type.js";

/**
 * An Effect that builds the live implementation of the Command service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Telemetry = yield* G(TelemetryService);
	const Window = yield* G(WindowService);
	const CommandRegistryRef = yield* G(
		Ref.make(new Map<string, CommandHandlerEntry>()),
	);

	const ExecuteCommandEffect = <T>(
		ID: string,
		...Arguments: any[]
	): Effect.Effect<T, Error> =>
		Effect.gen(function* (G) {
			const Registry = yield* G(Ref.get(CommandRegistryRef));
			const Entry = Registry.get(ID);

			if (Entry) {
				const { Handler, ThisArgument, Extension } = Entry;
				return yield* G(
					Effect.tryPromise({
						try: () =>
							Promise.resolve(
								Handler.apply(ThisArgument, Arguments),
							),
						catch: (e) =>
							new Error(`Command '${ID}' execution failed: ${e}`),
					}).pipe(
						Effect.catchAll((e) =>
							Effect.sync(() =>
								Telemetry.onExtensionError(
									Extension.identifier,
									e,
								),
							).pipe(Effect.andThen(Effect.fail(e))),
						),
					),
				);
			}

			const Result = yield* G(
				IPC.SendRequest("$executeCommand", [ID, ...Arguments]).pipe(
					Effect.mapError((cause) => new Error(String(cause))),
				),
			);
			return Result as T;
		});

	const RegisterCommand = (
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
		const RegisterEffect = Ref.update(CommandRegistryRef, (map) =>
			map.set(ID, Entry),
		).pipe(
			Effect.flatMap(() =>
				IPC.SendNotification("$registerCommand", [ID]),
			),
		);
		Effect.runFork(RegisterEffect);

		return new Disposable(() => {
			const UnregisterEffect = Ref.update(
				CommandRegistryRef,
				(map) => (map.delete(ID), map),
			).pipe(
				Effect.flatMap(() =>
					IPC.SendNotification("$unregisterCommand", [ID]),
				),
			);
			Effect.runFork(UnregisterEffect);
		});
	};

	const ServiceImplementation: Service["Type"] = {
		ExecuteCommand: ExecuteCommandEffect,

		RegisterCommand: (ID, Handler, ThisArgument, Extension) => {
			return RegisterCommand(ID, Handler, false, ThisArgument, Extension);
		},

		RegisterTextEditorCommand: (ID, Handler, ThisArgument, Extension) => {
			const WrappedHandler: CommandHandler = (...args: any[]) => {
				const Editor = Window.activeTextEditor;
				if (!Editor) {
					console.warn(
						`Cannot execute text editor command "${ID}" without an active text editor.`,
					);
					return;
				}
				// The `edit` method on TextEditor is Promise-based.
				return Editor.edit((editBuilder) => {
					Handler(Editor, editBuilder, ...args);
				});
			};
			return RegisterCommand(
				ID,
				WrappedHandler,
				true,
				ThisArgument,
				Extension,
			);
		},

		GetCommands: (FilterInternal = false) =>
			IPC.SendRequest<string[]>("$getCommands", []).pipe(
				Effect.mapError((cause) => new Error(String(cause))),
				Effect.flatMap((RemoteCommands) =>
					Ref.get(CommandRegistryRef).pipe(
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
