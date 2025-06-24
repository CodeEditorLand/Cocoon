/**
 * @module ProposedAPI
 * @description Defines the service for managing and checking the enablement
 * status of proposed (experimental) VS Code APIs for extensions.
 */

import { Effect, HashMap } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { Logger } from "./Logger.js";

type EnabledAPIProposals = Record<string, string[]>;

/**
 * @description An internal helper to parse the `enabledAPIProposals` configuration
 * from `product.json` or environment variables into a structured format.
 * @param Configuration The raw configuration data.
 * @returns An object containing sets of globally-enabled and extension-specific proposals.
 */
const ParseConfiguration = (
	Configuration: string[] | EnabledAPIProposals | undefined,
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

/**
 * @interface ProposedAPI
 * @description The contract for the ProposedAPI service.
 */
export interface ProposedAPI {
	readonly IsEnabled: (
		ExtensionId: ExtensionIdentifier,
		ProposalName: string,
	) => boolean;
}

/**
 * @class ProposedAPI
 * @description The `Effect.Service` for managing proposed APIs. It reads the
 * configuration at startup and provides a synchronous method to check if a
 * specific proposal is enabled for a given extension.
 */
export class ProposedAPIService extends Effect.Service<ProposedAPIService>()(
	"Service/ProposedAPI",
	{
		effect: Effect.gen(function* () {
			const LogService = yield* Logger;
			// NOTE: This implementation remains stubbed as per the original `Definition.ts`.
			// A full implementation would read from `InitData.product.enabledAPIProposals` and `InitData.environment.extensionEnabledAPIProposals`.
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
				(Proposals, ExtensionId) => {
					const Existing =
						AllExtensionAPIs.get(ExtensionId) ?? new Set<string>();
					Proposals.forEach((p) => Existing.add(p));
					AllExtensionAPIs.set(ExtensionId, Existing);
				},
			);
			const ReadonlyExtensionAPIs = HashMap.fromIterable(
				AllExtensionAPIs.entries(),
			);

			yield* LogService.Info(
				"Proposed API provider initialized. No proposals found in InitData. All proposals will be disabled.",
			);

			const IsEnabled = (
				ExtensionId: ExtensionIdentifier,
				ProposalName: string,
			): boolean => {
				if (AllGlobalAPIs.has(ProposalName)) return true;
				const ExtensionProposals = HashMap.get(
					ReadonlyExtensionAPIs,
					ExtensionId.value,
				);
				if (ExtensionProposals._tag === "Some") {
					return ExtensionProposals.value.has(ProposalName);
				}
				return false;
			};

			return { IsEnabled };
		}),
	},
) {}
