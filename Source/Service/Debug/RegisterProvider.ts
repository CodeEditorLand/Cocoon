/**
 * @module RegisterProvider (Debug)
 * @description A generic helper Effect for registering debug-related providers
 * (e.g., `DebugConfigurationProvider`, `DebugAdapterDescriptorFactory`).
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import IPCService from "../IPC/Service.js";
import DebugProviderRegistrationError from "./Error/DebugProviderRegistrationError.js";

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
const RegisterProviderEffect = <T>(
	Registry: Ref.Ref<Map<number, T>>,

	Data: T,
): Effect.Effect<Disposable, DebugProviderRegistrationError, IPCService> => {
	return Effect.gen(function* (G) {
		const IPC = yield* G(IPCService);

		const Handle = ++HandleCounter;

		yield* G(Ref.update(Registry, (Map) => Map.set(Handle, Data)));

		yield* G(
			IPC.SendNotification("$registerDebugConfigurationProvider", [
				Handle,

				// The data object is known to have a 'type' property.
				(Data as any).Type,
			]).pipe(
				Effect.mapError(
					(cause) =>
						new DebugProviderRegistrationError({
							DebugType: (Data as any).Type,

							cause,
						}),
				),
			),
		);

		// Define the cleanup logic as a separate Effect.
		// It will close over the `IPC` instance from the parent scope.
		const CleanupEffect = Effect.gen(function* (G) {
			yield* G(Ref.update(Registry, (Map) => (Map.delete(Handle), Map)));

			yield* G(
				IPC.SendNotification("$unregisterDebugConfigurationProvider", [
					Handle,
				]),
			);
		});

		// The Disposable simply forks the cleanup effect when called.
		return new Disposable(() => {
			Effect.runFork(CleanupEffect);
		});
	});
};

export default RegisterProviderEffect;
