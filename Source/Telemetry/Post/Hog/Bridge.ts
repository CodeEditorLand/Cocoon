/**
 * @module Telemetry/PostHogBridge
 * @description
 * Cocoon PostHog bridge. Direct `/batch` POST via `node:https` (no
 * `posthog-node` dep - keeps the bundle out of the extension host's
 * module graph). Batches every `Buffer`
 * (default 3s) and drains on SIGINT/SIGTERM/exit so crash events land.
 * No-op when `Report=false` or `NODE_ENV=production`.
 *
 * Implementation is split across `PostHog/*.ts` - this file composes
 * those atoms and exposes the three call sites the rest of Cocoon uses:
 * `CaptureEvent`, `CaptureError`, `Initialize`.
 */

import CreateBuffer, { type Buffer } from "../../PostHog/Buffer.js";
import ReadConfiguration from "../../PostHog/Configuration.js";
import EventModule, { type Properties } from "../../PostHog/Event.js";
import ResolveDistinctIdentifier from "../../PostHog/Identifier.js";

const Configuration = ReadConfiguration();

const DistinctIdentifier = ResolveDistinctIdentifier(
	Configuration.DistinctIdentifierSeed,
);

let ActiveBuffer: Buffer | undefined;

let Initialized = false;

const Buffered = (): Buffer | undefined => {
	if (!Configuration.Enabled) return undefined;

	if (!ActiveBuffer) {
		ActiveBuffer = CreateBuffer(Configuration, DistinctIdentifier);
	}

	return ActiveBuffer;
};

/**
 * Queue a named event. Never throws.
 */
export const CaptureEvent = (
	Name: string,
	Properties: Properties = {},
): void => {
	// Build-time gate. esbuild substitutes `process.env.NODE_ENV` with
	// the literal `"production"` for prod, the comparison folds, and
	// the entire body (Buffered() lookup, Enqueue, the try/catch) dead-
	// codes. Combined with the call-site gates this guarantees no
	// telemetry function is reached in prod.
	if (process.env["NODE_ENV"] === "production") return;
	try {
		Buffered()?.Enqueue(Name, Properties);
	} catch {
		// Telemetry must not raise into callers.
	}
};

/**
 * Capture an error. Drains immediately so developer-facing errors land
 * in PostHog before the process exits (common on boot crashes).
 */
export const CaptureError = (
	Tag: string,
	Message: string,
	Extra: Properties = {},
): void => {
	if (process.env["NODE_ENV"] === "production") return;
	const Bridge = Buffered();

	if (!Bridge) return;

	Bridge.Enqueue("land:cocoon:error", {
		...Extra,
		error_tag: Tag,
		error_message: Message,
	});

	Bridge.Drain();
};

/**
 * Idempotent init. Registers process-exit drains, then emits
 * `land:cocoon:session:start`.
 */
export const Initialize = (): void => {
	if (process.env["NODE_ENV"] === "production") return;
	if (Initialized) return;

	Initialized = true;

	const Bridge = Buffered();

	if (!Bridge) return;

	// Wire OTLP trace ID into PostHog's event enrichment so every event
	// carries `$trace_id` matching the Jaeger span. Lazy import avoids
	// loading the OTLP module when telemetry is off.
	if (process.env["NODE_ENV"] !== "production") {
		void import("../../OTLPBridge.js")
			.then((OTLP) => {
				EventModule.SetTraceIdentifier(OTLP.TraceIdentifier());
			})
			.catch(() => {});
	}

	const OnExit = () => Bridge.Drain();

	process.once("exit", OnExit);

	process.once("SIGINT", OnExit);

	process.once("SIGTERM", OnExit);

	CaptureEvent("land:cocoon:session:start", {
		pid: process.pid,
		platform: process.platform,
		arch: process.arch,
		node_version: process.version,
	});
};

/**
 * Capture `land:cocoon:handler:complete`. Pair with Mountain's
 * `land:mountain:handler:complete` to populate the Feature Parity
 * dashboard's Node-vs-Rust handler-latency comparison. `Feature` is
 * the wire route key (e.g. `extensions:scanSystem`); `DurationMs` is
 * the handler body, excluding gRPC frame overhead; `Ok` reports
 * whether the handler resolved successfully.
 */
export const CaptureHandler = (
	Feature: string,
	DurationMs: number,
	Ok: boolean,
): void => {
	CaptureEvent("land:cocoon:handler:complete", {
		feature: Feature,
		duration_ms: DurationMs,
		ok: Ok,
	});
};

/**
 * Stub-active marker for Mountain-migration tracking. `Feature` is the
 * wire route key with no Rust implementation yet; `Reason` is a short
 * tag (e.g. `not-implemented`, `forwarded-to-cocoon`). Powers the
 * Mountain Migration Progress chart.
 */
export const CaptureStub = (Feature: string, Reason: string): void => {
	CaptureEvent("land:cocoon:stub:active", {
		feature: Feature,
		reason: Reason,
	});
};

/**
 * Entry-load lifecycle hooks. `EntryLoad` fires before the workbench
 * entry module is required; `EntryLoaded` fires after. The Cocoon
 * Lifecycle dashboard funnels these to detect entry-point regressions.
 */
export const CaptureEntryLoad = (Entry: string): void => {
	CaptureEvent("land:cocoon:entry:load", { entry: Entry });
};

export const CaptureEntryLoaded = (Entry: string, DurationMs: number): void => {
	CaptureEvent("land:cocoon:entry:loaded", {
		entry: Entry,
		duration_ms: DurationMs,
	});
};

export default {
	CaptureEvent,
	CaptureError,
	CaptureHandler,
	CaptureStub,
	CaptureEntryLoad,
	CaptureEntryLoaded,
	Initialize,
};
