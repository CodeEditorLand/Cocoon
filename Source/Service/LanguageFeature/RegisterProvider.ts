/**
 * @module RegisterProvider (LanguageFeature)
 * @description A generic helper for registering any language feature provider.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type DocumentSelector } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import type { IPC } from "../IPC.js";

let HandleCounter = 0;

/**
 * A generic Effect for registering a language provider.
 * @param Registry The Ref containing all registered providers.
 * @param IPCService The IPC service for communicating with the host.
 * @param ProviderType A string identifying the provider type (e.g., 'Hover').
 * @param Selector The document selector for this provider.
 * @param Provider The provider implementation from the extension.
 * @param Extension The extension registering the provider.
 * @param Option Any additional options for this provider type.
 * @returns An `Effect` that resolves to a `Disposable`. When disposed, it
 *   automatically unregisters the provider from the host.
 */
export function RegisterProvider<T>(
	Registry: Ref.Ref<Map<number, any>>,
	IPCService: IPC.Interface,
	ProviderType: string,
	Selector: DocumentSelector,
	Provider: T,

	Extension: IExtensionDescription,
	Option?: any,
) {
	return Effect.sync(() => {
		const Handle = ++HandleCounter;
		const Entry = {
			type: ProviderType,
			selector: Selector,
			provider: Provider,
			extensionId: Extension.identifier,
		};
		Ref.update(Registry, (map) => map.set(Handle, Entry)).pipe(
			Effect.runSync,
		);

		const selectorDTO =
			TypeConverter.Main.DocumentSelector.FromAPI(Selector);

		IPCService.SendNotification(`$register${ProviderType}Provider`, [
			Handle,
			selectorDTO,
			Option,
		]).pipe(Effect.runFork);

		return new Disposable(() => {
			Ref.update(Registry, (map) => (map.delete(Handle), map)).pipe(
				Effect.runSync,
			);
			IPCService.SendNotification("$unregister", [Handle]).pipe(
				Effect.runFork,
			);
		});
	});
}
