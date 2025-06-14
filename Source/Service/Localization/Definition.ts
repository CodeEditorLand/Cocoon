/**
 * @module Definition (Localization)
 * @description The live implementation of the Localization service.
 */

import * as Path from "node:path";
import { Barrier, Context, Effect, Ref, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import FetchBundle from "./Support/FetchBundle.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const InitData = yield* _(InitDataService);
	const NlsCache = yield* _(
		Ref.make(new Map<string, Record<string, string>>()),
	);
	const InitBarrier = yield* _(Barrier.make());
	const OnDidInitializeEvent = CreateEventStream<void>();

	// Fork a background fiber that fires the event once the barrier is opened.
	yield* _(
		Barrier.await(InitBarrier).pipe(
			Effect.flatMap(() => OnDidInitializeEvent.Fire()),
			Effect.forkDaemon,
		),
	);

	const GetPotentialBundleURIs = (Extension: IExtensionDescription) => {
		const Language = InitData.environment.appLanguage || "en";
		const BaseURI = Uri.revive(Extension.extensionLocation);
		const BasePath = Extension.l10n
			? Path.join(BaseURI.fsPath, Extension.l10n)
			: BaseURI.fsPath;

		const DefaultBundleURI = Uri.file(
			Path.join(BasePath, "package.nls.json"),
		);
		const LanguageBundleURI =
			Language !== "en"
				? Uri.file(Path.join(BasePath, `package.nls.${Language}.json`))
				: undefined;

		return { DefaultBundleURI, LanguageBundleURI };
	};

	const ServiceImplementation: Context.Tag.Service<any> = {
		GetBundle: (ExtensionID) =>
			Ref.get(NlsCache).pipe(
				Effect.map((cache) => cache.get(ExtensionID)),
			),
		GetBundleURI: (ExtensionID) => Effect.succeed(undefined), // This could be implemented to return one of the potential URIs.

		InitializeLocalizedMessages: (Extension) =>
			Effect.gen(function* (_) {
				yield* _(Barrier.await(InitBarrier)); // Wait until host is ready.
				const { DefaultBundleURI, LanguageBundleURI } =
					GetPotentialBundleURIs(Extension);

				const [DefaultContent, LanguageContent] = yield* _(
					Effect.all(
						[
							FetchBundle(IPC, DefaultBundleURI),
							LanguageBundleURI
								? FetchBundle(IPC, LanguageBundleURI)
								: Effect.succeed({}),
						],
						{ concurrency: "unbounded" },
					),
				);

				const FinalBundle = { ...DefaultContent, ...LanguageContent };
				if (Object.keys(FinalBundle).length > 0) {
					yield* _(
						Ref.update(NlsCache, (cache) =>
							cache.set(Extension.identifier.value, FinalBundle),
						),
					);
				}
			}),

		onDidInitializeLocalization: Stream.toEvent(
			OnDidInitializeEvent.Stream,
		),
		SignalLocalizationInitialized: () =>
			Barrier.succeed(InitBarrier, undefined).pipe(Effect.asVoid),
	};

	return ServiceImplementation;
});
