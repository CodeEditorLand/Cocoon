/**
 * @module ProposedAPI
 * @description This service manages and checks the enablement status of proposed
 * (experimental) VS Code APIs for extensions.
 */

import { Context, Effect, HashMap, Layer } from "effect";
import {
	ExtensionIdentifier,
	type IEnabledApiProposals,
} from "vs/platform/extensions/common/extensions.js";

import { InitData } from "./InitData.js";
import { Log } from "./Log.js";

// --- Service Definition ---

export interface Interface {
	/**
	 * Checks if a specific proposed API is enabled for a given extension.
	 * @param ExtensionID The identifier of the extension making the request.
	 * @param ProposalName The name of the proposed API feature (e.g., 'languageModels').
	 * @returns `true` if the API is enabled, `false` otherwise.
	 */
	readonly IsEnabled: (
		ExtensionID: ExtensionIdentifier,
		ProposalName: string,
	) => boolean;
}

export const Tag = Context.Tag<Interface>("Service/ProposedAPI");

// --- Live Implementation ---

function ParseConfiguration(
	Configuration: string[] | IEnabledApiProposals | undefined,
): { GlobalAPIs: Set<string>; ExtensionAPIs: Map<string, Set<string>> } {
	const GlobalAPIs = new Set<string>();
	const ExtensionAPIs = new Map<string, Set<string>>();

	if (Array.isArray(Configuration)) {
		for (const Proposal of Configuration) {
			GlobalAPIs.add(Proposal);
		}
	} else if (typeof Configuration === "object" && Configuration !== null) {
		for (const Key in Configuration) {
			const Proposals = (Configuration as any)[Key];
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
}

const Definition = Effect.gen(function* () {
	const InitDataService = yield* InitData.Tag;
	const LogService = yield* Log.Tag;

	const ProductConfiguration = ParseConfiguration(
		InitDataService.product?.extensionEnabledApiProposals,
	);
	const EnvironmentConfiguration = ParseConfiguration(
		InitDataService.environment.extensionEnabledProposedApi,
	);

	const AllGlobalAPIs = new Set([
		...ProductConfiguration.GlobalAPIs,
		...EnvironmentConfiguration.GlobalAPIs,
	]);

	const AllExtensionAPIs = new Map(ProductConfiguration.ExtensionAPIs);
	EnvironmentConfiguration.ExtensionAPIs.forEach((Proposals, ExtId) => {
		const Existing = AllExtensionAPIs.get(ExtId) ?? new Set<string>();
		Proposals.forEach((p) => Existing.add(p));
		AllExtensionAPIs.set(ExtId, Existing);
	});

	const ReadonlyExtensionAPIs = HashMap.fromIterable(
		AllExtensionAPIs.entries(),
	);

	yield* LogService.Info(
		`Proposed API provider initialized. Globally enabled: ${AllGlobalAPIs.size}. Per-extension configs: ${HashMap.size(ReadonlyExtensionAPIs)}.`,
	);

	const ServiceImplementation: Interface = {
		IsEnabled: (ExtensionID, ProposalName) => {
			if (AllGlobalAPIs.has(ProposalName)) {
				return true;
			}
			const ExtensionProposals = HashMap.get(
				ReadonlyExtensionAPIs,
				ExtensionID.value,
			);
			if (ExtensionProposals._tag === "Some") {
				return ExtensionProposals.value.has(ProposalName);
			}
			return false;
		},
	};

	return ServiceImplementation;
});

export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(Log.Live));
