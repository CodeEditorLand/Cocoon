/*
 * File: Cocoon/Source/Service/Extension/Definition.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:26 UTC
 * Dependency: ../../Core/ExtensionHost/Service.js, ../../Utility/CreateEventStream.js, ../InitData/Service.js, ./CreateAPIObject.js, ./Service.js, effect, vs/platform/extensionManagement/common/implicitActivationEvents.js, vscode
 */

/**
 * @module Definition (Extension)
 * @description The live implementation of the Extension service.
 */

import { Effect, Option, Ref } from "effect";
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
	const ExtensionHost = yield* ExtensionHostService;
	const InitData = yield* InitDataService;

	const { event: OnDidChangeEvent } = CreateEventStream<void>();
	const AllExtensionsCache = yield* Ref.make<
		Option.Option<readonly Extension<any>[]>
	>(Option.none());

	const ActivationEventsReader: IActivationEventsReader = {
		readActivationEvents: (description) =>
			ImplicitActivationEvents.readActivationEvents(description),
	};

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ActivationEventsReader,
		InitData.extensions.allExtensions,
	);

	const ServiceImplementation: Service["Type"] = {
		onDidChange: OnDidChangeEvent,
		GetExtension: <T>(extensionId: string) =>
			Effect.succeed(
				ExtensionRegistry.getExtensionDescription(extensionId),
			).pipe(
				Effect.map(Option.fromNullable),
				Effect.map(
					Option.map((description) =>
						CreateAPIObject<T>(description, ExtensionHost),
					),
				),
			),

		GetAll: () =>
			Ref.get(AllExtensionsCache).pipe(
				Effect.flatMap(
					Option.match({
						onSome: (cache) => Effect.succeed(cache),
						onNone: () =>
							Effect.gen(function* () {
								const descriptions =
									ExtensionRegistry.getAllExtensionDescriptions();
								const newCache = descriptions.map((desc) =>
									CreateAPIObject<any>(desc, ExtensionHost),
								);
								yield* Ref.set(
									AllExtensionsCache,
									Option.some(newCache),
								);
								return newCache;
							}),
					}),
				),
			),

		Activate: <T>(extensionId: string) =>
			Effect.gen(function* () {
				const maybeExtension =
					yield* ServiceImplementation.GetExtension<T>(extensionId);
				if (Option.isNone(maybeExtension)) {
					return yield* Effect.fail(
						new Error(`Extension '${extensionId}' not found.`),
					);
				}
				const extension = maybeExtension.value;
				yield* Effect.promise(() => extension.activate());
				return extension;
			}),
	};

	return ServiceImplementation;
});
