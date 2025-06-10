/**
 * @module Definition (Extension)
 * @description The live implementation of the Extension service.
 */

import { Effect, Stream } from "effect";
import type { Extension } from "vscode";

import { ExtensionHost } from "../../Core/ExtensionHost/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { CreateApiObject } from "./CreateApiObject.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const ExtensionHostService = yield* _(ExtensionHost.Tag);
	const OnDidChangeEvent = CreateEventStream<void>();
	let allExtensionsCache: readonly Extension<any>[] | undefined = undefined;

	// When the underlying extension host registers new extensions, clear our cache
	// and fire the public event.
	// Note: a real implementation would get an event stream from ExtensionHostService.
	// Effect.runFork(Stream.runForEach(ExtensionHostService.OnDidRegisterExtensions, () => {
	//   allExtensionsCache = undefined;
	//   return OnDidChangeEvent.Fire();
	// }));

	const ServiceImplementation: Interface = {
		onDidChange: OnDidChangeEvent.Stream.pipe(Stream.toEvent),

		getExtension: <T>(extensionId: string) => {
			const description = Effect.runSync(
				ExtensionHostService.GetExtensionDescription(extensionId),
			);
			return description
				? CreateApiObject<T>(description, ExtensionHostService)
				: undefined;
		},

		get all() {
			if (!allExtensionsCache) {
				const descriptions = Effect.runSync(
					ExtensionHostService.GetAllExtensionDescriptions(),
				); // Assume this method exists on the service
				allExtensionsCache = descriptions.map((desc) =>
					CreateApiObject<any>(desc, ExtensionHostService),
				);
			}
			return allExtensionsCache;
		},
	};

	return ServiceImplementation;
});
