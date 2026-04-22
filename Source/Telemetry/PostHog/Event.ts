/**
 * @module Telemetry/PostHog/Event
 * @description
 * Shape for a PostHog event queued in Cocoon's buffer. Mirrors the
 * official SDK payload - `event`, `timestamp`, `distinct_id`,
 * `properties` - so the server accepts our direct `/batch` POST
 * without envelope changes.
 */

export type Properties = Record<string, unknown>;

export type Event = {
	readonly Name: string;
	readonly Timestamp: string;
	readonly Properties: Properties;
};

const BaseProperties: Properties = {
	$app: "land-editor",
	$app_version: "0.0.1",
	$build_mode: "debug",
	$component: "cocoon",
	$tier: "cocoon",
	$lib: "cocoon-posthog-bridge",
};

export const Create = (Name: string, Properties: Properties = {}): Event => ({
	Name,
	Timestamp: new Date().toISOString(),
	Properties,
});

export const Enrich = (Properties: Properties): Properties => ({
	...Properties,
	...BaseProperties,
	$node_version: process.version,
});

export default { Create, Enrich };
