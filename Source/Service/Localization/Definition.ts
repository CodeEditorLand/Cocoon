/**
 * @module Definition (Localization)
 * @description The live implementation of the Localization service.
 */

import * as Path from "node:path";
import { Barrier, Effect, Ref, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { InitData } from "../InitData.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { FetchBundle } from "./Support/FetchBundle.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const InitDataService = yield* _(InitData.Tag);
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
		const Language = InitDataService.environment.appLanguage || "en";
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

	const ServiceImplementation: Interface = {
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
							FetchBundle(IPCService, DefaultBundleURI),
							LanguageBundleURI
								? FetchBundle(IPCService, LanguageBundleURI)
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

		onDidInitializeLocalization: OnDidInitializeEvent.Stream.pipe(
			Stream.toEvent,
		),
		SignalLocalizationInitialized: () =>
			Barrier.succeed(InitBarrier, undefined).pipe(Effect.asUnit),
	};

	return ServiceImplementation;
});
