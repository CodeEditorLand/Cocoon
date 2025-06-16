// Cocoon/Source/Core/ExtensionHost/Definition.ts

/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
 */

import { Effect, Layer, Ref } from "effect"; // FIX: Import Layer
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
	// FIX: This type is not exported, but we need the shape. Let's assume it's `all`
	type IExtensionDescriptionSnapshot,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { ExtensionContext } from "vscode";

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

	// FIX: The registry expects an array of descriptions, not the snapshot object.
	// Based on VS Code's structure, this is likely on a property like `all`.
	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ActivationEventsReader,
		(InitData.extensions ).allExtensions,
	);

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
				try: () =>
					import(URI.revive(Description.extensionLocation).fsPath),
				catch: (CaughtError) =>
					new Error(
						`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
					),
			});

			const Context: ExtensionContext = {
				subscriptions: [],
				extensionPath: URI.revive(Description.extensionLocation).fsPath,
				extensionUri: URI.revive(Description.extensionLocation),
				storageUri: URI.parse("file:///extension-storage"),
				globalStorageUri: URI.parse("file:///global-storage"),
				logUri: URI.parse("file:///logs"),
				extensionMode: 1, // Production
				secrets: undefined ,
				storagePath: "/extension-storage",
				globalStoragePath: "/global-storage",
				logPath: "/logs",
				extension: undefined ,
				environmentVariableCollection: undefined ,
				asAbsolutePath: (path) => path,
				languageModelAccessInformation: undefined ,
				workspaceState: undefined ,
				globalState: undefined ,
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
			// FIX: VS Code expects an array for activationTimings
			yield* IPC.SendNotification("$onDidActivateExtension", [
				Description.identifier,
				[],
			]);
		}).pipe(
			Effect.catchAll((ErrorValue) =>
				Effect.gen(function* () {
					const ErrorToReport =
						ErrorValue instanceof globalThis.Error
							? ErrorValue
							: new Error(String(ErrorValue));
					const Activated: ActivatedExtension = {
						ID: Description.identifier,
						Module: {},
						Exports: undefined,
						Subscriptions: [],
						ActivationFailed: true,
						ActivationError: ErrorToReport,
					};
					yield* Ref.update(ActivatedExtensions, (Map) =>
						Map.set(Description.identifier.value, Activated),
					);
					yield* IPC.SendNotification("$onExtensionActivationError", [
						Description.identifier,
						{
							name: ErrorToReport.name,
							message: ErrorToReport.message,
							stack: ErrorToReport.stack,
						},
					]);
					yield* Telemetry.onExtensionError(
						Description.identifier,
						ErrorToReport,
					);
				}),
			),
		);

	const ActivateById = (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	): Effect.Effect<void, Error> => // FIX: Make signature clean
		Effect.gen(function* () {
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
				Effect.andThen(Ref.set(ActivatedExtensions, new Map())),
			),
	};

	return ServiceImplementation;
});
