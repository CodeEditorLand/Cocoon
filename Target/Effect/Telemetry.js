var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Effect/Telemetry.ts
import {
  Context,
  Effect,
  HashMap,
  Layer,
  Option,
  Ref,
  Stream,
  SubscriptionRef
} from "effect";
var TelemetryCollectionError = class extends Error {
  constructor(operation, cause) {
    super(
      `Telemetry collection failed for '${operation}': ${String(cause)}`
    );
    this.operation = operation;
    this.cause = cause;
  }
  operation;
  cause;
  static {
    __name(this, "TelemetryCollectionError");
  }
  _tag = "TelemetryCollectionError";
};
var TelemetryTag = class extends Context.Tag("Cocoon/Telemetry")() {
  static {
    __name(this, "TelemetryTag");
  }
};
var Telemetry = TelemetryTag;
var TelemetryLive = Layer.effect(
  Telemetry,
  Effect.gen(function* () {
    const metricsRef = yield* SubscriptionRef.make(HashMap.empty());
    const spansRef = yield* SubscriptionRef.make(HashMap.empty());
    const eventsRef = yield* SubscriptionRef.make([]);
    const recordMetric = /* @__PURE__ */ __name((name, value, labels) => Effect.gen(function* () {
      const metric = {
        name,
        value,
        timestamp: Date.now(),
        labels
      };
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        {
          type: "metric",
          timestamp: metric.timestamp,
          data: metric
        }
      ]);
      const currentMetrics = yield* metricsRef.get;
      const nameMetrics = HashMap.get(currentMetrics, name).pipe(
        Option.getOrElse(() => [])
      );
      yield* Ref.set(
        metricsRef,
        HashMap.set(currentMetrics, name, [...nameMetrics, metric])
      );
    }), "recordMetric");
    const startSpan = /* @__PURE__ */ __name((name, labels) => Effect.gen(function* () {
      const startTime = Date.now();
      const span = {
        name,
        startTime,
        success: false,
        labels: labels ?? {}
      };
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        { type: "span", timestamp: startTime, data: span }
      ]);
      return {
        end: /* @__PURE__ */ __name((success, error) => Effect.gen(function* () {
          const endTime = Date.now();
          const completedSpan = {
            ...span,
            endTime,
            duration: endTime - startTime,
            success,
            error
          };
          const events2 = yield* eventsRef.get;
          yield* Ref.set(eventsRef, [
            ...events2,
            {
              type: "span",
              timestamp: endTime,
              data: completedSpan
            }
          ]);
          const currentSpans = yield* spansRef.get;
          const nameSpans = HashMap.get(
            currentSpans,
            name
          ).pipe(Option.getOrElse(() => []));
          yield* Ref.set(
            spansRef,
            HashMap.set(currentSpans, name, [
              ...nameSpans,
              completedSpan
            ])
          );
        }), "end")
      };
    }), "startSpan");
    const log = /* @__PURE__ */ __name((level, message, context) => Effect.gen(function* () {
      const logEntry = {
        level,
        message,
        context
      };
      const timestamp = Date.now();
      const events = yield* eventsRef.get;
      yield* Ref.set(eventsRef, [
        ...events,
        { type: "log", timestamp, data: logEntry }
      ]);
      const Prefix = `[Cocoon Telemetry] [${level.toUpperCase()}]`;
      let ContextText = "";
      if (context && Object.keys(context).length > 0) {
        try {
          ContextText = ` ${JSON.stringify(context)}`;
        } catch {
          ContextText = " [unserializable-context]";
        }
      }
      const Line = `${Prefix} ${message}${ContextText}
`;
      const Stream2 = level === "error" ? process.stderr : process.stdout;
      try {
        Stream2.write(Line);
      } catch {
      }
    }), "log");
    const getMetrics = /* @__PURE__ */ __name((name) => Effect.gen(function* () {
      const metrics = yield* metricsRef.get;
      return HashMap.get(metrics, name).pipe(
        Option.getOrElse(() => [])
      );
    }), "getMetrics");
    const getAverageDuration = /* @__PURE__ */ __name((name) => Effect.gen(function* () {
      const spans = yield* spansRef.get;
      const nameSpans = HashMap.get(spans, name).pipe(
        Option.getOrElse(() => [])
      );
      if (nameSpans.length === 0) {
        return 0;
      }
      const totalDuration = nameSpans.reduce(
        (sum, span) => {
          return sum + (span.duration ?? 0);
        },
        0
      );
      return totalDuration / nameSpans.length;
    }), "getAverageDuration");
    const getSuccessRate = /* @__PURE__ */ __name((name) => Effect.gen(function* () {
      const spans = yield* spansRef.get;
      const nameSpans = HashMap.get(spans, name).pipe(
        Option.getOrElse(() => [])
      );
      if (nameSpans.length === 0) {
        return 1;
      }
      const successCount = nameSpans.filter(
        (span) => span.success
      ).length;
      return successCount / nameSpans.length;
    }), "getSuccessRate");
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
      flush
    };
  })
);
var makeMockTelemetry = /* @__PURE__ */ __name(() => ({
  recordMetric: /* @__PURE__ */ __name(() => Effect.void, "recordMetric"),
  startSpan: /* @__PURE__ */ __name(() => Effect.succeed({
    end: /* @__PURE__ */ __name(() => Effect.void, "end")
  }), "startSpan"),
  log: /* @__PURE__ */ __name((level, message, context) => Effect.sync(() => {
    const Prefix = `[Cocoon Telemetry Mock] [${level.toUpperCase()}]`;
    let ContextText = "";
    if (context && Object.keys(context).length > 0) {
      try {
        ContextText = ` ${JSON.stringify(context)}`;
      } catch {
        ContextText = " [unserializable-context]";
      }
    }
    const Stream2 = level === "error" ? process.stderr : process.stdout;
    try {
      Stream2.write(`${Prefix} ${message}${ContextText}
`);
    } catch {
    }
  }), "log"),
  events: Stream.empty,
  getMetrics: /* @__PURE__ */ __name(() => Effect.succeed([]), "getMetrics"),
  getAverageDuration: /* @__PURE__ */ __name(() => Effect.succeed(0), "getAverageDuration"),
  getSuccessRate: /* @__PURE__ */ __name(() => Effect.succeed(1), "getSuccessRate"),
  flush: Effect.void
}), "makeMockTelemetry");
var TelemetryMock = Layer.effect(
  Telemetry,
  Effect.succeed(makeMockTelemetry())
);
var withSpan = /* @__PURE__ */ __name((name, effect, labels) => Effect.gen(function* () {
  const telemetry = yield* Telemetry;
  const span = yield* telemetry.startSpan(name, labels);
  const result = yield* effect.pipe(
    Effect.catchAll(
      (error) => Effect.gen(function* () {
        yield* span.end(false, String(error));
        return yield* Effect.fail(error);
      })
    )
  );
  yield* span.end(true);
  return result;
}), "withSpan");
export {
  Telemetry,
  TelemetryCollectionError,
  TelemetryLive,
  TelemetryMock,
  TelemetryTag,
  makeMockTelemetry,
  withSpan
};
//# sourceMappingURL=Telemetry.js.map
