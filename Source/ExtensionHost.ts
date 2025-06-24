/**
 * @module ExtensionHost
 * @description Defines the core service for managing the lifecycle of all extensions.
 * It handles loading, activating, and deactivating extensions, and serves as the
 * central orchestrator for the extension ecosystem.
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
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { TelemetryService } from "./Telemetry.js";

/**
 * @interface ExtensionActivationReason
 * @description Describes the reason an extension is being activated.
 */
export interface ExtensionActivationReason {
	readonly startup: boolean;
	readonly extensionId: ExtensionIdentifier;
	readonly activationEvent: string;
}

/**
 * @interface ActivatedExtension
 * @description Represents the internal state of an activated extension, holding
 * its module, exports, and subscriptions.
 */
interface ActivatedExtension {
	readonly Id: ExtensionIdentifier;
	readonly Module: {
		readonly activate?: Function;
		readonly deactivate?: Function;
	};
	readonly Exports: any;
	readonly Subscriptions: readonly import("vscode").Disposable[];
	readonly ActivationFailed: boolean;
	readonly ActivationError: Error | null;
}

/**
 * @interface ExtensionHost
 * @description The contract for the ExtensionHost service.
 */
export interface ExtensionHost {
	readonly ActivateById: (
		Id: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) => Effect.Effect<void, never>;
	readonly GetExtensionDescription: (
		Id: string | ExtensionIdentifier,
	) => Effect.Effect<IExtensionDescription | undefined, never>;
	readonly GetExtensionExports: (
		Id: ExtensionIdentifier,
	) => Effect.Effect<any, Error>;
	readonly IsActivated: (
		Id: ExtensionIdentifier,
	) => Effect.Effect<boolean, never>;
	readonly DeactivateAll: () => Effect.Effect<void, never>;
	readonly OnDidActivateExtension: (
		callback: (extension: IExtensionDescription) => void,
	) => Effect.Effect<void, never>;
}

/**
 * @class ExtensionHostService
 * @description The `Effect.Service` for the ExtensionHost.
 */
export class ExtensionHostService extends Effect.Service<ExtensionHostService>()(
	"Service/ExtensionHost",
	{
		effect: Effect.gen(function* () {
			const Logger = yield* LoggerService;
			const IPC = yield* IPCService;
			const InitData = yield* InitDataService;
			const Telemetry = yield* TelemetryService;

			const ActivatedExtensionsRef = yield* Ref.make(
				new Map<string, ActivatedExtension>(),
			);
			const ActivationEventsReader: IActivationEventsReader = {
				readActivationEvents: (description) =>
					ImplicitActivationEvents.readActivationEvents(description),
			};
			const ExtensionRegistry = new ExtensionDescriptionRegistry(
				ActivationEventsReader,
				InitData.extensions.allExtensions as IExtensionDescription[],
			);

			const Deactivate = (Extension: ActivatedExtension) =>
				Effect.gen(function* () {
					yield* Logger.Info(
						`Deactivating extension '${Extension.Id.value}'...`,
					);
					for (const Subscription of Extension.Subscriptions) {
						yield* Effect.tryPromise({
							try: () => Promise.resolve(Subscription.dispose()),
							catch: (CaughtError) =>
								Logger.Warn(
									`Error during subscription disposal for ${Extension.Id.value}`,
									CaughtError,
								),
						});
					}
					const DeactivateFunction = Extension.Module.deactivate;
					if (typeof DeactivateFunction === "function") {
						yield* Effect.tryPromise({
							try: () => Promise.resolve(DeactivateFunction()),
							catch: (CaughtError) =>
								new Error(
									`Deactivation function for '${Extension.Id.value}' failed: ${CaughtError}`,
								),
						}).pipe(
							Effect.catchAll((error) =>
								Logger.Error(error.message),
							),
						);
					}
				}).pipe(
					Effect.catchAllCause((cause) =>
						Logger.Warn("Deactivation error occurred", cause),
					),
				);

			const DoActivate = (
				Description: IExtensionDescription,
				Reason: ExtensionActivationReason,
			) =>
				Effect.gen(function* () {
					yield* Logger.Info(
						`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
					);
					const Module = yield* Effect.tryPromise({
						try: () =>
							import(
								URI.revive(Description.extensionLocation).fsPath
							),
						catch: (CaughtError) =>
							new Error(
								`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
							),
					});

					const LanguageModelInfo: LanguageModelAccessInformation = {
						onDidChange: new Emitter<void>().event,
						canSendRequest: (_chat) => false,
					};
					const Context: ExtensionContext = {
						subscriptions: [],
						extensionPath: URI.revive(Description.extensionLocation)
							.fsPath,
						extensionUri: URI.revive(Description.extensionLocation),
						storageUri: URI.parse("file:///extension-storage"), // Stub
						globalStorageUri: URI.parse("file:///global-storage"), // Stub
						logUri: URI.parse("file:///logs"), // Stub
						extensionMode: 1, // Production
						secrets: undefined as any,
						storagePath: "/extension-storage", // Stub
						globalStoragePath: "/global-storage", // Stub
						logPath: "/logs", // Stub
						extension: undefined as any, // Lazily set
						environmentVariableCollection: undefined as any, // Stub
						asAbsolutePath: (path) => path,
						languageModelAccessInformation: LanguageModelInfo,
						workspaceState: undefined as any, // Provided by Storage service
						globalState: undefined as any, // Provided by Storage service
						extensionRuntime: ExtensionRuntime.Node,
						messagePassingProtocol: undefined,
					} as ExtensionContext;

					const ActivationFunction = Module.activate as
						| Function
						| undefined;
					const Exports = ActivationFunction
						? yield* Effect.tryPromise({
								try: () =>
									Promise.resolve(
										ActivationFunction.apply(globalThis, [
											Context,
										]),
									),
								catch: (CaughtError) =>
									new Error(
										`Activation function for '${Description.identifier.value}' failed: ${CaughtError}`,
									),
							})
						: Module;

					const Activated: ActivatedExtension = {
						Id: Description.identifier,
						Module,
						Exports,
						Subscriptions: Context.subscriptions,
						ActivationFailed: false,
						ActivationError: null,
					};
					yield* Ref.update(ActivatedExtensionsRef, (Map) =>
						Map.set(Description.identifier.value, Activated),
					);
					yield* Logger.Info(
						`Successfully activated extension '${Description.identifier.value}'.`,
					);
					yield* IPC.SendNotification("$onDidActivateExtension", [
						Description.identifier,
						[],
						[],
					]);
				});

			const OnDidActivateExtension = (
				_callback: (extension: IExtensionDescription) => void,
			) =>
				Effect.sync(() => {
					// Stub to satisfy interface. A real impl would use PubSub.
				});

			return {
				ActivateById: (Id, Reason) =>
					Effect.gen(function* () {
						const IsActivated = yield* Ref.get(
							ActivatedExtensionsRef,
						).pipe(Effect.map((Map) => Map.has(Id.value)));
						if (IsActivated) return;
						const MaybeDescription =
							ExtensionRegistry.getExtensionDescription(Id);
						if (!MaybeDescription)
							return yield* Logger.Warn(
								`Cannot activate unknown extension '${Id.value}'.`,
							);
						if (!MaybeDescription.main)
							return yield* Logger.Warn(
								`Cannot activate extension '${Id.value}' because it has no 'main' entry point.`,
							);
						yield* DoActivate(MaybeDescription, Reason);
					}).pipe(
						Effect.catchAll((error) =>
							Effect.gen(function* () {
								const ErrorToReport =
									error instanceof globalThis.Error
										? error
										: new Error(String(error));
								const Activated: ActivatedExtension = {
									Id,
									Module: {},
									Exports: undefined,
									Subscriptions: [],
									ActivationFailed: true,
									ActivationError: ErrorToReport,
								};
								yield* Ref.update(
									ActivatedExtensionsRef,
									(Map) => Map.set(Id.value, Activated),
								);
								yield* IPC.SendNotification(
									"$onExtensionActivationError",
									[
										Id,
										{
											name: ErrorToReport.name,
											message: ErrorToReport.message,
											stack: ErrorToReport.stack,
										},
									],
								).pipe(
									Effect.catchAllCause((cause) =>
										Logger.Warn(
											"Failed to send activation error notification",
											cause,
										),
									),
								);
								yield* Effect.sync(() =>
									Telemetry.onExtensionError(
										Id,
										ErrorToReport,
									),
								);
							}).pipe(Effect.asVoid),
						),
					),

				GetExtensionDescription: (Id) =>
					Effect.succeed(
						ExtensionRegistry.getExtensionDescription(Id),
					),

				GetExtensionExports: (Id) =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.flatMap((Map) => {
							const Ext = Map.get(Id.value);
							if (Ext?.ActivationFailed && Ext.ActivationError)
								return Effect.fail(Ext.ActivationError);
							return Effect.succeed(Ext?.Exports);
						}),
					),

				IsActivated: (Id) =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.map((Map) => Map.has(Id.value)),
					),

				DeactivateAll: () =>
					Ref.get(ActivatedExtensionsRef).pipe(
						Effect.flatMap((Map) =>
							Effect.forEach([...Map.values()], Deactivate, {
								concurrency: "unbounded",
								discard: true,
							}),
						),
						Effect.andThen(
							Ref.set(ActivatedExtensionsRef, new Map()),
						),
					),

				OnDidActivateExtension,
			};
		}),
	},
) {}
