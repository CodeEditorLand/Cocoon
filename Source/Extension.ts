/**
 * @module Extension
 * @description Defines the service that implements the `vscode.extensions` API.
 * It manages access to extension descriptions, activation state, and provides
 * the public-facing `vscode.Extension` API objects.
 */

import { Effect, Option, Ref } from "effect";
import { ImplicitActivationEvents } from "vs/platform/extensionManagement/common/implicitActivationEvents.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	ExtensionDescriptionRegistry,
	type IActivationEventsReader,
} from "vs/workbench/services/extensions/common/extensionDescriptionRegistry.js";
import type { Event, Extension as VSCodeExtension } from "vscode";
import { ExtensionKind } from "vscode";
import { type ExtensionHost, ExtensionHostService } from "./ExtensionHost.js";
import { InitDataService } from "./InitData.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";

/**
 * @description An internal helper function to create the public-facing
 * `vscode.Extension` API object for a given extension description.
 * @param Description The internal description of the extension.
 * @param ExtensionHost The central service for extension lifecycle management.
 * @returns A frozen, public `vscode.Extension` object.
 */
const CreateAPIObject = <T>(
	Description: IExtensionDescription,
	ExtensionHost: ExtensionHost,
): VSCodeExtension<T> => {
	const Activate = Effect.gen(function* () {
		yield* ExtensionHost.ActivateById(Description.identifier, {
			startup: false,
			extensionId: Description.identifier,
			activationEvent: "api",
		});
		const Exports = yield* ExtensionHost.GetExtensionExports(
			Description.identifier,
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

	const ExtensionAPIObject: VSCodeExtension<T> = {
		id: Description.identifier.value,
		extensionUri: Description.extensionLocation,
		extensionPath: Description.extensionLocation.fsPath,
		get isActive(): boolean {
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			return Effect.runSync(
				Effect.catchAll(
					ExtensionHost.GetExtensionExports(Description.identifier),
					() => Effect.succeed(undefined),
				),
			);
		},
		activate: (): Promise<T> => Effect.runPromise(Activate),
	};

	return Object.freeze(ExtensionAPIObject);
};

/**
 * @interface Extension
 * @description The contract for the Extension service.
 */
export interface Extension {
	readonly onDidChange: Event<void>;
	readonly GetExtension: <T>(
		ExtensionId: string,
	) => Effect.Effect<Option.Option<VSCodeExtension<T>>, never>;
	readonly GetAll: () => Effect.Effect<
		readonly VSCodeExtension<any>[],
		never
	>;
	readonly Activate: <T>(
		ExtensionId: string,
	) => Effect.Effect<VSCodeExtension<T>, Error>;
}

/**
 * @class ExtensionService
 * @description The `Effect.Service` for the Extension service.
 */
export class ExtensionService extends Effect.Service<ExtensionService>()(
	"Service/Extension",
	{
		effect: Effect.gen(function* () {
			const ExtensionHost = yield* ExtensionHostService;
			const InitData = yield* InitDataService;

			const { event: OnDidChangeEvent } = CreateEventStream<void>();
			const AllExtensionsCache = yield* Ref.make<
				Option.Option<readonly VSCodeExtension<any>[]>
			>(Option.none());

			const ActivationEventsReader: IActivationEventsReader = {
				readActivationEvents: (description) =>
					ImplicitActivationEvents.readActivationEvents(description),
			};

			const ExtensionRegistry = new ExtensionDescriptionRegistry(
				ActivationEventsReader,
				InitData.extensions.allExtensions as IExtensionDescription[],
			);

			const GetExtension = <T>(ExtensionId: string) =>
				Effect.succeed(
					ExtensionRegistry.getExtensionDescription(ExtensionId),
				).pipe(
					Effect.map(Option.fromNullable),
					Effect.map(
						Option.map((Description) =>
							CreateAPIObject<T>(Description, ExtensionHost),
						),
					),
				);

			const GetAll = () =>
				Ref.get(AllExtensionsCache).pipe(
					Effect.flatMap(
						Option.match({
							onSome: (Cache) => Effect.succeed(Cache),
							onNone: () =>
								Effect.gen(function* () {
									const Descriptions =
										ExtensionRegistry.getAllExtensionDescriptions();
									const NewCache = Descriptions.map(
										(Description) =>
											CreateAPIObject<any>(
												Description,
												ExtensionHost,
											),
									);
									yield* Ref.set(
										AllExtensionsCache,
										Option.some(NewCache),
									);
									return NewCache;
								}),
						}),
					),
				);

			const Activate = <T>(ExtensionId: string) =>
				Effect.gen(function* () {
					const MaybeExtension = yield* GetExtension<T>(ExtensionId);
					if (Option.isNone(MaybeExtension)) {
						return yield* Effect.fail(
							new Error(`Extension '${ExtensionId}' not found.`),
						);
					}
					const TheExtension = MaybeExtension.value;
					yield* Effect.promise(() => TheExtension.activate());
					return TheExtension;
				});

			return {
				onDidChange: OnDidChangeEvent,
				GetExtension,
				GetAll,
				Activate,
			};
		}),
	},
) {}
