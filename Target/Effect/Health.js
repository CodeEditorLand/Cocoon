var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Effect/Telemetry.ts
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
var TelemetryTag = { _tag: "Cocoon/Telemetry" };
var Telemetry = TelemetryTag;
var MAX_EVENTS = 1e3;
var MAX_PER_NAME = 100;
function makeTelemetry() {
  const metrics = /* @__PURE__ */ new Map();
  const spans = /* @__PURE__ */ new Map();
  const eventsList = [];
  const pushEvent = /* @__PURE__ */ __name((ev) => {
    eventsList.push(ev);
    if (eventsList.length > MAX_EVENTS) eventsList.shift();
  }, "pushEvent");
  const recordMetric = /* @__PURE__ */ __name((name, value, labels) => {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      labels: labels ?? void 0
    };
    const existing = metrics.get(name) ?? [];
    metrics.set(name, [...existing, metric].slice(-MAX_PER_NAME));
    pushEvent({ type: "metric", timestamp: Date.now(), data: metric });
  }, "recordMetric");
  const startSpan = /* @__PURE__ */ __name((name, labels) => {
    const startTime = Date.now();
    return {
      end: /* @__PURE__ */ __name((success, error) => {
        const endTime = Date.now();
        const span = {
          name,
          startTime,
          endTime,
          duration: endTime - startTime,
          success,
          error: error ?? "",
          labels: labels ?? {}
        };
        const existing = spans.get(name) ?? [];
        spans.set(name, [...existing, span].slice(-MAX_PER_NAME));
        pushEvent({ type: "span", timestamp: Date.now(), data: span });
      }, "end")
    };
  }, "startSpan");
  const log = /* @__PURE__ */ __name((level, message, context) => {
    const entry = { level, message, context: context ?? {} };
    pushEvent({ type: "log", timestamp: Date.now(), data: entry });
    if (typeof performance !== "undefined") {
      try {
        performance.mark(
          `land:telemetry:${level}:${message.slice(0, 80)}`
        );
      } catch {
      }
    }
  }, "log");
  return {
    recordMetric,
    startSpan,
    log,
    get events() {
      return [...eventsList];
    },
    getMetrics: /* @__PURE__ */ __name((name) => [...metrics.get(name) ?? []], "getMetrics"),
    getAverageDuration: /* @__PURE__ */ __name((name) => {
      const ss = spans.get(name) ?? [];
      if (!ss.length) return 0;
      return ss.reduce((s, sp) => s + (sp.duration || 0), 0) / ss.length;
    }, "getAverageDuration"),
    getSuccessRate: /* @__PURE__ */ __name((name) => {
      const ss = spans.get(name) ?? [];
      if (!ss.length) return 0;
      return ss.filter((s) => s.success).length / ss.length;
    }, "getSuccessRate"),
    flush: /* @__PURE__ */ __name(() => {
    }, "flush")
  };
}
__name(makeTelemetry, "makeTelemetry");
var TelemetryLive = makeTelemetry();
var withSpan = /* @__PURE__ */ __name((_name, fn) => fn, "withSpan");
var makeMockTelemetry = /* @__PURE__ */ __name(() => ({
  recordMetric: /* @__PURE__ */ __name(() => {
  }, "recordMetric"),
  startSpan: /* @__PURE__ */ __name(() => ({ end: /* @__PURE__ */ __name(() => {
  }, "end") }), "startSpan"),
  log: /* @__PURE__ */ __name(() => {
  }, "log"),
  events: [],
  getMetrics: /* @__PURE__ */ __name(() => [], "getMetrics"),
  getAverageDuration: /* @__PURE__ */ __name(() => 0, "getAverageDuration"),
  getSuccessRate: /* @__PURE__ */ __name(() => 1, "getSuccessRate"),
  flush: /* @__PURE__ */ __name(() => {
  }, "flush")
}), "makeMockTelemetry");
var TelemetryMock = makeMockTelemetry();
var getTelemetry = /* @__PURE__ */ __name(() => TelemetryLive, "getTelemetry");

// Source/Effect/Health.ts
var HealthTag = { _tag: "Cocoon/Health" };
var createServiceHealth = /* @__PURE__ */ __name((name, status, message, responseTime, details) => ({
  serviceName: name,
  status,
  message,
  lastChecked: Date.now(),
  responseTime,
  details
}), "createServiceHealth");
var makeHealthChecker = /* @__PURE__ */ __name(() => ({
  checkService: /* @__PURE__ */ __name(async (serviceName) => {
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
        const telemetryService = getTelemetry();
        const telemetryTime = Date.now() - startTime;
        try {
          await telemetryService.log(
            "info",
            "[Health] Telemetry health check"
          );
          return createServiceHealth(
            "Telemetry",
            "healthy",
            "Telemetry service available",
            telemetryTime
          );
        } catch {
          return createServiceHealth(
            "Telemetry",
            "unhealthy",
            "Telemetry service error",
            telemetryTime
          );
        }
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
  }, "checkService"),
  checkAllServices: /* @__PURE__ */ __name(async () => {
    const telemetry = getTelemetry();
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
    const healthResults = await Promise.all(
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
  }, "checkAllServices"),
  getOverallStatus: /* @__PURE__ */ __name(async () => {
    const healthChecker = makeHealthChecker();
    const systemHealth = await healthChecker.checkAllServices();
    return systemHealth.overallStatus;
  }, "getOverallStatus"),
  monitorService: /* @__PURE__ */ __name(async (serviceName, intervalMs) => {
    const healthChecker = makeHealthChecker();
    while (true) {
      await healthChecker.checkService(serviceName);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }, "monitorService")
}), "makeHealthChecker");
var _health;
var getHealth = /* @__PURE__ */ __name(() => {
  if (_health === void 0) {
    _health = makeHealthChecker();
  }
  return _health;
}, "getHealth");
var makeMockHealth = /* @__PURE__ */ __name((overrides) => ({
  checkService: /* @__PURE__ */ __name(async (serviceName) => {
    const defaultStatus = "healthy";
    const status = overrides?.[serviceName] ?? defaultStatus;
    return createServiceHealth(
      serviceName,
      status,
      status === "healthy" ? "Mock service healthy" : "Mock service unhealthy",
      0
    );
  }, "checkService"),
  checkAllServices: /* @__PURE__ */ __name(async () => {
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
  }, "checkAllServices"),
  getOverallStatus: /* @__PURE__ */ __name(async () => "healthy", "getOverallStatus"),
  monitorService: /* @__PURE__ */ __name(async () => {
  }, "monitorService")
}), "makeMockHealth");
var HealthLive = getHealth();
var HealthMock = makeMockHealth();
export {
  HealthLive,
  HealthMock,
  HealthTag,
  getHealth,
  makeMockHealth
};
//# sourceMappingURL=Health.js.map
