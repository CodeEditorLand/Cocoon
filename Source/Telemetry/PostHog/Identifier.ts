/**
 * @module Telemetry/PostHog/Identifier
 * @description
 * Derives the PostHog `distinct_id` for this Cocoon process. Respects an
 * explicit seed (`LAND_POSTHOG_DISTINCT_ID` — useful for CI correlation);
 * else falls back to `land-dev-<user>` so repeated dev sessions from the
 * same account merge into one person in the PostHog project.
 */

export default (Seed: string): string => {
	if (Seed.length > 0) return Seed;

	const Username =
		process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";

	return `land-dev-${Username}`;
};
