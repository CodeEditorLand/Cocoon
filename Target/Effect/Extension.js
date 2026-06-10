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

// Source/Effect/Extension.ts
var ExtensionNotFoundError = class extends Error {
  constructor(extensionId) {
    super(`Extension not found: ${extensionId}`);
    this.extensionId = extensionId;
  }
  extensionId;
  static {
    __name(this, "ExtensionNotFoundError");
  }
  _tag = "ExtensionNotFoundError";
};
var ExtensionActivationError = class extends Error {
  constructor(extensionId, cause) {
    super(
      `Failed to activate extension '${extensionId}': ${String(cause)}`
    );
    this.extensionId = extensionId;
    this.cause = cause;
  }
  extensionId;
  cause;
  static {
    __name(this, "ExtensionActivationError");
  }
  _tag = "ExtensionActivationError";
};
var ExtensionDeactivationError = class extends Error {
  constructor(extensionId, cause) {
    super(
      `Failed to deactivate extension '${extensionId}': ${String(cause)}`
    );
    this.extensionId = extensionId;
    this.cause = cause;
  }
  extensionId;
  cause;
  static {
    __name(this, "ExtensionDeactivationError");
  }
  _tag = "ExtensionDeactivationError";
};
var ExtensionTag = { _tag: "Cocoon/Extension" };
var Extension = ExtensionTag;
function makeExtensionService(telemetry) {
  const extensions = /* @__PURE__ */ new Map();
  const getAll = /* @__PURE__ */ __name(async () => {
    return Array.from(extensions.values());
  }, "getAll");
  const getById = /* @__PURE__ */ __name(async (id) => {
    const extension = extensions.get(id);
    if (extension === void 0) {
      throw new ExtensionNotFoundError(id);
    }
    return extension;
  }, "getById");
  const activate = /* @__PURE__ */ __name(async (id) => {
    const startTime = Date.now();
    const current = extensions.get(id);
    if (current === void 0) {
      throw new ExtensionNotFoundError(id);
    }
    if (current.state._tag === "Active") {
      return {
        extensionId: id,
        success: true,
        activationTime: 0,
        error: void 0
      };
    }
    extensions.set(id, {
      ...current,
      state: { _tag: "Activating", startTime }
    });
    telemetry.log("info", `[Extension] Activating extension: ${id}`);
    try {
      await new Promise((r) => setTimeout(r, 10));
      const activationTime = Date.now() - startTime;
      extensions.set(id, {
        ...current,
        state: { _tag: "Active", activatedAt: startTime },
        activatedAt: startTime,
        activationTime
      });
      telemetry.log(
        "info",
        `[Extension] Activated extension: ${id} (${activationTime}ms)`
      );
      return {
        extensionId: id,
        success: true,
        activationTime,
        error: void 0
      };
    } catch (error) {
      if (error instanceof ExtensionNotFoundError) {
        throw error;
      }
      const latest = extensions.get(id) ?? {
        id,
        manifest: {
          id,
          name: "Unknown",
          version: "0.0.0",
          description: "",
          publisher: "",
          entryPoint: "",
          enabled: true,
          activationEvents: [],
          dependencies: [],
          contributes: {}
        },
        state: { _tag: "Idle" },
        activatedAt: void 0,
        activationTime: void 0
      };
      extensions.set(id, {
        ...latest,
        state: { _tag: "Error", error: String(error) }
      });
      telemetry.log(
        "error",
        `[Extension] Failed to activate ${id}: ${String(error)}`
      );
      throw new ExtensionActivationError(id, error);
    }
  }, "activate");
  const deactivate = /* @__PURE__ */ __name(async (id) => {
    const current = extensions.get(id);
    if (current === void 0) {
      throw new ExtensionNotFoundError(id);
    }
    if (current.state._tag === "Deactivated" || current.state._tag === "Idle") {
      return {
        extensionId: id,
        success: true,
        error: void 0
      };
    }
    telemetry.log("info", `[Extension] Deactivating extension: ${id}`);
    try {
      extensions.set(id, {
        ...current,
        state: { _tag: "Deactivating" }
      });
      await new Promise((r) => setTimeout(r, 5));
      extensions.set(id, {
        ...current,
        state: { _tag: "Deactivated" }
      });
      telemetry.log(
        "info",
        `[Extension] Deactivated extension: ${id}`
      );
      return {
        extensionId: id,
        success: true,
        error: void 0
      };
    } catch (error) {
      if (error instanceof ExtensionNotFoundError) {
        throw error;
      }
      telemetry.log(
        "error",
        `[Extension] Failed to deactivate ${id}: ${String(error)}`
      );
      throw new ExtensionDeactivationError(id, error);
    }
  }, "deactivate");
  const isActive = /* @__PURE__ */ __name(async (id) => {
    const extension = extensions.get(id);
    if (extension === void 0) {
      return false;
    }
    return extension.state._tag === "Active";
  }, "isActive");
  const getActiveCount = /* @__PURE__ */ __name(async () => {
    return Array.from(extensions.values()).filter(
      (ext) => ext.state._tag === "Active"
    ).length;
  }, "getActiveCount");
  const stateChanges = /* @__PURE__ */ __name(async () => {
    const result = {};
    for (const [id, host] of extensions.entries()) {
      result[id] = host.state;
    }
    return result;
  }, "stateChanges");
  return {
    getAll,
    getById,
    activate,
    deactivate,
    isActive,
    getActiveCount,
    stateChanges
  };
}
__name(makeExtensionService, "makeExtensionService");
var _instance;
async function getExtension() {
  if (_instance === void 0) {
    const telemetry = await getTelemetry();
    _instance = makeExtensionService(telemetry);
  }
  return _instance;
}
__name(getExtension, "getExtension");
var ExtensionLive = {
  _tag: "Cocoon/Extension/Live",
  build: getExtension
};
var makeMockExtension = /* @__PURE__ */ __name((extensions = []) => {
  const mockExtensions = extensions.map((manifest) => ({
    id: manifest.id,
    manifest,
    state: { _tag: "Idle" },
    activatedAt: void 0,
    activationTime: void 0
  }));
  return {
    getAll: /* @__PURE__ */ __name(async () => mockExtensions, "getAll"),
    getById: /* @__PURE__ */ __name(async (id) => {
      const ext = mockExtensions.find((e) => e.id === id);
      if (!ext) {
        throw new ExtensionNotFoundError(id);
      }
      return ext;
    }, "getById"),
    activate: /* @__PURE__ */ __name(async (id) => ({
      extensionId: id,
      success: true,
      activationTime: 10,
      error: void 0
    }), "activate"),
    deactivate: /* @__PURE__ */ __name(async (id) => ({
      extensionId: id,
      success: true,
      error: void 0
    }), "deactivate"),
    isActive: /* @__PURE__ */ __name(async (id) => mockExtensions.some(
      (e) => e.id === id && e.state._tag === "Active"
    ), "isActive"),
    getActiveCount: /* @__PURE__ */ __name(async () => 0, "getActiveCount"),
    stateChanges: /* @__PURE__ */ __name(async () => ({}), "stateChanges")
  };
}, "makeMockExtension");
var ExtensionMock = {
  _tag: "Cocoon/Extension/Mock",
  build: /* @__PURE__ */ __name(async () => makeMockExtension(), "build")
};
export {
  Extension,
  ExtensionActivationError,
  ExtensionDeactivationError,
  ExtensionLive,
  ExtensionMock,
  ExtensionNotFoundError,
  ExtensionTag,
  getExtension,
  makeMockExtension
};
//# sourceMappingURL=Extension.js.map
