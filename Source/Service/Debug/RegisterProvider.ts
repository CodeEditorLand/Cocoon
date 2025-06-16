/*
 * File: Cocoon/Source/Service/Debug/RegisterProvider.ts
 * Responsibility:
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../IPC/Service.js, ./Error.js, effect, vscode
 */

/**
 * @module RegisterProvider (Debug)
 * @description A generic helper Effect for registering debug-related providers
 * (e.g., `DebugConfigurationProvider`, `DebugAdapterDescriptorFactory`).
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import { Live as IPCLive } from "../IPC.js";
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
			// Provide a dummy IPC layer for the detached effect.
			// This is a temporary solution for the detached Effect.
			const TempIPCLayer = IPCLive({
				MountainAddress: "",
				CocoonAddress: "",
			});
			Effect.runFork(Effect.provide(CleanupEffect, TempIPCLayer));
		});
	});
};

export default RegisterProvider;
