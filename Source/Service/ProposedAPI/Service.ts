/*
 * File: Cocoon/Source/Service/ProposedAPI/Service.ts
 * Role: Defines the ProposedAPI service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Manage and check the enablement status of proposed (experimental) VS Code APIs.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, HashMap } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { Logger } from "../Log/Service.js";

type IEnabledApiProposals = Record<string, string[]>;

const ParseConfiguration = (
	Configuration: string[] | IEnabledApiProposals | undefined,
) => {
	const GlobalAPIs = new Set<string>();
	const ExtensionAPIs = new Map<string, Set<string>>();
	if (Array.isArray(Configuration)) {
		for (const Proposal of Configuration) GlobalAPIs.add(Proposal);
	} else if (typeof Configuration === "object" && Configuration !== null) {
		for (const Key in Configuration) {
			const Proposals = (Configuration as any)[Key];
			if (Array.isArray(Proposals)) {
				if (Key === "*") {
					for (const Proposal of Proposals) GlobalAPIs.add(Proposal);
				} else {
					const ExistingSet =
						ExtensionAPIs.get(Key) ?? new Set<string>();
					for (const Proposal of Proposals) ExistingSet.add(Proposal);
					ExtensionAPIs.set(Key, ExistingSet);
				}
			}
		}
	}
	return { GlobalAPIs, ExtensionAPIs };
};

export class ProposedAPI extends Effect.Service<ProposedAPI>()(
	"Service/ProposedAPI",
	{
		effect: Effect.gen(function* (Generator) {
			const LogService = yield* Generator(Logger);
			// NOTE: This implementation remains stubbed as per your original `Definition.ts`.
			const ProductConfiguration = ParseConfiguration(undefined);
			const EnvironmentConfiguration = ParseConfiguration(undefined);
			const AllGlobalAPIs = new Set([
				...ProductConfiguration.GlobalAPIs,
				...EnvironmentConfiguration.GlobalAPIs,
			]);
			const AllExtensionAPIs = new Map(
				ProductConfiguration.ExtensionAPIs,
			);
			EnvironmentConfiguration.ExtensionAPIs.forEach(
				(Proposals, ExtId) => {
					const Existing =
						AllExtensionAPIs.get(ExtId) ?? new Set<string>();
					Proposals.forEach((p) => Existing.add(p));
					AllExtensionAPIs.set(ExtId, Existing);
				},
			);
			const ReadonlyExtensionAPIs = HashMap.fromIterable(
				AllExtensionAPIs.entries(),
			);

			yield* Generator(
				LogService.Info(
					"Proposed API provider initialized. No proposals found in InitData. All proposals will be disabled.",
				),
			);

			const ServiceImplementation = {
				IsEnabled: (
					ExtensionID: ExtensionIdentifier,
					ProposalName: string,
				): boolean => {
					if (AllGlobalAPIs.has(ProposalName)) return true;
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
		}),
	},
) {}
