/**
 * @module Definition (Extension)
 * @description The live implementation of the Extension service.
 */

import { Effect, Ref } from "effect";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { Extension } from "vscode";

import ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import CreateAPIObject from "./CreateAPIObject.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Extension service,
 * which corresponds to the `vscode.extensions` API namespace.
 */
export default Effect.gen(function* () {
	// --- Service Dependencies ---
	const ExtensionHost = yield* ExtensionHostService;
	const InitData = yield* InitDataService;

	// --- State and Events ---
	const { event: OnDidChangeEvent } = CreateEventStream<void>();
	const AllExtensionsCache = yield* Ref.make<
		readonly Extension<any>[] | undefined
	>(undefined);

	// Create a reader that adheres to the IActivationEventsReader interface.
	const ActivationEventsReader: IActivationEventsReader = {
		readActivationEvents: (description) =>
			ImplicitActivationEvents.readActivationEvents(description),
	};

	// Create a registry of all known extension descriptions from the init data.
	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ActivationEventsReader,
		InitData.extensions,
	);

	const ServiceImplementation: Service["Type"] = {
		onDidChange: OnDidChangeEvent,

		getExtension: <T>(extensionId: string) => {
			const description =
				ExtensionRegistry.getExtensionDescription(extensionId);
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
			return Promise.resolve(extension.activate()).then(() => extension);
		},
	};

	return ServiceImplementation;
});
