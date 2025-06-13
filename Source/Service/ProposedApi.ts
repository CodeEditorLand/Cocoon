/**
 * @module ProposedAPI
 * @description This service manages and checks the enablement status of proposed
 * (experimental) VS Code APIs for extensions.
 */

import { Context, Effect, HashMap, Layer, ReadonlySet } from "effect";
import {
	ExtensionIdentifier,
	type IEnabledAPIProposals,
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

export const Tag = Context.Tag<Interface>("Service/ProposedAPI");

// --- Live Implementation ---

const ParseConfig = (
	Configuration: string[] | IEnabledAPIProposals | undefined,
): { GlobalAPIs: Set<string>; ExtensionAPIs: Map<string, Set<string>> } => {
	const GlobalAPIs = new Set<string>();
	const ExtensionAPIs = new Map<string, Set<string>>();

	if (Array.isArray(Configuration)) {
		for (const Proposal of Configuration) {
			GlobalAPIs.add(Proposal);
		}
	} else if (typeof Configuration === "object" && Configuration !== null) {
		for (const Key in Configuration) {
			const Proposals = Configuration[Key];
			if (Array.isArray(Proposals)) {
				if (Key === "*") {
					for (const Proposal of Proposals) {
						GlobalAPIs.add(Proposal);
					}
				} else {
					const ExistingSet =
						ExtensionAPIs.get(Key) ?? new Set<string>();
					for (const Proposal of Proposals) {
						ExistingSet.add(Proposal);
					}
					ExtensionAPIs.set(Key, ExistingSet);
				}
			}
		}
	}

	return { GlobalAPIs, ExtensionAPIs };
};

const Definition = Effect.gen(function* (_) {
	const InitData = yield* _(InitDataService);
	const Log = yield* _(LogProvider.Tag);

	// Parse proposals defined in the product configuration and environment variables.
	const ProductConfig = ParseConfig(
		InitData.product?.extensionEnabledAPIProposals,
	);
	const EnvConfig = ParseConfig(
		InitData.environment.extensionEnabledProposedAPI,
	);

	// Merge the two sources.
	const AllGlobalAPIs = ReadonlySet.fromIterable([
		...ProductConfig.GlobalAPIs,
		...EnvConfig.GlobalAPIs,
	]);

	const AllExtensionAPIs = new Map(ProductConfig.ExtensionAPIs);
	EnvConfig.ExtensionAPIs.forEach((Proposals, ExtId) => {
		const Existing = AllExtensionAPIs.get(ExtId) ?? new Set<string>();
		Proposals.forEach((p) => Existing.add(p));
		AllExtensionAPIs.set(ExtId, Existing);
	});

	const ReadonlyExtensionAPIs = HashMap.fromEntries(
		AllExtensionAPIs.entries(),
	);

	yield* _(
		Log.Info(
			`Proposed API provider initialized. Globally enabled: ${ReadonlySet.size(AllGlobalAPIs)}. Per-extension configs: ${HashMap.size(ReadonlyExtensionAPIs)}.`,
		),
	);

	const ServiceImplementation: Interface = {
		IsEnabled: (ExtensionId, ProposalName) => {
			// An API is enabled if it's in the global set...
			if (ReadonlySet.has(AllGlobalAPIs, ProposalName)) {
				return true;
			}
			// ...or if it's explicitly enabled for this specific extension.
			const ExtensionProposals = HashMap.get(
				ReadonlyExtensionAPIs,
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
