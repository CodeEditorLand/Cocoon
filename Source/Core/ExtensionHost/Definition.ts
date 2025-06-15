/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
 */

import { Effect, Ref } from "effect";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { ExtensionContext } from "vscode";

import InitDataService from "../../Service/InitData/Service.js";
import IPCService from "../../Service/IPC/Service.js";
import LogService from "../../Service/Log/Service.js";
import APIFactoryService from "../APIFactory/Service.js";
import type Service from "./Service.js";
import type { ExtensionActivationReason } from "./Service.js";
import type { ActivatedExtension } from "./State.js";

/**
 * An Effect that builds the live implementation of the ExtensionHost service.
 */
export default Effect.gen(function* () {
	const Log = yield* LogService;
	const IPC = yield* IPCService;
	const InitData = yield* InitDataService;

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitData.extensions,
	);
	const ActivatedExtensions = yield* Ref.make(
		new Map<string, ActivatedExtension>(),
	);

	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* () {
			yield* Log.Info(
				`Deactivating extension '${Extension.ID.value}'...`,
			);

			// Deactivate subscriptions
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

			// Call the extension's deactivate function if it exists
			const DeactivateFunction = Extension.Module.deactivate;
			if (typeof DeactivateFunction === "function") {
				yield* Effect.tryPromise({
					try: () => DeactivateFunction(),
					catch: (CaughtError) =>
						new Error(
							`Deactivation function for '${Extension.ID.value}' failed: ${CaughtError}`,
						),
				}).pipe(Effect.catchAll((Error) => Log.Error(Error.message)));
			}
		});

	const DoActivateExtension = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* () {
			yield* Log.Info(
				`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
			);

			const Module = yield* Effect.tryPromise({
				try: () => import(Description.main!),
				catch: (CaughtError) =>
					new Error(
						`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
					),
			});

			// Create the extension context object that is passed to activate()
			const Context: ExtensionContext = {
				subscriptions: [],
				extensionPath: Description.extensionLocation.fsPath,
				extensionUri: Description.extensionLocation,
				storageUri: undefined,
				globalStorageUri: undefined,
				logUri: undefined,
				extensionMode: 1, // Production
				secrets: undefined as any,
				storagePath: undefined,
				globalStoragePath: undefined,
				logPath: undefined,
				extension: undefined as any, // This will be set later
				environmentVariableCollection: undefined as any,
				asAbsolutePath: (path) => path,
			};

			const ActivationFunction = Module.activate as Function | undefined;
			const Exports = ActivationFunction
				? yield* Effect.tryPromise({
						try: () =>
							ActivationFunction.apply(globalThis, [Context]),
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
			]);
		}).pipe(
			// This catch block handles failures during the activation process
			Effect.catchAll((ErrorValue) =>
				Effect.gen(function* () {
					const Activated: ActivatedExtension = {
						ID: Description.identifier,
						Module: {},
						Exports: undefined,
						Subscriptions: [],
						ActivationFailed: true,
						ActivationError:
							ErrorValue instanceof globalThis.Error
								? ErrorValue
								: new Error(String(ErrorValue)),
					};

					yield* Ref.update(ActivatedExtensions, (Map) =>
						Map.set(Description.identifier.value, Activated),
					);

					yield* IPC.SendNotification("$onExtensionActivationError", [
						Description.identifier,
						{
							name:
								ErrorValue instanceof globalThis.Error
									? ErrorValue.name
									: "UnknownError",
							message:
								ErrorValue instanceof globalThis.Error
									? ErrorValue.message
									: String(ErrorValue),
							stack:
								ErrorValue instanceof globalThis.Error
									? ErrorValue.stack
									: undefined,
						},
					]);
				}),
			),
		);

	const ActivateById = (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	): Effect.Effect<void, Error> =>
		Effect.gen(function* () {
			const IsAlreadyActivated = yield* Ref.get(ActivatedExtensions).pipe(
				Effect.map((Map) => Map.has(ID.value)),
			);
			if (IsAlreadyActivated) return;

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
			yield* DoActivateExtension(MaybeDescription, Reason);
		}).pipe(
			Effect.mapError((ErrorValue) =>
				ErrorValue instanceof globalThis.Error
					? ErrorValue
					: new Error(String(ErrorValue)),
			),
		);

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
					Effect.forEach([...Map.values()], Deactivate, {
						concurrency: "unbounded",
						discard: true,
					}),
				),
				Effect.flatMap(() => Ref.set(ActivatedExtensions, new Map())),
				Effect.asVoid,
			),
	};

	return ServiceImplementation;
});
