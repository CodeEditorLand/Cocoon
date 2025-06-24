/*
 * File: Cocoon/Source/Service/Extension/Definition.ts
 * Role: The live implementation of the Extension service.
 * Responsibilities:
 *   - Implements the `vscode.extensions` API namespace.
 *   - Manages access to extension descriptions and activation states.
 */

import { Effect, Option, Ref } from "effect";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { Extension } from "vscode";

import { ExtensionHost } from "../../Service/ExtensionHost/Service.js";
import { InitData } from "../InitData/Service.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { CreateAPIObject } from "../../Service/Extension/CreateAPIObject.js";
import type { Extension as ExtensionService } from "./Service.js";

/**
 * An `Effect` that builds the live implementation of the `Extension` service.
 */
const Definition = Effect.gen(function* (Generator) {
	const ExtensionHostService = yield* Generator(ExtensionHost);
	const InitDataService = yield* Generator(InitData);

	const { event: OnDidChangeEvent } = CreateEventStream<void>();

	// A cache to avoid repeatedly creating API objects for `GetAll`.
	const AllExtensionsCache = yield* Generator(
		Ref.make<Option.Option<readonly Extension<any>[]>>(Option.none()),
	);

	const ActivationEventsReader: IActivationEventsReader = {
		readActivationEvents: (Description) =>
			ImplicitActivationEvents.readActivationEvents(Description),
	};

	const ExtensionRegistry = new ExtensionDescriptionRegistry(
		ActivationEventsReader,
		InitDataService.extensions.allExtensions,
	);

	const ServiceImplementation: ExtensionService = {
		onDidChange: OnDidChangeEvent,

		GetExtension: <T>(ExtensionId: string) =>
			Effect.succeed(
				ExtensionRegistry.getExtensionDescription(ExtensionId),
			).pipe(
				Effect.map(Option.fromNullable),
				Effect.map(
					Option.map((Description) =>
						CreateAPIObject<T>(Description, ExtensionHostService),
					),
				),
			),

		GetAll: () =>
			Ref.get(AllExtensionsCache).pipe(
				Effect.flatMap(
					Option.match({
						onSome: (Cache) => Effect.succeed(Cache),
						onNone: () =>
							Effect.gen(function* (Generator) {
								const Descriptions =
									ExtensionRegistry.getAllExtensionDescriptions();
								const NewCache = Descriptions.map(
									(Description) =>
										CreateAPIObject<any>(
											Description,
											ExtensionHostService,
										),
								);
								yield* Generator(
									Ref.set(
										AllExtensionsCache,
										Option.some(NewCache),
									),
								);
								return NewCache;
							}),
					}),
				),
			),

		Activate: <T>(ExtensionId: string) =>
			Effect.gen(function* (Generator) {
				const MaybeExtension = yield* Generator(
					ServiceImplementation.GetExtension<T>(ExtensionId),
				);
				if (Option.isNone(MaybeExtension)) {
					return yield* Generator(
						Effect.fail(
							new Error(`Extension '${ExtensionId}' not found.`),
						),
					);
				}
				const TheExtension = MaybeExtension.value;
				yield* Generator(Effect.promise(() => TheExtension.activate()));
				return TheExtension;
			}),
	};

	return ServiceImplementation;
});

export default Definition;
