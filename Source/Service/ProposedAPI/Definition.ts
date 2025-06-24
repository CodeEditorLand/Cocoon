/*
 * File: Cocoon/Source/Service/ProposedAPI/Definition.ts
 *
 * This file contains the live implementation of the ProposedAPI service.
 */

import { Effect, HashMap } from "effect";

import LogService from "../Log/Service.js";
import type Service from "./Service.js";

type IEnabledApiProposals = Record<string, string[]>;

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
	const Log = yield* LogService;

	// NOTE: The `IExtensionHostInitData` interface does not contain a `product` property,
	// nor does `IEnvironment` contain `extensionEnabledApiProposals`. This is a
	// divergence from VS Code's setup. This implementation is stubbed to be
	// 'disabled' until the data source contract is updated.
	const ProductConfiguration = ParseConfiguration(undefined);
	const EnvironmentConfiguration = ParseConfiguration(undefined);

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
		`Proposed API provider initialized. No proposals found in InitData. All proposals will be disabled.`,
	);

	const ServiceImplementation: Service = {
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
