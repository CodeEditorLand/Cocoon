/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { ExtensionActivationReason } from "vs/workbench/api/common/extHostExtensionActivator.js";
import { ExtensionDescriptionRegistry } from "vs/workbenchservices/extensions/common/extensionDescriptionRegistry.js";

import { InitData } from "../../Service/InitData.js";
import { IPC } from "../../Service/IPC.js";
import { Log } from "../../Service/Log.js";
import { APIFactory } from "../APIFactory.js";
import type { Interface } from "./Service.js";
import type { ActivatedExtension } from "./State.js";

export const Definition = Effect.gen(function* (_) {
	const LogService = yield* _(Log.Tag);
	const IPCService = yield* _(IPC.Tag);
	const APIFactoryService = yield* _(APIFactory.Tag);
	const InitDataService = yield* _(InitData.Tag);

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitDataService.extensions,
	);
	const ActivatedExtensions = yield* _(
		Ref.make(new Map<string, ActivatedExtension>()),
	);

	const IsActivated = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.map((map) => map.has(ID.value)),
			Effect.runSync, // Safe because it's a synchronous Ref read
		);

	const GetExtensionExports = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.map((map) => map.get(ID.value)?.Exports),
			Effect.runSync,
		);

	const GetExtensionDescription = (
		ID:
			| string
			| import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) => Effect.succeed(ExtensionRegistry.getExtensionDescription(ID));

	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* (_) {
			yield* _(
				LogService.Info(
					`Deactivating extension '${Extension.ID.value}'...`,
				),
			);

			for (const Subscription of Extension.Subscriptions) {
				yield* _(
					Effect.try(() => Subscription.dispose()).pipe(
						Effect.catchAll((e) =>
							LogService.Warn(
								`Error during subscription disposal for ${Extension.ID.value}`,
								e,
							),
						),
					),
				);
			}

			const DeactivateFunction = Extension.Module.deactivate;
			if (typeof DeactivateFunction === "function") {
				yield* _(
					Effect.tryPromise({
						try: () => DeactivateFunction(),
						catch: (e) =>
							new Error(
								`Deactivation function for '${Extension.ID.value}' failed: ${e}`,
							),
					}).pipe(
						Effect.catchAll((e) => LogService.Error(e.message)),
					),
				);
			}
		});

	const DoActivateExtension = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* (_) {
			yield* _(
				LogService.Info(
					`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
				),
			);

			const Module = yield* _(
				Effect.tryPromise({
					try: () => import(Description.main!), // main can be undefined, a real impl must guard
					catch: (e) =>
						new Error(
							`Failed to load module for '${Description.identifier.value}': ${e}`,
						),
				}),
			);

			const ExtensionAPI = APIFactoryService.CreateAPI(Description);
			const Context: import("vscode").ExtensionContext = {
				subscriptions: [],
				extensionPath: Description.extensionLocation.fsPath,
				extensionUri: Description.extensionLocation as any, // Cast from internal URI
				storageUri: undefined, // Provided by StoragePath service
				globalStorageUri: undefined, // Provided by StoragePath service
				logUri: undefined, // Provided by Log service
				extensionMode: 1, // Production
				// ... construct full context
			} as any;

			const ActivationFunction = Module.activate as Function | undefined;
			const Exports = ActivationFunction
				? yield* _(
						Effect.tryPromise({
							try: () =>
								ActivationFunction.apply(globalThis, [Context]), // VS Code API is passed implicitly now
							catch: (e) =>
								new Error(
									`Activation function for '${Description.identifier.value}' failed: ${e}`,
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

			yield* _(
				Ref.update(ActivatedExtensions, (map) =>
					map.set(Description.identifier.value, Activated),
				),
			);
			yield* _(
				LogService.Info(
					`Successfully activated extension '${Description.identifier.value}'.`,
				),
			);
			yield* _(
				IPCService.SendNotification("$onDidActivateExtension", [
					Description.identifier,
					// DTOs would be converted here
				]),
			);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* (_) {
					const Activated: ActivatedExtension = {
						ID: Description.identifier,
						Module: {},
						Exports: undefined,
						Subscriptions: [],
						ActivationFailed: true,
						ActivationError: error,
					};
					yield* _(
						Ref.update(ActivatedExtensions, (map) =>
							map.set(Description.identifier.value, Activated),
						),
					);
					yield* _(
						IPCService.SendNotification(
							"$onExtensionActivationError",
							[
								Description.identifier,
								{
									name: error.name,
									message: error.message,
									stack: error.stack,
								},
							],
						),
					);
				}),
			),
		);

	const ActivateById = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* (_) {
			if (IsActivated(ID)) return;
			const Description = yield* _(GetExtensionDescription(ID));
			if (!Description) {
				yield* _(
					LogService.Warn(
						`Cannot activate unknown extension '${ID.value}'.`,
					),
				);
				return;
			}
			if (!Description.main) {
				yield* _(
					LogService.Warn(
						`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
					),
				);
				return;
			}
			yield* _(DoActivateExtension(Description, Reason));
		});

	const DeactivateAll = () =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.flatMap((map) =>
				Effect.forEach([...map.values()], Deactivate, {
					concurrency: "unbounded",
					discard: true,
				}),
			),
			Effect.flatMap(() => Ref.set(ActivatedExtensions, new Map())),
			Effect.asUnit,
		);

	const ServiceImplementation: Interface = {
		ActivateById,
		GetExtensionDescription,
		GetExtensionExports,
		IsActivated,
		DeactivateAll,
	};

	return ServiceImplementation;
});
