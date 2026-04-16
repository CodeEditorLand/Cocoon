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
      const prefix = `[Cocoon Telemetry] [${level.toUpperCase()}]`;
      switch (level) {
        case "debug":
          console.debug(prefix, message, context ?? "");
          break;
        case "info":
          console.info(prefix, message, context ?? "");
          break;
        case "warn":
          console.warn(prefix, message, context ?? "");
          break;
        case "error":
          console.error(prefix, message, context ?? "");
          break;
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
    const prefix = `[Cocoon Telemetry Mock] [${level.toUpperCase()}]`;
    console.log(prefix, message, context ?? "");
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

// Source/Effect/Health.ts
import { Context as Context2, Effect as Effect2, Layer as Layer2, Schedule } from "effect";
var HealthTag = class extends Context2.Tag("Cocoon/Health")() {
  static {
    __name(this, "HealthTag");
  }
};
var createServiceHealth = /* @__PURE__ */ __name((name, status, message, responseTime, details) => ({
  serviceName: name,
  status,
  message,
  lastChecked: Date.now(),
  responseTime,
  details
}), "createServiceHealth");
var makeHealthChecker = /* @__PURE__ */ __name(() => ({
  checkService: /* @__PURE__ */ __name((serviceName) => Effect2.gen(function* () {
    const startTime = Date.now();
    switch (serviceName.toLowerCase()) {
      case "environment": {
        const envTime = Date.now() - startTime;
        return createServiceHealth(
          "Environment",
          "healthy",
          "Environment service available",
          envTime
        );
      }
      case "telemetry": {
        const telemetryService = yield* TelemetryTag;
        const telemetryTime = Date.now() - startTime;
        return yield* telemetryService.log("info", "[Health] Telemetry health check").pipe(
          Effect2.map(
            () => createServiceHealth(
              "Telemetry",
              "healthy",
              "Telemetry service available",
              telemetryTime
            )
          ),
          Effect2.catchAll(
            () => Effect2.succeed(
              createServiceHealth(
                "Telemetry",
                "unhealthy",
                "Telemetry service error",
                telemetryTime
              )
            )
          )
        );
      }
      case "grpc": {
        const grpcTime = Date.now() - startTime;
        return createServiceHealth(
          "gRPC",
          "healthy",
          "gRPC service available",
          grpcTime
        );
      }
      case "extension": {
        const extensionTime = Date.now() - startTime;
        return createServiceHealth(
          "Extension",
          "healthy",
          "Extension service available",
          extensionTime
        );
      }
      default:
        return createServiceHealth(
          serviceName,
          "unknown",
          `Unknown service: ${serviceName}`,
          0
        );
    }
  }), "checkService"),
  checkAllServices: /* @__PURE__ */ __name(() => Effect2.gen(function* () {
    const telemetry = yield* TelemetryTag;
    const services = [
      "environment",
      "telemetry",
      "grpc",
      "extension"
    ];
    const healthChecker = makeHealthChecker();
    telemetry.log(
      "info",
      "[Health] Running health checks for all services..."
    );
    const healthResults = yield* Effect2.all(
      services.map((service) => healthChecker.checkService(service))
    );
    const unhealthyCount = healthResults.filter(
      (h) => h.status === "unhealthy"
    ).length;
    const degradedCount = healthResults.filter(
      (h) => h.status === "degraded"
    ).length;
    let overallStatus = "healthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    }
    return {
      overallStatus,
      services: healthResults,
      systemInfo: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        upSince: Date.now()
      },
      lastChecked: Date.now()
    };
  }), "checkAllServices"),
  getOverallStatus: /* @__PURE__ */ __name(() => Effect2.gen(function* () {
    const healthChecker = makeHealthChecker();
    const systemHealth = yield* healthChecker.checkAllServices();
    return systemHealth.overallStatus;
  }), "getOverallStatus"),
  monitorService: /* @__PURE__ */ __name((serviceName, intervalMs) => Effect2.gen(function* () {
    yield* makeHealthChecker().checkService(serviceName).pipe(Effect2.repeat(Schedule.spaced(`${intervalMs} millis`)));
  }), "monitorService")
}), "makeHealthChecker");
var HealthLive = Layer2.effect(
  HealthTag,
  Effect2.succeed(makeHealthChecker())
);
var makeMockHealth = /* @__PURE__ */ __name((overrides) => ({
  checkService: /* @__PURE__ */ __name((serviceName) => Effect2.gen(function* () {
    const defaultStatus = "healthy";
    const status = overrides?.[serviceName] ?? defaultStatus;
    return createServiceHealth(
      serviceName,
      status,
      status === "healthy" ? "Mock service healthy" : "Mock service unhealthy",
      0
    );
  }), "checkService"),
  checkAllServices: /* @__PURE__ */ __name(() => Effect2.gen(function* () {
    const services = ["environment", "telemetry", "grpc", "extension"];
    const results = services.map(
      (name) => createServiceHealth(
        name,
        overrides?.[name] ?? "healthy",
        "Mock service check",
        0
      )
    );
    return {
      overallStatus: "healthy",
      services: results,
      systemInfo: {
        platform: "mock",
        architecture: "mock",
        nodeVersion: "mock",
        upSince: Date.now()
      },
      lastChecked: Date.now()
    };
  }), "checkAllServices"),
  getOverallStatus: /* @__PURE__ */ __name(() => Effect2.succeed("healthy"), "getOverallStatus"),
  monitorService: /* @__PURE__ */ __name(() => Effect2.void, "monitorService")
}), "makeMockHealth");
var HealthMock = Layer2.effect(
  HealthTag,
  Effect2.succeed(makeMockHealth())
);
export {
  HealthLive,
  HealthMock,
  HealthTag,
  makeMockHealth
};
//# sourceMappingURL=Health.js.map
