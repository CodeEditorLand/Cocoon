/**
 * @module Definition (Extension)
 * @description The live implementation of the Extension service.
 */

import { Effect, Ref, Stream } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { Extension } from "vscode";

import { ExtensionHost } from "../../Core/ExtensionHost.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { InitData } from "../InitData.js";
import { CreateAPIObject } from "./CreateAPIObject.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const ExtensionHostService = yield* _(ExtensionHost.Tag);
	const InitDataService = yield* _(InitData.Tag);

	const OnDidChangeEvent = CreateEventStream<void>();
	const allExtensionsCache = yield* _(
		Ref.make<readonly Extension<any>[] | undefined>(undefined),
	);

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitDataService.extensions,
	);

	// In a real implementation, this would be driven by an event from the ExtensionHost
	// when the registry changes. For now, we build the cache on first access.
	// Effect.runFork(Stream.runForEach(ExtensionHostService.OnDidRegisterExtensions, () => {
	//   Ref.set(allExtensionsCache, undefined).pipe(
	//      Effect.flatMap(() => OnDidChangeEvent.Fire())
	//   )
	// }));

	const ServiceImplementation: Interface = {
		onDidChange: OnDidChangeEvent.Stream.pipe(Stream.toEvent),

		getExtension: <T>(extensionId: string) => {
			const description = Effect.runSync(
				ExtensionHostService.GetExtensionDescription(extensionId),
			);
			return description
				? CreateAPIObject<T>(description, ExtensionHostService)
				: undefined;
		},

		get all() {
			return Ref.get(allExtensionsCache).pipe(
				Effect.flatMap((maybeCache) => {
					if (maybeCache) {
						return Effect.succeed(maybeCache);
					}
					const descriptions =
						ExtensionRegistry.getAllExtensionDescriptions();
					const newCache = descriptions.map((desc) =>
						CreateAPIObject<any>(desc, ExtensionHostService),
					);
					return Ref.set(allExtensionsCache, newCache).pipe(
						Effect.as(newCache),
					);
				}),
				Effect.runSync,
			);
		},
	};

	return ServiceImplementation;
});
