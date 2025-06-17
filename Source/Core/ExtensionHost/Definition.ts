/*
 * File: Cocoon/Source/Core/ExtensionHost/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../../Service/IPC/Service.js, ../../Service/InitData/Service.js, ../../Service/Log/Service.js, ../../Service/Telemetry/Service.js, ./Service.js, ./State.js, effect, vs/base/common/event.js, vs/base/common/uri.js, vs/platform/extensionManagement/common/implicitActivationEvents.js, vs/workbench/api/common/extHostTypes.js, vscode
 */

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
 * @export
 * @default
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;
	const IPC = yield* IPCService;
	const InitData = yield* InitDataService;
	const Telemetry = yield* TelemetryService;

	const ActivatedExtensions = yield* Ref.make(
		new Map<string, ActivatedExtension>(),
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
	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* () {
			yield* Log.Info(
				`Deactivating extension '${Extension.ID.value}'...`,
			);
			for (const Subscription of Extension.Subscriptions) {
				yield* Effect.try({
					try: () => Subscription.dispose(),
					catch: (CaughtError) =>
						Log.Warn(
							`Error during subscription disposal for ${Extension.ID.value}`,
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
							`Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`,
						),
				}).pipe(Effect.catchAll((error) => Log.Error(error.message)));
			}
		}).pipe(
			Effect.catchAllCause((cause) =>
				Log.Warn("Deactivation error occurred", cause),
			),
		);

	const DoActivateExtension = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* () {
			yield* Log.Info(
				`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
			);
			const Module = yield* Effect.tryPromise({
				try: () =>
					import(URI.revive(Description.extensionLocation).fsPath),
				catch: (CaughtError) =>
					new Error(
						`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
					),
			});

			const languageModelAccessInformation: LanguageModelAccessInformation =
				{
					onDidChange: new Emitter<void>().event,
					canSendRequest: (_chat) => false,
				};

			const Context: ExtensionContext = {
				subscriptions: [],
				extensionPath: URI.revive(Description.extensionLocation).fsPath,
				extensionUri: URI.revive(Description.extensionLocation),
				storageUri: URI.parse("file:///extension-storage"),
				globalStorageUri: URI.parse("file:///global-storage"),
				logUri: URI.parse("file:///logs"),
				extensionMode: 1, // Production
				secrets: undefined as any,
				storagePath: "/extension-storage",
				globalStoragePath: "/global-storage",
				logPath: "/logs",
				extension: undefined as any,
				environmentVariableCollection: undefined as any,
				asAbsolutePath: (path) => path,
				languageModelAccessInformation: languageModelAccessInformation,
				workspaceState: undefined as any,
				globalState: undefined as any,
				extensionRuntime: ExtensionRuntime.Node,
				messagePassingProtocol: undefined,
			};

			const ActivationFunction = Module.activate as Function | undefined;
			const Exports = ActivationFunction
				? yield* Effect.tryPromise({
						try: () =>
							Promise.resolve(
								ActivationFunction.apply(globalThis, [Context]),
							),
						catch: (CaughtError) =>
							new Error(
								`Activation function for '${Description.identifier.value}' failed: ${CaughtError}`,
							),
					})
				: Module;

			const Activated: ActivatedExtension = {
				ID: Description.identifier,
				Module,
				Exports,
				Subscriptions: Context.subscriptions,
				ActivationFailed: false,
				ActivationError: null,
			};

			yield* Ref.update(ActivatedExtensions, (Map) =>
				Map.set(Description.identifier.value, Activated),
			);
			yield* Log.Info(
				`Successfully activated extension '${Description.identifier.value}'.`,
			);
			yield* IPC.SendNotification("$onDidActivateExtension", [
				Description.identifier,
				[], // activationTimings
				[], // TZe activation timing
			]);
		});

	const ActivateById = (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	): Effect.Effect<void, never, never> => {
		const activationLogic = Effect.gen(function* () {
			const IsActivated = yield* Ref.get(ActivatedExtensions).pipe(
				Effect.map((Map) => Map.has(ID.value)),
			);
			if (IsActivated) {
				return;
			}
			const MaybeDescription =
				ExtensionRegistry.getExtensionDescription(ID);
			if (!MaybeDescription) {
				return yield* Log.Warn(
					`Cannot activate unknown extension '${ID.value}'.`,
				);
			}
			if (!MaybeDescription.main) {
				return yield* Log.Warn(
					`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
				);
			}
			// DoActivateExtension can fail, so we must yield it within this block
			// to allow the outer catchAll to handle its errors.
			yield* DoActivateExtension(MaybeDescription, Reason);
		});

		return activationLogic.pipe(
			Effect.catchAll((error) => {
				const errorHandlingEffect = Effect.gen(function* () {
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
					yield* Ref.update(ActivatedExtensions, (Map) =>
						Map.set(ID.value, Activated),
					);
					yield* IPC.SendNotification("$onExtensionActivationError", [
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
					);

					yield* Effect.sync(() =>
						Telemetry.onExtensionError(ID, ErrorToReport),
					);
				});

				return errorHandlingEffect.pipe(Effect.asVoid);
			}),
		);
	};

	const ServiceImplementation: Service["Type"] = {
		ActivateById,
		GetExtensionDescription: (ID) =>
			Effect.succeed(ExtensionRegistry.getExtensionDescription(ID)),
		GetExtensionExports: (ID) =>
			Ref.get(ActivatedExtensions).pipe(
				Effect.map((Map) => Map.get(ID.value)?.Exports),
			),
		IsActivated: (ID) =>
			Ref.get(ActivatedExtensions).pipe(
				Effect.map((Map) => Map.has(ID.value)),
			),
		DeactivateAll: () =>
			Ref.get(ActivatedExtensions).pipe(
				Effect.flatMap((Map) =>
					// The `Deactivate` effect now handles its own errors internally,
					// so `forEach` will not fail.
					Effect.forEach([...Map.values()], Deactivate, {
						concurrency: "unbounded",
						discard: true,
					}),
				),
				Effect.andThen(Ref.set(ActivatedExtensions, new Map())),
			),
	};

	return ServiceImplementation;
});
