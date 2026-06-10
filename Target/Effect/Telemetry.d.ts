/**
 * @module Effect/Telemetry
 * @description
 * Lean telemetry service singleton - no Effect-TS machinery.
 */
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
    readonly recordMetric: (name: string, value: number, labels?: Record<string, string>) => void;
    readonly startSpan: (name: string, labels?: Record<string, string>) => SpanHandle;
    readonly log: (level: TelemetryLog["level"], message: string, context?: Record<string, unknown>) => void;
    readonly events: ReadonlyArray<TelemetryEvent>;
    readonly getMetrics: (name: string) => ReadonlyArray<TelemetryMetric>;
    readonly getAverageDuration: (name: string) => number;
    readonly getSuccessRate: (name: string) => number;
    readonly flush: () => void;
}
export declare class TelemetryCollectionError extends Error {
    readonly operation: string;
    readonly cause: unknown;
    readonly _tag = "TelemetryCollectionError";
    constructor(operation: string, cause: unknown);
}
export declare const TelemetryTag: {
    _tag: "Cocoon/Telemetry";
};
export declare const Telemetry: {
    _tag: "Cocoon/Telemetry";
};
export declare const TelemetryLive: TelemetryService;
export declare const withSpan: (_name: string, fn: any) => any;
export declare const makeMockTelemetry: () => TelemetryService;
export declare const TelemetryMock: TelemetryService;
export declare const getTelemetry: () => TelemetryService;
//# sourceMappingURL=Telemetry.d.ts.map