/**
 * @module RegisterProvider (Debug)
 * @description A generic helper Effect for registering debug-related providers
 * (e.g., `DebugConfigurationProvider`, `DebugAdapterDescriptorFactory`).
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import type { IPC } from "../IPC.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a provider. It stores the provider in a
 * local map, notifies the host via IPC, and returns a `Disposable` that will
 * unregister the provider when disposed.
 *
 * @param Registry The `Ref` containing the map of registered providers.
 * @param IPCService The IPC service for communicating with the host.
 * @param RPCRegisterMethod The name of the RPC method for registration.
 * @param Data The provider data to register.
 * @returns An `Effect` that resolves to a `Disposable`.
 */
export function RegisterProvider<T>(
	Registry: Ref.Ref<Map<number, T>>,
	IPCService: IPC.Interface,
	RPCRegisterMethod: string,
	Data: T,
): Effect.Effect<Disposable> {
	return Effect.sync(() => {
		const Handle = ++HandleCounter;
		Ref.update(Registry, (map) => map.set(Handle, Data)).pipe(
			Effect.runSync,
		);
		IPCService.SendNotification(RPCRegisterMethod, [
			Handle,
			(Data as any).type, // Assumes the data object has a 'type' property (e.g., debug type)
		]).pipe(Effect.runFork);

		return new Disposable(() => {
			Ref.update(Registry, (map) => (map.delete(Handle), map)).pipe(
				Effect.runSync,
			);
			const RPCUnregisterMethod = `$unregister${RPCRegisterMethod.slice(1)}`; // e.g., $register... -> $unregister...
			IPCService.SendNotification(RPCUnregisterMethod, [Handle]).pipe(
				Effect.runFork,
			);
		});
	});
}
