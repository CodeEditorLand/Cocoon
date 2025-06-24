/*
 * File: Cocoon/Source/Service/Extension/Service.ts
 * Role: Defines the Extension service interface and provides its default "live" implementation.
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
import type { Event, Extension as VscExtension } from "vscode";
import { ExtensionKind } from "vscode";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";

import { ExtensionHost } from "../../Service/ExtensionHost/Service.js";
import { InitData } from "../../Service/InitData/Service.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";

// --- Internal Helper: Creates the public-facing vscode.Extension object ---
const CreateAPIObject = <T>(
	Description: IExtensionDescription,
	ExtensionHostService: ExtensionHost["Type"],
): VscExtension<T> => {
	const ActivateEffect = Effect.gen(function* (Generator) {
		yield* Generator(
			ExtensionHostService.ActivateById(Description.identifier, {
				startup: false,
				extensionId: Description.identifier,
				activationEvent: "api",
			}),
		);
		const Exports = yield* Generator(
			ExtensionHostService.GetExtensionExports(Description.identifier),
		);
		return Exports as T;
	});

	const GetExtensionKind = (): ExtensionKind => {
		const Kinds = Array.isArray(Description.extensionKind)
			? Description.extensionKind
			: Description.extensionKind
				? [Description.extensionKind]
				: ["workspace"];
		if (Kinds.includes("workspace")) return ExtensionKind.Workspace;
		return ExtensionKind.UI;
	};

	const ExtensionAPIObject: VscExtension<T> = {
		id: Description.identifier.value,
		extensionUri: Description.extensionLocation,
		extensionPath: Description.extensionLocation.fsPath,
		get isActive(): boolean {
			return Effect.runSync(
				ExtensionHostService.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			return Effect.runSync(
				Effect.catchAll(
					ExtensionHostService.GetExtensionExports(
						Description.identifier,
					),
					() => Effect.succeed(undefined),
				),
			);
		},
		activate: (): Promise<T> => Effect.runPromise(ActivateEffect),
		isFromDifferentExtensionHost: false,
	};

	return Object.freeze(ExtensionAPIObject);
};

// --- Service Definition ---
export class Extension extends Effect.Service<Extension>()(
	"Service/Extension",
	{
		effect: Effect.gen(function* (Generator) {
			const ExtensionHostService = yield* Generator(ExtensionHost);
			const InitDataService = yield* Generator(InitData);

			const { event: OnDidChangeEvent } = CreateEventStream<void>();
			const AllExtensionsCache = yield* Generator(
				Ref.make<Option.Option<readonly VscExtension<any>[]>>(
					Option.none(),
				),
			);

			const ActivationEventsReader: IActivationEventsReader = {
				readActivationEvents: (Description) =>
					ImplicitActivationEvents.readActivationEvents(Description),
			};

			const ExtensionRegistry = new ExtensionDescriptionRegistry(
				ActivationEventsReader,
				InitDataService.extensions.allExtensions,
			);

			const ServiceImplementation = {
				onDidChange: OnDidChangeEvent,

				GetExtension: <T>(ExtensionId: string) =>
					Effect.succeed(
						ExtensionRegistry.getExtensionDescription(ExtensionId),
					).pipe(
						Effect.map(Option.fromNullable),
						Effect.map(
							Option.map((Description) =>
								CreateAPIObject<T>(
									Description,
									ExtensionHostService,
								),
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
									new Error(
										`Extension '${ExtensionId}' not found.`,
									),
								),
							);
						}
						const TheExtension = MaybeExtension.value;
						yield* Generator(
							Effect.promise(() => TheExtension.activate()),
						);
						return TheExtension;
					}),
			};

			return ServiceImplementation;
		}),
	},
) {}
