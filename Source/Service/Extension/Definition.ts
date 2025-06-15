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

	const { event: OnDidChangeEvent } = CreateEventStream<void>();
	const AllExtensionsCache = yield* Ref.make<
		readonly Extension<any>[] | undefined
	>(undefined);

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		InitData.extensions,
	);

	// In a real implementation, this would be driven by an event from the ExtensionHost
	// when the registry changes.
	// Effect.runFork(Stream.runForEach(ExtensionHost.OnDidRegisterExtensions, () =>
	//   Ref.set(AllExtensionsCache, undefined).pipe(
	//      Effect.flatMap(() => FireOnDidChange())
	//   )
	// ));

	const ServiceImplementation: Service["Type"] = {
		onDidChange: OnDidChangeEvent,

		getExtension: <T>(extensionId: string) => {
			const description = Effect.runSync(
				ExtensionHost.GetExtensionDescription(extensionId),
			);
			return description
				? CreateAPIObject<T>(description, ExtensionHost)
				: undefined;
		},

		get all() {
			return Effect.runSync(
				Ref.get(AllExtensionsCache).pipe(
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
				),
			);
		},

		activate: <T>(extensionId: string): Promise<Extension<T>> => {
			const extension =
				ServiceImplementation.getExtension<T>(extensionId);
			if (!extension) {
				return Promise.reject(
					new Error(`Extension '${extensionId}' not found.`),
				);
			}
			return extension.activate().then(() => extension);
		},
	};

	return ServiceImplementation;
});
