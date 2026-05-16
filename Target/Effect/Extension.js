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
var MAX_EVENTS = 1e3;
var MAX_METRICS_PER_NAME = 100;
var MAX_SPANS_PER_NAME = 100;
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
      events.push({
        type: "metric",
        timestamp: metric.timestamp,
        data: metric
      });
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      yield* Ref.set(eventsRef, events);
      const currentMetrics = yield* metricsRef.get;
      const nameMetrics = HashMap.get(currentMetrics, name).pipe(
        Option.getOrElse(() => [])
      );
      nameMetrics.push(metric);
      if (nameMetrics.length > MAX_METRICS_PER_NAME) {
        nameMetrics.splice(
          0,
          nameMetrics.length - MAX_METRICS_PER_NAME
        );
      }
      yield* Ref.set(
        metricsRef,
        HashMap.set(currentMetrics, name, nameMetrics)
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
      events.push({
        type: "span",
        timestamp: startTime,
        data: span
      });
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      yield* Ref.set(eventsRef, events);
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
          events2.push({
            type: "span",
            timestamp: endTime,
            data: completedSpan
          });
          if (events2.length > MAX_EVENTS) {
            events2.splice(0, events2.length - MAX_EVENTS);
          }
          yield* Ref.set(eventsRef, events2);
          const currentSpans = yield* spansRef.get;
          const nameSpans = HashMap.get(
            currentSpans,
            name
          ).pipe(Option.getOrElse(() => []));
          nameSpans.push(completedSpan);
          if (nameSpans.length > MAX_SPANS_PER_NAME) {
            nameSpans.splice(
              0,
              nameSpans.length - MAX_SPANS_PER_NAME
            );
          }
          yield* Ref.set(
            spansRef,
            HashMap.set(currentSpans, name, nameSpans)
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
      events.push({ type: "log", timestamp, data: logEntry });
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      yield* Ref.set(eventsRef, events);
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

// Source/Effect/Extension.ts
import {
  Context as Context2,
  Effect as Effect2,
  HashMap as HashMap2,
  Layer as Layer2,
  Option as Option2,
  Ref as Ref2,
  SubscriptionRef as SubscriptionRef2
} from "effect";
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
var ExtensionTag = class extends Context2.Tag("Cocoon/Extension")() {
  static {
    __name(this, "ExtensionTag");
  }
};
var Extension = ExtensionTag;
var ExtensionLive = Layer2.effect(
  Extension,
  Effect2.gen(function* () {
    const telemetry = yield* TelemetryTag;
    const extensionsRef = yield* SubscriptionRef2.make(HashMap2.empty());
    const getAll = Effect2.gen(function* () {
      const extensions = yield* extensionsRef.get;
      return Array.from(HashMap2.values(extensions));
    });
    const getById = /* @__PURE__ */ __name((id) => Effect2.gen(function* () {
      const extensions = yield* extensionsRef.get;
      const extension = HashMap2.get(extensions, id);
      if (extension._tag === "None") {
        return yield* Effect2.fail(new ExtensionNotFoundError(id));
      }
      return extension.value;
    }), "getById");
    const activate = /* @__PURE__ */ __name((id) => Effect2.gen(function* () {
      const startTime = Date.now();
      const extensions = yield* extensionsRef.get;
      const extension = HashMap2.get(extensions, id);
      if (extension._tag === "None") {
        return yield* Effect2.fail(new ExtensionNotFoundError(id));
      }
      const current = extension.value;
      if (current.state._tag === "Active") {
        return {
          extensionId: id,
          success: true,
          activationTime: 0,
          error: void 0
        };
      }
      yield* Ref2.set(
        extensionsRef,
        HashMap2.set(extensions, id, {
          ...current,
          state: { _tag: "Activating", startTime }
        })
      );
      telemetry.log(
        "info",
        `[Extension] Activating extension: ${id}`
      );
      yield* Effect2.sleep("10 millis");
      const activationTime = Date.now() - startTime;
      const updatedExtensions = yield* extensionsRef.get;
      yield* Ref2.set(
        extensionsRef,
        HashMap2.set(updatedExtensions, id, {
          ...current,
          state: { _tag: "Active", activatedAt: startTime },
          activatedAt: startTime,
          activationTime
        })
      );
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
    }).pipe(
      Effect2.catchAll(
        (error) => Effect2.gen(function* () {
          if (error instanceof ExtensionNotFoundError) {
            return yield* Effect2.fail(error);
          }
          const extensions = yield* extensionsRef.get;
          yield* Ref2.set(
            extensionsRef,
            HashMap2.set(extensions, id, {
              ...HashMap2.get(extensions, id).pipe(
                Option2.getOrElse(() => ({
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
                }))
              ),
              state: { _tag: "Error", error: String(error) }
            })
          );
          telemetry.log(
            "error",
            `[Extension] Failed to activate ${id}: ${String(error)}`
          );
          return yield* Effect2.fail(
            new ExtensionActivationError(id, error)
          );
        })
      )
    ), "activate");
    const deactivate = /* @__PURE__ */ __name((id) => Effect2.gen(function* () {
      const extensions = yield* extensionsRef.get;
      const extension = HashMap2.get(extensions, id);
      if (extension._tag === "None") {
        return yield* Effect2.fail(new ExtensionNotFoundError(id));
      }
      const current = extension.value;
      if (current.state._tag === "Deactivated" || current.state._tag === "Idle") {
        return {
          extensionId: id,
          success: true,
          error: void 0
        };
      }
      telemetry.log(
        "info",
        `[Extension] Deactivating extension: ${id}`
      );
      yield* Ref2.set(
        extensionsRef,
        HashMap2.set(extensions, id, {
          ...current,
          state: { _tag: "Deactivating" }
        })
      );
      yield* Effect2.sleep("5 millis");
      const updatedExtensions = yield* extensionsRef.get;
      yield* Ref2.set(
        extensionsRef,
        HashMap2.set(updatedExtensions, id, {
          ...current,
          state: { _tag: "Deactivated" }
        })
      );
      telemetry.log(
        "info",
        `[Extension] Deactivated extension: ${id}`
      );
      return {
        extensionId: id,
        success: true,
        error: void 0
      };
    }).pipe(
      Effect2.catchAll(
        (error) => Effect2.gen(function* () {
          if (error instanceof ExtensionNotFoundError) {
            return yield* Effect2.fail(error);
          }
          telemetry.log(
            "error",
            `[Extension] Failed to deactivate ${id}: ${String(error)}`
          );
          return yield* Effect2.fail(
            new ExtensionDeactivationError(id, error)
          );
        })
      )
    ), "deactivate");
    const isActive = /* @__PURE__ */ __name((id) => Effect2.gen(function* () {
      const extensions = yield* extensionsRef.get;
      const extension = HashMap2.get(extensions, id);
      if (extension._tag === "None") {
        return false;
      }
      return extension.value.state._tag === "Active";
    }), "isActive");
    const getActiveCount = Effect2.gen(function* () {
      const extensions = yield* extensionsRef.get;
      const values = Array.from(HashMap2.values(extensions));
      return values.filter((ext) => ext.state._tag === "Active").length;
    });
    const stateChanges = Effect2.map(extensionsRef.get, (extensions) => {
      const result = {};
      for (const [id, host] of HashMap2.entries(extensions)) {
        result[id] = host.state;
      }
      return result;
    });
    return {
      getAll,
      getById,
      activate,
      deactivate,
      isActive,
      getActiveCount,
      stateChanges
    };
  })
);
var makeMockExtension = /* @__PURE__ */ __name((extensions = []) => {
  const mockExtensions = extensions.map((manifest) => ({
    id: manifest.id,
    manifest,
    state: { _tag: "Idle" },
    activatedAt: void 0,
    activationTime: void 0
  }));
  return {
    getAll: Effect2.succeed(mockExtensions),
    getById: /* @__PURE__ */ __name((id) => Effect2.gen(function* () {
      const ext = mockExtensions.find((e) => e.id === id);
      if (!ext) {
        return yield* Effect2.fail(new ExtensionNotFoundError(id));
      }
      return ext;
    }), "getById"),
    activate: /* @__PURE__ */ __name((id) => Effect2.succeed({
      extensionId: id,
      success: true,
      activationTime: 10,
      error: void 0
    }), "activate"),
    deactivate: /* @__PURE__ */ __name((id) => Effect2.succeed({
      extensionId: id,
      success: true,
      error: void 0
    }), "deactivate"),
    isActive: /* @__PURE__ */ __name((id) => Effect2.succeed(
      mockExtensions.some(
        (e) => e.id === id && e.state._tag === "Active"
      )
    ), "isActive"),
    getActiveCount: Effect2.succeed(0),
    stateChanges: Effect2.succeed({})
  };
}, "makeMockExtension");
var ExtensionMock = Layer2.effect(
  Extension,
  Effect2.succeed(makeMockExtension())
);
export {
  Extension,
  ExtensionActivationError,
  ExtensionDeactivationError,
  ExtensionLive,
  ExtensionMock,
  ExtensionNotFoundError,
  ExtensionTag,
  makeMockExtension
};
//# sourceMappingURL=Extension.js.map
