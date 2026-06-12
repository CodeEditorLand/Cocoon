/**
 * @module Services/InitData
 * @description Extension host initialization data service tag.
 */

export interface InitData {
	readonly commit: string;

	readonly version: string;

	readonly parentPid: number;

	readonly extensions: ReadonlyArray<unknown>;

	readonly workspace: unknown;

	readonly environment: Record<string, unknown>;
}

// InitDataService was a Symbol; now a plain type
export type InitDataService = InitData;

// Atom I5: single source of truth is .env.Land → Maintain/Script/
// TierEnvironment.sh → process.env. `ProductVersion` / `ProductCommit`
// reach Cocoon because Mountain spawns it with the same environment
// block that sourced .env.Land. Fall back to VS Code base + "dev" if
// the env vars are somehow missing so the extension host still boots.
const ResolvedVersion = process.env["ProductVersion"] ?? "1.118.0";

const ResolvedCommit = process.env["ProductCommit"] ?? "dev";

export const InitDataLive = {
	commit: ResolvedCommit,

	version: ResolvedVersion,

	parentPid: process.pid,

	extensions: [],

	workspace: null,

	environment: {},
};

export default InitData;
