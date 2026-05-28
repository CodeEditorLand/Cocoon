/**
 * @module Effect/Telemetry
 * @description
 * Telemetry service consolidating logging, metrics, and tracing via Effect-TS.
 */

import {
	Context,
	Effect,
	HashMap,
	Layer,
	Option,
	Ref,
	Stream,
	SubscriptionRef,
} from "effect";

// ============================================================================
// BUDGET LIMITS - soft caps; excess data dropped silently.
// ============================================================================
const MAX_EVENTS = 1_000;

const MAX_METRICS_PER_NAME = 100;

const MAX_SPANS_PER_NAME = 100;

// ============================================================================
// TYPES
// ============================================================================

export interface TelemetryMetric {
	readonly name: string;

	readonly value: number;

	readonly timestamp: number;

	readonly labels: Readonly<Record<string, string>> | undefined;
}

export interface TelemetrySpan {
	readonly name: string;

	readonly startTime: number;

	readonly endTime?: number;

	readonly duration?: number;

	readonly success: boolean;

	readonly error?: string;

	readonly labels?: Readonly<Record<string, string>>;
}

export interface TelemetryEvent {
	readonly type: "metric" | "span" | "log";

	readonly timestamp: number;

	readonly data: TelemetryMetric | TelemetrySpan | TelemetryLog;
}

export interface TelemetryLog {
	readonly level: "debug" | "info" | "warn" | "error";

	readonly message: string;

	readonly context?: Record<string, unknown>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class TelemetryCollectionError extends Error {
	readonly _tag = "TelemetryCollectionError";

	constructor(
		readonly operation: string,

		override readonly cause: unknown,
	) {
		super(
			`Telemetry collection failed for '${operation}': ${String(cause)}`,
		);
	}
}

// ============================================================================
// TELEMETRY SERVICE INTERFACE
// ============================================================================

export interface TelemetryService {
	/** Record metric */
	readonly recordMetric: (
		name: string,

		value: number,

		labels?: Record<string, string>,
	) => Effect.Effect<void, never>;

	/** Start timed span */
	readonly startSpan: (
		name: string,

		labels?: Record<string, string>,
	) => Effect.Effect<SpanHandle, never>;

	/** Log event */
	readonly log: (
		level: TelemetryLog["level"],

		message: string,

		context?: Record<string, unknown>,
	) => Effect.Effect<void, never>;

	/** Event stream */
	readonly events: Stream.Stream<ReadonlyArray<TelemetryEvent>, never>;

	/** Get metrics */
	readonly getMetrics: (
		name: string,
	) => Effect.Effect<ReadonlyArray<TelemetryMetric>, never>;

	/** Get average duration */
	readonly getAverageDuration: (name: string) => Effect.Effect<number, never>;

	/** Get success rate */
	readonly getSuccessRate: (name: string) => Effect.Effect<number, never>;

	/** Flush all data */
	readonly flush: Effect.Effect<void, never>;
}

/** Active span handle */
export interface SpanHandle {
	readonly end: (
		success: boolean,

		error?: string,
	) => Effect.Effect<void, never>;
}

export class TelemetryTag extends Context.Tag("Cocoon/Telemetry")<
	TelemetryTag,
	TelemetryService
>() {}

export const Telemetry = TelemetryTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export const TelemetryLive = Layer.effect(
	Telemetry,

	Effect.gen(function* () {
		// In-memory metric, span, and event stores
		const metricsRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, ReadonlyArray<TelemetryMetric>>
		>(HashMap.empty());

		const spansRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, ReadonlyArray<TelemetrySpan>>
		>(HashMap.empty());

		const eventsRef = yield* SubscriptionRef.make<TelemetryEvent[]>([]);

		// Record metric - O(1) push with bounded trim
		const recordMetric = (
			name: string,

			value: number,

			labels?: Record<string, string>,
		) =>
			Effect.gen(function* () {
				const metric: TelemetryMetric = {
					name,
					value,
					timestamp: Date.now(),
					labels,
				};

				// Push with bounded cap
				const events = yield* eventsRef.get;

				events.push({
					type: "metric",
					timestamp: metric.timestamp,
					data: metric,
				});

				if (events.length > MAX_EVENTS) {
					events.splice(0, events.length - MAX_EVENTS);
				}

				yield* Ref.set(eventsRef, events);

				// Push under name key - bounded per name
				const currentMetrics = yield* metricsRef.get;

				const nameMetrics = HashMap.get(currentMetrics, name).pipe(
					Option.getOrElse(() => []),
				);

				nameMetrics.push(metric);

				if (nameMetrics.length > MAX_METRICS_PER_NAME) {
					nameMetrics.splice(
						0,

						nameMetrics.length - MAX_METRICS_PER_NAME,
					);
				}

				yield* Ref.set(
					metricsRef,

					HashMap.set(currentMetrics, name, nameMetrics),
				);
			});

		// Start span - O(1) push with bounded cap
		const startSpan = (name: string, labels?: Record<string, string>) =>
			Effect.gen(function* () {
				const startTime = Date.now();

				const span: TelemetrySpan = {
					name,
					startTime,
					success: false,
					labels: labels ?? {},
				};

				// Push start event
				const events = yield* eventsRef.get;

				events.push({
					type: "span",
					timestamp: startTime,
					data: span,
				});

				if (events.length > MAX_EVENTS) {
					events.splice(0, events.length - MAX_EVENTS);
				}

				yield* Ref.set(eventsRef, events);

				return {
					end: (success: boolean, error?: string) =>
						Effect.gen(function* () {
							const endTime = Date.now();

							const completedSpan: TelemetrySpan = {
								...span,
								endTime,
								duration: endTime - startTime,
								success,
								error,
							};

							// Push end event
							const events = yield* eventsRef.get;

							events.push({
								type: "span",
								timestamp: endTime,
								data: completedSpan,
							});

							if (events.length > MAX_EVENTS) {
								events.splice(0, events.length - MAX_EVENTS);
							}

							yield* Ref.set(eventsRef, events);

							const currentSpans = yield* spansRef.get;

							const nameSpans = HashMap.get(
								currentSpans,

								name,
							).pipe(Option.getOrElse(() => []));

							// Push under name key
							nameSpans.push(completedSpan);

							if (nameSpans.length > MAX_SPANS_PER_NAME) {
								nameSpans.splice(
									0,

									nameSpans.length - MAX_SPANS_PER_NAME,
								);
							}

							yield* Ref.set(
								spansRef,

								HashMap.set(currentSpans, name, nameSpans),
							);
						}),
				} satisfies SpanHandle;
			});

		// Log event - O(1) push with bounded cap
		const log = (
			level: TelemetryLog["level"],

			message: string,

			context?: Record<string, unknown>,
		) =>
			Effect.gen(function* () {
				const logEntry: TelemetryLog = {
					level,
					message,
					context: context as Record<string, unknown> | undefined,
				};

				const timestamp = Date.now();

				// Push log event
				const events = yield* eventsRef.get;

				events.push({ type: "log", timestamp, data: logEntry });

				if (events.length > MAX_EVENTS) {
					events.splice(0, events.length - MAX_EVENTS);
				}

				yield* Ref.set(eventsRef, events);

				// Write directly to stdout/stderr (survives esbuild console drop).
				// Context JSON-encoded inline for single-line parseable output.
				const Prefix = `[Cocoon Telemetry] [${level.toUpperCase()}]`;

				let ContextText = "";

				if (context && Object.keys(context).length > 0) {
					try {
						ContextText = ` ${JSON.stringify(context)}`;
					} catch {
						ContextText = " [unserializable-context]";
					}
				}

				const Line = `${Prefix} ${message}${ContextText}\n`;

				const Stream =
					level === "error" ? process.stderr : process.stdout;

				try {
					Stream.write(Line);
				} catch {
					// Broken pipe on shutdown - swallow silently.
				}
			});

		// Get metrics by name
		const getMetrics = (name: string) =>
			Effect.gen(function* () {
				const metrics = yield* metricsRef.get;

				return HashMap.get(metrics, name).pipe(
					Option.getOrElse(() => []),
				);
			});

		// Get average duration
		const getAverageDuration = (name: string) =>
			Effect.gen(function* () {
				const spans = yield* spansRef.get;

				const nameSpans = HashMap.get(spans, name).pipe(
					Option.getOrElse(() => []),
				);

				if (nameSpans.length === 0) {
					return 0;
				}

				const totalDuration = nameSpans.reduce(
					(sum: number, span: TelemetrySpan) => {
						return sum + (span.duration ?? 0);
					},

					0,
				);

				return totalDuration / nameSpans.length;
			});

		// Get success rate
		const getSuccessRate = (name: string) =>
			Effect.gen(function* () {
				const spans = yield* spansRef.get;

				const nameSpans = HashMap.get(spans, name).pipe(
					Option.getOrElse(() => []),
				);

				if (nameSpans.length === 0) {
					return 1.0;
				}

				const successCount = nameSpans.filter(
					(span: TelemetrySpan) => span.success,
				).length;

				return successCount / nameSpans.length;
			});

		// Flush all data
		const flush = Effect.gen(function* () {
			yield* Ref.set(metricsRef, HashMap.empty());

			yield* Ref.set(spansRef, HashMap.empty());

			yield* Ref.set(eventsRef, []);
		});

		return {
			recordMetric,
			startSpan,
			log,
			events: eventsRef.changes,
			getMetrics,
			getAverageDuration,
			getSuccessRate,
			flush,
		} satisfies TelemetryService;
	}),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockTelemetry = (): TelemetryService => ({
	recordMetric: () => Effect.void,
	startSpan: () =>
		Effect.succeed({
			end: () => Effect.void,
		}),
	log: (level, message, context) =>
		Effect.sync(() => {
			const Prefix = `[Cocoon Telemetry Mock] [${level.toUpperCase()}]`;

			let ContextText = "";

			if (context && Object.keys(context).length > 0) {
				try {
					ContextText = ` ${JSON.stringify(context)}`;
				} catch {
					ContextText = " [unserializable-context]";
				}
			}

			const Stream = level === "error" ? process.stderr : process.stdout;

			try {
				Stream.write(`${Prefix} ${message}${ContextText}\n`);
			} catch {}
		}),
	events: Stream.empty,
	getMetrics: () => Effect.succeed([]),
	getAverageDuration: () => Effect.succeed(0),
	getSuccessRate: () => Effect.succeed(1.0),
	flush: Effect.void,
});

export const TelemetryMock = Layer.effect(
	Telemetry,

	Effect.succeed(makeMockTelemetry()),
);

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/** Wrap an effect with telemetry span */
export const withSpan = <A, E, R>(
	name: string,

	effect: Effect.Effect<A, E, R>,

	labels?: Record<string, string>,
) =>
	Effect.gen(function* () {
		const telemetry = yield* Telemetry;

		const span = yield* telemetry.startSpan(name, labels);

		const result = yield* effect.pipe(
			Effect.catchAll((error: unknown) =>
				Effect.gen(function* () {
					yield* span.end(false, String(error));

					return yield* Effect.fail(error);
				}),
			),
		);

		yield* span.end(true);

		return result;
	});
