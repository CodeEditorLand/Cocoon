/*
 * File: Cocoon/Source/Service/LanguageFeature/Definition.ts
 * Role: The live implementation of the LanguageFeature service.
 * Responsibilities:
 *   1. Acts as a central registry for language feature providers (Hover, Completion, etc.).
 *   2. Registers providers with the Mountain host process via IPC and receives a handle.
 *   3. Stores provider implementations locally in maps, indexed by their handle.
 *   4. Implements RPC handlers that Mountain calls to execute a provider, using the handle
 *      to look up and invoke the correct implementation.
 *   5. Returns disposables to extensions to allow for unregistration.
 */

import { Effect, Option, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	CancellationTokenSource,
	Disposable,
	type CodeActionProvider,
	type CodeActionProviderMetadata,
	type CompletionContext,
	type CompletionItemProvider,
	type DefinitionProvider,
	type DocumentSelector,
	type Hover,
	type HoverProvider,
	type Location,
	type ReferenceContext,
	type ReferenceProvider,
} from "vscode";

import CommandConverterDefinition from "../../TypeConverter/Command/Definition.js";
import CompletionConverter from "../../TypeConverter/Completion.js";
import DocumentSelectorConverter from "../../TypeConverter/DocumentSelector.js";
import HoverConverter from "../../TypeConverter/Hover.js";
import LocationConverter from "../../TypeConverter/Location.js";
import PositionConverter from "../../TypeConverter/Main/Position.js";
import CommandService from "../Command/Service.js";
import DocumentService from "../Document/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

type ProviderHandle = number;

/**
 * An Effect that builds the live implementation of the LanguageFeature service.
 */
export default Effect.gen(function* (G) {
	// --- Service Dependencies ---
	const IPC = yield* G(IPCService);

	const Document = yield* G(DocumentService);

	const Command = yield* G(CommandService);

	// --- Provider Registries ---
	const HoverProvidersRef = yield* G(
		Ref.make(new Map<ProviderHandle, HoverProvider>()),
	);

	const CompletionProvidersRef = yield* G(
		Ref.make(new Map<ProviderHandle, CompletionItemProvider>()),
	);

	const DefinitionProvidersRef = yield* G(
		Ref.make(new Map<ProviderHandle, DefinitionProvider>()),
	);

	const ReferenceProvidersRef = yield* G(
		Ref.make(new Map<ProviderHandle, ReferenceProvider>()),
	);

	const CommandConverter = new CommandConverterDefinition(
		Command.RegisterCommand,

		(command, ...args) => Command.ExecuteCommand(command, ...args),

		// getCommands is not needed for serialization.
		() => undefined,
	);

	// --- RPC Handlers (Invoked by Mountain) ---
	yield* G(
		Effect.sync(() => {
			// --- Hover Provider Handler ---
			IPC.RegisterInvokeHandler(
				"$provideHover",

				async ([
					Handle,

					URIComponents,

					Position,

					_Token,
				]): Promise<Hover | null> => {
					const Providers = Effect.runSync(
						Ref.get(HoverProvidersRef),
					);

					const Provider = Providers.get(Handle);

					if (!Provider?.provideHover) {
						return null;
					}

					const Uri =
						DocumentSelectorConverter.uriFrom(URIComponents);

					const Pos = PositionConverter.ToAPI(Position);

					const DocOption = Effect.runSync(Document.GetDocument(Uri));

					if (Option.isNone(DocOption)) {
						return null;
					}

					const Result = await Provider.provideHover(
						DocOption.value,

						Pos,

						new CancellationTokenSource().token,
					);

					return Result ? HoverConverter.FromAPI(Result) : null;
				},
			);

			// --- Completion Provider Handler ---
			IPC.RegisterInvokeHandler(
				"$provideCompletionItems",

				async ([
					Handle,

					URIComponents,

					Position,

					Context,

					_Token,
				]): Promise<any> => {
					const Providers = Effect.runSync(
						Ref.get(CompletionProvidersRef),
					);

					const Provider = Providers.get(Handle);

					if (!Provider?.provideCompletionItems) {
						return null;
					}

					const Uri =
						DocumentSelectorConverter.uriFrom(URIComponents);

					const Pos = PositionConverter.ToAPI(Position);

					const DocOption = Effect.runSync(Document.GetDocument(Uri));

					if (Option.isNone(DocOption)) {
						return null;
					}

					const CompletionContext =
						CompletionConverter.CompletionContext.ToAPI(Context);

					const Token = new CancellationTokenSource().token;

					const Result = await Provider.provideCompletionItems(
						DocOption.value,

						Pos,

						Token,

						CompletionContext,
					);

					return Result
						? CompletionConverter.CompletionList.FromAPI(
								Result,

								CommandConverter,

								[],
							)
						: null;
				},
			);

			// --- Definition Provider Handler ---
			IPC.RegisterInvokeHandler(
				"$provideDefinition",

				async ([
					Handle,

					URIComponents,

					Position,

					_Token,
				]): Promise<any> => {
					const Provider = Effect.runSync(
						Ref.get(DefinitionProvidersRef),
					).get(Handle);

					if (!Provider?.provideDefinition) {
						return null;
					}

					const Uri =
						DocumentSelectorConverter.uriFrom(URIComponents);

					const Pos = PositionConverter.ToAPI(Position);

					const DocOption = Effect.runSync(Document.GetDocument(Uri));

					if (Option.isNone(DocOption)) {
						return null;
					}

					const Result = await Provider.provideDefinition(
						DocOption.value,

						Pos,

						new CancellationTokenSource().token,
					);

					return Result ? LocationConverter.FromAPI(Result) : null;
				},
			);

			// --- Reference Provider Handler ---
			IPC.RegisterInvokeHandler(
				"$provideReferences",

				async ([
					Handle,

					URIComponents,

					Position,

					Context,

					_Token,
				]): Promise<Location[] | null> => {
					const Provider = Effect.runSync(
						Ref.get(ReferenceProvidersRef),
					).get(Handle);

					if (!Provider?.provideReferences) {
						return null;
					}

					const Uri =
						DocumentSelectorConverter.uriFrom(URIComponents);

					const Pos = PositionConverter.ToAPI(Position);

					const DocOption = Effect.runSync(Document.GetDocument(Uri));

					if (Option.isNone(DocOption)) {
						return null;
					}

					const Result = await Provider.provideReferences(
						DocOption.value,

						Pos,

						Context as ReferenceContext,

						new CancellationTokenSource().token,
					);

					return Result
						? Result.map((loc) => LocationConverter.FromAPI(loc))
						: null;
				},
			);
		}),
	);

	// A helper to create the registration effect.
	// ProviderType enum values match `languages.ProviderKind` in VS Code.
	const CreateRegisterEffect = (
		ProviderRef: Ref.Ref<Map<ProviderHandle, any>>,

		ProviderType: number,

		Selector: DocumentSelector,

		Extension: IExtensionDescription,

		Provider: any,

		Options: any = null,
	) =>
		Effect.gen(function* (G) {
			const SelectorDTO = DocumentSelectorConverter.from(selector);

			const Handle = yield* G(
				IPC.SendRequest<ProviderHandle>(
					"$languageFeatures:registerProvider",

					[
						// TODO: These should be more dynamic in a multi-host world.
						"cocoon-main",

						ProviderType,

						SelectorDTO,

						{
							value: Extension.identifier.value,

							uuid: (Extension as any).uuid,
						},

						Options,
					],
				),
			);

			yield* G(
				Ref.update(ProviderRef, (Map) => Map.set(Handle, Provider)),
			);

			return new Disposable(() => {
				const UnregisterEffect = Ref.update(
					ProviderRef,

					(Map) => (Map.delete(Handle), Map),
				).pipe(
					Effect.andThen(
						IPC.SendNotification(
							"$languageFeatures:unregisterProvider",

							[Handle],
						),
					),
				);

				Effect.runFork(UnregisterEffect);
			});
		});

	// --- Service Implementation ---
	const LanguageFeatureImplementation: Service["Type"] = {
		RegisterHoverProvider: (Selector, Provider, Extension) =>
			CreateRegisterEffect(
				HoverProvidersRef,

				0,

				Selector,

				Extension,

				Provider,
			),

		RegisterCompletionItemProvider: (
			Selector,

			Provider,

			TriggerCharacters,

			Extension,
		) =>
			CreateRegisterEffect(
				CompletionProvidersRef,

				1,

				Selector,

				Extension,

				Provider,

				{ triggerCharacters: TriggerCharacters },
			),

		RegisterDefinitionProvider: (Selector, Provider, Extension) =>
			CreateRegisterEffect(
				DefinitionProvidersRef,

				3,

				Selector,

				Extension,

				Provider,
			),

		RegisterReferenceProvider: (Selector, Provider, Extension) =>
			CreateRegisterEffect(
				ReferenceProvidersRef,

				6,

				Selector,

				Extension,

				Provider,
			),

		RegisterCodeActionsProvider: (
			_Selector: DocumentSelector,

			_Provider: CodeActionProvider,

			_Metadata: CodeActionProviderMetadata | undefined,

			_Extension: IExtensionDescription,
		) => Effect.succeed(new Disposable(() => {})),
	};

	return LanguageFeatureImplementation;
});
