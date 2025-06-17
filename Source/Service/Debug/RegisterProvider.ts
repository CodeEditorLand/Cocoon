/*
 * File: Cocoon/Source/Service/Debug/RegisterProvider.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../IPC/Service.js, ./Error.js, effect, vscode
 */

/**
 * @module RegisterProvider (Debug)
 * @description A generic helper Effect for registering debug-related providers
 * (e.g., `DebugConfigurationProvider`, `DebugAdapterDescriptorFactory`).
 */

import { Effect, Layer, Ref } from "effect";
import { Disposable } from "vscode";

import IPCService from "../IPC/Service.js";
import { DebugProviderRegistrationError } from "./Error.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a provider. It stores the provider in a
 * local map, notifies the host via IPC, and returns a `Disposable` that will
 * unregister the provider when disposed.
 *
 * @param Registry The `Ref` containing the map of registered providers.
 * @param Data The provider data to register.
 * @returns An `Effect` that resolves to a `Disposable`.
 */
const RegisterProvider = <T>(
	Registry: Ref.Ref<Map<number, T>>,
	Data: T,
): Effect.Effect<Disposable, DebugProviderRegistrationError, IPCService> => {
	return Effect.gen(function* () {
		const IPC = yield* IPCService;
		const Handle = ++HandleCounter;
		yield* Ref.update(Registry, (Map) => Map.set(Handle, Data));
		yield* IPC.SendNotification("$registerDebugConfigurationProvider", [
			Handle,
			(Data as any).Type, // The data object is known to have a 'type' property.
		]).pipe(
			Effect.mapError(
				(cause) =>
					new DebugProviderRegistrationError({
						DebugType: (Data as any).Type,
						cause,
					}),
			),
		);

		return new Disposable(() => {
			const CleanupEffect = Effect.gen(function* () {
				const IPC_Handle = yield* IPCService;
				yield* Ref.update(Registry, (Map) => (Map.delete(Handle), Map));
				const RPCUnregisterMethod =
					"$unregisterDebugConfigurationProvider";
				yield* IPC_Handle.SendNotification(RPCUnregisterMethod, [
					Handle,
				]);
			});
			// When a disposable is created, the effect inside it runs detached from the main scope.
			// It needs its own runtime and layer. We can't get the IPCConfiguration here easily,
			// so we fork the effect and ignore failures for this cleanup logic.
			// A more robust solution might involve a dedicated "cleanup" service.
			Effect.runFork(
				CleanupEffect.pipe(
					Effect.provide(Layer.succeed(IPCService, IPC)),
				),
			);
		});
	});
};

export default RegisterProvider;
