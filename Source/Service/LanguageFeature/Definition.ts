/*
 * File: Cocoon/Source/Service/LanguageFeature/Definition.ts
 * Role: The live implementation of the LanguageFeature service.
 * Responsibilities:
 *   - Acts as a central registry for language feature providers (Hover, Completion, etc.).
 *   - Forwards provider registrations to the Mountain host process via IPC, receiving a handle.
 *   - Stores provider implementations locally in maps, indexed by their handle.
 *   - Implements RPC handlers that Mountain calls to execute a provider, using the handle
 *     to look up and invoke the correct implementation from the appropriate extension.
 */

import { Effect, Option, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	CancellationTokenSource,
	Disposable,
	type CodeActionProvider,
	type CompletionItemProvider,
	type DefinitionProvider,
	type HoverProvider,
	type ReferenceProvider,
} from "vscode";
import { Command } from "../Command/Service.js";
import { Document } from "../Document/Service.js";
import { IPC } from "../IPC/Service.js";
import { LanguageFeature } from "./Service.js";
import { Command as CommandConverter } from "../../TypeConverter/Command/Definition.js";
import { Completion as CompletionConverter } from "../../TypeConverter/Completion.js";
import { DocumentSelector as DocumentSelectorConverter } from "../../TypeConverter/DocumentSelector.js";
import { Hover as HoverConverter } from "../../TypeConverter/Hover.js";
import { Location as LocationConverter } from "../../TypeConverter/Location.js";
import { Position as PositionConverter } from "../../TypeConverter/Main/Position.js";

type ProviderHandle = number;
type AnyProvider =
	| HoverProvider
	| CompletionItemProvider
	| DefinitionProvider
	| ReferenceProvider
	| CodeActionProvider;

/**
 * An `Effect` that builds the live implementation of the `LanguageFeature` service.
 */
const Definition = Effect.gen(function* (Generator) {
	// --- Service Dependencies ---
	const IPCService = yield* Generator(IPC);
	const DocumentService = yield* Generator(Document);
	const CommandService = yield* Generator(Command);

	// --- Provider Registries (internal state) ---
	const HoverProvidersRef = yield* Generator(
		Ref.make(new Map<ProviderHandle, HoverProvider>()),
	);
	const CompletionProvidersRef = yield* Generator(
		Ref.make(new Map<ProviderHandle, CompletionItemProvider>()),
	);
	const DefinitionProvidersRef = yield* Generator(
		Ref.make(new Map<ProviderHandle, DefinitionProvider>()),
	);
	const ReferenceProvidersRef = yield* Generator(
		Ref.make(new Map<ProviderHandle, ReferenceProvider>()),
	);
	// Add other provider refs here...

	// --- Type Converters ---
	const CommandConverterInstance = new CommandConverter(
		CommandService.RegisterCommand,
		(CommandId, ...Arguments) =>
			CommandService.ExecuteCommand(CommandId, ...Arguments),
		() => undefined, // getCommands is not needed for serialization.
	);

	// --- RPC Handlers (Invoked by Mountain) ---
	const InitializeRPCHandlers = Effect.sync(() => {
		IPCService.RegisterInvokeHandler(
			"$provideHover",
			async ([Handle, URIComponents, Position, _Token]) => {
				const Providers = Ref.unsafeGet(HoverProvidersRef);
				const Provider = Providers.get(Handle);
				if (!Provider?.provideHover) return null;

				const Uri = DocumentSelectorConverter.uriFrom(URIComponents);
				const Pos = PositionConverter.ToAPI(Position);
				const DocOption = Effect.runSync(
					DocumentService.GetDocument(Uri),
				);
				if (Option.isNone(DocOption)) return null;

				const Result = await Provider.provideHover(
					DocOption.value,
					Pos,
					new CancellationTokenSource().token,
				);
				return Result ? HoverConverter.FromAPI(Result) : null;
			},
		);

		IPCService.RegisterInvokeHandler(
			"$provideCompletionItems",
			async ([Handle, URIComponents, Position, Context, _Token]) => {
				const Providers = Ref.unsafeGet(CompletionProvidersRef);
				const Provider = Providers.get(Handle);
				if (!Provider?.provideCompletionItems) return null;

				const Uri = DocumentSelectorConverter.uriFrom(URIComponents);
				const Pos = PositionConverter.ToAPI(Position);
				const DocOption = Effect.runSync(
					DocumentService.GetDocument(Uri),
				);
				if (Option.isNone(DocOption)) return null;

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
							CommandConverterInstance,
							[],
						)
					: null;
			},
		);

		IPCService.RegisterInvokeHandler(
			"$provideDefinition",
			async ([Handle, URIComponents, Position, _Token]) => {
				const Provider = Ref.unsafeGet(DefinitionProvidersRef).get(
					Handle,
				);
				if (!Provider?.provideDefinition) return null;
				const Uri = DocumentSelectorConverter.uriFrom(URIComponents);
				const Pos = PositionConverter.ToAPI(Position);
				const DocOption = Effect.runSync(
					DocumentService.GetDocument(Uri),
				);
				if (Option.isNone(DocOption)) return null;
				const Result = await Provider.provideDefinition(
					DocOption.value,
					Pos,
					new CancellationTokenSource().token,
				);
				return Result ? LocationConverter.FromAPI(Result) : null;
			},
		);

		IPCService.RegisterInvokeHandler(
			"$provideReferences",
			async ([Handle, URIComponents, Position, Context, _Token]) => {
				const Provider = Ref.unsafeGet(ReferenceProvidersRef).get(
					Handle,
				);
				if (!Provider?.provideReferences) return null;
				const Uri = DocumentSelectorConverter.uriFrom(URIComponents);
				const Pos = PositionConverter.ToAPI(Position);
				const DocOption = Effect.runSync(
					DocumentService.GetDocument(Uri),
				);
				if (Option.isNone(DocOption)) return null;
				const Result = await Provider.provideReferences(
					DocOption.value,
					Pos,
					Context,
					new CancellationTokenSource().token,
				);
				return Result ? Result.map(LocationConverter.FromAPI) : null;
			},
		);
	});

	yield* Generator(InitializeRPCHandlers);

	const CreateRegisterEffect = (
		ProviderRef: Ref.Ref<Map<ProviderHandle, AnyProvider>>,
		ProviderType: number, // Corresponds to an enum on the main thread
		Selector: vscode.DocumentSelector,
		Extension: IExtensionDescription,
		Provider: AnyProvider,
		Options: any = null,
	): Effect.Effect<Disposable, Error> =>
		Effect.gen(function* (Generator) {
			const SelectorDTO = DocumentSelectorConverter.from(Selector);
			const Handle = yield* Generator(
				IPCService.SendRequest<ProviderHandle>(
					"$languageFeatures:registerProvider",
					[
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

			yield* Generator(
				Ref.update(ProviderRef, (TheMap) =>
					TheMap.set(Handle, Provider),
				),
			);

			return new Disposable(() => {
				const UnregisterEffect = Ref.update(
					ProviderRef,
					(TheMap) => (TheMap.delete(Handle), TheMap),
				).pipe(
					Effect.andThen(
						IPCService.SendNotification(
							"$languageFeatures:unregisterProvider",
							[Handle],
						),
					),
				);
				Effect.runFork(UnregisterEffect);
			});
		});

	// --- Service Implementation ---
	const ServiceImplementation: LanguageFeature["Type"] = {
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
			_Selector,
			_Provider,
			_Metadata,
			_Extension,
		) => Effect.succeed(new Disposable(() => {})), // Stubbed
	};

	return ServiceImplementation;
});

export default Definition;
