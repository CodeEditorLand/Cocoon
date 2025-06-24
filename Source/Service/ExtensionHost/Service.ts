/*
 * File: Cocoon/Source/Service/ExtensionHost/Service.ts
 * Role: Defines the ExtensionHost service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage the lifecycle of all extensions: loading, activating, and deactivating.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { URI } from "vs/base/common/uri.js";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import { ExtensionRuntime } from "vs/workbench/api/common/extHostTypes.js";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { ExtensionContext, LanguageModelAccessInformation } from "vscode";

import { InitData } from "../../Service/InitData/Service.js";
import { IPC } from "../../Service/IPC/Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { Telemetry } from "../../Service/Telemetry/Service.js";

/** Describes the reason an extension is being activated. */
export interface ExtensionActivationReason {
	readonly startup: boolean;
	readonly extensionId: ExtensionIdentifier;
	readonly activationEvent: string;
}

/** Represents the internal state of an activated extension. */
interface ActivatedExtension {
	readonly ID: ExtensionIdentifier;
	readonly Module: {
		readonly activate?: Function;
		readonly deactivate?: Function;
	};
	readonly Exports: any;
	readonly Subscriptions: readonly VScode.Disposable[];
	readonly ActivationFailed: boolean;
	readonly ActivationError: Error | null;
}

export class ExtensionHost extends Effect.Service<ExtensionHost>()(
	"Service/ExtensionHost",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);
			const IPCService = yield* Generator(IPC);
			const InitDataService = yield* Generator(InitData);
			const TelemetryService = yield* Generator(Telemetry);

			const ActivatedExtensionsRef = yield* Generator(
				Ref.make(new Map<string, ActivatedExtension>()),
			);

			const ActivationEventsReader: IActivationEventsReader = {
				readActivationEvents: (description) =>
					ImplicitActivationEvents.readActivationEvents(description),
			};

			const ExtensionRegistry = new ExtensionDescriptionRegistry(
				ActivationEventsReader,
				InitDataService.extensions.allExtensions,
			);

			const DeactivateEffect = (Extension: ActivatedExtension) =>
				Effect.gen(function* (Generator) {
					yield* Generator(
						LogService.Info(
							`Deactivating extension '${Extension.ID.value}'...`,
						),
					);
					for (const Subscription of Extension.Subscriptions) {
						yield* Generator(
							Effect.tryPromise({
								try: () =>
									Promise.resolve(Subscription.dispose()),
								catch: (CaughtError) =>
									LogService.Warn(
										`Error during subscription disposal for ${Extension.ID.value}`,
										CaughtError,
									),
							}),
						);
					}
					const DeactivateFunction = Extension.Module.deactivate;
					if (typeof DeactivateFunction === "function") {
						yield* Generator(
							Effect.tryPromise({
								try: () =>
									Promise.resolve(DeactivateFunction()),
								catch: (CaughtError) =>
									new Error(
										`Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`,
									),
							}).pipe(
								Effect.catchAll((error) =>
									LogService.Error(error.message),
								),
							),
						);
					}
				}).pipe(
					Effect.catchAllCause((cause) =>
						LogService.Warn("Deactivation error occurred", cause),
					),
				);

			const DoActivateExtensionEffect = (
				Description: IExtensionDescription,
				Reason: ExtensionActivationReason,
			) =>
				Effect.gen(function* (Generator) {
					yield* Generator(
						LogService.Info(
							`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
						),
					);
					const Module = yield* Generator(
						Effect.tryPromise({
							try: () =>
								import(
									URI.revive(Description.extensionLocation)
										.fsPath
								),
							catch: (CaughtError) =>
								new Error(
									`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
								),
						}),
					);

					const LanguageModelInfo: LanguageModelAccessInformation = {
						onDidChange: new Emitter<void>().event,
						canSendRequest: (_chat) => false,
					};

					const Context: ExtensionContext = {
						subscriptions: [],
						extensionPath: URI.revive(Description.extensionLocation)
							.fsPath,
						extensionUri: URI.revive(Description.extensionLocation),
						storageUri: URI.parse("file:///extension-storage"),
						globalStorageUri: URI.parse("file:///global-storage"),
						logUri: URI.parse("file:///logs"),
						extensionMode: 1, // Production
						secrets: undefined as any, // Provided by SecretStorage service
						storagePath: "/extension-storage",
						globalStoragePath: "/global-storage",
						logPath: "/logs",
						extension: undefined as any,
						environmentVariableCollection: undefined as any,
						asAbsolutePath: (path) => path,
						languageModelAccessInformation: LanguageModelInfo,
						workspaceState: undefined as any, // Provided by Storage service
						globalState: undefined as any, // Provided by Storage service
						extensionRuntime: ExtensionRuntime.Node,
						messagePassingProtocol: undefined,
					};

					const ActivationFunction = Module.activate as
						| Function
						| undefined;
					const Exports = ActivationFunction
						? yield* Generator(
								Effect.tryPromise({
									try: () =>
										Promise.resolve(
											ActivationFunction.apply(
												globalThis,
												[Context],
											),
										),
									catch: (CaughtError) =>
										new Error(
											`Activation function for '${Description.identifier.value}' failed: ${CaughtError}`,
										),
								}),
							)
						: Module;

					const Activated: ActivatedExtension = {
						ID: Description.identifier,
						Module,
						Exports,
						Subscriptions: Context.subscriptions,
						ActivationFailed: false,
						ActivationError: null,
					};

					yield* Generator(
						Ref.update(ActivatedExtensionsRef, (Map) =>
							Map.set(Description.identifier.value, Activated),
						),
					);
					yield* Generator(
						LogService.Info(
							`Successfully activated extension '${Description.identifier.value}'.`,
						),
					);
					yield* Generator(
						IPCService.SendNotification("$onDidActivateExtension", [
							Description.identifier,
							[],
							[],
						]),
					);
				});

			const ActivateById = (
				ID: ExtensionIdentifier,
				Reason: ExtensionActivationReason,
			): Effect.Effect<void, never> => {
				const ActivationLogic = Effect.gen(function* (Generator) {
					const IsActivated = yield* Generator(
						Ref.get(ActivatedExtensionsRef).pipe(
							Effect.map((Map) => Map.has(ID.value)),
						),
					);
					if (IsActivated) return;

					const MaybeDescription =
						ExtensionRegistry.getExtensionDescription(ID);
					if (!MaybeDescription) {
						return yield* Generator(
							LogService.Warn(
								`Cannot activate unknown extension '${ID.value}'.`,
							),
						);
					}
					if (!MaybeDescription.main) {
						return yield* Generator(
							LogService.Warn(
								`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
							),
						);
					}
					yield* Generator(
						DoActivateExtensionEffect(MaybeDescription, Reason),
					);
				});

				return ActivationLogic.pipe(
					Effect.catchAll((error) => {
						const ErrorHandlingEffect = Effect.gen(
							function* (Generator) {
								const ErrorToReport =
									error instanceof globalThis.Error
										? error
										: new Error(String(error));
								const Activated: ActivatedExtension = {
									ID: ID,
									Module: {},
									Exports: undefined,
									Subscriptions: [],
									ActivationFailed: true,
									ActivationError: ErrorToReport,
								};
								yield* Generator(
									Ref.update(ActivatedExtensionsRef, (Map) =>
										Map.set(ID.value, Activated),
									),
								);
								yield* Generator(
									IPCService.SendNotification(
										"$onExtensionActivationError",
										[
											ID,
											{
												name: ErrorToReport.name,
												message: ErrorToReport.message,
												stack: ErrorToReport.stack,
											},
										],
									).pipe(
										Effect.catchAllCause((cause) =>
											LogService.Warn(
												"Failed to send activation error notification",
												cause,
											),
										),
									),
								);
								yield* Generator(
									Effect.sync(() =>
										TelemetryService.onExtensionError(
											ID,
											ErrorToReport,
										),
									),
								);
							},
						);
						return ErrorHandlingEffect.pipe(Effect.asVoid);
					}),
				);
			};

			const ServiceImplementation = {
				ActivateById,
				GetExtensionDescription: (ID: string | ExtensionIdentifier) =>
					Effect.succeed(
						ExtensionRegistry.getExtensionDescription(ID),
					),
				GetExtensionExports: (ID: ExtensionIdentifier) =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.flatMap((Map) => {
							const Ext = Map.get(ID.value);
							if (Ext?.ActivationFailed && Ext.ActivationError) {
								return Effect.fail(Ext.ActivationError);
							}
							return Effect.succeed(Ext?.Exports);
						}),
					),
				IsActivated: (ID: ExtensionIdentifier) =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.map((Map) => Map.has(ID.value)),
					),
				DeactivateAll: () =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.flatMap((Map) =>
							Effect.forEach(
								[...Map.values()],
								DeactivateEffect,
								{ concurrency: "unbounded", discard: true },
							),
						),
						Effect.andThen(
							Ref.set(ActivatedExtensionsRef, new Map()),
						),
					),
			};

			return ServiceImplementation;
		}),
	},
) {}
