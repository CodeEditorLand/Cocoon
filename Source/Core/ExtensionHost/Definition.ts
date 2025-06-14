/**
 * @module Definition (ExtensionHost)
 * @description The live implementation of the ExtensionHost service, which manages
 * the lifecycle of all extensions.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";

import { InitData } from "../../Service/InitData.js";
import { IPC } from "../../Service/IPC.js";
import { Log } from "../../Service/Log.js";
import {
	ActivationKind,
	type ExtensionActivationReason,
} from "../../Type/ExtHostTypes.js";
// Assuming local type definition
import { APIFactory } from "../APIFactory.js";
import type { Interface } from "./Service.js";
import type { ActivatedExtension } from "./State.js";

export const Definition = Effect.gen(function* () {
	const LogService = yield* Log.Tag;
	const IPCService = yield* IPC.Tag;
	const APIFactoryService = yield* APIFactory.Tag;
	const InitDataService = yield* InitData.Tag;

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitDataService.extensions,
	);
	const ActivatedExtensions = yield* Ref.make(
		new Map<string, ActivatedExtension>(),
	);

	const IsActivated = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Effect.runSync(
			Ref.get(ActivatedExtensions).pipe(
				Effect.map((map) => map.has(ID.value)),
			),
		);

	const GetExtensionExports = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) =>
		Effect.runSync(
			Ref.get(ActivatedExtensions).pipe(
				Effect.map((map) => map.get(ID.value)?.Exports),
			),
		);

	const GetExtensionDescription = (
		ID:
			| string
			| import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
	) => Effect.succeed(ExtensionRegistry.getExtensionDescription(ID));

	const Deactivate = (Extension: ActivatedExtension) =>
		Effect.gen(function* () {
			yield* LogService.Info(
				`Deactivating extension '${Extension.ID.value}'...`,
			);

			for (const Subscription of Extension.Subscriptions) {
				yield* Effect.try(() => Subscription.dispose()).pipe(
					Effect.catchAll((e) =>
						LogService.Warn(
							`Error during subscription disposal for ${Extension.ID.value}`,
							e,
						),
					),
				);
			}

			const DeactivateFunction = Extension.Module.deactivate;
			if (typeof DeactivateFunction === "function") {
				yield* Effect.tryPromise({
					try: () => DeactivateFunction(),
					catch: (e) =>
						new Error(
							`Deactivation function for '${Extension.ID.value}' failed: ${e}`,
						),
				}).pipe(Effect.catchAll((e) => LogService.Error(e.message)));
			}
		});

	const DoActivateExtension = (
		Description: IExtensionDescription,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* () {
			yield* LogService.Info(
				`Activating extension '${Description.identifier.value}' (Reason: ${Reason.activationEvent}).`,
			);

			const Module = yield* Effect.tryPromise({
				try: () => import(Description.main!),
				catch: (e) =>
					new Error(
						`Failed to load module for '${Description.identifier.value}': ${e}`,
					),
			});

			const ExtensionAPI = APIFactoryService.CreateAPI(Description);
			const Context: import("vscode").ExtensionContext = {
				subscriptions: [],
				extensionPath: Description.extensionLocation.fsPath,
				extensionUri: Description.extensionLocation as any,
				storageUri: undefined,
				globalStorageUri: undefined,
				logUri: undefined,
				extensionMode: 1, // Production
			} as any;

			const ActivationFunction = Module.activate as Function | undefined;
			const Exports = ActivationFunction
				? yield* Effect.tryPromise({
						try: () =>
							ActivationFunction.apply(globalThis, [Context]),
						catch: (e) =>
							new Error(
								`Activation function for '${Description.identifier.value}' failed: ${e}`,
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

			yield* Ref.update(ActivatedExtensions, (map) =>
				map.set(Description.identifier.value, Activated),
			);
			yield* LogService.Info(
				`Successfully activated extension '${Description.identifier.value}'.`,
			);
			yield* IPCService.SendNotification("$onDidActivateExtension", [
				Description.identifier,
			]);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					const Activated: ActivatedExtension = {
						ID: Description.identifier,
						Module: {},
						Exports: undefined,
						Subscriptions: [],
						ActivationFailed: true,
						ActivationError:
							error instanceof Error
								? error
								: new Error(String(error)),
					};
					yield* Ref.update(ActivatedExtensions, (map) =>
						map.set(Description.identifier.value, Activated),
					);
					yield* IPCService.SendNotification(
						"$onExtensionActivationError",
						[
							Description.identifier,
							{
								name:
									error instanceof Error
										? error.name
										: "UnknownError",
								message:
									error instanceof Error
										? error.message
										: String(error),
								stack:
									error instanceof Error
										? error.stack
										: undefined,
							},
						],
					);
				}),
			),
		);

	const ActivateById = (
		ID: import("vs/platform/extensions/common/extensions").ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) =>
		Effect.gen(function* () {
			if (yield* IsActivated(ID)) return;
			const Description = yield* GetExtensionDescription(ID);
			if (!Description) {
				yield* LogService.Warn(
					`Cannot activate unknown extension '${ID.value}'.`,
				);
				return;
			}
			if (!Description.main) {
				yield* LogService.Warn(
					`Cannot activate extension '${ID.value}' because it has no 'main' entry point.`,
				);
				return;
			}
			yield* DoActivateExtension(Description, Reason);
		}).pipe(
			Effect.catchAll((error) =>
				LogService.Error("Activation failed", error),
			),
		);

	const DeactivateAll = () =>
		Ref.get(ActivatedExtensions).pipe(
			Effect.flatMap((map) =>
				Effect.forEach([...map.values()], Deactivate, {
					concurrency: "unbounded",
					discard: true,
				}),
			),
			Effect.flatMap(() => Ref.set(ActivatedExtensions, new Map())),
			Effect.asVoid,
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
