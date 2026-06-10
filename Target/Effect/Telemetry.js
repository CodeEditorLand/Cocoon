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
export {
  Telemetry,
  TelemetryCollectionError,
  TelemetryLive,
  TelemetryMock,
  TelemetryTag,
  getTelemetry,
  makeMockTelemetry,
  withSpan
};
//# sourceMappingURL=Telemetry.js.map
