/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
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

import InitDataService from "../../Service/InitData/Service.js";
import IPCService from "../../Service/IPC/Service.js";
import LogService from "../../Service/Log/Service.js";
import TelemetryService from "../../Service/Telemetry/Service.js";
import type Service from "./Service.js";
import type { ExtensionActivationReason } from "./Service.js";
import type { ActivatedExtension } from "./State.js";

/**
 * An Effect that builds the live implementation of the ExtensionHost service.
 */
export default Effect.gen(function* (G) {
	const Log = yield* G(LogService);
	const IPC = yield* G(IPCService);
	const InitData = yield* G(InitDataService);
	const Telemetry = yield* G(TelemetryService);

	const ActivatedExtensionsRef = yield* G(
		Ref.make(new Map<string, ActivatedExtension>()),
	);

	const ActivationEventsReader: IActivationEventsReader = {
		readActivationEvents: (desc) =>
			ImplicitActivationEvents.readActivationEvents(desc),
	};

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ActivationEventsReader,
		InitData.extensions.allExtensions,
	);

	// This is an internal helper. It should handle its own errors and not let them leak.
	const DeactivateEffect = (Extension: ActivatedExtension) =>
		Effect.gen(function* (G) {
			yield* G(
				Log.Info(`Deactivating extension '${Extension.ID.value}'...`),
			);
			for (const Subscription of Extension.Subscriptions) {
				yield* G(
					Effect.tryPromise({
						try: () => Promise.resolve(Subscription.dispose()),
						catch: (CaughtError) =>
							Log.Warn(
								`Error during subscription disposal for ${Extension.ID.value}`,
								CaughtError,
							),
					}),
				);
			}
			const DeactivateFunction = Extension.Module.deactivate;
			if (typeof DeactivateFunction === "function") {
				yield* G(
					Effect.tryPromise({
						try: () => Promise.resolve(DeactivateFunction()),
						catch: (CaughtError) =>
							new Error(
								`Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`,
							),
					}).pipe(
						Effect.catchAll((error) => Log.Error(error.message)),
					),
				);
			}
		}).pipe(
			Effect.catchAllCause((cause) =>
				Log.Warn("Deactivation error occurred", cause),
			),
		);

	const DoActivateExtensionEffect = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* (G) {
			yield* G(
				Log.Info(
					`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
				),
			);
			const Module = yield* G(
				Effect.tryPromise({
					try: () =>
						import(
							URI.revive(Description.extensionLocation).fsPath
						),
					catch: (CaughtError) =>
						new Error(
							`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
						),
				}),
			);

			const LanguageModelAccessInformation: LanguageModelAccessInformation =
				{
					onDidChange: new Emitter<void>().event,
					canSendRequest: (_chat) => false,
				};

			const Context: ExtensionContext = {
				subscriptions: [],
				extensionPath: URI.revive(Description.extensionLocation).fsPath,
				extensionUri: URI.revive(Description.extensionLocation),
				// Stub
				storageUri: URI.parse("file:///extension-storage"),
				// Stub
				globalStorageUri: URI.parse("file:///global-storage"),
				// Stub
				logUri: URI.parse("file:///logs"),
				// Production
				extensionMode: 1,
				// Provided by SecretStorage service
				secrets: undefined as any,
				// Stub
				storagePath: "/extension-storage",
				// Stub
				globalStoragePath: "/global-storage",
				// Stub
				logPath: "/logs",
				// Lazily set
				extension: undefined as any,
				// Stub
				environmentVariableCollection: undefined as any,
				asAbsolutePath: (path) => path,
				languageModelAccessInformation: LanguageModelAccessInformation,
				// Provided by Storage service
				workspaceState: undefined as any,
				// Provided by Storage service
				globalState: undefined as any,
				extensionRuntime: ExtensionRuntime.Node,
				messagePassingProtocol: undefined,
			};

			const ActivationFunction = Module.activate as Function | undefined;
			const Exports = ActivationFunction
				? yield* G(
						Effect.tryPromise({
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

			yield* G(
				Ref.update(ActivatedExtensionsRef, (Map) =>
					Map.set(Description.identifier.value, Activated),
				),
			);
			yield* G(
				Log.Info(
					`Successfully activated extension '${Description.identifier.value}'.`,
				),
			);
			yield* G(
				IPC.SendNotification("$onDidActivateExtension", [
					Description.identifier,
					// activationTimings
					[],
					// TZe activation timing
					[],
				]),
			);
		});

	const ActivateByIdEffect = (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	): Effect.Effect<void, never> => {
		const ActivationLogic = Effect.gen(function* (G) {
			const IsActivated = yield* G(
				Ref.get(ActivatedExtensionsRef).pipe(
					Effect.map((Map) => Map.has(ID.value)),
				),
			);
			if (IsActivated) {
				return;
			}
			const MaybeDescription =
				ExtensionRegistry.getExtensionDescription(ID);
			if (!MaybeDescription) {
				return yield* G(
					Log.Warn(
						`Cannot activate unknown extension '${ID.value}'.`,
					),
				);
			}
			if (!MaybeDescription.main) {
				return yield* G(
					Log.Warn(
						`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
					),
				);
			}
			yield* G(DoActivateExtensionEffect(MaybeDescription, Reason));
		});

		return ActivationLogic.pipe(
			Effect.catchAll((error) => {
				const ErrorHandlingEffect = Effect.gen(function* (G) {
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
					yield* G(
						Ref.update(ActivatedExtensionsRef, (Map) =>
							Map.set(ID.value, Activated),
						),
					);
					yield* G(
						IPC.SendNotification("$onExtensionActivationError", [
							ID,
							{
								name: ErrorToReport.name,
								message: ErrorToReport.message,
								stack: ErrorToReport.stack,
							},
						]).pipe(
							Effect.catchAllCause((cause) =>
								Log.Warn(
									"Failed to send activation error notification",
									cause,
								),
							),
						),
					);

					yield* G(
						Effect.sync(() =>
							Telemetry.onExtensionError(ID, ErrorToReport),
						),
					);
				});

				return ErrorHandlingEffect.pipe(Effect.asVoid);
			}),
		);
	};

	const ServiceImplementation: Service["Type"] = {
		ActivateById: ActivateByIdEffect,
		GetExtensionDescription: (ID) =>
			Effect.succeed(ExtensionRegistry.getExtensionDescription(ID)),
		GetExtensionExports: (ID) =>
			Ref.get(ActivatedExtensionsRef).pipe(
				Effect.flatMap((Map) => {
					const Ext = Map.get(ID.value);
					if (Ext?.ActivationFailed && Ext.ActivationError) {
						return Effect.fail(Ext.ActivationError);
					}
					return Effect.succeed(Ext?.Exports);
				}),
			),
		IsActivated: (ID) =>
			Ref.get(ActivatedExtensionsRef).pipe(
				Effect.map((Map) => Map.has(ID.value)),
			),
		DeactivateAll: () =>
			Ref.get(ActivatedExtensionsRef).pipe(
				Effect.flatMap((Map) =>
					Effect.forEach([...Map.values()], DeactivateEffect, {
						concurrency: "unbounded",
						discard: true,
					}),
				),
				Effect.andThen(Ref.set(ActivatedExtensionsRef, new Map())),
			),
	};

	return ServiceImplementation;
});
