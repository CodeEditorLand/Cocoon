/**
 * @module RegisterProvider (Debug)
 * @description A generic helper for registering debug-related providers.
 */

import { Effect, Ref } from "effect";
import { Disposable } from "vscode";

import type { Ipc } from "../Ipc.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a provider (Configuration or Adapter Factory).
 * It stores the provider in a local map, notifies the host, and returns a
 * scoped disposable that will unregister the provider on disposal.
 */
export const RegisterProviderEffect = <T>(
	Registry: Ref.Ref<Map<number, T>>,
	IpcService: Ipc.Interface,
	RpcRegisterMethod: string,
	Data: T,
) =>
	Effect.acquireRelease(
		Effect.sync(() => {
			const Handle = ++HandleCounter;
			Ref.update(Registry, (map) => map.set(Handle, Data)).pipe(
				Effect.runSync,
			);
			return Handle;
		}).pipe(
			Effect.flatMap(
				(Handle) =>
					IpcService.SendNotification(RpcRegisterMethod, [
						Handle,
						(Data as any).type,
					]).pipe(Effect.as(Handle)), // Pass the handle through
			),
		),
		(Handle) => {
			const RpcUnregisterMethod = `$unregister${RpcRegisterMethod.substring(9)}`;
			return IpcService.SendNotification(RpcUnregisterMethod, [Handle]);
		},
	).pipe(
		Effect.map(
			(handle) =>
				new Disposable(() => {
					// The release function of acquireRelease handles the RPC call.
					// We just need to remove it from our local map.
					Ref.get(Registry).pipe(
						Effect.map((map) => map.delete(handle)),
						Effect.runSync,
					);
				}),
		),
	);
