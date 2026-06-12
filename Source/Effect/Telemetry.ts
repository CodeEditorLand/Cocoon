/**
 * @module Effect/Telemetry
 * @description
 * Lean telemetry service singleton - no Effect-TS machinery.
 */

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

export interface SpanHandle {
	readonly end: (success: boolean, error?: string) => void;
}

export interface TelemetryService {
	readonly recordMetric: (
		name: string,

		value: number,

		labels?: Record<string, string>,
	) => void;

	readonly startSpan: (
		name: string,

		labels?: Record<string, string>,
	) => SpanHandle;

	readonly log: (
		level: TelemetryLog["level"],

		message: string,

		context?: Record<string, unknown>,
	) => void;

	readonly events: ReadonlyArray<TelemetryEvent>;

	readonly getMetrics: (name: string) => ReadonlyArray<TelemetryMetric>;

	readonly getAverageDuration: (name: string) => number;

	readonly getSuccessRate: (name: string) => number;

	readonly flush: () => void;
}

// ============================================================================
// ERROR
// ============================================================================

export class TelemetryCollectionError extends Error {
	readonly _tag = "TelemetryCollectionError";

	constructor(
		readonly operation: string,

		override readonly cause: unknown,
	) {
		super(
			`Telemetry collection failed for '${operation}': ${String(cause)}`,
		;
	}
}

// ============================================================================
// TAG (plain marker)
// ============================================================================

export const TelemetryTag = { _tag: "Cocoon/Telemetry" as const };

export const Telemetry = TelemetryTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

const MAX_EVENTS = 1_000;

const MAX_PER_NAME = 100;

function makeTelemetry(): TelemetryService {
	const metrics = new Map<string, TelemetryMetric[]>(;

	const spans = new Map<string, TelemetrySpan[]>(;

	const eventsList: TelemetryEvent[] = [];

	const pushEvent = (ev: TelemetryEvent) => {
		eventsList.push(ev;

		if (eventsList.length > MAX_EVENTS) eventsList.shift(;
	};

	const recordMetric = (
		name: string,

		value: number,

		labels?: Record<string, string>,
	) => {
		const metric: TelemetryMetric = {
			name,

			value,

			timestamp: Date.now(),

			labels: labels ?? undefined,
		};

		const existing = metrics.get(name) ?? [];

		metrics.set(name, [...existing, metric].slice(-MAX_PER_NAME);

		pushEvent({ type: "metric", timestamp: Date.now(), data: metric };
	};

	const startSpan = (
		name: string,

		labels?: Record<string, string>,
	): SpanHandle => {
		const startTime = Date.now(;

		return {
			end: (success: boolean, error?: string) => {
				const endTime = Date.now(;

				const span: TelemetrySpan = {
					name,

					startTime,

					endTime,

					duration: endTime - startTime,

					success,

					error: error ?? "",

					labels: labels ?? {},
				};

				const existing = spans.get(name) ?? [];

				spans.set(name, [...existing, span].slice(-MAX_PER_NAME);

				pushEvent({ type: "span", timestamp: Date.now(), data: span };
			},
		};
	};

	const log = (
		level: TelemetryLog["level"],

		message: string,

		context?: Record<string, unknown>,
	) => {
		const entry: TelemetryLog = { level, message, context: context ?? {} };

		pushEvent({ type: "log", timestamp: Date.now(), data: entry };

		if (typeof performance !== "undefined") {
			try {
				performance.mark(
					`land:telemetry:${level}:${message.slice(0, 80)}`,
				;
			} catch {}
		}
	};

	return {
		recordMetric,

		startSpan,

		log,

		get events() {
			return [...eventsList] as const;
		},

		getMetrics: (name) => [...(metrics.get(name) ?? [])] as const,

		getAverageDuration: (name) => {
			const ss = spans.get(name) ?? [];

			if (!ss.length) return 0;

			return ss.reduce((s, sp) => s + (sp.duration || 0), 0) / ss.length;
		},

		getSuccessRate: (name) => {
			const ss = spans.get(name) ?? [];

			if (!ss.length) return 0;

			return ss.filter((s) => s.success).length / ss.length;
		},

		flush: () => {},
	};
}

export const TelemetryLive: TelemetryService = makeTelemetry(;

// withSpan: pass-through (no Effect tracing overhead)
export const withSpan = (_name: string, fn: any) => fn;

export const makeMockTelemetry = (): TelemetryService => ({
	recordMetric: () => {},
	startSpan: () => ({ end: () => {} }),
	log: () => {},
	events: [],
	getMetrics: () => [],
	getAverageDuration: () => 0,
	getSuccessRate: () => 1.0,
	flush: () => {},
};

export const TelemetryMock: TelemetryService = makeMockTelemetry(;

export const getTelemetry = (): TelemetryService => TelemetryLive;
