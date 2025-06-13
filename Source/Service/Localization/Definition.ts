/**
 * @module Definition (Localization)
 * @description The live implementation of the Localization service.
 */

import * as Path from "node:path";
import { Barrier, Effect, Ref, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Uri } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { InitDataService } from "../InitData.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import { FetchBundleEffect } from "./Support/FetchBundle.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
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

	const GetPotentialBundleUris = (Extension: IExtensionDescription) => {
		const Language = InitData.environment.appLanguage || "en";
		const BasePath = Extension.l10n
			? Path.join(Extension.extensionLocation.fsPath, Extension.l10n)
			: Extension.extensionLocation.fsPath;

		const DefaultBundleUri = Uri.file(
			Path.join(BasePath, "package.nls.json"),
		);
		const LangBundleUri =
			Language !== "en"
				? Uri.file(Path.join(BasePath, `package.nls.${Language}.json`))
				: undefined;

		return { DefaultBundleUri, LangBundleUri };
	};

	const ServiceImplementation: Interface = {
		GetBundle: (ExtensionId) =>
			Ref.get(NlsCache).pipe(
				Effect.map((cache) => cache.get(ExtensionId)),
			),
		GetBundleUri: () => Effect.succeed(undefined), // This could be implemented to return one of the potential URIs.

		InitializeLocalizedMessages: (Extension) =>
			Effect.gen(function* (_) {
				yield* _(Barrier.await(InitBarrier)); // Wait until host is ready.
				const { DefaultBundleUri, LangBundleUri } =
					GetPotentialBundleUris(Extension);

				const [DefaultContent, LangContent] = yield* _(
					Effect.all([
						FetchBundleEffect(IPC, DefaultBundleUri),
						LangBundleUri
							? FetchBundleEffect(IPC, LangBundleUri)
							: Effect.succeed({}),
					]),
				);

				const FinalBundle = { ...DefaultContent, ...LangContent };
				if (Object.keys(FinalBundle).length > 0) {
					yield* _(
						Ref.update(NlsCache, (cache) =>
							cache.set(Extension.identifier.value, FinalBundle),
						),
					);
				}
			}),

		OnDidInitializeLocalization: OnDidInitializeEvent.Stream,
		SignalLocalizationInitialized: () =>
			Barrier.succeed(InitBarrier, undefined).pipe(Effect.asUnit),
	};

	return ServiceImplementation;
});
