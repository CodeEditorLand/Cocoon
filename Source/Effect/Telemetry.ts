/**
 * @module Effect/Telemetry
 * @description
 * Atomic telemetry service for Cocoon Extension Host using Effect-TS.
 * Consolidates logging, metrics, and tracing into a unified system.
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
	/** Record a metric value */
	readonly recordMetric: (
		name: string,
		value: number,
		labels?: Record<string, string>,
	) => Effect.Effect<void, never>;

	/** Start a timed span */
	readonly startSpan: (
		name: string,
		labels?: Record<string, string>,
	) => Effect.Effect<SpanHandle, never>;

	/** Log an event */
	readonly log: (
		level: TelemetryLog["level"],
		message: string,
		context?: Record<string, unknown>,
	) => Effect.Effect<void, never>;

	/** Stream of all telemetry events */
	readonly events: Stream.Stream<ReadonlyArray<TelemetryEvent>, never>;

	/** Get metrics by name */
	readonly getMetrics: (
		name: string,
	) => Effect.Effect<ReadonlyArray<TelemetryMetric>, never>;

	/** Get average duration for spans */
	readonly getAverageDuration: (name: string) => Effect.Effect<number, never>;

	/** Get success rate for spans */
	readonly getSuccessRate: (name: string) => Effect.Effect<number, never>;

	/** Flush/clear all telemetry data */
	readonly flush: Effect.Effect<void, never>;
}

/** Handle for an active span */
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
		// Storage for metrics and spans
		const metricsRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, ReadonlyArray<TelemetryMetric>>
		>(HashMap.empty());

		const spansRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, ReadonlyArray<TelemetrySpan>>
		>(HashMap.empty());

		const eventsRef = yield* SubscriptionRef.make<
			ReadonlyArray<TelemetryEvent>
		>([]);

		// Atom: Record a metric
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

				const events = yield* eventsRef.get;
				yield* Ref.set(eventsRef, [
					...events,
					{
						type: "metric",
						timestamp: metric.timestamp,
						data: metric,
					},
				]);

				const currentMetrics = yield* metricsRef.get;
				const nameMetrics = HashMap.get(currentMetrics, name).pipe(
					Option.getOrElse(() => []),
				);

				yield* Ref.set(
					metricsRef,
					HashMap.set(currentMetrics, name, [...nameMetrics, metric]),
				);
			});

		// Atom: Start a span
		const startSpan = (name: string, labels?: Record<string, string>) =>
			Effect.gen(function* () {
				const startTime = Date.now();
				const span: TelemetrySpan = {
					name,
					startTime,
					success: false,
					labels: labels ?? {},
				};

				const events = yield* eventsRef.get;
				yield* Ref.set(eventsRef, [
					...events,
					{ type: "span", timestamp: startTime, data: span },
				]);

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

							const events = yield* eventsRef.get;
							yield* Ref.set(eventsRef, [
								...events,
								{
									type: "span",
									timestamp: endTime,
									data: completedSpan,
								},
							]);

							const currentSpans = yield* spansRef.get;
							const nameSpans = HashMap.get(
								currentSpans,
								name,
							).pipe(Option.getOrElse(() => []));

							yield* Ref.set(
								spansRef,
								HashMap.set(currentSpans, name, [
									...nameSpans,
									completedSpan,
								]),
							);
						}),
				} satisfies SpanHandle;
			});

		// Atom: Log an event
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

				const events = yield* eventsRef.get;
				yield* Ref.set(eventsRef, [
					...events,
					{ type: "log", timestamp, data: logEntry },
				]);

				// Emit via process.stdout.write / process.stderr.write so the
				// line survives esbuild's production `drop: ["console"]` sweep.
				// Context is JSON-encoded inline to keep the output one line
				// per event (parseable by `Trace=long` pipelines).
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
					// Broken pipe on shutdown - swallow silently rather than
					// crashing the extension host fiber mid-telemetry.
				}
			});

		// Atom: Get metrics by name
		const getMetrics = (name: string) =>
			Effect.gen(function* () {
				const metrics = yield* metricsRef.get;
				return HashMap.get(metrics, name).pipe(
					Option.getOrElse(() => []),
				);
			});

		// Atom: Get average duration for spans
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

		// Atom: Get success rate for spans
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

		// Atom: Flush all telemetry data
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

/** Helper to wrap an effect with telemetry span */
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
