/*
 * File: Cocoon/Source/Service/Debug/RegisterProvider.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../IPC.js, ../IPC/Service.js, ./Error.js, effect, vscode
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
			Data.Type, // Assumes the data object has a 'type' property (e.g., debug type)
		]).pipe(
			Effect.mapError(
				(cause) =>
					new DebugProviderRegistrationError({
						DebugType: Data.Type,
						cause,
					}),
			),
		);

		return new Disposable(() => {
			const CleanupEffect = Effect.gen(function* () {
				const IPC = yield* IPCService;
				yield* Ref.update(Registry, (Map) => (Map.delete(Handle), Map));
				const RPCUnregisterMethod =
					"$unregisterDebugConfigurationProvider";
				yield* IPC.SendNotification(RPCUnregisterMethod, [Handle]);
			});
			// Provide a dummy IPC layer for the detached effect.
			Effect.runFork(
				Effect.provide(
					CleanupEffect,
					IPCLive({ MountainAddress: "", CocoonAddress: "" }),
				),
			);
		});
	});
};

export default RegisterProvider;
