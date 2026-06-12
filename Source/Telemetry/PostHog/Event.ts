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
	$app: "fiddee",

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

// Stamp `$trace_id` on every PostHog event so the matching Jaeger span
// can be opened with one click from PostHog. The trace ID is the same
// value `OTLPBridge` returns from `TraceIdentifier()`; setter wired
// from `PostHogBridge.Initialize` after the OTLP module has loaded so
// boot-order concerns don't crash the require graph.
let CurrentTraceIdentifier: string | undefined;

export const SetTraceIdentifier = (Identifier: string): void => {
	CurrentTraceIdentifier = Identifier;
};

export const Enrich = (Properties: Properties): Properties => ({
	...Properties,
	...BaseProperties,
	$node_version: process.version,
	...(CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}),
});

export default { Create, Enrich, SetTraceIdentifier };
