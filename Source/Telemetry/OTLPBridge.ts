/**
 * @module Telemetry/OTLPBridge
 * @description
 * Cocoon-side OTLP fire-and-forget span exporter. Mirrors Mountain's
 * `IPC/DevLog/EmitOTLPSpan.rs` shape: a single `resourceSpans` payload
 * POST'd to `OTLPEndpoint/v1/traces` via `node:http`/`node:https`. No
 * SDK, no batching, no retry - intentionally minimal so the extension
 * host's module graph stays small.
 *
 * Tree-shaking: the entire module is imported lazily through a dynamic
 * import gated by `process.env.NODE_ENV !== "production"`, so esbuild's
 * `define` substitution drops it from production bundles.
 *
 * Joining with PostHog: every span ID generated here is stamped onto
 * the matching PostHog event via the `$trace_id` / `$span_id`
 * properties in `PostHogBridge`. Same `_TraceIdentifier` is reused for
 * one Cocoon process so all its spans roll into one Jaeger trace.
 */

import * as NodeHttp from "node:http";

import * as NodeHttps from "node:https";

import ReadConfiguration from "./PostHog/Configuration.js";

const Configuration = ReadConfiguration();

let OTLPAvailable = Configuration.OTLPEnabled;

const RandomHex = (Bytes: number): string => {
	let Output = "";

	for (let Index = 0; Index < Bytes; Index = Index + 1) {
		Output =
			Output +
			Math.floor(Math.random() * 256)
				.toString(16)
				.padStart(2, "0");
	}

	return Output;
};

let TraceIdentifierCached: string | undefined;

export const TraceIdentifier = (): string => {
	if (!TraceIdentifierCached) TraceIdentifierCached = RandomHex(16);

	return TraceIdentifierCached;
};

const NowNano = (): bigint => {
	const Hr = process.hrtime();

	return BigInt(Hr[0]) * 1_000_000_000n + BigInt(Hr[1]);
};

export type SpanAttributes = ReadonlyArray<readonly [string, string]>;

export const CaptureSpan = (
	Name: string,

	StartNano: bigint,

	EndNano: bigint,

	Attributes: SpanAttributes = [],
): void => {
	// Build-time gate: esbuild folds `process.env.NODE_ENV` to the
	// literal `"production"` for prod, this comparison becomes
	// `"production" !== "production"` → `false` → early-return. Every
	// JSON.stringify / span payload below is then dead-coded in prod.
	if (process.env["NODE_ENV"] === "production") return;

	if (!OTLPAvailable) return;

	const SpanIdentifier = RandomHex(8);

	const TraceIdentifierResolved = TraceIdentifier();

	const StatusCode = Name.includes("error") ? 2 : 1;

	const AttributesPayload = Attributes.map(([Key, Value]) => ({
		key: Key,
		value: { stringValue: Value },
	}));

	const Payload = JSON.stringify({
		resourceSpans: [
			{
				resource: {
					attributes: [
						{
							key: "service.name",
							value: { stringValue: "land-editor-cocoon" },
						},
						{
							key: "service.version",
							value: { stringValue: "0.0.1" },
						},
						{
							key: "land.tier",
							value: { stringValue: "cocoon" },
						},
					],
				},
				scopeSpans: [
					{
						scope: { name: "land.cocoon", version: "1.0.0" },
						spans: [
							{
								traceId: TraceIdentifierResolved,
								spanId: SpanIdentifier,
								name: Name,
								kind: 1,
								startTimeUnixNano: StartNano.toString(),
								endTimeUnixNano: EndNano.toString(),
								attributes: AttributesPayload,
								status: { code: StatusCode },
							},
						],
					},
				],
			},
		],
	});

	try {
		const Address = new URL("/v1/traces", Configuration.OTLPEndpoint);

		const HttpModule = Address.protocol === "https:" ? NodeHttps : NodeHttp;

		const Request = HttpModule.request(
			{
				method: "POST",
				hostname: Address.hostname,
				port:
					Address.port || (Address.protocol === "https:" ? 443 : 80),
				path: Address.pathname,
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(Payload),
				},
				timeout: 200,
			},

			(Response) => {
				if (
					Response.statusCode === undefined ||
					Response.statusCode >= 300
				) {
					OTLPAvailable = false;
				}

				Response.resume();
			},
		);

		Request.on("error", () => {
			OTLPAvailable = false;
		});

		Request.on("timeout", () => {
			Request.destroy(;
		};

		Request.write(Payload;

		Request.end(;
	} catch {
		OTLPAvailable = false;
	}
};

/**
 * Convenience wrapper that times an async function and emits a span
 * named `Name` with the elapsed window. Same span ID is the parent of
 * any spans emitted by the body. Errors are swallowed - returns
 * `undefined` and stamps `error=true` on the span.
 */
export const WithSpan = async <Result>(
	Name: string,

	Body: () => Promise<Result>,

	Attributes: SpanAttributes = [],
): Promise<Result> => {
	const StartNano = NowNano(;

	try {
		const Output = await Body(;

		const EndNano = NowNano(;

		CaptureSpan(Name, StartNano, EndNano, Attributes;

		return Output;
	} catch (Error) {
		const EndNano = NowNano(;

		CaptureSpan(`${Name}:error`, StartNano, EndNano, [
			...Attributes,

			["error", String((Error as Error).message ?? Error)],
		];

		throw Error;
	}
};

export default { CaptureSpan, TraceIdentifier, WithSpan };
