/**
 * @module ProposedApi
 * @description This service manages and checks the enablement status of proposed
 * (experimental) VS Code APIs for extensions.
 */

import { Context, Effect, HashMap, Layer, ReadonlySet } from "effect";
import {
	ExtensionIdentifier,
	type IEnabledApiProposals,
} from "vs/platform/extensions/common/extensions.js";

import { InitDataService } from "./InitData.js";
import { LogProvider } from "./Log.js";

// --- Service Definition ---

export interface Interface {
	/**
	 * Checks if a specific proposed API is enabled for a given extension.
	 * @param ExtensionId - The identifier of the extension making the request.
	 * @param ProposalName - The name of the proposed API feature (e.g., 'languageModel').
	 * @returns `true` if the API is enabled, `false` otherwise.
	 */
	readonly IsEnabled: (
		ExtensionId: ExtensionIdentifier,
		ProposalName: string,
	) => boolean;
}

export const Tag = Context.Tag<Interface>("Service/ProposedApi");

// --- Live Implementation ---

const ParseConfig = (
	Config: string[] | IEnabledApiProposals | undefined,
): { GlobalApis: Set<string>; ExtensionApis: Map<string, Set<string>> } => {
	const GlobalApis = new Set<string>();
	const ExtensionApis = new Map<string, Set<string>>();

	if (Array.isArray(Config)) {
		for (const Proposal of Config) {
			GlobalApis.add(Proposal);
		}
	} else if (typeof Config === "object" && Config !== null) {
		for (const Key in Config) {
			const Proposals = Config[Key];
			if (Array.isArray(Proposals)) {
				if (Key === "*") {
					for (const Proposal of Proposals) {
						GlobalApis.add(Proposal);
					}
				} else {
					const ExistingSet =
						ExtensionApis.get(Key) ?? new Set<string>();
					for (const Proposal of Proposals) {
						ExistingSet.add(Proposal);
					}
					ExtensionApis.set(Key, ExistingSet);
				}
			}
		}
	}

	return { GlobalApis, ExtensionApis };
};

const Definition = Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Log = yield* _(LogProvider.Tag);

	// Parse proposals defined in the product configuration and environment variables.
	const ProductConfig = ParseConfig(
		InitData.product?.extensionEnabledApiProposals,
	);
	const EnvConfig = ParseConfig(
		InitData.environment.extensionEnabledProposedApi,
	);

	// Merge the two sources.
	const AllGlobalApis = ReadonlySet.fromIterable([
		...ProductConfig.GlobalApis,
		...EnvConfig.GlobalApis,
	]);

	const AllExtensionApis = new Map(ProductConfig.ExtensionApis);
	EnvConfig.ExtensionApis.forEach((Proposals, ExtId) => {
		const Existing = AllExtensionApis.get(ExtId) ?? new Set<string>();
		Proposals.forEach((p) => Existing.add(p));
		AllExtensionApis.set(ExtId, Existing);
	});

	const ReadonlyExtensionApis = HashMap.fromEntries(
		AllExtensionApis.entries(),
	);

	yield* _(
		Log.Info(
			`Proposed API provider initialized. Globally enabled: ${ReadonlySet.size(AllGlobalApis)}. Per-extension configs: ${HashMap.size(ReadonlyExtensionApis)}.`,
		),
	);

	const ServiceImplementation: Interface = {
		IsEnabled: (ExtensionId, ProposalName) => {
			// An API is enabled if it's in the global set...
			if (ReadonlySet.has(AllGlobalApis, ProposalName)) {
				return true;
			}
			// ...or if it's explicitly enabled for this specific extension.
			const ExtensionProposals = HashMap.get(
				ReadonlyExtensionApis,
				ExtensionId.value,
			);
			return (
				ExtensionProposals.pipe(
					Effect.map((set) => set.has(ProposalName)),
					Effect.runSync,
				) ?? false
			);
		},
	};

	return ServiceImplementation;
});

export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LogProvider.Live),
);
