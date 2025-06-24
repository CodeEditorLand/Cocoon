/*
 * File: Cocoon/Source/Service/LanguageFeature/Service.ts
 * Role: Defines the LanguageFeature service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for registering language feature providers.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
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
	type CodeActionProviderMetadata,
	type DocumentSelector,
} from "vscode";

import { Command as CommandService } from "../Command/Service.js";
import { Document as DocumentService } from "../Document/Service.js";
import { IPC as IPCService } from "../IPC/Service.js";
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

export class LanguageFeature extends Effect.Service<LanguageFeature>()(
	"Service/LanguageFeature",
	{
		effect: Effect.gen(function* (Generator) {
			// --- Service Dependencies ---
			const IPC = yield* Generator(IPCService);
			const Document = yield* Generator(DocumentService);
			const Command = yield* Generator(CommandService);

			// --- Provider Registries (Internal State) ---
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

			// --- Type Converters ---
			const CommandConverterInstance = new CommandConverter(
				Command.RegisterCommand,
				(CommandId, ...Arguments) =>
					Command.ExecuteCommand(CommandId, ...Arguments),
				() => undefined,
			);

			// --- RPC Handlers (Invoked by Mountain) ---
			const InitializeRPCHandlers = () => {
				IPC.RegisterInvokeHandler(
					"$provideHover",
					async ([Handle, URIComponents, Position, _Token]) => {
						const Providers = Ref.unsafeGet(HoverProvidersRef);
						const Provider = Providers.get(Handle);
						if (!Provider?.provideHover) return null;

						const Uri =
							DocumentSelectorConverter.uriFrom(URIComponents);
						const Pos = PositionConverter.ToAPI(Position);
						const DocOption = Effect.runSync(
							Document.GetDocument(Uri),
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

				IPC.RegisterInvokeHandler(
					"$provideCompletionItems",
					async ([
						Handle,
						URIComponents,
						Position,
						Context,
						_Token,
					]) => {
						const Providers = Ref.unsafeGet(CompletionProvidersRef);
						const Provider = Providers.get(Handle);
						if (!Provider?.provideCompletionItems) return null;

						const Uri =
							DocumentSelectorConverter.uriFrom(URIComponents);
						const Pos = PositionConverter.ToAPI(Position);
						const DocOption = Effect.runSync(
							Document.GetDocument(Uri),
						);
						if (Option.isNone(DocOption)) return null;

						const CompletionContext =
							CompletionConverter.CompletionContext.ToAPI(
								Context,
							);
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

				IPC.RegisterInvokeHandler(
					"$provideDefinition",
					async ([Handle, URIComponents, Position, _Token]) => {
						const Provider = Ref.unsafeGet(
							DefinitionProvidersRef,
						).get(Handle);
						if (!Provider?.provideDefinition) return null;
						const Uri =
							DocumentSelectorConverter.uriFrom(URIComponents);
						const Pos = PositionConverter.ToAPI(Position);
						const DocOption = Effect.runSync(
							Document.GetDocument(Uri),
						);
						if (Option.isNone(DocOption)) return null;
						const Result = await Provider.provideDefinition(
							DocOption.value,
							Pos,
							new CancellationTokenSource().token,
						);
						return Result
							? LocationConverter.FromAPI(Result)
							: null;
					},
				);

				IPC.RegisterInvokeHandler(
					"$provideReferences",
					async ([
						Handle,
						URIComponents,
						Position,
						Context,
						_Token,
					]) => {
						const Provider = Ref.unsafeGet(
							ReferenceProvidersRef,
						).get(Handle);
						if (!Provider?.provideReferences) return null;
						const Uri =
							DocumentSelectorConverter.uriFrom(URIComponents);
						const Pos = PositionConverter.ToAPI(Position);
						const DocOption = Effect.runSync(
							Document.GetDocument(Uri),
						);
						if (Option.isNone(DocOption)) return null;
						const Result = await Provider.provideReferences(
							DocOption.value,
							Pos,
							Context,
							new CancellationTokenSource().token,
						);
						return Result
							? Result.map(LocationConverter.FromAPI)
							: null;
					},
				);
			};

			InitializeRPCHandlers();

			const CreateRegisterEffect = (
				ProviderRef: Ref.Ref<Map<ProviderHandle, AnyProvider>>,
				ProviderType: number,
				Selector: DocumentSelector,
				Extension: IExtensionDescription,
				Provider: AnyProvider,
				Options: any = null,
			): Effect.Effect<Disposable, Error> =>
				Effect.gen(function* (Generator) {
					const SelectorDTO =
						DocumentSelectorConverter.from(Selector);
					const Handle = yield* Generator(
						IPC.SendRequest<ProviderHandle>(
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
			const ServiceImplementation = {
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
		}),
	},
) {}
