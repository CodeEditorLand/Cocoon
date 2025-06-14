/**
 * @module Definition (Extension)
 * @description The live implementation of the Extension service.
 */

import { Effect, Ref } from "effect";
import { ExtensionDescriptionRegistry } from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { Extension } from "vscode";

import ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import CreateAPIObject from "./CreateAPIObject.js";
import type Service from "./Service.js";

export default Effect.gen(function* () {
	const ExtensionHost = yield* ExtensionHostService;
	const InitData = yield* InitDataService;

	const OnDidChangeEvent = CreateEventStream<void>();
	const AllExtensionsCache = yield* Ref.make<
		readonly Extension<any>[] | undefined
	>(undefined);

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitData.extensions,
	);

	// In a real implementation, this would be driven by an event from the ExtensionHost
	// when the registry changes. For now, we build the cache on first access.
	// Effect.runFork(Stream.runForEach(ExtensionHostService.OnDidRegisterExtensions, () => {
	//   Ref.set(allExtensionsCache, undefined).pipe(
	//      Effect.flatMap(() => OnDidChangeEvent.Fire())
	//   )
	// }));

	const ServiceImplementation: Service = {
		onDidChange: OnDidChangeEvent.event,

		getExtension: <T>(extensionId: string) => {
			const description = Effect.runSync(
				ExtensionHost.GetExtensionDescription(extensionId),
			);
			return description
				? CreateAPIObject<T>(description, ExtensionHost)
				: undefined;
		},

		get all() {
			return Ref.get(AllExtensionsCache).pipe(
				Effect.flatMap((maybeCache) => {
					if (maybeCache) {
						return Effect.succeed(maybeCache);
					}
					const descriptions =
						ExtensionRegistry.getAllExtensionDescriptions();
					const newCache = descriptions.map((desc) =>
						CreateAPIObject<any>(desc, ExtensionHost),
					);
					return Ref.set(AllExtensionsCache, newCache).pipe(
						Effect.as(newCache),
					);
				}),
				Effect.runSync,
			);
		},
	};

	return ServiceImplementation;
});
