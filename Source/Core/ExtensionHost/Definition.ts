/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
 */

import { Effect, Ref } from "effect";
import { URI } from "vs/base/common/uri.js";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
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
	// --- Service Dependencies ---
	const Log = yield* LogService;
	const IPC = yield* IPCService;
	const InitData = yield* InitDataService;
	const Telemetry = yield* TelemetryService;

	// --- State Management ---
	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ImplicitActivationEvents,
		InitData.extensions,
	);
	const ActivatedExtensions = yield* Ref.make(
		new Map<string, ActivatedExtension>(),
	);

	/**
	 * Deactivates a single extension, running its cleanup logic.
	 */
	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* () {
			// Step 1: Log the deactivation event.
			yield* Log.Info(
				`Deactivating extension '${Extension.ID.value}'...`,
			);

			// Step 2: Dispose of all subscriptions associated with the extension.
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

			// Step 3: Call the extension's `deactivate` function, if it exists.
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

	/**
	 * Activates a single extension, loading its module and running its `activate` function.
	 */
	const DoActivateExtension = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* () {
			// Step 1: Log the activation attempt.
			yield* Log.Info(
				`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
			);

			// Step 2: Dynamically import the extension module.
			const Module = yield* Effect.tryPromise({
				try: () =>
					import(URI.revive(Description.extensionLocation).fsPath),
				catch: (CaughtError) =>
					new Error(
						`Failed to load module for '${Description.identifier.value}': ${CaughtError}`,
					),
			});

			// Step 3: Create the extension context object passed to the activate function.
			const Context: ExtensionContext = {
				subscriptions: [],
				extensionPath: Description.extensionLocation.fsPath,
				extensionUri: URI.revive(Description.extensionLocation),
				storageUri: URI.parse("invalid:/storage"),
				globalStorageUri: URI.parse("invalid:/globalstorage"),
				logUri: URI.parse("invalid:/log"),
				extensionMode: 1, // Production
				secrets: undefined as any,
				storagePath: "",
				globalStoragePath: "",
				logPath: "",
				extension: undefined as any,
				environmentVariableCollection: undefined as any,
				asAbsolutePath: (path) => path,
				extensionRuntime: 2, // NodeJS
				messagePassingProtocol: undefined as any,
				workspaceState: undefined as any,
				globalState: undefined as any,
				languageModelAccessInformation: undefined as any,
			};

			// Step 4: Execute the extension's activate function if it exists.
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

			// Step 5: Store the successfully activated extension's state.
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

			// Step 6: Log and notify the host of successful activation.
			yield* Log.Info(
				`Successfully activated extension '${Description.identifier.value}'.`,
			);

			yield* IPC.SendNotification("$onDidActivateExtension", [
				Description.identifier,
			]);
		}).pipe(
			// This catch block handles any failure during the activation process.
			Effect.catchAll((ErrorValue) =>
				Effect.gen(function* () {
					// Step 1: Record the activation failure state.
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

					// Step 2: Notify the host and telemetry services of the error.
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

					yield* Telemetry.onExtensionError(
						Description.identifier,
						ErrorValue,
					);
				}),
			),
		);

	/**
	 * The public method to activate an extension by its identifier.
	 */
	const ActivateById = (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	): Effect.Effect<void, Error> =>
		Effect.gen(function* () {
			// Step 1: Check if the extension is already activated.
			const IsAlreadyActivated = yield* Ref.get(ActivatedExtensions).pipe(
				Effect.map((Map) => Map.has(ID.value)),
			);
			if (IsAlreadyActivated) {
				return;
			}

			// Step 2: Get the extension description from the registry.
			const MaybeDescription =
				ExtensionRegistry.getExtensionDescription(ID);
			if (!MaybeDescription) {
				return yield* Log.Warn(
					`Cannot activate unknown extension '${ID.value}'.`,
				);
			}

			// Step 3: Ensure the extension has a 'main' entry point.
			if (!MaybeDescription.main) {
				return yield* Log.Warn(
					`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
				);
			}

			// Step 4: Proceed with the activation logic.
			yield* DoActivateExtension(MaybeDescription, Reason);
		}).pipe(
			Effect.mapError((ErrorValue) =>
				ErrorValue instanceof globalThis.Error
					? ErrorValue
					: new Error(String(ErrorValue)),
			),
		);

	/**
	 * The live implementation of the ExtensionHost service.
	 */
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
