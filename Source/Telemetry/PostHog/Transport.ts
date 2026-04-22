/**
 * @module Telemetry/PostHog/Transport
 * @description
 * POST a batch of events to PostHog's `/batch/` endpoint via `node:https`.
 * Silent on failure — telemetry must never raise into the extension host.
 * Response body is drained without inspection; only status signals matter
 * and those are sampled separately via PostHog's own project dashboards.
 */

import * as NodeHttps from "node:https";

import Event from "./Event.js";
import type { Event as QueuedEvent } from "./Event.js";

const RequestTimeoutMilliseconds = 5000;

export default (
	Host: string,
	Key: string,
	DistinctIdentifier: string,
	Batch: ReadonlyArray<QueuedEvent>,
): void => {
	if (Batch.length === 0) return;

	const Payload = JSON.stringify({
		api_key: Key,
		batch: Batch.map((Entry) => ({
			event: Entry.Name,
			timestamp: Entry.Timestamp,
			distinct_id: DistinctIdentifier,
			properties: Event.Enrich(Entry.Properties),
		})),
	});

	try {
		const Address = new URL("/batch/", Host);

		const Request = NodeHttps.request(
			{
				method: "POST",
				hostname: Address.hostname,
				port: Address.port || 443,
				path: Address.pathname,
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(Payload),
				},
				timeout: RequestTimeoutMilliseconds,
			},
			(Response) => {
				Response.resume();
			},
		);

		Request.on("error", () => {});

		Request.on("timeout", () => {
			Request.destroy();
		});

		Request.write(Payload);

		Request.end();
	} catch {
		// URL parse or synchronous throw — drop the batch silently.
	}
};
