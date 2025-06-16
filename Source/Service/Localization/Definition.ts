/*
 * File: Cocoon/Source/Service/Localization/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:57 UTC
 * Dependency: ../../Utility/CreateEventStream.js, ../IPC/Service.js, ../InitData/Service.js, ./Service.js, ./Support/FetchBundle.js, effect, node:path, vs/base/common/uri.js, vs/platform/extensions/common/extensions.js
 */

/**
 * @module Definition (Localization)
 * @description The live implementation of the Localization service.
 */

import * as Path from "node:path";
import { Deferred, Effect, Option, Ref } from "effect";
import { URI } from "vs/base/common/uri.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import FetchBundle from "./Support/FetchBundle.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const InitData = yield* InitDataService;
	const NlsCache = yield* Ref.make(new Map<string, Record<string, string>>());
	const InitBarrier = yield* Deferred.make<void, never>();
	const { event, Fire } = CreateEventStream<void>();

	// Fork a background fiber that fires the event once the barrier is opened.
	yield* Deferred.await(InitBarrier).pipe(
		Effect.flatMap(() => Fire()),
		Effect.forkDaemon,
	);

	const GetPotentialBundleURIs = (Extension: IExtensionDescription) => {
		const Language = InitData.environment.appLanguage || "en";
		const BaseURI = URI.revive(Extension.extensionLocation);
		const BasePath = Extension.l10n
			? Path.join(BaseURI.fsPath, Extension.l10n)
			: BaseURI.fsPath;

		const DefaultBundleURI = URI.file(
			Path.join(BasePath, "package.nls.json"),
		);
		const LanguageBundleURI =
			Language !== "en"
				? URI.file(Path.join(BasePath, `package.nls.${Language}.json`))
				: undefined;

		return { DefaultBundleURI, LanguageBundleURI };
	};

	const ServiceImplementation: Service["Type"] = {
		GetBundle: (ExtensionID) =>
			Ref.get(NlsCache).pipe(
				Effect.map((cache) =>
					Option.fromNullable(cache.get(ExtensionID)),
				),
			),
		GetBundleURI: (_ExtensionID) => Effect.succeed(undefined), // This could be implemented to return one of the potential URIs.

		InitializeLocalizedMessages: (Extension) =>
			Effect.gen(function* () {
				yield* Deferred.await(InitBarrier); // Wait until host is ready.
				const { DefaultBundleURI, LanguageBundleURI } =
					GetPotentialBundleURIs(Extension);

				const [DefaultContent, LanguageContent] = yield* Effect.all(
					[
						FetchBundle(IPC, DefaultBundleURI),
						LanguageBundleURI
							? FetchBundle(IPC, LanguageBundleURI)
							: Effect.succeed({}),
					],
					{ concurrency: "unbounded" },
				);

				const FinalBundle = { ...DefaultContent, ...LanguageContent };
				if (Object.keys(FinalBundle).length > 0) {
					yield* Ref.update(NlsCache, (cache) =>
						cache.set(Extension.identifier.value, FinalBundle),
					);
				}
			}).pipe(Effect.mapError((e) => e as Error)),

		onDidInitializeLocalization: event,
		SignalLocalizationInitialized: () =>
			Deferred.succeed(InitBarrier, undefined).pipe(Effect.asVoid),
	};

	return ServiceImplementation;
});
