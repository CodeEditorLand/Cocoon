/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service.
 */

import { Context, Effect, Layer, Ref, Schedule, Stream } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";

import { InitDataService } from "../../Service/InitData.js";
import { IpcProvider } from "../../Service/Ipc.js";
import { LogProvider } from "../../Service/Log.js";
import { ApiFactoryProvider } from "../ApiFactory.js";
import { type Interface } from "./Service.js";
import type { ActivatedExtension } from "./State.js";

export const Definition = Effect.gen(function* (_) {
	const Log = yield* _(LogProvider);
	const Ipc = yield* _(IpcProvider);
	const ApiFactory = yield* _(ApiFactoryProvider);
	const InitData = yield* _(InitDataService);

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitData.extensions,
	);
	const ActivatedExtensions = yield* _(
		Ref.make(new Map<string, ActivatedExtension>()),
	);

	const IsActivated = (
		Id: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.map((map) => map.has(Id.value)),
			Effect.runSync, // Safe because it's a synchronous Ref read
		);

	const GetExtensionExports = (
		Id: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.map((map) => map.get(Id.value)?.Exports),
			Effect.runSync,
		);

	const GetExtensionDescription = (
		Id:
			| string
			| import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) => Effect.succeed(ExtensionRegistry.getExtensionDescription(Id));

	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* (_) {
			yield* _(
				Log.Info(`Deactivating extension '${Extension.Id.value}'...`),
			);

			for (const Subscription of Extension.Subscriptions) {
				yield* _(
					Effect.try(() => Subscription.dispose()).pipe(
						Effect.catchAll(() => Effect.unit),
					),
				);
			}

			const DeactivateFn = Extension.Module.deactivate;
			if (typeof DeactivateFn === "function") {
				yield* _(
					Effect.tryPromise({
						try: () => DeactivateFn(),
						catch: (e) =>
							new Error(
								`Deactivation function for '${Extension.Id.value}' failed: ${e}`,
							),
					}).pipe(Effect.catchAll((e) => Log.Error(e.message))),
				);
			}
		});

	const DoActivateExtension = (
		Description: import("vs/platform/extensions/common/extensions").IExtensionDescription,
		Reason: import("vs/workbench/api/common/extHostExtensionActivator").ExtensionActivationReason,
	) =>
		Effect.gen(function* (_) {
			yield* _(
				Log.Info(
					`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
				),
			);

			const Module = yield* _(
				Effect.tryPromise({
					try: () => import(Description.main),
					catch: (e) =>
						new Error(
							`Failed to load module for '${Description.identifier.value}': ${e}`,
						),
				}),
			);

			const ExtensionApi = ApiFactory.CreateApi(Description);
			const Context: import("vscode").ExtensionContext = {
				subscriptions: [],
				extensionPath: Description.extensionLocation.fsPath,
				extensionUri: Description.extensionLocation,
				// ... construct full context
			} as any;

			const ActivationFn = Module.activate as Function | undefined;
			const Exports = ActivationFn
				? yield* _(
						Effect.tryPromise({
							try: () =>
								ActivationFn.apply(globalThis, [
									Context,
									ExtensionApi,
								]),
							catch: (e) =>
								new Error(
									`Activation function for '${Description.identifier.value}' failed: ${e}`,
								),
						}),
					)
				: Module;

			const Activated: ActivatedExtension = {
				Id: Description.identifier,
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
				Log.Info(
					`Successfully activated extension '${Description.identifier.value}'.`,
				),
			);
			yield* _(
				Ipc.SendNotification("$onDidActivateExtension", [
					Description.identifier,
					Reason.startup,
					Reason.extensionId,
					Reason.activationEvent,
				]),
			);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* (_) {
					const Activated: ActivatedExtension = {
						Id: Description.identifier,
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
						Ipc.SendNotification("$onExtensionActivationError", [
							Description.identifier,
							{
								name: error.name,
								message: error.message,
								stack: error.stack,
							},
						]),
					);
				}),
			),
		);

	const ActivateById = (
		Id: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
		Reason: import("vs/workbench/api/common/extHostExtensionActivator").ExtensionActivationReason,
	) =>
		Effect.gen(function* (_) {
			if (IsActivated(Id)) return;
			const Description = yield* _(GetExtensionDescription(Id));
			if (!Description) {
				yield* _(
					Log.Warn(
						`Cannot activate unknown extension '${Id.value}'.`,
					),
				);
				return;
			}
			yield* _(DoActivateExtension(Description, Reason));
		});

	const DeactivateAll = () =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.flatMap((map) =>
				Effect.forEach([...map.values()], Deactivate),
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
