/**
 * @module Telemetry/PostHogBridge
 * @description
 * Cocoon PostHog bridge. Direct `/batch` POST via `node:https` (no
 * `posthog-node` dep - keeps the bundle out of the extension host's
 * module graph). Batches every `LAND_POSTHOG_COCOON_BATCH_WINDOW_MS`
 * (default 3s) and drains on SIGINT/SIGTERM/exit so crash events land.
 * No-op when `LAND_POSTHOG_COCOON_ENABLED=false` or `NODE_ENV=production`.
 *
 * Implementation is split across `PostHog/*.ts` - this file composes
 * those atoms and exposes the three call sites the rest of Cocoon uses:
 * `CaptureEvent`, `CaptureError`, `Initialize`.
 */

import CreateBuffer from "./PostHog/Buffer.js";
import type { Buffer } from "./PostHog/Buffer.js";
import ReadConfiguration from "./PostHog/Configuration.js";
import type { Properties } from "./PostHog/Event.js";
import ResolveDistinctIdentifier from "./PostHog/Identifier.js";

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
	const Bridge = Buffered();

	if (!Bridge) return;

	Bridge.Enqueue("cocoon:error", {
		...Extra,
		error_tag: Tag,
		error_message: Message,
	});

	Bridge.Drain();
};

/**
 * Idempotent init. Registers process-exit drains, then emits
 * `cocoon:session:start`.
 */
export const Initialize = (): void => {
	if (Initialized) return;

	Initialized = true;

	const Bridge = Buffered();

	if (!Bridge) return;

	const OnExit = () => Bridge.Drain();

	process.once("exit", OnExit);

	process.once("SIGINT", OnExit);

	process.once("SIGTERM", OnExit);

	CaptureEvent("cocoon:session:start", {
		pid: process.pid,
		platform: process.platform,
		arch: process.arch,
	});
};

export default { CaptureEvent, CaptureError, Initialize };
