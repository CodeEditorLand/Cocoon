/**
 * @module RegisterProvider (Debug)
 * @description A generic helper Effect for registering debug-related providers
 * (e.g., `DebugConfigurationProvider`, `DebugAdapterDescriptorFactory`).
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import type IPCService from "../IPC/Service.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a provider. It stores the provider in a
 * local map, notifies the host via IPC, and returns a `Disposable` that will
 * unregister the provider when disposed.
 *
 * @param Registry The `Ref` containing the map of registered providers.
 * @param IPC The IPC service for communicating with the host.
 * @param RPCRegisterMethod The name of the RPC method for registration.
 * @param Data The provider data to register.
 * @returns An `Effect` that resolves to a `Disposable`.
 */
const RegisterProvider = <T>(
	Registry: Ref.Ref<Map<number, T>>,
	IPC: IPCService,
	RPCRegisterMethod: string,
	Data: T,
): Effect.Effect<Disposable, never> => {
	return Effect.sync(() => {
		const Handle = ++HandleCounter;
		Effect.runSync(Ref.update(Registry, (Map) => Map.set(Handle, Data)));
		Effect.runFork(
			IPC.SendNotification(RPCRegisterMethod, [
				Handle,
				(Data as any).Type, // Assumes the data object has a 'type' property (e.g., debug type)
			]),
		);

		return new Disposable(() => {
			const CleanupEffect = Ref.update(
				Registry,
				(Map) => (Map.delete(Handle), Map),
			).pipe(
				Effect.flatMap(() => {
					const RPCUnregisterMethod = `$unregister${RPCRegisterMethod.slice(1)}`; // e.g., $register... -> $unregister...
					return IPC.SendNotification(RPCUnregisterMethod, [Handle]);
				}),
			);
			Effect.runFork(CleanupEffect);
		});
	});
};

export default RegisterProvider;
