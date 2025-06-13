/**
 * @module RegisterProvider (LanguageFeatures)
 * @description A generic helper for registering any language feature provider.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type DocumentSelector } from "vscode";

import * as TypeConverter from "../../TypeConverter/mod.js";
import type { Ipc } from "../Ipc/mod.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a language provider.
 * @returns A scoped `Effect` that resolves to an `IDisposable`. When disposed, it
 *   automatically unregisters the provider from the host.
 */
export const RegisterProvider = <T>(
	Registry: Ref.Ref<Map<number, any>>,
	IpcService: Ipc.Interface,
	ProviderType: string,
	Selector: DocumentSelector,
	Provider: T,
	Extension: IExtensionDescription,
	Options?: any,
) =>
	Effect.acquireRelease(
		Effect.sync(() => {
			const Handle = ++HandleCounter;
			const Entry = {
				type: ProviderType,
				selector: Selector,
				provider: Provider,
				extension: Extension,
			};
			Ref.update(Registry, (map) => map.set(Handle, Entry)).pipe(
				Effect.runSync,
			);
			return Handle;
		}).pipe(
			Effect.flatMap((Handle) =>
				IpcService.SendNotification(
					`$register${ProviderType}Provider`,
					[
						Handle,
						TypeConverter.DocumentSelector.fromApi(Selector),
						Extension.identifier.value,
						Options, // Convert options to DTO
					],
				).pipe(Effect.as(Handle)),
			),
		),
		(Handle) => IpcService.SendNotification("$unregister", [Handle]),
	).pipe(
		Effect.map(
			(handle) =>
				new Disposable(() => {
					// This is called when the user calls `.dispose()` on the returned object.
					// The acquireRelease finalizer handles automatic cleanup when the scope ends.
				}),
		),
	);
