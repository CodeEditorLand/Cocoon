/**
 * @module Telemetry/PostHogBridge
 * @description
 * Cocoon-side PostHog telemetry bridge. Atom PH3.
 *
 * Cocoon is a bundled Node.js sidecar - installing the full `posthog-node`
 * SDK pulls transitive deps into the ESM bundle that exceed our size
 * budget and conflict with the VS Code extension host's own module
 * graph. Instead we post directly to PostHog's `/batch` HTTP endpoint
 * with a minimal buffered client. Same payload shape as the official
 * SDK; batches every 3s (configurable via `.env.Land.PostHog`) so we
 * never hit the server-side rate limit the Sky side was running into.
 *
 * All captures are no-ops when:
 *   • `LAND_POSTHOG_COCOON_ENABLED` is "false"
 *   • Cocoon's NODE_ENV != "development" (production default)
 *   • The process is running under LAND_SPAWN_COCOON=false (no Mountain pair)
 *
 * Event taxonomy mirrors the Sky side - a single PostHog project sees
 * events from every tier with `$component` / `$tier` distinguishing them.
 */

import * as NodeHttps from "node:https";

type EventProperties = Record<string, unknown>;

type QueuedEvent = {
	event: string;
	timestamp: string;
	properties: EventProperties;
};

const ReadEnvString = (Key: string, Fallback: string): string => {
	const Value = process.env[Key];
	return Value && Value.length > 0 ? Value : Fallback;
};

const ReadEnvBoolean = (Key: string, Fallback: boolean): boolean => {
	const Value = process.env[Key];
	if (Value === undefined) return Fallback;
	return !["false", "0", "off", ""].includes(Value.toLowerCase());
};

const ReadEnvNumber = (Key: string, Fallback: number): number => {
	const Value = process.env[Key];
	const Parsed = Value ? Number(Value) : NaN;
	return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
};

const PostHogKey = ReadEnvString(
	"LAND_POSTHOG_KEY",
	"phc_mCwHy7LgvbnEqh6a2DyMiLUJcaZvmmj7JNmmpQzvr7mA",
);
const PostHogHost = ReadEnvString(
	"LAND_POSTHOG_HOST",
	"https://eu.i.posthog.com",
);
const PostHogEnabled = ReadEnvBoolean("LAND_POSTHOG_COCOON_ENABLED", true);
const BatchWindowMs = ReadEnvNumber(
	"LAND_POSTHOG_COCOON_BATCH_WINDOW_MS",
	3000,
);
const BatchMax = ReadEnvNumber("LAND_POSTHOG_COCOON_BATCH_MAX", 50);

const DistinctIdSeed = process.env["LAND_POSTHOG_DISTINCT_ID"] ?? "";
const Username =
	process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
const DistinctId =
	DistinctIdSeed.length > 0 ? DistinctIdSeed : `land-dev-${Username}`;

let Queue: QueuedEvent[] = [];
let FlushTimer: NodeJS.Timeout | undefined;
let Initialized = false;

const CaptureAllowed = (): boolean => {
	if (!PostHogEnabled) return false;
	if (process.env["NODE_ENV"] === "production") return false;
	return true;
};

const Flush = (): void => {
	if (Queue.length === 0) return;
	const Pending = Queue;
	Queue = [];
	const Payload = JSON.stringify({
		api_key: PostHogKey,
		batch: Pending.map((E) => ({
			event: E.event,
			timestamp: E.timestamp,
			distinct_id: DistinctId,
			properties: {
				...E.properties,
				$app: "land-editor",
				$app_version: "0.0.1",
				$build_mode: "debug",
				$component: "cocoon",
				$tier: "cocoon",
				$lib: "cocoon-posthog-bridge",
				$node_version: process.version,
			},
		})),
	});

	try {
		const Url = new URL("/batch/", PostHogHost);
		const Request = NodeHttps.request(
			{
				method: "POST",
				hostname: Url.hostname,
				port: Url.port || 443,
				path: Url.pathname,
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(Payload),
				},
				timeout: 5000,
			},
			(Response) => {
				Response.resume(); // drain - don't care about response body
			},
		);
		Request.on("error", () => {
			// Silent - telemetry failures must not crash the extension host.
		});
		Request.on("timeout", () => {
			Request.destroy();
		});
		Request.write(Payload);
		Request.end();
	} catch {
		// If URL/host is malformed or node_https throws synchronously, we
		// drop the batch - upstream always has the same error in stdout
		// via the NotificationHandler safety nets.
	}
};

const ScheduleFlush = (): void => {
	if (FlushTimer) return;
	FlushTimer = setTimeout(() => {
		FlushTimer = undefined;
		Flush();
	}, BatchWindowMs);
	(FlushTimer as any).unref?.();
};

/**
 * Queue a named event. Low-overhead path: shape the event, push into the
 * buffer, schedule a flush. Never throws.
 */
export const CaptureEvent = (
	Event: string,
	Properties: EventProperties = {},
): void => {
	if (!CaptureAllowed()) return;
	try {
		Queue.push({
			event: Event,
			timestamp: new Date().toISOString(),
			properties: Properties,
		});
		if (Queue.length >= BatchMax) {
			Flush();
		} else {
			ScheduleFlush();
		}
	} catch {
		// Never let telemetry raise into the caller.
	}
};

/**
 * Capture an error. Flushes immediately so developer-facing errors land
 * in PostHog before the process exits (common for crashes on boot).
 */
export const CaptureError = (
	Tag: string,
	Message: string,
	Extra: EventProperties = {},
): void => {
	if (!CaptureAllowed()) return;
	Queue.push({
		event: "cocoon:error",
		timestamp: new Date().toISOString(),
		properties: {
			...Extra,
			error_tag: Tag,
			error_message: Message,
		},
	});
	Flush();
};

/**
 * Initialize the bridge. Registers a process-exit hook that drains the
 * queue so the last few events aren't lost. Idempotent.
 */
export const Initialize = (): void => {
	if (Initialized) return;
	Initialized = true;
	if (!CaptureAllowed()) return;
	// Drain on exit so the final error event lands before the sidecar dies.
	const FlushOnExit = () => {
		try {
			Flush();
		} catch {}
	};
	process.once("exit", FlushOnExit);
	process.once("SIGINT", FlushOnExit);
	process.once("SIGTERM", FlushOnExit);
	CaptureEvent("cocoon:session:start", {
		pid: process.pid,
		platform: process.platform,
		arch: process.arch,
	});
};

export default {
	CaptureEvent,
	CaptureError,
	Initialize,
};
