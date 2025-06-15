/**
 * @module Definition (ProposedAPI)
 * @description The live implementation of the ProposedAPI service.
 */

import { Effect, HashMap } from "effect";
import type { IEnabledApiProposals } from "vs/platform/extensions/common/extensions.js";

import InitDataService from "../InitData/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

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

export default Effect.gen(function* () {
	const InitData = yield* InitDataService;
	const Log = yield* LogService;

	const ProductConfiguration = ParseConfiguration(
		(InitData.product as any)?.extensionEnabledApiProposals,
	);
	const EnvironmentConfiguration = ParseConfiguration(
		(InitData.environment as any).extensionEnabledProposedApi,
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

	yield* Log.Info(
		`Proposed API provider initialized. Globally enabled: ${AllGlobalAPIs.size}. Per-extension configs: ${HashMap.size(ReadonlyExtensionAPIs)}.`,
	);

	const ServiceImplementation: Service["Type"] = {
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
