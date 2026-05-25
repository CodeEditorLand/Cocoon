var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Source/Services/Dev/Log.ts
var Raw, ParsedTags, TagSet, IsShort, HasAll, IsEnabled, CocoonDevLog2, Log_default;
var init_Log = __esm({
  "Source/Services/Dev/Log.ts"() {
    "use strict";
    Raw = process.env["Trace"] ?? "";
    ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
    TagSet = new Set(ParsedTags);
    IsShort = TagSet.has("short");
    HasAll = TagSet.has("all");
    IsEnabled = /* @__PURE__ */ __name((Tag) => {
      if (TagSet.size === 0) return false;
      if (HasAll || IsShort) return true;
      return TagSet.has(Tag.toLowerCase());
    }, "IsEnabled");
    CocoonDevLog2 = /* @__PURE__ */ __name((Tag, Message) => {
      if (!IsEnabled(Tag)) return;
      const TagUpper = Tag.toUpperCase();
      process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
    }, "CocoonDevLog");
    Log_default = CocoonDevLog2;
  }
});

// Source/Utility/Land/Fix/Log.ts
var Mode, Enabled, Long, DebugEnabled, AllowList, PadTwo, PadThree, FormatTimestamp, SerializeContext, LevelTag, FormatLine, Emit, Info, Warn, ErrorLog, Debug, SeenOnce, DebugOnce, InfoOnce, LandFixLog, Log_default2;
var init_Log2 = __esm({
  "Source/Utility/Land/Fix/Log.ts"() {
    "use strict";
    Mode = process.env["Mend"] ?? "short";
    Enabled = Mode !== "off";
    Long = Mode === "long";
    DebugEnabled = Long;
    AllowList = (() => {
      const Raw2 = process.env["Mend"];
      if (!Raw2 || Raw2.trim().length === 0) return void 0;
      const Tags = Raw2.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
      return Tags.length === 0 ? void 0 : new Set(Tags);
    })();
    PadTwo = /* @__PURE__ */ __name((Value) => Value < 10 ? `0${Value}` : String(Value), "PadTwo");
    PadThree = /* @__PURE__ */ __name((Value) => Value < 10 ? `00${Value}` : Value < 100 ? `0${Value}` : String(Value), "PadThree");
    FormatTimestamp = /* @__PURE__ */ __name(() => {
      const Now = /* @__PURE__ */ new Date();
      if (Long) return Now.toISOString();
      return `${PadTwo(Now.getHours())}:${PadTwo(Now.getMinutes())}:${PadTwo(
        Now.getSeconds()
      )}.${PadThree(Now.getMilliseconds())}`;
    }, "FormatTimestamp");
    SerializeContext = /* @__PURE__ */ __name((Context13) => {
      const Seen = /* @__PURE__ */ new WeakSet();
      try {
        return JSON.stringify(Context13, (_Key, Value) => {
          if (Value instanceof Error) {
            return { name: Value.name, message: Value.message };
          }
          if (typeof Value === "bigint") return String(Value);
          if (typeof Value === "function") return "[Function]";
          if (typeof Value === "object" && Value !== null) {
            if (Seen.has(Value)) return "[Circular]";
            Seen.add(Value);
          }
          return Value;
        });
      } catch {
        return '"[Unserializable]"';
      }
    }, "SerializeContext");
    LevelTag = /* @__PURE__ */ __name((Level) => Level === "info" ? "" : ` ${Level.toUpperCase()}`, "LevelTag");
    FormatLine = /* @__PURE__ */ __name((Level, Tag, Message, Context13) => {
      const Head = `${FormatTimestamp()} [LandFix:${Tag}]${LevelTag(Level)} ${Message}`;
      if (!Context13) return `${Head}
`;
      return `${Head} ${SerializeContext(Context13)}
`;
    }, "FormatLine");
    Emit = /* @__PURE__ */ __name((Stream2, Level, Tag, Message, Context13) => {
      if (!Enabled) return;
      if (AllowList && !AllowList.has(Tag)) return;
      try {
        Stream2.write(FormatLine(Level, Tag, Message, Context13));
      } catch {
      }
    }, "Emit");
    Info = /* @__PURE__ */ __name((Tag, Message, Context13) => {
      Emit(process.stdout, "info", Tag, Message, Context13);
    }, "Info");
    Warn = /* @__PURE__ */ __name((Tag, Message, Context13) => {
      Emit(process.stdout, "warn", Tag, Message, Context13);
    }, "Warn");
    ErrorLog = /* @__PURE__ */ __name((Tag, Message, Context13) => {
      Emit(process.stderr, "error", Tag, Message, Context13);
    }, "ErrorLog");
    Debug = /* @__PURE__ */ __name((Tag, Message, Context13) => {
      if (!DebugEnabled) return;
      Emit(process.stdout, "debug", Tag, Message, Context13);
    }, "Debug");
    SeenOnce = /* @__PURE__ */ new Set();
    DebugOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context13) => {
      if (!DebugEnabled) return;
      const Combined = `${Tag}:${Key}`;
      if (SeenOnce.has(Combined)) return;
      SeenOnce.add(Combined);
      Emit(process.stdout, "debug", Tag, Message, Context13);
    }, "DebugOnce");
    InfoOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context13) => {
      const Combined = `${Tag}:${Key}`;
      if (SeenOnce.has(Combined)) return;
      SeenOnce.add(Combined);
      Emit(process.stdout, "info", Tag, Message, Context13);
    }, "InfoOnce");
    LandFixLog = {
      Info,
      InfoOnce,
      Warn,
      Error: ErrorLog,
      Debug,
      DebugOnce,
      IsEnabled: /* @__PURE__ */ __name(() => Enabled, "IsEnabled"),
      IsDebugEnabled: /* @__PURE__ */ __name(() => DebugEnabled, "IsDebugEnabled"),
      Mode: /* @__PURE__ */ __name(() => Mode === "off" ? "off" : Long ? "long" : "short", "Mode")
    };
    Log_default2 = LandFixLog;
  }
});

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
var MAX_EVENTS, MAX_METRICS_PER_NAME, MAX_SPANS_PER_NAME, TelemetryCollectionError, TelemetryTag, Telemetry, TelemetryLive, makeMockTelemetry, TelemetryMock, withSpan;
var init_Telemetry = __esm({
  "Source/Effect/Telemetry.ts"() {
    "use strict";
    MAX_EVENTS = 1e3;
    MAX_METRICS_PER_NAME = 100;
    MAX_SPANS_PER_NAME = 100;
    TelemetryCollectionError = class extends Error {
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
    TelemetryTag = class extends Context.Tag("Cocoon/Telemetry")() {
      static {
        __name(this, "TelemetryTag");
      }
    };
    Telemetry = TelemetryTag;
    TelemetryLive = Layer.effect(
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
    makeMockTelemetry = /* @__PURE__ */ __name(() => ({
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
    TelemetryMock = Layer.effect(
      Telemetry,
      Effect.succeed(makeMockTelemetry())
    );
    withSpan = /* @__PURE__ */ __name((name, effect, labels) => Effect.gen(function* () {
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
  }
});

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
var ExtensionNotFoundError, ExtensionActivationError, ExtensionDeactivationError, ExtensionTag, Extension, ExtensionLive, makeMockExtension, ExtensionMock;
var init_Extension = __esm({
  "Source/Effect/Extension.ts"() {
    "use strict";
    init_Telemetry();
    ExtensionNotFoundError = class extends Error {
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
    ExtensionActivationError = class extends Error {
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
    ExtensionDeactivationError = class extends Error {
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
    ExtensionTag = class extends Context2.Tag("Cocoon/Extension")() {
      static {
        __name(this, "ExtensionTag");
      }
    };
    Extension = ExtensionTag;
    ExtensionLive = Layer2.effect(
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
    makeMockExtension = /* @__PURE__ */ __name((extensions = []) => {
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
    ExtensionMock = Layer2.effect(
      Extension,
      Effect2.succeed(makeMockExtension())
    );
  }
});

// Source/Effect/Health.ts
import { Context as Context3, Effect as Effect3, Layer as Layer3, Schedule } from "effect";
var HealthTag, createServiceHealth, makeHealthChecker, HealthLive, makeMockHealth, HealthMock;
var init_Health = __esm({
  "Source/Effect/Health.ts"() {
    "use strict";
    init_Telemetry();
    HealthTag = class extends Context3.Tag("Cocoon/Health")() {
      static {
        __name(this, "HealthTag");
      }
    };
    createServiceHealth = /* @__PURE__ */ __name((name, status2, message, responseTime, details) => ({
      serviceName: name,
      status: status2,
      message,
      lastChecked: Date.now(),
      responseTime,
      details
    }), "createServiceHealth");
    makeHealthChecker = /* @__PURE__ */ __name(() => ({
      checkService: /* @__PURE__ */ __name((serviceName) => Effect3.gen(function* () {
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
              Effect3.map(
                () => createServiceHealth(
                  "Telemetry",
                  "healthy",
                  "Telemetry service available",
                  telemetryTime
                )
              ),
              Effect3.catchAll(
                () => Effect3.succeed(
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
      checkAllServices: /* @__PURE__ */ __name(() => Effect3.gen(function* () {
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
        const healthResults = yield* Effect3.all(
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
      getOverallStatus: /* @__PURE__ */ __name(() => Effect3.gen(function* () {
        const healthChecker = makeHealthChecker();
        const systemHealth = yield* healthChecker.checkAllServices();
        return systemHealth.overallStatus;
      }), "getOverallStatus"),
      monitorService: /* @__PURE__ */ __name((serviceName, intervalMs) => Effect3.gen(function* () {
        yield* makeHealthChecker().checkService(serviceName).pipe(Effect3.repeat(Schedule.spaced(`${intervalMs} millis`)));
      }), "monitorService")
    }), "makeHealthChecker");
    HealthLive = Layer3.effect(
      HealthTag,
      Effect3.succeed(makeHealthChecker())
    );
    makeMockHealth = /* @__PURE__ */ __name((overrides) => ({
      checkService: /* @__PURE__ */ __name((serviceName) => Effect3.gen(function* () {
        const defaultStatus = "healthy";
        const status2 = overrides?.[serviceName] ?? defaultStatus;
        return createServiceHealth(
          serviceName,
          status2,
          status2 === "healthy" ? "Mock service healthy" : "Mock service unhealthy",
          0
        );
      }), "checkService"),
      checkAllServices: /* @__PURE__ */ __name(() => Effect3.gen(function* () {
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
      getOverallStatus: /* @__PURE__ */ __name(() => Effect3.succeed("healthy"), "getOverallStatus"),
      monitorService: /* @__PURE__ */ __name(() => Effect3.void, "monitorService")
    }), "makeMockHealth");
    HealthMock = Layer3.effect(
      HealthTag,
      Effect3.succeed(makeMockHealth())
    );
  }
});

// Source/Effect/Module/Interceptor.ts
import { Context as Context4, Effect as Effect4, HashMap as HashMap3, Layer as Layer4, Ref as Ref3, SubscriptionRef as SubscriptionRef3 } from "effect";
var SecurityLevel, ModuleNotFoundError, ModuleAccessDeniedError, SecurityPolicyNotFoundError, ModuleInterceptorTag, ModuleInterceptor, defaultSecurityPolicy, ModuleInterceptorLive, makeMockModuleInterceptor, ModuleInterceptorMock;
var init_Interceptor = __esm({
  "Source/Effect/Module/Interceptor.ts"() {
    "use strict";
    init_Log();
    init_Telemetry();
    SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
      SecurityLevel2["TRUSTED"] = "TRUSTED";
      SecurityLevel2["SANDBOXED"] = "SANDBOXED";
      SecurityLevel2["RESTRICTED"] = "RESTRICTED";
      SecurityLevel2["BLOCKED"] = "BLOCKED";
      return SecurityLevel2;
    })(SecurityLevel || {});
    ModuleNotFoundError = class extends Error {
      constructor(moduleId, extensionId) {
        super(`Module not found: ${moduleId} for extension ${extensionId}`);
        this.moduleId = moduleId;
        this.extensionId = extensionId;
      }
      moduleId;
      extensionId;
      static {
        __name(this, "ModuleNotFoundError");
      }
      _tag = "ModuleNotFoundError";
    };
    ModuleAccessDeniedError = class extends Error {
      constructor(moduleId, reason) {
        super(`Module access denied: ${moduleId} - ${reason}`);
        this.moduleId = moduleId;
        this.reason = reason;
      }
      moduleId;
      reason;
      static {
        __name(this, "ModuleAccessDeniedError");
      }
      _tag = "ModuleAccessDeniedError";
    };
    SecurityPolicyNotFoundError = class extends Error {
      constructor(extensionId) {
        super(`Security policy not found for extension: ${extensionId}`);
        this.extensionId = extensionId;
      }
      extensionId;
      static {
        __name(this, "SecurityPolicyNotFoundError");
      }
      _tag = "SecurityPolicyNotFoundError";
    };
    ModuleInterceptorTag = class extends Context4.Tag(
      "Cocoon/ModuleInterceptor"
    )() {
      static {
        __name(this, "ModuleInterceptorTag");
      }
    };
    ModuleInterceptor = ModuleInterceptorTag;
    defaultSecurityPolicy = {
      allowedModules: ["path", "url", "util", "events", "stream", "buffer"],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto"
      ],
      securityLevel: "SANDBOXED" /* SANDBOXED */,
      maxMemoryUsage: 128 * 1024 * 1024,
      // 128MB
      maxExecutionTime: 5e3
      // 5 seconds
    };
    ModuleInterceptorLive = Layer4.effect(
      ModuleInterceptor,
      Effect4.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const policiesRef = yield* SubscriptionRef3.make(HashMap3.empty());
        const moduleCacheRef = yield* SubscriptionRef3.make(HashMap3.empty());
        const statsRef = yield* SubscriptionRef3.make({
          totalInterceptions: 0,
          blockedModules: 0,
          averageResolutionTime: 0,
          securityViolations: 0
        });
        const resolutionTimes = [];
        const isNodeBuiltin = /* @__PURE__ */ __name((moduleId) => {
          const builtins = [
            "fs",
            "path",
            "os",
            "net",
            "http",
            "https",
            "child_process",
            "crypto",
            "util",
            "events",
            "stream",
            "buffer",
            "url",
            "querystring"
          ];
          return builtins.includes(moduleId);
        }, "isNodeBuiltin");
        const initialize = Effect4.gen(function* () {
          telemetry.log(
            "info",
            "[ModuleInterceptor] Initializing module interceptor service..."
          );
          yield* Effect4.sleep("5 millis");
          telemetry.log(
            "info",
            "[ModuleInterceptor] Module interceptor service initialized"
          );
        });
        const vscodeAPIRegistry = /* @__PURE__ */ new Map();
        const install = Effect4.gen(function* () {
          telemetry.log(
            "info",
            "[ModuleInterceptor] Installing Node.js Module._load hook..."
          );
          const { default: NodeModule } = yield* Effect4.tryPromise({
            try: /* @__PURE__ */ __name(() => import("node:module"), "try"),
            catch: /* @__PURE__ */ __name((Err) => new Error(
              `[ModuleInterceptor] import('node:module') failed: ${Err}`
            ), "catch")
          });
          const OriginalLoad = NodeModule._load;
          NodeModule._load = /* @__PURE__ */ __name(function PatchedLoad(Request, Parent, IsMain) {
            if (Request === "vscode") {
              const ParentFilename = Parent?.filename ?? Parent?.id ?? "";
              for (const [ExtensionId, API] of vscodeAPIRegistry) {
                if (ParentFilename.includes(ExtensionId)) {
                  return API;
                }
              }
              if (vscodeAPIRegistry.size > 0) {
                const LastAPI = [...vscodeAPIRegistry.values()].pop();
                return LastAPI;
              }
              const GlobalAPI = globalThis.__cocoonVscodeAPI;
              if (GlobalAPI) {
                return GlobalAPI;
              }
              CocoonDevLog2(
                "ext-host",
                `[ModuleInterceptor] require('vscode') called but no API registered (parent: ${ParentFilename.slice(-80)})`
              );
              return {};
            }
            return OriginalLoad.apply(this, [Request, Parent, IsMain]);
          }, "PatchedLoad");
          telemetry.log(
            "info",
            "[ModuleInterceptor] Module._load hook installed - require('vscode') intercepted"
          );
        });
        const interceptRequire = /* @__PURE__ */ __name((request2) => Effect4.gen(function* () {
          const startTime = Date.now();
          const currentStats = yield* statsRef.get;
          yield* Ref3.set(statsRef, {
            ...currentStats,
            totalInterceptions: currentStats.totalInterceptions + 1
          });
          const policyOpt = HashMap3.get(
            yield* policiesRef.get,
            request2.extensionId
          );
          if (policyOpt._tag === "None") {
            yield* telemetry.log(
              "warn",
              `[ModuleInterceptor] No policy for extension ${request2.extensionId}, using default`
            );
          }
          const policy = policyOpt._tag === "Some" ? policyOpt.value : {
            ...defaultSecurityPolicy,
            extensionId: request2.extensionId
          };
          if (policy.blockedModules.includes(request2.moduleId)) {
            yield* telemetry.log(
              "warn",
              `[ModuleInterceptor] Blocked module access: ${request2.moduleId} for ${request2.extensionId}`
            );
            const statsAfter2 = yield* statsRef.get;
            yield* Ref3.set(statsRef, {
              ...statsAfter2,
              blockedModules: statsAfter2.blockedModules + 1,
              securityViolations: statsAfter2.securityViolations + 1
            });
            return {
              success: false,
              error: `Module access denied: ${request2.moduleId}`,
              securityLevel: "BLOCKED" /* BLOCKED */
            };
          }
          if (!policy.allowedModules.includes(request2.moduleId) && !isNodeBuiltin(request2.moduleId)) {
            yield* telemetry.log(
              "warn",
              `[ModuleInterceptor] Module not in allowlist: ${request2.moduleId} for ${request2.extensionId}`
            );
            const statsAfter2 = yield* statsRef.get;
            yield* Ref3.set(statsRef, {
              ...statsAfter2,
              blockedModules: statsAfter2.blockedModules + 1,
              securityViolations: statsAfter2.securityViolations + 1
            });
            return {
              success: false,
              error: `Module not in allowlist: ${request2.moduleId}`,
              securityLevel: "RESTRICTED" /* RESTRICTED */
            };
          }
          const cacheKey = `${request2.extensionId}:${request2.moduleId}`;
          const cachedModule = HashMap3.get(
            yield* moduleCacheRef.get,
            cacheKey
          );
          if (cachedModule._tag === "Some") {
            const duration2 = Date.now() - startTime;
            resolutionTimes.push(duration2);
            const allTimes2 = [...resolutionTimes];
            const avgTime2 = allTimes2.reduce((a, b) => a + b, 0) / allTimes2.length;
            const statsAfter2 = yield* statsRef.get;
            yield* Ref3.set(statsRef, {
              ...statsAfter2,
              averageResolutionTime: avgTime2
            });
            telemetry.log(
              "debug",
              `[ModuleInterceptor] Module cache hit: ${request2.moduleId} (${duration2}ms)`
            );
            return {
              success: true,
              module: cachedModule.value,
              securityLevel: policy.securityLevel
            };
          }
          yield* Effect4.sleep("5 millis");
          telemetry.log(
            "info",
            `[ModuleInterceptor] Module loaded: ${request2.moduleId} for ${request2.extensionId}`
          );
          const module = { module: request2.moduleId };
          const currentCache = yield* moduleCacheRef.get;
          yield* Ref3.set(
            moduleCacheRef,
            HashMap3.set(currentCache, cacheKey, module)
          );
          const duration = Date.now() - startTime;
          resolutionTimes.push(duration);
          const allTimes = [...resolutionTimes];
          const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
          const statsAfter = yield* statsRef.get;
          yield* Ref3.set(statsRef, {
            ...statsAfter,
            averageResolutionTime: avgTime
          });
          return {
            success: true,
            module,
            securityLevel: policy.securityLevel
          };
        }), "interceptRequire");
        const resolveModule = /* @__PURE__ */ __name((extensionId, modulePath) => Effect4.gen(function* () {
          yield* Effect4.sleep("5 millis");
          if (!modulePath) {
            return yield* Effect4.fail(
              new ModuleNotFoundError(modulePath, extensionId)
            );
          }
          const resolvedPath = `/node_modules/${modulePath}/index.js`;
          return resolvedPath;
        }), "resolveModule");
        const setSecurityPolicy = /* @__PURE__ */ __name((policy) => Effect4.gen(function* () {
          const currentPolicies = yield* policiesRef.get;
          yield* Ref3.set(
            policiesRef,
            HashMap3.set(currentPolicies, policy.extensionId, policy)
          );
          telemetry.log(
            "info",
            `[ModuleInterceptor] Security policy set for extension ${policy.extensionId} (${policy.securityLevel})`
          );
        }), "setSecurityPolicy");
        const getSecurityPolicy = /* @__PURE__ */ __name((extensionId) => Effect4.gen(function* () {
          const policies = yield* policiesRef.get;
          const policy = HashMap3.get(policies, extensionId);
          if (policy._tag === "None") {
            return yield* Effect4.fail(
              new SecurityPolicyNotFoundError(extensionId)
            );
          }
          return policy.value;
        }), "getSecurityPolicy");
        const validateModuleSecurity = /* @__PURE__ */ __name((extensionId, moduleId) => Effect4.gen(function* () {
          const policies = yield* policiesRef.get;
          const policyOpt = HashMap3.get(policies, extensionId);
          if (policyOpt._tag === "None") {
            const policy2 = { ...defaultSecurityPolicy, extensionId };
            return !policy2.blockedModules.includes(moduleId) || policy2.allowedModules.includes(moduleId) || isNodeBuiltin(moduleId);
          }
          const policy = policyOpt.value;
          return !policy.blockedModules.includes(moduleId) || policy.allowedModules.includes(moduleId) || isNodeBuiltin(moduleId);
        }), "validateModuleSecurity");
        const getStatistics = Effect4.gen(function* () {
          return yield* statsRef.get;
        });
        const registerVscodeAPI = /* @__PURE__ */ __name((extensionId, api) => Effect4.gen(function* () {
          vscodeAPIRegistry.set(extensionId, api);
          telemetry.log(
            "info",
            `[ModuleInterceptor] Registered vscode API for extension: ${extensionId}`
          );
        }), "registerVscodeAPI");
        return {
          initialize,
          install,
          registerVscodeAPI,
          interceptRequire,
          resolveModule,
          setSecurityPolicy,
          getSecurityPolicy,
          validateModuleSecurity,
          getStatistics
        };
      })
    );
    makeMockModuleInterceptor = /* @__PURE__ */ __name(() => ({
      initialize: Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
      }),
      install: Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
      }),
      registerVscodeAPI: /* @__PURE__ */ __name((_extensionId, _api) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
      }), "registerVscodeAPI"),
      interceptRequire: /* @__PURE__ */ __name((request2) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
        return {
          success: true,
          module: { mock: true, moduleId: request2.moduleId },
          securityLevel: "SANDBOXED" /* SANDBOXED */
        };
      }), "interceptRequire"),
      resolveModule: /* @__PURE__ */ __name((_extensionId, modulePath) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
        return `/node_modules/${modulePath}/index.js`;
      }), "resolveModule"),
      setSecurityPolicy: /* @__PURE__ */ __name((_policy) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
      }), "setSecurityPolicy"),
      getSecurityPolicy: /* @__PURE__ */ __name((extensionId) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
        return {
          extensionId,
          allowedModules: ["path", "util"],
          blockedModules: ["fs"],
          securityLevel: "SANDBOXED" /* SANDBOXED */
        };
      }), "getSecurityPolicy"),
      validateModuleSecurity: /* @__PURE__ */ __name((_extensionId, _moduleId) => Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
        return true;
      }), "validateModuleSecurity"),
      getStatistics: Effect4.gen(function* () {
        yield* Effect4.sleep("1 millis");
        return {
          totalInterceptions: 100,
          blockedModules: 5,
          averageResolutionTime: 2.5,
          securityViolations: 3
        };
      })
    }), "makeMockModuleInterceptor");
    ModuleInterceptorMock = Layer4.effect(
      ModuleInterceptor,
      Effect4.succeed(makeMockModuleInterceptor())
    );
  }
});

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect5 from "effect/Effect";
var IMountainClientService;
var init_Service = __esm({
  "Source/Interfaces/I/Mountain/Client/Service.ts"() {
    "use strict";
    IMountainClientService = Effect5.Service()(
      "Service/MountainClient",
      {
        effect: Effect5.gen(function* () {
          return {};
        })
      }
    );
  }
});

// Source/Services/Mountain/Client/Service.ts
var Service_exports = {};
__export(Service_exports, {
  MountainClientService: () => MountainClientService,
  MountainClientServiceLayer: () => MountainClientServiceLayer
});
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { v4 as uuidv4 } from "uuid";
var __filename, __dirname, require2, CircuitBreakerState, ConnectionState, MountainClientService, MountainClientServiceLayer;
var init_Service2 = __esm({
  "Source/Services/Mountain/Client/Service.ts"() {
    "use strict";
    init_Service();
    init_Log();
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    require2 = createRequire(import.meta.url);
    CircuitBreakerState = /* @__PURE__ */ ((CircuitBreakerState2) => {
      CircuitBreakerState2["Closed"] = "CLOSED";
      CircuitBreakerState2["Open"] = "OPEN";
      CircuitBreakerState2["HalfOpen"] = "HALF_OPEN";
      return CircuitBreakerState2;
    })(CircuitBreakerState || {});
    ConnectionState = /* @__PURE__ */ ((ConnectionState2) => {
      ConnectionState2["Disconnected"] = "DISCONNECTED";
      ConnectionState2["Connecting"] = "CONNECTING";
      ConnectionState2["Connected"] = "CONNECTED";
      ConnectionState2["Degraded"] = "DEGRADED";
      ConnectionState2["Failed"] = "FAILED";
      return ConnectionState2;
    })(ConnectionState || {});
    MountainClientService = class {
      static {
        __name(this, "MountainClientService");
      }
      _serviceBrand;
      // Core gRPC state
      client = null;
      channel = null;
      mountainHost = "localhost";
      mountainPort = 50051;
      // Default Mountain gRPC port
      connectionState = "DISCONNECTED" /* Disconnected */;
      connectionStartTime = 0;
      errorCount = 0;
      requestCounter = 0;
      activeRequests = /* @__PURE__ */ new Map();
      // Circuit breaker
      circuitBreakerState = "CLOSED" /* Closed */;
      circuitBreakerFailureCount = 0;
      circuitBreakerSuccessCount = 0;
      circuitBreakerThreshold = 5;
      circuitBreakerSuccessThreshold = 3;
      circuitBreakerTimeout = 6e4;
      // 60s recovery timeout
      circuitBreakerOpenTime = 0;
      circuitBreakerHalfOpenAttempts = 0;
      // Retry config with exponential backoff
      maxRetries = 3;
      baseRetryDelay = 1e3;
      maxRetryDelay = 1e4;
      retryJitterFactor = 0.2;
      // Health monitoring
      healthCheckInterval = null;
      healthCheckPeriod = 3e4;
      lastHealthCheck = 0;
      consecutiveSuccessfulHealthChecks = 0;
      healthCheckFailures = 0;
      lastHealthCheckError = null;
      // Performance metrics
      totalRequests = 0;
      totalFailures = 0;
      totalSuccesses = 0;
      averageResponseTime = 0;
      maxResponseTime = 0;
      minResponseTime = Infinity;
      // Connection metadata
      clientVersion = "1.0.0";
      clientId = uuidv4();
      sessionId = uuidv4();
      constructor() {
        this._serviceBrand = void 0;
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`
        );
        this.parseEnvironment();
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`
        );
        this.registerShutdownHandlers();
      }
      /**
       * Parse environment variables
       */
      parseEnvironment() {
        const mountainHost = process.env.MOUNTAIN_CONNECTION_HOST || "localhost";
        const mountainPort = process.env.MOUNTAIN_GRPC_PORT || "50051";
        const connectionTimeout = process.env.MOUNTAIN_CONNECTION_TIMEOUT || "30000";
        const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || "3";
        const enableTLS = process.env.MOUNTAIN_ENABLE_TLS || "false";
        const healthCheckPeriod = process.env.MOUNTAIN_HEALTH_CHECK_PERIOD || "30000";
        this.mountainHost = mountainHost;
        this.mountainPort = parseInt(mountainPort, 10);
        if (maxRetries) {
          this.maxRetries = parseInt(maxRetries, 10);
        }
        if (healthCheckPeriod) {
          this.healthCheckPeriod = parseInt(healthCheckPeriod, 10);
        }
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`
        );
        if (!this.isValidHost(this.mountainHost)) {
          throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
        }
        if (this.mountainPort < 1 || this.mountainPort > 65535) {
          throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
        }
        if (this.maxRetries < 0 || this.maxRetries > 10) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`
          );
          this.maxRetries = 3;
        }
        if (this.healthCheckPeriod < 5e3 || this.healthCheckPeriod > 12e4) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`
          );
          this.healthCheckPeriod = 3e4;
        }
      }
      /**
       * Validate host configuration
       */
      isValidHost(host) {
        if (!host || host.trim().length === 0) {
          return false;
        }
        const validHostPatterns = [
          /^localhost$/,
          // localhost
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
          // IPv4
          /^\[[0-9a-fA-F:]+\]$/,
          // IPv6 (bracketed)
          /^[0-9a-fA-F:]+$/,
          // IPv6 (unbracketed)
          /^[a-zA-Z0-9.-]+$/,
          // Domain name
          /^[a-zA-Z0-9_-]+$/,
          // Simple hostname
          /^unix:[\/\\].+$/
          // Unix domain socket
        ];
        return validHostPatterns.some((pattern) => pattern.test(host));
      }
      /**
       * Register shutdown handlers
       */
      registerShutdownHandlers() {
        process.on("SIGTERM", () => {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Received SIGTERM, shutting down gracefully"
          );
          this.disconnect().catch((error) => {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Graceful shutdown failed:",
              error
            );
          });
        });
        process.on("SIGINT", () => {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Received SIGINT, shutting down gracefully"
          );
          this.disconnect().catch((error) => {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Graceful shutdown failed:",
              error
            );
          });
        });
        if (typeof process !== "undefined" && process.env && process.env.VSCODE_PID) {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Running in VS Code extension context"
          );
        }
      }
      /**
       * Connect to Mountain gRPC server
       */
      async connect() {
        this.CheckCircuitBreaker();
        if (this.connectionState === "CONNECTED" /* Connected */ || this.connectionState === "CONNECTING" /* Connecting */) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`
          );
          return;
        }
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort} (Session: ${this.sessionId})`
        );
        this.connectionState = "CONNECTING" /* Connecting */;
        try {
          const packageDefinition = await this.loadProtocolDefinition();
          const protoDescriptor = grpc.loadPackageDefinition(
            packageDefinition
          );
          const target = `${this.mountainHost}:${this.mountainPort}`;
          const channelOptions = {
            "grpc.max_receive_message_length": 1024 * 1024 * 100,
            // 100MB max message size
            "grpc.max_send_message_length": 1024 * 1024 * 100,
            // 100MB max message size
            "grpc.keepalive_time_ms": 1e4,
            // 10s keepalive ping
            "grpc.keepalive_timeout_ms": 5e3,
            // 5s keepalive timeout
            "grpc.keepalive_permit_without_calls": 1,
            // Allow keepalive without calls
            "grpc.http2.max_pings_without_data": 0,
            // No pings without data
            "grpc.http2.min_time_between_pings_ms": 1e4,
            // 10s min between pings
            "grpc.http2.min_ping_interval_without_data_ms": 3e4,
            // 30s min ping interval
            "grpc.enable_retries": 1,
            // Enable gRPC built-in retries
            "grpc.max_retry_attempts": 3,
            // Max retry attempts
            "grpc.initial_reconnect_backoff_ms": 1e3,
            // Initial reconnect backoff
            "grpc.max_reconnect_backoff_ms": 3e4,
            // Max reconnect backoff
            "grpc.enable_channelz": 0
            // Disable channelz for perf
          };
          this.client = new (protoDescriptor.Vine?.MountainService || protoDescriptor.MountainService)(
            target,
            grpc.credentials.createInsecure(),
            channelOptions
          );
          await this.waitForConnection();
          this.connectionState = "CONNECTED" /* Connected */;
          this.connectionStartTime = Date.now();
          this.errorCount = 0;
          this.consecutiveSuccessfulHealthChecks = 0;
          this.healthCheckFailures = 0;
          this.startHealthMonitoring();
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`
          );
          this.UpdateCircuitBreaker(true);
        } catch (error) {
          this.connectionState = "FAILED" /* Failed */;
          this.errorCount++;
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Failed to connect to Mountain:`,
            error
          );
          this.UpdateCircuitBreaker(false, error);
          throw new Error(
            `Failed to connect to Mountain: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      /**
       * Load protocol definition with fallback strategies
       */
      async loadProtocolDefinition() {
        CocoonDevLog2(
          "mountain-client",
          "[MountainClientService] Loading Vine.proto protocol definition"
        );
        try {
          const fs = require2("fs");
          const path = require2("path");
          const SearchPaths = [
            path.resolve(
              __dirname,
              "../../../../Mountain/Proto/Vine.proto"
            ),
            path.resolve(
              process.cwd(),
              "Element/Mountain/Proto/Vine.proto"
            ),
            path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto")
          ];
          let vineProtoPath = null;
          for (const P of SearchPaths) {
            if (fs.existsSync(P)) {
              vineProtoPath = P;
              break;
            }
          }
          if (vineProtoPath) {
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Found Vine.proto at: ${vineProtoPath}`
            );
            return protoLoader.loadSync(vineProtoPath, {
              keepCase: true,
              // Preserve field names
              longs: String,
              // Use String for uint64 compatibility
              enums: String,
              // Use String for enum compatibility
              defaults: true,
              // Include default values
              oneofs: true,
              // Support oneof fields
              includeDirs: [path.dirname(vineProtoPath)],
              // Include proto directory
              arrays: true,
              // Support repeated fields
              objects: true,
              // Support message objects
              bytes: Buffer
              // Use Buffer for bytes fields
            });
          } else {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Vine.proto not found at:",
              vineProtoPath
            );
            const fallbackProtoContent = `syntax = "proto3";

package Vine;

service MountainService {

    rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);

    rpc SendCocoonNotification(GenericNotification) returns (Empty);

    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

service CocoonService {

    rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);

    rpc SendMountainNotification(GenericNotification) returns (Empty);

    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

message GenericRequest {

    uint64 RequestIdentifier = 1;

    string Method = 2;

    bytes Parameter = 3;
}

message GenericResponse {

    uint64 RequestIdentifier = 1;

    bytes Result = 2;

    optional RPCError error = 3;
}

message GenericNotification {

    string Method = 1;

    bytes Parameter = 2;
}

message RPCError {

    int32 Code = 1;

    string Message = 2;

    bytes Data = 3;
}

message CancelOperationRequest {

    uint64 RequestIdentifierToCancel = 1;
}

message Empty {}

message RPCDataPayload {

    bytes Data = 1;
}`;
            const tempDir = require2("os").tmpdir();
            const tempProtoPath = path.join(tempDir, "vine_fallback.proto");
            fs.writeFileSync(tempProtoPath, fallbackProtoContent);
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Using fallback protocol at: ${tempProtoPath}`
            );
            return protoLoader.loadSync(tempProtoPath, {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
              arrays: true,
              objects: true,
              bytes: Buffer
            });
          }
        } catch (error) {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Failed to load protocol definition:",
            error
          );
          throw new Error(
            `Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      /**
       * Wait for connection with timeout
       */
      waitForConnection() {
        return new Promise((resolve, reject) => {
          if (!this.client) {
            reject(new Error("Client not initialized"));
            return;
          }
          const startTime = Date.now();
          const timeout = 3e3;
          const checkConnection = /* @__PURE__ */ __name(() => {
            const channel = this.client.getChannel();
            if (channel) {
              const state = channel.getConnectivityState(true);
              if (state === grpc.connectivityState.READY) {
                CocoonDevLog2(
                  "mountain-client",
                  "[MountainClientService] Connection established and ready"
                );
                resolve();
                return;
              } else if (state === grpc.connectivityState.TRANSIENT_FAILURE || state === grpc.connectivityState.SHUTDOWN) {
                reject(
                  new Error(
                    `Connection failed with state: ${grpc.connectivityState[state]}`
                  )
                );
                return;
              }
            }
            if (Date.now() - startTime > timeout) {
              reject(new Error("Connection timeout exceeded"));
              return;
            }
            setTimeout(checkConnection, 100);
          }, "checkConnection");
          setTimeout(checkConnection, 100);
        });
      }
      /**
       * Send request to Mountain with circuit breaker and retry logic
       */
      async sendRequest(method, parameters, cancellationToken) {
        this.CheckCircuitBreaker();
        if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
          throw new Error("Not connected to Mountain");
        }
        const requestIdentifier = this.generateRequestId();
        const startTime = Date.now();
        this.activeRequests.set(BigInt(requestIdentifier), {
          method,
          startTime
        });
        if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`
          );
        }
        try {
          if (cancellationToken?.isCancellationRequested) {
            throw new Error("Request cancelled before execution");
          }
          const request2 = {
            RequestIdentifier: BigInt(requestIdentifier),
            Method: method,
            Parameter: this.SerializeParameters(parameters)
          };
          if (method === "tree.register" && typeof process !== "undefined" && process.env["Trace"]?.includes("tree-latency")) {
            try {
              const Timestamp = process.hrtime.bigint().toString();
              const Correlation = parameters?.[0]?.viewId ?? `req-${requestIdentifier}`;
              process.stdout.write(
                `[LandFix:Tree] wire-send method=${method} correlation=${Correlation} t=${Timestamp}
`
              );
            } catch {
            }
          }
          const response = await this.SendRequestWithRetry(
            request2,
            cancellationToken
          );
          const duration = Date.now() - startTime;
          if (response.error) {
            const rpcError = response.error;
            const RpcMessage = String(rpcError.Message ?? "");
            const RpcCode = Number(rpcError.Code ?? 0);
            const IsFileSystemMethod = method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory";
            const IsFileWatcherBenign = method === "FileWatcher.Register" && /no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
              RpcMessage
            );
            const IsBenignNotFound = IsFileSystemMethod && (RpcCode === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
              RpcMessage
            )) || IsFileWatcherBenign;
            if (!IsBenignNotFound) {
              this.UpdateCircuitBreaker(
                false,
                new Error(
                  `RPC Error: ${rpcError.Message} (Code: ${rpcError.Code})`
                )
              );
            }
            const error = new Error(
              `Mountain request failed: ${rpcError.Message}`
            );
            error.code = rpcError.Code;
            error.data = rpcError.Data ? this.DeserializeResponse(rpcError.Data) : void 0;
            throw error;
          }
          const responseData = this.DeserializeResponse(response.Result);
          if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Request ${method} completed successfully in ${duration}ms`
            );
          }
          this.trackRequestMetrics(method, duration, true);
          this.UpdateCircuitBreaker(true);
          return responseData;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.errorCount++;
          const ErrorMessage = error instanceof Error ? error.message : String(error);
          const ErrorCode = Number(
            error?.code ?? 0
          );
          const IsCatchBenignFsMethod = method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory";
          const IsCatchBenignFileWatcher = method === "FileWatcher.Register" && /no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
            ErrorMessage
          );
          const IsBenignNotFound = IsCatchBenignFsMethod && (ErrorCode === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
            ErrorMessage
          )) || IsCatchBenignFileWatcher;
          const IsBenignMissingCommand = method === "Command.Execute" && /Command '[^']+' not found/i.test(ErrorMessage);
          const TraceMountainClient = process.env["Trace"]?.includes(
            "mountain-client-verbose"
          );
          if (IsBenignNotFound) {
            if (TraceMountainClient) {
              process.stdout.write(
                `[LandFix:MountainClient] ${method} 404 after ${duration}ms (benign) - ${ErrorMessage}
`
              );
            }
          } else if (IsBenignMissingCommand) {
            if (TraceMountainClient) {
              process.stdout.write(
                `[LandFix:MountainClient] ${method} missing-command after ${duration}ms (benign) - ${ErrorMessage}
`
              );
            }
          } else {
            this.UpdateCircuitBreaker(false, error);
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Request ${method} failed after ${duration}ms:`,
              error
            );
          }
          if (cancellationToken?.isCancellationRequested) {
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Request ${requestIdentifier} was cancelled`
            );
            throw new Error(`Request ${requestIdentifier} was cancelled`);
          }
          if (this.isConnectionError(error)) {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Connection error detected, attempting auto-reconnect"
            );
            try {
              await this.reconnect();
              CocoonDevLog2(
                "mountain-client",
                "[MountainClientService] Auto-reconnect successful, retrying request"
              );
              return this.sendRequest(
                method,
                parameters,
                cancellationToken
              );
            } catch (reconnectError) {
              CocoonDevLog2(
                "mountain-client",
                "[MountainClientService] Auto-reconnect failed:",
                reconnectError
              );
            }
          }
          throw error;
        } finally {
          this.activeRequests.delete(BigInt(requestIdentifier));
        }
      }
      /**
       * Track request metrics
       */
      trackRequestMetrics(method, duration, success) {
        this.totalRequests++;
        if (success) {
          this.totalSuccesses++;
        } else {
          this.totalFailures++;
        }
        this.averageResponseTime = (this.averageResponseTime * (this.totalRequests - 1) + duration) / this.totalRequests;
        this.maxResponseTime = Math.max(this.maxResponseTime, duration);
        this.minResponseTime = Math.min(this.minResponseTime, duration);
        if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`
          );
        }
      }
      /**
       * Check if error is a connection error
       */
      isConnectionError(error) {
        if (!error) return false;
        const connectionErrorPatterns = [
          // gRPC error codes
          error.code === "UNAVAILABLE",
          error.code === "DEADLINE_EXCEEDED",
          error.code === "CANCELLED",
          error.code === "UNKNOWN",
          // Numeric gRPC error codes
          error.code === 14,
          // UNAVAILABLE
          error.code === 4,
          // DEADLINE_EXCEEDED
          error.code === 1,
          // CANCELLED
          error.code === 2,
          // UNKNOWN
          // Error message patterns
          error.message?.includes("connect"),
          error.message?.includes("connection"),
          error.message?.includes("socket"),
          error.message?.includes("network"),
          error.message?.includes("ECONN"),
          error.message?.includes("ENOTFOUND"),
          error.message?.includes("ETIMEDOUT"),
          error.message?.includes("refused"),
          error.message?.includes("timeout"),
          error.message?.includes("channel"),
          // Node.js error codes
          error.code === "ECONNREFUSED",
          error.code === "ECONNRESET",
          error.code === "ETIMEDOUT",
          error.code === "ENOTFOUND"
        ];
        return connectionErrorPatterns.some((pattern) => pattern === true);
      }
      /**
       * Send request with exponential backoff retry
       */
      async SendRequestWithRetry(request2) {
        if (!this.client) {
          throw new Error("Client not initialized");
        }
        let lastError = null;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
          try {
            const response = await new Promise(
              (resolve, reject) => {
                this.client.ProcessCocoonRequest(
                  request2,
                  (error, response2) => {
                    if (error) reject(error);
                    else resolve(response2);
                  }
                );
              }
            );
            return response;
          } catch (error) {
            lastError = error;
            if (!this.isTransientError(error)) {
              throw error;
            }
            if (attempt < this.maxRetries - 1) {
              const delay = this.CalculateRetryDelay(attempt);
              CocoonDevLog2(
                "mountain-client",
                `[MountainClientService] Request ${request2.RequestIdentifier} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms:`,
                error
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError || new Error("Max retry attempts exceeded");
      }
      /**
       * Calculate retry delay with exponential backoff
       */
      CalculateRetryDelay(attempt) {
        const exponentialDelay = this.baseRetryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        return Math.min(exponentialDelay + jitter, this.maxRetryDelay);
      }
      /**
       * Check if error is transient and should be retried
       */
      isTransientError(error) {
        const transientCodes = [
          "UNAVAILABLE",
          "DEADLINE_EXCEEDED",
          "INTERNAL",
          "RESOURCE_EXHAUSTED"
        ];
        return error && (transientCodes.includes(error.code) || error.code === 14 || // UNAVAILABLE
        error.code === 4 || // DEADLINE_EXCEEDED
        this.isConnectionError(error));
      }
      /**
       * Serialize parameters to buffer with validation
       */
      SerializeParameters(parameters) {
        try {
          if (parameters === null || parameters === void 0) {
            return Buffer.from(JSON.stringify({}));
          }
          const serialized = JSON.stringify(parameters);
          return Buffer.from(serialized, "utf8");
        } catch (error) {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Failed to serialize parameters:",
            error
          );
          throw new Error(
            `Parameter serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      /**
       * Deserialize response buffer with error handling
       */
      DeserializeResponse(buffer) {
        try {
          if (!buffer || buffer.length === 0) {
            return {};
          }
          const serialized = buffer.toString("utf8");
          return JSON.parse(serialized);
        } catch (error) {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Failed to deserialize response:",
            error
          );
          return {};
        }
      }
      /**
       * Update circuit breaker state based on operation result
       */
      UpdateCircuitBreaker(success) {
        if (success) {
          this.circuitBreakerFailureCount = 0;
          if (this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)"
            );
            CocoonDevLog2(
              "breaker",
              `[Breaker] transition from=HalfOpen to=Closed reason=service-recovered`
            );
            this.circuitBreakerState = "CLOSED" /* Closed */;
          }
        } else {
          this.circuitBreakerFailureCount++;
          if (this.circuitBreakerFailureCount >= this.circuitBreakerThreshold) {
            const PriorState = this.circuitBreakerState;
            this.circuitBreakerState = "OPEN" /* Open */;
            this.circuitBreakerOpenTime = Date.now();
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`
            );
            CocoonDevLog2(
              "breaker",
              `[Breaker] transition from=${PriorState} to=Open failures=${this.circuitBreakerFailureCount} threshold=${this.circuitBreakerThreshold}`
            );
          }
        }
      }
      /**
       * Check circuit breaker state and throw if open
       */
      CheckCircuitBreaker() {
        if (this.circuitBreakerState === "OPEN" /* Open */) {
          if (Date.now() - this.circuitBreakerOpenTime >= this.circuitBreakerTimeout) {
            this.circuitBreakerState = "HALF_OPEN" /* HalfOpen */;
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery"
            );
            CocoonDevLog2(
              "breaker",
              `[Breaker] transition from=Open to=HalfOpen reason=timeout-elapsed`
            );
          } else {
            throw new Error(
              `Circuit breaker is OPEN. Service unavailable. Time remaining until half-open: ${Math.round((this.circuitBreakerTimeout - (Date.now() - this.circuitBreakerOpenTime)) / 1e3)}s`
            );
          }
        }
      }
      /**
       * Start health monitoring
       */
      startHealthMonitoring() {
        if (this.healthCheckInterval) {
          return;
        }
        this.lastHealthCheck = Date.now();
        this.healthCheckInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.healthCheckPeriod);
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Health monitoring started (interval: ${this.healthCheckPeriod}ms)`
        );
      }
      /**
       * Stop health monitoring
       */
      stopHealthMonitoring() {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Health monitoring stopped"
          );
        }
      }
      /**
       * Perform health check
       */
      async performHealthCheck() {
        this.lastHealthCheck = Date.now();
        try {
          const channel = this.client?.getChannel?.();
          if (channel) {
            const state = channel.getConnectivityState(true);
            if (state !== grpc.connectivityState.READY) {
              await new Promise((resolve, reject) => {
                const deadline = Date.now() + 3e3;
                const poll = /* @__PURE__ */ __name(() => {
                  const st = channel.getConnectivityState(false);
                  if (st === grpc.connectivityState.READY) {
                    resolve();
                  } else if (st === grpc.connectivityState.TRANSIENT_FAILURE || st === grpc.connectivityState.SHUTDOWN) {
                    reject(
                      new Error(
                        `Channel in terminal state: ${grpc.connectivityState[st]}`
                      )
                    );
                  } else if (Date.now() >= deadline) {
                    reject(
                      new Error(
                        `Channel not ready after 3s (state: ${st})`
                      )
                    );
                  } else {
                    setTimeout(poll, 100);
                  }
                }, "poll");
                setTimeout(poll, 100);
              });
            }
          }
          this.consecutiveSuccessfulHealthChecks++;
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`
          );
          if (this.consecutiveSuccessfulHealthChecks >= 3 && this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
            this.UpdateCircuitBreaker(true);
          }
        } catch (error) {
          this.consecutiveSuccessfulHealthChecks = 0;
          this.errorCount++;
          this.UpdateCircuitBreaker(false);
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Health check failed:",
            error
          );
          if (this.connectionState !== "CONNECTED" /* Connected */) {
            CocoonDevLog2(
              "mountain-client",
              "[MountainClientService] Connection lost, attempting reconnect"
            );
            this.reconnect().catch((err) => {
              CocoonDevLog2(
                "mountain-client",
                "[MountainClientService] Auto-reconnect failed:",
                err
              );
            });
          }
        }
      }
      /**
       * Send notification to Mountain
       */
      async sendNotification(method, parameters) {
        if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
          throw new Error("Not connected to Mountain");
        }
        const TraceGrpcVerbose = typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose");
        if (TraceGrpcVerbose) {
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Sending notification to Mountain: ${method}`
          );
        }
        try {
          const notification = {
            Method: method,
            Parameter: Buffer.from(JSON.stringify(parameters))
          };
          await this.makeNotification(notification);
          if (TraceGrpcVerbose) {
            CocoonDevLog2(
              "mountain-client",
              `[MountainClientService] Notification ${method} sent successfully`
            );
          }
        } catch (error) {
          this.errorCount++;
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Notification ${method} failed:`,
            error
          );
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Notification ${method} failed, but continuing (fire-and-forget)`
          );
        }
      }
      /**
       * Make gRPC notification with promise interface
       */
      async makeNotification(notification) {
        if (!this.client) {
          throw new Error("Client not initialized");
        }
        try {
          await new Promise((resolve, reject) => {
            this.client.SendCocoonNotification(
              notification,
              (error) => {
                if (error) reject(error);
                else resolve();
              }
            );
          });
        } catch (error) {
          throw error;
        }
      }
      /**
       * Cancel operation
       */
      async cancelOperation(requestIdentifier, reason) {
        if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
          throw new Error("Not connected to Mountain");
        }
        CocoonDevLog2(
          "mountain-client",
          `[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`
        );
        try {
          const cancelRequest = {
            RequestIdentifierToCancel: BigInt(requestIdentifier)
            // Use BigInt for uint64 compatibility
          };
          await this.makeCancelRequest(cancelRequest);
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Operation ${requestIdentifier} canceled`
          );
        } catch (error) {
          this.errorCount++;
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Cancel operation ${requestIdentifier} failed:`,
            error
          );
          CocoonDevLog2(
            "mountain-client",
            `[MountainClientService] Cancel operation ${requestIdentifier} failed, but continuing`
          );
        }
      }
      /**
       * Make gRPC cancel request with promise interface
       */
      async makeCancelRequest(cancelRequest) {
        if (!this.client) {
          throw new Error("Client not initialized");
        }
        try {
          await new Promise((resolve, reject) => {
            this.client.CancelOperation(cancelRequest, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
        } catch (error) {
          throw error;
        }
      }
      /**
       * Generate unique request identifier
       */
      generateRequestId() {
        return ++this.requestCounter;
      }
      /**
       * Disconnect from Mountain
       */
      async disconnect() {
        if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
          CocoonDevLog2(
            "mountain-client",
            "[MountainClientService] Not connected to Mountain (already disconnected)"
          );
          return;
        }
        CocoonDevLog2(
          "mountain-client",
          "[MountainClientService] Disconnecting from Mountain"
        );
        this.stopHealthMonitoring();
        this.client = null;
        this.connectionState = "DISCONNECTED" /* Disconnected */;
        CocoonDevLog2(
          "mountain-client",
          "[MountainClientService] Disconnected from Mountain"
        );
      }
      /**
       * Reconnect to Mountain
       */
      async reconnect() {
        CocoonDevLog2(
          "mountain-client",
          "[MountainClientService] Reconnecting to Mountain"
        );
        await this.disconnect();
        await this.connect();
        CocoonDevLog2(
          "mountain-client",
          "[MountainClientService] Reconnected to Mountain"
        );
      }
      /**
       * Get connection status with circuit breaker information
       */
      getStatus() {
        const IsConnected = this.connectionState === "CONNECTED" /* Connected */;
        return {
          connected: IsConnected,
          mountainHost: this.mountainHost,
          mountainPort: this.mountainPort,
          errorCount: this.errorCount,
          ...IsConnected ? { uptime: Date.now() - this.connectionStartTime } : {},
          circuitBreakerState: this.circuitBreakerState,
          circuitBreakerFailureCount: this.circuitBreakerFailureCount,
          ...this.lastHealthCheck ? { lastHealthCheck: new Date(this.lastHealthCheck) } : {}
        };
      }
    };
    MountainClientServiceLayer = IMountainClientService.Default;
  }
});

// Source/Effect/Mountain/Client.ts
import { Context as Context5, Effect as Effect7, Layer as Layer6, Ref as Ref4, SubscriptionRef as SubscriptionRef4 } from "effect";
var ConnectionError, RPCError2, DisconnectionError, MountainClientTag, MountainClient, MountainClientLive, makeMockMountainClient, MountainClientMock;
var init_Client = __esm({
  "Source/Effect/Mountain/Client.ts"() {
    "use strict";
    init_Service2();
    init_Telemetry();
    ConnectionError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.message = message;
        this.cause = cause;
      }
      message;
      cause;
      static {
        __name(this, "ConnectionError");
      }
      _tag = "ConnectionError";
    };
    RPCError2 = class extends Error {
      constructor(method, message, cause) {
        super(message);
        this.method = method;
        this.message = message;
        this.cause = cause;
      }
      method;
      message;
      cause;
      static {
        __name(this, "RPCError");
      }
      _tag = "RPCError";
      method;
    };
    DisconnectionError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.message = message;
        this.cause = cause;
      }
      message;
      cause;
      static {
        __name(this, "DisconnectionError");
      }
      _tag = "DisconnectionError";
    };
    MountainClientTag = class extends Context5.Tag("Cocoon/MountainClient")() {
      static {
        __name(this, "MountainClientTag");
      }
    };
    MountainClient = MountainClientTag;
    MountainClientLive = Layer6.effect(
      MountainClient,
      Effect7.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const stateRef = yield* SubscriptionRef4.make({
          _tag: "Disconnected"
        });
        let realClient;
        let currentConfig;
        let metrics = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageLatency: 0,
          lastRequestTime: 0
        };
        const LatencyEmaAlpha = 0.1;
        let latencyEma = 0;
        let latencyEmaInitialized = false;
        let serverVersion = "";
        const connect = /* @__PURE__ */ __name((config) => Effect7.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag === "Connected") {
            telemetry.log(
              "warn",
              "[MountainClient] Already connected to Mountain"
            );
            return;
          }
          currentConfig = config ?? {
            host: "localhost",
            port: 50052,
            timeout: 5e3,
            maxRetries: 3,
            retryDelay: 1e3,
            enableCompression: true,
            enableMetrics: true
          };
          telemetry.log(
            "info",
            `[MountainClient] Connecting to Mountain at ${currentConfig.host}:${currentConfig.port}...`
          );
          yield* Ref4.set(stateRef, {
            _tag: "Connecting",
            attempt: 1
          });
          try {
            realClient = new MountainClientService();
            realClient.mountainHost = currentConfig.host;
            realClient.mountainPort = currentConfig.port;
            yield* Effect7.promise(() => realClient.connect());
            serverVersion = "1.0.0";
          } catch (error) {
            yield* Ref4.set(stateRef, {
              _tag: "Error",
              error: String(error)
            });
            telemetry.log(
              "error",
              `[MountainClient] Failed to connect to Mountain: ${String(error)}`
            );
            return yield* Effect7.fail(
              new ConnectionError(
                "Failed to connect to Mountain backend",
                error
              )
            );
          }
          yield* Ref4.set(stateRef, {
            _tag: "Connected",
            serverVersion,
            connectedAt: Date.now()
          });
          telemetry.log(
            "info",
            `[MountainClient] Connected to Mountain (v${serverVersion})`
          );
        }), "connect");
        const disconnect = Effect7.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Connected") {
            telemetry.log(
              "warn",
              "[MountainClient] Not connected to Mountain"
            );
            return;
          }
          yield* Ref4.set(stateRef, {
            _tag: "Disconnecting"
          });
          telemetry.log(
            "info",
            "[MountainClient] Disconnecting from Mountain..."
          );
          if (realClient) {
            yield* Effect7.promise(() => realClient.disconnect());
            realClient = void 0;
          }
          yield* Ref4.set(stateRef, {
            _tag: "Disconnected"
          });
          metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            lastRequestTime: 0
          };
          latencyEma = 0;
          latencyEmaInitialized = false;
          telemetry.log(
            "info",
            "[MountainClient] Disconnected from Mountain"
          );
        }).pipe(
          Effect7.catchAll(
            (error) => Effect7.gen(function* () {
              yield* Ref4.set(stateRef, {
                _tag: "Error",
                error: String(error)
              });
              telemetry.log(
                "error",
                `[MountainClient] Failed to disconnect: ${String(error)}`
              );
              return yield* Effect7.fail(
                new DisconnectionError("Failed to disconnect", error)
              );
            })
          )
        );
        const rpc = /* @__PURE__ */ __name((method) => (params) => Effect7.gen(function* () {
          const requestStartTime = Date.now();
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Connected") {
            metrics.failedRequests++;
            return yield* Effect7.fail(
              new RPCError2(method, "Not connected to Mountain")
            );
          }
          telemetry.log(
            "debug",
            `[MountainClient] RPC call: ${method}`,
            params
          );
          metrics.totalRequests++;
          try {
            if (!realClient) {
              return yield* Effect7.fail(
                new RPCError2(
                  method,
                  "Not connected to Mountain"
                )
              );
            }
            const Result = yield* Effect7.promise(
              () => realClient.sendRequest(method, params)
            );
            const processingTime = Date.now() - requestStartTime;
            if (latencyEmaInitialized) {
              latencyEma = processingTime * LatencyEmaAlpha + latencyEma * (1 - LatencyEmaAlpha);
            } else {
              latencyEma = processingTime;
              latencyEmaInitialized = true;
            }
            metrics.averageLatency = latencyEma;
            metrics.lastRequestTime = Date.now();
            metrics.successfulRequests++;
            telemetry.log(
              "debug",
              `[MountainClient] RPC success: ${method} (${processingTime}ms)`
            );
            return Result;
          } catch (error) {
            metrics.failedRequests++;
            telemetry.log(
              "error",
              `[MountainClient] RPC failed: ${method} (${String(error)})`
            );
            return yield* Effect7.fail(
              new RPCError2(
                method,
                `RPC call failed: ${String(error)}`,
                error
              )
            );
          }
        }), "rpc");
        const version = Effect7.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Connected") {
            return yield* Effect7.fail(
              new ConnectionError("Not connected to Mountain")
            );
          }
          return currentState.serverVersion;
        });
        const HealthCheckTimeoutMs = 1e3;
        const healthCheck = Effect7.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Connected") return false;
          if (!realClient) return false;
          const Outcome = yield* Effect7.promise(
            () => Promise.race([
              realClient.sendRequest("FileSystem.Stat", ["/"]).then(() => ({ Kind: "ok" })).catch((Err) => ({
                Kind: "app-error",
                Message: Err instanceof Error ? Err.message : String(Err)
              })),
              new Promise(
                (Resolve) => setTimeout(
                  () => Resolve({ Kind: "timeout" }),
                  HealthCheckTimeoutMs
                )
              )
            ])
          );
          if (Outcome.Kind === "timeout") {
            yield* Ref4.set(stateRef, {
              _tag: "Error",
              error: `Health check timed out after ${HealthCheckTimeoutMs}ms`
            });
            telemetry.log(
              "warn",
              `[MountainClient] Health check timed out; marking connection as Error state for auto-reconnect`
            );
            return false;
          }
          if (Outcome.Kind === "app-error") {
            const LooksLikeTransport = /UNAVAILABLE|transport|disconnect|ECONNREFUSED|ECONNRESET|NOT_FOUND service/i.test(
              Outcome.Message
            );
            if (LooksLikeTransport) {
              yield* Ref4.set(stateRef, {
                _tag: "Error",
                error: Outcome.Message
              });
              telemetry.log(
                "warn",
                `[MountainClient] Health check hit transport failure (${Outcome.Message}); marking Error state`
              );
              return false;
            }
          }
          return true;
        });
        const getMetrics = Effect7.succeed({ ...metrics });
        return {
          connectionState: stateRef.get,
          connectionChanges: Effect7.map(stateRef.get, (state) => [state]),
          connect,
          disconnect,
          rpc,
          version,
          healthCheck,
          getMetrics
        };
      })
    );
    makeMockMountainClient = /* @__PURE__ */ __name(() => {
      const mockState = {
        _tag: "Connected",
        serverVersion: "1.0.0",
        connectedAt: Date.now()
      };
      return {
        connectionState: Effect7.succeed(mockState),
        connectionChanges: Effect7.succeed([mockState]),
        connect: /* @__PURE__ */ __name(() => Effect7.succeed(void 0), "connect"),
        disconnect: /* @__PURE__ */ __name(() => Effect7.succeed(void 0), "disconnect"),
        rpc: /* @__PURE__ */ __name((method) => (params) => Effect7.succeed({
          success: true,
          data: { method, params, mock: true }
        }), "rpc"),
        version: Effect7.succeed("1.0.0"),
        healthCheck: Effect7.succeed(true),
        getMetrics: Effect7.succeed({
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageLatency: 0,
          lastRequestTime: 0
        })
      };
    }, "makeMockMountainClient");
    MountainClientMock = Layer6.effect(
      MountainClient,
      Effect7.succeed(makeMockMountainClient())
    );
  }
});

// Source/Effect/index.ts
var init_Effect = __esm({
  async "Source/Effect/index.ts"() {
    "use strict";
    await init_Bootstrap();
    init_Extension();
    init_Health();
    init_Interceptor();
    init_Client();
    await init_RPCServer();
    init_Telemetry();
  }
});

// Source/Service/Mapping.ts
var Mapping_exports = {};
__export(Mapping_exports, {
  EffectServices: () => EffectServices
});
import { Layer as Layer7 } from "effect";
var EffectServices;
var init_Mapping = __esm({
  async "Source/Service/Mapping.ts"() {
    "use strict";
    await init_Effect();
    EffectServices = {
      /**
       * Compose the main application layer.
       *
       * Layer deps: Telemetry → Health, MountainClient, ModuleInterceptor, Extension, RPCServer → Bootstrap
       */
      composeAppLayer: /* @__PURE__ */ __name(() => {
        const Telemetry2 = TelemetryLive;
        const Layer1 = Layer7.mergeAll(
          HealthLive.pipe(Layer7.provide(Telemetry2)),
          MountainClientLive.pipe(Layer7.provide(Telemetry2)),
          ModuleInterceptorLive.pipe(Layer7.provide(Telemetry2)),
          ExtensionLive.pipe(Layer7.provide(Telemetry2)),
          RPCServerLive.pipe(Layer7.provide(Telemetry2))
        );
        const Bootstrap = BootstrapLive.pipe(
          Layer7.provide(Telemetry2),
          Layer7.provide(Layer1)
        );
        return Layer7.mergeAll(Telemetry2, Layer1, Bootstrap);
      }, "composeAppLayer"),
      /**
       * Get individual service layers for fine-grained composition
       */
      getTelemetry: /* @__PURE__ */ __name(() => TelemetryLive, "getTelemetry"),
      getHealth: /* @__PURE__ */ __name(() => HealthLive, "getHealth"),
      getMountainClient: /* @__PURE__ */ __name(() => MountainClientLive, "getMountainClient"),
      getModuleInterceptor: /* @__PURE__ */ __name(() => ModuleInterceptorLive, "getModuleInterceptor"),
      getExtension: /* @__PURE__ */ __name(() => ExtensionLive, "getExtension"),
      getRPCServer: /* @__PURE__ */ __name(() => RPCServerLive, "getRPCServer"),
      getBootstrap: /* @__PURE__ */ __name(() => BootstrapLive, "getBootstrap")
    };
  }
});

// Source/Interfaces/I/Extension/Host/Service.ts
var Service_exports2 = {};
__export(Service_exports2, {
  IExtensionHostService: () => IExtensionHostService
});
import { Context as Context6 } from "effect";
var IExtensionHostService;
var init_Service3 = __esm({
  "Source/Interfaces/I/Extension/Host/Service.ts"() {
    "use strict";
    IExtensionHostService = Context6.Tag(
      "IExtensionHostService"
    );
  }
});

// Source/Interfaces/I/Configuration/Service.ts
var Service_exports3 = {};
__export(Service_exports3, {
  ConfigurationScope: () => ConfigurationScope,
  IConfigurationService: () => IConfigurationService
});
import { Context as Context7 } from "effect";
var ConfigurationScope, IConfigurationService;
var init_Service4 = __esm({
  "Source/Interfaces/I/Configuration/Service.ts"() {
    "use strict";
    ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope2) => {
      ConfigurationScope2["APPLICATION"] = "APPLICATION";
      ConfigurationScope2["WORKSPACE"] = "WORKSPACE";
      ConfigurationScope2["PROFILE"] = "PROFILE";
      return ConfigurationScope2;
    })(ConfigurationScope || {});
    IConfigurationService = Context7.Tag(
      "IConfigurationService"
    );
  }
});

// Source/Services/Language/Provider/Registry.ts
var Registry_exports = {};
__export(Registry_exports, {
  ExecuteCommand: () => ExecuteCommand,
  Get: () => Get,
  HasCommand: () => HasCommand,
  ListCommands: () => ListCommands,
  ListHandles: () => ListHandles,
  NextProviderHandle: () => NextProviderHandle,
  Register: () => Register,
  RegisterAutoHandle: () => RegisterAutoHandle,
  RegisterCommand: () => RegisterCommand,
  Unregister: () => Unregister,
  UnregisterCommand: () => UnregisterCommand
});
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    CocoonDevLog(
      "registry",
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
function NextProviderHandle() {
  return NextHandle++;
}
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
function ListCommands() {
  return Array.from(Commands.keys());
}
function ListHandles() {
  return Array.from(Callbacks.keys());
}
var Callbacks, NextHandle, Commands;
var init_Registry = __esm({
  "Source/Services/Language/Provider/Registry.ts"() {
    "use strict";
    Callbacks = /* @__PURE__ */ new Map();
    __name(Register, "Register");
    __name(Unregister, "Unregister");
    __name(Get, "Get");
    NextHandle = 1e4;
    __name(RegisterAutoHandle, "RegisterAutoHandle");
    __name(NextProviderHandle, "NextProviderHandle");
    Commands = /* @__PURE__ */ new Map();
    __name(RegisterCommand, "RegisterCommand");
    __name(HasCommand, "HasCommand");
    __name(ExecuteCommand, "ExecuteCommand");
    __name(UnregisterCommand, "UnregisterCommand");
    __name(ListCommands, "ListCommands");
    __name(ListHandles, "ListHandles");
  }
});

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey, DefaultHost, DefaultBatchWindowMilliseconds, DefaultBatchMaximum, ReadString, ReadBoolean, ReadNumber, TelemetryCaptureEnabled, Configuration_default;
var init_Configuration = __esm({
  "Source/Telemetry/PostHog/Configuration.ts"() {
    "use strict";
    DefaultKey = "";
    DefaultHost = "https://eu.i.posthog.com";
    DefaultBatchWindowMilliseconds = 3e3;
    DefaultBatchMaximum = 50;
    ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      return Value && Value.length > 0 ? Value : Fallback;
    }, "ReadString");
    ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      if (Value === void 0) return Fallback;
      return !["false", "0", "off", ""].includes(Value.toLowerCase());
    }, "ReadBoolean");
    ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
      const Value = process.env[Key];
      const Parsed = Value ? Number(Value) : Number.NaN;
      return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
    }, "ReadNumber");
    TelemetryCaptureEnabled = ReadBoolean("Capture", true);
    Configuration_default = /* @__PURE__ */ __name(() => ({
      Key: ReadString("Authorize", DefaultKey),
      Host: ReadString("Beam", DefaultHost),
      Enabled: ReadBoolean("Report", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production",
      BatchWindowMilliseconds: ReadNumber(
        "Buffer",
        DefaultBatchWindowMilliseconds
      ),
      BatchMaximum: ReadNumber("Batch", DefaultBatchMaximum),
      DistinctIdentifierSeed: process.env["Brand"] ?? "",
      OTLPEndpoint: ReadString("OTLPEndpoint", "http://127.0.0.1:4318"),
      OTLPEnabled: ReadBoolean("OTLPEnabled", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production"
    }), "default");
  }
});

// Source/Telemetry/OTLPBridge.ts
var OTLPBridge_exports = {};
__export(OTLPBridge_exports, {
  CaptureSpan: () => CaptureSpan,
  TraceIdentifier: () => TraceIdentifier,
  WithSpan: () => WithSpan,
  default: () => OTLPBridge_default
});
import * as NodeHttp from "node:http";
import * as NodeHttps from "node:https";
var Configuration, OTLPAvailable, RandomHex, TraceIdentifierCached, TraceIdentifier, NowNano, CaptureSpan, WithSpan, OTLPBridge_default;
var init_OTLPBridge = __esm({
  "Source/Telemetry/OTLPBridge.ts"() {
    "use strict";
    init_Configuration();
    Configuration = Configuration_default();
    OTLPAvailable = Configuration.OTLPEnabled;
    RandomHex = /* @__PURE__ */ __name((Bytes) => {
      let Output = "";
      for (let Index = 0; Index < Bytes; Index = Index + 1) {
        Output = Output + Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
      }
      return Output;
    }, "RandomHex");
    TraceIdentifier = /* @__PURE__ */ __name(() => {
      if (!TraceIdentifierCached) TraceIdentifierCached = RandomHex(16);
      return TraceIdentifierCached;
    }, "TraceIdentifier");
    NowNano = /* @__PURE__ */ __name(() => {
      const Hr = process.hrtime();
      return BigInt(Hr[0]) * 1000000000n + BigInt(Hr[1]);
    }, "NowNano");
    CaptureSpan = /* @__PURE__ */ __name((Name, StartNano, EndNano, Attributes = []) => {
      if (process.env["NODE_ENV"] === "production") return;
      if (!OTLPAvailable) return;
      const SpanIdentifier = RandomHex(8);
      const TraceIdentifierResolved = TraceIdentifier();
      const StatusCode = Name.includes("error") ? 2 : 1;
      const AttributesPayload = Attributes.map(([Key, Value]) => ({
        key: Key,
        value: { stringValue: Value }
      }));
      const Payload = JSON.stringify({
        resourceSpans: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: "land-editor-cocoon" }
                },
                {
                  key: "service.version",
                  value: { stringValue: "0.0.1" }
                },
                {
                  key: "land.tier",
                  value: { stringValue: "cocoon" }
                }
              ]
            },
            scopeSpans: [
              {
                scope: { name: "land.cocoon", version: "1.0.0" },
                spans: [
                  {
                    traceId: TraceIdentifierResolved,
                    spanId: SpanIdentifier,
                    name: Name,
                    kind: 1,
                    startTimeUnixNano: StartNano.toString(),
                    endTimeUnixNano: EndNano.toString(),
                    attributes: AttributesPayload,
                    status: { code: StatusCode }
                  }
                ]
              }
            ]
          }
        ]
      });
      try {
        const Address = new URL("/v1/traces", Configuration.OTLPEndpoint);
        const HttpModule = Address.protocol === "https:" ? NodeHttps : NodeHttp;
        const Request = HttpModule.request(
          {
            method: "POST",
            hostname: Address.hostname,
            port: Address.port || (Address.protocol === "https:" ? 443 : 80),
            path: Address.pathname,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(Payload)
            },
            timeout: 200
          },
          (Response) => {
            if (Response.statusCode === void 0 || Response.statusCode >= 300) {
              OTLPAvailable = false;
            }
            Response.resume();
          }
        );
        Request.on("error", () => {
          OTLPAvailable = false;
        });
        Request.on("timeout", () => {
          Request.destroy();
        });
        Request.write(Payload);
        Request.end();
      } catch {
        OTLPAvailable = false;
      }
    }, "CaptureSpan");
    WithSpan = /* @__PURE__ */ __name(async (Name, Body, Attributes = []) => {
      const StartNano = NowNano();
      try {
        const Output = await Body();
        const EndNano = NowNano();
        CaptureSpan(Name, StartNano, EndNano, Attributes);
        return Output;
      } catch (Error2) {
        const EndNano = NowNano();
        CaptureSpan(`${Name}:error`, StartNano, EndNano, [
          ...Attributes,
          ["error", String(Error2.message ?? Error2)]
        ]);
        throw Error2;
      }
    }, "WithSpan");
    OTLPBridge_default = { CaptureSpan, TraceIdentifier, WithSpan };
  }
});

// Source/Telemetry/PostHog/Event.ts
var BaseProperties, Create, CurrentTraceIdentifier, SetTraceIdentifier, Enrich, Event_default;
var init_Event = __esm({
  "Source/Telemetry/PostHog/Event.ts"() {
    "use strict";
    BaseProperties = {
      $app: "fiddee",
      $app_version: "0.0.1",
      $build_mode: "debug",
      $component: "cocoon",
      $tier: "cocoon",
      $lib: "cocoon-posthog-bridge"
    };
    Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
      Name,
      Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      Properties
    }), "Create");
    SetTraceIdentifier = /* @__PURE__ */ __name((Identifier) => {
      CurrentTraceIdentifier = Identifier;
    }, "SetTraceIdentifier");
    Enrich = /* @__PURE__ */ __name((Properties) => ({
      ...Properties,
      ...BaseProperties,
      $node_version: process.version,
      ...CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}
    }), "Enrich");
    Event_default = { Create, Enrich, SetTraceIdentifier };
  }
});

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps2 from "node:https";
var RequestTimeoutMilliseconds, Transport_default;
var init_Transport = __esm({
  "Source/Telemetry/PostHog/Transport.ts"() {
    "use strict";
    init_Event();
    RequestTimeoutMilliseconds = 5e3;
    Transport_default = /* @__PURE__ */ __name((Host, Key, DistinctIdentifier2, Batch) => {
      if (Batch.length === 0) return;
      const Payload = JSON.stringify({
        api_key: Key,
        batch: Batch.map((Entry) => ({
          event: Entry.Name,
          timestamp: Entry.Timestamp,
          distinct_id: DistinctIdentifier2,
          properties: Event_default.Enrich(Entry.Properties)
        }))
      });
      try {
        const Address = new URL("/batch/", Host);
        const Request = NodeHttps2.request(
          {
            method: "POST",
            hostname: Address.hostname,
            port: Address.port || 443,
            path: Address.pathname,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(Payload)
            },
            timeout: RequestTimeoutMilliseconds
          },
          (Response) => {
            Response.resume();
          }
        );
        Request.on("error", () => {
        });
        Request.on("timeout", () => {
          Request.destroy();
        });
        Request.write(Payload);
        Request.end();
      } catch {
      }
    }, "default");
  }
});

// Source/Telemetry/PostHog/Buffer.ts
var Buffer_default;
var init_Buffer = __esm({
  "Source/Telemetry/PostHog/Buffer.ts"() {
    "use strict";
    init_Event();
    init_Transport();
    Buffer_default = /* @__PURE__ */ __name((Config, DistinctIdentifier2) => {
      let Queue = [];
      let FlushTimer;
      const Send = /* @__PURE__ */ __name(() => {
        if (Queue.length === 0) return;
        const Pending = Queue;
        Queue = [];
        Transport_default(Config.Host, Config.Key, DistinctIdentifier2, Pending);
      }, "Send");
      const ScheduleFlush = /* @__PURE__ */ __name(() => {
        if (FlushTimer) return;
        FlushTimer = setTimeout(() => {
          FlushTimer = void 0;
          Send();
        }, Config.BatchWindowMilliseconds);
        FlushTimer.unref?.();
      }, "ScheduleFlush");
      return {
        Enqueue: /* @__PURE__ */ __name((Name, Properties) => {
          Queue.push(Event_default.Create(Name, Properties));
          if (Queue.length >= Config.BatchMaximum) {
            Send();
            return;
          }
          ScheduleFlush();
        }, "Enqueue"),
        Drain: /* @__PURE__ */ __name(() => {
          if (FlushTimer) {
            clearTimeout(FlushTimer);
            FlushTimer = void 0;
          }
          Send();
        }, "Drain")
      };
    }, "default");
  }
});

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default;
var init_Identifier = __esm({
  "Source/Telemetry/PostHog/Identifier.ts"() {
    "use strict";
    Identifier_default = /* @__PURE__ */ __name((Seed) => {
      if (Seed.length > 0) return Seed;
      const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
      return `land-dev-${Username}`;
    }, "default");
  }
});

// Source/Telemetry/Post/Hog/Bridge.ts
var Bridge_exports = {};
__export(Bridge_exports, {
  CaptureEntryLoad: () => CaptureEntryLoad,
  CaptureEntryLoaded: () => CaptureEntryLoaded,
  CaptureError: () => CaptureError,
  CaptureEvent: () => CaptureEvent,
  CaptureHandler: () => CaptureHandler,
  CaptureStub: () => CaptureStub,
  Initialize: () => Initialize,
  default: () => Bridge_default
});
var Configuration2, DistinctIdentifier, ActiveBuffer, Initialized, Buffered, CaptureEvent, CaptureError, Initialize, CaptureHandler, CaptureStub, CaptureEntryLoad, CaptureEntryLoaded, Bridge_default;
var init_Bridge = __esm({
  "Source/Telemetry/Post/Hog/Bridge.ts"() {
    "use strict";
    init_Buffer();
    init_Configuration();
    init_Event();
    init_Identifier();
    Configuration2 = Configuration_default();
    DistinctIdentifier = Identifier_default(
      Configuration2.DistinctIdentifierSeed
    );
    Initialized = false;
    Buffered = /* @__PURE__ */ __name(() => {
      if (!Configuration2.Enabled) return void 0;
      if (!ActiveBuffer) {
        ActiveBuffer = Buffer_default(Configuration2, DistinctIdentifier);
      }
      return ActiveBuffer;
    }, "Buffered");
    CaptureEvent = /* @__PURE__ */ __name((Name, Properties = {}) => {
      if (process.env["NODE_ENV"] === "production") return;
      try {
        Buffered()?.Enqueue(Name, Properties);
      } catch {
      }
    }, "CaptureEvent");
    CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
      if (process.env["NODE_ENV"] === "production") return;
      const Bridge = Buffered();
      if (!Bridge) return;
      Bridge.Enqueue("land:cocoon:error", {
        ...Extra,
        error_tag: Tag,
        error_message: Message
      });
      Bridge.Drain();
    }, "CaptureError");
    Initialize = /* @__PURE__ */ __name(() => {
      if (process.env["NODE_ENV"] === "production") return;
      if (Initialized) return;
      Initialized = true;
      const Bridge = Buffered();
      if (!Bridge) return;
      if (process.env["NODE_ENV"] !== "production") {
        void Promise.resolve().then(() => (init_OTLPBridge(), OTLPBridge_exports)).then((OTLP) => {
          Event_default.SetTraceIdentifier(OTLP.TraceIdentifier());
        }).catch(() => {
        });
      }
      const OnExit = /* @__PURE__ */ __name(() => Bridge.Drain(), "OnExit");
      process.once("exit", OnExit);
      process.once("SIGINT", OnExit);
      process.once("SIGTERM", OnExit);
      CaptureEvent("land:cocoon:session:start", {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        node_version: process.version
      });
    }, "Initialize");
    CaptureHandler = /* @__PURE__ */ __name((Feature, DurationMs, Ok) => {
      CaptureEvent("land:cocoon:handler:complete", {
        feature: Feature,
        duration_ms: DurationMs,
        ok: Ok
      });
    }, "CaptureHandler");
    CaptureStub = /* @__PURE__ */ __name((Feature, Reason) => {
      CaptureEvent("land:cocoon:stub:active", {
        feature: Feature,
        reason: Reason
      });
    }, "CaptureStub");
    CaptureEntryLoad = /* @__PURE__ */ __name((Entry) => {
      CaptureEvent("land:cocoon:entry:load", { entry: Entry });
    }, "CaptureEntryLoad");
    CaptureEntryLoaded = /* @__PURE__ */ __name((Entry, DurationMs) => {
      CaptureEvent("land:cocoon:entry:loaded", {
        entry: Entry,
        duration_ms: DurationMs
      });
    }, "CaptureEntryLoaded");
    Bridge_default = {
      CaptureEvent,
      CaptureError,
      CaptureHandler,
      CaptureStub,
      CaptureEntryLoad,
      CaptureEntryLoaded,
      Initialize
    };
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Namespace/With/Heuristics.ts
import { Effect as Effect8 } from "effect";
var LazyCaptureEvent, NoopDisposable, IsTrustFamily, ClassifyProperty, RecordGap, BuildHeuristicMethod, WrapNamespaceWithHeuristics, Heuristics_default;
var init_Heuristics = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Namespace/With/Heuristics.ts"() {
    "use strict";
    init_Log2();
    if (process.env["NODE_ENV"] !== "production") {
      void Promise.resolve().then(() => (init_Bridge(), Bridge_exports)).then((Module) => {
        LazyCaptureEvent = Module.CaptureEvent;
      }).catch(() => {
      });
    }
    NoopDisposable = { dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") };
    IsTrustFamily = /* @__PURE__ */ __name((Property) => Property === "requestResourceTrust" || Property === "isResourceTrusted" || Property === "requestWorkspaceTrust" || /^(?:request|is|has)[A-Za-z]*Trust(?:ed)?$/.test(Property), "IsTrustFamily");
    ClassifyProperty = /* @__PURE__ */ __name((Property) => {
      if (IsTrustFamily(Property)) {
        return {
          Kind: "trust",
          Sync: false,
          Produce: /* @__PURE__ */ __name(() => true, "Produce")
        };
      }
      if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
        return {
          Kind: "event",
          Sync: true,
          Produce: /* @__PURE__ */ __name(() => NoopDisposable, "Produce")
        };
      }
      if (Property.startsWith("register")) {
        return {
          Kind: "register",
          Sync: true,
          Produce: /* @__PURE__ */ __name(() => NoopDisposable, "Produce")
        };
      }
      if (Property.startsWith("is") || Property.startsWith("has") || Property.startsWith("should")) {
        return {
          Kind: "bool-check",
          Sync: false,
          Produce: /* @__PURE__ */ __name(() => false, "Produce")
        };
      }
      if (Property.startsWith("create") || Property.startsWith("get") || Property.startsWith("make")) {
        return {
          Kind: "factory",
          Sync: true,
          Produce: /* @__PURE__ */ __name(() => void 0, "Produce")
        };
      }
      return {
        Kind: "default",
        Sync: false,
        Produce: /* @__PURE__ */ __name(() => void 0, "Produce")
      };
    }, "ClassifyProperty");
    RecordGap = /* @__PURE__ */ __name((NamespaceName, Property, Kind) => {
      const Key = `${NamespaceName}.${Property}`;
      Log_default2.InfoOnce(
        "VSCODE-API-GAP",
        Key,
        `${NamespaceName}.${Property} \u2192 ${Kind}`
      );
      if (process.env["NODE_ENV"] !== "production") {
        LazyCaptureEvent?.("land:cocoon:vscode_api_gap", {
          namespace: NamespaceName,
          method: Property,
          kind: Kind
        });
      }
    }, "RecordGap");
    BuildHeuristicMethod = /* @__PURE__ */ __name((NamespaceName, Property, Heuristic) => (...Arguments) => {
      const SpanName = `vscode.${NamespaceName}.${Property}`;
      const Program = Effect8.gen(function* () {
        yield* Effect8.sync(() => {
          try {
            RecordGap(NamespaceName, Property, Heuristic.Kind);
          } catch {
          }
        });
        try {
          return Heuristic.Produce(...Arguments);
        } catch {
          switch (Heuristic.Kind) {
            case "trust":
              return true;
            case "event":
              return NoopDisposable;
            case "register":
              return NoopDisposable;
            case "bool-check":
              return false;
            case "factory":
            case "default":
            default:
              return void 0;
          }
        }
      }).pipe(
        Effect8.withSpan(SpanName, {
          attributes: {
            "vscode.namespace": NamespaceName,
            "vscode.method": Property,
            "vscode.heuristic": Heuristic.Kind
          }
        })
      );
      try {
        return Heuristic.Sync ? Effect8.runSync(Program) : Effect8.runPromise(Program);
      } catch {
        switch (Heuristic.Kind) {
          case "trust":
            return Heuristic.Sync ? true : Promise.resolve(true);
          case "event":
          case "register":
            return NoopDisposable;
          case "bool-check":
            return Heuristic.Sync ? false : Promise.resolve(false);
          default:
            return Heuristic.Sync ? void 0 : Promise.resolve(void 0);
        }
      }
    }, "BuildHeuristicMethod");
    WrapNamespaceWithHeuristics = /* @__PURE__ */ __name((NamespaceName, Concrete, Overrides) => new Proxy(Concrete, {
      get(Target, Property) {
        if (Reflect.has(Target, Property)) {
          return Reflect.get(Target, Property);
        }
        if (typeof Property !== "string") return void 0;
        if (Property === "then") return void 0;
        if (Property === "toJSON") {
          return () => {
            const Out = {
              _namespace: NamespaceName
            };
            for (const Key of Object.keys(Target)) {
              const Value = Target[Key];
              const T = typeof Value;
              Out[Key] = T === "function" ? "[Function]" : T === "object" && Value !== null ? "[Object]" : Value;
            }
            return Out;
          };
        }
        if (Property === "toString" || Property === "valueOf") {
          return void 0;
        }
        const Heuristic = Overrides?.[Property] ?? ClassifyProperty(Property);
        return BuildHeuristicMethod(NamespaceName, Property, Heuristic);
      },
      has(Target, Property) {
        if (Reflect.has(Target, Property)) return true;
        return typeof Property === "string" && Property !== "then";
      }
    }), "WrapNamespaceWithHeuristics");
    Heuristics_default = WrapNamespaceWithHeuristics;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Window/Namespace.ts
var WrapWindowNamespace, Namespace_default;
var init_Namespace = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Window/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapWindowNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("window", Concrete), "WrapWindowNamespace");
    Namespace_default = WrapWindowNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Window/CreateOutputChannel.ts
var LogLevel, FormatTimestamp2, FormatLog, CreateOutputChannel_default;
var init_CreateOutputChannel = __esm({
  "Source/Services/Handler/VscodeAPI/Window/CreateOutputChannel.ts"() {
    "use strict";
    LogLevel = /* @__PURE__ */ ((LogLevel2) => {
      LogLevel2[LogLevel2["Off"] = 0] = "Off";
      LogLevel2[LogLevel2["Trace"] = 1] = "Trace";
      LogLevel2[LogLevel2["Debug"] = 2] = "Debug";
      LogLevel2[LogLevel2["Info"] = 3] = "Info";
      LogLevel2[LogLevel2["Warning"] = 4] = "Warning";
      LogLevel2[LogLevel2["Error"] = 5] = "Error";
      return LogLevel2;
    })(LogLevel || {});
    FormatTimestamp2 = /* @__PURE__ */ __name(() => {
      const Now = /* @__PURE__ */ new Date();
      const Pad = /* @__PURE__ */ __name((N, Width = 2) => String(N).padStart(Width, "0"), "Pad");
      return Now.getFullYear() + "-" + Pad(Now.getMonth() + 1) + "-" + Pad(Now.getDate()) + " " + Pad(Now.getHours()) + ":" + Pad(Now.getMinutes()) + ":" + Pad(Now.getSeconds()) + "." + Pad(Now.getMilliseconds(), 3);
    }, "FormatTimestamp");
    FormatLog = /* @__PURE__ */ __name((Level, Message) => `${FormatTimestamp2()} [${Level}] ${Message}
`, "FormatLog");
    CreateOutputChannel_default = /* @__PURE__ */ __name((Context13, Handle, Name, Options) => {
      const IsLog = typeof Options === "object" && Options !== null ? Options.log === true : false;
      let CurrentLevel = 3 /* Info */;
      const LevelListeners = [];
      Context13.SendToMountain("outputChannel.create", {
        handle: Handle,
        name: Name,
        log: IsLog
      }).catch(() => {
      });
      const Append = /* @__PURE__ */ __name((Value) => {
        Context13.SendToMountain("outputChannel.append", {
          handle: Handle,
          name: Name,
          value: Value
        }).catch(() => {
        });
      }, "Append");
      const ShouldLog = /* @__PURE__ */ __name((Level) => IsLog && CurrentLevel !== 0 /* Off */ && Level >= CurrentLevel, "ShouldLog");
      const LevelChannel = `outputChannel.logLevel:${Handle}`;
      const LevelListener = /* @__PURE__ */ __name((NextLevel) => {
        const Resolved = typeof NextLevel === "number" ? NextLevel : typeof NextLevel === "string" ? LogLevel[NextLevel] ?? CurrentLevel : CurrentLevel;
        if (Resolved === CurrentLevel) return;
        CurrentLevel = Resolved;
        for (const L of LevelListeners.slice()) {
          try {
            L(Resolved);
          } catch {
          }
        }
      }, "LevelListener");
      Context13.Emitter?.on?.(LevelChannel, LevelListener);
      const Channel = {
        name: Name,
        append: Append,
        appendLine: /* @__PURE__ */ __name((Value) => Append(`${Value}
`), "appendLine"),
        clear: /* @__PURE__ */ __name(() => {
          Context13.SendToMountain("outputChannel.clear", {
            handle: Handle
          }).catch(() => {
          });
        }, "clear"),
        // `show(preserveFocus?)` is the modern signature; the historic
        // `show(column, preserveFocus?)` overload still exists for
        // pre-1.16 extensions. Forward both forms so the panel reveals.
        show: /* @__PURE__ */ __name((ColumnOrPreserveFocus, PreserveFocus) => {
          const Preserve = typeof ColumnOrPreserveFocus === "boolean" ? ColumnOrPreserveFocus : !!PreserveFocus;
          Context13.SendToMountain("outputChannel.show", {
            handle: Handle,
            preserveFocus: Preserve
          }).catch(() => {
          });
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
          Context13.SendToMountain("outputChannel.hide", {
            handle: Handle
          }).catch(() => {
          });
        }, "hide"),
        // Stock VS Code's `replace(value)` does NOT prepend a newline;
        // it replaces the entire channel buffer atomically. Use a
        // dedicated Mountain method so the workbench can batch the
        // clear+write as one render rather than a flash of empty.
        replace: /* @__PURE__ */ __name((Value) => {
          Context13.SendToMountain("outputChannel.replace", {
            handle: Handle,
            value: Value
          }).catch(() => {
          });
        }, "replace"),
        dispose: /* @__PURE__ */ __name(() => {
          try {
            Context13.Emitter?.off?.(LevelChannel, LevelListener);
          } catch {
          }
          Context13.SendToMountain("outputChannel.dispose", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose"),
        get logLevel() {
          return CurrentLevel;
        },
        onDidChangeLogLevel: /* @__PURE__ */ __name((Listener) => {
          LevelListeners.push(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const Index = LevelListeners.indexOf(Listener);
              if (Index >= 0) LevelListeners.splice(Index, 1);
            }, "dispose")
          };
        }, "onDidChangeLogLevel"),
        // For LogOutputChannel: format with timestamp + level tag + filter.
        // For plain channels: drop everything through appendLine as a
        // best-effort alias so older extensions that always call these
        // don't break.
        trace: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          if (IsLog) {
            if (ShouldLog(1 /* Trace */))
              Append(FormatLog("trace", Message));
          } else {
            Append(`${Message}
`);
          }
        }, "trace"),
        debug: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          if (IsLog) {
            if (ShouldLog(2 /* Debug */))
              Append(FormatLog("debug", Message));
          } else {
            Append(`${Message}
`);
          }
        }, "debug"),
        info: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          if (IsLog) {
            if (ShouldLog(3 /* Info */))
              Append(FormatLog("info", Message));
          } else {
            Append(`${Message}
`);
          }
        }, "info"),
        warn: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          if (IsLog) {
            if (ShouldLog(4 /* Warning */))
              Append(FormatLog("warning", Message));
          } else {
            Append(`${Message}
`);
          }
        }, "warn"),
        error: /* @__PURE__ */ __name((MessageOrError, ..._Arguments) => {
          const Text = MessageOrError instanceof Error ? MessageOrError.stack ?? MessageOrError.message : String(MessageOrError);
          if (IsLog) {
            if (ShouldLog(5 /* Error */)) Append(FormatLog("error", Text));
          } else {
            Append(`${Text}
`);
          }
        }, "error")
      };
      return Channel;
    }, "default");
  }
});

// Source/Services/Handler/VscodeAPI/Window/CreateStatusBarItem.ts
var StatusBarAlignment, ResolveOverload, CreateStatusBarItem_default;
var init_CreateStatusBarItem = __esm({
  "Source/Services/Handler/VscodeAPI/Window/CreateStatusBarItem.ts"() {
    "use strict";
    StatusBarAlignment = /* @__PURE__ */ ((StatusBarAlignment2) => {
      StatusBarAlignment2[StatusBarAlignment2["Left"] = 1] = "Left";
      StatusBarAlignment2[StatusBarAlignment2["Right"] = 2] = "Right";
      return StatusBarAlignment2;
    })(StatusBarAlignment || {});
    ResolveOverload = /* @__PURE__ */ __name((FirstArg, SecondArg, ThirdArg) => {
      if (typeof FirstArg === "string") {
        return {
          Id: FirstArg,
          Alignment: typeof SecondArg === "number" ? SecondArg : 1 /* Left */,
          Priority: typeof ThirdArg === "number" ? ThirdArg : void 0
        };
      }
      return {
        Id: void 0,
        Alignment: typeof FirstArg === "number" ? FirstArg : 1 /* Left */,
        Priority: typeof SecondArg === "number" ? SecondArg : void 0
      };
    }, "ResolveOverload");
    CreateStatusBarItem_default = /* @__PURE__ */ __name((Context13, Handle, AlignmentOrId, PriorityOrAlignment, Priority) => {
      const {
        Id,
        Alignment,
        Priority: ResolvedPriority
      } = ResolveOverload(AlignmentOrId, PriorityOrAlignment, Priority);
      let CurrentText = "";
      let CurrentTooltip = "";
      let CurrentCommand = void 0;
      let CurrentBackgroundColor = void 0;
      let CurrentColor = void 0;
      let CurrentVisible = false;
      let CurrentName = void 0;
      let CurrentAccessibility = void 0;
      let Disposed = false;
      const Push = /* @__PURE__ */ __name(() => {
        if (Disposed) return;
        if (!CurrentVisible) return;
        const NormalisedCommand = typeof CurrentCommand === "string" ? CurrentCommand : typeof CurrentCommand === "object" && CurrentCommand !== null ? {
          command: CurrentCommand.command,
          arguments: CurrentCommand.arguments,
          title: CurrentCommand.title,
          tooltip: CurrentCommand.tooltip
        } : void 0;
        Context13.SendToMountain("statusBar.update", {
          handle: Handle,
          id: Id,
          alignment: Alignment,
          priority: ResolvedPriority,
          text: CurrentText,
          tooltip: CurrentTooltip,
          command: NormalisedCommand,
          backgroundColor: CurrentBackgroundColor,
          color: CurrentColor,
          visible: true,
          name: CurrentName,
          accessibilityInformation: CurrentAccessibility
        }).catch(() => {
        });
      }, "Push");
      const Item = {
        // `item.id` is read by extensions to disambiguate which item
        // fired their command. Upstream returns the `id` from the
        // `createStatusBarItem(id, ...)` overload, falling back to a
        // stable generated string. Use the explicit id when present;
        // otherwise the handle is the stable fallback.
        id: Id ?? String(Handle),
        alignment: Alignment,
        priority: ResolvedPriority,
        get text() {
          return CurrentText;
        },
        set text(Value) {
          if (Disposed) return;
          const Next = String(Value ?? "");
          if (Next === CurrentText) return;
          CurrentText = Next;
          Push();
        },
        get tooltip() {
          return CurrentTooltip;
        },
        set tooltip(Value) {
          if (Disposed) return;
          CurrentTooltip = Value;
          Push();
        },
        get command() {
          return CurrentCommand;
        },
        set command(Value) {
          if (Disposed) return;
          CurrentCommand = Value;
          Push();
        },
        get backgroundColor() {
          return CurrentBackgroundColor;
        },
        set backgroundColor(Value) {
          if (Disposed) return;
          CurrentBackgroundColor = Value;
          Push();
        },
        get color() {
          return CurrentColor;
        },
        set color(Value) {
          if (Disposed) return;
          CurrentColor = Value;
          Push();
        },
        get name() {
          return CurrentName;
        },
        set name(Value) {
          if (Disposed) return;
          CurrentName = typeof Value === "string" ? Value : void 0;
          Push();
        },
        get accessibilityInformation() {
          return CurrentAccessibility;
        },
        set accessibilityInformation(Value) {
          if (Disposed) return;
          CurrentAccessibility = Value;
          Push();
        },
        show: /* @__PURE__ */ __name(() => {
          if (Disposed) return;
          if (CurrentVisible) return;
          CurrentVisible = true;
          Push();
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
          if (Disposed) return;
          if (!CurrentVisible) return;
          CurrentVisible = false;
          Context13.SendToMountain("statusBar.update", {
            handle: Handle,
            id: Id,
            visible: false
          }).catch(() => {
          });
        }, "hide"),
        // `dispose()` is idempotent in stock VS Code - calling it twice
        // is a no-op on the second pass. Previously a double-dispose
        // fired the Mountain notification twice and removed an item
        // that didn't exist on the second emit (logged as "warn").
        dispose: /* @__PURE__ */ __name(() => {
          if (Disposed) return;
          Disposed = true;
          CurrentVisible = false;
          Context13.SendToMountain("statusBar.dispose", {
            handle: Handle,
            id: Id
          }).catch(() => {
          });
        }, "dispose")
      };
      return Item;
    }, "default");
  }
});

// Source/Services/Handler/VscodeAPI/Window/CreateTerminal.ts
var CreateTerminal_default;
var init_CreateTerminal = __esm({
  "Source/Services/Handler/VscodeAPI/Window/CreateTerminal.ts"() {
    "use strict";
    CreateTerminal_default = /* @__PURE__ */ __name((Context13, Handle, Options) => {
      const Name = Options?.name ?? `Terminal ${Handle}`;
      Context13.SendToMountain("window.createTerminal", {
        handle: Handle,
        name: Name,
        options: Options ?? {}
      }).catch(() => {
      });
      let ProcessIdPromise;
      const ResolveProcessId = /* @__PURE__ */ __name(() => {
        if (ProcessIdPromise !== void 0) return ProcessIdPromise;
        ProcessIdPromise = (async () => {
          try {
            const Response = await Context13.MountainClient?.sendRequest(
              "Terminal.GetProcessId",
              [Handle]
            );
            if (typeof Response === "number") return Response;
            if (Response && typeof Response.pid === "number") {
              return Response.pid;
            }
            return void 0;
          } catch {
            return void 0;
          }
        })();
        return ProcessIdPromise;
      }, "ResolveProcessId");
      let CurrentState = {
        isInteractedWith: false,
        shell: void 0
      };
      try {
        Context13.Emitter?.on?.(
          `window.terminal.stateChanged:${Handle}`,
          (Update) => {
            if (typeof Update?.isInteractedWith === "boolean") {
              CurrentState = {
                ...CurrentState,
                isInteractedWith: Update.isInteractedWith
              };
            }
            if (typeof Update?.shell === "string") {
              CurrentState = { ...CurrentState, shell: Update.shell };
            }
          }
        );
      } catch {
      }
      return {
        name: Name,
        get processId() {
          return ResolveProcessId();
        },
        get state() {
          return CurrentState;
        },
        // `exitStatus` reflects the shell's exit code once the PTY has
        // terminated. Stays `undefined` while the terminal is alive.
        // Mountain emits `window.terminal.exitStatus:<handle>` when the
        // child reports its exit.
        get exitStatus() {
          return Context13?.[`__terminalExitStatus:${Handle}`];
        },
        sendText: /* @__PURE__ */ __name(async (Text, AddNewLine) => {
          const ShouldAppendNewLine = AddNewLine !== false;
          const Payload = ShouldAppendNewLine ? `${Text}\r` : Text;
          Context13.SendToMountain("terminal.sendText", {
            handle: Handle,
            text: Payload
          }).catch(() => {
          });
        }, "sendText"),
        show: /* @__PURE__ */ __name((PreserveFocus) => {
          Context13.SendToMountain("terminal.show", {
            handle: Handle,
            preserveFocus: PreserveFocus
          }).catch(() => {
          });
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
          Context13.SendToMountain("terminal.hide", {
            handle: Handle
          }).catch(() => {
          });
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
          Context13.SendToMountain("terminal.dispose", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose"),
        resize: /* @__PURE__ */ __name(async (Columns, Rows) => {
          try {
            await Context13.MountainClient?.sendRequest("Terminal.Resize", [
              Handle,
              Columns,
              Rows
            ]);
          } catch {
          }
        }, "resize")
      };
    }, "default");
  }
});

// Source/Services/Handler/VscodeAPI/Window/CreateWebviewPanel.ts
var CreateWebviewPanel_default;
var init_CreateWebviewPanel = __esm({
  "Source/Services/Handler/VscodeAPI/Window/CreateWebviewPanel.ts"() {
    "use strict";
    CreateWebviewPanel_default = /* @__PURE__ */ __name((Context13, Handle, ViewType, Title, ShowOptions, Options, ToWebviewUri, SharedCspSource) => {
      let CurrentHtml = "";
      let CurrentTitle = Title;
      let CurrentIconPath = void 0;
      let CurrentOptions = Options ?? {};
      const ShowOptionsTyped = ShowOptions ?? {};
      let CurrentViewColumn = typeof ShowOptionsTyped.viewColumn === "number" ? ShowOptionsTyped.viewColumn : 1;
      let CurrentActive = true;
      let CurrentVisible = true;
      let Disposed = false;
      const DisposeListeners = [];
      const ViewStateListeners = [];
      Context13.MountainClient?.sendRequest("webview.create", {
        handle: Handle,
        viewType: ViewType,
        title: Title,
        showOptions: ShowOptions,
        options: CurrentOptions
      }).catch(() => {
      });
      const PanelRef = { value: void 0 };
      const ViewStateChannel = `webview.viewState:${Handle}`;
      const ViewStateListener = /* @__PURE__ */ __name((State) => {
        if (Disposed) return;
        const NextActive = State?.active != null ? !!State.active : CurrentActive;
        const NextVisible = State?.visible != null ? !!State.visible : CurrentVisible;
        const NextColumn = typeof State?.viewColumn === "number" ? State.viewColumn : CurrentViewColumn;
        const Changed = NextActive !== CurrentActive || NextVisible !== CurrentVisible || NextColumn !== CurrentViewColumn;
        CurrentActive = NextActive;
        CurrentVisible = NextVisible;
        CurrentViewColumn = NextColumn;
        if (!Changed) return;
        const Snapshot = {
          webviewPanel: PanelRef.value
        };
        for (const Listener of ViewStateListeners.slice()) {
          try {
            Listener(Snapshot);
          } catch {
          }
        }
      }, "ViewStateListener");
      Context13.Emitter.on(ViewStateChannel, ViewStateListener);
      const DisposeChannel = `webview.dispose:${Handle}`;
      const DisposeListener = /* @__PURE__ */ __name(() => {
        DisposeInternal();
      }, "DisposeListener");
      Context13.Emitter.on(DisposeChannel, DisposeListener);
      const DisposeInternal = /* @__PURE__ */ __name(() => {
        if (Disposed) return;
        Disposed = true;
        try {
          Context13.Emitter.removeListener(ViewStateChannel, ViewStateListener);
        } catch {
        }
        try {
          Context13.Emitter.removeListener(DisposeChannel, DisposeListener);
        } catch {
        }
        try {
          Context13.Emitter.removeAllListeners(`webview.message:${Handle}`);
        } catch {
        }
        Context13.MountainClient?.sendRequest("webview.dispose", {
          handle: Handle
        }).catch(() => {
        });
        for (const Listener of DisposeListeners.slice()) {
          try {
            Listener();
          } catch {
          }
        }
      }, "DisposeInternal");
      const Panel = {
        get viewType() {
          return ViewType;
        },
        get title() {
          return CurrentTitle;
        },
        set title(Value) {
          if (Disposed) return;
          const Next = String(Value ?? "");
          if (Next === CurrentTitle) return;
          CurrentTitle = Next;
          Context13.MountainClient?.sendRequest("webview.setTitle", {
            handle: Handle,
            title: Next
          }).catch(() => {
          });
        },
        get iconPath() {
          return CurrentIconPath;
        },
        set iconPath(Value) {
          if (Disposed) return;
          CurrentIconPath = Value;
          Context13.MountainClient?.sendRequest("webview.setIconPath", {
            handle: Handle,
            iconPath: Value
          }).catch(() => {
          });
        },
        webview: {
          get options() {
            return CurrentOptions;
          },
          set options(Value) {
            if (Disposed) return;
            CurrentOptions = Value;
            Context13.MountainClient?.sendRequest("webview.setOptions", {
              handle: Handle,
              options: Value
            }).catch(() => {
            });
          },
          get html() {
            return CurrentHtml;
          },
          set html(Value) {
            if (Disposed) return;
            CurrentHtml = Value;
            Context13.MountainClient?.sendRequest("webview.setHtml", {
              handle: Handle,
              html: Value
            }).catch(() => {
            });
          },
          get cspSource() {
            return SharedCspSource;
          },
          asWebviewUri: ToWebviewUri,
          postMessage: /* @__PURE__ */ __name(async (Message) => {
            if (Disposed) return false;
            try {
              await Context13.MountainClient?.sendRequest(
                "webview.postMessage",
                { handle: Handle, message: Message }
              );
              return true;
            } catch {
              return false;
            }
          }, "postMessage"),
          onDidReceiveMessage: /* @__PURE__ */ __name((Listener) => {
            const Event = `webview.message:${Handle}`;
            Context13.Emitter.on(Event, Listener);
            return {
              dispose: /* @__PURE__ */ __name(() => {
                try {
                  Context13.Emitter.removeListener(Event, Listener);
                } catch {
                }
              }, "dispose")
            };
          }, "onDidReceiveMessage")
        },
        get options() {
          return CurrentOptions;
        },
        get viewColumn() {
          return CurrentViewColumn;
        },
        get active() {
          return CurrentActive;
        },
        get visible() {
          return CurrentVisible;
        },
        reveal: /* @__PURE__ */ __name((Column, PreserveFocus) => {
          if (Disposed) return;
          if (typeof Column === "number") {
            CurrentViewColumn = Column;
          }
          Context13.MountainClient?.sendRequest("webview.reveal", {
            handle: Handle,
            viewColumn: Column,
            preserveFocus: PreserveFocus
          }).catch(() => {
          });
        }, "reveal"),
        dispose: /* @__PURE__ */ __name(() => {
          DisposeInternal();
        }, "dispose"),
        onDidDispose: /* @__PURE__ */ __name((Listener) => {
          DisposeListeners.push(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const Index = DisposeListeners.indexOf(Listener);
              if (Index >= 0) DisposeListeners.splice(Index, 1);
            }, "dispose")
          };
        }, "onDidDispose"),
        onDidChangeViewState: /* @__PURE__ */ __name((Listener) => {
          ViewStateListeners.push(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const Index = ViewStateListeners.indexOf(Listener);
              if (Index >= 0) ViewStateListeners.splice(Index, 1);
            }, "dispose")
          };
        }, "onDidChangeViewState")
      };
      PanelRef.value = Panel;
      return Panel;
    }, "default");
  }
});

// Source/Services/Handler/VscodeAPI/Window/CreateWebviewViewBuilder.ts
var CreateWebviewViewBuilder_default;
var init_CreateWebviewViewBuilder = __esm({
  "Source/Services/Handler/VscodeAPI/Window/CreateWebviewViewBuilder.ts"() {
    "use strict";
    CreateWebviewViewBuilder_default = /* @__PURE__ */ __name((Context13, Handle, ViewId, ToWebviewUri, SharedCspSource) => {
      let CurrentHtml = "";
      let CurrentWebviewViewOptions = {
        enableScripts: true,
        enableCommandUris: true,
        enableForms: true,
        localResourceRoots: [],
        portMapping: []
      };
      let CurrentVisible = true;
      const VisibilityListeners = /* @__PURE__ */ new Set();
      const DisposeListeners = /* @__PURE__ */ new Set();
      const ChannelVisibility = `webview.viewVisibility:${Handle}`;
      const ChannelDispose = `webview.dispose:${Handle}`;
      const VisibilityForward = /* @__PURE__ */ __name((Visible) => {
        CurrentVisible = !!Visible;
        for (const L of VisibilityListeners) {
          try {
            L(!!Visible);
          } catch (_e) {
          }
        }
      }, "VisibilityForward");
      const DisposeForward = /* @__PURE__ */ __name(() => {
        for (const L of DisposeListeners) {
          try {
            L();
          } catch (_e) {
          }
        }
        DisposeListeners.clear();
        VisibilityListeners.clear();
        Context13.Emitter?.off?.(ChannelVisibility, VisibilityForward);
        Context13.Emitter?.off?.(ChannelDispose, DisposeForward);
      }, "DisposeForward");
      Context13.Emitter?.on?.(ChannelVisibility, VisibilityForward);
      Context13.Emitter?.on?.(ChannelDispose, DisposeForward);
      let CurrentTitle;
      let CurrentDescription;
      let CurrentBadge;
      const FireMetadataUpdate = /* @__PURE__ */ __name(() => {
        Context13.SendToMountain("webview.updateView", {
          handle: Handle,
          viewId: ViewId,
          title: CurrentTitle ?? null,
          description: CurrentDescription ?? null,
          badge: CurrentBadge ?? null
        }).catch(() => {
        });
      }, "FireMetadataUpdate");
      const View = {
        // `viewType` is the manifest-declared id from
        // `contributes.views[*].id` - same string as `ViewId`. Roo
        // and others log it when the view resolves and crash on
        // `undefined.toString()`.
        viewType: ViewId,
        // Stock VS Code's `WebviewView.visible: boolean` reflects
        // whether the pane is body-visible. Roo, Claude, GitLens
        // all early-return from `resolveWebviewView` /
        // `getHtmlContent` when this reads falsy - the missing
        // getter previously made every `view.visible` read produce
        // `undefined` and the React mount pipeline never kicked
        // off. Backed by `CurrentVisible` which is updated by the
        // visibility channel forwarder above.
        get visible() {
          return CurrentVisible;
        },
        // Some extensions (Continue, occasionally GitLens) cache the
        // view in their own state and reassign `view.visible = X`
        // when they think they detect external visibility changes.
        // Stock VS Code's `WebviewView.visible` is read-only - in
        // strict-mode ES modules a getter-only property would throw
        // `TypeError: Cannot set property visible` on those writes
        // and bring down the resolver chain. A no-op setter
        // (matching the read-only spirit of the spec) absorbs those
        // writes without observable behaviour change; the truth
        // still flows through the visibility channel.
        set visible(_Ignored) {
        },
        get title() {
          return CurrentTitle;
        },
        set title(Value) {
          CurrentTitle = Value;
          FireMetadataUpdate();
        },
        get description() {
          return CurrentDescription;
        },
        set description(Value) {
          CurrentDescription = Value;
          FireMetadataUpdate();
        },
        get badge() {
          return CurrentBadge;
        },
        set badge(Value) {
          CurrentBadge = Value;
          FireMetadataUpdate();
        },
        webview: {
          get html() {
            return CurrentHtml;
          },
          set html(Value) {
            CurrentHtml = String(Value ?? "");
            try {
              if (process.env["Trace"]) {
                process.stdout.write(
                  `[WebviewView] set-html-enter handle=${Handle} viewId=${ViewId} htmlLen=${CurrentHtml.length}
`
                );
              }
            } catch {
            }
            Context13.SendToMountain("webview.setHtml", {
              handle: Handle,
              viewId: ViewId,
              html: CurrentHtml
            }).then(
              () => {
                try {
                  if (process.env["Trace"]) {
                    process.stdout.write(
                      `[WebviewView] set-html-sent handle=${Handle} viewId=${ViewId}
`
                    );
                  }
                } catch {
                }
              },
              (Error2) => {
                try {
                  if (process.env["Trace"]) {
                    process.stdout.write(
                      `[WebviewView] set-html-failed handle=${Handle} viewId=${ViewId} error=${String(Error2?.message ?? Error2).slice(0, 120)}
`
                    );
                  }
                } catch {
                }
              }
            );
          },
          // Stock VS Code populates `webview.options` from the
          // `WebviewOptions` passed to
          // `registerWebviewViewProvider(viewId, provider, { webviewOptions })`.
          // Roo / Claude / Continue all read
          // `view.webview.options.localResourceRoots` when composing
          // CSP and `<script nonce>` attributes - `undefined`
          // crashed those reads or produced a CSP that blocked the
          // extension's own bundle. Permissive dev-time defaults
          // keep extensions that never set options happy.
          // Unlike CreateWebviewPanel.ts which forwards options via
          // webview.setOptions, this view builder previously stored
          // options as a static object with no forwarding - meaning
          // the workbench webview never received enableScripts,
          // enableForms, etc. and the preloader's toContentHtml()
          // saw allowScripts as false/undefined, skipping the VS Code
          // API polyfill injection.
          get options() {
            return CurrentWebviewViewOptions;
          },
          set options(Value) {
            CurrentWebviewViewOptions = Value;
            Context13.SendToMountain("webview.setOptions", {
              handle: Handle,
              viewId: ViewId,
              options: Value
            }).catch(() => {
            });
          },
          cspSource: SharedCspSource,
          asWebviewUri: ToWebviewUri,
          postMessage: /* @__PURE__ */ __name(async (Message) => {
            await Context13.SendToMountain("webview.postMessage", {
              handle: Handle,
              viewId: ViewId,
              message: Message
            }).catch(() => {
            });
            return true;
          }, "postMessage"),
          onDidReceiveMessage: /* @__PURE__ */ __name((Listener) => {
            const Channel = `webview.message:${Handle}`;
            Context13.Emitter?.on?.(Channel, Listener);
            return {
              dispose: /* @__PURE__ */ __name(() => Context13.Emitter?.off?.(Channel, Listener), "dispose")
            };
          }, "onDidReceiveMessage")
        },
        show: /* @__PURE__ */ __name((PreserveFocus) => {
          Context13.SendToMountain("webview.reveal", {
            handle: Handle,
            viewId: ViewId,
            preserveFocus: !!PreserveFocus
          }).catch(() => {
          });
        }, "show"),
        onDidChangeVisibility: /* @__PURE__ */ __name((Listener) => {
          VisibilityListeners.add(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => VisibilityListeners.delete(Listener), "dispose")
          };
        }, "onDidChangeVisibility"),
        onDispose: /* @__PURE__ */ __name((Listener) => {
          DisposeListeners.add(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => DisposeListeners.delete(Listener), "dispose")
          };
        }, "onDispose"),
        // Canonical VS Code API name. Roo's `resolveWebviewView` calls
        // `webviewView.onDidDispose(() => {})`; without this alias the
        // call surfaces as `r.onDidDispose is not a function` and the
        // resolver promise rejects AFTER `webview.html` was already
        // set. VS Code spells the listener `onDidDispose: Event<void>`;
        // alias to the existing `onDispose` listener-set rather than
        // duplicate the storage.
        onDidDispose: /* @__PURE__ */ __name((Listener) => {
          DisposeListeners.add(Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => DisposeListeners.delete(Listener), "dispose")
          };
        }, "onDidDispose"),
        dispose: /* @__PURE__ */ __name(() => {
          DisposeForward();
        }, "dispose")
      };
      return View;
    }, "default");
  }
});

// Source/Services/Handler/VscodeAPI/Window/Registry.ts
var TreeDataProviders, TreeDataProvidersByViewId, WebviewViewProviders, WebviewViewBuilders, CustomEditorProviders, CustomEditorProvidersByViewType, WebviewPanels;
var init_Registry2 = __esm({
  "Source/Services/Handler/VscodeAPI/Window/Registry.ts"() {
    "use strict";
    TreeDataProviders = /* @__PURE__ */ new Map();
    TreeDataProvidersByViewId = /* @__PURE__ */ new Map();
    WebviewViewProviders = /* @__PURE__ */ new Map();
    WebviewViewBuilders = /* @__PURE__ */ new Map();
    CustomEditorProviders = /* @__PURE__ */ new Map();
    CustomEditorProvidersByViewType = /* @__PURE__ */ new Map();
    WebviewPanels = /* @__PURE__ */ new Map();
  }
});

// Source/Services/Handler/VscodeAPI/Window/RegisterCustomEditor.ts
var RegisterCustomEditor, RegisterCustomEditor_default;
var init_RegisterCustomEditor = __esm({
  "Source/Services/Handler/VscodeAPI/Window/RegisterCustomEditor.ts"() {
    "use strict";
    init_Registry();
    init_Registry2();
    RegisterCustomEditor = /* @__PURE__ */ __name((Context13, ViewType, Provider, Options, IsReadonly) => {
      const Handle = NextProviderHandle();
      CustomEditorProviders.set(String(Handle), Provider);
      CustomEditorProvidersByViewType.set(ViewType, {
        Provider,
        Readonly: IsReadonly,
        Handle
      });
      let Selector = [];
      for (const [, Ext] of Context13.ExtensionRegistry) {
        const Contributions = Ext?.contributes?.customEditors;
        if (Array.isArray(Contributions)) {
          const Match = Contributions.find(
            (CE) => CE?.viewType === ViewType
          );
          if (Match?.selector) {
            Selector = Array.isArray(Match.selector) ? Match.selector : [Match.selector];
            break;
          }
        }
      }
      Context13.MountainClient?.sendRequest("webview.registerCustomEditor", {
        handle: Handle,
        viewType: ViewType,
        selector: Selector,
        options: {
          readonly: IsReadonly,
          supportsMultipleEditorsPerDocument: Options.supportsMultipleEditorsPerDocument ?? false,
          webviewOptions: Options.webviewOptions ?? {}
        }
      }).catch(() => {
      });
      const SafeAwait = /* @__PURE__ */ __name(async (Channel, MethodName, Payload) => {
        const Entry = CustomEditorProvidersByViewType.get(
          Payload?.viewType ?? ViewType
        );
        if (!Entry || Entry.Handle !== Handle) return void 0;
        if (Entry.Readonly && MethodName !== "resolveCustomEditor")
          return void 0;
        const Method = Entry.Provider?.[MethodName];
        if (typeof Method !== "function") return void 0;
        try {
          const Result = await Method.call(
            Entry.Provider,
            Payload?.document,
            Payload?.context ?? Payload?.destination,
            Payload?.token
          );
          return Result;
        } catch (Error2) {
          try {
            process.stdout.write(
              `[CustomEditor:${Channel}] provider for "${ViewType}" threw: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}
`
            );
          } catch {
          }
          return void 0;
        }
      }, "SafeAwait");
      const Listeners = [];
      const Subscribe = /* @__PURE__ */ __name((Channel, MethodName) => {
        const Listener = /* @__PURE__ */ __name((Payload) => {
          void SafeAwait(Channel, MethodName, Payload);
        }, "Listener");
        Context13.Emitter.on(Channel, Listener);
        Listeners.push({ Channel, Listener });
      }, "Subscribe");
      Subscribe("customEditor.saveDocument", "saveCustomDocument");
      Subscribe("customEditor.saveDocumentAs", "saveCustomDocumentAs");
      Subscribe("customEditor.revertCustomDocument", "revertCustomDocument");
      Subscribe("customEditor.backupCustomDocument", "backupCustomDocument");
      Subscribe("customEditor.willSaveCustomDocument", "willSaveCustomDocument");
      Subscribe(
        "customEditor.didChangeCustomDocument",
        "didChangeCustomDocument"
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          for (const { Channel, Listener } of Listeners) {
            Context13.Emitter.off(
              Channel,
              Listener
            );
          }
          Listeners.length = 0;
          CustomEditorProviders.delete(String(Handle));
          const ByViewType = CustomEditorProvidersByViewType.get(ViewType);
          if (ByViewType && ByViewType.Handle === Handle) {
            CustomEditorProvidersByViewType.delete(ViewType);
          }
          Context13.MountainClient?.sendRequest(
            "webview.unregisterCustomEditor",
            { handle: Handle, viewType: ViewType }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "RegisterCustomEditor");
    RegisterCustomEditor_default = RegisterCustomEditor;
  }
});

// Source/Services/Handler/VscodeAPI/Window/Namespace.ts
var Namespace_exports = {};
__export(Namespace_exports, {
  CustomEditorProviders: () => CustomEditorProviders,
  CustomEditorProvidersByViewType: () => CustomEditorProvidersByViewType,
  TreeDataProviders: () => TreeDataProviders,
  TreeDataProvidersByViewId: () => TreeDataProvidersByViewId,
  WebviewPanels: () => WebviewPanels,
  WebviewViewBuilders: () => WebviewViewBuilders,
  WebviewViewProviders: () => WebviewViewProviders,
  default: () => Namespace_default2
});
import { EventEmitter as NodeEventEmitter } from "node:events";
var MakeEventSubscriber, CreateWindowNamespace, Namespace_default2;
var init_Namespace2 = __esm({
  "Source/Services/Handler/VscodeAPI/Window/Namespace.ts"() {
    "use strict";
    init_Registry();
    init_Namespace();
    init_CreateOutputChannel();
    init_CreateStatusBarItem();
    init_CreateTerminal();
    init_CreateWebviewPanel();
    init_CreateWebviewViewBuilder();
    init_RegisterCustomEditor();
    init_Registry2();
    init_Registry2();
    MakeEventSubscriber = /* @__PURE__ */ __name((Context13, EventName) => (Callback, ThisArg, Disposables) => {
      const Bound = ThisArg === void 0 ? Callback : Callback.bind(ThisArg);
      Context13.Emitter.on(EventName, Bound);
      const Subscription = {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.Emitter.off(EventName, Bound);
        }, "dispose")
      };
      if (Disposables && typeof Disposables.push === "function") {
        Disposables.push(Subscription);
      }
      return Subscription;
    }, "MakeEventSubscriber");
    CreateWindowNamespace = /* @__PURE__ */ __name((Context13) => {
      const ShowMessage = /* @__PURE__ */ __name((Level) => async (Message, ...Items) => {
        let Options = void 0;
        let Actions = Items;
        if (Items.length > 0 && Items[0] && typeof Items[0] === "object" && !Array.isArray(Items[0]) && "modal" in Items[0]) {
          Options = Items[0];
          Actions = Items.slice(1);
        }
        try {
          const Result = await Context13.MountainClient?.sendRequest(
            "Window.ShowMessage",
            [
              {
                message: Message,
                level: Level,
                items: Actions,
                options: Options ?? {}
              }
            ]
          );
          if (Result == null || Actions.length === 0) return void 0;
          const SelectedTitle = typeof Result === "string" ? Result : Result?.title ?? Result?.label ?? null;
          if (!SelectedTitle) return void 0;
          return Actions.find((A) => {
            const Label = typeof A === "string" ? A : A?.title ?? String(A);
            return Label === SelectedTitle;
          }) ?? SelectedTitle;
        } catch {
          return void 0;
        }
      }, "ShowMessage");
      const ToWebviewUri = /* @__PURE__ */ __name((Input) => {
        if (Input == null) return Input;
        if (typeof Input === "string") {
          if (Input.startsWith("vscode-file://")) return Input;
          if (Input.startsWith("vscode-webview-resource://")) {
            const Match = Input.match(
              /^vscode-webview-resource:\/\/[^/]+(.*)$/
            );
            return Match ? `vscode-file://vscode-app${Match[1] ?? ""}` : Input;
          }
          if (Input.startsWith("vscode-resource://")) {
            return Input.replace(
              "vscode-resource://",
              "vscode-file://vscode-app/"
            );
          }
          if (Input.startsWith("file://")) {
            return Input.replace("file://", "vscode-file://vscode-app");
          }
          return Input;
        }
        const Anything = Input;
        const Scheme = String(Anything.scheme ?? "");
        const Path = String(Anything.path ?? "");
        if (Scheme === "file" && Path) {
          const Rewritten = {
            ...Anything,
            scheme: "vscode-file",
            authority: "vscode-app",
            path: Path,
            query: String(Anything.query ?? ""),
            fragment: String(Anything.fragment ?? "")
          };
          const SerialisedQuery = Rewritten.query ? "?" + Rewritten.query : "";
          const SerialisedFragment = Rewritten.fragment ? "#" + Rewritten.fragment : "";
          const Serialised = `vscode-file://vscode-app${Path}${SerialisedQuery}${SerialisedFragment}`;
          Rewritten.toString = () => Serialised;
          Rewritten.toJSON = () => Serialised;
          return Rewritten;
        }
        if (Scheme === "vscode-webview-resource" || Scheme === "vscode-resource") {
          const Rewritten = {
            ...Anything,
            scheme: "vscode-file",
            authority: "vscode-app"
          };
          const Serialised = `vscode-file://vscode-app${Path}`;
          Rewritten.toString = () => Serialised;
          Rewritten.toJSON = () => Serialised;
          return Rewritten;
        }
        return Input;
      }, "ToWebviewUri");
      const SharedCspSource = "vscode-file: vscode-resource: vscode-webview-resource: blob: data: https:";
      const Concrete = {
        showInformationMessage: ShowMessage("info"),
        showErrorMessage: ShowMessage("error"),
        showWarningMessage: ShowMessage("warn"),
        showQuickPick: /* @__PURE__ */ __name(async (Items, Options) => {
          try {
            return await Context13.MountainClient?.sendRequest(
              "Window.ShowQuickPick",
              [Items, Options ?? {}]
            );
          } catch {
            return void 0;
          }
        }, "showQuickPick"),
        showInputBox: /* @__PURE__ */ __name(async (Options) => {
          try {
            return await Context13.MountainClient?.sendRequest(
              "Window.ShowInputBox",
              [Options ?? {}]
            );
          } catch {
            return void 0;
          }
        }, "showInputBox"),
        showOpenDialog: /* @__PURE__ */ __name(async (Options) => {
          try {
            const Selected = await Context13.MountainClient?.sendRequest(
              "Window.ShowOpenDialog",
              [Options ?? {}]
            );
            return Array.isArray(Selected) ? Selected : [];
          } catch {
            return [];
          }
        }, "showOpenDialog"),
        showSaveDialog: /* @__PURE__ */ __name(async (Options) => {
          try {
            return await Context13.MountainClient?.sendRequest(
              "Window.ShowSaveDialog",
              [Options ?? {}]
            );
          } catch {
            return void 0;
          }
        }, "showSaveDialog"),
        createTerminal: /* @__PURE__ */ __name((Options) => {
          const Stub2 = CreateTerminal_default(Context13, NextProviderHandle(), Options);
          if (!Array.isArray(Context13.__terminals)) {
            Context13.__terminals = [];
          }
          Context13.__terminals.push(Stub2);
          Context13.__activeTerminal = Stub2;
          setImmediate(() => {
            Context13.Emitter.emit("window.didOpenTerminal", Stub2);
            Context13.Emitter.emit("window.didChangeActiveTerminal", Stub2);
          });
          const OrigDispose = Stub2.dispose.bind(Stub2);
          Stub2.dispose = () => {
            Context13.__terminals = (Context13.__terminals ?? []).filter((T) => T !== Stub2);
            if (Context13.__activeTerminal === Stub2) {
              Context13.__activeTerminal = void 0;
              Context13.Emitter.emit(
                "window.didChangeActiveTerminal",
                void 0
              );
            }
            Context13.Emitter.emit("window.didCloseTerminal", Stub2);
            OrigDispose();
          };
          return Stub2;
        }, "createTerminal"),
        createStatusBarItem: /* @__PURE__ */ __name((AlignmentOrId, PriorityOrAlignment, Priority) => CreateStatusBarItem_default(
          Context13,
          NextProviderHandle(),
          AlignmentOrId,
          PriorityOrAlignment,
          Priority
        ), "createStatusBarItem"),
        createOutputChannel: /* @__PURE__ */ __name((Name, Options) => CreateOutputChannel_default(Context13, NextProviderHandle(), Name, Options), "createOutputChannel"),
        createTextEditorDecorationType: /* @__PURE__ */ __name((Options) => {
          const Key = `decoration:${Math.random().toString(36).slice(2)}`;
          Context13.SendToMountain("window.createTextEditorDecorationType", {
            key: Key,
            options: Options ?? {}
          }).catch(() => {
          });
          return {
            key: Key,
            dispose: /* @__PURE__ */ __name(() => {
              Context13.SendToMountain(
                "window.disposeTextEditorDecorationType",
                {
                  key: Key
                }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "createTextEditorDecorationType"),
        registerTerminalQuickFixProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerTerminalQuickFixProvider"),
        registerTerminalCompletionProvider: /* @__PURE__ */ __name((_Id, _Provider, ..._TriggerCharacters) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerTerminalCompletionProvider"),
        createQuickPick: /* @__PURE__ */ __name(() => {
          const AcceptListeners = [];
          const SelectionListeners = [];
          const HideListeners = [];
          const ValueListeners = [];
          const State = {
            value: "",
            placeholder: void 0,
            items: [],
            activeItems: [],
            selectedItems: [],
            canSelectMany: false,
            matchOnDescription: false,
            matchOnDetail: false,
            busy: false,
            enabled: true,
            ignoreFocusOut: false,
            step: void 0,
            totalSteps: void 0,
            title: void 0,
            buttons: []
          };
          let IsShown = false;
          const Show = /* @__PURE__ */ __name(() => {
            if (IsShown) return;
            IsShown = true;
            void (async () => {
              try {
                const Picked = await Context13.MountainClient?.sendRequest(
                  "Window.ShowQuickPick",
                  [
                    State.items,
                    {
                      placeHolder: State.placeholder,
                      title: State.title,
                      canPickMany: State.canSelectMany,
                      matchOnDescription: State.matchOnDescription,
                      matchOnDetail: State.matchOnDetail,
                      ignoreFocusOut: State.ignoreFocusOut,
                      step: State.step,
                      totalSteps: State.totalSteps
                    }
                  ]
                );
                if (Picked != null) {
                  const PickedArr = Array.isArray(Picked) ? Picked : [Picked];
                  State.selectedItems = PickedArr;
                  for (const L of SelectionListeners) {
                    try {
                      L(PickedArr);
                    } catch {
                    }
                  }
                  for (const L of AcceptListeners) {
                    try {
                      L();
                    } catch {
                    }
                  }
                }
              } finally {
                IsShown = false;
                for (const L of HideListeners) {
                  try {
                    L();
                  } catch {
                  }
                }
              }
            })();
          }, "Show");
          const MakeEvent = /* @__PURE__ */ __name((Listeners) => (Listener, _ThisArg, Disposables) => {
            const Bound = _ThisArg ? Listener.bind(_ThisArg) : Listener;
            Listeners.push(Bound);
            const Sub = {
              dispose: /* @__PURE__ */ __name(() => {
                const I = Listeners.indexOf(
                  Bound
                );
                if (I !== -1) Listeners.splice(I, 1);
              }, "dispose")
            };
            Disposables?.push(Sub);
            return Sub;
          }, "MakeEvent");
          const MakeEventNoArg = /* @__PURE__ */ __name((Listeners) => (Listener, _ThisArg, Disposables) => {
            const Bound = _ThisArg ? Listener.bind(_ThisArg) : Listener;
            Listeners.push(Bound);
            const Sub = {
              dispose: /* @__PURE__ */ __name(() => {
                const I = Listeners.indexOf(Bound);
                if (I !== -1) Listeners.splice(I, 1);
              }, "dispose")
            };
            Disposables?.push(Sub);
            return Sub;
          }, "MakeEventNoArg");
          return Object.assign(State, {
            show: Show,
            hide: /* @__PURE__ */ __name(() => {
              for (const L of HideListeners) {
                try {
                  L();
                } catch {
                }
              }
            }, "hide"),
            dispose: /* @__PURE__ */ __name(() => {
            }, "dispose"),
            onDidAccept: MakeEventNoArg(AcceptListeners),
            onDidChangeValue: MakeEvent(ValueListeners),
            onDidChangeActive: MakeEvent(SelectionListeners),
            onDidChangeSelection: MakeEvent(SelectionListeners),
            onDidTriggerButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidTriggerButton"),
            onDidTriggerItemButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidTriggerItemButton"),
            onDidHide: MakeEventNoArg(HideListeners)
          });
        }, "createQuickPick"),
        createInputBox: /* @__PURE__ */ __name(() => {
          const AcceptListeners = [];
          const HideListeners = [];
          const ValueListeners = [];
          const State = {
            value: "",
            valueSelection: void 0,
            placeholder: void 0,
            password: false,
            busy: false,
            enabled: true,
            ignoreFocusOut: false,
            prompt: void 0,
            validationMessage: void 0,
            step: void 0,
            totalSteps: void 0,
            title: void 0,
            buttons: []
          };
          let IsShown = false;
          const Show = /* @__PURE__ */ __name(() => {
            if (IsShown) return;
            IsShown = true;
            void (async () => {
              try {
                const Result = await Context13.MountainClient?.sendRequest(
                  "Window.ShowInputBox",
                  [
                    {
                      prompt: State.prompt,
                      placeHolder: State.placeholder,
                      value: State.value,
                      password: State.password,
                      title: State.title,
                      step: State.step,
                      totalSteps: State.totalSteps,
                      ignoreFocusOut: State.ignoreFocusOut
                    }
                  ]
                );
                if (typeof Result === "string") {
                  State.value = Result;
                  for (const L of ValueListeners) {
                    try {
                      L(Result);
                    } catch {
                    }
                  }
                  for (const L of AcceptListeners) {
                    try {
                      L();
                    } catch {
                    }
                  }
                }
              } finally {
                IsShown = false;
                for (const L of HideListeners) {
                  try {
                    L();
                  } catch {
                  }
                }
              }
            })();
          }, "Show");
          const MakeEventNoArg = /* @__PURE__ */ __name((Listeners) => (Listener, _ThisArg, Disposables) => {
            const Bound = _ThisArg ? Listener.bind(_ThisArg) : Listener;
            Listeners.push(Bound);
            const Sub = {
              dispose: /* @__PURE__ */ __name(() => {
                const I = Listeners.indexOf(Bound);
                if (I !== -1) Listeners.splice(I, 1);
              }, "dispose")
            };
            Disposables?.push(Sub);
            return Sub;
          }, "MakeEventNoArg");
          const MakeEventStr = /* @__PURE__ */ __name((Listeners) => (Listener, _ThisArg, Disposables) => {
            const Bound = _ThisArg ? Listener.bind(_ThisArg) : Listener;
            Listeners.push(Bound);
            const Sub = {
              dispose: /* @__PURE__ */ __name(() => {
                const I = Listeners.indexOf(Bound);
                if (I !== -1) Listeners.splice(I, 1);
              }, "dispose")
            };
            Disposables?.push(Sub);
            return Sub;
          }, "MakeEventStr");
          return Object.assign(State, {
            show: Show,
            hide: /* @__PURE__ */ __name(() => {
              for (const L of HideListeners) {
                try {
                  L();
                } catch {
                }
              }
            }, "hide"),
            dispose: /* @__PURE__ */ __name(() => {
            }, "dispose"),
            onDidAccept: MakeEventNoArg(AcceptListeners),
            onDidChangeValue: MakeEventStr(ValueListeners),
            onDidTriggerButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidTriggerButton"),
            onDidHide: MakeEventNoArg(HideListeners)
          });
        }, "createInputBox"),
        createWebviewPanel: /* @__PURE__ */ __name((ViewType, Title, ShowOptions, Options) => {
          const Handle = NextProviderHandle();
          const Panel = CreateWebviewPanel_default(
            Context13,
            Handle,
            ViewType,
            Title,
            ShowOptions,
            Options,
            ToWebviewUri,
            SharedCspSource
          );
          WebviewPanels.set(String(Handle), Panel);
          return Panel;
        }, "createWebviewPanel"),
        showTextDocument: /* @__PURE__ */ __name(async (_Document, _Column, _PreserveFocus) => {
          const UriRaw = _Document?.uri?.toString?.() ?? _Document?.external ?? (_Document?.scheme && _Document?.path ? `${_Document.scheme}://${_Document.authority ?? ""}${_Document.path}` : "") ?? "";
          try {
            await Context13.MountainClient?.sendRequest("showTextDocument", [
              _Document,
              _Column,
              _PreserveFocus
            ]);
          } catch {
          }
          const Active = Context13.__activeTextEditor;
          const ActiveUri = Active?.document?.uri?.toString?.() ?? "";
          if (Active && (ActiveUri === UriRaw || !UriRaw)) {
            return Active;
          }
          const DocText = Context13.DocumentContentCache?.get(UriRaw) ?? "";
          const DocLines = DocText.split(/\r?\n/);
          const LiveSel = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
            active: { line: 0, character: 0 },
            anchor: { line: 0, character: 0 },
            isEmpty: true,
            isReversed: false,
            isSingleLine: true
          };
          return {
            document: {
              uri: {
                toString: /* @__PURE__ */ __name(() => UriRaw, "toString"),
                fsPath: UriRaw.replace(/^file:\/\//, ""),
                scheme: "file"
              },
              fileName: UriRaw.replace(/^file:\/\//, ""),
              languageId: "plaintext",
              version: 1,
              isDirty: false,
              isClosed: false,
              isUntitled: false,
              eol: 1,
              lineCount: DocLines.length,
              getText: /* @__PURE__ */ __name(() => DocText, "getText"),
              lineAt: /* @__PURE__ */ __name((N) => {
                const Ln = typeof N === "number" ? N : N?.line ?? 0;
                const T = DocLines[Ln] ?? "";
                return {
                  text: T,
                  lineNumber: Ln,
                  range: {
                    start: { line: Ln, character: 0 },
                    end: { line: Ln, character: T.length }
                  },
                  firstNonWhitespaceCharacterIndex: Math.max(
                    0,
                    T.search(/\S/)
                  ),
                  isEmptyOrWhitespace: T.trim().length === 0
                };
              }, "lineAt"),
              positionAt: /* @__PURE__ */ __name((Off) => {
                let R = Off;
                for (let I = 0; I < DocLines.length; I++) {
                  const L = (DocLines[I]?.length ?? 0) + 1;
                  if (R < L) return { line: I, character: R };
                  R -= L;
                }
                return {
                  line: DocLines.length - 1,
                  character: DocLines[DocLines.length - 1]?.length ?? 0
                };
              }, "positionAt"),
              offsetAt: /* @__PURE__ */ __name((P) => {
                let O = 0;
                for (let I = 0; I < (P?.line ?? 0); I++)
                  O += (DocLines[I]?.length ?? 0) + 1;
                return O + (P?.character ?? 0);
              }, "offsetAt"),
              save: /* @__PURE__ */ __name(async () => true, "save"),
              getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
              validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
              validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition")
            },
            get selection() {
              return LiveSel;
            },
            set selection(S) {
              Object.assign(LiveSel, S);
            },
            selections: [LiveSel],
            visibleRanges: [],
            viewColumn: (typeof _Column === "number" ? _Column : _Column?.viewColumn) ?? 1,
            options: { tabSize: 4, insertSpaces: true },
            setDecorations: /* @__PURE__ */ __name((Type, Ranges) => {
              const Key = typeof Type === "string" ? Type : Type?.key ?? Type?.id ?? String(Type);
              Context13.SendToMountain("window.setTextEditorDecorations", {
                decorationTypeKey: Key,
                uri: UriRaw,
                rangesOrOptions: Ranges
              }).catch(() => {
              });
            }, "setDecorations"),
            edit: /* @__PURE__ */ __name((Callback) => {
              const Collected = [];
              const Builder = {
                replace: /* @__PURE__ */ __name((Range, Value) => Collected.push({ range: Range, text: Value }), "replace"),
                insert: /* @__PURE__ */ __name((Position, Value) => Collected.push({
                  range: {
                    startLineNumber: (Position?.line ?? 0) + 1,
                    startColumn: (Position?.character ?? 0) + 1,
                    endLineNumber: (Position?.line ?? 0) + 1,
                    endColumn: (Position?.character ?? 0) + 1
                  },
                  text: Value
                }), "insert"),
                delete: /* @__PURE__ */ __name((Range) => Collected.push({ range: Range, text: "" }), "delete"),
                setEndOfLine: /* @__PURE__ */ __name(() => {
                }, "setEndOfLine")
              };
              try {
                Callback(Builder);
              } catch {
                return Promise.resolve(false);
              }
              if (!Collected.length) return Promise.resolve(true);
              return Context13.SendToMountain("window.applyTextEdits", {
                uri: UriRaw,
                edits: Collected
              }).then(() => true).catch(() => false);
            }, "edit"),
            insertSnippet: /* @__PURE__ */ __name(async (Snippet, Location) => {
              const Text = typeof Snippet === "string" ? Snippet : Snippet?.value ?? "";
              await Context13.SendToMountain("window.applyTextEdits", {
                uri: UriRaw,
                edits: [{ range: Location ?? LiveSel, text: Text }]
              }).catch(() => {
              });
              return true;
            }, "insertSnippet"),
            revealRange: /* @__PURE__ */ __name((Range, RevealType) => {
              void Context13.MountainClient?.sendRequest(
                "window.revealRange",
                {
                  uri: UriRaw,
                  range: Range,
                  revealType: RevealType ?? 0
                }
              ).catch(() => {
              });
            }, "revealRange"),
            show: /* @__PURE__ */ __name((ViewColumn) => {
              void Context13.MountainClient?.sendRequest(
                "showTextDocument",
                [
                  { uri: UriRaw, viewColumn: ViewColumn ?? 1 },
                  ViewColumn ?? 1
                ]
              ).catch(() => {
              });
            }, "show"),
            hide: /* @__PURE__ */ __name(() => {
            }, "hide")
          };
        }, "showTextDocument"),
        showNotebookDocument: /* @__PURE__ */ __name(async (_Document, _Options) => void 0, "showNotebookDocument"),
        tabGroups: {
          get all() {
            const Visible = Context13.__visibleTextEditors ?? [];
            const Tabs = Visible.map((Ed) => {
              const Uri = Ed?.document?.uri;
              const FileName = typeof Uri?.toString === "function" ? Uri.toString() : String(Uri ?? "");
              return {
                label: FileName.split("/").pop() ?? "",
                isActive: Ed === Context13.__activeTextEditor,
                isPinned: false,
                isDirty: false,
                isPreview: false,
                group: void 0,
                input: { uri: Uri, fileName: FileName }
              };
            });
            return [
              {
                tabs: Tabs,
                isActive: true,
                viewColumn: 1,
                activeTab: Tabs.find((T) => T.isActive)
              }
            ];
          },
          activeTabGroup: {
            get tabs() {
              const Visible = Context13.__visibleTextEditors ?? [];
              return Visible.map((Ed) => {
                const Uri = Ed?.document?.uri;
                const FileName = typeof Uri?.toString === "function" ? Uri.toString() : String(Uri ?? "");
                return {
                  label: FileName.split("/").pop() ?? "",
                  isActive: Ed === Context13.__activeTextEditor,
                  isPinned: false,
                  isDirty: false,
                  isPreview: false,
                  group: void 0,
                  input: { uri: Uri, fileName: FileName }
                };
              });
            },
            isActive: true,
            viewColumn: 1,
            // Live getter: return a minimal Tab shape for the active editor.
            get activeTab() {
              const Active = Context13.__activeTextEditor;
              if (!Active) return void 0;
              const Uri = Active?.document?.uri;
              const FileName = typeof Uri?.toString === "function" ? Uri.toString() : String(Uri ?? "");
              return {
                label: FileName.split("/").pop() ?? "",
                isActive: true,
                isPinned: false,
                isDirty: false,
                isPreview: false,
                group: void 0,
                input: { uri: Uri, fileName: FileName }
              };
            }
          },
          onDidChangeTabs: MakeEventSubscriber(
            Context13,
            "window.didChangeTabs"
          ),
          onDidChangeTabGroups: MakeEventSubscriber(
            Context13,
            "window.didChangeTabGroups"
          ),
          close: /* @__PURE__ */ __name(async (Tab, _PreserveFocus) => {
            try {
              const EditorGroups = globalThis.__CEL_SERVICES__?.EditorGroups;
              const TabUri = Tab?.input?.uri;
              if (EditorGroups && TabUri) {
                const Group = EditorGroups.activeGroup;
                if (Group?.closeEditor) {
                  const Editor = Group.findEditor?.(TabUri);
                  if (Editor) {
                    await Group.closeEditor(Editor, {
                      preserveFocus: _PreserveFocus ?? false
                    });
                    return true;
                  }
                }
              }
            } catch {
            }
            try {
              await Context13.MountainClient?.sendRequest(
                "Command.Execute",
                ["workbench.action.closeActiveEditor", []]
              );
              return true;
            } catch {
              return false;
            }
          }, "close")
        },
        get activeColorTheme() {
          let Kind = 2;
          try {
            const ThemeService = globalThis.__CEL_SERVICES__?.Theme;
            const ColorTheme = ThemeService?.getColorTheme?.();
            if (ColorTheme?.type) {
              const T = ColorTheme.type;
              if (T === "light") Kind = 1;
              else if (T === "hc-light") Kind = 4;
              else if (T === "hc-black" || T === "hc") Kind = 3;
              else Kind = 2;
            }
          } catch {
          }
          return {
            kind: Kind,
            onDidChange: MakeEventSubscriber(
              Context13,
              "window.didChangeActiveColorTheme"
            )
          };
        },
        onDidChangeActiveColorTheme: MakeEventSubscriber(
          Context13,
          "window.didChangeActiveColorTheme"
        ),
        createTreeView: /* @__PURE__ */ __name((Id, Options) => {
          const Provider = Options?.treeDataProvider;
          let TreeRefreshSubscription;
          let RegisteredHandle;
          if (Provider) {
            const Handle = NextProviderHandle();
            RegisteredHandle = Handle;
            TreeDataProviders.set(String(Handle), Provider);
            TreeDataProvidersByViewId.set(Id, Provider);
            const SerializableOptions = {
              showCollapseAll: Options?.showCollapseAll === true,
              canSelectMany: Options?.canSelectMany === true,
              manageCheckboxStateManually: Options?.manageCheckboxStateManually === true
            };
            Context13.MountainClient?.sendRequest("tree.register", [
              Handle,
              Id,
              SerializableOptions
            ]).catch(() => {
            });
            try {
              if (typeof Provider?.onDidChangeTreeData === "function") {
                const Subscription = Provider.onDidChangeTreeData(
                  (Element) => {
                    Context13.SendToMountain("tree.refresh", {
                      handle: Handle,
                      viewId: Id,
                      element: Element ?? null
                    }).catch(() => {
                    });
                  }
                );
                if (Subscription && typeof Subscription.dispose === "function") {
                  TreeRefreshSubscription = Subscription;
                }
              }
            } catch {
            }
          }
          const ViewEmitter = new NodeEventEmitter();
          ViewEmitter.setMaxListeners(0);
          const MakeViewEvent = /* @__PURE__ */ __name((EventName) => (Listener) => {
            ViewEmitter.on(EventName, Listener);
            return {
              dispose: /* @__PURE__ */ __name(() => void ViewEmitter.removeListener(
                EventName,
                Listener
              ), "dispose")
            };
          }, "MakeViewEvent");
          const ViewEmitters = Context13.__treeViewEmitters ??= /* @__PURE__ */ new Map();
          ViewEmitters.set(Id, ViewEmitter);
          return {
            reveal: /* @__PURE__ */ __name(async (Element, Options2) => {
              const Handle = typeof Element?.handle === "string" ? Element.handle : typeof Element === "string" ? Element : "";
              Context13.MountainClient?.sendRequest("tree.reveal", [
                Id,
                Handle,
                {
                  select: Options2?.select ?? true,
                  focus: Options2?.focus ?? false,
                  expand: Options2?.expand ?? false
                }
              ]).catch(() => {
              });
            }, "reveal"),
            dispose: /* @__PURE__ */ __name(() => {
              try {
                TreeRefreshSubscription?.dispose?.();
              } catch {
              }
              if (RegisteredHandle !== void 0) {
                TreeDataProviders.delete(String(RegisteredHandle));
              }
              TreeDataProvidersByViewId.delete(Id);
              ViewEmitters.delete(Id);
              Context13.MountainClient?.sendRequest("tree.dispose", [
                Id
              ]).catch(() => {
              });
            }, "dispose"),
            selection: [],
            visible: true,
            title: void 0,
            description: void 0,
            message: void 0,
            badge: void 0,
            onDidChangeSelection: MakeViewEvent(
              "treeView.selectionChanged"
            ),
            onDidChangeVisibility: MakeViewEvent(
              "treeView.visibilityChanged"
            ),
            onDidCollapseElement: MakeViewEvent("treeView.collapseElement"),
            onDidExpandElement: MakeViewEvent("treeView.expandElement"),
            onDidChangeCheckboxState: MakeViewEvent(
              "treeView.checkboxChanged"
            )
          };
        }, "createTreeView"),
        registerTreeDataProvider: /* @__PURE__ */ __name((ViewId, Provider) => {
          const Handle = NextProviderHandle();
          TreeDataProviders.set(String(Handle), Provider);
          TreeDataProvidersByViewId.set(ViewId, Provider);
          Context13.MountainClient?.sendRequest("tree.register", [
            Handle,
            ViewId,
            {}
          ]).catch(() => {
          });
          let TreeEventDispose;
          try {
            if (typeof Provider?.onDidChangeTreeData === "function") {
              const Subscription = Provider.onDidChangeTreeData(
                (Element) => {
                  Context13.SendToMountain("tree.refresh", {
                    handle: Handle,
                    viewId: ViewId,
                    element: Element ?? null
                  }).catch(() => {
                  });
                }
              );
              if (Subscription && typeof Subscription.dispose === "function") {
                TreeEventDispose = Subscription;
              }
            }
          } catch {
          }
          return {
            dispose: /* @__PURE__ */ __name(() => {
              try {
                TreeEventDispose?.dispose?.();
              } catch {
              }
              TreeDataProviders.delete(String(Handle));
              TreeDataProvidersByViewId.delete(ViewId);
              Context13.MountainClient?.sendRequest("tree.unregister", [
                Handle
              ]).catch(() => {
              });
            }, "dispose")
          };
        }, "registerTreeDataProvider"),
        registerWebviewPanelSerializer: /* @__PURE__ */ __name((ViewType, Serializer) => {
          const Key = `__webviewSerializer:${ViewType}`;
          Context13.ExtensionRegistry.set(Key, Serializer);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(Key);
            }, "dispose")
          };
        }, "registerWebviewPanelSerializer"),
        registerWebviewViewProvider: /* @__PURE__ */ __name((ViewId, Provider, Options) => {
          const Handle = NextProviderHandle();
          WebviewViewProviders.set(String(Handle), Provider);
          const RetainContext = !!Options?.webviewOptions?.retainContextWhenHidden;
          WebviewViewBuilders.set(String(Handle), () => {
            return CreateWebviewViewBuilder_default(
              Context13,
              Handle,
              ViewId,
              ToWebviewUri,
              SharedCspSource
            );
          });
          Context13.MountainClient?.sendRequest("webview.registerView", {
            handle: Handle,
            viewId: ViewId,
            retainContextWhenHidden: RetainContext
          }).catch(() => {
          });
          return {
            dispose: /* @__PURE__ */ __name(() => {
              WebviewViewProviders.delete(String(Handle));
              WebviewViewBuilders.delete(String(Handle));
              Context13.MountainClient?.sendRequest(
                "webview.unregisterView",
                { handle: Handle, viewId: ViewId }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "registerWebviewViewProvider"),
        registerCustomEditorProvider: /* @__PURE__ */ __name((ViewType, Provider, Options) => RegisterCustomEditor_default(
          Context13,
          ViewType,
          Provider,
          Options ?? {},
          false
        ), "registerCustomEditorProvider"),
        // `vscode.window.registerCustomReadonlyEditorProvider(ViewType, Provider)`
        // is the read-only variant: extensions implementing media viewers
        // (image previews, hex dumps) register here. The wire flow is the
        // same as `registerCustomEditorProvider`; only the
        // `readonly: true` flag and the absence of `OnSave*` participants
        // distinguishes them. We set the same `customEditor.*` listener
        // registrations so the workbench-side lifecycle still runs the
        // resolveCustomTextEditor / resolveCustomEditor path correctly.
        registerCustomReadonlyEditorProvider: /* @__PURE__ */ __name((ViewType, Provider, Options) => RegisterCustomEditor_default(
          Context13,
          ViewType,
          Provider,
          Options ?? {},
          true
        ), "registerCustomReadonlyEditorProvider"),
        registerFileDecorationProvider: /* @__PURE__ */ __name((Provider) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_file_decoration_provider", {
            handle: Handle,
            extensionId: ""
          }).catch(() => {
          });
          Context13.ExtensionRegistry.set(
            `__fileDecorationProvider:${Handle}`,
            Provider
          );
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(
                `__fileDecorationProvider:${Handle}`
              );
              Context13.SendToMountain(
                "unregister_file_decoration_provider",
                { handle: Handle }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "registerFileDecorationProvider"),
        registerUriHandler: /* @__PURE__ */ __name((Handler) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_uri_handler", {
            handle: Handle,
            extensionId: ""
          }).catch(() => {
          });
          Context13.ExtensionRegistry.set(`__uriHandler:${Handle}`, Handler);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(`__uriHandler:${Handle}`);
              Context13.SendToMountain("unregister_uri_handler", {
                handle: Handle
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerUriHandler"),
        registerTerminalLinkProvider: /* @__PURE__ */ __name((Provider) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_terminal_link_provider", {
            handle: Handle,
            extensionId: ""
          }).catch(() => {
          });
          Context13.ExtensionRegistry.set(
            `__terminalLinkProvider:${Handle}`,
            Provider
          );
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(
                `__terminalLinkProvider:${Handle}`
              );
              Context13.SendToMountain(
                "unregister_terminal_link_provider",
                { handle: Handle }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "registerTerminalLinkProvider"),
        registerTerminalProfileProvider: /* @__PURE__ */ __name((Id, Provider) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_terminal_profile_provider", {
            handle: Handle,
            profileId: Id,
            extensionId: ""
          }).catch(() => {
          });
          Context13.ExtensionRegistry.set(
            `__terminalProfileProvider:${Handle}`,
            Provider
          );
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(
                `__terminalProfileProvider:${Handle}`
              );
              Context13.SendToMountain(
                "unregister_terminal_profile_provider",
                { handle: Handle }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "registerTerminalProfileProvider"),
        registerProfileContentHandler: /* @__PURE__ */ __name((_Id, _Handler) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerProfileContentHandler"),
        registerExternalUriOpener: /* @__PURE__ */ __name((Id, _Opener, _Metadata) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_external_uri_opener", {
            handle: Handle,
            openerId: Id,
            extensionId: ""
          }).catch(() => {
          });
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.SendToMountain("unregister_external_uri_opener", {
                handle: Handle
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerExternalUriOpener"),
        // Runs a Task with a progress object that reports to Mountain, which
        // in turn updates the status-bar progress indicator in Sky.
        // VS Code's contract: `Task(progress, cancellationToken) -> Thenable<R>`.
        // We provide a real `report({ message, increment })` path and a
        // no-op CancellationToken (no cancellation plumbing yet). The
        // Task's return value is forwarded verbatim.
        withProgress: /* @__PURE__ */ __name(async (Options, Task) => {
          const Handle = NextProviderHandle();
          const Title = Options && typeof Options === "object" && Options.title || "Progress";
          const Location = (Options && typeof Options === "object" && Options.location) ?? 15;
          let Increment = 0;
          const Progress = {
            report: /* @__PURE__ */ __name((Value) => {
              if (Value?.increment) Increment += Value.increment;
              Context13.SendToMountain("progress.report", {
                handle: Handle,
                title: Title,
                location: Location,
                message: Value?.message,
                increment: Increment
              }).catch(() => {
              });
            }, "report")
          };
          const CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onCancellationRequested")
          };
          Context13.SendToMountain("progress.start", {
            handle: Handle,
            title: Title,
            location: Location
          }).catch(() => {
          });
          try {
            return await Task(Progress, CancellationToken);
          } finally {
            Context13.SendToMountain("progress.end", {
              handle: Handle
            }).catch(() => {
            });
          }
        }, "withProgress"),
        setStatusBarMessage: /* @__PURE__ */ __name((Text, HideAfter) => {
          const HandleId = `transient:${Math.random().toString(36).slice(2)}`;
          let Disposed = false;
          const Clear = /* @__PURE__ */ __name(() => {
            if (Disposed) return;
            Disposed = true;
            Context13.SendToMountain("statusBar.clearMessage", {
              id: HandleId
            }).catch(() => {
            });
          }, "Clear");
          Context13.SendToMountain("statusBar.message", {
            id: HandleId,
            text: Text
          }).catch(() => {
          });
          if (typeof HideAfter === "number" && HideAfter > 0) {
            setTimeout(Clear, HideAfter);
          } else if (HideAfter && typeof HideAfter.then === "function") {
            HideAfter.then(Clear, Clear);
          }
          return { dispose: Clear };
        }, "setStatusBarMessage"),
        // `showWorkspaceFolderPick` - stable API. Stock routes through
        // `MainThreadMessageService` to open a quick pick seeded with the
        // current `workspace.workspaceFolders`. Land's folder list lives
        // in `ExtensionHostInitData.workspace.folders`; pick the first by
        // default (no picker UI yet). Extensions only use this when a
        // command has to choose a folder for multi-root; degrading to
        // "auto-pick first folder" keeps those flows functional until the
        // picker is wired to Sky.
        showWorkspaceFolderPick: /* @__PURE__ */ __name(async (_Options) => {
          const Folders = Context13.ExtensionHostInitData?.workspace?.folders ?? [];
          return Folders[0];
        }, "showWorkspaceFolderPick"),
        // `withScmProgress` - deprecated in `vscode.d.ts` but still present
        // for extensions that never migrated to `withProgress`. Run the
        // task with a no-op number-progress channel and surface its return
        // value. Stock extHost implementation does the same degradation
        // path.
        withScmProgress: /* @__PURE__ */ __name(async (Task) => Task({
          report: /* @__PURE__ */ __name(() => {
          }, "report")
        }), "withScmProgress"),
        // `registerQuickDiffProvider` - proposed API used by SCM-adjacent
        // extensions to overlay a diff gutter. Stub-as-disposable lets
        // opt-in extensions activate until Land wires a real quick-diff
        // channel to Mountain's git surface.
        registerQuickDiffProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Id, _Label, _RootUri) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerQuickDiffProvider"),
        // Events sourced from Mountain gRPC notifications → Context.Emitter
        onDidChangeActiveTextEditor: MakeEventSubscriber(
          Context13,
          "window.didChangeActiveTextEditor"
        ),
        onDidChangeVisibleTextEditors: MakeEventSubscriber(
          Context13,
          "window.didChangeVisibleTextEditors"
        ),
        onDidChangeTextEditorSelection: MakeEventSubscriber(
          Context13,
          "window.didChangeTextEditorSelection"
        ),
        onDidChangeTextEditorVisibleRanges: MakeEventSubscriber(
          Context13,
          "window.didChangeTextEditorVisibleRanges"
        ),
        onDidChangeTextEditorOptions: MakeEventSubscriber(
          Context13,
          "window.didChangeTextEditorOptions"
        ),
        onDidChangeTextEditorViewColumn: MakeEventSubscriber(
          Context13,
          "window.didChangeTextEditorViewColumn"
        ),
        onDidOpenTerminal: MakeEventSubscriber(
          Context13,
          "window.didOpenTerminal"
        ),
        onDidCloseTerminal: MakeEventSubscriber(
          Context13,
          "window.didCloseTerminal"
        ),
        onDidChangeActiveTerminal: MakeEventSubscriber(
          Context13,
          "window.didChangeActiveTerminal"
        ),
        onDidChangeTerminalState: MakeEventSubscriber(
          Context13,
          "window.didChangeTerminalState"
        ),
        onDidWriteTerminalData: MakeEventSubscriber(Context13, "terminalData"),
        // Fires when OSC 633 P;cwd= is parsed by Sky Bridge → Mountain
        // → $acceptTerminalCwdChange → Cocoon NotificationHandler.
        onDidChangeTerminalShellIntegration: MakeEventSubscriber(
          Context13,
          "window.didChangeTerminalShellIntegration"
        ),
        onDidStartTerminalShellExecution: MakeEventSubscriber(
          Context13,
          "window.didStartTerminalShellExecution"
        ),
        onDidEndTerminalShellExecution: MakeEventSubscriber(
          Context13,
          "window.didEndTerminalShellExecution"
        ),
        onDidChangeWindowState: MakeEventSubscriber(
          Context13,
          "window.didChangeWindowState"
        ),
        // `vscode.git`'s `init()` subscribes to this at
        // `extensions/git/out/main.js` (via the diff decoration pipeline
        // it registers post-activation). Stock `extHostWindow.ts`
        // exposes this event; our shim didn't, so git activate() threw
        // `TypeError: …onDidChangeTextEditorDiffInformation is not a
        // function` and never reached `scm.createSourceControl`, leaving
        // the Source Control panel showing "No source control providers
        // registered". No Mountain-side event source yet; stub with the
        // disposable contract so subscription is a no-op. Real wiring
        // would route Mountain's diff-decoration change stream into a
        // `window.didChangeTextEditorDiffInformation` emit.
        onDidChangeTextEditorDiffInformation: MakeEventSubscriber(
          Context13,
          "window.didChangeTextEditorDiffInformation"
        ),
        onDidExecuteTerminalCommand: MakeEventSubscriber(
          Context13,
          "window.didExecuteTerminalCommand"
        ),
        // Live getter: reflects the last `window.didChangeActiveTextEditor`
        // notification stored on Context by NotificationHandler. Extensions
        // that read `vscode.window.activeTextEditor` synchronously in
        // `activate()` see the current value rather than always `undefined`.
        get activeTextEditor() {
          return Context13.__activeTextEditor ?? void 0;
        },
        // `activeColorTheme` and `tabGroups` already defined earlier in
        // this object literal (lines ~614 and ~581) - leaving the
        // fuller event-aware definitions intact and only mirroring the
        // remaining state placeholders here.
        get visibleTextEditors() {
          return Context13.__visibleTextEditors ?? [];
        },
        visibleNotebookEditors: [],
        activeNotebookEditor: void 0,
        notebookEditors: [],
        get terminals() {
          return Context13.__terminals ?? [];
        },
        get activeTerminal() {
          return Context13.__activeTerminal ?? void 0;
        },
        get state() {
          return Context13.__windowState ?? {
            focused: true,
            active: true
          };
        }
      };
      return Namespace_default(Concrete);
    }, "CreateWindowNamespace");
    Namespace_default2 = CreateWindowNamespace;
  }
});

// Source/Interfaces/I/Performance/Monitoring/Service.ts
var Service_exports4 = {};
__export(Service_exports4, {
  IPerformanceMonitoringService: () => IPerformanceMonitoringService
});
import { Context as Context8 } from "effect";
var IPerformanceMonitoringService;
var init_Service5 = __esm({
  "Source/Interfaces/I/Performance/Monitoring/Service.ts"() {
    "use strict";
    IPerformanceMonitoringService = Context8.Tag("IPerformanceMonitoringService");
  }
});

// Source/Interfaces/I/Security/Service.ts
var Service_exports5 = {};
__export(Service_exports5, {
  ISecurityService: () => ISecurityService
});
import { Context as Context9 } from "effect";
var ISecurityService;
var init_Service6 = __esm({
  "Source/Interfaces/I/Security/Service.ts"() {
    "use strict";
    ISecurityService = Context9.Tag("ISecurityService");
  }
});

// Source/Services/Handler/Request/Routing/Handler.ts
var Handler_exports = {};
__export(Handler_exports, {
  default: () => Handler_default
});
var RouteRequest, Handler_default;
var init_Handler = __esm({
  "Source/Services/Handler/Request/Routing/Handler.ts"() {
    "use strict";
    init_Log();
    RouteRequest = /* @__PURE__ */ __name(async (Method, Parameters) => {
      CocoonDevLog2(
        "request-route",
        `[RequestRoutingHandler] Routing request: ${Method}`
      );
      const RoutePatterns = {
        "extension.\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const { ServiceMapping } = await init_Mapping().then(() => Mapping_exports);
          const { IExtensionHostService: IExtensionHostService2 } = await Promise.resolve().then(() => (init_Service3(), Service_exports2));
          switch (Method2) {
            case "extension.activate": {
              const ExtensionHostService = await ServiceMapping.getService(IExtensionHostService2);
              return await ExtensionHostService.activateExtension(
                Params.extensionId,
                Params.reason
              );
            }
            case "extension.deactivate": {
              const ExtensionHostService = await ServiceMapping.getService(IExtensionHostService2);
              await ExtensionHostService.deactivateExtension(
                Params.extensionId
              );
              return { success: true };
            }
            case "extension.get": {
              const ExtensionHostService = await ServiceMapping.getService(IExtensionHostService2);
              return ExtensionHostService.getActivatedExtension(
                Params.extensionId
              );
            }
            default:
              throw new Error(`Unknown extension method: ${Method2}`);
          }
        }, "extension.\\w+"),
        "configuration.\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const { ServiceMapping } = await init_Mapping().then(() => Mapping_exports);
          const { IConfigurationService: IConfigurationService2 } = await Promise.resolve().then(() => (init_Service4(), Service_exports3));
          switch (Method2) {
            case "configuration.get": {
              const ConfigService = await ServiceMapping.getService(
                IConfigurationService2
              );
              return await ConfigService.getValue(
                Params.key,
                Params.scope
              );
            }
            case "configuration.set": {
              const ConfigService = await ServiceMapping.getService(
                IConfigurationService2
              );
              await ConfigService.setValue(
                Params.key,
                Params.value,
                Params.scope
              );
              return { success: true };
            }
            case "configuration.update": {
              const ConfigService = await ServiceMapping.getService(
                IConfigurationService2
              );
              await ConfigService.updateValue(
                Params.key,
                Params.updater,
                Params.scope
              );
              return { success: true };
            }
            default:
              throw new Error(`Unknown configuration method: ${Method2}`);
          }
        }, "configuration.\\w+"),
        // Mountain → Cocoon tree-children round-trip keyed on `viewId`.
        // Emitted by `Mountain/Source/RPC/CocoonService/TreeView.rs::
        // GetTreeChildren`. Unlike the `tree.*` legacy path that keys on the
        // Cocoon-side `treeDataProvider:N` handle, this variant identifies
        // providers by the same viewId the extension declared in its
        // contributes.views manifest - the only stable key Mountain has.
        "^\\$provideTreeChildren$": /* @__PURE__ */ __name(async (_Method, Params) => {
          const { TreeDataProvidersByViewId: TreeDataProvidersByViewId2 } = await Promise.resolve().then(() => (init_Namespace2(), Namespace_exports));
          const ViewId = Params?.viewId ?? Params?.[0];
          const ItemHandle = Params?.treeItemHandle ?? Params?.[1] ?? "";
          const Provider = TreeDataProvidersByViewId2.get(String(ViewId));
          if (!Provider) {
            return { items: [] };
          }
          const Element = ItemHandle ? ItemHandle : void 0;
          let Children;
          try {
            Children = await Provider.getChildren?.(Element) ?? [];
          } catch (Reason) {
            const Message = Reason instanceof Error ? Reason.message : String(Reason);
            if (/MISSING provider|provider is not set/i.test(Message)) {
              return { items: [] };
            }
            throw Reason;
          }
          const Items = await Promise.all(
            (Array.isArray(Children) ? Children : []).map(
              async (Child, Index) => {
                const Item = await Provider.getTreeItem?.(Child) ?? Child;
                const Raw2 = Item;
                const Label = typeof Raw2.label === "string" ? Raw2.label : Raw2.label?.label ?? "";
                const IconValue = Raw2.iconPath ?? Raw2.icon ?? "";
                const Icon = typeof IconValue === "string" ? IconValue : typeof IconValue?.id === "string" ? IconValue.id : IconValue?.external ?? (IconValue?.scheme && IconValue?.path ? `${IconValue.scheme}://${IconValue.authority ?? ""}${IconValue.path}` : IconValue?.light?.external ?? (IconValue?.light?.scheme && IconValue?.light?.path ? `${IconValue.light.scheme}://${IconValue.light.authority ?? ""}${IconValue.light.path}` : "")) ?? "";
                const CollapsibleState = Raw2.collapsibleState ?? 0;
                const Description = typeof Raw2.description === "string" ? Raw2.description : void 0;
                const Tooltip = typeof Raw2.tooltip === "string" ? Raw2.tooltip : Raw2.tooltip?.value;
                const ResourceUri = Raw2.resourceUri;
                const ContextValue = typeof Raw2.contextValue === "string" ? Raw2.contextValue : void 0;
                const Command = Raw2.command;
                const AccessibilityInformation = Raw2.accessibilityInformation;
                return {
                  handle: String(
                    Raw2.id ?? `${ViewId}/${ItemHandle || "root"}/${Index}`
                  ),
                  label: Label,
                  collapsibleState: CollapsibleState,
                  isCollapsed: CollapsibleState === 1,
                  icon: String(Icon),
                  description: Description,
                  tooltip: Tooltip,
                  resourceUri: ResourceUri,
                  contextValue: ContextValue,
                  command: Command,
                  accessibilityInformation: AccessibilityInformation
                };
              }
            )
          );
          return { items: Items };
        }, "^\\$provideTreeChildren$"),
        "tree\\.\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const { TreeDataProviders: TreeDataProviders2 } = await Promise.resolve().then(() => (init_Namespace2(), Namespace_exports));
          const Handle = Params?.handle ?? Params?.[0];
          const Provider = TreeDataProviders2.get(String(Handle));
          if (!Provider) {
            throw new Error(
              `TreeDataProvider handle not registered: ${Handle}`
            );
          }
          switch (Method2) {
            case "tree.getChildren": {
              const Element = Params?.element ?? Params?.[1];
              const Children = await Provider.getChildren?.(Element) ?? [];
              return Array.isArray(Children) ? Children : [];
            }
            case "tree.getTreeItem": {
              const Element = Params?.element ?? Params?.[1];
              return await Provider.getTreeItem?.(Element) ?? null;
            }
            case "tree.getParent": {
              const Element = Params?.element ?? Params?.[1];
              return await Provider.getParent?.(Element) ?? null;
            }
            case "tree.resolveTreeItem": {
              const Item = Params?.item ?? Params?.[1];
              const Element = Params?.element ?? Params?.[2];
              return await Provider.resolveTreeItem?.(Item, Element) ?? Item;
            }
            default:
              throw new Error(`Unknown tree method: ${Method2}`);
          }
        }, "tree\\.\\w+"),
        "webview\\.\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const {
            WebviewPanels: WebviewPanels2,
            WebviewViewProviders: WebviewViewProviders2,
            WebviewViewBuilders: WebviewViewBuilders2,
            CustomEditorProviders: CustomEditorProviders3
          } = await Promise.resolve().then(() => (init_Namespace2(), Namespace_exports));
          const Handle = Params?.handle ?? Params?.[0];
          switch (Method2) {
            case "webview.resolveView": {
              const Provider = WebviewViewProviders2.get(String(Handle));
              if (!Provider) {
                CocoonDevLog2(
                  "webview",
                  `[RequestRoutingHandler] webview.resolveView called with unregistered handle=${Handle}; returning null so the workbench resolver settles`
                );
                return null;
              }
              const Builder = WebviewViewBuilders2.get(String(Handle));
              const View = Params?.view ?? Params?.[1] ?? Builder?.() ?? {};
              const Ctx = Params?.context ?? Params?.[2] ?? {
                state: void 0
              };
              const Token = Params?.token ?? Params?.[3] ?? {
                isCancellationRequested: false,
                onCancellationRequested: /* @__PURE__ */ __name(() => ({
                  dispose: /* @__PURE__ */ __name(() => {
                  }, "dispose")
                }), "onCancellationRequested")
              };
              try {
                if (process.env["Trace"]) {
                  process.stdout.write(
                    `[RequestRoutingHandler] webview.resolveView -> Provider.resolveWebviewView ENTER handle=${Handle} hasView=${!!View} hasWebview=${!!View?.webview} hasResolver=${typeof Provider?.resolveWebviewView === "function"}
`
                  );
                }
                const Result = await Provider.resolveWebviewView?.(
                  View,
                  Ctx,
                  Token
                ) ?? null;
                if (process.env["Trace"]) {
                  process.stdout.write(
                    `[RequestRoutingHandler] webview.resolveView -> Provider.resolveWebviewView EXIT handle=${Handle} htmlLen=${String(View?.webview?.html ?? "").length}
`
                  );
                }
                return Result;
              } catch (ResolveError) {
                CocoonDevLog2(
                  "webview",
                  `[RequestRoutingHandler] Extension provider.resolveWebviewView threw for handle=${Handle}: ${ResolveError?.message ?? String(ResolveError)}`
                );
                return null;
              }
            }
            case "webview.resolveCustomEditor": {
              const Provider = CustomEditorProviders3.get(String(Handle));
              if (!Provider) {
                CocoonDevLog2(
                  "webview",
                  `[RequestRoutingHandler] webview.resolveCustomEditor called with unregistered handle=${Handle}; returning null`
                );
                return null;
              }
              const Document = Params?.document ?? Params?.[1];
              const Panel = Params?.panel ?? Params?.[2];
              const Token = Params?.token ?? Params?.[3] ?? {
                isCancellationRequested: false,
                onCancellationRequested: /* @__PURE__ */ __name(() => ({
                  dispose: /* @__PURE__ */ __name(() => {
                  }, "dispose")
                }), "onCancellationRequested")
              };
              try {
                return await Provider.resolveCustomEditor?.(
                  Document,
                  Panel,
                  Token
                ) ?? null;
              } catch (ResolveError) {
                CocoonDevLog2(
                  "webview",
                  `[RequestRoutingHandler] Extension provider.resolveCustomEditor threw for handle=${Handle}: ${ResolveError?.message ?? String(ResolveError)}`
                );
                return null;
              }
            }
            default: {
              const Panel = WebviewPanels2.get(String(Handle));
              if (!Panel) return null;
              return null;
            }
          }
        }, "webview\\.\\w+"),
        "performance.\\w+": /* @__PURE__ */ __name(async (Method2, _Params) => {
          const { ServiceMapping } = await init_Mapping().then(() => Mapping_exports);
          const { IPerformanceMonitoringService: IPerformanceMonitoringService2 } = await Promise.resolve().then(() => (init_Service5(), Service_exports4));
          switch (Method2) {
            case "performance.metrics": {
              const PerfService = await ServiceMapping.getService(
                IPerformanceMonitoringService2
              );
              return PerfService.getMetrics();
            }
            case "performance.alerts": {
              const PerfService = await ServiceMapping.getService(
                IPerformanceMonitoringService2
              );
              return PerfService.getAlerts();
            }
            case "performance.report": {
              const PerfService = await ServiceMapping.getService(
                IPerformanceMonitoringService2
              );
              return PerfService.generateReport();
            }
            default:
              throw new Error(`Unknown performance method: ${Method2}`);
          }
        }, "performance.\\w+"),
        "security.\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const { ServiceMapping } = await init_Mapping().then(() => Mapping_exports);
          const { ISecurityService: ISecurityService2 } = await Promise.resolve().then(() => (init_Service6(), Service_exports5));
          switch (Method2) {
            case "security.policy": {
              const SecurityService = await ServiceMapping.getService(ISecurityService2);
              return await SecurityService.getSecurityPolicy(
                Params.extensionId
              );
            }
            case "security.audit": {
              const SecurityService = await ServiceMapping.getService(ISecurityService2);
              return SecurityService.getAuditLog();
            }
            case "security.incidents": {
              const SecurityService = await ServiceMapping.getService(ISecurityService2);
              return SecurityService.getActiveIncidents();
            }
            default:
              throw new Error(`Unknown security method: ${Method2}`);
          }
        }, "security.\\w+")
      };
      RoutePatterns["^\\$provideTextDocumentContent$"] = async (_Method, Params) => {
        const Context13 = globalThis.__cocoonGRPCContext;
        if (!Context13) return null;
        const UriRaw = Params?.uri ?? Params?.[0];
        const UriStr = typeof UriRaw === "string" ? UriRaw : UriRaw?.external ?? (UriRaw?.scheme && UriRaw?.path ? `${UriRaw.scheme}://${UriRaw.authority ?? ""}${UriRaw.path}` : "") ?? "";
        let Scheme = "file";
        if (typeof UriRaw === "object" && UriRaw?.scheme) {
          Scheme = String(UriRaw.scheme);
        } else if (typeof UriStr === "string") {
          const Colon = UriStr.indexOf(":");
          if (Colon > 0 && Colon < 32) Scheme = UriStr.slice(0, Colon);
        }
        const Provider = Context13.ExtensionRegistry?.get(
          `__textDocumentContentProvider:${Scheme}`
        );
        if (!Provider || typeof Provider.provideTextDocumentContent !== "function") {
          return null;
        }
        const CancellationToken = {
          isCancellationRequested: false,
          onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") }), "onCancellationRequested")
        };
        try {
          let UriArg = UriRaw;
          const API = globalThis.__cocoonVscodeAPI;
          if (API?.Uri && UriStr) {
            try {
              UriArg = API.Uri.parse(UriStr);
            } catch {
              UriArg = UriRaw;
            }
          }
          const Content = await Provider.provideTextDocumentContent(
            UriArg,
            CancellationToken
          );
          return Content ?? null;
        } catch (ProviderErr) {
          CocoonDevLog2(
            "model",
            `[RequestRoutingHandler] $provideTextDocumentContent provider error for ${UriStr}: ${ProviderErr?.message ?? String(ProviderErr)}`
          );
          return null;
        }
      };
      Object.assign(RoutePatterns, {
        "languages:\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const Context13 = globalThis.__cocoonGRPCContext ?? {};
          const API = globalThis.__cocoonVscodeAPI;
          if (!API) return null;
          switch (Method2) {
            case "languages:getAll":
              return Array.from(
                Context13.languageIds ?? /* @__PURE__ */ new Set()
              );
            case "languages:getEncodedLanguageId":
              return null;
            default:
              return null;
          }
        }, "languages:\\w+"),
        "scm:\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const API = globalThis.__cocoonVscodeAPI;
          if (!API?.scm) return null;
          switch (Method2) {
            case "scm:getSourceControls":
              return [];
            default:
              return null;
          }
        }, "scm:\\w+"),
        "debug:\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const API = globalThis.__cocoonVscodeAPI;
          if (!API?.debug) return null;
          switch (Method2) {
            case "debug:getSessions":
              return [];
            case "debug:getBreakpoints":
              return [];
            default:
              return null;
          }
        }, "debug:\\w+"),
        "tasks:\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const API = globalThis.__cocoonVscodeAPI;
          if (!API?.tasks) return null;
          switch (Method2) {
            case "tasks:getTasks":
              return [];
            default:
              return null;
          }
        }, "tasks:\\w+"),
        "auth:\\w+": /* @__PURE__ */ __name(async (Method2, Params) => {
          const API = globalThis.__cocoonVscodeAPI;
          if (!API?.authentication) return null;
          switch (Method2) {
            case "auth:getSessions":
              return [];
            default:
              return null;
          }
        }, "auth:\\w+")
      });
      for (const [Pattern, Handler] of Object.entries(RoutePatterns)) {
        const Regex = new RegExp(Pattern);
        if (Regex.test(Method)) {
          if (process.env["NODE_ENV"] !== "production") {
            const StartMillis = Date.now();
            let Ok = true;
            try {
              return await Handler(Method, Parameters);
            } catch (Error2) {
              Ok = false;
              throw Error2;
            } finally {
              const DurationMs = Date.now() - StartMillis;
              try {
                const { CaptureHandler: CaptureHandler2 } = await Promise.resolve().then(() => (init_Bridge(), Bridge_exports));
                CaptureHandler2(Method, DurationMs, Ok);
              } catch {
              }
            }
          }
          return Handler(Method, Parameters);
        }
      }
      return void 0;
    }, "RouteRequest");
    Handler_default = RouteRequest;
  }
});

// Source/Generated/RouteManifest.ts
var MountainMethods, StockLiftExports, BespokeCocoonMethods, RouteManifestSummary;
var init_RouteManifest = __esm({
  "Source/Generated/RouteManifest.ts"() {
    "use strict";
    MountainMethods = /* @__PURE__ */ new Set(["$disposeStatusBarMessage", "$gitExec", "$resolveCustomEditor", "$scm:createSourceControl", "$scm:openDiff", "$scm:registerInputBox", "$scm:updateGroup", "$scm:updateSourceControl", "$setStatusBarMessage", "$statusBar:dispose", "$statusBar:set", "$terminal:create", "$terminal:dispose", "$terminal:hide", "$terminal:resize", "$terminal:sendText", "$terminal:show", "$tree:register", "$updateWorkspaceFolders", "applyEdit", "Authentication.GetAccounts", "Authentication.GetSession", "Clipboard.Read", "Clipboard.Write", "Command.Execute", "Command.GetAll", "config.get", "config.update", "Configuration.Inspect", "Configuration.Update", "Debug.RegisterConfigurationProvider", "Debug.Start", "Debug.Stop", "Diagnostic.Clear", "Diagnostic.Set", "Document.Save", "Document.SaveAs", "error", "executeCommand", "FileSystem.Copy", "FileSystem.CreateDirectory", "FileSystem.Delete", "FileSystem.ReadDirectory", "FileSystem.ReadFile", "FileSystem.Rename", "FileSystem.Stat", "FileSystem.WriteFile", "FileWatcher.Register", "FileWatcher.Unregister", "findFiles", "findTextInFiles", "html", "Keybinding.GetResolved", "Languages.GetAll", "message", "NativeHost.OpenExternal", "openDocument", "postMessage", "readFile", "register_call_hierarchy_provider", "register_code_actions_provider", "register_code_lens_provider", "register_color_provider", "register_completion_item_provider", "register_declaration_provider", "register_definition_provider", "register_document_drop_edit_provider", "register_document_formatting_provider", "register_document_highlight_provider", "register_document_link_provider", "register_document_paste_edit_provider", "register_document_range_formatting_provider", "register_document_symbol_provider", "register_evaluatable_expression_provider", "register_folding_range_provider", "register_hover_provider", "register_implementation_provider", "register_inlay_hints_provider", "register_inline_completion_item_provider", "register_inline_edit_provider", "register_inline_values_provider", "register_linked_editing_range_provider", "register_mapped_edits_provider", "register_multi_document_highlight_provider", "register_on_type_formatting_provider", "register_reference_provider", "register_rename_provider", "register_selection_range_provider", "register_semantic_tokens_provider", "register_signature_help_provider", "register_type_definition_provider", "register_type_hierarchy_provider", "register_workspace_symbol_provider", "saveAll", "Search.TextSearch", "secrets.delete", "secrets.get", "secrets.store", "setHtml", "showTextDocument", "stat", "Storage.Get", "Storage.GetItems", "Storage.Set", "Task.Execute", "Task.Fetch", "Terminal.GetProcessId", "Terminal.Hide", "Terminal.Resize", "Terminal.Show", "tree.dispose", "tree.register", "tree.reveal", "tree.unregister", "UserInterface.ShowInputBox", "UserInterface.ShowMessage", "UserInterface.ShowOpenDialog", "UserInterface.ShowQuickPick", "UserInterface.ShowSaveDialog", "viewId", "vscode.diff", "warning", "webview.postMessage", "webview.registerView", "webview.setHtml", "webview.unregisterView", "window.revealRange", "Window.ShowInputBox", "Window.ShowMessage", "Window.ShowOpenDialog", "Window.ShowQuickPick", "Window.ShowSaveDialog", "Workspace.IsResourceTrusted", "Workspace.RequestResourceTrust", "Workspace.Save", "Workspace.SaveAll", "Workspace.SaveAs"]);
    StockLiftExports = /* @__PURE__ */ new Set();
    BespokeCocoonMethods = /* @__PURE__ */ new Set(["FindTextInFilesNodeFallback"]);
    RouteManifestSummary = {
      mountain: 137,
      stockLift: 0,
      bespoke: 1,
      generatedAt: "2026-05-25T19:09:39Z"
    };
  }
});

// Source/Services/Dual/Track.ts
var Track_exports = {};
__export(Track_exports, {
  IsRustDeferralEnabled: () => IsRustDeferralEnabled,
  IsUnknownMethodError: () => IsUnknownMethodError,
  LogDualTrack: () => LogDualTrack,
  MarkUnavailable: () => MarkUnavailable,
  NotImplementedError: () => NotImplementedError,
  SendToMountainOrLocal: () => SendToMountainOrLocal,
  TryMountainThenNode: () => TryMountainThenNode,
  TryMountainWithEmptyFallback: () => TryMountainWithEmptyFallback
});
function IsUnknownMethodError(Err) {
  if (Err == null) return false;
  const Message = Err instanceof Error ? Err.message : typeof Err === "string" ? Err : typeof Err.message === "string" ? Err.message : "";
  if (!Message) return false;
  return Message.includes("Unknown method:") || Message.includes("Unknown IPC command") || Message.includes("no handler for method") || Message.includes("not routed to any domain");
}
async function TryMountainThenNode(Context13, Method, Arguments, NodeFallback) {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  if (!MountainMethods.has(Method)) {
    LogDualTrack(Method, "node-fallback");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  try {
    const MountainResult = await Context13.MountainClient?.sendRequest(
      Method,
      Arguments
    );
    LogDualTrack(Method, "mountain");
    return MountainResult;
  } catch (Err) {
    if (IsUnknownMethodError(Err)) {
      LogDualTrack(Method, "node-fallback");
      try {
        return await NodeFallback(Arguments);
      } catch (NodeErr) {
        LogDualTrack(Method, "error");
        throw NodeErr;
      }
    }
    LogDualTrack(Method, "error");
    throw Err;
  }
}
async function TryMountainWithEmptyFallback(Context13, Method, Arguments, NodeFallback, IsEmpty) {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  if (!MountainMethods.has(Method)) {
    LogDualTrack(Method, "node-fallback");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  let MountainResult;
  let MountainSucceeded = false;
  try {
    MountainResult = await Context13.MountainClient?.sendRequest(
      Method,
      Arguments
    );
    MountainSucceeded = true;
    LogDualTrack(Method, "mountain");
  } catch (Err) {
    if (!IsUnknownMethodError(Err)) {
      LogDualTrack(Method, "error");
      throw Err;
    }
    LogDualTrack(Method, "node-fallback");
  }
  if (MountainSucceeded && MountainResult !== void 0 && IsEmpty(MountainResult)) {
    try {
      const NodeResult = await NodeFallback(Arguments);
      const NodeIsEmpty = IsEmpty(NodeResult);
      if (!NodeIsEmpty) {
        if (process.env["Trace"]) {
          process.stdout.write(
            `[DEV:DUAL-TRACK] method=${Method} route=node-shadow (mountain returned empty)
`
          );
        }
        return NodeResult;
      }
      return MountainResult;
    } catch {
      return MountainResult;
    }
  }
  if (MountainSucceeded && MountainResult !== void 0) {
    return MountainResult;
  }
  try {
    return await NodeFallback(Arguments);
  } catch (NodeErr) {
    LogDualTrack(Method, "error");
    throw NodeErr;
  }
}
function MarkUnavailable(Method) {
  LogDualTrack(Method, "unavailable");
  throw new NotImplementedError(Method);
}
var NotImplementedError, IsBypassValue, ParseDomain, IsRustDeferralEnabled, SendToMountainOrLocal, LogDualTrack;
var init_Track = __esm({
  "Source/Services/Dual/Track.ts"() {
    "use strict";
    init_RouteManifest();
    NotImplementedError = class extends Error {
      constructor(Method) {
        super(
          `Method '${Method}' is not implemented in Land: no Mountain Rust handler, no stock VS Code lift, no Cocoon bespoke fallback.`
        );
        this.Method = Method;
        this.name = "NotImplementedError";
      }
      Method;
      static {
        __name(this, "NotImplementedError");
      }
      code = "NotImplemented";
      _tag = "NotImplementedError";
    };
    if (process.env["Trace"]) {
      process.stdout.write(
        `[DEV:DUAL-TRACK] manifest mountain=${RouteManifestSummary.mountain} stockLift=${RouteManifestSummary.stockLift} bespoke=${RouteManifestSummary.bespoke} generated=${RouteManifestSummary.generatedAt}
`
      );
    }
    IsBypassValue = /* @__PURE__ */ __name((Raw2) => {
      if (!Raw2) return false;
      const Normalised = Raw2.trim().toLowerCase();
      return Normalised === "false" || Normalised === "0" || Normalised === "no" || Normalised === "off";
    }, "IsBypassValue");
    ParseDomain = /* @__PURE__ */ __name((Method) => {
      const Dot = Method.indexOf(".");
      if (Dot <= 0) return "";
      return Method.slice(0, Dot).toUpperCase();
    }, "ParseDomain");
    IsRustDeferralEnabled = /* @__PURE__ */ __name((Method) => {
      const MethodKey = `Defer${Method.replace(/[.:]/g, "_")}`;
      if (process.env[MethodKey] !== void 0) {
        return !IsBypassValue(process.env[MethodKey]);
      }
      const Domain = ParseDomain(Method);
      if (Domain) {
        const DomainKey = `Defer${Domain}`;
        if (process.env[DomainKey] !== void 0) {
          return !IsBypassValue(process.env[DomainKey]);
        }
      }
      if (process.env["Defer"] !== void 0) {
        return !IsBypassValue(process.env["Defer"]);
      }
      return true;
    }, "IsRustDeferralEnabled");
    if (process.env["Trace"]) {
      const ActiveBypasses = Object.keys(process.env).filter((K) => K === "Defer" || K.startsWith("Defer")).filter((K) => IsBypassValue(process.env[K])).join(",");
      if (ActiveBypasses) {
        process.stdout.write(
          `[DEV:DUAL-TRACK] rust-deferral bypass-knobs=${ActiveBypasses}
`
        );
      }
    }
    __name(IsUnknownMethodError, "IsUnknownMethodError");
    __name(TryMountainThenNode, "TryMountainThenNode");
    __name(TryMountainWithEmptyFallback, "TryMountainWithEmptyFallback");
    __name(MarkUnavailable, "MarkUnavailable");
    SendToMountainOrLocal = /* @__PURE__ */ __name((Context13, Method, Payload, OnLocalFallback) => {
      if (!IsRustDeferralEnabled(Method)) {
        LogDualTrack(Method, "node-bypass");
        try {
          OnLocalFallback?.();
        } catch {
        }
        return Promise.resolve();
      }
      const Send = Context13.SendToMountain;
      return Send.call(Context13, Method, Payload).then(
        () => {
          LogDualTrack(Method, "mountain");
        },
        (_Err) => {
          LogDualTrack(Method, "error");
        }
      );
    }, "SendToMountainOrLocal");
    LogDualTrack = /* @__PURE__ */ __name((Method, Route3) => {
      if (!process.env["Trace"]) return;
      process.stdout.write(`[DEV:DUAL-TRACK] method=${Method} route=${Route3}
`);
    }, "LogDualTrack");
  }
});

// Source/Interfaces/IGRPC/Server/Service.ts
import { Context as Context10 } from "effect";
var IGRPCServerService;
var init_Service7 = __esm({
  "Source/Interfaces/IGRPC/Server/Service.ts"() {
    "use strict";
    IGRPCServerService = Context10.GenericTag("IGRPCServerService");
  }
});

// Source/Services/Handler/Document/Content/Handler.ts
var InferLanguageIdentifier, BuildTextDocument, DocumentVersionMap, HandleDocumentChange, HandleDocumentOpen, HandleDocumentClose, HandleDocumentSave, GetDocumentContent, Handler_default2;
var init_Handler2 = __esm({
  "Source/Services/Handler/Document/Content/Handler.ts"() {
    "use strict";
    init_Log();
    InferLanguageIdentifier = /* @__PURE__ */ __name((Uri) => {
      const ExtensionMatch = Uri.match(/\.([^./?#]+)(?:\?|#|$)/);
      if (!ExtensionMatch?.[1]) return "plaintext";
      const Extension2 = ExtensionMatch[1].toLowerCase();
      const LanguageMap = {
        ts: "typescript",
        tsx: "typescriptreact",
        js: "javascript",
        jsx: "javascriptreact",
        json: "json",
        jsonc: "jsonc",
        md: "markdown",
        html: "html",
        htm: "html",
        css: "css",
        scss: "scss",
        less: "less",
        xml: "xml",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        rs: "rust",
        py: "python",
        rb: "ruby",
        go: "go",
        java: "java",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        cs: "csharp",
        swift: "swift",
        sh: "shellscript",
        bash: "shellscript",
        zsh: "shellscript",
        ps1: "powershell",
        sql: "sql",
        graphql: "graphql",
        proto: "proto3",
        dockerfile: "dockerfile",
        vue: "vue",
        svelte: "svelte",
        astro: "astro",
        txt: "plaintext"
      };
      return LanguageMap[Extension2] ?? "plaintext";
    }, "InferLanguageIdentifier");
    BuildTextDocument = /* @__PURE__ */ __name((Uri, Content, Version = 1, LanguageIdentifier) => {
      const Lines = Content.split(/\r?\n/);
      const FileName = Uri.replace(/^file:\/\//, "");
      const ResolvedLanguage = LanguageIdentifier ?? InferLanguageIdentifier(Uri);
      return {
        uri: {
          scheme: "file",
          path: FileName,
          fsPath: FileName,
          authority: "",
          query: "",
          fragment: "",
          with: /* @__PURE__ */ __name(() => ({}), "with"),
          toString: /* @__PURE__ */ __name(() => Uri, "toString"),
          toJSON: /* @__PURE__ */ __name(() => ({
            scheme: "file",
            path: FileName,
            fsPath: FileName
          }), "toJSON")
        },
        fileName: FileName,
        languageId: ResolvedLanguage,
        version: Version,
        lineCount: Lines.length,
        getText: /* @__PURE__ */ __name((Range) => {
          if (!Range) return Content;
          const StartLine = Range?.start?.line ?? 0;
          const StartCharacter = Range?.start?.character ?? 0;
          const EndLine = Range?.end?.line ?? Lines.length - 1;
          const EndCharacter = Range?.end?.character ?? Lines[EndLine]?.length ?? 0;
          if (StartLine === EndLine) {
            return (Lines[StartLine] ?? "").substring(
              StartCharacter,
              EndCharacter
            );
          }
          const Result = [];
          Result.push((Lines[StartLine] ?? "").substring(StartCharacter));
          for (let Index = StartLine + 1; Index < EndLine; Index++) {
            Result.push(Lines[Index] ?? "");
          }
          Result.push((Lines[EndLine] ?? "").substring(0, EndCharacter));
          return Result.join("\n");
        }, "getText"),
        lineAt: /* @__PURE__ */ __name((LineOrPosition) => {
          const LineNumber = typeof LineOrPosition === "number" ? LineOrPosition : LineOrPosition.line;
          const Text = Lines[LineNumber] ?? "";
          return {
            text: Text,
            lineNumber: LineNumber,
            range: {
              start: { line: LineNumber, character: 0 },
              end: { line: LineNumber, character: Text.length }
            },
            isEmptyOrWhitespace: Text.trim().length === 0
          };
        }, "lineAt"),
        isUntitled: false,
        isDirty: false,
        isClosed: false,
        eol: 1,
        // EndOfLine.LF
        offsetAt: /* @__PURE__ */ __name((Position) => {
          let Offset = 0;
          for (let Index = 0; Index < Position.line && Index < Lines.length; Index++) {
            Offset += (Lines[Index]?.length ?? 0) + 1;
          }
          return Offset + Position.character;
        }, "offsetAt"),
        positionAt: /* @__PURE__ */ __name((Offset) => {
          let Remaining = Offset;
          for (let Index = 0; Index < Lines.length; Index++) {
            const LineLength = (Lines[Index]?.length ?? 0) + 1;
            if (Remaining < LineLength) {
              return { line: Index, character: Remaining };
            }
            Remaining -= LineLength;
          }
          return {
            line: Lines.length - 1,
            character: Lines[Lines.length - 1]?.length ?? 0
          };
        }, "positionAt"),
        validateRange: /* @__PURE__ */ __name((Range) => Range, "validateRange"),
        validatePosition: /* @__PURE__ */ __name((Position) => Position, "validatePosition"),
        getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
        save: /* @__PURE__ */ __name(async () => false, "save")
      };
    }, "BuildTextDocument");
    DocumentVersionMap = /* @__PURE__ */ new Map();
    HandleDocumentChange = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
      let Uri;
      let EventData;
      if (Array.isArray(Parameters) && Parameters.length >= 2) {
        Uri = Parameters[0]?.external ?? (Parameters[0]?.scheme && Parameters[0]?.path ? `${Parameters[0].scheme}://${Parameters[0].authority ?? ""}${Parameters[0].path}` : "") ?? "";
        EventData = Parameters[1];
      } else {
        Uri = Parameters?.uri?.external ?? Parameters?.uri ?? Parameters?.Uri ?? "";
        EventData = Parameters;
      }
      const Content = EventData?.content ?? EventData?.Content ?? EventData?.text;
      if (Uri && Content !== void 0) {
        DocumentContentCache.set(Uri, Content);
      } else if (Uri && (EventData?.changes || Parameters?.changes)) {
        const Existing = DocumentContentCache.get(Uri) ?? "";
        let Updated = Existing;
        const Changes = Array.isArray(EventData?.changes) ? EventData.changes : Array.isArray(Parameters?.changes) ? Parameters.changes : [];
        const Sorted = [...Changes].sort(
          (A, B) => (B.rangeOffset ?? 0) - (A.rangeOffset ?? 0)
        );
        for (const Change of Sorted) {
          const Offset = Change.rangeOffset ?? 0;
          const Length = Change.rangeLength ?? 0;
          const Text = Change.text ?? "";
          Updated = Updated.substring(0, Offset) + Text + Updated.substring(Offset + Length);
        }
        DocumentContentCache.set(Uri, Updated);
      }
      if (Uri && WorkspaceEventEmitter) {
        const CurrentVersion = (DocumentVersionMap.get(Uri) ?? 1) + 1;
        DocumentVersionMap.set(Uri, CurrentVersion);
        const CachedContent = DocumentContentCache.get(Uri) ?? "";
        const Document = BuildTextDocument(Uri, CachedContent, CurrentVersion);
        WorkspaceEventEmitter.emit("didChangeTextDocument", {
          document: Document,
          contentChanges: EventData?.changes ?? Parameters?.changes ?? [],
          reason: void 0
        });
      }
    }, "HandleDocumentChange");
    HandleDocumentOpen = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
      const Models = Array.isArray(Parameters) ? Parameters : [Parameters];
      for (const Model of Models) {
        const Uri = Model?.URI?.toString?.() ?? Model?.URI ?? Model?.uri?.external ?? Model?.uri ?? Model?.Uri ?? "";
        const Lines = Model?.Lines ?? Model?.lines;
        const EOL = Model?.EOL ?? Model?.eol ?? "\n";
        let Content;
        if (Array.isArray(Lines)) {
          Content = Lines.join(EOL);
        } else {
          Content = Model?.content ?? Model?.Content ?? Model?.text;
        }
        const LanguageIdentifier = Model?.LanguageIdentifier ?? Model?.languageId ?? Model?.language;
        if (Uri && Content !== void 0) {
          DocumentContentCache.set(Uri, Content);
          DocumentVersionMap.set(Uri, 1);
          CocoonDevLog2(
            "document",
            `[DocumentContentHandler] Document opened: ${Uri.slice(-60)} (${Content.length} chars)`
          );
          if (WorkspaceEventEmitter) {
            const Document = BuildTextDocument(
              Uri,
              Content,
              1,
              LanguageIdentifier
            );
            WorkspaceEventEmitter.emit("didOpenTextDocument", Document);
          }
        }
      }
    }, "HandleDocumentOpen");
    HandleDocumentClose = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
      const Items = Array.isArray(Parameters) ? Parameters : [Parameters];
      for (const Item of Items) {
        const Uri = Item?.external ?? Item?.uri?.external ?? Item?.uri ?? Item?.Uri ?? "";
        if (Uri) {
          if (WorkspaceEventEmitter) {
            const CachedContent = DocumentContentCache.get(Uri) ?? "";
            const Version = DocumentVersionMap.get(Uri) ?? 1;
            const Document = BuildTextDocument(Uri, CachedContent, Version);
            WorkspaceEventEmitter.emit("didCloseTextDocument", Document);
          }
          DocumentContentCache.delete(Uri);
          DocumentVersionMap.delete(Uri);
        }
      }
    }, "HandleDocumentClose");
    HandleDocumentSave = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
      if (!WorkspaceEventEmitter) return;
      const Items = Array.isArray(Parameters) ? Parameters : [Parameters];
      for (const Item of Items) {
        const Uri = typeof Item === "string" ? Item : Item?.external ?? Item?.uri?.external ?? Item?.uri ?? Item?.Uri ?? "";
        if (Uri) {
          const CachedContent = DocumentContentCache.get(Uri) ?? "";
          const Version = DocumentVersionMap.get(Uri) ?? 1;
          const Document = BuildTextDocument(Uri, CachedContent, Version);
          WorkspaceEventEmitter.emit("didSaveTextDocument", Document);
        }
      }
    }, "HandleDocumentSave");
    GetDocumentContent = /* @__PURE__ */ __name((DocumentContentCache, Uri) => {
      return DocumentContentCache.get(Uri) ?? null;
    }, "GetDocumentContent");
    Handler_default2 = {
      HandleDocumentChange,
      HandleDocumentOpen,
      HandleDocumentClose,
      HandleDocumentSave,
      GetDocumentContent,
      BuildTextDocument
    };
  }
});

// Source/Platform/FiddeeRoot.ts
function FiddeeRoot() {
  const Home = process.env["HOME"] ?? process.env["USERPROFILE"] ?? null;
  if (typeof Home === "string" && Home.length > 0) {
    return `${Home}/${DotfileName}`;
  }
  return DotfileName;
}
var DotfileName;
var init_FiddeeRoot = __esm({
  "Source/Platform/FiddeeRoot.ts"() {
    "use strict";
    DotfileName = ".fiddee";
    __name(FiddeeRoot, "FiddeeRoot");
  }
});

// Source/Services/Handler/Extension/Host/ActivateExtension.ts
import * as NodeFS from "node:fs";
var CreateExtensionContext, ActivateExtension, ActivateExtension_default;
var init_ActivateExtension = __esm({
  "Source/Services/Handler/Extension/Host/ActivateExtension.ts"() {
    "use strict";
    init_FiddeeRoot();
    init_Log();
    CreateExtensionContext = /* @__PURE__ */ __name((Context13, Extension2, ExtensionPath) => {
      const ExtId = Extension2?.identifier?.value ?? Extension2?.identifier?.id ?? Extension2?.identifier ?? "";
      const FiddeeRootPath = FiddeeRoot();
      const StorageBase = `${FiddeeRootPath}/extensionStorage`;
      const GlobalStorageBase = `${FiddeeRootPath}/globalStorage`;
      const LogBase = `${FiddeeRootPath}/logs`;
      const ExtStoragePath = `${StorageBase}/${ExtId}`;
      const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;
      const LogPath = `${LogBase}/${ExtId}`;
      try {
        NodeFS.mkdirSync(ExtStoragePath, { recursive: true });
        NodeFS.mkdirSync(GlobalStoragePath, { recursive: true });
        NodeFS.mkdirSync(LogPath, { recursive: true });
      } catch {
      }
      let FullPackageJSON = Extension2;
      try {
        const Contents = NodeFS.readFileSync(
          `${ExtensionPath}/package.json`,
          "utf8"
        );
        const Parsed = JSON.parse(Contents);
        FullPackageJSON = {
          ...Parsed,
          ...Extension2
        };
      } catch {
      }
      const VsCodeUri = globalThis.__cocoonVscodeAPI?.Uri;
      const MakeUri = /* @__PURE__ */ __name((Path) => {
        if (VsCodeUri && typeof VsCodeUri.file === "function") {
          return VsCodeUri.file(Path);
        }
        return {
          scheme: "file",
          path: Path,
          fsPath: Path,
          authority: "",
          query: "",
          fragment: "",
          with: /* @__PURE__ */ __name(function(Change) {
            return { ...this, ...Change };
          }, "with"),
          toString: /* @__PURE__ */ __name(() => `file://${Path}`, "toString")
        };
      }, "MakeUri");
      return {
        subscriptions: [],
        extensionPath: ExtensionPath,
        extensionUri: MakeUri(ExtensionPath),
        // VS Code API: `context.asAbsolutePath(relative)` returns the
        // extension path joined with a relative path. The 4 language-
        // features extensions all call this immediately in their activate
        // function to resolve server bundle locations; without it, they
        // fail before vscode-languageclient even constructs.
        asAbsolutePath: /* @__PURE__ */ __name((RelativePath2) => {
          const Trimmed = RelativePath2.replace(/^\.?\//, "");
          return `${ExtensionPath}/${Trimmed}`;
        }, "asAbsolutePath"),
        storagePath: ExtStoragePath,
        globalStoragePath: GlobalStoragePath,
        logPath: LogPath,
        storageUri: MakeUri(ExtStoragePath),
        globalStorageUri: MakeUri(GlobalStoragePath),
        logUri: MakeUri(LogPath),
        environmentVariableCollection: /* @__PURE__ */ (() => {
          const ExtIdCached = ExtId;
          const Entries = /* @__PURE__ */ new Map();
          const Forward = /* @__PURE__ */ __name((Op, Extra) => {
            Context13.SendToMountain("terminal.envCollection." + Op, {
              extensionId: ExtIdCached,
              persistent: Persistent,
              description: Description,
              ...Extra
            }).catch(() => {
            });
          }, "Forward");
          let Persistent = false;
          let Description = void 0;
          const Collection = {
            get persistent() {
              return Persistent;
            },
            set persistent(Value) {
              Persistent = !!Value;
              Forward("setPersistent", { persistent: Persistent });
            },
            get description() {
              return Description;
            },
            set description(Value) {
              Description = Value;
              Forward("setDescription", { description: Value });
            },
            replace: /* @__PURE__ */ __name((Variable, Value, Options) => {
              Entries.set(Variable, {
                value: Value,
                type: 1,
                options: Options
              });
              Forward("replace", {
                variable: Variable,
                value: Value,
                options: Options
              });
            }, "replace"),
            append: /* @__PURE__ */ __name((Variable, Value, Options) => {
              Entries.set(Variable, {
                value: Value,
                type: 2,
                options: Options
              });
              Forward("append", {
                variable: Variable,
                value: Value,
                options: Options
              });
            }, "append"),
            prepend: /* @__PURE__ */ __name((Variable, Value, Options) => {
              Entries.set(Variable, {
                value: Value,
                type: 3,
                options: Options
              });
              Forward("prepend", {
                variable: Variable,
                value: Value,
                options: Options
              });
            }, "prepend"),
            get: /* @__PURE__ */ __name((Variable) => {
              return Entries.get(Variable);
            }, "get"),
            forEach: /* @__PURE__ */ __name((Callback, _ThisArg) => {
              for (const [Key, Value] of Entries) {
                try {
                  Callback(Key, Value, Collection);
                } catch {
                }
              }
            }, "forEach"),
            delete: /* @__PURE__ */ __name((Variable) => {
              Entries.delete(Variable);
              Forward("delete", { variable: Variable });
            }, "delete"),
            clear: /* @__PURE__ */ __name(() => {
              Entries.clear();
              Forward("clear", {});
            }, "clear"),
            // `getScoped({ workspaceFolder })` returns a scoped sub-collection.
            // Currently we don't track per-scope mutations server-side, so
            // scoped operations behave identically to the global collection.
            // Extensions that depend on strict per-folder scoping will see
            // global behaviour - acceptable degradation for v1; flag in
            // the followup if any extension is observed broken by this.
            getScoped: /* @__PURE__ */ __name((_Scope) => Collection, "getScoped"),
            [Symbol.iterator]: function* () {
              for (const Entry of Entries) yield Entry;
            }
          };
          return Collection;
        })(),
        // Real secrets - routes to Mountain's AES-256-GCM encrypted storage.
        secrets: /* @__PURE__ */ (() => {
          const ExtIdCached = ExtId;
          const Listeners = [];
          return {
            get: /* @__PURE__ */ __name(async (Key) => {
              try {
                const Result = await Context13.MountainClient?.sendRequest(
                  "secrets.get",
                  { key: Key, extensionId: ExtIdCached }
                );
                return typeof Result === "string" ? Result : void 0;
              } catch {
                return void 0;
              }
            }, "get"),
            store: /* @__PURE__ */ __name(async (Key, Value) => {
              try {
                await Context13.MountainClient?.sendRequest(
                  "secrets.store",
                  {
                    key: Key,
                    value: Value,
                    extensionId: ExtIdCached
                  }
                );
                for (const L of Listeners) {
                  try {
                    L({ key: Key });
                  } catch {
                  }
                }
              } catch {
              }
            }, "store"),
            delete: /* @__PURE__ */ __name(async (Key) => {
              try {
                await Context13.MountainClient?.sendRequest(
                  "secrets.delete",
                  {
                    key: Key,
                    extensionId: ExtIdCached
                  }
                );
                for (const L of Listeners) {
                  try {
                    L({ key: Key });
                  } catch {
                  }
                }
              } catch {
              }
            }, "delete"),
            onDidChange: /* @__PURE__ */ __name((Listener) => {
              Listeners.push(Listener);
              return {
                dispose: /* @__PURE__ */ __name(() => {
                  const I = Listeners.indexOf(Listener);
                  if (I !== -1) Listeners.splice(I, 1);
                }, "dispose")
              };
            }, "onDidChange")
          };
        })(),
        // Real workspace/global state backed by Mountain's storage.
        // Caches must be pre-populated by `PrimeStorageCaches` BEFORE the
        // extension's `activate()` runs (see ActivateExtension below).
        // VS Code's `ExtensionContext.workspaceState.get(key, default)`
        // is a SYNCHRONOUS API - extensions read it during activate to
        // drive control flow (Roo Code reads `taskHistory`, GitHub
        // Copilot reads `signInDismissed`, GitLens reads
        // `views.welcome.dismissed`). Without prime, the first sync
        // read returns the default, the cache fills later, and the
        // extension's UI ends up in the wrong state.
        workspaceState: /* @__PURE__ */ (() => {
          const ExtIdCached = ExtId;
          const Cache = /* @__PURE__ */ new Map();
          const State = {
            get: /* @__PURE__ */ __name((Key, DefaultValue) => {
              if (Cache.has(Key)) {
                const Cached = Cache.get(Key);
                return Cached === void 0 ? DefaultValue : Cached;
              }
              void Context13.MountainClient?.sendRequest("Storage.Get", [
                `${ExtIdCached}:workspace:${Key}`
              ]).then((V) => {
                if (V !== void 0) Cache.set(Key, V);
              }).catch(() => {
              });
              return DefaultValue;
            }, "get"),
            update: /* @__PURE__ */ __name(async (Key, Value) => {
              Cache.set(Key, Value);
              await Context13.MountainClient?.sendRequest("Storage.Set", [
                `${ExtIdCached}:workspace:${Key}`,
                Value
              ]).catch(() => {
              });
            }, "update"),
            keys: /* @__PURE__ */ __name(() => [...Cache.keys()], "keys"),
            // Exposed for `PrimeStorageCaches` below so the boot path
            // can bulk-load every existing key before activate runs.
            __primeCache: /* @__PURE__ */ __name((Entries) => {
              for (const [K, V] of Entries) {
                if (V !== void 0) Cache.set(K, V);
              }
            }, "__primeCache")
          };
          return State;
        })(),
        globalState: /* @__PURE__ */ (() => {
          const ExtIdCached = ExtId;
          const Cache = /* @__PURE__ */ new Map();
          const State = {
            get: /* @__PURE__ */ __name((Key, DefaultValue) => {
              if (Cache.has(Key)) {
                const Cached = Cache.get(Key);
                return Cached === void 0 ? DefaultValue : Cached;
              }
              void Context13.MountainClient?.sendRequest("Storage.Get", [
                `${ExtIdCached}:global:${Key}`
              ]).then((V) => {
                if (V !== void 0) Cache.set(Key, V);
              }).catch(() => {
              });
              return DefaultValue;
            }, "get"),
            update: /* @__PURE__ */ __name(async (Key, Value) => {
              Cache.set(Key, Value);
              await Context13.MountainClient?.sendRequest("Storage.Set", [
                `${ExtIdCached}:global:${Key}`,
                Value
              ]).catch(() => {
              });
            }, "update"),
            keys: /* @__PURE__ */ __name(() => [...Cache.keys()], "keys"),
            setKeysForSync: /* @__PURE__ */ __name((_Keys) => {
            }, "setKeysForSync"),
            __primeCache: /* @__PURE__ */ __name((Entries) => {
              for (const [K, V] of Entries) {
                if (V !== void 0) Cache.set(K, V);
              }
            }, "__primeCache")
          };
          return State;
        })(),
        extensionMode: 1,
        extension: {
          id: ExtId,
          // Use the SAME `MakeUri()` helper as `context.extensionUri`
          // above. Plain-object URI stubs without `.with()` / `.toString()`
          // crash any extension that does:
          //   const scriptUri = context.extension.extensionUri.with({
          //       path: '/dist/extension.js'
          //   })
          // which is the standard pattern for resolving bundled assets
          // (Roo Code, Continue, Claude, every webview-based extension
          // does this on activate or first command invocation).
          extensionUri: MakeUri(ExtensionPath),
          extensionPath: ExtensionPath,
          isActive: true,
          packageJSON: FullPackageJSON,
          // 1 = UI, 2 = Workspace. Most desktop extensions ship as UI
          // kind so `vscode.extensions.getExtension(id).extensionKind`
          // returns the right value when extensions branch on it.
          extensionKind: 1,
          // `exports` is mutated by the host after `activate()` resolves
          // (see VS Code's `ExtensionHostManager`); set to `undefined`
          // now and the activation post-processing updates it once the
          // extension's `activate` function returns a value.
          exports: void 0,
          // Real `Extension.activate()` returns a Promise<T> that
          // resolves once the extension's main module has been loaded
          // and its `activate()` has been called. Code that checks
          // `extension.isActive` and then calls `extension.activate()`
          // (vscode-languageclient does this when re-launching a
          // language server after a config change) must observe the
          // promise settling. We're already active by construction at
          // the point this descriptor is built, so resolve immediately
          // with the current `exports` value.
          activate: /* @__PURE__ */ __name(async () => {
            return void 0;
          }, "activate")
        },
        languageModelAccessInformation: {
          canSendRequest: /* @__PURE__ */ __name((_Model) => false, "canSendRequest"),
          onDidChange: /* @__PURE__ */ __name((_Listener) => ({ dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") }), "onDidChange")
        }
      };
    }, "CreateExtensionContext");
    ActivateExtension = /* @__PURE__ */ __name(async (Context13, ExtensionId, ActivationEvent) => {
      if (Context13.ActivatedExtensions.has(ExtensionId)) return;
      Context13.ActivatedExtensions.add(ExtensionId);
      const StartMs = Date.now();
      CocoonDevLog2(
        "ext-activate",
        `[ExtActivate] start ext=${ExtensionId} event=${ActivationEvent}`
      );
      const Extension2 = Context13.ExtensionRegistry.get(ExtensionId);
      if (!Extension2) {
        CocoonDevLog2(
          "ext-activate",
          `[ExtActivate] skip-missing ext=${ExtensionId} (not in registry)`
        );
        return;
      }
      const LocationRaw = Extension2?.ExtensionLocation ?? Extension2?.extensionLocation ?? Extension2?.location?.path ?? Extension2?.location;
      const MainFile = Extension2?.main ?? Extension2?.Main;
      if (!LocationRaw || !MainFile) {
        return;
      }
      let ExtensionPath;
      try {
        ExtensionPath = new URL(String(LocationRaw)).pathname.replace(
          /\/$/,
          ""
        );
      } catch {
        ExtensionPath = String(LocationRaw).replace(/^file:\/\//, "").replace(/\/$/, "");
      }
      const ModulePath = `${ExtensionPath}/${MainFile}`;
      try {
        const { access } = await import("node:fs/promises");
        let Exists = false;
        let Resolved = ModulePath;
        for (const Candidate of [ModulePath, `${ModulePath}.js`]) {
          try {
            await access(Candidate);
            Exists = true;
            Resolved = Candidate;
            break;
          } catch {
          }
        }
        if (!Exists) {
          process.stdout.write(
            `[LandFix:Preflight] Skipping ${ExtensionId}: main file not found on disk (${ModulePath})
`
          );
          return;
        }
        if (process.env["Trace"]?.includes("preflight")) {
          process.stdout.write(
            `[LandFix:Preflight] ${ExtensionId}: resolved to ${Resolved}
`
          );
        }
      } catch (Err) {
        process.stdout.write(
          `[LandFix:Preflight] preflight disabled for ${ExtensionId}: ${Err instanceof Error ? Err.message : String(Err)}
`
        );
      }
      const ModuleType = Extension2?.type ?? Extension2?.Type;
      const IsESM = ModuleType === "module" || /\.mjs$/i.test(MainFile) || /\.mts$/i.test(MainFile);
      CocoonDevLog2(
        "ext-activate",
        `[ExtensionHostHandler] Loading ${ExtensionId} (${IsESM ? "ESM" : "CJS"}) from ${ModulePath}`
      );
      try {
        const Manifest = await (async () => {
          try {
            const { readFile } = await import("node:fs/promises");
            const Raw2 = await readFile(
              `${ExtensionPath}/package.json`,
              "utf8"
            );
            return JSON.parse(Raw2);
          } catch {
            return Extension2;
          }
        })();
        const ConfigState = globalThis.__cocoonConfigState;
        ConfigState?.PrePopulateFromManifest(Manifest);
      } catch {
      }
      try {
        let ExtModule;
        if (IsESM) {
          const ImportURL = ModulePath.startsWith("/") ? `file://${ModulePath}` : ModulePath;
          ExtModule = await import(ImportURL);
        } else {
          const { createRequire: createRequire3 } = await import("module");
          const Require = createRequire3(import.meta.url);
          try {
            ExtModule = Require(ModulePath);
          } catch (RequireErr) {
            const Msg = RequireErr instanceof Error ? RequireErr.message : String(RequireErr);
            if (/ERR_REQUIRE_ESM|Cannot use import statement/i.test(Msg)) {
              const ImportURL = ModulePath.startsWith("/") ? `file://${ModulePath}` : ModulePath;
              ExtModule = await import(ImportURL);
            } else {
              throw RequireErr;
            }
          }
        }
        const ActivateFn = typeof ExtModule?.activate === "function" ? ExtModule.activate : typeof ExtModule?.default?.activate === "function" ? ExtModule.default.activate : void 0;
        if (typeof ActivateFn === "function") {
          const ExtContext = CreateExtensionContext(
            Context13,
            Extension2,
            ExtensionPath
          );
          try {
            const PrimeStart = Date.now();
            const AllRaw = await Context13.MountainClient?.sendRequest(
              "storage:getItems",
              {}
            );
            const AllArray = Array.isArray(AllRaw) ? AllRaw : [];
            const WorkspacePrefix = `${ExtensionId}:workspace:`;
            const GlobalPrefix = `${ExtensionId}:global:`;
            const WorkspaceEntries = [];
            const GlobalEntries = [];
            for (const Pair of AllArray) {
              if (!Array.isArray(Pair) || Pair.length < 2) continue;
              const RawKey = String(Pair[0] ?? "");
              const RawValue = Pair[1];
              let Value = RawValue;
              if (typeof RawValue === "string") {
                try {
                  Value = JSON.parse(RawValue);
                } catch {
                }
              }
              if (RawKey.startsWith(WorkspacePrefix)) {
                WorkspaceEntries.push([
                  RawKey.slice(WorkspacePrefix.length),
                  Value
                ]);
              } else if (RawKey.startsWith(GlobalPrefix)) {
                GlobalEntries.push([
                  RawKey.slice(GlobalPrefix.length),
                  Value
                ]);
              }
            }
            const WorkspaceState = ExtContext?.workspaceState;
            const GlobalState = ExtContext?.globalState;
            WorkspaceState?.__primeCache?.(WorkspaceEntries);
            GlobalState?.__primeCache?.(GlobalEntries);
            if (process.env["Trace"]?.includes("ext-prime")) {
              process.stdout.write(
                `[LandFix:StoragePrime] ${ExtensionId} workspace=${WorkspaceEntries.length} global=${GlobalEntries.length} elapsed=${Date.now() - PrimeStart}ms
`
              );
            }
          } catch (PrimeErr) {
            if (process.env["Trace"]?.includes("ext-prime")) {
              process.stdout.write(
                `[LandFix:StoragePrime] ${ExtensionId} prime failed: ${PrimeErr instanceof Error ? PrimeErr.message : String(PrimeErr)}
`
              );
            }
          }
          const InstrumentedExtensions = [
            "vscode.git",
            "vscode.git-base",
            "vscode.npm",
            "vscode.gulp",
            "vscode.grunt",
            "vscode.jake",
            "vscode.merge-conflict"
          ];
          const SnapshotInitState = /* @__PURE__ */ __name((Phase) => {
            try {
              const InitWorkspace = Context13.ExtensionHostInitData?.workspace ?? Context13.ExtensionHostInitData?.workspaceData ?? {};
              const InitFolders = Array.isArray(InitWorkspace.folders) ? InitWorkspace.folders : [];
              const FolderShape = InitFolders.map((F, I) => {
                const UriField = F?.uri;
                const UriShape = typeof UriField === "string" ? `string("${UriField.slice(0, 80)}")` : typeof UriField === "object" && UriField !== null ? `object(scheme=${UriField.scheme ?? "<missing>"} fsPath=${typeof UriField.fsPath === "string" ? UriField.fsPath.slice(0, 80) : "<not-a-string>"})` : typeof UriField;
                return `[${I}] name=${F?.name ?? "?"} uri=${UriShape}`;
              }).join(" | ");
              const ConfigState = globalThis.__cocoonConfigState;
              const AutoDetect = ConfigState?.ConfigCache?.get?.(
                "git.autoRepositoryDetection"
              );
              const Enabled2 = ConfigState?.ConfigCache?.get?.("git.enabled");
              const AutoDetectShape = `${typeof AutoDetect}=${typeof AutoDetect === "object" ? JSON.stringify(AutoDetect).slice(0, 80) : String(AutoDetect)}`;
              CocoonDevLog2(
                "ext-preactivate",
                `[ExtensionHostHandler] ${Phase} ${ExtensionId} folders.length=${InitFolders.length} | git.enabled=${Enabled2} | git.autoRepositoryDetection=${AutoDetectShape} | ${FolderShape}`
              );
            } catch (Err) {
              CocoonDevLog2(
                "ext-preactivate",
                `[ExtensionHostHandler] ${Phase} ${ExtensionId} snapshot failed: ${Err?.message ?? String(Err)}`
              );
            }
          }, "SnapshotInitState");
          if (InstrumentedExtensions.includes(ExtensionId)) {
            SnapshotInitState("PRE-ACTIVATE");
          }
          const ExtActivateResult = await ActivateFn(ExtContext);
          const RegEntry = Context13.ExtensionRegistry.get(ExtensionId);
          if (RegEntry && ExtActivateResult !== void 0) {
            RegEntry.__exports = ExtActivateResult;
            RegEntry.exports = ExtActivateResult;
          }
          if (ExtActivateResult !== void 0 && ExtContext) {
            try {
              ExtContext.extension.exports = ExtActivateResult;
            } catch {
            }
          }
          process.stdout.write(
            `[ExtensionHostHandler] ${ExtensionId} activated (event: ${ActivationEvent})
`
          );
          if (InstrumentedExtensions.includes(ExtensionId)) {
            SnapshotInitState("POST-ACTIVATE");
            setTimeout(() => SnapshotInitState("DEFERRED-1S"), 1e3);
          }
          CocoonDevLog2(
            "ext-activate",
            `[ExtActivate] ok ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`
          );
        } else {
          CocoonDevLog2(
            "ext-activate",
            `[ExtensionHostHandler] ${ExtensionId} loaded but no activate() function found`
          );
          CocoonDevLog2(
            "ext-activate",
            `[ExtActivate] no-activate-fn ext=${ExtensionId} duration_ms=${Date.now() - StartMs}`
          );
        }
      } catch (Err) {
        Context13.ActivatedExtensions.delete(ExtensionId);
        const Message = Err instanceof Error ? Err.message : String(Err);
        CocoonDevLog2(
          "ext-activate",
          `[ExtActivate] fail ext=${ExtensionId} duration_ms=${Date.now() - StartMs} error=${Message.replace(/\n/g, " | ")}`
        );
        throw Err;
      }
    }, "ActivateExtension");
    ActivateExtension_default = ActivateExtension;
  }
});

// Source/Services/Handler/VscodeAPI/Stock/Lift.ts
import {
  isEmptyPattern as StockGlobIsEmpty,
  match as StockGlobMatch,
  parse as StockGlobParse
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/glob.js";
import {
  basename as StockBasename,
  dirname as StockDirname,
  extname as StockExtname,
  isEqualOrParent as StockIsEqualOrParent,
  joinPath as StockJoinPath,
  relativePath as StockRelativePath
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
function ToUri(Input) {
  if (Input == null) return void 0;
  if (Input instanceof URI) return Input;
  if (typeof Input === "string") {
    if (Input.length === 0) return void 0;
    try {
      if (Input.startsWith("file:") || Input.includes("://")) {
        return URI.parse(Input);
      }
      return URI.file(Input);
    } catch {
      return void 0;
    }
  }
  const WithScheme = Input;
  if (typeof WithScheme.scheme === "string") {
    try {
      return URI.from({
        scheme: WithScheme.scheme,
        authority: typeof WithScheme.authority === "string" ? WithScheme.authority : "",
        path: typeof WithScheme.path === "string" ? WithScheme.path : "",
        query: typeof WithScheme.query === "string" ? WithScheme.query : "",
        fragment: typeof WithScheme.fragment === "string" ? WithScheme.fragment : ""
      });
    } catch {
      return void 0;
    }
  }
  return void 0;
}
function RelativePath(From, To) {
  const FromUri = ToUri(From);
  const ToUriValue = ToUri(To);
  if (!FromUri || !ToUriValue) return void 0;
  return StockRelativePath(FromUri, ToUriValue);
}
function IsEqualOrParent(Resource, Candidate) {
  const R = ToUri(Resource);
  const C = ToUri(Candidate);
  if (!R || !C) return false;
  return StockIsEqualOrParent(R, C);
}
function Basename(Resource) {
  const U = ToUri(Resource);
  return U ? StockBasename(U) : "";
}
function Dirname(Resource) {
  const U = ToUri(Resource);
  return U ? StockDirname(U) : void 0;
}
function Extname(Resource) {
  const U = ToUri(Resource);
  return U ? StockExtname(U) : "";
}
function JoinPath(Resource, ...Parts) {
  const U = ToUri(Resource);
  return U ? StockJoinPath(U, ...Parts) : void 0;
}
function GlobMatch(Pattern, Path) {
  return StockGlobMatch(Pattern, Path);
}
function GlobParsePattern(Pattern) {
  return StockGlobParse(Pattern);
}
function GlobIsEmpty(Pattern) {
  return StockGlobIsEmpty(Pattern);
}
var init_Lift = __esm({
  "Source/Services/Handler/VscodeAPI/Stock/Lift.ts"() {
    "use strict";
    __name(ToUri, "ToUri");
    __name(RelativePath, "RelativePath");
    __name(IsEqualOrParent, "IsEqualOrParent");
    __name(Basename, "Basename");
    __name(Dirname, "Dirname");
    __name(Extname, "Extname");
    __name(JoinPath, "JoinPath");
    __name(GlobMatch, "GlobMatch");
    __name(GlobParsePattern, "GlobParsePattern");
    __name(GlobIsEmpty, "GlobIsEmpty");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Helpers.ts
var EventSubscriber, Call, DefaultExcludeSegments, ExtractGlobPattern, FolderToFsPath, ResolveWorkspaceFolders;
var init_Helpers = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Helpers.ts"() {
    "use strict";
    EventSubscriber = /* @__PURE__ */ __name((Context13, EventName) => (Listener) => {
      Context13.WorkspaceEventEmitter.on(EventName, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.WorkspaceEventEmitter.removeListener(
            EventName,
            Listener
          );
        }, "dispose")
      };
    }, "EventSubscriber");
    Call = /* @__PURE__ */ __name(async (Context13, Method, Parameters) => {
      try {
        return await Context13.MountainClient?.sendRequest(
          Method,
          Parameters
        );
      } catch {
        return void 0;
      }
    }, "Call");
    DefaultExcludeSegments = /* @__PURE__ */ new Set([
      ".git",
      "node_modules",
      ".astro",
      ".next",
      ".nuxt",
      ".cache",
      ".turbo",
      ".pnpm",
      "Target",
      "target",
      "dist",
      "out",
      "build",
      ".DS_Store"
    ]);
    ExtractGlobPattern = /* @__PURE__ */ __name((Raw2) => {
      if (typeof Raw2 === "string" && Raw2.length > 0) return Raw2;
      if (Raw2 && typeof Raw2 === "object") {
        const Obj = Raw2;
        if (typeof Obj["pattern"] === "string") return Obj["pattern"];
        if (typeof Obj["glob"] === "string") return Obj["glob"];
      }
      return void 0;
    }, "ExtractGlobPattern");
    FolderToFsPath = /* @__PURE__ */ __name((FolderUri) => {
      const Raw2 = typeof FolderUri === "string" ? FolderUri : FolderUri?.["fsPath"] ?? FolderUri?.["path"] ?? FolderUri?.["external"];
      if (typeof Raw2 !== "string" || Raw2.length === 0) return void 0;
      if (Raw2.startsWith("file:")) {
        try {
          return decodeURIComponent(new URL(Raw2).pathname);
        } catch {
          return Raw2.replace(/^file:\/\//, "");
        }
      }
      return Raw2;
    }, "FolderToFsPath");
    ResolveWorkspaceFolders = /* @__PURE__ */ __name((Context13) => {
      const InitWorkspace = Context13.ExtensionHostInitData?.workspace ?? Context13.ExtensionHostInitData?.workspaceData ?? {};
      return (InitWorkspace.folders ?? []).map(
        (Folder) => {
          const FsPath = FolderToFsPath(Folder?.uri);
          const Record = { ...Folder };
          if (typeof FsPath === "string") Record.FsPath = FsPath;
          return Record;
        }
      );
    }, "ResolveWorkspaceFolders");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Configuration.ts
var CreateConfigurationState, SynthesiseSubtree, BuildGetConfiguration, BuildOnDidChangeConfiguration;
var init_Configuration2 = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Configuration.ts"() {
    "use strict";
    init_Log();
    init_Helpers();
    CreateConfigurationState = /* @__PURE__ */ __name((Context13) => {
      const ConfigCache = /* @__PURE__ */ new Map();
      const ConfigInFlight = /* @__PURE__ */ new Set();
      const ConfigListeners = /* @__PURE__ */ new Set();
      const FireConfigChange = /* @__PURE__ */ __name((ChangedKey) => {
        if (ConfigListeners.size === 0) return;
        const Event = {
          affectsConfiguration: /* @__PURE__ */ __name((QueryKey) => ChangedKey === QueryKey || ChangedKey.startsWith(`${QueryKey}.`), "affectsConfiguration")
        };
        for (const Listener of ConfigListeners) {
          try {
            Listener(Event);
          } catch {
          }
        }
      }, "FireConfigChange");
      const PrimeConfig = /* @__PURE__ */ __name((Key) => {
        if (ConfigInFlight.has(Key)) return;
        ConfigInFlight.add(Key);
        void Call(
          Context13,
          "Configuration.Inspect",
          [Key]
        ).then((Value) => {
          ConfigInFlight.delete(Key);
          if (Value === void 0) return;
          const Shape = Value;
          const Resolved = Shape?.["effectiveValue"] ?? Shape?.["workspaceFolderValue"] ?? Shape?.["workspaceValue"] ?? Shape?.["userValue"] ?? Shape?.["globalValue"] ?? Shape?.["defaultValue"] ?? Value;
          const Prior = ConfigCache.get(Key);
          ConfigCache.set(Key, Resolved);
          if (Prior !== Resolved) FireConfigChange(Key);
        });
      }, "PrimeConfig");
      const PrePopulateFromManifest = /* @__PURE__ */ __name((PackageJSON) => {
        const Manifest = PackageJSON ?? {};
        const Contributed = Manifest.contributes?.configuration;
        if (!Contributed) return;
        const Sections = Array.isArray(Contributed) ? Contributed : [Contributed];
        let Seeded = 0;
        let Skipped = 0;
        let ExtensionId = "";
        const ManifestShape = PackageJSON ?? {};
        if (ManifestShape.publisher && ManifestShape.name) {
          ExtensionId = `${ManifestShape.publisher}.${ManifestShape.name}`;
        }
        for (const Section of Sections) {
          const Properties = Section?.properties;
          if (!Properties) continue;
          for (const [DottedKey, Declaration] of Object.entries(Properties)) {
            if (ConfigCache.has(DottedKey)) {
              Skipped++;
              continue;
            }
            if (Declaration !== null && typeof Declaration === "object" && "default" in Declaration) {
              ConfigCache.set(DottedKey, Declaration.default);
              Seeded++;
            }
          }
        }
        CocoonDevLog2(
          "config-prime",
          `[ConfigPrime] prepopulate ext=${ExtensionId || "<unknown>"} seeded=${Seeded} skipped=${Skipped}`
        );
      }, "PrePopulateFromManifest");
      Context13.Emitter.on("configurationChanged", (Payload) => {
        const Shape = Payload ?? {};
        const Keys = Array.isArray(Shape.keys) ? Shape.keys : Array.isArray(Shape.affected) ? Shape.affected : [];
        if (Keys.length === 0) {
          return;
        }
        if (Keys.length === 1 && Keys[0] === "*") {
          const CachedKeys = [...ConfigCache.keys()];
          ConfigCache.clear();
          for (const Key of CachedKeys) {
            PrimeConfig(Key);
          }
          return;
        }
        for (const Key of Keys) {
          ConfigCache.delete(Key);
          FireConfigChange(Key);
          PrimeConfig(Key);
        }
      });
      return {
        ConfigCache,
        ConfigInFlight,
        ConfigListeners,
        FireConfigChange,
        PrimeConfig,
        PrePopulateFromManifest
      };
    }, "CreateConfigurationState");
    SynthesiseSubtree = /* @__PURE__ */ __name((Cache, Full) => {
      const Prefix = `${Full}.`;
      const Subtree = {};
      let Matched = false;
      for (const [CachedKey, CachedValue] of Cache.entries()) {
        if (!CachedKey.startsWith(Prefix)) continue;
        Matched = true;
        const Local = CachedKey.slice(Prefix.length);
        const Parts = Local.split(".");
        let Current = Subtree;
        for (let I = 0; I < Parts.length - 1; I++) {
          const Segment = Parts[I];
          const Existing = Current[Segment];
          if (Existing === void 0 || Existing === null || typeof Existing !== "object") {
            Current[Segment] = {};
          }
          Current = Current[Segment];
        }
        Current[Parts[Parts.length - 1]] = CachedValue;
      }
      return Matched ? Subtree : void 0;
    }, "SynthesiseSubtree");
    BuildGetConfiguration = /* @__PURE__ */ __name((Context13, State) => (Section, Scope) => ({
      get: /* @__PURE__ */ __name((Key, DefaultValue) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        const LangId = typeof Scope?.languageId === "string" ? Scope.languageId : typeof Scope?.language === "string" ? Scope.language : void 0;
        if (LangId) {
          const LangFull = `[${LangId}].${Full}`;
          if (State.ConfigCache.has(LangFull)) {
            return State.ConfigCache.get(LangFull);
          }
          const LangSection = `[${LangId}].${Section ?? ""}`;
          const LangSubtree = SynthesiseSubtree(
            State.ConfigCache,
            LangSection
          );
          if (LangSubtree !== void 0) {
            const Parts = Key.split(".");
            let Cur = LangSubtree;
            for (const Part of Parts) {
              Cur = Cur?.[Part];
              if (Cur === void 0) {
                Cur = void 0;
                break;
              }
            }
            if (Cur !== void 0) return Cur;
          }
          if (!State.ConfigCache.has(Full)) {
            State.PrimeConfig(Full);
          }
        }
        if (State.ConfigCache.has(Full)) {
          const Cached = State.ConfigCache.get(Full);
          if (Cached === null || Cached === void 0) {
            const Subtree2 = SynthesiseSubtree(State.ConfigCache, Full);
            if (Subtree2 !== void 0) {
              CocoonDevLog2(
                "config-prime",
                `[ConfigPrime] synthesise key=${Full} source=null-shadowed`
              );
              return Subtree2;
            }
            return DefaultValue;
          }
          return Cached;
        }
        const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
        if (Subtree !== void 0) {
          CocoonDevLog2(
            "config-prime",
            `[ConfigPrime] synthesise key=${Full} source=miss`
          );
          return Subtree;
        }
        State.PrimeConfig(Full);
        return DefaultValue;
      }, "get"),
      update: /* @__PURE__ */ __name(async (Key, Value, Target) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        const TargetIndex = Target === 2 ? 1 : Target === true ? 0 : typeof Target === "number" ? Target : 0;
        await Call(Context13, "Configuration.Update", [
          Full,
          Value,
          TargetIndex
        ]);
        const Prior = State.ConfigCache.get(Full);
        State.ConfigCache.set(Full, Value);
        if (Prior !== Value) State.FireConfigChange(Full);
      }, "update"),
      has: /* @__PURE__ */ __name((Key) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        if (State.ConfigCache.has(Full)) return true;
        if (SynthesiseSubtree(State.ConfigCache, Full) !== void 0) {
          return true;
        }
        State.PrimeConfig(Full);
        return false;
      }, "has"),
      inspect: /* @__PURE__ */ __name((Key) => {
        const Full = Section ? `${Section}.${Key}` : Key;
        let Cached;
        if (State.ConfigCache.has(Full)) {
          Cached = State.ConfigCache.get(Full);
        } else {
          const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
          if (Subtree === void 0) {
            State.PrimeConfig(Full);
            return void 0;
          }
          Cached = Subtree;
        }
        return {
          key: Full,
          defaultValue: void 0,
          globalValue: Cached,
          workspaceValue: void 0,
          workspaceFolderValue: void 0,
          defaultLanguageValue: void 0,
          globalLanguageValue: void 0,
          workspaceLanguageValue: void 0,
          workspaceFolderLanguageValue: void 0,
          languageIds: []
        };
      }, "inspect")
    }), "BuildGetConfiguration");
    BuildOnDidChangeConfiguration = /* @__PURE__ */ __name((State) => (Listener, ThisArg, Disposables) => {
      const Bound = ThisArg === void 0 ? Listener : Listener.bind(ThisArg);
      State.ConfigListeners.add(Bound);
      const Subscription = {
        dispose: /* @__PURE__ */ __name(() => {
          State.ConfigListeners.delete(Bound);
        }, "dispose")
      };
      if (Disposables && typeof Disposables.push === "function") {
        Disposables.push(Subscription);
      }
      return Subscription;
    }, "BuildOnDidChangeConfiguration");
  }
});

// Source/Utility/Tier.ts
var Injected, Pick, Tier, Tier_default;
var init_Tier = __esm({
  "Source/Utility/Tier.ts"() {
    "use strict";
    init_Log2();
    Injected = globalThis.__LandTiers ?? {};
    Pick = /* @__PURE__ */ __name((Capability, Fallback) => {
      const FromInjected = Injected[Capability];
      if (typeof FromInjected === "string" && FromInjected.length > 0) {
        return FromInjected;
      }
      const FromEnvironment = process.env[`Tier${Capability}`];
      if (typeof FromEnvironment === "string" && FromEnvironment.length > 0) {
        return FromEnvironment;
      }
      return Fallback;
    }, "Pick");
    Tier = {
      RemoteProcedureCall: Pick(
        "RemoteProcedureCall",
        "gRPC"
      ),
      HTTPProxy: Pick("HTTPProxy", "HandRolled"),
      Logger: Pick("Logger", "Standard"),
      FileSystem: Pick("FileSystem", "Layer2"),
      FindFiles: Pick("FindFiles", "Layer3"),
      Glob: Pick("Glob", "JavaScript"),
      // Default Layer4 so `createFileSystemWatcher` forwards to Mountain's
      // native `notify`-crate implementation in `Environment/FileWatcherProvider.rs`.
      // Stub mode drops every watch registration, leaving every extension that
      // relies on file-change events (eslint, typescript, tailwind, most
      // language servers) blind to disk mutations. Override with
      // `TierFileWatcher=Stub` at launch to restore the old drop behaviour
      // for debugging.
      FileWatcher: Pick("FileWatcher", "Layer4"),
      SchemeAssets: Pick("SchemeAssets", "Embedded"),
      Configuration: Pick("Configuration", "Cache"),
      Diagnostics: Pick("Diagnostics", "Full"),
      Clipboard: Pick("Clipboard", "Layer3"),
      OpenExternal: Pick("OpenExternal", "Layer3"),
      DocumentMirror: Pick("DocumentMirror", "Full"),
      ExtensionActivation: Pick(
        "ExtensionActivation",
        "Parallel8"
      ),
      ExtensionScan: Pick("ExtensionScan", "Sequential"),
      ModuleCache: Pick("ModuleCache", "Simple"),
      Telemetry: Pick("Telemetry", "Synchronous"),
      // IPC routing: Mountain (default) → NodeDeferred → Node
      IPC: Pick("IPC", "Mountain"),
      // Per-subsystem routing (added 2026-05-25). Defaults match .env.Land
      // and `Mountain/build.rs::EmitTierDefaults`.
      Terminal: Pick("Terminal", "Mountain"),
      SCM: Pick("SCM", "Mountain"),
      Debug: Pick("Debug", "Mountain"),
      LanguageFeatures: Pick(
        "LanguageFeatures",
        "Mountain"
      ),
      Search: Pick("Search", "Mountain"),
      OutputChannel: Pick("OutputChannel", "Mountain"),
      NativeHost: Pick("NativeHost", "Mountain"),
      TreeView: Pick("TreeView", "Mountain"),
      Storage: Pick("Storage", "Mountain"),
      Model: Pick("Model", "Mountain"),
      Tasks: Pick("Tasks", "Node"),
      Auth: Pick("Auth", "Node"),
      Encryption: Pick("Encryption", "Mountain"),
      ExtensionHost: Pick("ExtensionHost", "Process"),
      WebSocket: Pick("WebSocket", "Disabled")
    };
    Log_default2.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);
    Tier_default = Tier;
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Providers.ts
var MakeProvider, BuildRegisterTextDocumentContentProvider, ClaimedFileSystemSchemes, BuildRegisterFileSystemProvider, BuildRegisterTaskProvider, BuildRegisterNotebookContentProvider, BuildRegisterNotebookSerializer, BuildRegisterRemoteAuthorityResolver, BuildRegisterResourceLabelFormatter;
var init_Providers = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Providers.ts"() {
    "use strict";
    init_Registry();
    MakeProvider = /* @__PURE__ */ __name((Context13, RegisterMethod, UnregisterMethod, _LegacyHandlePrefix, ExtraPayload, OnRegister, OnDispose) => (Key, _Provider, _Options) => {
      const Handle = NextProviderHandle();
      Context13.SendToMountain(RegisterMethod, {
        handle: Handle,
        ...ExtraPayload(Key)
      }).catch(() => {
      });
      OnRegister?.(Handle, Key, _Provider);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          OnDispose?.(Handle, Key);
          Context13.SendToMountain(UnregisterMethod, {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose")
      };
    }, "MakeProvider");
    BuildRegisterTextDocumentContentProvider = /* @__PURE__ */ __name((Context13) => MakeProvider(
      Context13,
      "register_text_document_content_provider",
      "unregister_text_document_content_provider",
      "textDocumentContent",
      (Scheme) => ({ scheme: Scheme, extensionId: "" }),
      (_Handle, Scheme, Provider) => {
        Context13.ExtensionRegistry.set(
          `__textDocumentContentProvider:${Scheme}`,
          Provider
        );
        if (Provider && typeof Provider.onDidChange === "function") {
          try {
            Provider.onDidChange((Uri) => {
              const UriStr = typeof Uri === "string" ? Uri : Uri?.toString?.() ?? "";
              if (!UriStr) return;
              const CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: /* @__PURE__ */ __name(() => ({
                  dispose: /* @__PURE__ */ __name(() => {
                  }, "dispose")
                }), "onCancellationRequested")
              };
              void Promise.resolve(
                Provider.provideTextDocumentContent?.(
                  Uri,
                  CancellationToken
                )
              ).then((Content) => {
                if (typeof Content === "string") {
                  Context13.DocumentContentCache?.set(
                    UriStr,
                    Content
                  );
                  Context13.WorkspaceEventEmitter?.emit(
                    "didChangeTextDocument",
                    {
                      document: {
                        uri: {
                          toString: /* @__PURE__ */ __name(() => UriStr, "toString"),
                          scheme: Scheme,
                          path: UriStr.slice(
                            Scheme.length + 1
                          )
                        },
                        fileName: UriStr,
                        languageId: "plaintext",
                        version: Date.now(),
                        isDirty: false,
                        getText: /* @__PURE__ */ __name(() => Content, "getText")
                      },
                      contentChanges: [
                        {
                          text: Content,
                          range: null,
                          rangeOffset: 0,
                          rangeLength: 0
                        }
                      ],
                      reason: void 0
                    }
                  );
                }
              }).catch(() => {
              });
            });
          } catch {
          }
        }
      },
      (_Handle, Scheme) => {
        Context13.ExtensionRegistry.delete(
          `__textDocumentContentProvider:${Scheme}`
        );
      }
    ), "BuildRegisterTextDocumentContentProvider");
    ClaimedFileSystemSchemes = /* @__PURE__ */ new Set();
    BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context13) => (Scheme, _Provider, Options) => {
      const Handle = NextProviderHandle();
      ClaimedFileSystemSchemes.add(Scheme);
      Context13.SendToMountain("register_file_system_provider", {
        handle: Handle,
        scheme: Scheme,
        isCaseSensitive: Options?.isCaseSensitive ?? true,
        isReadonly: Options?.isReadonly ?? false,
        extensionId: ""
      }).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          ClaimedFileSystemSchemes.delete(Scheme);
          Context13.SendToMountain("unregister_file_system_provider", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose")
      };
    }, "BuildRegisterFileSystemProvider");
    BuildRegisterTaskProvider = /* @__PURE__ */ __name((Context13) => MakeProvider(
      Context13,
      "register_task_provider",
      "unregister_task_provider",
      "taskProvider",
      (TaskType) => ({ taskType: TaskType, extensionId: "" }),
      (Handle, _TaskType, Provider) => {
        Context13.ExtensionRegistry.set(`__taskProvider:${Handle}`, Provider);
      },
      (Handle, _TaskType) => {
        Context13.ExtensionRegistry.delete(`__taskProvider:${Handle}`);
      }
    ), "BuildRegisterTaskProvider");
    BuildRegisterNotebookContentProvider = /* @__PURE__ */ __name((Context13) => MakeProvider(
      Context13,
      "register_notebook_content_provider",
      "unregister_notebook_content_provider",
      "notebookContent",
      (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
    ), "BuildRegisterNotebookContentProvider");
    BuildRegisterNotebookSerializer = /* @__PURE__ */ __name((Context13) => MakeProvider(
      Context13,
      "register_notebook_serializer",
      "unregister_notebook_serializer",
      "notebookSerializer",
      (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
    ), "BuildRegisterNotebookSerializer");
    BuildRegisterRemoteAuthorityResolver = /* @__PURE__ */ __name((Context13) => (AuthorityPrefix, _Resolver) => {
      Context13.SendToMountain("register_remote_authority_resolver", {
        authorityPrefix: AuthorityPrefix,
        extensionId: ""
      }).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.SendToMountain("unregister_remote_authority_resolver", {
            authorityPrefix: AuthorityPrefix
          }).catch(() => {
          });
        }, "dispose")
      };
    }, "BuildRegisterRemoteAuthorityResolver");
    BuildRegisterResourceLabelFormatter = /* @__PURE__ */ __name((Context13) => (Formatter) => {
      Context13.SendToMountain("register_resource_label_formatter", {
        formatter: Formatter
      }).catch(() => {
      });
      return { dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") };
    }, "BuildRegisterResourceLabelFormatter");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Route.ts
function ExtractScheme(Uri) {
  if (Uri && typeof Uri === "object") {
    const WithScheme = Uri;
    if (typeof WithScheme.scheme === "string" && WithScheme.scheme.length > 0) {
      return WithScheme.scheme;
    }
  }
  if (typeof Uri === "string") {
    const Colon = Uri.indexOf(":");
    if (Colon > 0 && Colon < 32) {
      const Scheme = Uri.slice(0, Colon);
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(Scheme)) {
        return Scheme.toLowerCase();
      }
    }
    return "file";
  }
  return "file";
}
function ExtractFsPath(Uri) {
  if (Uri && typeof Uri === "object") {
    const WithPath = Uri;
    if (typeof WithPath.fsPath === "string" && WithPath.fsPath.length > 0) {
      return WithPath.fsPath;
    }
    if (typeof WithPath.path === "string" && WithPath.path.length > 0) {
      return WithPath.path;
    }
  }
  if (typeof Uri === "string") {
    if (Uri.startsWith("file://")) {
      try {
        return decodeURIComponent(Uri.slice("file://".length));
      } catch {
        return Uri.slice("file://".length);
      }
    }
    if (Uri.startsWith("/")) return Uri;
  }
  return void 0;
}
function Route(Uri) {
  const Scheme = ExtractScheme(Uri);
  if (Tier_default.FileSystem === "Layer2") return "mountain";
  if (Scheme !== "file") return "mountain";
  if (ClaimedFileSystemSchemes.has("file")) return "mountain";
  if (Tier_default.FileSystem === "Layer4") {
    return ExtractFsPath(Uri) !== void 0 ? "native" : "mountain";
  }
  return ExtractFsPath(Uri) !== void 0 ? "native" : "mountain";
}
var init_Route = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Route.ts"() {
    "use strict";
    init_Tier();
    init_Providers();
    __name(ExtractScheme, "ExtractScheme");
    __name(ExtractFsPath, "ExtractFsPath");
    __name(Route, "Route");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Namespace.ts
import { promises as FsPromises } from "node:fs";
import { dirname as PathDirname } from "node:path";
var UriToString, FileType, LogRoute, ThrowFileNotFound, MetadataToStat, BuildFileSystemNamespace;
var init_Namespace3 = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Namespace.ts"() {
    "use strict";
    init_Lift();
    init_Helpers();
    init_Route();
    UriToString = /* @__PURE__ */ __name((Value) => {
      if (Value == null) return "";
      if (typeof Value === "string") {
        if (Value.startsWith("/")) return `file://${Value}`;
        return Value;
      }
      if (typeof Value === "object") {
        const WithToString = Value;
        if (typeof WithToString.toString === "function" && WithToString.toString !== Object.prototype.toString) {
          const Rendered = WithToString.toString();
          if (Rendered && Rendered !== "[object Object]") return Rendered;
        }
        const Hydrated = ToUri(Value);
        if (Hydrated) return Hydrated.toString();
        const WithParts = Value;
        if (typeof WithParts.scheme === "string") {
          const Scheme = WithParts.scheme;
          const Authority = typeof WithParts.authority === "string" ? WithParts.authority : "";
          const PathPart = typeof WithParts.path === "string" ? WithParts.path : "";
          const Query = typeof WithParts.query === "string" && WithParts.query.length > 0 ? `?${WithParts.query}` : "";
          const Fragment = typeof WithParts.fragment === "string" && WithParts.fragment.length > 0 ? `#${WithParts.fragment}` : "";
          return `${Scheme}://${Authority}${PathPart}${Query}${Fragment}`;
        }
        if (typeof WithParts.fsPath === "string") {
          return `file://${WithParts.fsPath}`;
        }
      }
      return String(Value);
    }, "UriToString");
    FileType = {
      Unknown: 0,
      File: 1,
      Directory: 2,
      SymbolicLink: 64
    };
    LogRoute = /* @__PURE__ */ __name((Operation, Uri, Decision) => {
      const Enabled2 = process.env["Trace"];
      if (!Enabled2 || !Enabled2.includes("fs-route")) return;
      process.stdout.write(
        `[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${UriToString(Uri)}
`
      );
    }, "LogRoute");
    ThrowFileNotFound = /* @__PURE__ */ __name((Uri) => {
      const Api = globalThis.__cocoonVscodeAPI;
      const FileNotFound = Api?.FileSystemError?.FileNotFound;
      if (typeof FileNotFound === "function") throw FileNotFound(Uri);
      const Synthetic = new Error(
        `EntryNotFound (FileSystemError): ${UriToString(Uri)}`
      );
      Synthetic.code = "FileNotFound";
      Synthetic.name = "FileSystemError";
      throw Synthetic;
    }, "ThrowFileNotFound");
    MetadataToStat = /* @__PURE__ */ __name((Metadata) => ({
      type: Metadata.isSymbolicLink() ? FileType.SymbolicLink : Metadata.isDirectory() ? FileType.Directory : FileType.File,
      size: Metadata.size,
      mtime: Math.floor(Metadata.mtimeMs),
      ctime: Math.floor(Metadata.ctimeMs)
    }), "MetadataToStat");
    BuildFileSystemNamespace = /* @__PURE__ */ __name((Context13) => ({
      stat: /* @__PURE__ */ __name(async (Uri) => {
        const Decision = Route(Uri);
        LogRoute("stat", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          try {
            const Metadata = await FsPromises.lstat(Path);
            return MetadataToStat(Metadata);
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
            throw Err;
          }
        }
        return await Call(Context13, "FileSystem.Stat", [
          UriToString(Uri)
        ]) ?? {
          type: FileType.File,
          size: 0,
          ctime: 0,
          mtime: 0
        };
      }, "stat"),
      readFile: /* @__PURE__ */ __name(async (Uri) => {
        const Decision = Route(Uri);
        LogRoute("readFile", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          try {
            return await FsPromises.readFile(Path);
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
            throw Err;
          }
        }
        const UriString = UriToString(Uri);
        try {
          const Raw2 = await Context13.MountainClient?.sendRequest(
            "FileSystem.ReadFile",
            [UriString]
          );
          if (Raw2 == null) return Buffer.alloc(0);
          if (Array.isArray(Raw2))
            return Buffer.from(Raw2);
          if (Raw2 instanceof Uint8Array) return Buffer.from(Raw2);
          return Buffer.from(String(Raw2), "utf8");
        } catch (Err) {
          const Message = Err instanceof Error ? Err.message : String(Err);
          const Code = Err?.code;
          const TraceFsRead = process.env["Trace"]?.includes("fs-read");
          if (Code === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
            Message
          )) {
            if (TraceFsRead) {
              process.stdout.write(
                `[LandFix:FsRead] 404 \u2192 FileNotFound for ${UriString}
`
              );
            }
            ThrowFileNotFound(Uri);
          }
          process.stdout.write(
            `[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}
`
          );
          throw Err;
        }
      }, "readFile"),
      writeFile: /* @__PURE__ */ __name(async (Uri, Content) => {
        const Decision = Route(Uri);
        LogRoute("writeFile", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          const Parent = PathDirname(Path);
          if (Parent && Parent !== Path) {
            await FsPromises.mkdir(Parent, { recursive: true }).catch(
              () => {
              }
            );
          }
          await FsPromises.writeFile(Path, Content);
          return;
        }
        const Bytes = Array.from(Content);
        await Call(Context13, "FileSystem.WriteFile", [
          UriToString(Uri),
          Bytes
        ]);
      }, "writeFile"),
      readDirectory: /* @__PURE__ */ __name(async (Uri) => {
        const Decision = Route(Uri);
        LogRoute("readDirectory", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          try {
            const Entries = await FsPromises.readdir(Path, {
              withFileTypes: true
            });
            return Entries.map((Entry) => {
              const Type = Entry.isSymbolicLink() ? FileType.SymbolicLink : Entry.isDirectory() ? FileType.Directory : FileType.File;
              return [Entry.name, Type];
            });
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
            throw Err;
          }
        }
        return await Call(
          Context13,
          "FileSystem.ReadDirectory",
          [UriToString(Uri)]
        ) ?? [];
      }, "readDirectory"),
      createDirectory: /* @__PURE__ */ __name(async (Uri) => {
        const Decision = Route(Uri);
        LogRoute("createDirectory", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          await FsPromises.mkdir(Path, { recursive: true });
          return;
        }
        await Call(Context13, "FileSystem.CreateDirectory", [
          UriToString(Uri)
        ]);
      }, "createDirectory"),
      delete: /* @__PURE__ */ __name(async (Uri, Options) => {
        const Decision = Route(Uri);
        LogRoute("delete", Uri, Decision);
        if (Decision === "native") {
          const Path = ExtractFsPath(Uri);
          try {
            await FsPromises.rm(Path, {
              recursive: Options?.recursive ?? false,
              force: false
            });
            return;
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Uri);
            throw Err;
          }
        }
        await Call(Context13, "FileSystem.Delete", [
          UriToString(Uri),
          Options?.recursive ?? false
        ]);
      }, "delete"),
      rename: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
        const SourceRoute = Route(Source);
        const TargetRoute = Route(Target);
        const Decision = SourceRoute === "native" && TargetRoute === "native" ? "native" : "mountain";
        LogRoute("rename", Source, Decision);
        if (Decision === "native") {
          const SourcePath = ExtractFsPath(Source);
          const TargetPath = ExtractFsPath(Target);
          try {
            await FsPromises.rename(SourcePath, TargetPath);
            return;
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
            throw Err;
          }
        }
        await Call(Context13, "FileSystem.Rename", [
          UriToString(Source),
          UriToString(Target)
        ]);
      }, "rename"),
      copy: /* @__PURE__ */ __name(async (Source, Target, _Options) => {
        const SourceRoute = Route(Source);
        const TargetRoute = Route(Target);
        const Decision = SourceRoute === "native" && TargetRoute === "native" ? "native" : "mountain";
        LogRoute("copy", Source, Decision);
        if (Decision === "native") {
          const SourcePath = ExtractFsPath(Source);
          const TargetPath = ExtractFsPath(Target);
          const Parent = PathDirname(TargetPath);
          if (Parent && Parent !== TargetPath) {
            await FsPromises.mkdir(Parent, { recursive: true }).catch(
              () => {
              }
            );
          }
          try {
            await FsPromises.copyFile(SourcePath, TargetPath);
            return;
          } catch (Err) {
            if (Err?.code === "ENOENT") ThrowFileNotFound(Source);
            throw Err;
          }
        }
        await Call(Context13, "FileSystem.Copy", [
          UriToString(Source),
          UriToString(Target)
        ]);
      }, "copy"),
      isWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
        if (Scheme === "file") return true;
        return true;
      }, "isWritableFileSystem")
    }), "BuildFileSystemNamespace");
  }
});

// Source/Utility/Glob/To/Regex.ts
var FindMatchingBrace, SplitTopLevelCommas, ExpandBraces, RegexEscape, PlainGlobToRegexSource, GlobToRegex, Regex_default;
var init_Regex = __esm({
  "Source/Utility/Glob/To/Regex.ts"() {
    "use strict";
    FindMatchingBrace = /* @__PURE__ */ __name((Input, Start, Open, Close) => {
      let Depth = 1;
      for (let I = Start + 1; I < Input.length; I++) {
        const Character = Input[I];
        if (Character === "\\") {
          I++;
          continue;
        }
        if (Character === Open) Depth++;
        else if (Character === Close) {
          Depth--;
          if (Depth === 0) return I;
        }
      }
      return -1;
    }, "FindMatchingBrace");
    SplitTopLevelCommas = /* @__PURE__ */ __name((Body) => {
      const Parts = [];
      let Depth = 0;
      let Start = 0;
      for (let I = 0; I < Body.length; I++) {
        const Character = Body[I];
        if (Character === "\\") {
          I++;
          continue;
        }
        if (Character === "{" || Character === "(") Depth++;
        else if (Character === "}" || Character === ")") Depth--;
        else if (Character === "," && Depth === 0) {
          Parts.push(Body.slice(Start, I));
          Start = I + 1;
        }
      }
      Parts.push(Body.slice(Start));
      return Parts;
    }, "SplitTopLevelCommas");
    ExpandBraces = /* @__PURE__ */ __name((Input) => {
      const Open = Input.indexOf("{");
      if (Open === -1) return [Input];
      const Close = FindMatchingBrace(Input, Open, "{", "}");
      if (Close === -1) return [Input];
      const Prefix = Input.slice(0, Open);
      const Body = Input.slice(Open + 1, Close);
      const Suffix = Input.slice(Close + 1);
      const RangeMatch = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(Body);
      const Alternatives = [];
      if (RangeMatch) {
        const Start = parseInt(RangeMatch[1], 10);
        const End = parseInt(RangeMatch[2], 10);
        const StepRaw = RangeMatch[3];
        const Step = StepRaw ? Math.abs(parseInt(StepRaw, 10)) : 1;
        if (Step > 0 && Number.isFinite(Start) && Number.isFinite(End)) {
          const Width = RangeMatch[1].startsWith("0") || RangeMatch[2].startsWith("0") ? Math.max(RangeMatch[1].length, RangeMatch[2].length) : 0;
          const Direction = Start <= End ? 1 : -1;
          for (let Value = Start; Direction === 1 ? Value <= End : Value >= End; Value += Direction * Step) {
            const Text = String(Math.abs(Value));
            const Padded = Width > 0 && Text.length < Width ? "0".repeat(Width - Text.length) + Text : Text;
            Alternatives.push(Value < 0 ? `-${Padded}` : Padded);
          }
        }
      }
      if (Alternatives.length === 0) {
        Alternatives.push(...SplitTopLevelCommas(Body));
      }
      const Expanded = [];
      for (const Alternative of Alternatives) {
        for (const Sub of ExpandBraces(Alternative)) {
          for (const Tail of ExpandBraces(Suffix)) {
            Expanded.push(`${Prefix}${Sub}${Tail}`);
          }
        }
      }
      return Expanded;
    }, "ExpandBraces");
    RegexEscape = /* @__PURE__ */ __name((Character) => /[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character, "RegexEscape");
    PlainGlobToRegexSource = /* @__PURE__ */ __name((Glob) => {
      let Expression = "";
      let I = 0;
      while (I < Glob.length) {
        const Character = Glob[I];
        const Next = Glob[I + 1];
        if (Character === "*" && Next === "*") {
          Expression += ".*";
          I += 2;
          if (Glob[I] === "/") I++;
          continue;
        }
        if ((Character === "?" || Character === "*" || Character === "+" || Character === "@" || Character === "!") && Next === "(") {
          const CloseAt = FindMatchingBrace(Glob, I + 1, "(", ")");
          if (CloseAt !== -1) {
            const Inside = Glob.slice(I + 2, CloseAt);
            const Alternatives = SplitTopLevelCommas(
              Inside.replace(/\|/g, ",")
            ).map((Alternative) => PlainGlobToRegexSource(Alternative));
            const Joined = Alternatives.join("|");
            switch (Character) {
              case "?":
                Expression += `(?:${Joined})?`;
                break;
              case "*":
                Expression += `(?:${Joined})*`;
                break;
              case "+":
                Expression += `(?:${Joined})+`;
                break;
              case "@":
                Expression += `(?:${Joined})`;
                break;
              case "!":
                Expression += `(?:(?!(?:${Joined})(?:/|$))[^/])+`;
                break;
            }
            I = CloseAt + 1;
            continue;
          }
        }
        if (Character === "*") {
          Expression += "[^/]*";
          I++;
          continue;
        }
        if (Character === "?") {
          Expression += "[^/]";
          I++;
          continue;
        }
        if (Character === "[") {
          const CloseAt = Glob.indexOf("]", I + 1);
          if (CloseAt !== -1) {
            let Class = Glob.slice(I + 1, CloseAt);
            if (Class.startsWith("!")) Class = `^${Class.slice(1)}`;
            Expression += `[${Class}]`;
            I = CloseAt + 1;
            continue;
          }
        }
        if (Character === "\\" && Next !== void 0) {
          Expression += RegexEscape(Next);
          I += 2;
          continue;
        }
        Expression += RegexEscape(Character);
        I++;
      }
      return Expression;
    }, "PlainGlobToRegexSource");
    GlobToRegex = /* @__PURE__ */ __name((Glob) => {
      const Variants = ExpandBraces(Glob);
      const Source = Variants.length === 1 ? PlainGlobToRegexSource(Variants[0]) : `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;
      return new RegExp(`^${Source}$`);
    }, "GlobToRegex");
    Regex_default = GlobToRegex;
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Watcher.ts
var CreateFileSystemWatcher;
var init_Watcher = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Watcher.ts"() {
    "use strict";
    init_Regex();
    init_Tier();
    init_Registry();
    init_Helpers();
    CreateFileSystemWatcher = /* @__PURE__ */ __name((Context13, Pattern, IgnoreCreateEvents, IgnoreChangeEvents, IgnoreDeleteEvents) => {
      const StubDisposable = { dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") };
      const StubWatcher = {
        ignoreCreateEvents: IgnoreCreateEvents === true,
        ignoreChangeEvents: IgnoreChangeEvents === true,
        ignoreDeleteEvents: IgnoreDeleteEvents === true,
        onDidCreate: /* @__PURE__ */ __name(() => StubDisposable, "onDidCreate"),
        onDidChange: /* @__PURE__ */ __name(() => StubDisposable, "onDidChange"),
        onDidDelete: /* @__PURE__ */ __name(() => StubDisposable, "onDidDelete"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      };
      if (Tier_default.FileWatcher !== "Layer4") {
        return StubWatcher;
      }
      const PatternString = ExtractGlobPattern(Pattern);
      if (!PatternString) {
        return StubWatcher;
      }
      const Matcher = Regex_default(PatternString);
      const Folders = ResolveWorkspaceFolders(Context13);
      const Root = Pattern?.baseUri?.fsPath ?? Pattern?.base ?? Folders[0]?.FsPath;
      if (!Root) {
        return StubWatcher;
      }
      const Handle = NextProviderHandle();
      const IsRecursive = PatternString.includes("**");
      Context13.MountainClient?.sendRequest("FileWatcher.Register", [
        Handle,
        Root,
        IsRecursive,
        PatternString
      ]).catch(() => {
      });
      const EventName = `fileWatcher:${Handle}`;
      const MakeSubscriber = /* @__PURE__ */ __name((Kind, Ignore) => (Listener) => {
        if (Ignore) return StubDisposable;
        const WrappedListener = /* @__PURE__ */ __name((Event) => {
          if (Event.kind !== Kind) return;
          if (!Matcher.test(Event.path)) return;
          try {
            Listener({
              scheme: "file",
              path: Event.path,
              fsPath: Event.path,
              toString: /* @__PURE__ */ __name(() => `file://${Event.path}`, "toString")
            });
          } catch {
          }
        }, "WrappedListener");
        Context13.Emitter.on(EventName, WrappedListener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Context13.Emitter.removeListener(EventName, WrappedListener);
          }, "dispose")
        };
      }, "MakeSubscriber");
      return {
        ignoreCreateEvents: IgnoreCreateEvents === true,
        ignoreChangeEvents: IgnoreChangeEvents === true,
        ignoreDeleteEvents: IgnoreDeleteEvents === true,
        onDidCreate: MakeSubscriber("create", IgnoreCreateEvents === true),
        onDidChange: MakeSubscriber("change", IgnoreChangeEvents === true),
        onDidDelete: MakeSubscriber("delete", IgnoreDeleteEvents === true),
        dispose: /* @__PURE__ */ __name(() => {
          Context13.Emitter.removeAllListeners(EventName);
          Context13.MountainClient?.sendRequest("FileWatcher.Unregister", [
            Handle
          ]).catch(() => {
          });
        }, "dispose")
      };
    }, "CreateFileSystemWatcher");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Files.ts
function CompileGlob(Pattern) {
  try {
    const Parsed = GlobParsePattern(Pattern);
    if (typeof Parsed === "function") return Parsed;
  } catch {
  }
  try {
    const Regex = Regex_default(Pattern);
    return (Path) => Regex.test(Path);
  } catch {
    return void 0;
  }
}
var FindFilesLocal;
var init_Files = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Files.ts"() {
    "use strict";
    init_Regex();
    init_Lift();
    init_Helpers();
    __name(CompileGlob, "CompileGlob");
    FindFilesLocal = /* @__PURE__ */ __name(async (_Context, Folders, Include, Exclude, MaxResults) => {
      const IncludePattern = ExtractGlobPattern(Include);
      const ExcludePattern = ExtractGlobPattern(Exclude);
      const Cap = typeof MaxResults === "number" && MaxResults > 0 ? MaxResults : 1e4;
      if (process.env["Trace"]?.includes("wsns"))
        process.stdout.write(
          `[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}
`
        );
      if (!IncludePattern) {
        if (process.env["Trace"]?.includes("wsns"))
          process.stdout.write(
            "[LandFix:WsNs] findFiles: no include pattern \u2192 []\n"
          );
        return [];
      }
      const IncludeMatcher = CompileGlob(IncludePattern);
      if (!IncludeMatcher) {
        if (process.env["Trace"]?.includes("wsns"))
          process.stdout.write(
            `[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern} (both stock + fallback)
`
          );
        return [];
      }
      const ExcludeMatcher = ExcludePattern ? CompileGlob(ExcludePattern) : void 0;
      const { readdir } = await import("node:fs/promises");
      const { join, relative, sep } = await import("node:path");
      const Results = [];
      const MaxDepth = 32;
      const DeadlineAt = Date.now() + 3e4;
      let Truncated = "";
      const Walk = /* @__PURE__ */ __name(async (Root, Current, Depth) => {
        if (Results.length >= Cap) {
          Truncated = "cap";
          return;
        }
        if (Depth > MaxDepth) {
          Truncated = Truncated || "depth";
          return;
        }
        if (Date.now() > DeadlineAt) {
          Truncated = Truncated || "deadline";
          return;
        }
        let Entries;
        try {
          Entries = await readdir(Current, {
            withFileTypes: true
          });
        } catch {
          return;
        }
        const SubDirectories = [];
        for (const Entry of Entries) {
          if (Results.length >= Cap) {
            Truncated = "cap";
            return;
          }
          const Name = Entry.name;
          if (DefaultExcludeSegments.has(Name)) continue;
          if (typeof Entry.isSymbolicLink === "function" && Entry.isSymbolicLink())
            continue;
          const Full = join(Current, Name);
          const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
          if (Entry.isDirectory()) {
            SubDirectories.push(Full);
            continue;
          }
          if (ExcludeMatcher && ExcludeMatcher(RelativeFromRoot)) continue;
          if (!IncludeMatcher(RelativeFromRoot)) continue;
          Results.push(URI.file(Full));
        }
        const Concurrency = 4;
        for (let Index = 0; Index < SubDirectories.length; Index += Concurrency) {
          const Batch = SubDirectories.slice(Index, Index + Concurrency);
          await Promise.all(Batch.map((Sub) => Walk(Root, Sub, Depth + 1)));
          if (Results.length >= Cap) {
            Truncated = "cap";
            return;
          }
          if (Date.now() > DeadlineAt) {
            Truncated = Truncated || "deadline";
            return;
          }
        }
      }, "Walk");
      for (const Folder of Folders) {
        const FsPath = FolderToFsPath(Folder?.uri);
        if (!FsPath) {
          if (process.env["Trace"]?.includes("wsns"))
            process.stdout.write(
              `[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})
`
            );
          continue;
        }
        await Walk(FsPath, FsPath, 0);
      }
      if (Truncated) {
        if (process.env["Trace"]?.includes("wsns"))
          process.stdout.write(
            `[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)
`
          );
      }
      if (process.env["Trace"]?.includes("wsns"))
        process.stdout.write(
          `[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}
`
        );
      return Results;
    }, "FindFilesLocal");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Text/In/Files/Fallback.ts
import { promises as FsPromises2 } from "node:fs";
async function FindTextInFilesNodeFallback(Context13, Folders, Query, Options, Callback) {
  const Pattern = ExtractPattern(Query);
  if (!Pattern) return { limitHit: false };
  const Opts = Options ?? {};
  const Max = typeof Opts.maxResults === "number" ? Opts.maxResults : 1e4;
  const Encoding = Opts.encoding ?? "utf8";
  const Candidates = await FindFilesLocal(
    Context13,
    Folders,
    Opts.include ?? "**/*",
    Opts.exclude,
    // Don't let the file-enumeration phase cap us below the match cap.
    Math.max(Max * 4, 1e4)
  );
  let Emitted = 0;
  for (const Candidate of Candidates) {
    if (Emitted >= Max) return { limitHit: true };
    const Path = ToFsPath(Candidate);
    if (!Path) continue;
    let Content;
    try {
      Content = await FsPromises2.readFile(Path, Encoding);
    } catch {
      continue;
    }
    if (Content.length > 0 && Content.indexOf("\0") !== -1) continue;
    const Lines = Content.split("\n");
    for (let LineNumber = 0; LineNumber < Lines.length; LineNumber++) {
      const Line = Lines[LineNumber];
      Pattern.lastIndex = 0;
      const Ranges = [];
      let M;
      while ((M = Pattern.exec(Line)) !== null) {
        Ranges.push({
          start: { line: LineNumber, character: M.index },
          end: {
            line: LineNumber,
            character: M.index + M[0].length
          }
        });
        if (M[0].length === 0) Pattern.lastIndex++;
      }
      if (Ranges.length === 0) continue;
      const Match = {
        uri: Candidate,
        ranges: Ranges,
        preview: {
          text: Line,
          matches: Ranges.map((R) => ({
            start: { line: 0, character: R.start.character },
            end: { line: 0, character: R.end.character }
          }))
        }
      };
      if (Callback) {
        try {
          Callback(Match);
        } catch {
        }
      }
      Emitted += Ranges.length;
      if (Emitted >= Max) return { limitHit: true };
    }
  }
  return { limitHit: false };
}
var ExtractPattern, ToFsPath;
var init_Fallback = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Text/In/Files/Fallback.ts"() {
    "use strict";
    init_Files();
    ExtractPattern = /* @__PURE__ */ __name((Query) => {
      if (Query == null) return void 0;
      const Q = typeof Query === "string" ? { pattern: Query } : Query;
      if (!Q.pattern) return void 0;
      const Flags = `gm${Q.isCaseSensitive ? "" : "i"}`;
      let Source = Q.pattern;
      if (!Q.isRegExp) {
        Source = Source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      if (Q.isWordMatch) {
        Source = `\\b${Source}\\b`;
      }
      try {
        return new RegExp(Source, Flags);
      } catch {
        return void 0;
      }
    }, "ExtractPattern");
    ToFsPath = /* @__PURE__ */ __name((Uri) => {
      if (Uri == null) return void 0;
      if (typeof Uri === "string") {
        return Uri.startsWith("file://") ? Uri.slice("file://".length) : Uri;
      }
      const U = Uri;
      return U.fsPath ?? U.path;
    }, "ToFsPath");
    __name(FindTextInFilesNodeFallback, "FindTextInFilesNodeFallback");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Language/Activation.ts
function ResolveLanguageIdFromRegistry(Context13, FileExtension) {
  const ExtensionWithDot = `.${FileExtension}`;
  for (const Description of Context13.ExtensionRegistry.values()) {
    const Contributes = Description?.contributes;
    const Languages = Contributes?.languages;
    if (!Languages) continue;
    for (const Language of Languages) {
      if (!Language?.id) continue;
      if (Language.extensions?.includes(ExtensionWithDot)) {
        return Language.id;
      }
    }
  }
  return void 0;
}
function DeriveLanguageIdFromUri(UriString) {
  if (!UriString) return "plaintext";
  let Path = UriString;
  const SchemeEnd = Path.indexOf("://");
  if (SchemeEnd !== -1) Path = Path.slice(SchemeEnd + 3);
  const QueryStart = Path.indexOf("?");
  if (QueryStart !== -1) Path = Path.slice(0, QueryStart);
  const HashStart = Path.indexOf("#");
  if (HashStart !== -1) Path = Path.slice(0, HashStart);
  const LastSlash = Math.max(Path.lastIndexOf("/"), Path.lastIndexOf("\\"));
  const FileName = LastSlash === -1 ? Path : Path.slice(LastSlash + 1);
  const Lower = FileName.toLowerCase();
  switch (Lower) {
    case "dockerfile":
    case "dockerfile.dev":
    case "dockerfile.prod":
      return "dockerfile";
    case "makefile":
    case "gnumakefile":
      return "makefile";
    case "cmakelists.txt":
      return "cmake";
    case ".gitignore":
    case ".dockerignore":
      return "ignore";
    case ".gitattributes":
      return "properties";
  }
  const Dot = FileName.lastIndexOf(".");
  if (Dot === -1 || Dot === FileName.length - 1) return "plaintext";
  const Extension2 = FileName.slice(Dot + 1).toLowerCase();
  return STATIC_EXTENSION_TO_LANGUAGE[Extension2] ?? "plaintext";
}
function FireOnLanguageActivation(Context13, LanguageId) {
  if (!LanguageId || LanguageId === "plaintext") return;
  if (FiredLanguages.has(LanguageId)) return;
  FiredLanguages.add(LanguageId);
  const Event = `onLanguage:${LanguageId}`;
  const Router = Context13.ActivateByEvent;
  if (typeof Router === "function") {
    Router(Event).catch((Error2) => {
      const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
      CocoonDevLog2(
        "language-activation",
        `[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`
      );
    });
    return;
  }
  const Matching = Context13.ActivationEventIndex?.get(Event) ?? [];
  if (Matching.length > 0) {
    CocoonDevLog2(
      "language-activation",
      `[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
var STATIC_EXTENSION_TO_LANGUAGE, FiredLanguages;
var init_Activation = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Language/Activation.ts"() {
    "use strict";
    init_Log();
    STATIC_EXTENSION_TO_LANGUAGE = {
      // Web / script
      ts: "typescript",
      tsx: "typescriptreact",
      mts: "typescript",
      cts: "typescript",
      js: "javascript",
      jsx: "javascriptreact",
      mjs: "javascript",
      cjs: "javascript",
      json: "json",
      jsonc: "jsonc",
      "json5": "json",
      // Markup / styles
      html: "html",
      htm: "html",
      xml: "xml",
      xhtml: "xml",
      svg: "xml",
      css: "css",
      scss: "scss",
      sass: "scss",
      less: "less",
      md: "markdown",
      markdown: "markdown",
      mdx: "mdx",
      // Systems
      rs: "rust",
      go: "go",
      c: "c",
      h: "c",
      hh: "cpp",
      hpp: "cpp",
      hxx: "cpp",
      cc: "cpp",
      cpp: "cpp",
      cxx: "cpp",
      cs: "csharp",
      // Scripting
      py: "python",
      pyi: "python",
      rb: "ruby",
      php: "php",
      lua: "lua",
      swift: "swift",
      kt: "kotlin",
      kts: "kotlin",
      java: "java",
      scala: "scala",
      // Shell / ops
      sh: "shellscript",
      bash: "shellscript",
      zsh: "shellscript",
      fish: "shellscript",
      ps1: "powershell",
      dockerfile: "dockerfile",
      // Data / config
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      ini: "ini",
      properties: "properties",
      // Frontend frameworks
      svelte: "svelte",
      vue: "vue",
      astro: "astro",
      // Others
      sql: "sql",
      graphql: "graphql",
      gql: "graphql",
      proto: "proto3",
      tex: "latex",
      r: "r",
      dart: "dart"
    };
    __name(ResolveLanguageIdFromRegistry, "ResolveLanguageIdFromRegistry");
    __name(DeriveLanguageIdFromUri, "DeriveLanguageIdFromUri");
    FiredLanguages = /* @__PURE__ */ new Set();
    __name(FireOnLanguageActivation, "FireOnLanguageActivation");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Text/Document.ts
import { promises as FsPromises3 } from "node:fs";
var BuildOpenTextDocument, BuildSaveAll, BuildApplyEdit, BuildUpdateWorkspaceFolders, BuildDocumentEventMembers;
var init_Document = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Text/Document.ts"() {
    "use strict";
    init_Route();
    init_Helpers();
    init_Activation();
    BuildOpenTextDocument = /* @__PURE__ */ __name((Context13) => async (UriOrPath) => {
      if (UriOrPath && typeof UriOrPath === "object" && !UriOrPath.scheme && !UriOrPath.path && !UriOrPath.fsPath && (typeof UriOrPath.language === "string" || typeof UriOrPath.content === "string")) {
        const InlineContent = typeof UriOrPath.content === "string" ? UriOrPath.content : "";
        const InlineLang = typeof UriOrPath.language === "string" ? UriOrPath.language : "plaintext";
        const UntitledKey = `untitled:Untitled-${Date.now()}`;
        Context13.DocumentContentCache.set(UntitledKey, InlineContent);
        if (!Array.isArray(Context13.__textDocuments))
          Context13.__textDocuments = [];
        const UriShape = {
          toString: /* @__PURE__ */ __name(() => UntitledKey, "toString"),
          fsPath: "",
          scheme: "untitled",
          path: UntitledKey.slice("untitled:".length),
          external: UntitledKey
        };
        const Lines2 = InlineContent.split("\n");
        const LineStarts2 = [0];
        for (let I = 0; I < InlineContent.length; I++) {
          if (InlineContent.charCodeAt(I) === 10) LineStarts2.push(I + 1);
        }
        const PositionAt2 = /* @__PURE__ */ __name((Off) => {
          let Lo = 0, Hi = LineStarts2.length - 1;
          while (Lo < Hi) {
            const Mid = Lo + Hi + 1 >>> 1;
            if (LineStarts2[Mid] <= Off) Lo = Mid;
            else Hi = Mid - 1;
          }
          return { line: Lo, character: Off - LineStarts2[Lo] };
        }, "PositionAt");
        const OffsetAt2 = /* @__PURE__ */ __name((P) => {
          const L = Math.max(0, Math.min(P?.line ?? 0, Lines2.length - 1));
          return Math.max(0, (LineStarts2[L] ?? 0) + (P?.character ?? 0));
        }, "OffsetAt");
        const Doc = {
          uri: UriShape,
          fileName: UntitledKey,
          languageId: InlineLang,
          isDirty: false,
          isClosed: false,
          isUntitled: true,
          version: 1,
          eol: 1,
          lineCount: Lines2.length,
          getText: /* @__PURE__ */ __name(() => InlineContent, "getText"),
          positionAt: PositionAt2,
          offsetAt: OffsetAt2,
          lineAt: /* @__PURE__ */ __name((N) => {
            const Ln = typeof N === "number" ? N : N?.line ?? 0;
            const T = Lines2[Ln] ?? "";
            return {
              lineNumber: Ln,
              text: T,
              range: {
                start: { line: Ln, character: 0 },
                end: { line: Ln, character: T.length }
              },
              firstNonWhitespaceCharacterIndex: T.search(/\S/) < 0 ? T.length : T.search(/\S/),
              isEmptyOrWhitespace: T.trim().length === 0
            };
          }, "lineAt"),
          getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
          validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
          validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
          save: /* @__PURE__ */ __name(async () => false, "save")
        };
        Context13.__textDocuments.push(Doc);
        setImmediate(() => {
          try {
            Context13.WorkspaceEventEmitter?.emit(
              "didOpenTextDocument",
              Doc
            );
          } catch {
          }
        });
        return Doc;
      }
      const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
      if (UriString.startsWith("untitled:") || UriString === "") {
        const Content = Context13.DocumentContentCache.get(UriString) ?? "";
        const ULines = Content.split("\n");
        const UntitledLang = DeriveLanguageIdFromUri(UriString);
        return {
          uri: UriOrPath ?? {
            toString: /* @__PURE__ */ __name(() => UriString, "toString"),
            scheme: "untitled",
            path: UriString.slice("untitled:".length)
          },
          fileName: UriString,
          languageId: UntitledLang,
          isDirty: false,
          isClosed: false,
          isUntitled: true,
          version: 1,
          eol: 1,
          lineCount: ULines.length,
          getText: /* @__PURE__ */ __name(() => Content, "getText"),
          positionAt: /* @__PURE__ */ __name((Off) => {
            let Rem = Off;
            for (let I = 0; I < ULines.length; I++) {
              const L = ULines[I].length + 1;
              if (Rem < L) return { line: I, character: Rem };
              Rem -= L;
            }
            return {
              line: ULines.length - 1,
              character: ULines[ULines.length - 1]?.length ?? 0
            };
          }, "positionAt"),
          offsetAt: /* @__PURE__ */ __name((P) => {
            let O = 0;
            for (let I = 0; I < (P?.line ?? 0); I++)
              O += (ULines[I]?.length ?? 0) + 1;
            return O + (P?.character ?? 0);
          }, "offsetAt"),
          lineAt: /* @__PURE__ */ __name((N) => {
            const Ln = typeof N === "number" ? N : N?.line ?? 0;
            const T = ULines[Ln] ?? "";
            return {
              lineNumber: Ln,
              text: T,
              range: {
                start: { line: Ln, character: 0 },
                end: { line: Ln, character: T.length }
              },
              firstNonWhitespaceCharacterIndex: T.search(/\S/) < 0 ? T.length : T.search(/\S/),
              isEmptyOrWhitespace: T.trim().length === 0
            };
          }, "lineAt"),
          getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
          validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
          validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
          save: /* @__PURE__ */ __name(async () => false, "save")
        };
      }
      const Cached = Context13.DocumentContentCache.get(UriString);
      let Text;
      if (Cached !== void 0) {
        Text = Cached;
      } else {
        const DecodeRaw = /* @__PURE__ */ __name((Raw2) => {
          if (typeof Raw2 === "string") return Raw2;
          if (Array.isArray(Raw2)) {
            return Buffer.from(Raw2).toString("utf8");
          }
          if (Raw2 instanceof Uint8Array) {
            return Buffer.from(Raw2).toString("utf8");
          }
          if (Raw2 && typeof Raw2 === "object") {
            const Maybe = Raw2.content;
            if (Array.isArray(Maybe)) {
              return Buffer.from(Maybe).toString("utf8");
            }
            if (Maybe instanceof Uint8Array) {
              return Buffer.from(Maybe).toString("utf8");
            }
            if (typeof Maybe === "string") return Maybe;
          }
          return Raw2 == null ? "" : String(Raw2);
        }, "DecodeRaw");
        const Scheme = (() => {
          if (typeof UriOrPath === "object" && UriOrPath?.scheme)
            return String(UriOrPath.scheme);
          if (typeof UriString === "string") {
            const C = UriString.indexOf(":");
            if (C > 0 && C < 32) return UriString.slice(0, C);
          }
          return "file";
        })();
        if (Scheme !== "file") {
          const Provider = Context13.ExtensionRegistry?.get(
            `__textDocumentContentProvider:${Scheme}`
          );
          if (Provider && typeof Provider.provideTextDocumentContent === "function") {
            const CancellationToken = {
              isCancellationRequested: false,
              onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
              }, "dispose") }), "onCancellationRequested")
            };
            let ProviderUri = UriOrPath;
            try {
              const API = globalThis.__cocoonVscodeAPI;
              if (API?.Uri && UriString)
                ProviderUri = API.Uri.parse(UriString);
            } catch {
            }
            try {
              const Content = await Provider.provideTextDocumentContent(
                ProviderUri,
                CancellationToken
              );
              Text = typeof Content === "string" ? Content : Content ?? "";
            } catch {
              Text = "";
            }
            if (Text !== void 0) {
              Context13.DocumentContentCache.set(UriString, Text);
            } else {
              Text = "";
            }
          }
        }
        const Decision = Route(UriOrPath);
        if (Text === void 0) {
          if (Decision === "native") {
            const Path = ExtractFsPath(UriOrPath);
            if (Path !== void 0) {
              if (process.env["Trace"]) {
                process.stdout.write(
                  `[DEV:FS-ROUTE] op=openTextDocument route=native uri=${UriString}
`
                );
              }
              try {
                Text = await FsPromises3.readFile(Path, "utf8");
              } catch {
                Text = "";
              }
            } else {
              Text = DecodeRaw(
                await Call(
                  Context13,
                  "FileSystem.ReadFile",
                  [UriString]
                )
              );
            }
          } else {
            if (process.env["Trace"]) {
              process.stdout.write(
                `[DEV:FS-ROUTE] op=openTextDocument route=mountain uri=${UriString}
`
              );
            }
            Text = DecodeRaw(
              await Call(Context13, "FileSystem.ReadFile", [
                UriString
              ])
            );
          }
        }
      }
      const LanguageId = DeriveLanguageIdFromUri(UriString);
      if (LanguageId !== "plaintext") {
        FireOnLanguageActivation(Context13, LanguageId);
      }
      const LineStarts = [0];
      for (let I = 0; I < Text.length; I++) {
        if (Text.charCodeAt(I) === 10) LineStarts.push(I + 1);
      }
      const Lines = Text.split("\n");
      const ClampOffset = /* @__PURE__ */ __name((Offset) => Math.max(0, Math.min(Math.floor(Offset || 0), Text.length)), "ClampOffset");
      const PositionAt = /* @__PURE__ */ __name((Offset) => {
        const Clamped = ClampOffset(Offset);
        let Lo = 0;
        let Hi = LineStarts.length - 1;
        while (Lo < Hi) {
          const Mid = Lo + Hi + 1 >>> 1;
          if (LineStarts[Mid] <= Clamped) Lo = Mid;
          else Hi = Mid - 1;
        }
        return { line: Lo, character: Clamped - LineStarts[Lo] };
      }, "PositionAt");
      const OffsetAt = /* @__PURE__ */ __name((Position) => {
        const L = Math.max(
          0,
          Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1)
        );
        const C = Math.max(0, Math.floor(Position?.character ?? 0));
        const LineLength = Lines[L]?.length ?? 0;
        return ClampOffset((LineStarts[L] ?? 0) + Math.min(C, LineLength));
      }, "OffsetAt");
      const LineAt = /* @__PURE__ */ __name((LineOrPosition) => {
        const L = typeof LineOrPosition === "number" ? LineOrPosition : LineOrPosition?.line ?? 0;
        const Clamped = Math.max(
          0,
          Math.min(Math.floor(L), Lines.length - 1)
        );
        const Content = Lines[Clamped] ?? "";
        const Start = { line: Clamped, character: 0 };
        const End = { line: Clamped, character: Content.length };
        return {
          lineNumber: Clamped,
          text: Content,
          range: { start: Start, end: End },
          rangeIncludingLineBreak: {
            start: Start,
            end: Clamped < Lines.length - 1 ? { line: Clamped + 1, character: 0 } : End
          },
          firstNonWhitespaceCharacterIndex: Content.search(/\S/) >>> 0,
          isEmptyOrWhitespace: Content.trim().length === 0
        };
      }, "LineAt");
      const ValidateRange = /* @__PURE__ */ __name((Range) => Range, "ValidateRange");
      const ValidatePosition = /* @__PURE__ */ __name((Position) => Position, "ValidatePosition");
      const GetWordRangeAtPosition = /* @__PURE__ */ __name((Position, Regex) => {
        const L = Math.max(
          0,
          Math.min(Math.floor(Position?.line ?? 0), Lines.length - 1)
        );
        const Line = Lines[L] ?? "";
        const C = Math.max(0, Math.floor(Position?.character ?? 0));
        const Pattern = Regex ?? /[A-Za-z_$][\w$]*/g;
        Pattern.lastIndex = 0;
        let Match;
        while ((Match = Pattern.exec(Line)) !== null) {
          const Start = Match.index;
          const End = Start + Match[0].length;
          if (C >= Start && C <= End) {
            return {
              start: { line: L, character: Start },
              end: { line: L, character: End }
            };
          }
          if (Match.index === Pattern.lastIndex) Pattern.lastIndex++;
        }
        return void 0;
      }, "GetWordRangeAtPosition");
      return {
        uri: UriOrPath,
        fileName: UriString,
        languageId: LanguageId,
        isDirty: false,
        isClosed: false,
        isUntitled: false,
        version: 1,
        eol: 1,
        lineCount: Lines.length,
        getText: /* @__PURE__ */ __name((Range) => {
          if (!Range) return Text;
          const Start = OffsetAt(
            Range.start ?? { line: 0, character: 0 }
          );
          const End = OffsetAt(
            Range.end ?? {
              line: Lines.length - 1,
              character: Lines[Lines.length - 1]?.length ?? 0
            }
          );
          return Text.slice(Math.min(Start, End), Math.max(Start, End));
        }, "getText"),
        positionAt: PositionAt,
        offsetAt: OffsetAt,
        lineAt: LineAt,
        getWordRangeAtPosition: GetWordRangeAtPosition,
        validateRange: ValidateRange,
        validatePosition: ValidatePosition,
        save: /* @__PURE__ */ __name(async () => true, "save")
      };
    }, "BuildOpenTextDocument");
    BuildSaveAll = /* @__PURE__ */ __name((Context13) => async (_IncludeUntitled) => {
      try {
        await Call(Context13, "Workspace.SaveAll", [
          _IncludeUntitled ?? false
        ]);
      } catch {
        Context13.MountainClient?.sendRequest("Workspace.SaveAll", [
          _IncludeUntitled ?? false
        ]).catch(() => {
        });
      }
      return true;
    }, "BuildSaveAll");
    BuildApplyEdit = /* @__PURE__ */ __name((Context13) => async (Edit, _Metadata) => {
      try {
        const Result = await Call(Context13, "applyEdit", [Edit]);
        if (typeof Result === "boolean") return Result;
        return true;
      } catch {
        Context13.SendToMountain("workspace.applyEdit", Edit).catch(() => {
        });
        return false;
      }
    }, "BuildApplyEdit");
    BuildUpdateWorkspaceFolders = /* @__PURE__ */ __name((Context13, ReadFolders) => (Start, DeleteCount, ...ToAdd) => {
      const Current = ReadFolders();
      const RemoveCount = typeof DeleteCount === "number" && DeleteCount > 0 ? Math.min(DeleteCount, Math.max(Current.length - Start, 0)) : 0;
      const Removals = Current.slice(Start, Start + RemoveCount).map(
        (Folder) => ({
          uri: {
            value: typeof Folder?.uri === "string" ? Folder.uri : Folder?.uri?.["toString"]?.call(Folder?.uri) ?? String(Folder?.uri)
          }
        })
      );
      const Additions = ToAdd.map((Folder) => {
        const Raw2 = Folder?.uri;
        const Serialized = typeof Raw2 === "string" ? Raw2 : Raw2?.["toString"]?.call(Raw2) ?? String(Raw2 ?? "");
        return { uri: { value: Serialized }, name: Folder?.name ?? "" };
      });
      Context13.MountainClient?.sendRequest("$updateWorkspaceFolders", {
        additions: Additions,
        removals: Removals
      }).catch((Error2) => {
        const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
        try {
          process.stdout.write(
            `[LandFix:WsNs] updateWorkspaceFolders failed: ${Message}
`
          );
        } catch {
        }
      });
      return true;
    }, "BuildUpdateWorkspaceFolders");
    BuildDocumentEventMembers = /* @__PURE__ */ __name((Context13) => ({
      onDidOpenTextDocument: EventSubscriber(Context13, "didOpenTextDocument"),
      onDidCloseTextDocument: EventSubscriber(Context13, "didCloseTextDocument"),
      onDidChangeTextDocument: EventSubscriber(Context13, "didChangeTextDocument"),
      onDidSaveTextDocument: EventSubscriber(Context13, "didSaveTextDocument"),
      // `onWillSaveTextDocument` must add the listener to `__willSaveListeners`
      // (the array the notification handler iterates for `waitUntil` support)
      // AND also emit the event on WorkspaceEventEmitter so plain subscribers
      // still fire. Without the `__willSaveListeners` path, format-on-save
      // extensions that call `event.waitUntil(Promise<TextEdit[]>)` inside
      // their listener never deliver their edits before the disk write.
      onWillSaveTextDocument: /* @__PURE__ */ __name((Listener, ThisArg, Disposables) => {
        const Bound = ThisArg === void 0 ? Listener : Listener.bind(ThisArg);
        if (!Array.isArray(Context13.__willSaveListeners)) {
          Context13.__willSaveListeners = [];
        }
        Context13.__willSaveListeners.push(Bound);
        const Subscription = {
          dispose: /* @__PURE__ */ __name(() => {
            const All = Context13.__willSaveListeners;
            if (Array.isArray(All)) {
              const Idx = All.indexOf(Bound);
              if (Idx !== -1) All.splice(Idx, 1);
            }
            Context13.WorkspaceEventEmitter.removeListener(
              "willSaveTextDocument",
              Bound
            );
          }, "dispose")
        };
        if (Disposables && typeof Disposables.push === "function") {
          Disposables.push(Subscription);
        }
        return Subscription;
      }, "onWillSaveTextDocument"),
      onDidCreateFiles: EventSubscriber(Context13, "didCreateFiles"),
      onDidDeleteFiles: EventSubscriber(Context13, "didDeleteFiles"),
      onDidRenameFiles: EventSubscriber(Context13, "didRenameFiles"),
      onWillRenameFiles: EventSubscriber(Context13, "willRenameFiles"),
      onWillCreateFiles: EventSubscriber(Context13, "willCreateFiles"),
      onWillDeleteFiles: EventSubscriber(Context13, "willDeleteFiles"),
      onDidOpenNotebookDocument: EventSubscriber(
        Context13,
        "didOpenNotebookDocument"
      ),
      onDidCloseNotebookDocument: EventSubscriber(
        Context13,
        "didCloseNotebookDocument"
      ),
      onDidChangeNotebookDocument: EventSubscriber(
        Context13,
        "didChangeNotebookDocument"
      ),
      onDidSaveNotebookDocument: EventSubscriber(
        Context13,
        "didSaveNotebookDocument"
      ),
      onWillSaveNotebookDocument: EventSubscriber(
        Context13,
        "willSaveNotebookDocument"
      )
    }), "BuildDocumentEventMembers");
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Wrap/Workspace/Namespace.ts
var WrapWorkspaceNamespace, Namespace_default3;
var init_Namespace4 = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Wrap/Workspace/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapWorkspaceNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("workspace", Concrete), "WrapWorkspaceNamespace");
    Namespace_default3 = WrapWorkspaceNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Index.ts
var HydrateUriResults, CreateWorkspaceNamespace, Index_default;
var init_Index = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace/Index.ts"() {
    "use strict";
    init_Track();
    init_Lift();
    init_Configuration2();
    init_Namespace3();
    init_Watcher();
    init_Files();
    init_Fallback();
    init_Providers();
    init_Document();
    init_Namespace4();
    HydrateUriResults = /* @__PURE__ */ __name((Raw2) => {
      if (!Array.isArray(Raw2)) return [];
      return Raw2.map((Item) => {
        if (typeof Item === "string") {
          if (Item.length === 0) return Item;
          try {
            return URI.parse(Item);
          } catch {
            return Item;
          }
        }
        if (Item && typeof Item === "object") {
          try {
            const Hydrated = ToUri(Item);
            if (Hydrated) return Hydrated;
          } catch {
          }
        }
        return Item;
      });
    }, "HydrateUriResults");
    CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context13) => {
      const InitWorkspace = Context13.ExtensionHostInitData?.workspace ?? Context13.ExtensionHostInitData?.workspaceData ?? {};
      const HydrateFolder = /* @__PURE__ */ __name((Raw2, FallbackIndex) => {
        const Hydrated = ToUri(Raw2?.uri);
        if (!Hydrated) return null;
        const Name = typeof Raw2?.name === "string" && Raw2.name.length > 0 ? Raw2.name : Hydrated.fsPath.split(/[\\/]/).pop() ?? "";
        const Index = typeof Raw2?.index === "number" ? Raw2.index : FallbackIndex;
        return { uri: Hydrated, name: Name, index: Index };
      }, "HydrateFolder");
      const ReadFolders = /* @__PURE__ */ __name(() => {
        const Live = Context13.ExtensionHostInitData?.workspace ?? Context13.ExtensionHostInitData?.workspaceData ?? {};
        const Raw2 = Live.folders ?? [];
        const Out = [];
        for (let I = 0; I < Raw2.length; I++) {
          const Hydrated = HydrateFolder(Raw2[I], I);
          if (Hydrated) Out.push(Hydrated);
        }
        return Out;
      }, "ReadFolders");
      const ReadName = /* @__PURE__ */ __name(() => {
        const Live = Context13.ExtensionHostInitData?.workspace ?? Context13.ExtensionHostInitData?.workspaceData ?? {};
        return Live.name ?? InitWorkspace.name;
      }, "ReadName");
      const ConfigState = CreateConfigurationState(Context13);
      globalThis.__cocoonConfigState = ConfigState;
      const Concrete = {
        get workspaceFolders() {
          return ReadFolders();
        },
        get name() {
          return ReadName();
        },
        workspaceFile: void 0,
        rootPath: void 0,
        // Live getter: returns the array populated by $acceptModelAdded
        // notifications so extensions reading `workspace.textDocuments` see
        // all currently-open files rather than an always-empty array.
        get textDocuments() {
          return Context13.__textDocuments ?? [];
        },
        notebookDocuments: [],
        getConfiguration: BuildGetConfiguration(Context13, ConfigState),
        // `findFiles` / `findFiles2` now follow the same Mountain-first
        // dual-track as `findTextInFiles`, AND additionally fall back to
        // the Node walker when Mountain succeeds with an empty result.
        // The empty-result fallback covers the case where Mountain's
        // `WorkspaceFolders` state diverges from the renderer's URL
        // (e.g. binary launched from `Target/debug/` so Mountain walks
        // build artifacts) - users were seeing search return zero
        // without any error to diagnose. Node always walks the same
        // `ExtensionHostInitData.workspace.folders` Cocoon already has
        // from the workbench, so it's resilient to that drift.
        findFiles: /* @__PURE__ */ __name(async (Include, Exclude, MaxResults) => {
          const Raw2 = await TryMountainWithEmptyFallback(
            Context13,
            "findFiles",
            [
              Include,
              {
                exclude: Exclude,
                maxResults: MaxResults
              }
            ],
            async (Args) => {
              const [I, _O] = Args;
              const Opts = _O;
              return FindFilesLocal(
                Context13,
                ReadFolders(),
                I,
                Opts?.exclude,
                Opts?.maxResults
              );
            },
            (R) => !Array.isArray(R) || R.length === 0
          );
          return HydrateUriResults(Raw2);
        }, "findFiles"),
        // `findFiles2` - VS Code 1.90+ multi-pattern signature.
        // Extensions (copilot, vim, markdown-language-features) use
        // this. We forward the first pattern through the same Mountain
        // dual-track as `findFiles`; multi-pattern semantics fold to
        // the union, which Mountain's globset matcher already supports
        // natively via comma-separated brace patterns.
        findFiles2: /* @__PURE__ */ __name(async (FilePatterns, Options) => {
          const Include = Array.isArray(FilePatterns) ? FilePatterns[0] : FilePatterns;
          const Raw2 = await TryMountainWithEmptyFallback(
            Context13,
            "findFiles",
            [
              Include,
              {
                exclude: Options?.exclude,
                maxResults: Options?.maxResults
              }
            ],
            async (Args) => {
              const [I, _O] = Args;
              const Opts = _O;
              return FindFilesLocal(
                Context13,
                ReadFolders(),
                I,
                Opts?.exclude,
                Opts?.maxResults
              );
            },
            (R) => !Array.isArray(R) || R.length === 0
          );
          return HydrateUriResults(Raw2);
        }, "findFiles2"),
        // `findTextInFiles` / `findTextInFiles2` - dual-track Mountain
        // (ripgrep-backed via `grep-searcher` + `ignore`) first, Node
        // fallback second. The method name `findTextInFiles` is the
        // canonical entry in `RouteManifest::MountainMethods`; the
        // previous `Workspace.FindTextInFiles` form was missing from
        // the manifest, so the manifest short-circuit always routed
        // to the Node fallback - the Mountain ripgrep path was dead.
        // Same empty-result shadowing as `findFiles`: Mountain's
        // ripgrep returning zero matches when the workspace folder is
        // misconfigured falls through to Node so the search panel
        // always shows real results.
        findTextInFiles: /* @__PURE__ */ __name(async (Query, Options, Callback, _Token) => TryMountainWithEmptyFallback(
          Context13,
          "findTextInFiles",
          [Query, Options],
          async (Args) => {
            const [Q, O] = Args;
            return FindTextInFilesNodeFallback(
              Context13,
              ReadFolders(),
              Q,
              O,
              Callback
            );
          },
          (R) => {
            if (R == null) return true;
            if (Array.isArray(R)) return R.length === 0;
            const Matches = R.matches;
            return !Array.isArray(Matches) || Matches.length === 0;
          }
        ), "findTextInFiles"),
        findTextInFiles2: /* @__PURE__ */ __name(async (Query, Options, Callback, _Token) => TryMountainWithEmptyFallback(
          Context13,
          "findTextInFiles",
          [Query, Options],
          async (Args) => {
            const [Q, O] = Args;
            return FindTextInFilesNodeFallback(
              Context13,
              ReadFolders(),
              Q,
              O,
              Callback
            );
          },
          (R) => {
            if (R == null) return true;
            if (Array.isArray(R)) return R.length === 0;
            const Matches = R.matches;
            return !Array.isArray(Matches) || Matches.length === 0;
          }
        ), "findTextInFiles2"),
        openTextDocument: BuildOpenTextDocument(Context13),
        // `openNotebookDocument` - notebook renderer support. Land has no
        // notebook editor yet; return a minimal NotebookDocument shape so
        // callers that immediately read `.uri` / `.cellCount` don't crash.
        openNotebookDocument: /* @__PURE__ */ __name(async (_UriOrContent, _Content) => ({
          uri: void 0,
          version: 1,
          notebookType: "jupyter-notebook",
          isUntitled: false,
          isDirty: false,
          isClosed: false,
          metadata: {},
          cellCount: 0,
          cellAt: /* @__PURE__ */ __name(() => null, "cellAt"),
          getCells: /* @__PURE__ */ __name(() => [], "getCells"),
          save: /* @__PURE__ */ __name(async () => false, "save")
        }), "openNotebookDocument"),
        saveAll: BuildSaveAll(Context13),
        // `save(uri)` / `saveAs(uri)` - VS Code 1.86+ per-URI save API.
        // Stock `extHostWorkspace.save` forwards to
        // `MainThreadWorkspace.$save` / `$saveAs`. Mountain has no
        // single-URI save handler wired yet; fall back to `saveAll`'s
        // behaviour by routing through the workbench command so dirty
        // documents still flush. Returns the URI on success to match the
        // stable signature.
        save: /* @__PURE__ */ __name(async (Uri) => {
          try {
            await Context13.MountainClient?.sendRequest("Workspace.Save", {
              uri: Uri
            });
            return Uri;
          } catch {
            return void 0;
          }
        }, "save"),
        saveAs: /* @__PURE__ */ __name(async (Uri) => {
          try {
            const Result = await Context13.MountainClient?.sendRequest(
              "Workspace.SaveAs",
              { uri: Uri }
            );
            return Result?.uri ?? Uri;
          } catch {
            return void 0;
          }
        }, "saveAs"),
        applyEdit: BuildApplyEdit(Context13),
        // `asRelativePath` - lifts stock VS Code's `resources.relativePath`
        // from `@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js`
        // rather than hand-rolling prefix matching. Stock handles Windows
        // drive-letter casing, authority comparison, and trailing-slash
        // normalisation that our previous `.startsWith()` missed. Falls
        // back to the raw input when the URI can't be coerced (matches
        // stock VS Code's own behaviour at the workspace boundary).
        asRelativePath: /* @__PURE__ */ __name((PathOrUri, IncludeWorkspaceFolder) => {
          const Raw2 = typeof PathOrUri === "string" ? PathOrUri : PathOrUri?.fsPath ?? PathOrUri?.path ?? String(PathOrUri);
          const Folders = ReadFolders();
          for (const Folder of Folders) {
            const Relative = RelativePath(Folder.uri, PathOrUri);
            if (Relative !== void 0) {
              if (IncludeWorkspaceFolder && Folders.length > 1) {
                return `${Folder.name}/${Relative}`;
              }
              return Relative;
            }
          }
          return Raw2;
        }, "asRelativePath"),
        // `getWorkspaceFolder(uri)` - THE most-called workspace API:
        // every URI-handling extension does
        // `workspace.getWorkspaceFolder(uri).name/uri/index`. Lifts
        // stock `resources.isEqualOrParent` (from
        // `@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js`) which
        // handles URI authority, casing, and path-separator edge cases
        // correctly - our previous `.startsWith()` missed e.g. Windows
        // case-insensitive file URIs and URIs with query/fragment parts.
        getWorkspaceFolder: /* @__PURE__ */ __name((Uri) => {
          if (Uri == null) return void 0;
          for (const Folder of ReadFolders()) {
            if (IsEqualOrParent(Uri, Folder.uri)) {
              return Folder;
            }
          }
          return void 0;
        }, "getWorkspaceFolder"),
        // `resolveProxy` - Land has no network proxy intercept; let the
        // extension fall back to direct connections by returning undefined.
        // Stock VS Code's `extHostWorkspace.resolveProxy` routes through
        // the main process's `IRequestService`.
        resolveProxy: /* @__PURE__ */ __name(async (_Url) => void 0, "resolveProxy"),
        // Text codec helpers - VS Code 1.98+ exposes these on
        // `vscode.workspace`. TextEncoder/Decoder are globals in Node 16+,
        // so direct delegation is safe.
        encode: /* @__PURE__ */ __name((Value, _Encoding) => new TextEncoder().encode(Value), "encode"),
        decode: /* @__PURE__ */ __name((Buffer2, Encoding) => new TextDecoder(Encoding ?? "utf-8").decode(Buffer2), "decode"),
        // BATCH-14 follow-up: forwards through Mountain's `$updateWorkspaceFolders`
        // which mutates ApplicationState.Workspace and fires `$deltaWorkspaceFolders`
        // back - the listener wiring from BATCH-14 does the rest.
        updateWorkspaceFolders: BuildUpdateWorkspaceFolders(
          Context13,
          ReadFolders
        ),
        ...BuildDocumentEventMembers(Context13),
        onDidChangeConfiguration: BuildOnDidChangeConfiguration(ConfigState),
        // `onWillSaveTextDocument` - fires before a document is persisted.
        // Mountain sends `document.willSave` just before `Document.Save` writes
        // to disk. Extensions subscribe here to apply last-minute edits
        // (format-on-save, organize-imports-on-save, etc.).
        // Implementation: store listeners on `Context.__willSaveListeners`.
        // NotificationHandler fires them and collects any returned TextEdits.
        onWillSaveTextDocument: /* @__PURE__ */ __name((Listener) => {
          const List = Context13.__willSaveListeners ??= [];
          List.push(Listener);
          Context13.WorkspaceEventEmitter.on("willSaveTextDocument", Listener);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              const Idx = List.indexOf(Listener);
              if (Idx !== -1) List.splice(Idx, 1);
              Context13.WorkspaceEventEmitter.removeListener(
                "willSaveTextDocument",
                Listener
              );
            }, "dispose")
          };
        }, "onWillSaveTextDocument"),
        // File lifecycle events forwarded from BuildDocumentEventMembers (spread at
        // line above). The spread already provides real EventSubscriber versions; no
        // stub override needed here. Mountain fires willCreate/willDelete/willRename
        // notifications to Cocoon via Vine before the VFS mutation lands on disk, so
        // GitLens and other watchers receive the events correctly.
        onDidChangeWorkspaceFolders: /* @__PURE__ */ __name((Listener) => {
          Context13.WorkspaceEventEmitter.on(
            "didChangeWorkspaceFolders",
            Listener
          );
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.WorkspaceEventEmitter.removeListener(
                "didChangeWorkspaceFolders",
                Listener
              );
            }, "dispose")
          };
        }, "onDidChangeWorkspaceFolders"),
        // Provider registrations - each backed by a Mountain round-trip.
        registerTextDocumentContentProvider: BuildRegisterTextDocumentContentProvider(Context13),
        registerFileSystemProvider: BuildRegisterFileSystemProvider(Context13),
        registerTaskProvider: BuildRegisterTaskProvider(Context13),
        registerNotebookContentProvider: BuildRegisterNotebookContentProvider(Context13),
        registerNotebookSerializer: BuildRegisterNotebookSerializer(Context13),
        registerRemoteAuthorityResolver: BuildRegisterRemoteAuthorityResolver(Context13),
        registerResourceLabelFormatter: BuildRegisterResourceLabelFormatter(Context13),
        // Stub-only registrations (no Mountain route yet).
        registerDocumentPasteEditProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Metadata) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerDocumentPasteEditProvider"),
        registerDocumentDropEditProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerDocumentDropEditProvider"),
        registerEditSessionIdentityProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerEditSessionIdentityProvider"),
        // `vscode.git`'s activate() subscribes to both of these during boot
        // via `extensions/git/out/main.js`. Missing either crashes the git
        // extension with `TypeError: …onWillCreateEditSessionIdentity is
        // not a function`, which then cascades into "No source control
        // providers registered" because `vscode.git.createSourceControl`
        // never runs. Stub-as-subscription is safe: Land has no edit-
        // session-identity provider yet so the events can never fire.
        onWillCreateEditSessionIdentity: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onWillCreateEditSessionIdentity"),
        onDidCreateEditSessionIdentity: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidCreateEditSessionIdentity"),
        registerShareProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerShareProvider"),
        registerCanonicalUriProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerCanonicalUriProvider"),
        onDidGrantWorkspaceTrust: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidGrantWorkspaceTrust"),
        // `vscode.git`'s activate() subscribes to this at
        // `extensions/git/out/main.js:init`. Land has no workspace-trust
        // enforcement yet (every workspace is treated as trusted), so the
        // "trusted folders set changed" event can never fire. Expose a
        // real no-op subscription whose disposable is safe to call - any
        // missing property here crashes git activation with
        // `TypeError: …onDidChangeWorkspaceTrustedFolders is not a function`
        // and the Source Control panel then shows "No source control
        // providers registered" because `vscode.git.createSourceControl`
        // never runs. Added for parity with
        // `vs/workbench/api/common/extHostWorkspace.ts::onDidChangeWorkspaceTrustedFolders`.
        onDidChangeWorkspaceTrustedFolders: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeWorkspaceTrustedFolders"),
        // Same family; kept stubbed for symmetry so any other extension
        // that subscribes to the non-folder-scoped variant doesn't fail
        // at activation time.
        onDidChangeWorkspaceTrust: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeWorkspaceTrust"),
        workspaceTrustedFolders: [],
        isTrusted: true,
        trusted: true,
        requestWorkspaceTrust: /* @__PURE__ */ __name(async () => true, "requestWorkspaceTrust"),
        registerTunnelProvider: /* @__PURE__ */ __name((_Provider, _Information) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerTunnelProvider"),
        openTunnel: /* @__PURE__ */ __name(async (_TunnelOptions) => ({
          remoteAddress: { port: 0, host: "localhost" },
          localAddress: "",
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "openTunnel"),
        tunnels: Promise.resolve([]),
        onDidChangeTunnels: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeTunnels"),
        registerPortAttributesProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerPortAttributesProvider"),
        // Proposed API provider registrations. Each returns a no-op
        // disposable so extensions that opt-in (via
        // `enabledApiProposals`) can still activate; wiring each into
        // Mountain is deferred until a concrete consumer shows up.
        //
        // - `registerTimelineProvider` - git / github-pull-requests.
        // - `registerFileSearchProvider[2]` - remote FS providers.
        // - `registerTextSearchProvider[2]` - grep-for-X extensions.
        // - `registerAITextSearchProvider` - AI search (copilot).
        registerTimelineProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerTimelineProvider"),
        registerFileSearchProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerFileSearchProvider"),
        registerFileSearchProvider2: /* @__PURE__ */ __name((_Scheme, _Provider) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerFileSearchProvider2"),
        registerTextSearchProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerTextSearchProvider"),
        registerTextSearchProvider2: /* @__PURE__ */ __name((_Scheme, _Provider) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "registerTextSearchProvider2"),
        registerAITextSearchProvider: /* @__PURE__ */ __name((_Scheme, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerAITextSearchProvider"),
        // createFileSystemWatcher is tier-gated - see FileSystemWatcher.ts.
        createFileSystemWatcher: /* @__PURE__ */ __name((Pattern, IgnoreCreateEvents, IgnoreChangeEvents, IgnoreDeleteEvents) => CreateFileSystemWatcher(
          Context13,
          Pattern,
          IgnoreCreateEvents,
          IgnoreChangeEvents,
          IgnoreDeleteEvents
        ), "createFileSystemWatcher"),
        fs: BuildFileSystemNamespace(Context13)
      };
      return Namespace_default3(Concrete);
    }, "CreateWorkspaceNamespace");
    Index_default = CreateWorkspaceNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Workspace/Namespace.ts
var Namespace_exports2 = {};
__export(Namespace_exports2, {
  default: () => Index_default
});
var init_Namespace5 = __esm({
  "Source/Services/Handler/VscodeAPI/Workspace/Namespace.ts"() {
    "use strict";
    init_Index();
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Commands/Namespace.ts
var WrapCommandsNamespace, Namespace_default4;
var init_Namespace6 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Commands/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapCommandsNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("commands", Concrete), "WrapCommandsNamespace");
    Namespace_default4 = WrapCommandsNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Commands/Route.ts
function Route2(CommandId, Registry) {
  return Registry.Has(CommandId) ? "local" : "mountain";
}
var LogRoute2;
var init_Route2 = __esm({
  "Source/Services/Handler/VscodeAPI/Commands/Route.ts"() {
    "use strict";
    __name(Route2, "Route");
    LogRoute2 = /* @__PURE__ */ __name((CommandId, Decision) => {
      if (!process.env["Trace"]?.includes("cmd-route")) return;
      process.stdout.write(
        `[DEV:CMD-ROUTE] cmd=${CommandId} route=${Decision}
`
      );
    }, "LogRoute");
  }
});

// Source/Services/Handler/VscodeAPI/Commands/Namespace.ts
var Namespace_exports3 = {};
__export(Namespace_exports3, {
  default: () => Namespace_default5
});
var CreateCommandsNamespace, Namespace_default5;
var init_Namespace7 = __esm({
  "Source/Services/Handler/VscodeAPI/Commands/Namespace.ts"() {
    "use strict";
    init_Namespace6();
    init_Route2();
    CreateCommandsNamespace = /* @__PURE__ */ __name((Context13, LanguageProviderRegistry) => Namespace_default4({
      registerCommand: /* @__PURE__ */ __name((Command, Callback) => {
        LanguageProviderRegistry.RegisterCommand(Command, Callback);
        Context13.SendToMountain("registerCommand", {
          commandId: Command
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
            LanguageProviderRegistry.UnregisterCommand(Command);
            Context13.SendToMountain("unregisterCommand", {
              commandId: Command
            }).catch(() => {
            });
          }, "dispose")
        };
      }, "registerCommand"),
      registerTextEditorCommand: /* @__PURE__ */ __name((Command, Callback) => {
        const WrappedCallback = /* @__PURE__ */ __name(async (...Arguments) => {
          const TextEditor = Context13.__activeTextEditor;
          if (!TextEditor || typeof TextEditor.edit !== "function") {
            const NoopBuilder = {
              replace: /* @__PURE__ */ __name(() => {
              }, "replace"),
              insert: /* @__PURE__ */ __name(() => {
              }, "insert"),
              delete: /* @__PURE__ */ __name(() => {
              }, "delete"),
              setEndOfLine: /* @__PURE__ */ __name(() => {
              }, "setEndOfLine")
            };
            return Callback(void 0, NoopBuilder, ...Arguments);
          }
          let ExtensionResult = void 0;
          await TextEditor.edit((Builder) => {
            ExtensionResult = Callback(
              TextEditor,
              Builder,
              ...Arguments
            );
          });
          if (ExtensionResult && typeof ExtensionResult.then === "function") {
            return await ExtensionResult;
          }
          return ExtensionResult;
        }, "WrappedCallback");
        LanguageProviderRegistry.RegisterCommand(Command, WrappedCallback);
        Context13.SendToMountain("registerCommand", {
          commandId: Command,
          kind: "textEditor"
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
            LanguageProviderRegistry.UnregisterCommand(Command);
            Context13.SendToMountain("unregisterCommand", {
              commandId: Command
            }).catch(() => {
            });
          }, "dispose")
        };
      }, "registerTextEditorCommand"),
      executeCommand: /* @__PURE__ */ __name(async (Command, ...Arguments) => {
        const Decision = Route2(Command, {
          Has: LanguageProviderRegistry.HasCommand
        });
        LogRoute2(Command, Decision);
        if (Decision === "local") {
          const LocalResult = LanguageProviderRegistry.ExecuteCommand(
            Command,
            ...Arguments
          );
          if (LocalResult !== void 0) return LocalResult;
        }
        try {
          return await Context13.MountainClient?.sendRequest(
            "Command.Execute",
            [Command, ...Arguments]
          );
        } catch {
          return void 0;
        }
      }, "executeCommand"),
      getCommands: /* @__PURE__ */ __name(async (FilterInternal) => {
        try {
          const Response = await Context13.MountainClient?.sendRequest(
            "Command.GetAll",
            [FilterInternal ?? false]
          );
          if (Array.isArray(Response)) return Response;
          return [];
        } catch {
          return [];
        }
      }, "getCommands"),
      // `onDidExecuteCommand` - Mountain emits `sky://commands/executed`
      // after every `commands:execute` call with `{ command, arguments }`.
      // Subscribe to that Tauri event and fan out to each registered listener.
      onDidExecuteCommand: /* @__PURE__ */ __name((Listener) => {
        let Active = true;
        void import("@tauri-apps/api/event").then(({ listen }) => {
          void listen("sky://commands/executed", (TauriEvent) => {
            if (Active) Listener(TauriEvent.payload ?? {});
          });
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Active = false;
          }, "dispose")
        };
      }, "onDidExecuteCommand"),
      // Proposed API (`vscode.proposed.diffCommand.d.ts`). Extensions can
      // register a command that receives `LineChange[]` alongside the usual
      // args when invoked from a diff editor's toolbar. We delegate to
      // `registerCommand` - the extension only ever sees the standard args
      // until the diff editor is wired to prepend line-change data. Still
      // returns a real disposable so subscriptions dispose cleanly.
      registerDiffInformationCommand: /* @__PURE__ */ __name((Command, Callback) => {
        LanguageProviderRegistry.RegisterCommand(Command, Callback);
        Context13.SendToMountain("registerCommand", {
          commandId: Command,
          kind: "diffInformation"
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
            LanguageProviderRegistry.UnregisterCommand(Command);
            Context13.SendToMountain("unregisterCommand", {
              commandId: Command
            }).catch(() => {
            });
          }, "dispose")
        };
      }, "registerDiffInformationCommand")
    }), "CreateCommandsNamespace");
    Namespace_default5 = CreateCommandsNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Languages/Namespace.ts
var WrapLanguagesNamespace, Namespace_default6;
var init_Namespace8 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Languages/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapLanguagesNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("languages", Concrete), "WrapLanguagesNamespace");
    Namespace_default6 = WrapLanguagesNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Languages/Namespace.ts
var Namespace_exports4 = {};
__export(Namespace_exports4, {
  default: () => Namespace_default7
});
var UriKey, _AllDiagnostics, RegisterProvider, CreateLanguagesNamespace, Namespace_default7;
var init_Namespace9 = __esm({
  "Source/Services/Handler/VscodeAPI/Languages/Namespace.ts"() {
    "use strict";
    init_Regex();
    init_Lift();
    init_Namespace8();
    UriKey = /* @__PURE__ */ __name((Value) => {
      if (Value == null) return "";
      if (typeof Value === "string") return Value;
      const Hydrated = ToUri(Value);
      if (Hydrated) return Hydrated.toString();
      const Rendered = String(Value);
      if (Rendered && Rendered !== "[object Object]") return Rendered;
      const WithParts = Value;
      if (typeof WithParts.scheme === "string" && typeof WithParts.path === "string") {
        return `${WithParts.scheme}://${WithParts.path}`;
      }
      if (typeof WithParts.fsPath === "string")
        return `file://${WithParts.fsPath}`;
      return Rendered;
    }, "UriKey");
    _AllDiagnostics = /* @__PURE__ */ new Map();
    RegisterProvider = /* @__PURE__ */ __name((Context13, LanguageProviderRegistry, MethodName, Selector, Provider, Extra) => {
      if (Provider == null || typeof Provider !== "object") {
        return { dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") };
      }
      let Handle;
      try {
        Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
      } catch {
        return { dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") };
      }
      const NormaliseOne = /* @__PURE__ */ __name((S) => {
        if (typeof S === "string") return { language: S };
        if (S && typeof S === "object") return S;
        return { language: "*" };
      }, "NormaliseOne");
      const SelectorArray = Array.isArray(Selector) ? Selector.map(NormaliseOne) : [NormaliseOne(Selector)];
      const Language = typeof Selector === "string" ? Selector : SelectorArray[0]?.language ?? "*";
      Context13.SendToMountain(MethodName, {
        handle: Handle,
        languageSelector: Language,
        documentSelector: SelectorArray,
        extensionId: "",
        ...Extra ?? {}
      }).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          try {
            LanguageProviderRegistry.Unregister(Handle);
          } catch {
          }
        }, "dispose")
      };
    }, "RegisterProvider");
    CreateLanguagesNamespace = /* @__PURE__ */ __name((Context13, LanguageProviderRegistry) => Namespace_default6({
      registerHoverProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_hover_provider",
        Selector,
        Provider
      ), "registerHoverProvider"),
      registerCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, ...TriggerCharacters) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_completion_item_provider",
        Selector,
        Provider,
        {
          // VS Code's CompletionRegistry keys providers by their
          // trigger character set so the workbench's editor
          // contribution `SuggestController` knows when to fire
          // auto-suggest. Without forwarding these, completions
          // only ever fire on the universal Ctrl+Space, never on
          // the language-specific triggers (`.` for TS/JS, `:` for
          // CSS, `<` for HTML, ` ` for Tailwind, etc.) - which
          // makes the workbench feel completely broken even when
          // every other path is wired correctly.
          triggerCharacters: TriggerCharacters
        }
      ), "registerCompletionItemProvider"),
      registerDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_definition_provider",
        Selector,
        Provider
      ), "registerDefinitionProvider"),
      registerReferenceProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_reference_provider",
        Selector,
        Provider
      ), "registerReferenceProvider"),
      registerCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider, Metadata) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_code_actions_provider",
        Selector,
        Provider,
        {
          // VS Code's CodeAction registry uses `providedCodeActionKinds`
          // to filter which code-action providers run for which
          // requested kinds. Without this forwarding, ESLint's
          // `quickfix.eslint` provider is invoked for the `refactor`
          // menu (and vice versa), wasting CPU and producing wrong
          // menus.
          providedCodeActionKinds: Metadata?.providedCodeActionKinds ?? [],
          documentation: Metadata?.documentation ?? []
        }
      ), "registerCodeActionsProvider"),
      registerDocumentSymbolProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_symbol_provider",
        Selector,
        Provider
      ), "registerDocumentSymbolProvider"),
      registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_formatting_provider",
        Selector,
        Provider
      ), "registerDocumentFormattingEditProvider"),
      registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_range_formatting_provider",
        Selector,
        Provider
      ), "registerDocumentRangeFormattingEditProvider"),
      registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider, FirstTrigger, ...MoreTriggers) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_on_type_formatting_provider",
        Selector,
        Provider,
        {
          // On-type formatting is invoked by Monaco when the user
          // types one of these chars. Without forwarding, JS/TS
          // auto-formatting on `;` and `}` (built-in) never fires,
          // and language-server-provided formatting (CSS `;`,
          // HTML `>`) silently misses.
          firstTriggerCharacter: FirstTrigger,
          moreTriggerCharacter: MoreTriggers
        }
      ), "registerOnTypeFormattingEditProvider"),
      registerTypeDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_type_definition_provider",
        Selector,
        Provider
      ), "registerTypeDefinitionProvider"),
      registerImplementationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_implementation_provider",
        Selector,
        Provider
      ), "registerImplementationProvider"),
      registerDeclarationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_declaration_provider",
        Selector,
        Provider
      ), "registerDeclarationProvider"),
      registerDocumentLinkProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_link_provider",
        Selector,
        Provider
      ), "registerDocumentLinkProvider"),
      registerColorProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_color_provider",
        Selector,
        Provider
      ), "registerColorProvider"),
      registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_linked_editing_range_provider",
        Selector,
        Provider
      ), "registerLinkedEditingRangeProvider"),
      registerCallHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_call_hierarchy_provider",
        Selector,
        Provider
      ), "registerCallHierarchyProvider"),
      registerTypeHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_type_hierarchy_provider",
        Selector,
        Provider
      ), "registerTypeHierarchyProvider"),
      registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_evaluatable_expression_provider",
        Selector,
        Provider
      ), "registerEvaluatableExpressionProvider"),
      registerInlineValuesProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_inline_values_provider",
        Selector,
        Provider
      ), "registerInlineValuesProvider"),
      registerSignatureHelpProvider: /* @__PURE__ */ __name((Selector, Provider, ...Metadata) => {
        let TriggerCharacters = [];
        let RetriggerCharacters = [];
        if (Metadata.length === 1 && typeof Metadata[0] === "object" && Metadata[0] !== null) {
          const Meta = Metadata[0];
          TriggerCharacters = Array.isArray(Meta.triggerCharacters) ? Meta.triggerCharacters : [];
          RetriggerCharacters = Array.isArray(Meta.retriggerCharacters) ? Meta.retriggerCharacters : [];
        } else {
          TriggerCharacters = Metadata.filter(
            (M) => typeof M === "string"
          );
        }
        return RegisterProvider(
          Context13,
          LanguageProviderRegistry,
          "register_signature_help_provider",
          Selector,
          Provider,
          {
            triggerCharacters: TriggerCharacters,
            retriggerCharacters: RetriggerCharacters
          }
        );
      }, "registerSignatureHelpProvider"),
      registerDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_highlight_provider",
        Selector,
        Provider
      ), "registerDocumentHighlightProvider"),
      registerCodeLensProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_code_lens_provider",
        Selector,
        Provider
      ), "registerCodeLensProvider"),
      registerRenameProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_rename_provider",
        Selector,
        Provider
      ), "registerRenameProvider"),
      registerFoldingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_folding_range_provider",
        Selector,
        Provider
      ), "registerFoldingRangeProvider"),
      registerSelectionRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_selection_range_provider",
        Selector,
        Provider
      ), "registerSelectionRangeProvider"),
      registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((Selector, Provider, _Legend) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_semantic_tokens_provider",
        Selector,
        Provider
      ), "registerDocumentSemanticTokensProvider"),
      // Range-variant of the semantic tokens API. DEVSENSE.phptools calls it
      // at activation; missing function crashes the provider registration
      // loop. Route through the same provider channel as the document-wide
      // variant - the Land side can't yet distinguish range vs full, so the
      // worst case is the provider computes tokens for the whole document.
      registerDocumentRangeSemanticTokensProvider: /* @__PURE__ */ __name((Selector, Provider, _Legend) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_semantic_tokens_provider",
        Selector,
        Provider
      ), "registerDocumentRangeSemanticTokensProvider"),
      registerInlayHintsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_inlay_hints_provider",
        Selector,
        Provider
      ), "registerInlayHintsProvider"),
      registerWorkspaceSymbolProvider: /* @__PURE__ */ __name((Provider) => {
        process.stdout.write(
          "[LandFix:LangNs] registerWorkspaceSymbolProvider called\n"
        );
        return RegisterProvider(
          Context13,
          LanguageProviderRegistry,
          "register_workspace_symbol_provider",
          "*",
          Provider
        );
      }, "registerWorkspaceSymbolProvider"),
      createDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
        const Owner = Name ?? "default";
        const Store = /* @__PURE__ */ new Map();
        const NormaliseSeverity = /* @__PURE__ */ __name((Sev) => {
          if (typeof Sev === "number") {
            switch (Sev) {
              case 0:
                return 8;
              // Error
              case 1:
                return 4;
              // Warning
              case 2:
                return 2;
              // Info
              case 3:
                return 1;
              // Hint
              // LSP DiagnosticSeverity: 1=Error, 2=Warning, 3=Info, 4=Hint
              // (only reached when caller passed pre-LSP form by mistake;
              // Monaco bit values 4/2/1/8 already covered above for the
              // vscode enum 1/2/3/0 - leaving the LSP form as a
              // best-effort fallthrough.)
              default:
                return Sev > 0 && Sev <= 8 ? Sev : 4;
            }
          }
          if (typeof Sev === "string") {
            const Lower = Sev.toLowerCase();
            if (Lower.startsWith("err")) return 8;
            if (Lower.startsWith("warn")) return 4;
            if (Lower.startsWith("info")) return 2;
            if (Lower.startsWith("hint")) return 1;
            return 4;
          }
          return 4;
        }, "NormaliseSeverity");
        const Pos = /* @__PURE__ */ __name((V) => {
          const O = V ?? {};
          return {
            line: typeof O.line === "number" ? O.line : 0,
            character: typeof O.character === "number" ? O.character : 0
          };
        }, "Pos");
        const NormaliseDiagnostic = /* @__PURE__ */ __name((D) => {
          const Obj = D ?? {};
          const Range = Obj.range ?? {};
          const Start = Pos(Range.start);
          const End = Pos(Range.end);
          const RawMsg = typeof Obj.message === "string" ? Obj.message : String(Obj.message ?? "");
          const Out = {
            severity: NormaliseSeverity(Obj.severity),
            // VS Code's _toMarker rejects empty message with
            // `if (!message) return undefined`, silently dropping
            // the marker. Substitute a fallback so diagnostics
            // without a human-readable message still appear.
            message: RawMsg.length > 0 ? RawMsg : "(diagnostic)",
            // `+ 1` converts vscode.Position (0-based) to
            // `IMarkerData` (1-based). See block comment above.
            startLineNumber: Start.line + 1,
            startColumn: Start.character + 1,
            endLineNumber: End.line + 1,
            endColumn: End.character + 1
          };
          if (Obj.source !== void 0 && Obj.source !== null) {
            Out.source = String(Obj.source);
          }
          if (Obj.code !== void 0 && Obj.code !== null) {
            Out.code = Obj.code;
          }
          if (Array.isArray(Obj.tags)) {
            Out.tags = Obj.tags.filter((T) => typeof T === "number");
          }
          if (Array.isArray(Obj.relatedInformation)) {
            Out.relatedInformation = Obj.relatedInformation.map(
              (RI) => {
                const Loc = RI?.location ?? RI;
                const RIRange = Loc?.range ?? {};
                const RIStart = Pos(
                  RIRange.start ?? RIRange
                );
                const RIEnd = Pos(
                  RIRange.end ?? RIRange
                );
                const RIUri = Loc?.uri ?? RI?.resource ?? null;
                return {
                  resource: RIUri && typeof RIUri === "object" ? RIUri : typeof RIUri === "string" ? RIUri : null,
                  message: String(RI?.message ?? ""),
                  startLineNumber: RIStart.line + 1,
                  startColumn: RIStart.character + 1,
                  endLineNumber: RIEnd.line + 1,
                  endColumn: RIEnd.character + 1
                };
              }
            );
          }
          return Out;
        }, "NormaliseDiagnostic");
        const NormaliseList = /* @__PURE__ */ __name((List) => {
          if (!Array.isArray(List)) return [];
          const Result = [];
          for (const Item of List) {
            try {
              Result.push(NormaliseDiagnostic(Item));
            } catch {
            }
          }
          return Result;
        }, "NormaliseList");
        let Disposed = false;
        return {
          name: Owner,
          set: /* @__PURE__ */ __name((UriOrEntries, Diagnostics) => {
            if (Array.isArray(UriOrEntries) && Diagnostics === void 0) {
              const Entries = UriOrEntries;
              for (const [Uri, D] of Entries) {
                Store.set(UriKey(Uri), D ?? []);
              }
            } else {
              Store.set(UriKey(UriOrEntries), Diagnostics ?? []);
            }
            _AllDiagnostics.set(Owner, new Map(Store));
            Context13.Emitter.emit("diagnostics.didChange", {
              uris: [...Store.keys()]
            });
            Context13.MountainClient?.sendRequest("Diagnostic.Set", [
              Owner,
              [...Store.entries()].map(([U, D]) => [
                U,
                NormaliseList(D)
              ])
            ]).catch(() => {
            });
          }, "set"),
          delete: /* @__PURE__ */ __name((Uri) => {
            Store.delete(UriKey(Uri));
            _AllDiagnostics.set(Owner, new Map(Store));
            Context13.Emitter.emit("diagnostics.didChange", {
              uris: [UriKey(Uri)]
            });
            Context13.MountainClient?.sendRequest("Diagnostic.Set", [
              Owner,
              [...Store.entries()].map(([U, D]) => [
                U,
                NormaliseList(D)
              ])
            ]).catch(() => {
            });
          }, "delete"),
          clear: /* @__PURE__ */ __name(() => {
            if (Store.size === 0) return;
            Store.clear();
            _AllDiagnostics.delete(Owner);
            Context13.Emitter.emit("diagnostics.didChange", { uris: [] });
            Context13.MountainClient?.sendRequest("Diagnostic.Clear", [
              Owner
            ]).catch(() => {
            });
          }, "clear"),
          forEach: /* @__PURE__ */ __name((Callback) => {
            const Self = null;
            for (const [Uri, Diagnostics] of Store) {
              try {
                Callback(Uri, Diagnostics, Self);
              } catch {
              }
            }
          }, "forEach"),
          get: /* @__PURE__ */ __name((Uri) => Store.get(UriKey(Uri)) ?? [], "get"),
          has: /* @__PURE__ */ __name((Uri) => Store.has(UriKey(Uri)), "has"),
          dispose: /* @__PURE__ */ __name(() => {
            if (Disposed) return;
            Disposed = true;
            if (Store.size === 0) return;
            Store.clear();
            Context13.MountainClient?.sendRequest("Diagnostic.Clear", [
              Owner
            ]).catch(() => {
            });
          }, "dispose")
        };
      }, "createDiagnosticCollection"),
      getLanguages: /* @__PURE__ */ __name(async () => {
        try {
          const Result = await Context13.MountainClient?.sendRequest(
            "Languages.GetAll",
            []
          );
          return Array.isArray(Result) ? Result : [];
        } catch {
          return [];
        }
      }, "getLanguages"),
      setTextDocumentLanguage: /* @__PURE__ */ __name(async (Document, LanguageId) => {
        const Uri = Document?.uri?.toString?.() ?? "";
        Context13.SendToMountain("languages.setDocumentLanguage", {
          uri: Uri,
          languageId: LanguageId
        }).catch(() => {
        });
        try {
          if (Document && typeof Document === "object") {
            Document.languageId = LanguageId;
          }
          const TextDocs = Context13.__textDocuments;
          if (Array.isArray(TextDocs)) {
            const Match = TextDocs.find(
              (D) => D?.uri?.toString?.() === Uri || D?.fileName === Uri
            );
            if (Match) Match.languageId = LanguageId;
          }
        } catch {
        }
        return Document;
      }, "setTextDocumentLanguage"),
      // Per-language configuration (auto-closing pairs, comments, onEnterRules,
      // wordPattern, indentation). rust-analyzer calls this at activation with
      // its Rust-specific IndentAction rules. Forward through Mountain's
      // `set_language_configuration` gRPC notification so Sky can relay
      // to Monaco's `monaco.languages.setLanguageConfiguration(...)`.
      setLanguageConfiguration: /* @__PURE__ */ __name((LanguageId, Configuration3) => {
        Context13.SendToMountain("set_language_configuration", {
          language: LanguageId,
          configuration: Configuration3 ?? {}
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        };
      }, "setLanguageConfiguration"),
      match: /* @__PURE__ */ __name((Selector, Document) => {
        const DocLanguage = typeof Document?.languageId === "string" ? Document.languageId : "";
        const DocScheme = typeof Document?.uri?.scheme === "string" ? Document.uri.scheme : "";
        const DocPath = typeof Document?.uri?.fsPath === "string" ? Document.uri.fsPath : typeof Document?.uri?.path === "string" ? Document.uri.path : "";
        const ScoreOne = /* @__PURE__ */ __name((One) => {
          if (typeof One === "string") {
            if (One === DocLanguage) return 10;
            if (One === "*") return 5;
            return 0;
          }
          if (!One || typeof One !== "object") return 0;
          const Filter = One;
          let Score = 0;
          if (typeof Filter.language === "string") {
            if (Filter.language === DocLanguage) Score += 5;
            else if (Filter.language === "*") Score += 3;
            else return 0;
          }
          if (typeof Filter.scheme === "string") {
            if (Filter.scheme === DocScheme) Score += 5;
            else if (Filter.scheme === "*") Score += 3;
            else return 0;
          }
          if (typeof Filter.pattern === "string" && DocPath.length > 0) {
            try {
              if (Regex_default(Filter.pattern).test(DocPath))
                Score += 5;
              else return 0;
            } catch {
              return 0;
            }
          }
          if (typeof Filter.notebookType === "string") {
            const NotebookType = typeof Document?.notebook?.notebookType === "string" ? Document.notebook.notebookType : "";
            if (Filter.notebookType === NotebookType) Score += 1;
            else if (Filter.notebookType === "*") Score += 1;
            else return 0;
          }
          return Score;
        }, "ScoreOne");
        if (Array.isArray(Selector)) {
          let Best = 0;
          for (const One of Selector) {
            const Value = ScoreOne(One);
            if (Value > Best) Best = Value;
          }
          return Best;
        }
        return ScoreOne(Selector);
      }, "match"),
      onDidChangeDiagnostics: /* @__PURE__ */ __name((Listener) => {
        Context13.Emitter.on("diagnostics.didChange", Listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Context13.Emitter.off("diagnostics.didChange", Listener);
          }, "dispose")
        };
      }, "onDidChangeDiagnostics"),
      getDiagnostics: /* @__PURE__ */ __name((Resource) => {
        if (Resource !== void 0) {
          const Key = UriKey(Resource);
          const Merged = [];
          for (const OwnerStore of _AllDiagnostics.values()) {
            const Diags = OwnerStore.get(Key);
            if (Diags) Merged.push(...Diags);
          }
          return Merged;
        }
        const All = /* @__PURE__ */ new Map();
        for (const OwnerStore of _AllDiagnostics.values()) {
          for (const [Uri, Diags] of OwnerStore.entries()) {
            const Existing = All.get(Uri);
            if (Existing) {
              Existing.push(...Diags);
            } else {
              All.set(Uri, [...Diags]);
            }
          }
        }
        return [...All.entries()];
      }, "getDiagnostics"),
      registerDocumentPasteEditProvider: /* @__PURE__ */ __name((Selector, Provider, _Metadata) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_paste_edit_provider",
        Selector,
        Provider
      ), "registerDocumentPasteEditProvider"),
      registerDocumentDropEditProvider: /* @__PURE__ */ __name((Selector, Provider, _Metadata) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_document_drop_edit_provider",
        Selector,
        Provider
      ), "registerDocumentDropEditProvider"),
      registerInlineCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_inline_completion_item_provider",
        Selector,
        Provider
      ), "registerInlineCompletionItemProvider"),
      registerInlineEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_inline_edit_provider",
        Selector,
        Provider
      ), "registerInlineEditProvider"),
      registerMultiDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_multi_document_highlight_provider",
        Selector,
        Provider
      ), "registerMultiDocumentHighlightProvider"),
      registerMappedEditsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
        Context13,
        LanguageProviderRegistry,
        "register_mapped_edits_provider",
        Selector,
        Provider
      ), "registerMappedEditsProvider"),
      // Proposed API. Language servers (rust-analyzer, pyright, TS) opt in
      // via `enabledApiProposals` to publish server-computed rename
      // candidates. Stub disposable keeps activation quiet; real wiring
      // routes through `registerRenameProvider` today for the stable path.
      registerNewSymbolNamesProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "registerNewSymbolNamesProvider"),
      createLanguageStatusItem: /* @__PURE__ */ __name((Identifier, _Selector) => {
        process.stdout.write(
          `[LandFix:LangNs] createLanguageStatusItem id=${Identifier}
`
        );
        const Item = {
          id: Identifier,
          name: void 0,
          selector: _Selector,
          severity: 0,
          text: "",
          detail: void 0,
          busy: false,
          command: void 0,
          accessibilityInformation: void 0,
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        };
        return Item;
      }, "createLanguageStatusItem")
    }), "CreateLanguagesNamespace");
    Namespace_default7 = CreateLanguagesNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Extensions/Namespace.ts
var WrapExtensionsNamespace, Namespace_default8;
var init_Namespace10 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Extensions/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapExtensionsNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("extensions", Concrete), "WrapExtensionsNamespace");
    Namespace_default8 = WrapExtensionsNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Extensions/Namespace.ts
var Namespace_exports5 = {};
__export(Namespace_exports5, {
  default: () => Namespace_default9
});
var NoopDisposable2, MakeMultiStub, Stub, MakePermissiveExports, NormalizeLocation, ToExtensionObject, IsExtensionKey, SafeExtensionList, CreateExtensionsNamespace, Namespace_default9;
var init_Namespace11 = __esm({
  "Source/Services/Handler/VscodeAPI/Extensions/Namespace.ts"() {
    "use strict";
    init_Log2();
    init_Namespace10();
    NoopDisposable2 = { dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") };
    MakeMultiStub = /* @__PURE__ */ __name(() => {
      const StubTarget = /* @__PURE__ */ __name(function MultiStub() {
        return StubProxy;
      }, "MultiStub");
      StubTarget.dispose = () => {
      };
      StubTarget[Symbol.iterator] = function* () {
      };
      const ArrayShim = [];
      const ArrayMethods = [
        "forEach",
        "map",
        "filter",
        "find",
        "findIndex",
        "some",
        "every",
        "reduce",
        "reduceRight",
        "includes",
        "indexOf",
        "lastIndexOf",
        "slice",
        "concat",
        "join",
        "entries",
        "keys",
        "values",
        "flat",
        "flatMap"
      ];
      for (const Name of ArrayMethods) {
        StubTarget[Name] = ArrayShim[Name];
      }
      const StubProxy = new Proxy(StubTarget, {
        get(Target, Property) {
          if (Property in Target) {
            return Target[Property];
          }
          if (Property === "then") return void 0;
          if (typeof Property === "symbol") return void 0;
          return StubProxy;
        },
        apply() {
          return StubProxy;
        },
        has() {
          return true;
        }
      });
      return StubProxy;
    }, "MakeMultiStub");
    Stub = MakeMultiStub();
    MakePermissiveExports = /* @__PURE__ */ __name(() => {
      const Base = {
        enabled: true
      };
      return new Proxy(Base, {
        get(Target, Property) {
          if (Property in Target) {
            return Target[Property];
          }
          if (typeof Property !== "string") {
            return Stub[Property];
          }
          if (Property === "then") return void 0;
          if (Property.startsWith("onDid") || Property.startsWith("onWill")) {
            return (_Listener) => NoopDisposable2;
          }
          if (Property.startsWith("register")) {
            return (..._Args) => NoopDisposable2;
          }
          if (Property.startsWith("get") || Property.startsWith("create")) {
            return (..._Args) => MakePermissiveExports();
          }
          return Stub;
        }
      });
    }, "MakePermissiveExports");
    NormalizeLocation = /* @__PURE__ */ __name((Raw2) => {
      const VsCodeUri = globalThis.__cocoonVscodeAPI?.Uri;
      const UriFactoryAvailable = VsCodeUri && typeof VsCodeUri.file === "function";
      const MakeUri = /* @__PURE__ */ __name((Path) => {
        if (UriFactoryAvailable) {
          return VsCodeUri.file(Path);
        }
        return {
          scheme: "file",
          authority: "",
          path: Path,
          query: "",
          fragment: "",
          fsPath: Path,
          with(Change) {
            return { ...this, ...Change };
          },
          toString: /* @__PURE__ */ __name(() => `file://${Path}`, "toString"),
          toJSON() {
            return { scheme: "file", path: Path };
          }
        };
      }, "MakeUri");
      if (typeof Raw2 === "string" && Raw2.length > 0) {
        let Path = Raw2;
        if (Raw2.startsWith("file:")) {
          try {
            Path = decodeURIComponent(new URL(Raw2).pathname);
          } catch (Error2) {
            Log_default2.Warn(
              "ExtNs",
              `URL parse failed for ${Raw2}: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}; using fallback strip`
            );
            Path = Raw2.replace(/^file:\/\//, "");
          }
        }
        Path = Path.replace(/\/$/, "");
        if (UriFactoryAvailable) {
          Log_default2.DebugOnce(
            "ExtNs",
            `string:${Path}`,
            `string extensionLocation ${Raw2} \u2192 path=${Path} (factory=real)`
          );
        } else {
          Log_default2.InfoOnce(
            "ExtNs",
            `string-fallback:${Path}`,
            `string extensionLocation ${Raw2} \u2192 path=${Path} (factory=FALLBACK)`
          );
        }
        return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
      }
      if (Raw2 && typeof Raw2 === "object") {
        const Obj = Raw2;
        const Path = typeof Obj["fsPath"] === "string" && Obj["fsPath"] || typeof Obj["path"] === "string" && Obj["path"] || (typeof Obj["external"] === "string" ? NormalizeLocation(Obj["external"]).ExtensionPath : "");
        if (UriFactoryAvailable) {
          Log_default2.DebugOnce(
            "ExtNs",
            `object:${Path}`,
            `object extensionLocation keys=[${Object.keys(Obj).join(",")}] \u2192 path=${Path} (factory=real)`
          );
        } else {
          Log_default2.InfoOnce(
            "ExtNs",
            `object-fallback:${Path}`,
            `object extensionLocation keys=[${Object.keys(Obj).join(",")}] \u2192 path=${Path} (factory=FALLBACK)`
          );
        }
        return { ExtensionPath: Path, ExtensionUri: MakeUri(Path) };
      }
      Log_default2.Warn(
        "ExtNs",
        `extensionLocation missing or unsupported type: ${typeof Raw2}; using empty path`
      );
      return { ExtensionPath: "", ExtensionUri: MakeUri("") };
    }, "NormalizeLocation");
    ToExtensionObject = /* @__PURE__ */ __name((_Context, Id, Raw2) => {
      const RealExports = Raw2?.__exports ?? Raw2?.exports;
      const Exports = RealExports !== void 0 && RealExports !== null ? RealExports : MakePermissiveExports();
      const { ExtensionPath, ExtensionUri } = NormalizeLocation(
        Raw2?.extensionLocation
      );
      const SafePackageJSON = Raw2 && typeof Raw2 === "object" ? {
        ...Raw2,
        name: typeof Raw2.name === "string" && Raw2.name.length > 0 ? Raw2.name : Id,
        version: typeof Raw2.version === "string" && Raw2.version.length > 0 ? Raw2.version : "0.0.0",
        publisher: typeof Raw2.publisher === "string" ? Raw2.publisher : Id.split(".")[0] ?? "unknown"
      } : {
        name: Id,
        version: "0.0.0",
        publisher: Id.split(".")[0] ?? "unknown"
      };
      return {
        id: Id,
        extensionUri: ExtensionUri,
        extensionPath: ExtensionPath,
        // Reporting `isActive: true` mirrors VS Code's behaviour for
        // built-ins that have completed activation; without it, callers
        // like the `github` extension treat the extension as missing.
        isActive: true,
        packageJSON: SafePackageJSON,
        extensionKind: 1,
        exports: Exports,
        // Critical: `activate()` must resolve to the SAME exports object
        // so consumers like `vscode.github` can chain
        // `gitExtension.activate().then(api => api.onDidChangeEnablement(...))`.
        activate: /* @__PURE__ */ __name(async () => Exports, "activate")
      };
    }, "ToExtensionObject");
    IsExtensionKey = /* @__PURE__ */ __name((Key) => !Key.startsWith("__"), "IsExtensionKey");
    SafeExtensionList = /* @__PURE__ */ __name((Context13) => {
      const Out = [];
      for (const [Id, Raw2] of Context13.ExtensionRegistry.entries()) {
        if (!IsExtensionKey(Id)) continue;
        try {
          Out.push(ToExtensionObject(Context13, Id, Raw2));
        } catch {
        }
      }
      return Out;
    }, "SafeExtensionList");
    CreateExtensionsNamespace = /* @__PURE__ */ __name((Context13) => Namespace_default8({
      getExtension: /* @__PURE__ */ __name((Identifier) => {
        if (!IsExtensionKey(Identifier)) return void 0;
        const Raw2 = Context13.ExtensionRegistry.get(Identifier);
        if (!Raw2) return void 0;
        try {
          return ToExtensionObject(Context13, Identifier, Raw2);
        } catch {
          return void 0;
        }
      }, "getExtension"),
      get all() {
        return SafeExtensionList(Context13);
      },
      // Some extensions (html-language-features) iterate
      // `extensions.allAcrossExtensionHosts`; return the same array as `all`
      // so `for (...of...)` does not throw on `is not iterable`.
      get allAcrossExtensionHosts() {
        return SafeExtensionList(Context13);
      },
      onDidChange: /* @__PURE__ */ __name((Listener) => {
        const SafeListener = /* @__PURE__ */ __name(() => {
          try {
            Listener();
          } catch {
          }
        }, "SafeListener");
        Context13.Emitter.on("deltaExtensions", SafeListener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Context13.Emitter.off("deltaExtensions", SafeListener);
          }, "dispose")
        };
      }, "onDidChange")
    }), "CreateExtensionsNamespace");
    Namespace_default9 = CreateExtensionsNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Env/Namespace.ts
var WrapEnvNamespace, Namespace_default10;
var init_Namespace12 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Env/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapEnvNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("env", Concrete), "WrapEnvNamespace");
    Namespace_default10 = WrapEnvNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Env/Namespace.ts
var Namespace_exports6 = {};
__export(Namespace_exports6, {
  default: () => Namespace_default11
});
var CreateEnvNamespace, Namespace_default11;
var init_Namespace13 = __esm({
  "Source/Services/Handler/VscodeAPI/Env/Namespace.ts"() {
    "use strict";
    init_Log2();
    init_Namespace12();
    CreateEnvNamespace = /* @__PURE__ */ __name((Context13) => {
      const Env = Context13.ExtensionHostInitData?.environment ?? {};
      const NormalizeAppRoot = /* @__PURE__ */ __name((Raw2) => {
        if (typeof Raw2 !== "string" || Raw2.length === 0) {
          Log_default2.Warn(
            "EnvNs",
            "appRoot empty or non-string, returning ''"
          );
          return "";
        }
        if (!Raw2.startsWith("file:")) {
          Log_default2.Info("EnvNs", `appRoot already plain path: ${Raw2}`);
          return Raw2;
        }
        try {
          const Normalised = decodeURIComponent(
            new URL(Raw2).pathname
          ).replace(/\/$/, "");
          Log_default2.Info(
            "EnvNs",
            `appRoot normalised file-URL ${Raw2} \u2192 ${Normalised}`
          );
          return Normalised;
        } catch (Error2) {
          const Fallback = Raw2.replace(/^file:\/\//, "").replace(/\/$/, "");
          Log_default2.Warn(
            "EnvNs",
            `appRoot URL parse failed; fallback ${Raw2} \u2192 ${Fallback}`,
            {
              error: Error2 instanceof globalThis.Error ? Error2.message : String(Error2)
            }
          );
          return Fallback;
        }
      }, "NormalizeAppRoot");
      const Call2 = /* @__PURE__ */ __name(async (Method, Parameters) => {
        try {
          return await Context13.MountainClient?.sendRequest(
            Method,
            Parameters
          );
        } catch {
          return void 0;
        }
      }, "Call");
      const Concrete = {
        appName: Env["appName"] ?? "fiddee",
        appRoot: NormalizeAppRoot(Env["appRoot"]),
        appHost: Env["appHost"] ?? "desktop",
        uiKind: 1,
        // vscode.UIKind.Desktop
        language: Env["language"] ?? "en",
        machineId: Context13.ExtensionHostInitData?.telemetry?.machineId ?? Env["machineId"] ?? "fiddee",
        sessionId: Env["sessionId"] ?? `land-session-${Date.now().toString(36)}`,
        // VS Code build identity strings. `vscode.tunnel-forwarding` and
        // other extensions read `appCommit?.substring(0, 7)` to surface a
        // short SHA in their telemetry / status bar. Returning the
        // heuristic Proxy fallback (a function) crashes that call with
        // `appCommit?.substring is not a function`. Default to empty
        // string so optional-chained reads short-circuit cleanly; populate
        // from build env when a real commit hash is available.
        appCommit: Env["appCommit"] ?? "",
        appQuality: Env["appQuality"] ?? "stable",
        isNewAppInstall: false,
        isAppPortable: false,
        isTelemetryEnabled: false,
        onDidChangeTelemetryEnabled: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeTelemetryEnabled"),
        // Land's bundled shell is fixed for the session; there's no UI to
        // switch it, so this event can never fire. Stub preserves the
        // disposable contract extensions rely on at activation time.
        onDidChangeShell: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeShell"),
        uriScheme: Env["uriScheme"] ?? "vscode",
        shell: Env["shell"] ?? process.env["SHELL"] ?? "",
        remoteName: void 0,
        clipboard: {
          // Primary path: Mountain's Clipboard.Read / Clipboard.Write (when
          // routed). Fallback: native OS clipboard CLI - pbcopy/pbpaste on
          // macOS, xclip/wl-paste on Linux, clip/Get-Clipboard on Windows.
          // Each branch swallows errors so the extension host never crashes
          // on an unavailable clipboard subsystem.
          readText: /* @__PURE__ */ __name(async () => {
            const FromMountain = await Call2("Clipboard.Read", []);
            if (typeof FromMountain === "string") return FromMountain;
            try {
              const { spawn } = await import("node:child_process");
              const Candidates = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [
                [
                  "powershell.exe",
                  [
                    "-NoProfile",
                    "-Command",
                    "Get-Clipboard -Raw"
                  ]
                ]
              ] : [
                ["wl-paste", ["-n"]],
                [
                  "xclip",
                  ["-selection", "clipboard", "-o"]
                ],
                ["xsel", ["--clipboard", "--output"]]
              ];
              for (const [Cmd, Args] of Candidates) {
                const Text = await new Promise(
                  (Resolve) => {
                    const Child = spawn(Cmd, Args, {
                      stdio: ["ignore", "pipe", "ignore"]
                    });
                    let Out = "";
                    Child.stdout.on(
                      "data",
                      (Chunk) => Out += Chunk.toString("utf8")
                    );
                    Child.once("error", () => Resolve(void 0));
                    Child.once(
                      "close",
                      (Code) => Resolve(Code === 0 ? Out : void 0)
                    );
                  }
                );
                if (Text !== void 0) return Text;
              }
            } catch {
            }
            return "";
          }, "readText"),
          writeText: /* @__PURE__ */ __name(async (Value) => {
            await Call2("Clipboard.Write", [Value]);
            try {
              const { spawn } = await import("node:child_process");
              const Candidates = process.platform === "darwin" ? [["pbcopy", []]] : process.platform === "win32" ? [["clip.exe", []]] : [
                ["wl-copy", []],
                ["xclip", ["-selection", "clipboard"]],
                ["xsel", ["--clipboard", "--input"]]
              ];
              for (const [Cmd, Args] of Candidates) {
                const Ok = await new Promise((Resolve) => {
                  const Child = spawn(Cmd, Args, {
                    stdio: ["pipe", "ignore", "ignore"]
                  });
                  Child.once("error", () => Resolve(false));
                  Child.once("close", (Code) => Resolve(Code === 0));
                  try {
                    Child.stdin.end(Value);
                  } catch {
                    Resolve(false);
                  }
                });
                if (Ok) return;
              }
            } catch {
            }
          }, "writeText")
        },
        openExternal: /* @__PURE__ */ __name(async (Target) => {
          const Url = typeof Target === "string" ? Target : String(Target);
          const OkFromMountain = await Call2(
            "NativeHost.OpenExternal",
            [Url]
          );
          if (OkFromMountain === true) return true;
          try {
            const { spawn } = await import("node:child_process");
            const Command = process.platform === "darwin" ? ["open", [Url]] : process.platform === "win32" ? ["cmd.exe", ["/c", "start", "", Url]] : ["xdg-open", [Url]];
            const Ok = await new Promise((Resolve) => {
              const Child = spawn(Command[0], Command[1], {
                stdio: "ignore",
                detached: true
              });
              const Timer = setTimeout(() => {
                try {
                  Child.kill();
                } catch {
                }
                Resolve(false);
              }, 2e3);
              Child.once("error", () => {
                clearTimeout(Timer);
                Resolve(false);
              });
              Child.once("close", (Code) => {
                clearTimeout(Timer);
                Resolve(Code === 0);
              });
              Child.unref();
            });
            return Ok;
          } catch {
            return false;
          }
        }, "openExternal"),
        asExternalUri: /* @__PURE__ */ __name(async (Target) => Target, "asExternalUri"),
        createTelemetryLogger: /* @__PURE__ */ __name((_Sender, _Options) => ({
          isUsageEnabled: false,
          isErrorsEnabled: false,
          onDidChangeEnableStates: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") }), "onDidChangeEnableStates"),
          logUsage: /* @__PURE__ */ __name((_EventName, _Data) => {
          }, "logUsage"),
          logError: /* @__PURE__ */ __name((_EventNameOrError, _Data) => {
          }, "logError"),
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "createTelemetryLogger"),
        logLevel: 2,
        onDidChangeLogLevel: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeLogLevel")
      };
      return Namespace_default10(Concrete);
    }, "CreateEnvNamespace");
    Namespace_default11 = CreateEnvNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Debug/Namespace.ts
var WrapDebugNamespace, Namespace_default12;
var init_Namespace14 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Debug/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapDebugNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("debug", Concrete), "WrapDebugNamespace");
    Namespace_default12 = WrapDebugNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Debug/Namespace.ts
var Namespace_exports7 = {};
__export(Namespace_exports7, {
  default: () => Namespace_default13
});
var EventSubscriber2, InitialiseDAPSessionTracker, CreateDebugNamespace, Namespace_default13;
var init_Namespace15 = __esm({
  "Source/Services/Handler/VscodeAPI/Debug/Namespace.ts"() {
    "use strict";
    init_Registry();
    init_Namespace14();
    EventSubscriber2 = /* @__PURE__ */ __name((Context13, EventName) => (Listener) => {
      Context13.Emitter.on(EventName, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.Emitter.off(EventName, Listener);
        }, "dispose")
      };
    }, "EventSubscriber");
    InitialiseDAPSessionTracker = /* @__PURE__ */ __name((Context13) => {
      const Anchor = Context13;
      if (Anchor.__dapTrackerInstalled) {
        return;
      }
      Anchor.__dapTrackerInstalled = true;
      Anchor.__dapAdapters ??= /* @__PURE__ */ new Map();
      const ResolveFactory = /* @__PURE__ */ __name((DebugType) => {
        const FactoryKey = `__debugAdapterFactory:${DebugType}`;
        return Context13.ExtensionRegistry?.get(FactoryKey);
      }, "ResolveFactory");
      Context13.Emitter.on("debug.didStartSession", (Session) => {
        const SessionId = Session?.id ?? Session?.sessionId;
        const DebugType = Session?.type ?? Session?.configuration?.type;
        if (!SessionId || !DebugType) return;
        const Factory = ResolveFactory(String(DebugType));
        if (!Factory) return;
        try {
          const Descriptor = Factory.createDebugAdapterDescriptor?.(
            Session,
            void 0
          );
          const Resolve = /* @__PURE__ */ __name((Value) => {
            const Impl = Value?.implementation ?? Value;
            if (!Impl || typeof Impl.handleMessage !== "function") return;
            try {
              Impl.onDidSendMessage?.((Message) => {
                Context13.SendToMountain("debug.dap-response", {
                  sessionId: SessionId,
                  message: Message
                }).catch(() => {
                });
              });
            } catch {
            }
            Anchor.__dapAdapters.set(String(SessionId), Impl);
          }, "Resolve");
          if (Descriptor && typeof Descriptor.then === "function") {
            Descriptor.then(Resolve, () => {
            });
          } else {
            Resolve(Descriptor);
          }
        } catch {
        }
      });
      Context13.Emitter.on("debug.didTerminateSession", (Session) => {
        const SessionId = Session?.id ?? Session?.sessionId;
        if (!SessionId) return;
        const Adapter = Anchor.__dapAdapters.get(String(SessionId));
        try {
          Adapter?.dispose?.();
        } catch {
        }
        Anchor.__dapAdapters.delete(String(SessionId));
      });
    }, "InitialiseDAPSessionTracker");
    CreateDebugNamespace = /* @__PURE__ */ __name((Context13) => {
      InitialiseDAPSessionTracker(Context13);
      return Namespace_default12({
        registerDebugAdapterDescriptorFactory: /* @__PURE__ */ __name((DebugType, Factory) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_debug_adapter", {
            handle: Handle,
            debugType: DebugType,
            extensionId: ""
          }).catch(() => {
          });
          const FactoryKey = `__debugAdapterFactory:${DebugType}`;
          Context13.ExtensionRegistry.set(FactoryKey, Factory);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(FactoryKey);
              Context13.SendToMountain("unregister_debug_adapter", {
                handle: Handle
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerDebugAdapterDescriptorFactory"),
        registerDebugConfigurationProvider: /* @__PURE__ */ __name((DebugType, Provider, _TriggerKind) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_debug_configuration_provider", {
            handle: Handle,
            debugType: DebugType
          }).catch(() => {
          });
          const ProviderKey = `__debugConfigProvider:${Handle}`;
          Context13.ExtensionRegistry.set(ProviderKey, Provider);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(ProviderKey);
              Context13.SendToMountain(
                "unregister_debug_configuration_provider",
                {
                  handle: Handle
                }
              ).catch(() => {
              });
            }, "dispose")
          };
        }, "registerDebugConfigurationProvider"),
        registerDebugAdapterTrackerFactory: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerDebugAdapterTrackerFactory"),
        // Proposed API (`vscode.proposed.debugVisualization.d.ts`). Custom
        // debug-variable renderers (e.g. Microsoft's JS debugger providing
        // rich object views) opt in via `enabledApiProposals`. Stub until a
        // renderer consumer lands - real wiring routes through Mountain's
        // DebugService.
        registerDebugVisualizationProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerDebugVisualizationProvider"),
        registerDebugVisualizationTreeProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerDebugVisualizationTreeProvider"),
        startDebugging: /* @__PURE__ */ __name(async (Folder, NameOrConfig, ParentSession) => {
          try {
            const Response = await Context13.MountainClient?.sendRequest(
              "Debug.Start",
              [Folder, NameOrConfig, ParentSession]
            );
            return Boolean(Response?.success);
          } catch {
            return false;
          }
        }, "startDebugging"),
        stopDebugging: /* @__PURE__ */ __name(async (Session) => {
          try {
            const SessionId = typeof Session === "string" ? Session : Session?.id ?? "";
            await Context13.MountainClient?.sendRequest("Debug.Stop", [
              SessionId
            ]);
          } catch {
          }
        }, "stopDebugging"),
        addBreakpoints: /* @__PURE__ */ __name((Breakpoints) => {
          const All = Context13.__breakpoints ??= [];
          All.push(...Breakpoints);
          Context13.SendToMountain("debug.addBreakpoints", {
            breakpoints: Breakpoints
          }).catch(() => {
          });
        }, "addBreakpoints"),
        removeBreakpoints: /* @__PURE__ */ __name((Breakpoints) => {
          const All = Context13.__breakpoints ??= [];
          const Ids = new Set(Breakpoints.map((B) => B?.id));
          Context13.__breakpoints = All.filter(
            (B) => !Ids.has(B?.id)
          );
          Context13.SendToMountain("debug.removeBreakpoints", {
            breakpoints: Breakpoints
          }).catch(() => {
          });
        }, "removeBreakpoints"),
        asDebugSourceUri: /* @__PURE__ */ __name((Source) => Source, "asDebugSourceUri"),
        onDidStartDebugSession: EventSubscriber2(
          Context13,
          "debug.didStartSession"
        ),
        onDidTerminateDebugSession: EventSubscriber2(
          Context13,
          "debug.didTerminateSession"
        ),
        onDidChangeActiveDebugSession: EventSubscriber2(
          Context13,
          "debug.didChangeActiveSession"
        ),
        onDidReceiveDebugSessionCustomEvent: EventSubscriber2(
          Context13,
          "debug.didReceiveCustomEvent"
        ),
        onDidChangeBreakpoints: EventSubscriber2(
          Context13,
          "debug.didChangeBreakpoints"
        ),
        get activeDebugSession() {
          return Context13.__activeDebugSession ?? void 0;
        },
        activeDebugConsole: {
          append: /* @__PURE__ */ __name((Value) => {
            Context13.SendToMountain("debug.consoleAppend", {
              value: Value
            }).catch(() => {
            });
          }, "append"),
          appendLine: /* @__PURE__ */ __name((Value) => {
            Context13.SendToMountain("debug.consoleAppend", {
              value: `${Value}
`
            }).catch(() => {
            });
          }, "appendLine")
        },
        get breakpoints() {
          return Context13.__breakpoints ?? [];
        },
        // Stable 1.88+ surface: current selected debug stack item. Land's
        // debug service doesn't track per-frame selection yet, so this reads
        // as undefined and the associated event never fires. Real subscribe
        // path is still a proper disposable so the extension teardown works.
        activeStackItem: void 0,
        onDidChangeActiveStackItem: EventSubscriber2(
          Context13,
          "debug.didChangeActiveStackItem"
        )
      });
    }, "CreateDebugNamespace");
    Namespace_default13 = CreateDebugNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Tasks/Namespace.ts
var WrapTasksNamespace, Namespace_default14;
var init_Namespace16 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Tasks/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapTasksNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("tasks", Concrete), "WrapTasksNamespace");
    Namespace_default14 = WrapTasksNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Tasks/Namespace.ts
var Namespace_exports8 = {};
__export(Namespace_exports8, {
  default: () => Namespace_default15
});
var EventSubscriber3, CreateTasksNamespace, Namespace_default15;
var init_Namespace17 = __esm({
  "Source/Services/Handler/VscodeAPI/Tasks/Namespace.ts"() {
    "use strict";
    init_Registry();
    init_Namespace16();
    EventSubscriber3 = /* @__PURE__ */ __name((Context13, EventName) => (Listener) => {
      Context13.Emitter.on(EventName, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.Emitter.off(EventName, Listener);
        }, "dispose")
      };
    }, "EventSubscriber");
    CreateTasksNamespace = /* @__PURE__ */ __name((Context13) => {
      const Executions = /* @__PURE__ */ new Map();
      Context13.Emitter.on(
        "task.didStart",
        (Event) => {
          const Id = String(Event?.execution?.id ?? Event?.id ?? "");
          if (Id && Event?.execution) {
            Executions.set(Id, Event.execution);
          }
        }
      );
      Context13.Emitter.on(
        "task.didEnd",
        (Event) => {
          const Id = String(Event?.execution?.id ?? Event?.id ?? "");
          if (Id) {
            Executions.delete(Id);
          }
        }
      );
      return Namespace_default14({
        registerTaskProvider: /* @__PURE__ */ __name((TaskType, Provider) => {
          const Handle = NextProviderHandle();
          Context13.SendToMountain("register_task_provider", {
            handle: Handle,
            type: TaskType,
            extensionId: ""
          }).catch(() => {
          });
          const ProviderKey = `__taskProvider:${Handle}`;
          Context13.ExtensionRegistry.set(ProviderKey, Provider);
          return {
            dispose: /* @__PURE__ */ __name(() => {
              Context13.ExtensionRegistry.delete(ProviderKey);
              Context13.SendToMountain("unregister_task_provider", {
                handle: Handle
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerTaskProvider"),
        fetchTasks: /* @__PURE__ */ __name(async (Filter) => {
          try {
            const Response = await Context13.MountainClient?.sendRequest(
              "Task.Fetch",
              [Filter]
            );
            return Array.isArray(Response) ? Response : [];
          } catch {
            return [];
          }
        }, "fetchTasks"),
        // Return a real TaskExecution object: `{ task, terminate() }`.
        // Extensions chain `.terminate()` on the returned value when they
        // need to kill a long-running task (test runners cancelling a
        // previous run before launching a new one). A bare null silently
        // breaks this pattern.
        executeTask: /* @__PURE__ */ __name(async (Task) => {
          try {
            const Response = await Context13.MountainClient?.sendRequest(
              "Task.Execute",
              [Task]
            );
            const Resolved = Response;
            const TaskId = String(Resolved?.id ?? "");
            const Execution = {
              task: Resolved?.task ?? Task,
              terminate: /* @__PURE__ */ __name(() => {
                Context13.SendToMountain("terminate_task", {
                  id: TaskId
                }).catch(() => {
                });
                Executions.delete(TaskId);
              }, "terminate")
            };
            if (TaskId) Executions.set(TaskId, Execution);
            return Execution;
          } catch {
            return void 0;
          }
        }, "executeTask"),
        onDidStartTask: EventSubscriber3(Context13, "task.didStart"),
        onDidEndTask: EventSubscriber3(Context13, "task.didEnd"),
        onDidStartTaskProcess: EventSubscriber3(Context13, "task.didStartProcess"),
        onDidEndTaskProcess: EventSubscriber3(Context13, "task.didEndProcess"),
        // Live getter so iteration sees current executions, not the
        // snapshot at module-construction time.
        get taskExecutions() {
          return Array.from(Executions.values());
        }
      });
    }, "CreateTasksNamespace");
    Namespace_default15 = CreateTasksNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Scm/Namespace.ts
var WrapScmNamespace, Namespace_default16;
var init_Namespace18 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Scm/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapScmNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("scm", Concrete), "WrapScmNamespace");
    Namespace_default16 = WrapScmNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Scm/Namespace.ts
var Namespace_exports9 = {};
__export(Namespace_exports9, {
  default: () => Namespace_default17
});
var ScmTraceEnabled, ScmTrace, SanitizeResourceState, CreateScmNamespace, Namespace_default17;
var init_Namespace19 = __esm({
  "Source/Services/Handler/VscodeAPI/Scm/Namespace.ts"() {
    "use strict";
    init_Registry();
    init_Heuristics();
    init_Namespace18();
    ScmTraceEnabled = typeof process !== "undefined" && typeof process.env["Trace"] === "string";
    ScmTrace = /* @__PURE__ */ __name((Message) => {
      if (!ScmTraceEnabled) return;
      try {
        process.stdout.write(`[DEV:SCM-TRACE] ${Message}
`);
      } catch {
      }
    }, "ScmTrace");
    SanitizeResourceState = /* @__PURE__ */ __name((Raw2) => {
      if (Raw2 == null || typeof Raw2 !== "object") return Raw2;
      const Source = Raw2;
      const Out = {};
      if (Source["resourceUri"] !== void 0)
        Out["resourceUri"] = Source["resourceUri"];
      const Command = Source["command"];
      if (Command && typeof Command === "object") {
        const C = Command;
        Out["command"] = {
          title: C["title"] ?? "",
          command: C["command"] ?? "",
          tooltip: C["tooltip"] ?? ""
        };
      }
      const Decorations = Source["decorations"];
      if (Decorations && typeof Decorations === "object") {
        const D = Decorations;
        const SafeDecorations = {};
        for (const Key of [
          "strikeThrough",
          "faded",
          "tooltip",
          "iconPath",
          "light",
          "dark"
        ]) {
          if (D[Key] !== void 0) SafeDecorations[Key] = D[Key];
        }
        Out["decorations"] = SafeDecorations;
      }
      if (Source["contextValue"] !== void 0)
        Out["contextValue"] = Source["contextValue"];
      return Out;
    }, "SanitizeResourceState");
    CreateScmNamespace = /* @__PURE__ */ __name((Context13) => Namespace_default16({
      createSourceControl: /* @__PURE__ */ __name((Id, Label, RootUri) => {
        const Handle = NextProviderHandle();
        const RootUriDescription = RootUri == null ? "null" : typeof RootUri === "string" ? `string("${RootUri}")` : typeof RootUri === "object" ? `object(scheme=${RootUri?.scheme ?? "<missing>"})` : typeof RootUri;
        ScmTrace(
          `createSourceControl id="${Id}" label="${Label}" rootUri=${RootUriDescription} handle=${Handle}`
        );
        const RootUriShape = RootUri && typeof RootUri === "object" ? {
          scheme: RootUri?.scheme ?? "",
          authority: RootUri?.authority ?? "",
          path: RootUri?.path ?? "",
          query: RootUri?.query ?? "",
          fragment: RootUri?.fragment ?? ""
        } : RootUri;
        const ProviderReady = Context13.SendToMountain(
          "register_scm_provider",
          {
            handle: Handle,
            id: Id,
            label: Label,
            rootUri: RootUriShape,
            extensionId: ""
          }
        ).then(
          () => ScmTrace(
            `register_scm_provider ack id="${Id}" handle=${Handle}`
          )
        ).catch((Error2) => {
          const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
          ScmTrace(
            `register_scm_provider FAILED id="${Id}" handle=${Handle} error=${Message}`
          );
        });
        const Groups = /* @__PURE__ */ new Map();
        const ConcreteSourceControl = {
          id: Id,
          label: Label,
          rootUri: RootUri,
          inputBox: Heuristics_default(
            `scm.sourceControl[${Id}].inputBox`,
            {
              get value() {
                return this.__value ?? "";
              },
              set value(V) {
                this.__value = V;
                Context13.MountainClient?.sendRequest(
                  "$scm:updateSourceControl",
                  [Handle, { inputBoxValue: V }]
                ).catch(() => {
                });
              },
              get placeholder() {
                return this.__placeholder ?? "";
              },
              set placeholder(V) {
                this.__placeholder = V;
                Context13.MountainClient?.sendRequest(
                  "$scm:updateSourceControl",
                  [Handle, { inputBoxPlaceholder: V }]
                ).catch(() => {
                });
              },
              enabled: true,
              visible: true
            }
          ),
          createResourceGroup: /* @__PURE__ */ __name((GroupId, GroupLabel) => {
            const GroupHandle = `${Handle}/${GroupId}`;
            Groups.set(GroupId, {
              label: GroupLabel,
              resourceStates: []
            });
            ScmTrace(
              `createResourceGroup scm="${Id}" handle=${Handle} groupId="${GroupId}" groupLabel="${GroupLabel}"`
            );
            const GroupReady = ProviderReady.then(
              () => Context13.SendToMountain("register_scm_resource_group", {
                scmHandle: Handle,
                groupHandle: GroupHandle,
                groupId: GroupId,
                label: GroupLabel
              })
            ).catch((Error2) => {
              ScmTrace(
                `register_scm_resource_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
              );
            });
            const State = { resourceStates: [] };
            return {
              id: GroupId,
              label: GroupLabel,
              get resourceStates() {
                return State.resourceStates;
              },
              set resourceStates(Value) {
                State.resourceStates = Value;
                ScmTrace(
                  `update_scm_group scm=${Handle} group="${GroupId}" resourceCount=${Array.isArray(Value) ? Value.length : 0}`
                );
                const SanitizedStates = Array.isArray(Value) ? Value.map((Raw2) => SanitizeResourceState(Raw2)) : [];
                GroupReady.then(
                  () => Context13.SendToMountain("update_scm_group", {
                    // Proto UpdateScmGroupRequest field names:
                    // providerId (string scm id) + groupId (string)
                    providerId: Id,
                    groupId: GroupId,
                    resourceStates: SanitizedStates
                  })
                ).catch((Error2) => {
                  ScmTrace(
                    `update_scm_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
                  );
                });
              },
              dispose: /* @__PURE__ */ __name(() => {
                GroupReady.then(
                  () => Context13.SendToMountain(
                    "unregister_scm_resource_group",
                    {
                      scmHandle: Handle,
                      groupHandle: GroupHandle
                    }
                  )
                ).catch(() => {
                });
                Groups.delete(GroupId);
              }, "dispose")
            };
          }, "createResourceGroup"),
          statusBarCommands: [],
          count: 0,
          get commitTemplate() {
            return ConcreteSourceControl.__commitTemplate ?? "";
          },
          set commitTemplate(V) {
            ConcreteSourceControl.__commitTemplate = V;
            Context13.MountainClient?.sendRequest(
              "$scm:updateSourceControl",
              [Handle, { commitTemplate: V }]
            ).catch(() => {
            });
          },
          get acceptInputCommand() {
            return ConcreteSourceControl.__acceptInputCommand;
          },
          set acceptInputCommand(V) {
            ConcreteSourceControl.__acceptInputCommand = V;
            Context13.MountainClient?.sendRequest(
              "$scm:updateSourceControl",
              [Handle, { acceptInputCommand: V }]
            ).catch(() => {
            });
          },
          quickDiffProvider: void 0,
          dispose: /* @__PURE__ */ __name(() => {
            ProviderReady.then(
              () => Context13.SendToMountain("unregister_scm_provider", {
                handle: Handle
              })
            ).catch(() => {
            });
            Groups.clear();
          }, "dispose")
        };
        return Heuristics_default(
          `scm.sourceControl[${Id}]`,
          ConcreteSourceControl
        );
      }, "createSourceControl"),
      // vscode.scm.inputBox - global input box reference; proxies the active
      // SourceControl's inputBox so GitLens and other SCM extensions that write
      // to the global can still set the commit message.
      get inputBox() {
        const Providers = Context13.__scmProviders ?? [];
        const Active = Providers[0];
        return Active?.inputBox ?? {
          value: "",
          placeholder: "",
          enabled: true,
          visible: true
        };
      }
    }), "CreateScmNamespace");
    Namespace_default17 = CreateScmNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Wrap/Authentication/Namespace.ts
var WrapAuthenticationNamespace, Namespace_default18;
var init_Namespace20 = __esm({
  "Source/Services/Handler/VscodeAPI/Wrap/Authentication/Namespace.ts"() {
    "use strict";
    init_Heuristics();
    WrapAuthenticationNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("authentication", Concrete), "WrapAuthenticationNamespace");
    Namespace_default18 = WrapAuthenticationNamespace;
  }
});

// Source/Services/Handler/VscodeAPI/Authentication/Namespace.ts
var Namespace_exports10 = {};
__export(Namespace_exports10, {
  default: () => Namespace_default19
});
var EventSubscriber4, CreateAuthenticationNamespace, Namespace_default19;
var init_Namespace21 = __esm({
  "Source/Services/Handler/VscodeAPI/Authentication/Namespace.ts"() {
    "use strict";
    init_Registry();
    init_Namespace20();
    EventSubscriber4 = /* @__PURE__ */ __name((Context13, EventName) => (Listener) => {
      Context13.Emitter.on(EventName, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context13.Emitter.off(EventName, Listener);
        }, "dispose")
      };
    }, "EventSubscriber");
    CreateAuthenticationNamespace = /* @__PURE__ */ __name((Context13) => Namespace_default18({
      registerAuthenticationProvider: /* @__PURE__ */ __name((ProviderId, Label, Provider, Options) => {
        const Handle = NextProviderHandle();
        Context13.SendToMountain("register_authentication_provider", {
          handle: Handle,
          providerId: ProviderId,
          label: Label,
          supportsMultipleAccounts: Options?.supportsMultipleAccounts ?? false,
          extensionId: ""
        }).catch(() => {
        });
        const ProviderKey = `__authProvider:${ProviderId}`;
        Context13.ExtensionRegistry.set(ProviderKey, Provider);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Context13.ExtensionRegistry.delete(ProviderKey);
            Context13.SendToMountain(
              "unregister_authentication_provider",
              {
                handle: Handle
              }
            ).catch(() => {
            });
          }, "dispose")
        };
      }, "registerAuthenticationProvider"),
      getSession: /* @__PURE__ */ __name(async (ProviderId, Scopes, Options) => {
        try {
          return await Context13.MountainClient?.sendRequest(
            "Authentication.GetSession",
            [ProviderId, Scopes, Options ?? {}]
          );
        } catch {
          return void 0;
        }
      }, "getSession"),
      getAccounts: /* @__PURE__ */ __name(async (ProviderId) => {
        try {
          const Result = await Context13.MountainClient?.sendRequest(
            "Authentication.GetAccounts",
            [ProviderId]
          );
          return Array.isArray(Result) ? Result : [];
        } catch {
          return [];
        }
      }, "getAccounts"),
      onDidChangeSessions: EventSubscriber4(Context13, "auth.didChangeSessions")
    }), "CreateAuthenticationNamespace");
    Namespace_default19 = CreateAuthenticationNamespace;
  }
});

// Source/Services/Handler/Extension/Host/VscodeModuleHooks.ts
var InstallVscodeModuleHooks, VscodeModuleHooks_default;
var init_VscodeModuleHooks = __esm({
  "Source/Services/Handler/Extension/Host/VscodeModuleHooks.ts"() {
    "use strict";
    init_Log();
    InstallVscodeModuleHooks = /* @__PURE__ */ __name(async () => {
      if (globalThis.__cocoonModuleHooksInstalled) return;
      globalThis.__cocoonModuleHooksInstalled = true;
      const ModuleModule = await import("module");
      const CreateRequire = ModuleModule.createRequire;
      const LocalRequire = CreateRequire(import.meta.url);
      try {
        const NodeModule = LocalRequire("module");
        const OriginalLoad = NodeModule._load;
        NodeModule._load = /* @__PURE__ */ __name(function PatchedLoad(Request, Parent, IsMain) {
          if (Request === "vscode") {
            const API = globalThis.__cocoonVscodeAPI;
            if (API) return API;
            CocoonDevLog2(
              "ext-host",
              "[ExtensionHostHandler] require('vscode') called before shim registered - returning empty namespace"
            );
            return {};
          }
          return OriginalLoad.call(this, Request, Parent, IsMain);
        }, "PatchedLoad");
        CocoonDevLog2(
          "ext-host",
          "[ExtensionHostHandler] Module._load hook installed - require('vscode') intercepted"
        );
      } catch (Err) {
        CocoonDevLog2(
          "ext-host",
          `[ExtensionHostHandler] Failed to patch Module._load: ${Err instanceof Error ? Err.message : String(Err)}`
        );
      }
      try {
        const NodeModule = LocalRequire("module");
        if (typeof NodeModule.register === "function") {
          const VscodeExportNames = [
            // Namespaces
            "window",
            "workspace",
            "commands",
            "languages",
            "extensions",
            "env",
            "debug",
            "tasks",
            "scm",
            "authentication",
            "l10n",
            "notebooks",
            "tests",
            "comments",
            "chat",
            "lm",
            "interactive",
            // Type constructors
            "Position",
            "Range",
            "Location",
            "LocationLink",
            "Selection",
            "MarkdownString",
            "Hover",
            "CompletionItem",
            "CompletionItemKind",
            "CompletionItemTag",
            "CompletionList",
            "CompletionTriggerKind",
            "Diagnostic",
            "DiagnosticSeverity",
            "DiagnosticTag",
            "DiagnosticRelatedInformation",
            "TextEdit",
            "WorkspaceEdit",
            "SnippetString",
            "SnippetTextEdit",
            "SymbolKind",
            "SymbolTag",
            "SymbolInformation",
            "DocumentSymbol",
            "CodeActionKind",
            "CodeAction",
            "CodeActionTriggerKind",
            "CodeLens",
            "SignatureHelp",
            "SignatureHelpTriggerKind",
            "SignatureInformation",
            "ParameterInformation",
            "InlayHint",
            "InlayHintKind",
            "InlayHintLabelPart",
            "FoldingRange",
            "FoldingRangeKind",
            "DocumentHighlight",
            "DocumentHighlightKind",
            "SelectionRange",
            "SemanticTokensLegend",
            "SemanticTokensBuilder",
            "SemanticTokens",
            "SemanticTokensEdit",
            "SemanticTokensEdits",
            "RelativePattern",
            "Disposable",
            "StatusBarAlignment",
            "ThemeColor",
            "ThemeIcon",
            "TreeItem",
            "TreeItemCollapsibleState",
            "TreeItemCheckboxState",
            "ViewColumn",
            "EndOfLine",
            "ConfigurationTarget",
            "Uri",
            "CancellationTokenSource",
            "CancellationError",
            "EventEmitter",
            "FileType",
            "FilePermission",
            "FileSystemError",
            "DataTransfer",
            "DataTransferItem",
            "TextDocumentChangeReason",
            "TextDocumentSaveReason",
            "TextEditorCursorStyle",
            "TextEditorLineNumbersStyle",
            "TextEditorRevealType",
            "TextEditorSelectionChangeKind",
            "DecorationRangeBehavior",
            "OverviewRulerLane",
            "ColorPresentation",
            "ColorInformation",
            "Color",
            "QuickPickItemKind",
            "InputBoxValidationSeverity",
            "ProgressLocation",
            "NotebookCellData",
            "NotebookCellKind",
            "NotebookCellOutput",
            "NotebookCellOutputItem",
            "NotebookData",
            "NotebookEdit",
            "NotebookRange",
            "TestRunProfileKind",
            "TestMessage",
            "TestRunRequest",
            "TestTag",
            "DebugAdapterExecutable",
            "DebugAdapterInlineImplementation",
            "DebugAdapterNamedPipeServer",
            "DebugAdapterServer",
            "DebugConfigurationProviderTriggerKind",
            "IndentAction",
            "Breakpoint",
            "FunctionBreakpoint",
            "SourceBreakpoint",
            "TerminalLink",
            "TerminalLocation",
            "TerminalProfile",
            "TaskGroup",
            "TaskScope",
            "TaskRevealKind",
            "TaskPanelKind",
            "ShellExecution",
            "ProcessExecution",
            "CustomExecution",
            "Task",
            "CommentMode",
            "CommentThreadCollapsibleState",
            "CommentThreadState",
            "ExtensionKind",
            "ExtensionMode",
            "UIKind",
            "LogLevel",
            "LanguageStatusSeverity",
            "TextSearchContext",
            "TextSearchMatch",
            "DocumentLink",
            "LinkedEditingRanges",
            "EvaluatableExpression",
            "InlineValueText",
            "InlineValueVariableLookup",
            "InlineValueEvaluatableExpression",
            "TypeHierarchyItem",
            "CallHierarchyItem",
            "CallHierarchyIncomingCall",
            "CallHierarchyOutgoingCall",
            // Fields
            "version"
          ];
          const NamedExports = VscodeExportNames.map(
            (Name) => `export const ${Name} = API.${Name};`
          ).join("\n");
          const BridgeSource = [
            "const API = globalThis.__cocoonVscodeAPI || {};",
            NamedExports,
            "export default API;",
            "export const __esModule = true;"
          ].join("\n");
          const LoaderSource = `
				const BRIDGE_URL = 'vscode-shim:///vscode';

				const BRIDGE_SOURCE = ${JSON.stringify(BridgeSource)};

				export async function resolve(Specifier, Context, NextResolve) {

					if (Specifier === 'vscode') {

						return { url: BRIDGE_URL, shortCircuit: true, format: 'module' };
					}

					return NextResolve(Specifier, Context);
				}

				export async function load(Url, Context, NextLoad) {

					if (Url === BRIDGE_URL) {

						return { format: 'module', source: BRIDGE_SOURCE, shortCircuit: true };
					}

					return NextLoad(Url, Context);
				}

			`;
          const LoaderURL = `data:text/javascript;base64,${Buffer.from(LoaderSource).toString("base64")}`;
          try {
            NodeModule.register(LoaderURL, import.meta.url);
            CocoonDevLog2(
              "ext-host",
              "[ExtensionHostHandler] ESM loader registered - import 'vscode' intercepted"
            );
          } catch (RegisterErr) {
            CocoonDevLog2(
              "ext-host",
              `[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail): ${RegisterErr instanceof Error ? RegisterErr.message : String(RegisterErr)}`
            );
          }
        }
      } catch (Err) {
        CocoonDevLog2(
          "ext-host",
          `[ExtensionHostHandler] ESM loader setup skipped: ${Err instanceof Error ? Err.message : String(Err)}`
        );
      }
    }, "InstallVscodeModuleHooks");
    VscodeModuleHooks_default = InstallVscodeModuleHooks;
  }
});

// Source/Services/Handler/Extension/Host/EnsureVscodeAPI.ts
var EnsureVscodeAPIRegistered, EnsureVscodeAPI_default;
var init_EnsureVscodeAPI = __esm({
  "Source/Services/Handler/Extension/Host/EnsureVscodeAPI.ts"() {
    "use strict";
    init_Log();
    init_Registry();
    init_VscodeModuleHooks();
    EnsureVscodeAPIRegistered = /* @__PURE__ */ __name(async (Context13) => {
      await VscodeModuleHooks_default();
      if (globalThis.__cocoonVscodeAPI) return;
      try {
        const VsCodeTypes = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
        const { URI: URI2 } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");
        const { CancellationTokenSource } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
        const { Emitter } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js");
        const StockRelativePattern = VsCodeTypes.RelativePattern;
        const HydrateRelativePatternBase = /* @__PURE__ */ __name((Base) => {
          if (Base == null) return Base;
          if (typeof Base === "string") return Base;
          if (Base instanceof URI2) return Base;
          const WithUri = Base;
          if (typeof WithUri.uri !== "undefined") {
            if (WithUri.uri instanceof URI2) return Base;
            const ReviveInput = typeof WithUri.uri === "string" ? URI2.parse(WithUri.uri) : URI2.revive(WithUri.uri);
            return { ...Base, uri: ReviveInput };
          }
          const Revived = URI2.revive(Base);
          return Revived ?? Base;
        }, "HydrateRelativePatternBase");
        const PatchedRelativePattern = /* @__PURE__ */ __name(function RelativePattern(Base, Pattern) {
          const Safe = HydrateRelativePatternBase(Base);
          return Reflect.construct(
            StockRelativePattern,
            [Safe, Pattern],
            PatchedRelativePattern
          );
        }, "RelativePattern");
        PatchedRelativePattern.prototype = StockRelativePattern.prototype;
        Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern);
        const LogLevelEnum = {
          Off: 0,
          Trace: 1,
          Debug: 2,
          Info: 3,
          Warning: 4,
          Error: 5,
          0: "Off",
          1: "Trace",
          2: "Debug",
          3: "Info",
          4: "Warning",
          5: "Error"
        };
        class CancellationError extends Error {
          static {
            __name(this, "CancellationError");
          }
          constructor() {
            super("Canceled");
            this.name = "Canceled";
          }
        }
        const OverviewRulerLane = {
          Left: 1,
          Center: 2,
          Right: 4,
          Full: 7,
          1: "Left",
          2: "Center",
          4: "Right",
          7: "Full"
        };
        const UIKind = {
          Desktop: 1,
          Web: 2,
          1: "Desktop",
          2: "Web"
        };
        const TextEditorCursorStyle = {
          Line: 1,
          Block: 2,
          Underline: 3,
          LineThin: 4,
          BlockOutline: 5,
          UnderlineThin: 6,
          1: "Line",
          2: "Block",
          3: "Underline",
          4: "LineThin",
          5: "BlockOutline",
          6: "UnderlineThin"
        };
        const DebugConfigurationProviderTriggerKind = {
          Initial: 1,
          Dynamic: 2,
          1: "Initial",
          2: "Dynamic"
        };
        const IndentAction = {
          None: 0,
          Indent: 1,
          IndentOutdent: 2,
          Outdent: 3,
          0: "None",
          1: "Indent",
          2: "IndentOutdent",
          3: "Outdent"
        };
        const API = {
          ...VsCodeTypes,
          // Atom I5: read from process.env - single source is .env.Land
          // propagated by Maintain/Script/TierEnvironment.sh. Fallback
          // tracks the VS Code base from Dependency/.../Editor/package.json.
          version: process.env["ProductVersion"] ?? "1.118.0",
          // Override the spread's raw `RelativePattern` with the
          // POJO-tolerant wrapper defined above.
          RelativePattern: PatchedRelativePattern,
          Uri: URI2,
          CancellationTokenSource,
          CancellationError,
          EventEmitter: Emitter,
          LogLevel: LogLevelEnum,
          OverviewRulerLane,
          UIKind,
          TextEditorCursorStyle,
          DebugConfigurationProviderTriggerKind,
          IndentAction,
          // Namespaces - each in its own file under VscodeAPI/
          window: (await Promise.resolve().then(() => (init_Namespace2(), Namespace_exports))).default(Context13),
          workspace: (await Promise.resolve().then(() => (init_Namespace5(), Namespace_exports2))).default(Context13),
          commands: (await Promise.resolve().then(() => (init_Namespace7(), Namespace_exports3))).default(Context13, Registry_exports),
          languages: (await Promise.resolve().then(() => (init_Namespace9(), Namespace_exports4))).default(Context13, Registry_exports),
          extensions: (await Promise.resolve().then(() => (init_Namespace11(), Namespace_exports5))).default(Context13),
          env: (await Promise.resolve().then(() => (init_Namespace13(), Namespace_exports6))).default(
            Context13
          ),
          debug: (await Promise.resolve().then(() => (init_Namespace15(), Namespace_exports7))).default(
            Context13
          ),
          tasks: (await Promise.resolve().then(() => (init_Namespace17(), Namespace_exports8))).default(
            Context13
          ),
          scm: (await Promise.resolve().then(() => (init_Namespace19(), Namespace_exports9))).default(
            Context13
          ),
          authentication: (await Promise.resolve().then(() => (init_Namespace21(), Namespace_exports10))).default(Context13),
          // Lightweight stub namespaces - no Mountain route yet, returns
          // safe defaults so extensions that reference them don't crash.
          l10n: {
            t: /* @__PURE__ */ __name((Message, ...Arguments) => {
              const Raw2 = typeof Message === "string" ? Message : Message?.message ?? String(Message);
              if (!Arguments.length) return Raw2;
              return Raw2.replace(
                /\{(\d+)\}/g,
                (_Match, Index) => {
                  const Replacement = Arguments[Number(Index)];
                  return Replacement === void 0 ? "" : String(Replacement);
                }
              );
            }, "t"),
            bundle: void 0,
            uri: void 0
          },
          notebooks: {
            createNotebookController: /* @__PURE__ */ __name(() => ({
              id: "",
              notebookType: "",
              supportedLanguages: [],
              label: "",
              supportsExecutionOrder: false,
              executeHandler: /* @__PURE__ */ __name(() => {
              }, "executeHandler"),
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose"),
              createNotebookCellExecution: /* @__PURE__ */ __name(() => ({
                start: /* @__PURE__ */ __name(() => {
                }, "start"),
                end: /* @__PURE__ */ __name(() => {
                }, "end"),
                replaceOutput: /* @__PURE__ */ __name(async () => {
                }, "replaceOutput"),
                appendOutput: /* @__PURE__ */ __name(async () => {
                }, "appendOutput"),
                clearOutput: /* @__PURE__ */ __name(async () => {
                }, "clearOutput"),
                replaceOutputItems: /* @__PURE__ */ __name(async () => {
                }, "replaceOutputItems"),
                appendOutputItems: /* @__PURE__ */ __name(async () => {
                }, "appendOutputItems"),
                executionOrder: void 0
              }), "createNotebookCellExecution"),
              onDidChangeSelectedNotebooks: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
              }, "dispose") }), "onDidChangeSelectedNotebooks"),
              updateNotebookAffinity: /* @__PURE__ */ __name(() => {
              }, "updateNotebookAffinity")
            }), "createNotebookController"),
            registerNotebookCellStatusBarItemProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerNotebookCellStatusBarItemProvider"),
            registerNotebookSerializer: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerNotebookSerializer"),
            registerRendererCommunication: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerRendererCommunication"),
            createRendererMessaging: /* @__PURE__ */ __name(() => ({
              postMessage: /* @__PURE__ */ __name(async () => false, "postMessage"),
              onDidReceiveMessage: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
              }, "dispose") }), "onDidReceiveMessage")
            }), "createRendererMessaging"),
            onDidChangeNotebookCellExecutionState: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "onDidChangeNotebookCellExecutionState"),
            // Proposed API (`vscode.proposed.notebookKernelSource.d.ts`).
            // Jupyter extension uses this to advertise additional
            // kernel discovery entries.
            registerKernelSourceActionProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerKernelSourceActionProvider"),
            createNotebookControllerDetectionTask: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "createNotebookControllerDetectionTask")
          },
          lm: {
            registerTool: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerTool"),
            invokeTool: /* @__PURE__ */ __name(async () => ({ content: [] }), "invokeTool"),
            selectChatModels: /* @__PURE__ */ __name(async () => [], "selectChatModels"),
            // Stable API name (1.96+). Legacy `registerChatModelProvider`
            // kept below for extensions that haven't migrated yet.
            registerLanguageModelChatProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerLanguageModelChatProvider"),
            registerChatModelProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerChatModelProvider"),
            // Stable 1.99+ MCP tool registration. GitHub Copilot's
            // `@mcp` participant reaches for this at activation; stub
            // disposable keeps the extension loading.
            registerMcpServerDefinitionProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerMcpServerDefinitionProvider"),
            // Proposed (`vscode.proposed.embeddings.d.ts`). Copilot-Chat
            // registers embedding models on activate. Empty bundle +
            // no-op disposable keep the flow non-throwing.
            embeddingModels: [],
            registerEmbeddingsProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerEmbeddingsProvider"),
            registerEmbeddingVectorProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerEmbeddingVectorProvider"),
            computeEmbeddings: /* @__PURE__ */ __name(async () => [], "computeEmbeddings"),
            tools: [],
            onDidChangeChatModels: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidChangeChatModels")
          },
          chat: {
            createChatParticipant: /* @__PURE__ */ __name(() => ({
              id: "",
              iconPath: void 0,
              requester: void 0,
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose"),
              followupProvider: void 0,
              onDidReceiveFeedback: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
              }, "dispose") }), "onDidReceiveFeedback")
            }), "createChatParticipant"),
            registerChatVariableResolver: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerChatVariableResolver"),
            registerMappedEditsProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerMappedEditsProvider"),
            registerChatOutputRenderer: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerChatOutputRenderer"),
            registerRelatedFilesProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerRelatedFilesProvider"),
            registerChatSessionProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerChatSessionProvider"),
            registerChatSessionItemProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerChatSessionItemProvider")
          },
          tests: {
            createTestController: /* @__PURE__ */ __name(() => ({
              id: "",
              label: "",
              items: {
                size: 0,
                replace: /* @__PURE__ */ __name(() => {
                }, "replace"),
                forEach: /* @__PURE__ */ __name(() => {
                }, "forEach"),
                add: /* @__PURE__ */ __name(() => {
                }, "add"),
                delete: /* @__PURE__ */ __name(() => {
                }, "delete"),
                get: /* @__PURE__ */ __name(() => void 0, "get")
              },
              createRunProfile: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
              }, "dispose") }), "createRunProfile"),
              resolveHandler: void 0,
              refreshHandler: void 0,
              createTestItem: /* @__PURE__ */ __name(() => ({}), "createTestItem"),
              createTestRun: /* @__PURE__ */ __name(() => ({
                enqueued: /* @__PURE__ */ __name(() => {
                }, "enqueued"),
                started: /* @__PURE__ */ __name(() => {
                }, "started"),
                skipped: /* @__PURE__ */ __name(() => {
                }, "skipped"),
                failed: /* @__PURE__ */ __name(() => {
                }, "failed"),
                errored: /* @__PURE__ */ __name(() => {
                }, "errored"),
                passed: /* @__PURE__ */ __name(() => {
                }, "passed"),
                end: /* @__PURE__ */ __name(() => {
                }, "end"),
                appendOutput: /* @__PURE__ */ __name(() => {
                }, "appendOutput"),
                token: {
                  isCancellationRequested: false,
                  onCancellationRequested: /* @__PURE__ */ __name(() => ({
                    dispose: /* @__PURE__ */ __name(() => {
                    }, "dispose")
                  }), "onCancellationRequested")
                }
              }), "createTestRun"),
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "createTestController")
          },
          comments: {
            createCommentController: /* @__PURE__ */ __name(() => ({
              id: "",
              label: "",
              commentingRangeProvider: void 0,
              reactionHandler: void 0,
              options: void 0,
              createCommentThread: /* @__PURE__ */ __name(() => ({
                uri: void 0,
                range: void 0,
                comments: [],
                collapsibleState: 0,
                canReply: true,
                contextValue: void 0,
                label: void 0,
                state: void 0,
                dispose: /* @__PURE__ */ __name(() => {
                }, "dispose")
              }), "createCommentThread"),
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "createCommentController")
          },
          interactive: {
            registerInteractiveEditorSessionProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerInteractiveEditorSessionProvider"),
            transferActiveChat: /* @__PURE__ */ __name(async () => {
            }, "transferActiveChat")
          },
          // Proposed top-level namespaces. Each behaves as "empty
          // registry" so opt-in extensions activate but surface no
          // results until Mountain routes the corresponding channel.
          ai: {
            getRelatedInformation: /* @__PURE__ */ __name(async () => [], "getRelatedInformation"),
            registerRelatedInformationProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerRelatedInformationProvider"),
            registerSettingsSearchProvider: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "registerSettingsSearchProvider")
          },
          speech: {
            registerSpeechProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "registerSpeechProvider"),
            onDidChangeSpeechRecognitionAvailability: /* @__PURE__ */ __name(() => ({
              dispose: /* @__PURE__ */ __name(() => {
              }, "dispose")
            }), "onDidChangeSpeechRecognitionAvailability")
          }
        };
        globalThis.__cocoonVscodeAPI = API;
        process.stdout.write(
          "[ExtensionHostHandler] vscode API shim registered on globalThis.__cocoonVscodeAPI\n"
        );
        const CriticalNames = [
          "Diagnostic",
          "CodeAction",
          "CodeLens",
          "CompletionItem",
          "SymbolInformation",
          "DocumentLink",
          "TypeHierarchyItem",
          "CallHierarchyItem",
          "SemanticTokensBuilder",
          "SemanticTokens",
          "RelativePattern",
          "Position",
          "Range",
          "Hover",
          "LogLevel",
          "CancellationError",
          "CancellationTokenSource",
          "EventEmitter",
          "Uri",
          "Disposable"
        ];
        const Missing = CriticalNames.filter((Name) => API[Name] === void 0);
        if (Missing.length) {
          process.stderr.write(
            `[ExtensionHostHandler] vscode API shim missing critical symbols: ${Missing.join(", ")}
`
          );
        } else {
          CocoonDevLog2(
            "ext-host",
            "[ExtensionHostHandler] vscode API shim critical symbols OK"
          );
        }
      } catch (Err) {
        process.stderr.write(
          `[ExtensionHostHandler] Failed to create vscode API shim: ${Err instanceof Error ? Err.message : String(Err)}
`
        );
      }
    }, "EnsureVscodeAPIRegistered");
    EnsureVscodeAPI_default = EnsureVscodeAPIRegistered;
  }
});

// Source/Services/Handler/Extension/Host/Handler.ts
var Handler_exports2 = {};
__export(Handler_exports2, {
  default: () => Handler_default3
});
var HandleInitializeExtensionHost, HandleDeltaExtensions, HandleActivateByEvent, HandleStartExtensionHost, Handler_default3;
var init_Handler3 = __esm({
  "Source/Services/Handler/Extension/Host/Handler.ts"() {
    "use strict";
    init_Log();
    init_ActivateExtension();
    init_EnsureVscodeAPI();
    HandleInitializeExtensionHost = /* @__PURE__ */ __name(async (Context13, Parameters) => {
      const Extensions = Parameters?.extensions ?? [];
      CocoonDevLog2(
        "ext-host",
        `[ExtensionHostHandler] InitializeExtensionHost received ${Extensions.length} extensions`
      );
      Context13.ExtensionHostInitData = Parameters;
      Context13.ExtensionRegistry.clear();
      Context13.ActivationEventIndex.clear();
      for (const Extension2 of Extensions) {
        const Identifier = Extension2?.identifier?.value ?? Extension2?.identifier?.id ?? Extension2?.identifier ?? "unknown";
        Context13.ExtensionRegistry.set(Identifier, Extension2);
        const ActivationEvents = Extension2?.activationEvents ?? [];
        for (const Event of ActivationEvents) {
          const Existing = Context13.ActivationEventIndex.get(Event) ?? [];
          Existing.push(Identifier);
          Context13.ActivationEventIndex.set(Event, Existing);
        }
      }
      Context13.ExtensionHostReady = true;
      CocoonDevLog2(
        "ext-host",
        `[ExtensionHostHandler] Extension registry: ${Context13.ExtensionRegistry.size} extensions, ${Context13.ActivationEventIndex.size} activation events`
      );
      Context13.Emitter.emit("extensionHostInitialized", {
        extensionCount: Context13.ExtensionRegistry.size,
        autoStart: Parameters?.autoStart ?? false
      });
      Context13.ConnectToMountain().catch((Error2) => {
        CocoonDevLog2(
          "ext-host",
          `[ExtensionHostHandler] Background Mountain reconnect failed: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
        );
      });
      return "initialized";
    }, "HandleInitializeExtensionHost");
    HandleDeltaExtensions = /* @__PURE__ */ __name(async (Context13, Parameters) => {
      const DeltaStart = performance.now();
      const Added = Parameters?.toAdd ?? [];
      const Removed = Parameters?.toRemove ?? [];
      const IdentifierOf = /* @__PURE__ */ __name((Extension2) => Extension2?.identifier?.value ?? Extension2?.identifier?.id ?? Extension2?.identifier ?? "unknown", "IdentifierOf");
      let AddedActivationEvents = 0;
      for (const Extension2 of Added) {
        const Identifier = IdentifierOf(Extension2);
        Context13.ExtensionRegistry.set(Identifier, Extension2);
        const ActivationEvents = Extension2?.activationEvents ?? [];
        for (const Event of ActivationEvents) {
          const Existing = Context13.ActivationEventIndex.get(Event) ?? [];
          if (!Existing.includes(Identifier)) {
            Existing.push(Identifier);
            Context13.ActivationEventIndex.set(Event, Existing);
            AddedActivationEvents++;
          }
        }
      }
      for (const Extension2 of Removed) {
        const Identifier = IdentifierOf(Extension2);
        Context13.ExtensionRegistry.delete(Identifier);
      }
      const DurationMs = Math.round(performance.now() - DeltaStart);
      CocoonDevLog2(
        "ext-host",
        `[ExtensionHostHandler] $deltaExtensions: +${Added.length} -${Removed.length} | registry=${Context13.ExtensionRegistry.size} | activationEvents+=${AddedActivationEvents} | ${DurationMs}ms`
      );
      Context13.Emitter.emit("deltaExtensions", {
        added: Added.length,
        removed: Removed.length,
        registrySize: Context13.ExtensionRegistry.size,
        durationMs: DurationMs
      });
      return {
        success: true,
        registrySize: Context13.ExtensionRegistry.size,
        durationMs: DurationMs
      };
    }, "HandleDeltaExtensions");
    HandleActivateByEvent = /* @__PURE__ */ __name(async (Context13, Parameters) => {
      await EnsureVscodeAPI_default(Context13);
      const ActivationEvent = typeof Parameters === "string" ? Parameters : Parameters?.activationEvent ?? Parameters?.event ?? "*";
      let MatchingExtensions;
      if (ActivationEvent === "*") {
        const All = /* @__PURE__ */ new Set();
        for (const Ids of Context13.ActivationEventIndex.values()) {
          for (const Id of Ids) All.add(Id);
        }
        MatchingExtensions = [...All];
      } else {
        const Specific = Context13.ActivationEventIndex.get(ActivationEvent) ?? [];
        const Star = Context13.ActivationEventIndex.get("*") ?? [];
        MatchingExtensions = [.../* @__PURE__ */ new Set([...Specific, ...Star])];
      }
      CocoonDevLog2(
        "ext-host",
        `[ExtensionHostHandler] $activateByEvent: ${ActivationEvent} \u2192 ${MatchingExtensions.length} extensions`
      );
      if (MatchingExtensions.length > 0) {
        CocoonDevLog2(
          "ext-activate",
          `[ExtensionHostHandler] Activating: ${MatchingExtensions.slice(0, 5).join(", ")}${MatchingExtensions.length > 5 ? ` (+${MatchingExtensions.length - 5} more)` : ""}`
        );
      } else {
        CocoonDevLog2(
          "ext-activate",
          `[ExtensionHostHandler] Available events: ${[...Context13.ActivationEventIndex.keys()].slice(0, 10).join(", ")}${Context13.ActivationEventIndex.size > 10 ? ` (+${Context13.ActivationEventIndex.size - 10} more)` : ""}`
        );
      }
      const InProgress = /* @__PURE__ */ new Set();
      const ActivateWithDeps = /* @__PURE__ */ __name(async (ExtId, Event, Depth = 0) => {
        if (Context13.ActivatedExtensions.has(ExtId) || InProgress.has(ExtId))
          return;
        if (Depth > 20) {
          CocoonDevLog2(
            "ext-activate",
            `[ExtensionHostHandler] Max dep depth reached at ${ExtId}; skipping`
          );
          return;
        }
        InProgress.add(ExtId);
        const Extension2 = Context13.ExtensionRegistry.get(ExtId);
        const Deps = Extension2?.extensionDependencies ?? [];
        for (const DepId of Deps) {
          if (!Context13.ActivatedExtensions.has(DepId) && !InProgress.has(DepId)) {
            await ActivateWithDeps(DepId, Event, Depth + 1).catch(
              (Err) => {
                CocoonDevLog2(
                  "ext-activate",
                  `[ExtensionHostHandler] Dep activation failed ${DepId} (required by ${ExtId}): ${Err instanceof Error ? Err.message : String(Err)}`
                );
              }
            );
          }
        }
        await ActivateExtension_default(Context13, ExtId, Event).catch((Err) => {
          const Msg = Err instanceof Error ? Err.message : String(Err);
          CocoonDevLog2(
            "ext-activate",
            `[ExtensionHostHandler] Activation failed for ${ExtId}: ${Msg}`
          );
          if (Err instanceof Error && /Class extends value undefined/.test(Err.message)) {
            const Stack = (Err.stack ?? "").split("\n").slice(0, 6).join("\n");
            CocoonDevLog2(
              "ext-activate",
              `[ExtensionHostHandler] Class-extends stack for ${ExtId}:
${Stack}`
            );
          }
        });
        InProgress.delete(ExtId);
      }, "ActivateWithDeps");
      const ToActivate = MatchingExtensions.filter(
        (Id) => !Context13.ActivatedExtensions.has(Id)
      );
      CocoonDevLog2(
        "ext-activate",
        `[ExtensionHostHandler] $activateByEvent: ${ToActivate.length} new activations (${MatchingExtensions.length - ToActivate.length} already active)`
      );
      await Promise.allSettled(
        ToActivate.map((ExtId) => ActivateWithDeps(ExtId, ActivationEvent))
      );
      Context13.Emitter.emit("activateByEvent", {
        event: ActivationEvent,
        extensions: MatchingExtensions
      });
      return {
        success: true,
        activated: ToActivate.length
      };
    }, "HandleActivateByEvent");
    HandleStartExtensionHost = /* @__PURE__ */ __name(async (Context13, _Parameters) => {
      CocoonDevLog2(
        "ext-host",
        `[ExtensionHostHandler] $startExtensionHost received (registry: ${Context13.ExtensionRegistry.size} extensions)`
      );
      Context13.Emitter.emit("startExtensionHost", {
        extensionCount: Context13.ExtensionRegistry.size,
        ready: Context13.ExtensionHostReady
      });
      return {
        success: true,
        ready: Context13.ExtensionHostReady,
        extensionCount: Context13.ExtensionRegistry.size
      };
    }, "HandleStartExtensionHost");
    Handler_default3 = {
      HandleInitializeExtensionHost,
      HandleDeltaExtensions,
      HandleActivateByEvent,
      HandleStartExtensionHost
    };
  }
});

// Source/Services/Handler/Language/Provider/Handler.ts
var NormalizeRange, ResolveLanguageIdentifier, BuildVsDocument, InvokeLanguageProvider, Handler_default4;
var init_Handler4 = __esm({
  "Source/Services/Handler/Language/Provider/Handler.ts"() {
    "use strict";
    init_Log();
    init_Registry();
    NormalizeRange = /* @__PURE__ */ __name((VsRange) => {
      return {
        StartLineNumber: (VsRange?.start?.line ?? 0) + 1,
        StartColumn: (VsRange?.start?.character ?? 0) + 1,
        EndLineNumber: (VsRange?.end?.line ?? 0) + 1,
        EndColumn: (VsRange?.end?.character ?? 0) + 1
      };
    }, "NormalizeRange");
    ResolveLanguageIdentifier = /* @__PURE__ */ __name((Extension2) => {
      switch (Extension2) {
        case "rs":
          return "rust";
        case "ts":
        case "tsx":
          return "typescript";
        case "js":
        case "jsx":
        case "mjs":
          return "javascript";
        case "json":
          return "json";
        case "toml":
          return "toml";
        case "md":
          return "markdown";
        case "py":
          return "python";
        case "go":
          return "go";
        default:
          return Extension2 || "plaintext";
      }
    }, "ResolveLanguageIdentifier");
    BuildVsDocument = /* @__PURE__ */ __name(async (UriString, FsPath, LanguageIdentifier, DocumentContentCache) => {
      const { Position, Range } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
      let CachedContent = null;
      let CachedLines = null;
      const LoadContent = /* @__PURE__ */ __name(() => {
        if (CachedContent !== null) return CachedContent;
        const MirrorContent = DocumentContentCache.get(UriString);
        if (MirrorContent !== void 0) {
          CachedContent = MirrorContent;
          return CachedContent;
        }
        try {
          const Fs = __require("node:fs");
          CachedContent = Fs.readFileSync(FsPath, "utf8");
        } catch {
          CachedContent = "";
        }
        return CachedContent;
      }, "LoadContent");
      const GetLines = /* @__PURE__ */ __name(() => {
        if (CachedLines !== null) return CachedLines;
        CachedLines = LoadContent().split(/\r?\n/);
        return CachedLines;
      }, "GetLines");
      return {
        uri: {
          toString: /* @__PURE__ */ __name(() => UriString, "toString"),
          fsPath: FsPath,
          external: UriString,
          $mid: 1,
          scheme: "file",
          path: FsPath
        },
        fileName: FsPath,
        languageId: LanguageIdentifier,
        version: 1,
        isDirty: false,
        isClosed: false,
        eol: 1,
        // LF
        getText: /* @__PURE__ */ __name((_range) => {
          const Text = LoadContent();
          if (!_range) return Text;
          const Lines = GetLines();
          const StartLine = _range?.start?.line ?? 0;
          const StartChar = _range?.start?.character ?? 0;
          const EndLine = _range?.end?.line ?? Lines.length - 1;
          const EndChar = _range?.end?.character ?? Lines[EndLine]?.length ?? 0;
          if (StartLine === EndLine) {
            return (Lines[StartLine] ?? "").substring(StartChar, EndChar);
          }
          const Result = [];
          Result.push((Lines[StartLine] ?? "").substring(StartChar));
          for (let I = StartLine + 1; I < EndLine; I++)
            Result.push(Lines[I] ?? "");
          Result.push((Lines[EndLine] ?? "").substring(0, EndChar));
          return Result.join("\n");
        }, "getText"),
        lineAt: /* @__PURE__ */ __name((LineOrPos) => {
          const LineNum = typeof LineOrPos === "number" ? LineOrPos : LineOrPos?.line ?? 0;
          const Lines = GetLines();
          const LineText = Lines[LineNum] ?? "";
          const FirstNonWS = LineText.search(/\S/);
          return {
            text: LineText,
            lineNumber: LineNum,
            range: new Range(LineNum, 0, LineNum, LineText.length),
            rangeIncludingLineBreak: new Range(LineNum, 0, LineNum + 1, 0),
            firstNonWhitespaceCharacterIndex: FirstNonWS === -1 ? LineText.length : FirstNonWS,
            isEmptyOrWhitespace: LineText.trim().length === 0
          };
        }, "lineAt"),
        get lineCount() {
          return GetLines().length;
        },
        offsetAt: /* @__PURE__ */ __name((Pos) => {
          const Lines = GetLines();
          let Offset = 0;
          const TargetLine = Pos?.line ?? 0;
          for (let I = 0; I < TargetLine && I < Lines.length; I++) {
            Offset += (Lines[I] ?? "").length + 1;
          }
          return Offset + (Pos?.character ?? 0);
        }, "offsetAt"),
        positionAt: /* @__PURE__ */ __name((Offset) => {
          const Lines = GetLines();
          let Remaining = Offset;
          for (let I = 0; I < Lines.length; I++) {
            const LineText = Lines[I] ?? "";
            if (Remaining <= LineText.length) {
              return new Position(I, Remaining);
            }
            Remaining -= LineText.length + 1;
          }
          return new Position(
            Lines.length - 1,
            (Lines[Lines.length - 1] ?? "").length
          );
        }, "positionAt"),
        validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
        validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
        getWordRangeAtPosition: /* @__PURE__ */ __name((Pos, Pattern) => {
          const Lines = GetLines();
          const Line = Lines[Pos?.line ?? 0] ?? "";
          const Regex = Pattern ?? /\w+/g;
          const Col = Pos?.character ?? 0;
          let Match;
          Regex.lastIndex = 0;
          while ((Match = Regex.exec(Line)) !== null) {
            if (Match.index <= Col && Match.index + Match[0].length >= Col) {
              return new Range(
                Pos.line,
                Match.index,
                Pos.line,
                Match.index + Match[0].length
              );
            }
          }
          return void 0;
        }, "getWordRangeAtPosition"),
        save: /* @__PURE__ */ __name(async () => false, "save")
      };
    }, "BuildVsDocument");
    InvokeLanguageProvider = /* @__PURE__ */ __name(async (Method, Parameters, DocumentContentCache) => {
      const Args = Array.isArray(Parameters) ? Parameters : [Parameters];
      const Handle = Args[0];
      const Provider = Get(Handle);
      if (!Provider) {
        CocoonDevLog2(
          "language-provider",
          `[LanguageProviderHandler] Provider handle ${Handle} not found for ${Method}`
        );
        return null;
      }
      const UriObj = Args[1];
      const UriString = typeof UriObj === "string" ? UriObj : UriObj?.external ?? "file:///unknown";
      const RawPos = Args[2];
      const SubtractOne = /* @__PURE__ */ __name((V) => V > 0 ? V - 1 : 0, "SubtractOne");
      const RawLine = RawPos?.Line ?? RawPos?.lineNumber ?? RawPos?.line ?? 1;
      const RawCol = RawPos?.Character ?? RawPos?.column ?? RawPos?.character ?? 1;
      const PosLine = SubtractOne(RawLine);
      const PosChar = SubtractOne(RawCol);
      const { Position } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
      const VsPosition = new Position(PosLine, PosChar);
      const Ext = UriString.split(".").pop() ?? "";
      const LangId = ResolveLanguageIdentifier(Ext);
      const FsPath = UriString.replace(/^file:\/\//, "");
      const VsDocument = await BuildVsDocument(
        UriString,
        FsPath,
        LangId,
        DocumentContentCache
      );
      const { CancellationTokenSource } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
      const VsToken = new CancellationTokenSource().token;
      const Context13 = Args[3];
      try {
        switch (Method) {
          case "$provideHover": {
            if (process.env.Trace) {
              CocoonDevLog2(
                "exthost",
                `[DEV:EXTHOST] provideHover dispatch uri=${UriString} line=${VsPosition?.line} char=${VsPosition?.character} providerHasMethod=${typeof Provider.provideHover === "function"}`
              );
            }
            const Result = await Provider.provideHover?.(
              VsDocument,
              VsPosition,
              VsToken
            );
            if (process.env.Trace) {
              CocoonDevLog2(
                "exthost",
                `[DEV:EXTHOST] provideHover result kind=${Result ? Array.isArray(Result.contents) ? `array(${Result.contents.length})` : typeof Result.contents : "null"}`
              );
            }
            if (!Result) return null;
            const RawContents = Result.contents;
            const Contents = Array.isArray(
              RawContents
            ) ? RawContents.map((C) => ({
              Value: typeof C === "string" ? C : C?.value ?? C?.Value ?? ""
            })) : typeof RawContents === "string" ? [{ Value: RawContents }] : [
              {
                Value: RawContents?.value ?? RawContents?.Value ?? ""
              }
            ];
            const VsRange = Result.range ?? null;
            const RangeDTO = VsRange ? {
              // `+ 1` to match `NormalizeRange` above; the
              // hover anchor range is what the workbench
              // uses to position the popup over the
              // underlined token. 0-based here = popup
              // floats one row above and one column left
              // of the actual symbol.
              StartLineNumber: (VsRange.start?.line ?? 0) + 1,
              StartColumn: (VsRange.start?.character ?? 0) + 1,
              EndLineNumber: (VsRange.end?.line ?? 0) + 1,
              EndColumn: (VsRange.end?.character ?? 0) + 1
            } : void 0;
            return RangeDTO !== void 0 ? { Contents, Range: RangeDTO } : { Contents };
          }
          // Mountain sends "$provideCompletion" (Debug fmt of ProviderType::Completion)
          case "$provideCompletion":
          case "$provideCompletions": {
            const Result = await Provider.provideCompletionItems?.(
              VsDocument,
              VsPosition,
              VsToken,
              Context13
            );
            if (!Result) return { Suggestions: [], IsIncomplete: false };
            const RawItems = Array.isArray(Result) ? Result : Result.items ?? [];
            return {
              Suggestions: RawItems.map((Item) => ({
                Label: typeof Item.label === "string" ? Item.label : Item.label?.label ?? "",
                Kind: Item.kind ?? 0,
                Detail: Item.detail ?? void 0,
                Documentation: typeof Item.documentation === "string" ? { Value: Item.documentation } : Item.documentation?.value !== void 0 ? { Value: Item.documentation.value } : void 0,
                InsertText: typeof Item.insertText === "string" ? Item.insertText : typeof Item.label === "string" ? Item.label : Item.label?.label ?? ""
              })),
              IsIncomplete: Result.isIncomplete ?? false
            };
          }
          case "$provideDefinition": {
            const Result = await Provider.provideDefinition?.(
              VsDocument,
              VsPosition,
              VsToken
            );
            if (!Result) return null;
            const Locations = Array.isArray(Result) ? Result : [Result];
            return Locations.map((L) => ({
              Uri: (L.uri ?? L.targetUri)?.toString?.() ?? UriString,
              Range: NormalizeRange(L.range ?? L.targetSelectionRange)
            }));
          }
          case "$provideReferences": {
            const Result = await Provider.provideReferences?.(
              VsDocument,
              VsPosition,
              Context13 ?? { includeDeclaration: true },
              VsToken
            );
            if (!Result) return null;
            return Result.map((L) => ({
              Uri: L.uri?.toString?.() ?? UriString,
              Range: NormalizeRange(L.range)
            }));
          }
          // Mountain sends "$provideCodeAction" (ProviderType::CodeAction)
          case "$provideCodeAction":
          case "$provideCodeActions": {
            const RangeArg = Args[2];
            const ContextArg = Args[3];
            const Result = await Provider.provideCodeActions?.(
              VsDocument,
              RangeArg,
              ContextArg,
              VsToken
            );
            return Result ?? null;
          }
          // Mountain sends "$provideDocumentHighlight" (ProviderType::DocumentHighlight)
          case "$provideDocumentHighlight":
          case "$provideDocumentHighlights": {
            const Result = await Provider.provideDocumentHighlights?.(VsDocument, VsPosition, VsToken);
            return Result ?? null;
          }
          // Mountain sends "$provideDocumentSymbol" (ProviderType::DocumentSymbol)
          case "$provideDocumentSymbol":
          case "$provideDocumentSymbols": {
            const Result = await Provider.provideDocumentSymbols?.(
              VsDocument,
              VsToken
            );
            return Result ?? null;
          }
          // Mountain sends "$provideWorkspaceSymbol" (ProviderType::WorkspaceSymbol)
          case "$provideWorkspaceSymbol":
          case "$provideWorkspaceSymbols": {
            const Query = Args[1];
            const Result = await Provider.provideWorkspaceSymbols?.(Query, VsToken);
            return Result ?? null;
          }
          // Mountain: "$provideDocumentFormatting" / "$provideDocumentRangeFormatting"
          case "$provideDocumentFormatting":
          case "$provideDocumentFormattingEdits":
          case "$provideDocumentRangeFormatting":
          case "$provideDocumentRangeFormattingEdits": {
            const RangeArg = Args[2];
            const OptionsArg = Args[3];
            const Fn = Method === "$provideDocumentFormattingEdits" || Method === "$provideDocumentFormatting" ? "provideDocumentFormattingEdits" : "provideDocumentRangeFormattingEdits";
            const Result = await Provider[Fn]?.(
              VsDocument,
              RangeArg,
              OptionsArg,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideSignatureHelp": {
            const Result = await Provider.provideSignatureHelp?.(
              VsDocument,
              VsPosition,
              VsToken,
              Context13
            );
            return Result ?? null;
          }
          // Mountain sends "$provideRename" (ProviderType::Rename)
          case "$provideRename":
          case "$provideRenameEdits": {
            const NewName = Args[3];
            const Result = await Provider.provideRenameEdits?.(
              VsDocument,
              VsPosition,
              NewName,
              VsToken
            );
            return Result ?? null;
          }
          // Mountain sends "$provideFoldingRange" (ProviderType::FoldingRange)
          case "$provideFoldingRange":
          case "$provideFoldingRanges": {
            const Result = await Provider.provideFoldingRanges?.(
              VsDocument,
              Context13,
              VsToken
            );
            return Result ?? null;
          }
          // Mountain sends "$provideInlayHint" (ProviderType::InlayHint)
          case "$provideInlayHint":
          case "$provideInlayHints": {
            const RangeArg = Args[2];
            const Result = await Provider.provideInlayHints?.(
              VsDocument,
              RangeArg,
              VsToken
            );
            return Result ?? null;
          }
          // Mountain sends "$provideCodeLens" (ProviderType::CodeLens)
          case "$provideCodeLens":
          case "$provideCodeLenses": {
            const Result = await Provider.provideCodeLenses?.(
              VsDocument,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideOnTypeFormatting":
          case "$provideOnTypeFormattingEdits": {
            const TypeChar = Args[2];
            const TypeOptions = Args[3];
            const Result = await Provider.provideOnTypeFormattingEdits?.(
              VsDocument,
              VsPosition,
              TypeChar,
              TypeOptions ?? {},
              VsToken
            );
            return Result ?? null;
          }
          case "$provideSelectionRange":
          case "$provideSelectionRanges": {
            const Positions = Args[2];
            const Result = await Provider.provideSelectionRanges?.(
              VsDocument,
              Array.isArray(Positions) ? Positions.map(
                (P) => new Position(
                  P?.line ?? P?.Line ?? 0,
                  P?.character ?? P?.Character ?? 0
                )
              ) : [VsPosition],
              VsToken
            );
            return Result ?? null;
          }
          case "$provideSemanticTokens":
          case "$provideSemanticTokensFull": {
            const Result = await Provider.provideDocumentSemanticTokens?.(VsDocument, VsToken);
            return Result ?? null;
          }
          // `prepareCallHierarchy(document, position, token)` - the entry point.
          // Mountain calls this first to establish the `CallHierarchyItem` root
          // before requesting incoming/outgoing calls. Without this, call
          // hierarchy UI trees are always empty even with a registered provider.
          case "$prepareCallHierarchy":
          case "$prepareCallHierarchyItems": {
            const Result = await Provider.prepareCallHierarchy?.(
              VsDocument,
              VsPosition,
              VsToken
            );
            if (!Result) return null;
            return Array.isArray(Result) ? Result : [Result];
          }
          case "$provideCallHierarchy":
          case "$provideCallHierarchyIncomingCalls": {
            const Item = Args[1];
            const Result = await Provider.provideCallHierarchyIncomingCalls?.(Item, VsToken);
            return Result ?? null;
          }
          case "$provideCallHierarchyOutgoingCalls": {
            const Item = Args[1];
            const Result = await Provider.provideCallHierarchyOutgoingCalls?.(Item, VsToken);
            return Result ?? null;
          }
          // `prepareTypeHierarchy(document, position, token)` - entry point.
          // Establishes the root `TypeHierarchyItem` before sub/supertypes.
          case "$prepareTypeHierarchy":
          case "$prepareTypeHierarchyItems": {
            const Result = await Provider.prepareTypeHierarchy?.(
              VsDocument,
              VsPosition,
              VsToken
            );
            if (!Result) return null;
            return Array.isArray(Result) ? Result : [Result];
          }
          case "$provideTypeHierarchy":
          case "$provideTypeHierarchySupertypes": {
            const Item = Args[1];
            const Result = await Provider.provideTypeHierarchySupertypes?.(Item, VsToken);
            return Result ?? null;
          }
          case "$provideTypeHierarchySubtypes": {
            const Item = Args[1];
            const Result = await Provider.provideTypeHierarchySubtypes?.(Item, VsToken);
            return Result ?? null;
          }
          case "$provideLinkedEditingRange":
          case "$provideLinkedEditingRanges": {
            const Result = await Provider.provideLinkedEditingRanges?.(VsDocument, VsPosition, VsToken);
            return Result ?? null;
          }
          // VS Code ≥1.87 provider types - registered via the new
          // LanguageFeatures.rs arms; Mountain forwards $provideX with the
          // Debug name of ProviderType (e.g. InlineCompletion → $provideInlineCompletion).
          case "$provideInlineCompletion":
          case "$provideInlineCompletionItems": {
            const Context14 = Args[2];
            const Result = await Provider.provideInlineCompletionItems?.(
              VsDocument,
              VsPosition,
              Context14,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideInlineEdit":
          case "$provideInlineEdits": {
            const Context14 = Args[2];
            const Result = await Provider.provideInlineEdits?.(
              VsDocument,
              VsPosition,
              Context14,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideMultiDocumentHighlight":
          case "$provideMultiDocumentHighlights": {
            const OtherDocs = Args[2];
            const Result = await Provider.provideMultiDocumentHighlights?.(
              VsDocument,
              VsPosition,
              OtherDocs,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideMappedEdits": {
            const CodeBlocks = Args[2];
            const Context14 = Args[3];
            const Result = await Provider.provideMappedEdits?.(
              VsDocument,
              CodeBlocks,
              Context14,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideDocumentPasteEdit":
          case "$provideDocumentPasteEdits": {
            const Ranges = Args[2];
            const DataTransfer = Args[3];
            const Context14 = Args[4];
            const Result = await Provider.provideDocumentPasteEdits?.(
              VsDocument,
              Ranges,
              DataTransfer,
              Context14,
              VsToken
            );
            return Result ?? null;
          }
          case "$provideDocumentDropEdit":
          case "$provideDocumentDropEdits": {
            const DataTransfer = Args[2];
            const Result = await Provider.provideDocumentDropEdits?.(
              VsDocument,
              VsPosition,
              DataTransfer,
              VsToken
            );
            return Result ?? null;
          }
          // File decoration provider: called for each URI in the explorer.
          // Args: [handle, uri]
          case "$provideFileDecoration": {
            const UriArg = Args[1] ?? VsDocument?.uri ?? Args[0];
            let UriValue = UriArg;
            try {
              const API = globalThis.__cocoonVscodeAPI;
              if (API?.Uri) {
                const UriStr = typeof UriArg === "string" ? UriArg : UriArg?.external ?? (UriArg?.scheme && UriArg?.path ? `${UriArg.scheme}://${UriArg.authority ?? ""}${UriArg.path}` : "") ?? "";
                if (UriStr) UriValue = API.Uri.parse(UriStr);
              }
            } catch {
            }
            const Result = await Provider.provideFileDecoration?.(
              UriValue,
              VsToken
            );
            return Result ?? null;
          }
          // Two-phase resolution: extensions provide a lightweight list of items,
          // then VS Code calls resolve* for the selected item to load details.
          // Without these handlers the workbench only shows the stub item.
          case "$resolveCodeAction":
          case "$resolveCodeActions": {
            const Item = Args[1];
            const Result = await Provider.resolveCodeAction?.(
              Item,
              VsToken
            );
            return Result ?? Item ?? null;
          }
          case "$resolveCodeLens": {
            const Lens = Args[1];
            const Result = await Provider.resolveCodeLens?.(
              Lens,
              VsToken
            );
            return Result ?? Lens ?? null;
          }
          case "$resolveCompletionItem": {
            const Item = Args[1];
            const Result = await Provider.resolveCompletionItem?.(
              Item,
              VsToken
            );
            return Result ?? Item ?? null;
          }
          case "$resolveHover": {
            const Item = Args[1];
            const Result = await Provider.resolveHover?.(
              VsDocument,
              VsPosition,
              VsToken
            );
            return Result ?? Item ?? null;
          }
          case "$resolveInlayHint":
          case "$resolveInlayHints": {
            const Hint = Args[1];
            const Result = await Provider.resolveInlayHint?.(
              Hint,
              VsToken
            );
            return Result ?? Hint ?? null;
          }
          case "$resolveDocumentLink": {
            const Link = Args[1];
            const Result = await Provider.resolveDocumentLink?.(
              Link,
              VsToken
            );
            return Result ?? Link ?? null;
          }
          case "$resolveWorkspaceSymbol": {
            const Symbol2 = Args[1];
            const Result = await Provider.resolveWorkspaceSymbol?.(
              Symbol2,
              VsToken
            );
            return Result ?? Symbol2 ?? null;
          }
          default:
            CocoonDevLog2(
              "language-provider",
              `[LanguageProviderHandler] Unhandled $provide method: ${Method}`
            );
            return null;
        }
      } catch (Error2) {
        CocoonDevLog2(
          "language-provider",
          `[LanguageProviderHandler] Provider ${Handle} threw for ${Method}: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
        );
        return null;
      }
    }, "InvokeLanguageProvider");
    Handler_default4 = InvokeLanguageProvider;
  }
});

// Source/Services/Handler/Workspace/Contains/Activator.ts
var Activator_exports = {};
__export(Activator_exports, {
  ActivateWorkspaceContainsExtensions: () => ActivateWorkspaceContainsExtensions,
  default: () => Activator_default
});
var WORKSPACE_CONTAINS_PREFIX, UriToFsPath, FolderContainsGlobViaMountain, FolderContainsGlob, GetActivationEvents, GetWorkspaceContainsGlobs, ActivateWorkspaceContainsExtensions, Activator_default;
var init_Activator = __esm({
  "Source/Services/Handler/Workspace/Contains/Activator.ts"() {
    "use strict";
    init_Regex();
    WORKSPACE_CONTAINS_PREFIX = "workspaceContains:";
    UriToFsPath = /* @__PURE__ */ __name((Uri) => {
      const Raw2 = typeof Uri === "string" ? Uri : Uri?.["fsPath"] ?? Uri?.["path"] ?? Uri?.["external"];
      if (typeof Raw2 !== "string" || Raw2.length === 0) return void 0;
      if (Raw2.startsWith("file:")) {
        try {
          return decodeURIComponent(new URL(Raw2).pathname);
        } catch {
          return Raw2.replace(/^file:\/\//, "");
        }
      }
      return Raw2;
    }, "UriToFsPath");
    FolderContainsGlobViaMountain = /* @__PURE__ */ __name(async (Context13, Glob) => {
      const Client = Context13.MountainClient;
      if (!Client || typeof Client.sendRequest !== "function") return void 0;
      try {
        const Result = await Client.sendRequest("findFiles", [
          Glob,
          { maxResults: 1 }
        ]);
        if (Array.isArray(Result)) return Result.length > 0;
        return void 0;
      } catch {
        return void 0;
      }
    }, "FolderContainsGlobViaMountain");
    FolderContainsGlob = /* @__PURE__ */ __name(async (FsPath, Glob) => {
      const { stat, readdir } = await import("node:fs/promises");
      const { join, relative, sep } = await import("node:path");
      const IsLiteral = !/[*?[\]]/.test(Glob);
      if (IsLiteral) {
        try {
          await stat(join(FsPath, Glob));
          return true;
        } catch {
          return false;
        }
      }
      let Matcher;
      try {
        Matcher = Regex_default(Glob);
      } catch {
        return false;
      }
      const ExcludeSegments = /* @__PURE__ */ new Set([
        ".git",
        "node_modules",
        ".astro",
        ".next",
        ".cache",
        ".turbo",
        "Target",
        "target",
        "dist",
        "out",
        "build"
      ]);
      const MaxDepth = 8;
      const DeadlineAt = Date.now() + 1500;
      const Walk = /* @__PURE__ */ __name(async (Current, Depth) => {
        if (Depth > MaxDepth) return false;
        if (Date.now() > DeadlineAt) return false;
        let Entries;
        try {
          Entries = await readdir(Current, {
            withFileTypes: true
          });
        } catch {
          return false;
        }
        const SubDirs = [];
        for (const Entry of Entries) {
          const Name = Entry.name;
          if (ExcludeSegments.has(Name)) continue;
          if (typeof Entry.isSymbolicLink === "function" && Entry.isSymbolicLink())
            continue;
          const Full = join(Current, Name);
          const Rel = relative(FsPath, Full).split(sep).join("/");
          if (Matcher.test(Rel)) return true;
          if (Entry.isDirectory()) SubDirs.push(Full);
        }
        for (const Sub of SubDirs) {
          if (await Walk(Sub, Depth + 1)) return true;
        }
        return false;
      }, "Walk");
      return Walk(FsPath, 0);
    }, "FolderContainsGlob");
    GetActivationEvents = /* @__PURE__ */ __name((Extension2) => {
      const Events = Extension2?.activationEvents;
      return Array.isArray(Events) ? Events.filter((E) => typeof E === "string") : [];
    }, "GetActivationEvents");
    GetWorkspaceContainsGlobs = /* @__PURE__ */ __name((Extension2) => GetActivationEvents(Extension2).filter((Event) => Event.startsWith(WORKSPACE_CONTAINS_PREFIX)).map((Event) => Event.slice(WORKSPACE_CONTAINS_PREFIX.length)).filter((Glob) => Glob.length > 0), "GetWorkspaceContainsGlobs");
    ActivateWorkspaceContainsExtensions = /* @__PURE__ */ __name(async (Context13, AddedFolders) => {
      if (AddedFolders.length === 0) return;
      const FolderPaths = AddedFolders.map((Folder) => ({
        FsPath: UriToFsPath(Folder?.uri),
        Uri: Folder?.uri ?? ""
      })).filter(
        (Record) => typeof Record.FsPath === "string" && Record.FsPath.length > 0
      );
      if (FolderPaths.length === 0) return;
      const Extensions = [];
      for (const [Identifier, Extension2] of Context13.ExtensionRegistry.entries()) {
        const Globs = GetWorkspaceContainsGlobs(Extension2);
        if (Globs.length === 0) continue;
        if (Context13.ActivatedExtensions.has(Identifier)) continue;
        Extensions.push({ Identifier, Globs });
      }
      if (Extensions.length === 0) {
        try {
          process.stdout.write(
            "[LandFix:Activator] No pending workspaceContains extensions; skipping scan.\n"
          );
        } catch {
        }
        return;
      }
      const { default: ExtensionHostHandler } = await Promise.resolve().then(() => (init_Handler3(), Handler_exports2));
      let ActivationCount = 0;
      for (const { Identifier, Globs } of Extensions) {
        let MatchingGlob;
        let MatchingFolder;
        for (const Folder of FolderPaths) {
          for (const Glob of Globs) {
            const IsLiteral = !/[*?[\]]/.test(Glob);
            let Hit = false;
            if (IsLiteral) {
              Hit = await FolderContainsGlob(Folder.FsPath, Glob);
            } else {
              const Mountain = await FolderContainsGlobViaMountain(
                Context13,
                Glob
              );
              if (typeof Mountain === "boolean") {
                Hit = Mountain;
              } else {
                Hit = await FolderContainsGlob(Folder.FsPath, Glob);
              }
            }
            if (Hit) {
              MatchingGlob = Glob;
              MatchingFolder = Folder.FsPath;
              break;
            }
          }
          if (MatchingGlob) break;
        }
        if (!MatchingGlob) continue;
        try {
          process.stdout.write(
            `[LandFix:Activator] workspaceContains match: extension=${Identifier} glob=${MatchingGlob} folder=${MatchingFolder}
`
          );
        } catch {
        }
        try {
          await ExtensionHostHandler.HandleActivateByEvent(Context13, {
            activationEvent: `${WORKSPACE_CONTAINS_PREFIX}${MatchingGlob}`
          });
          ActivationCount += 1;
        } catch (CaughtError) {
          const Message = CaughtError instanceof globalThis.Error ? CaughtError.message : String(CaughtError);
          try {
            process.stdout.write(
              `[LandFix:Activator] activate failed for ${Identifier}: ${Message}
`
            );
          } catch {
          }
        }
      }
      try {
        process.stdout.write(
          `[LandFix:Activator] Pass complete: ${ActivationCount} extension(s) activated against ${FolderPaths.length} folder(s).
`
        );
      } catch {
      }
    }, "ActivateWorkspaceContainsExtensions");
    Activator_default = ActivateWorkspaceContainsExtensions;
  }
});

// Source/Services/Handler/Notification/Handler.ts
var LazyURI, MakeUriStub, HydrateUri, ApplyWorkspaceDelta, SafeEmit, HandleSpecificNotification, Handler_default5;
var init_Handler5 = __esm({
  async "Source/Services/Handler/Notification/Handler.ts"() {
    "use strict";
    init_Namespace2();
    ({ URI: LazyURI } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js"));
    MakeUriStub = /* @__PURE__ */ __name((Raw2) => {
      const Path = Raw2.replace(/^file:\/\//, "");
      return {
        scheme: Raw2.startsWith("file://") ? "file" : "unknown",
        authority: "",
        path: Path,
        query: "",
        fragment: "",
        fsPath: Path,
        toString: /* @__PURE__ */ __name(() => Raw2, "toString")
      };
    }, "MakeUriStub");
    HydrateUri = /* @__PURE__ */ __name((Raw2) => {
      if (!Raw2) return null;
      if (typeof Raw2 === "string") {
        try {
          return LazyURI.parse(Raw2);
        } catch {
          return MakeUriStub(Raw2);
        }
      }
      if (typeof Raw2.toString === "function" && typeof Raw2.fsPath === "string")
        return Raw2;
      try {
        const RawStr = Raw2.toString !== Object.prototype.toString ? Raw2.toString() : Raw2.scheme && Raw2.path ? `${Raw2.scheme}://${Raw2.authority ?? ""}${Raw2.path}` : null;
        if (!RawStr) return null;
        return LazyURI.parse(RawStr);
      } catch {
        const FallbackStr = Raw2.toString !== Object.prototype.toString ? Raw2.toString() : Raw2.scheme && Raw2.path ? `${Raw2.scheme}://${Raw2.authority ?? ""}${Raw2.path}` : null;
        return FallbackStr ? MakeUriStub(FallbackStr) : null;
      }
    }, "HydrateUri");
    if (!process._landUncaughtHandlerInstalled) {
      process.on("uncaughtException", (Error2) => {
        try {
          const Stack = Error2 instanceof globalThis.Error ? Error2.stack?.split("\n").slice(0, 6).join(" | ") : String(Error2);
          process.stdout.write(
            `[LandFix:UncaughtException] ${Stack ?? "unknown"}
`
          );
        } catch {
        }
      });
      process.on("unhandledRejection", (Reason) => {
        try {
          const Stack = Reason instanceof globalThis.Error ? Reason.stack?.split("\n").slice(0, 6).join(" | ") : String(Reason);
          const Text = Stack ?? "unknown";
          const IsBenignEnoent = Text.includes("ENOENT") && (Text.includes("/.registers") || Text.includes("/globalStorage/") || Text.includes("/workspaceStorage/") || Text.includes("/User/snippets") || Text.includes("/User/prompts") || Text.includes("/User/keybindings.json") || Text.includes("aiGeneratedWorkspaces.json") || Text.includes("languageDetectionWorkerCache.json"));
          const HasExtensionFrame = Text.includes("/.fiddee/extensions/") || Text.includes("/.land/extensions/") || Text.includes("/extensions/") && (Text.includes("DEVSENSE.phptools") || Text.includes("redhat.java") || Text.includes("redhat.vscode-yaml") || Text.includes("GitHub.copilot") || Text.includes("Anthropic.claude-code") || Text.includes("RooVeterinaryInc.roo-cline") || Text.includes("eamodio.gitlens") || Text.includes("vscodevim.vim") || Text.includes("Dart-Code.dart-code"));
          const IsBenignExtensionTypeError = HasExtensionFrame && (Text.includes("TypeError: Cannot read properties of null") || Text.includes(
            "TypeError: Cannot read properties of undefined"
          ) || Text.includes("TypeError: Cannot set properties of null") || Text.includes(
            "TypeError: Cannot set properties of undefined"
          ) || Text.includes("is not a function") || Text.includes("is not iterable"));
          const IsBenign = IsBenignEnoent || IsBenignExtensionTypeError;
          const Tag = IsBenign ? "LandFix:UnhandledRejection:Verbose" : "LandFix:UnhandledRejection";
          if (IsBenign && !process.env["Trace"]?.includes("landfix-rejection-verbose")) {
            return;
          }
          process.stdout.write(`[${Tag}] ${Text}
`);
        } catch {
        }
      });
      process._landUncaughtHandlerInstalled = true;
      try {
        process.stdout.write(
          "[LandFix:UncaughtHandlers] uncaughtException + unhandledRejection handlers installed at NotificationHandler module load\n"
        );
      } catch {
      }
    }
    ApplyWorkspaceDelta = /* @__PURE__ */ __name((Context13, Payload) => {
      const Added = Payload?.added ?? [];
      const Removed = Payload?.removed ?? [];
      const RemovedUris = new Set(
        Removed.map((Folder) => Folder?.uri ?? "").filter(
          (Uri) => Uri.length > 0
        )
      );
      const Init = Context13.ExtensionHostInitData ??= {};
      const Workspace = Init.workspace ??= Init.workspaceData ?? {};
      const Existing = Array.isArray(Workspace.folders) ? Workspace.folders : [];
      const Kept = Existing.filter(
        (Folder) => !RemovedUris.has(Folder?.uri ?? "")
      );
      const ExistingUris = new Set(
        Kept.map((Folder) => Folder?.uri ?? "").filter((Uri) => Uri.length > 0)
      );
      for (const Candidate of Added) {
        const Uri = Candidate?.uri ?? "";
        if (Uri.length === 0 || ExistingUris.has(Uri)) continue;
        Kept.push(Candidate);
        ExistingUris.add(Uri);
      }
      for (let Index = 0; Index < Kept.length; Index += 1) {
        Kept[Index] = { ...Kept[Index], index: Index };
      }
      Workspace.folders = Kept;
      Init.workspaceData = Workspace;
      if (typeof Workspace.name !== "string" || Workspace.name.length === 0) {
        const First = Kept[0];
        if (First?.name) Workspace.name = First.name;
      }
      return Kept;
    }, "ApplyWorkspaceDelta");
    SafeEmit = /* @__PURE__ */ __name((Source, Event, Payload) => {
      if (!Source) return;
      const Listeners = Source.listeners(Event);
      if (Listeners.length === 0) return;
      for (const Listener of Listeners) {
        try {
          Listener(Payload);
        } catch (Caught) {
          const Err = Caught;
          const Summary = typeof Err?.stack === "string" ? Err.stack.split("\n").slice(0, 3).join(" | ") : typeof Err?.message === "string" ? Err.message : String(Caught);
          try {
            process.stdout.write(
              `[LandFix:SafeEmit] listener for "${Event}" threw: ${Summary}
`
            );
          } catch {
          }
        }
      }
    }, "SafeEmit");
    HandleSpecificNotification = /* @__PURE__ */ __name((Emitter, DocumentContentCache, HandleDocumentChange2, HandleDocumentOpen2, HandleDocumentClose2, HandleDocumentSave2, Method, Parameters, WorkspaceEventEmitter, Context13) => {
      switch (Method) {
        case "extension.change":
          Emitter.emit("extensionChanged", Parameters);
          break;
        case "configuration.change":
          Emitter.emit("configurationChanged", Parameters);
          break;
        case "window.focused":
          Emitter.emit("windowFocused", Parameters);
          if (Context13) {
            Context13.__windowState = {
              focused: true,
              active: true
            };
            Emitter.emit("window.didChangeWindowState", {
              focused: true,
              active: true
            });
          }
          break;
        case "window.blurred":
          Emitter.emit("windowBlurred", Parameters);
          if (Context13) {
            Context13.__windowState = {
              focused: false,
              active: false
            };
            Emitter.emit("window.didChangeWindowState", {
              focused: false,
              active: false
            });
          }
          break;
        case "system.shutdown":
          Emitter.emit("systemShutdown", Parameters);
          break;
        case "$acceptModelChanged":
        case "document.didChange":
          HandleDocumentChange2(
            DocumentContentCache,
            Parameters,
            WorkspaceEventEmitter
          );
          if (Context13) {
            const UriPart = Array.isArray(Parameters) ? Parameters[0] : Parameters;
            const EventPart = Array.isArray(Parameters) ? Parameters[1] : Parameters;
            const ChangeUri = UriPart?.external ?? UriPart?.uri ?? UriPart?.Uri ?? UriPart?.fileName;
            const NewVersion = EventPart?.versionId ?? EventPart?.VersionId ?? EventPart?.version ?? UriPart?.version;
            if (ChangeUri) {
              const TextDocs = Context13.__textDocuments ?? [];
              const Doc = TextDocs.find(
                (D) => D?.uri?.toString?.() === ChangeUri || D?.fileName === ChangeUri
              );
              if (Doc) {
                if (NewVersion != null) Doc.version = NewVersion;
                Doc.isDirty = true;
              }
            }
          }
          break;
        case "$acceptModelAdded":
        case "$acceptModelOpen":
        case "document.didOpen":
          HandleDocumentOpen2(
            DocumentContentCache,
            Parameters,
            WorkspaceEventEmitter
          );
          if (Context13) {
            const OpenModels = Array.isArray(Parameters) ? Parameters : [Parameters];
            const TextDocs = Context13.__textDocuments ?? [];
            for (const Model of OpenModels) {
              const Uri = Model?.Uri ?? Model?.uri ?? Model?.fileName ?? "";
              if (!Uri) continue;
              const LangId = Model?.LanguageIdentifier ?? Model?.languageId ?? "plaintext";
              const Existing = TextDocs.find(
                (D) => D?.uri?.toString?.() === Uri || D?.fileName === Uri
              );
              if (!Existing) {
                const DocUri = {
                  toString: /* @__PURE__ */ __name(() => Uri, "toString"),
                  fsPath: Uri.replace(/^file:\/\//, ""),
                  scheme: Uri.includes(":") ? Uri.split(":")[0] : "file",
                  path: Uri.replace(/^file:\/\//, ""),
                  external: Uri
                };
                TextDocs.push({
                  uri: DocUri,
                  fileName: Uri.replace(/^file:\/\//, ""),
                  languageId: LangId,
                  version: Model?.VersionId ?? Model?.version ?? 1,
                  isDirty: false,
                  isClosed: false,
                  isUntitled: Uri.startsWith("untitled:"),
                  eol: 1,
                  get lineCount() {
                    return (DocumentContentCache.get(Uri) ?? "").split(/\r?\n/).length;
                  },
                  getText: /* @__PURE__ */ __name((Range) => {
                    const Text = DocumentContentCache.get(Uri) ?? "";
                    if (!Range) return Text;
                    const Lines = Text.split(/\r?\n/);
                    const SL = Range?.start?.line ?? 0;
                    const SC = Range?.start?.character ?? 0;
                    const EL = Range?.end?.line ?? Lines.length - 1;
                    const EC = Range?.end?.character ?? Lines[EL]?.length ?? 0;
                    if (SL === EL)
                      return (Lines[SL] ?? "").slice(SC, EC);
                    const Parts = [(Lines[SL] ?? "").slice(SC)];
                    for (let I = SL + 1; I < EL; I++)
                      Parts.push(Lines[I] ?? "");
                    Parts.push((Lines[EL] ?? "").slice(0, EC));
                    return Parts.join("\n");
                  }, "getText"),
                  lineAt: /* @__PURE__ */ __name((N) => {
                    const Text = DocumentContentCache.get(Uri) ?? "";
                    const Lines = Text.split(/\r?\n/);
                    const Ln = typeof N === "number" ? N : N?.line ?? 0;
                    const Clamped = Math.max(
                      0,
                      Math.min(Ln, Lines.length - 1)
                    );
                    const T = Lines[Clamped] ?? "";
                    const FNW = T.search(/\S/);
                    return {
                      text: T,
                      lineNumber: Clamped,
                      range: {
                        start: { line: Clamped, character: 0 },
                        end: {
                          line: Clamped,
                          character: T.length
                        }
                      },
                      firstNonWhitespaceCharacterIndex: FNW < 0 ? T.length : FNW,
                      isEmptyOrWhitespace: T.trim().length === 0
                    };
                  }, "lineAt"),
                  save: /* @__PURE__ */ __name(async () => false, "save"),
                  getWordRangeAtPosition: /* @__PURE__ */ __name((Pos, Pat) => {
                    const Text = DocumentContentCache.get(Uri) ?? "";
                    const Lines = Text.split(/\r?\n/);
                    const L = Lines[Pos?.line ?? 0] ?? "";
                    const R = Pat ?? /\w+/g;
                    R.lastIndex = 0;
                    const C = Pos?.character ?? 0;
                    let M;
                    while ((M = R.exec(L)) !== null) {
                      if (M.index <= C && M.index + M[0].length >= C)
                        return {
                          start: {
                            line: Pos?.line ?? 0,
                            character: M.index
                          },
                          end: {
                            line: Pos?.line ?? 0,
                            character: M.index + M[0].length
                          }
                        };
                    }
                    return void 0;
                  }, "getWordRangeAtPosition"),
                  validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
                  validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
                  offsetAt: /* @__PURE__ */ __name((P) => {
                    const Text = DocumentContentCache.get(Uri) ?? "";
                    const Lines = Text.split(/\r?\n/);
                    let O = 0;
                    for (let I = 0; I < (P?.line ?? 0) && I < Lines.length; I++)
                      O += (Lines[I]?.length ?? 0) + 1;
                    return O + (P?.character ?? 0);
                  }, "offsetAt"),
                  positionAt: /* @__PURE__ */ __name((Off) => {
                    const Text = DocumentContentCache.get(Uri) ?? "";
                    const Lines = Text.split(/\r?\n/);
                    let R = Off;
                    for (let I = 0; I < Lines.length; I++) {
                      const L = (Lines[I]?.length ?? 0) + 1;
                      if (R < L) return { line: I, character: R };
                      R -= L;
                    }
                    return {
                      line: Lines.length - 1,
                      character: Lines[Lines.length - 1]?.length ?? 0
                    };
                  }, "positionAt")
                });
              }
            }
            Context13.__textDocuments = TextDocs;
          }
          if (Context13) {
            const CapturedContext = Context13;
            const Models = Array.isArray(Parameters) ? Parameters : [Parameters];
            const LanguageIdentifiers = /* @__PURE__ */ new Set();
            for (const Model of Models) {
              const Id = Model?.LanguageIdentifier ?? Model?.languageId ?? Model?.language;
              if (typeof Id === "string" && Id.length > 0) {
                LanguageIdentifiers.add(Id);
              }
            }
            if (LanguageIdentifiers.size > 0) {
              setImmediate(() => {
                Promise.resolve().then(() => (init_Handler3(), Handler_exports2)).then(({ default: ExtensionHostHandler }) => {
                  for (const Id of LanguageIdentifiers) {
                    void ExtensionHostHandler.HandleActivateByEvent(
                      CapturedContext,
                      { activationEvent: `onLanguage:${Id}` }
                    ).catch((Error2) => {
                      try {
                        process.stdout.write(
                          `[LandFix:Activator] onLanguage:${Id} activation failed: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}
`
                        );
                      } catch {
                      }
                    });
                  }
                }).catch(() => {
                });
              });
            }
          }
          break;
        case "$acceptModelRemoved":
        case "$acceptModelClosed":
        case "document.didClose":
          HandleDocumentClose2(
            DocumentContentCache,
            Parameters,
            WorkspaceEventEmitter
          );
          if (Context13) {
            const CloseModels = Array.isArray(Parameters) ? Parameters : [Parameters];
            const ClosedUris = new Set(
              CloseModels.map(
                (M) => M?.uri ?? M?.Uri ?? M?.fileName ?? ""
              ).filter(Boolean)
            );
            const Docs = Context13.__textDocuments ?? [];
            Context13.__textDocuments = Docs.filter((D) => {
              const DUri = D?.uri?.toString?.() ?? D?.fileName ?? "";
              return !ClosedUris.has(DUri);
            });
            const Visible = Context13.__visibleTextEditors ?? [];
            Context13.__visibleTextEditors = Visible.filter(
              (E) => {
                const EUri = E?.document?.uri?.toString?.() ?? "";
                return !ClosedUris.has(EUri);
              }
            );
          }
          break;
        // `document.willSave` - Mountain fires this BEFORE the file is persisted
        // (from `Workspace.Save` Track effect). Extensions subscribe via
        // `workspace.onWillSaveTextDocument` to apply last-minute edits.
        // We run all registered save listeners and collect any TextEdits they
        // return, then forward the collected edits back to Mountain as
        // `window.applyTextEdits` so they are applied before disk-write.
        case "document.willSave":
        case "$acceptWillSaveDocument": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Uri = Payload?.uri ?? Payload?.Uri ?? "";
          const Reason = Payload?.reason ?? Payload?.Reason ?? 1;
          const Listeners = Context13.__willSaveListeners ?? [];
          if (Listeners.length > 0 && Uri) {
            const Doc = {
              uri: {
                toString: /* @__PURE__ */ __name(() => Uri, "toString"),
                fsPath: Uri.replace(/^file:\/\//, ""),
                scheme: "file"
              },
              fileName: Uri.replace(/^file:\/\//, ""),
              languageId: "plaintext",
              version: 1,
              isDirty: true,
              isClosed: false,
              isUntitled: false,
              getText: /* @__PURE__ */ __name(() => DocumentContentCache.get(Uri) ?? "", "getText"),
              save: /* @__PURE__ */ __name(async () => true, "save")
            };
            const WillSaveThenables = [];
            const Event = {
              document: Doc,
              reason: Reason,
              // Collect thenables so we can await them all before
              // forwarding edits to Mountain. This ensures all
              // `waitUntil(promise)` calls in the same save cycle
              // complete before any edit is applied, matching VS Code's
              // `ExtHostDocuments.$acceptWillSaveDocument` ordering.
              waitUntil: /* @__PURE__ */ __name((Thenable) => {
                WillSaveThenables.push(
                  Promise.resolve(Thenable).catch(() => void 0)
                );
              }, "waitUntil")
            };
            for (const Listener of Listeners) {
              try {
                Listener(Event);
              } catch {
              }
            }
            if (WillSaveThenables.length > 0 && Uri) {
              Promise.allSettled(WillSaveThenables).then((Results) => {
                const AllEdits = [];
                for (const R of Results) {
                  if (R.status === "fulfilled" && Array.isArray(R.value) && R.value.length > 0) {
                    AllEdits.push(...R.value);
                  }
                }
                if (AllEdits.length > 0) {
                  Context13?.SendToMountain("window.applyTextEdits", {
                    uri: Uri,
                    edits: AllEdits
                  }).catch(() => {
                  });
                }
              });
            }
          }
          SafeEmit(WorkspaceEventEmitter, "willSaveTextDocument", {
            uri: Uri,
            reason: Reason
          });
          break;
        }
        case "$acceptModelSaved":
        case "document.didSave":
          HandleDocumentSave2(
            DocumentContentCache,
            Parameters,
            WorkspaceEventEmitter
          );
          if (Context13) {
            const SavePayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
            const SaveUri = SavePayload?.uri ?? SavePayload?.Uri ?? SavePayload?.external;
            if (SaveUri) {
              const TextDocs = Context13.__textDocuments ?? [];
              const SaveDoc = TextDocs.find(
                (D) => D?.uri?.toString?.() === SaveUri || D?.fileName === SaveUri
              );
              if (SaveDoc) {
                SaveDoc.isDirty = false;
              }
            }
          }
          break;
        case "webview.message": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Payload?.handle) {
            Emitter.emit(
              `webview.message:${Payload.handle}`,
              Payload.message
            );
          }
          break;
        }
        case "webview.dispose": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Payload?.handle) {
            Emitter.emit(`webview.dispose:${Payload.handle}`);
            try {
              Promise.resolve().then(() => (init_Namespace2(), Namespace_exports)).then(
                ({ WebviewViewBuilders: _Builders }) => {
                }
              );
            } catch (_e) {
            }
          }
          break;
        }
        case "webview.viewState": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Payload?.handle) {
            Emitter.emit(`webview.viewState:${Payload.handle}`, {
              active: Payload.active,
              visible: Payload.visible,
              viewColumn: Payload.viewColumn
            });
            Emitter.emit(
              `webview.viewVisibility:${Payload.handle}`,
              !!Payload.visible
            );
          }
          break;
        }
        case "$deltaWorkspaceFolders": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Added = Payload?.added ?? [];
          const Removed = Payload?.removed ?? [];
          let Merged = [];
          if (Context13) {
            Merged = ApplyWorkspaceDelta(Context13, Payload ?? {});
          }
          try {
            process.stdout.write(
              `[LandFix:WsDelta] $deltaWorkspaceFolders +${Added.length} -${Removed.length} \u2192 folders=${Merged.length}
`
            );
          } catch {
          }
          const HydrateFolder = /* @__PURE__ */ __name((Wire, Index) => {
            const Uri = HydrateUri(Wire.uri);
            if (!Uri) return null;
            return {
              uri: Uri,
              name: Wire.name ?? Uri.fsPath.split("/").pop() ?? "",
              index: typeof Wire.index === "number" ? Wire.index : Index
            };
          }, "HydrateFolder");
          const AddedHydrated = Added.map(
            (W, I) => HydrateFolder(W, I)
          ).filter((V) => V !== null);
          const RemovedHydrated = Removed.map(
            (W, I) => HydrateFolder(W, I)
          ).filter((V) => V !== null);
          const MergedHydrated = Merged.map(
            (W, I) => HydrateFolder(W, I)
          ).filter((V) => V !== null);
          try {
            process.stdout.write(
              `[LandFix:WsDelta] hydrated +${AddedHydrated.length}/${Added.length} -${RemovedHydrated.length}/${Removed.length} folders=${MergedHydrated.length}/${Merged.length}
`
            );
          } catch {
          }
          const Event = {
            added: AddedHydrated,
            removed: RemovedHydrated,
            folders: MergedHydrated
          };
          SafeEmit(WorkspaceEventEmitter, "didChangeWorkspaceFolders", Event);
          SafeEmit(Emitter, "workspaceFoldersChanged", Event);
          if (Context13 && Added.length > 0) {
            const CapturedContext = Context13;
            setImmediate(() => {
              Promise.resolve().then(() => (init_Activator(), Activator_exports)).then(
                ({ default: Activate }) => Activate(CapturedContext, Added)
              ).catch((Error2) => {
                try {
                  process.stdout.write(
                    `[LandFix:Activator] activation pass failed: ${Error2 instanceof Error2 ? Error2.message : String(Error2)}
`
                  );
                } catch {
                }
              });
            });
          }
          break;
        }
        case "window.didChangeActiveTextEditor": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const UriRaw = typeof Payload === "string" ? Payload : Payload?.uri ?? Payload?.document?.uri ?? Payload?.document;
          const DeriveLang = /* @__PURE__ */ __name((UriStr) => {
            if (!UriStr) return "plaintext";
            const Ext = (UriStr.split(".").pop() ?? "").toLowerCase().split("?")[0] ?? "";
            const Map2 = {
              rs: "rust",
              ts: "typescript",
              tsx: "typescriptreact",
              js: "javascript",
              jsx: "javascriptreact",
              mjs: "javascript",
              json: "json",
              jsonc: "jsonc",
              json5: "json5",
              py: "python",
              go: "go",
              rb: "ruby",
              java: "java",
              c: "c",
              cpp: "cpp",
              cs: "csharp",
              h: "c",
              hpp: "cpp",
              html: "html",
              css: "css",
              scss: "scss",
              less: "less",
              md: "markdown",
              mdx: "mdx",
              txt: "plaintext",
              toml: "toml",
              yaml: "yaml",
              yml: "yaml",
              xml: "xml",
              sh: "shellscript",
              bash: "shellscript",
              zsh: "shellscript",
              fish: "fish",
              ps1: "powershell",
              php: "php",
              sql: "sql",
              kt: "kotlin",
              swift: "swift",
              r: "r",
              dart: "dart",
              lua: "lua",
              vim: "viml",
              vue: "vue",
              svelte: "svelte",
              astro: "astro",
              graphql: "graphql",
              proto: "proto"
            };
            return Map2[Ext] ?? "plaintext";
          }, "DeriveLang");
          const LanguageId = Payload?.languageId ?? Payload?.language ?? DeriveLang(UriRaw);
          const HydratedUri = UriRaw ? HydrateUri(UriRaw) : null;
          const DocCached = UriRaw ? Context13?.DocumentContentCache?.get(UriRaw) : void 0;
          const DocText = DocCached ?? "";
          const DocLines = DocText.split(/\r?\n/);
          const MakeDoc = /* @__PURE__ */ __name((RealText) => {
            const Lines = RealText.split(/\r?\n/);
            return {
              uri: HydratedUri,
              fileName: HydratedUri?.fsPath ?? UriRaw ?? "",
              languageId: LanguageId,
              version: Payload?.version ?? 1,
              isDirty: false,
              isClosed: false,
              eol: 1,
              get lineCount() {
                return Lines.length;
              },
              getText: /* @__PURE__ */ __name((Range) => {
                if (!Range) return RealText;
                const SL = Range?.start?.line ?? 0;
                const SC = Range?.start?.character ?? 0;
                const EL = Range?.end?.line ?? Lines.length - 1;
                const EC = Range?.end?.character ?? Lines[EL]?.length ?? 0;
                if (SL === EL) return (Lines[SL] ?? "").slice(SC, EC);
                const Parts = [(Lines[SL] ?? "").slice(SC)];
                for (let I = SL + 1; I < EL; I++)
                  Parts.push(Lines[I] ?? "");
                Parts.push((Lines[EL] ?? "").slice(0, EC));
                return Parts.join("\n");
              }, "getText"),
              lineAt: /* @__PURE__ */ __name((LineOrPos) => {
                const N = typeof LineOrPos === "number" ? LineOrPos : LineOrPos.line;
                const T = Lines[N] ?? "";
                const FNW = T.search(/\S/);
                return {
                  text: T,
                  lineNumber: N,
                  range: {
                    start: { line: N, character: 0 },
                    end: { line: N, character: T.length }
                  },
                  firstNonWhitespaceCharacterIndex: FNW === -1 ? T.length : FNW,
                  isEmptyOrWhitespace: T.trim().length === 0
                };
              }, "lineAt"),
              save: /* @__PURE__ */ __name(async () => false, "save"),
              getWordRangeAtPosition: /* @__PURE__ */ __name((Pos, Pat) => {
                const L = Lines[Pos?.line ?? 0] ?? "";
                const R = Pat ?? /\w+/g;
                R.lastIndex = 0;
                const C = Pos?.character ?? 0;
                let M;
                while ((M = R.exec(L)) !== null) {
                  if (M.index <= C && M.index + M[0].length >= C)
                    return {
                      start: {
                        line: Pos.line,
                        character: M.index
                      },
                      end: {
                        line: Pos.line,
                        character: M.index + M[0].length
                      }
                    };
                }
                return void 0;
              }, "getWordRangeAtPosition"),
              validateRange: /* @__PURE__ */ __name((Rng) => Rng, "validateRange"),
              validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
              offsetAt: /* @__PURE__ */ __name((P) => {
                let O = 0;
                for (let I = 0; I < (P?.line ?? 0) && I < Lines.length; I++)
                  O += (Lines[I]?.length ?? 0) + 1;
                return O + (P?.character ?? 0);
              }, "offsetAt"),
              positionAt: /* @__PURE__ */ __name((Off) => {
                let R = Off;
                for (let I = 0; I < Lines.length; I++) {
                  const L = (Lines[I]?.length ?? 0) + 1;
                  if (R < L) return { line: I, character: R };
                  R -= L;
                }
                return {
                  line: Lines.length - 1,
                  character: Lines[Lines.length - 1]?.length ?? 0
                };
              }, "positionAt")
            };
          }, "MakeDoc");
          const LiveSelection = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
            active: { line: 0, character: 0 },
            anchor: { line: 0, character: 0 },
            isEmpty: true,
            isReversed: false,
            isSingleLine: true
          };
          const TextEditorStub = HydratedUri ? {
            document: MakeDoc(DocText),
            get selection() {
              return LiveSelection;
            },
            set selection(S) {
              Object.assign(LiveSelection, S);
            },
            selections: [LiveSelection],
            visibleRanges: [],
            viewColumn: Payload?.viewColumn ?? 1,
            options: {
              tabSize: 4,
              insertSpaces: true,
              cursorStyle: 1,
              lineNumbers: 1
            },
            // `editor.setDecorations(type, ranges)` - send to Mountain for Sky relay
            setDecorations: /* @__PURE__ */ __name((DecorationType, RangesOrOptions) => {
              const Key = typeof DecorationType === "string" ? DecorationType : DecorationType?.key ?? DecorationType?.id ?? String(DecorationType);
              Context13.SendToMountain(
                "window.setTextEditorDecorations",
                {
                  decorationTypeKey: Key,
                  uri: UriRaw,
                  rangesOrOptions: RangesOrOptions
                }
              ).catch(() => {
              });
            }, "setDecorations"),
            // `editor.edit(editBuilder => {...})` - collect edits and send to Mountain
            edit: /* @__PURE__ */ __name((Callback, _Options) => {
              const Collected = [];
              const Builder = {
                replace: /* @__PURE__ */ __name((Range, Value) => Collected.push({
                  range: Range,
                  text: Value
                }), "replace"),
                insert: /* @__PURE__ */ __name((Position, Value) => Collected.push({
                  range: {
                    startLineNumber: (Position?.line ?? 0) + 1,
                    startColumn: (Position?.character ?? 0) + 1,
                    endLineNumber: (Position?.line ?? 0) + 1,
                    endColumn: (Position?.character ?? 0) + 1
                  },
                  text: Value
                }), "insert"),
                delete: /* @__PURE__ */ __name((Range) => Collected.push({ range: Range, text: "" }), "delete"),
                setEndOfLine: /* @__PURE__ */ __name(() => {
                }, "setEndOfLine")
              };
              try {
                Callback(Builder);
              } catch {
                return Promise.resolve(false);
              }
              if (!Collected.length) return Promise.resolve(true);
              return Context13.SendToMountain(
                "window.applyTextEdits",
                { uri: UriRaw, edits: Collected }
              ).then(() => true).catch(() => false);
            }, "edit"),
            // `editor.insertSnippet` - convert to plain-text edit for now
            insertSnippet: /* @__PURE__ */ __name(async (Snippet, Location) => {
              const Text = typeof Snippet === "string" ? Snippet : typeof Snippet?.value === "string" ? Snippet.value : String(Snippet);
              const Range = Location ?? LiveSelection;
              await Context13.SendToMountain(
                "window.applyTextEdits",
                {
                  uri: UriRaw,
                  edits: [{ range: Range, text: Text }]
                }
              ).catch(() => {
              });
              return true;
            }, "insertSnippet"),
            revealRange: /* @__PURE__ */ __name((Range, RevealType) => {
              void Context13?.MountainClient?.sendRequest(
                "window.revealRange",
                {
                  uri: UriRaw,
                  range: Range,
                  revealType: RevealType ?? 0
                }
              ).catch(() => {
              });
            }, "revealRange"),
            show: /* @__PURE__ */ __name((ViewColumn) => {
              void Context13?.MountainClient?.sendRequest(
                "showTextDocument",
                [
                  {
                    uri: UriRaw,
                    viewColumn: ViewColumn ?? 1
                  },
                  ViewColumn ?? 1
                ]
              ).catch(() => {
              });
            }, "show"),
            hide: /* @__PURE__ */ __name(() => {
            }, "hide")
          } : void 0;
          if (Context13) {
            Context13.__activeTextEditor = TextEditorStub;
            Context13.__activeTextEditorSelection = LiveSelection;
            const Visible = Array.isArray(
              Context13.__visibleTextEditors
            ) ? Context13.__visibleTextEditors : [];
            const UriKey2 = TextEditorStub?.document?.uri?.toString?.() ?? "";
            const Idx = UriKey2 ? Visible.findIndex(
              (E) => E?.document?.uri?.toString?.() === UriKey2
            ) : -1;
            if (Idx >= 0) {
              Visible[Idx] = TextEditorStub;
            } else if (TextEditorStub) {
              Visible.push(TextEditorStub);
            }
            Context13.__visibleTextEditors = Visible;
          }
          SafeEmit(
            Emitter,
            "window.didChangeActiveTextEditor",
            TextEditorStub
          );
          break;
        }
        case "window.didChangeTextEditorSelection": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Sels = Array.isArray(Payload?.selections) ? Payload.selections : [];
          const LiveSel = Context13?.__activeTextEditorSelection;
          if (LiveSel && Sels.length > 0) {
            const S = Sels[0];
            const StartLine = Math.max(
              0,
              (S?.startLineNumber ?? S?.start?.line ?? 1) - 1
            );
            const StartChar = Math.max(
              0,
              (S?.startColumn ?? S?.start?.character ?? 1) - 1
            );
            const EndLine = Math.max(
              0,
              (S?.endLineNumber ?? S?.end?.line ?? 1) - 1
            );
            const EndChar = Math.max(
              0,
              (S?.endColumn ?? S?.end?.character ?? 1) - 1
            );
            LiveSel.start = { line: StartLine, character: StartChar };
            LiveSel.end = { line: EndLine, character: EndChar };
            LiveSel.active = { line: EndLine, character: EndChar };
            LiveSel.anchor = { line: StartLine, character: StartChar };
            LiveSel.isEmpty = StartLine === EndLine && StartChar === EndChar;
            LiveSel.isReversed = false;
            LiveSel.isSingleLine = StartLine === EndLine;
          }
          const StubSels = Sels.map((S) => ({
            start: {
              line: Math.max(0, (S?.startLineNumber ?? 1) - 1),
              character: Math.max(0, (S?.startColumn ?? 1) - 1)
            },
            end: {
              line: Math.max(0, (S?.endLineNumber ?? 1) - 1),
              character: Math.max(0, (S?.endColumn ?? 1) - 1)
            },
            active: {
              line: Math.max(0, (S?.endLineNumber ?? 1) - 1),
              character: Math.max(0, (S?.endColumn ?? 1) - 1)
            },
            anchor: {
              line: Math.max(0, (S?.startLineNumber ?? 1) - 1),
              character: Math.max(0, (S?.startColumn ?? 1) - 1)
            },
            isEmpty: S?.startLineNumber === S?.endLineNumber && S?.startColumn === S?.endColumn,
            isReversed: false,
            isSingleLine: S?.startLineNumber === S?.endLineNumber
          }));
          const Editor = Context13?.__activeTextEditor;
          if (Editor && StubSels.length > 0) {
            Object.assign(Editor.selection ?? {}, StubSels[0]);
            Editor.selections = StubSels;
          }
          SafeEmit(Emitter, "window.didChangeTextEditorSelection", {
            textEditor: Editor,
            selections: StubSels,
            kind: void 0
          });
          break;
        }
        case "$acceptTerminalProcessData": {
          const Payload = Array.isArray(Parameters) ? Parameters : [Parameters];
          const TerminalId = Payload[0];
          const Data = Payload[1];
          if (TerminalId !== void 0) {
            Emitter.emit(`terminal:data:${TerminalId}`, Data);
          }
          Emitter.emit("terminalData", { id: TerminalId, data: Data });
          break;
        }
        case "$acceptTerminalProcessExit": {
          const Payload = Array.isArray(Parameters) ? Parameters : [Parameters];
          const TerminalId = Payload[0];
          if (TerminalId !== void 0) {
            Emitter.emit(`terminal:exit:${TerminalId}`);
          }
          Emitter.emit("terminalExit", { id: TerminalId });
          break;
        }
        // B6: Mountain notifies Cocoon when a terminal is opened from the UI
        // (not via the extension createTerminal() API) so vscode.window.terminals
        // stays accurate.
        case "$acceptTerminalOpened": {
          const OpenPayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const OpenId = OpenPayload?.id ?? OpenPayload;
          const OpenName = OpenPayload?.name ?? `Terminal ${OpenId}`;
          if (Context13 && OpenId !== void 0) {
            if (!Array.isArray(Context13.__terminals)) {
              Context13.__terminals = [];
            }
            const Already = Context13.__terminals.some(
              (T) => T?.handle === OpenId || T?.id === OpenId
            );
            if (!Already) {
              const Stub2 = {
                name: OpenName,
                handle: OpenId,
                id: OpenId,
                processId: Promise.resolve(
                  void 0
                ),
                // shellIntegration is populated when OSC 633 P;cwd= is
                // received from the shell. Initially undefined so
                // extensions can guard with ?. before accessing .cwd.
                shellIntegration: void 0,
                sendText: /* @__PURE__ */ __name(() => {
                }, "sendText"),
                show: /* @__PURE__ */ __name(() => {
                }, "show"),
                hide: /* @__PURE__ */ __name(() => {
                }, "hide"),
                dispose: /* @__PURE__ */ __name(() => {
                }, "dispose")
              };
              Context13.__terminals.push(Stub2);
              Context13.__activeTerminal = Stub2;
              Emitter.emit("window.didOpenTerminal", Stub2);
              Emitter.emit("window.didChangeActiveTerminal", Stub2);
            }
          }
          break;
        }
        // B6: Mountain notifies Cocoon when a terminal closes so the stale
        // entry is removed from vscode.window.terminals.
        case "$acceptTerminalClosed": {
          const ClosePayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const CloseId = ClosePayload?.id ?? ClosePayload;
          if (Context13 && CloseId !== void 0) {
            const All = Context13.__terminals ?? [];
            const Removed = All.filter(
              (T) => T?.handle === CloseId || T?.id === CloseId
            );
            Context13.__terminals = All.filter(
              (T) => T?.handle !== CloseId && T?.id !== CloseId
            );
            if (Context13.__activeTerminal?.handle === CloseId || Context13.__activeTerminal?.id === CloseId) {
              Context13.__activeTerminal = void 0;
              Emitter.emit("window.didChangeActiveTerminal", void 0);
            }
            for (const Term of Removed) {
              Emitter.emit("window.didCloseTerminal", Term);
            }
          }
          break;
        }
        case "$acceptActiveTerminalChanged": {
          const ActivePayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ActiveId = ActivePayload?.id ?? (typeof ActivePayload === "number" ? ActivePayload : null);
          if (ActiveId === null || ActiveId === void 0) {
            Context13.__activeTerminal = void 0;
            Emitter.emit("window.didChangeActiveTerminal", void 0);
          } else {
            const Found = (Context13.__terminals ?? []).find(
              (T) => T?.handle === ActiveId || T?.id === ActiveId
            );
            if (Found) {
              Context13.__activeTerminal = Found;
              Emitter.emit("window.didChangeActiveTerminal", Found);
            }
          }
          break;
        }
        case "$acceptTerminalShellIntegrationActivated": {
          const ActivatedPayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ActivatedId = ActivatedPayload?.id ?? (typeof ActivatedPayload === "number" ? ActivatedPayload : null);
          if (ActivatedId !== null && ActivatedId !== void 0) {
            const ActivatedTerm = (Context13.__terminals ?? []).find(
              (T) => T?.handle === ActivatedId || T?.id === ActivatedId
            );
            if (ActivatedTerm && !ActivatedTerm.shellIntegration) {
              ActivatedTerm.shellIntegration = {
                cwd: void 0,
                executeCommand: /* @__PURE__ */ __name(() => ({ read: /* @__PURE__ */ __name(async function* () {
                }, "read") }), "executeCommand")
              };
              Emitter.emit("window.didChangeTerminalShellIntegration", {
                terminal: ActivatedTerm,
                shellIntegration: ActivatedTerm.shellIntegration
              });
            }
          }
          break;
        }
        case "$acceptTerminalCwdChange": {
          const CwdPayload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const CwdTermId = CwdPayload?.id ?? null;
          const NewCwd = CwdPayload?.cwd ?? "";
          if (NewCwd) {
            const CwdUri = {
              scheme: "file",
              authority: "",
              path: NewCwd,
              query: "",
              fragment: "",
              fsPath: NewCwd,
              toString: /* @__PURE__ */ __name(() => `file://${NewCwd}`, "toString")
            };
            const TermEntry = (Context13.__terminals ?? []).find(
              (T) => T?.handle === CwdTermId || T?.id === CwdTermId
            );
            if (TermEntry) {
              TermEntry.shellIntegration = {
                ...TermEntry.shellIntegration ?? {},
                cwd: CwdUri,
                executeCommand: /* @__PURE__ */ __name(() => ({ read: /* @__PURE__ */ __name(async function* () {
                }, "read") }), "executeCommand")
              };
            }
            Emitter.emit("window.didChangeTerminalShellIntegration", {
              terminal: TermEntry ?? null,
              shellIntegration: { cwd: CwdUri }
            });
          }
          break;
        }
        case "$fileWatcher:event":
          {
            const Event = Array.isArray(Parameters) ? Parameters[0] : Parameters;
            if (Event?.handle && Event.kind && Event.path) {
              Emitter.emit(`fileWatcher:${Event.handle}`, {
                kind: Event.kind,
                path: Event.path
              });
            }
          }
          break;
        // Debug session lifecycle. Mountain emits these via
        // `IPCProvider.SendNotificationToSideCar` from `DebugProvider.rs`
        // whenever a debug adapter starts/stops or a DAP custom event
        // arrives. The corresponding `vscode.debug.onDid*` listeners in
        // `DebugNamespace.ts` subscribe to the channels emitted below,
        // so re-emitting under the canonical short name is what makes
        // the extension-facing event fire.
        case "$onDidStartDebugSession": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Context13 && Payload) {
            Context13.__activeDebugSession = Payload;
          }
          Emitter.emit("debug.didStartSession", Payload);
          break;
        }
        case "$onDidTerminateDebugSession": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Context13) {
            const Current = Context13.__activeDebugSession;
            if (Current?.id && Payload?.id && Current.id === Payload.id) {
              Context13.__activeDebugSession = void 0;
            }
          }
          Emitter.emit("debug.didTerminateSession", Payload);
          break;
        }
        case "$onDidChangeActiveDebugSession": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          if (Context13) {
            Context13.__activeDebugSession = Payload ?? void 0;
          }
          Emitter.emit("debug.didChangeActiveSession", Payload);
          break;
        }
        case "$onDidReceiveDebugSessionCustomEvent": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          Emitter.emit("debug.didReceiveCustomEvent", Payload);
          break;
        }
        case "$onDidChangeBreakpoints": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          Emitter.emit("debug.didChangeBreakpoints", Payload);
          break;
        }
        case "$onDidChangeActiveStackItem": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          Emitter.emit("debug.didChangeActiveStackItem", Payload);
          break;
        }
        // Custom-editor document lifecycle. Mountain forwards each
        // workbench-side save / revert / backup request as one of the
        // `$onSave*Document` / `$onRevertCustomDocument` reverse-RPCs.
        // We re-emit on a `customEditor.*` channel so the matching
        // provider in `CustomEditorProviders` can dispatch through the
        // stored provider methods. The actual provider invocation is
        // done by `WindowNamespace`'s `handleCustomDocumentLifecycle`
        // helper which subscribes to these emitter channels.
        // `$resolveCustomEditor` is fired by the workbench when a user
        // opens a file under a registered custom-editor viewType. Mountain
        // forwards the positional payload `[ResourceUriComponents,
        // ViewType, WebviewPanelHandle]` from
        // `Track/Effect/CreateEffectForRequest/Webview.rs`. Without this
        // case, the workbench's "Open With…" dispatch silently drops every
        // custom-editor open - Jupyter notebooks, hex viewer, image
        // preview, etc. all fail to load. Look up the registered provider
        // by viewType, build a minimal `CustomDocument` shape (what the
        // provider's `resolveCustomEditor(document, webviewPanel, token)`
        // expects), and invoke. Errors are caught so a buggy provider
        // never crashes the host.
        case "$resolveCustomEditor": {
          const Args = Array.isArray(Parameters) ? Parameters : [];
          const UriComponents = Args[0];
          const ViewType = Args[1] ?? "";
          const WebviewPanelHandle = Args[2];
          const ProviderEntry = CustomEditorProvidersByViewType.get(
            ViewType
          );
          if (!ProviderEntry) {
            try {
              process.stdout.write(
                `[NotificationHandler] $resolveCustomEditor: no provider for viewType="${ViewType}"
`
              );
            } catch {
            }
            break;
          }
          const Provider = ProviderEntry.Provider;
          const Method2 = ProviderEntry.Readonly ? "resolveCustomEditor" : typeof Provider["resolveCustomTextEditor"] === "function" ? "resolveCustomTextEditor" : "resolveCustomEditor";
          const Resolve = Provider[Method2];
          if (typeof Resolve !== "function") {
            try {
              process.stdout.write(
                `[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" lacks ${Method2}()
`
              );
            } catch {
            }
            break;
          }
          const Document = {
            uri: HydrateUri(UriComponents) ?? UriComponents,
            dispose: /* @__PURE__ */ __name(() => {
            }, "dispose")
          };
          const WebviewPanel = {
            handle: WebviewPanelHandle,
            viewType: ViewType,
            webview: {
              postMessage: /* @__PURE__ */ __name(() => Promise.resolve(false), "postMessage"),
              html: "",
              options: {},
              cspSource: "vscode-webview:"
            },
            dispose: /* @__PURE__ */ __name(() => {
            }, "dispose"),
            onDidDispose: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidDispose"),
            onDidChangeViewState: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
            }, "dispose") }), "onDidChangeViewState")
          };
          try {
            const Result = Resolve.call(Provider, Document, WebviewPanel, {
              isCancellationRequested: false
            });
            if (Result && typeof Result.then === "function") {
              Result.then(
                () => {
                },
                (Error2) => {
                  try {
                    process.stdout.write(
                      `[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" rejected: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}
`
                    );
                  } catch {
                  }
                }
              );
            }
          } catch (Error2) {
            try {
              process.stdout.write(
                `[NotificationHandler] $resolveCustomEditor: provider for "${ViewType}" threw: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}
`
              );
            } catch {
            }
          }
          break;
        }
        case "$onSaveCustomDocument":
        case "$onSaveCustomDocumentAs":
        case "$onRevertCustomDocument":
        case "$onBackupCustomDocument":
        case "$onWillSaveCustomDocument":
        case "$onDidChangeCustomDocument": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ChannelMap = {
            $onSaveCustomDocument: "saveDocument",
            $onSaveCustomDocumentAs: "saveDocumentAs",
            $onRevertCustomDocument: "revertCustomDocument",
            $onBackupCustomDocument: "backupCustomDocument",
            $onWillSaveCustomDocument: "willSaveCustomDocument",
            $onDidChangeCustomDocument: "didChangeCustomDocument"
          };
          const Suffix = ChannelMap[Method] ?? Method;
          Emitter.emit(`customEditor.${Suffix}`, Payload);
          break;
        }
        // Tree view selection/visibility/collapse/expand forwarded from Sky → Mountain
        case "$treeView:selectionChanged": {
          const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ViewId = P?.viewId ?? P?.id ?? "";
          const ViewEmitters = Context13?.__treeViewEmitters;
          if (ViewId && ViewEmitters) {
            const Emitter2 = ViewEmitters.get(ViewId);
            Emitter2?.emit("treeView.selectionChanged", {
              selection: P?.selection ?? []
            });
          }
          break;
        }
        case "$treeView:visibilityChanged": {
          const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ViewId = P?.viewId ?? P?.id ?? "";
          const ViewEmitters = Context13?.__treeViewEmitters;
          if (ViewId && ViewEmitters) {
            const Emitter2 = ViewEmitters.get(ViewId);
            Emitter2?.emit("treeView.visibilityChanged", {
              visible: P?.visible ?? false
            });
          }
          break;
        }
        case "$treeView:collapseElement": {
          const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ViewId = P?.viewId ?? "";
          const ViewEmitters = Context13?.__treeViewEmitters;
          if (ViewId && ViewEmitters) {
            const Emitter2 = ViewEmitters.get(ViewId);
            Emitter2?.emit("treeView.collapseElement", {
              element: P?.element
            });
          }
          break;
        }
        case "$treeView:expandElement": {
          const P = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const ViewId = P?.viewId ?? "";
          const ViewEmitters = Context13?.__treeViewEmitters;
          if (ViewId && ViewEmitters) {
            const Emitter2 = ViewEmitters.get(ViewId);
            Emitter2?.emit("treeView.expandElement", {
              element: P?.element
            });
          }
          break;
        }
        // File lifecycle events fired by Mountain's VFS handlers after disk
        // mutations. These populate `onDidCreateFiles`, `onDidDeleteFiles`,
        // `onDidRenameFiles` for extensions like GitLens that track workspace
        // file changes outside of the editor's open-document flow.
        case "$acceptDidCreateFiles": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Files = Array.isArray(Payload?.files) ? Payload.files : [];
          if (Files.length > 0) {
            WorkspaceEventEmitter?.emit("didCreateFiles", { files: Files });
          }
          break;
        }
        case "$acceptDidDeleteFiles": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Files = Array.isArray(Payload?.files) ? Payload.files : [];
          if (Files.length > 0) {
            WorkspaceEventEmitter?.emit("didDeleteFiles", { files: Files });
          }
          break;
        }
        case "$acceptDidRenameFiles": {
          const Payload = Array.isArray(Parameters) ? Parameters[0] : Parameters;
          const Files = Array.isArray(Payload?.files) ? Payload.files : [];
          if (Files.length > 0) {
            WorkspaceEventEmitter?.emit("didRenameFiles", { files: Files });
          }
          break;
        }
        default:
          try {
            process.stdout.write(
              `[NotificationHandler] Generic notification handler for: ${Method}
`
            );
          } catch {
          }
          try {
            Emitter.emit("unknownNotification", {
              method: Method,
              parameters: Parameters
            });
          } catch (EmitError) {
            try {
              process.stdout.write(
                `[NotificationHandler] unknownNotification subscriber threw for ${Method}: ${EmitError?.message ?? String(EmitError)}
`
              );
            } catch {
            }
          }
      }
    }, "HandleSpecificNotification");
    Handler_default5 = HandleSpecificNotification;
  }
});

// Source/Services/gRPC/Server/Service.ts
import { EventEmitter } from "events";
import { createRequire as createRequire2 } from "module";
import { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import * as grpc2 from "@grpc/grpc-js";
import * as protoLoader2 from "@grpc/proto-loader";
import { Effect as Effect9, Layer as Layer8 } from "effect";
var __filename2, __dirname2, require3, GRPCServerService, GRPCServerServiceLayer, GRPCServerServiceLive;
var init_Service8 = __esm({
  async "Source/Services/gRPC/Server/Service.ts"() {
    "use strict";
    init_Service7();
    init_Log();
    init_Handler2();
    init_Handler3();
    init_Handler4();
    await init_Handler5();
    init_Handler();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname2(__filename2);
    require3 = createRequire2(import.meta.url);
    GRPCServerService = class extends EventEmitter {
      static {
        __name(this, "GRPCServerService");
      }
      _serviceBrand;
      server = null;
      port = 50052;
      // Default Cocoon gRPC port
      isRunning = false;
      serviceImplementation;
      streamingHandlers = /* @__PURE__ */ new Set();
      // Authentication configuration
      authToken = null;
      authEnabled = false;
      // Keepalive configuration
      keepaliveInterval = 1e4;
      // 10 seconds
      keepaliveTimeout = 5e3;
      // 5 seconds
      keepaliveTimer = null;
      // Request tracking for cancellation
      activeRequests = /* @__PURE__ */ new Map();
      // Health monitoring
      startTime = 0;
      errorCount = 0;
      requestCount = 0;
      /** Stored initialization data from Mountain's InitializeExtensionHost */
      extensionHostInitData = null;
      /** Indexed extensions from InitializeExtensionHost, keyed by identifier */
      extensionRegistry = /* @__PURE__ */ new Map();
      /** Activation event to extension identifiers that declare it */
      activationEventIndex = /* @__PURE__ */ new Map();
      /** Whether the extension host has been initialized */
      extensionHostReady = false;
      /** Track which extensions have already been activated (prevents double-activation) */
      activatedExtensions = /* @__PURE__ */ new Set();
      /** Document content mirror - caches text content keyed by URI string.
       * Updated by $acceptModelChanged notifications from Mountain.
       * Read by InvokeLanguageProvider's VsDocument.getText() for real-time content. */
      documentContentCache = /* @__PURE__ */ new Map();
      /** Reverse gRPC client for sending messages back to Mountain */
      mountainClient = null;
      /** Workspace document lifecycle event emitter.
       * Fires didOpenTextDocument, didChangeTextDocument,
       * didCloseTextDocument, didSaveTextDocument for vscode API shim listeners. */
      workspaceEventEmitter = new EventEmitter();
      constructor() {
        super();
        this._serviceBrand = void 0;
        CocoonDevLog2("grpc", "[GRPCServerService] Initializing gRPC server");
        this.setMaxListeners(0);
        this.workspaceEventEmitter.setMaxListeners(0);
        process.stdout.write(
          "[LandFix:GRPCSvc] setMaxListeners(0) applied on self + workspaceEventEmitter\n"
        );
        this.parseEnvironment();
        this.serviceImplementation = this.createServiceImplementation();
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Configured for port ${this.port}`
        );
      }
      // ==================================================================
      // Handler Context
      // ==================================================================
      /**
       * Build the HandlerContext object that domain handlers receive.
       * Uses property descriptors so gets/sets mutate the actual class fields.
       */
      GetHandlerContext() {
        const Self = this;
        return Object.defineProperties(
          {
            Emitter: this,
            WorkspaceEventEmitter: this.workspaceEventEmitter,
            ExtensionRegistry: this.extensionRegistry,
            ActivationEventIndex: this.activationEventIndex,
            ActivatedExtensions: this.activatedExtensions,
            DocumentContentCache: this.documentContentCache,
            SendToMountain: /* @__PURE__ */ __name((Method, Parameters) => this.SendToMountain(Method, Parameters), "SendToMountain"),
            ConnectToMountain: /* @__PURE__ */ __name(() => this.ConnectToMountain(), "ConnectToMountain"),
            // Expose the `$activateByEvent` handler so shim code
            // (workspace `openTextDocument`, custom file-system
            // providers, etc.) can fire lazy activation events
            // without importing `ExtensionHostHandler` directly.
            ActivateByEvent: /* @__PURE__ */ __name(async (Event) => {
              await Handler_default3.HandleActivateByEvent(
                Self.GetHandlerContext(),
                { activationEvent: Event }
              );
            }, "ActivateByEvent")
          },
          {
            ExtensionHostInitData: {
              get() {
                return Self.extensionHostInitData;
              },
              set(Value) {
                Self.extensionHostInitData = Value;
              },
              enumerable: true,
              configurable: true
            },
            ExtensionHostReady: {
              get() {
                return Self.extensionHostReady;
              },
              set(Value) {
                Self.extensionHostReady = Value;
              },
              enumerable: true,
              configurable: true
            },
            MountainClient: {
              get() {
                return Self.mountainClient;
              },
              set(Value) {
                Self.mountainClient = Value;
              },
              enumerable: true,
              configurable: true
            }
          }
        );
      }
      // ==================================================================
      // Environment and Authentication
      // ==================================================================
      /**
       * Parse environment variables for configuration
       */
      parseEnvironment() {
        const cocoonPort = process.env["COCOON_GRPC_PORT"];
        if (cocoonPort) {
          this.port = parseInt(cocoonPort, 10);
        }
        const authToken = process.env["MOUNTAIN_AUTH_TOKEN"];
        if (authToken) {
          this.authToken = authToken;
          this.authEnabled = true;
          CocoonDevLog2("grpc", "[GRPCServerService] Authentication enabled");
        }
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Environment parsed: COCOON_GRPC_PORT=${this.port}, AUTH_ENABLED=${this.authEnabled}`
        );
      }
      /**
       * Validate authentication token
       */
      ValidateAuthentication() {
        if (!this.authEnabled) {
          return true;
        }
        return true;
      }
      // ==================================================================
      // gRPC Service Implementation
      // ==================================================================
      /**
       * Create gRPC service implementation with bidirectional streaming support
       */
      createServiceImplementation() {
        return {
          ProcessMountainRequest: /* @__PURE__ */ __name((Call2, Callback) => {
            if (!this.ValidateAuthentication()) {
              Callback({
                code: grpc2.status.UNAUTHENTICATED,
                details: "Authentication failed"
              });
              return;
            }
            this.handleMountainRequest(Call2.request).then((Response) => Callback(null, Response)).catch(
              (Error2) => Callback({
                code: grpc2.status.INTERNAL,
                details: Error2 instanceof globalThis.Error ? Error2.message : "Unknown error"
              })
            );
          }, "ProcessMountainRequest"),
          SendMountainNotification: /* @__PURE__ */ __name((Call2, Callback) => {
            if (!this.ValidateAuthentication()) {
              Callback({
                code: grpc2.status.UNAUTHENTICATED,
                details: "Authentication failed"
              });
              return;
            }
            this.handleMountainNotification(Call2.request);
            Callback(null, {});
          }, "SendMountainNotification"),
          CancelOperation: /* @__PURE__ */ __name((Call2, Callback) => {
            if (!this.ValidateAuthentication()) {
              Callback({
                code: grpc2.status.UNAUTHENTICATED,
                details: "Authentication failed"
              });
              return;
            }
            this.handleCancelOperation(Call2.request);
            Callback(null, {});
          }, "CancelOperation")
        };
      }
      // ==================================================================
      // Bidirectional Streaming
      // ==================================================================
      /**
       * Start bidirectional streaming for real-time events
       * TODO: FUTURE: Implement streaming handlers for real-time event communication
       * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bidirectional Streaming)
       * Implementation: Add stream handlers for Mountain-Cocoon event stream
       * Dependencies: Event marshaling, backpressure handling
       * Validation: Test with high-frequency event streams
       */
      startBidirectionalStreaming(stream) {
        CocoonDevLog2(
          "grpc",
          "[GRPCServerService] Starting bidirectional streaming connection"
        );
        this.streamingHandlers.add(stream);
        stream.on("data", (request2) => {
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Received streaming request: ${request2.Method}`
          );
          this.handleStreamingRequest(request2, stream);
        });
        stream.on("close", () => {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Bidirectional streaming connection closed"
          );
          this.streamingHandlers.delete(stream);
        });
        stream.on("error", (error) => {
          this.errorCount++;
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Streaming error: ${error}`
          );
        });
        this.startKeepalive(stream);
      }
      /**
       * Handle streaming request
       */
      async handleStreamingRequest(request2, stream) {
        try {
          const parameters = this.parseParameters(request2.Parameter);
          const responseData = await this.routeRequest(
            request2.Method,
            parameters
          );
          const response = {
            RequestIdentifier: request2.RequestIdentifier,
            Result: Buffer.from(JSON.stringify(responseData))
          };
          stream.write(response);
        } catch (error) {
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Streaming request failed for ${request2.Method}:`,
            error
          );
          const response = {
            RequestIdentifier: request2.RequestIdentifier,
            Result: Buffer.from(JSON.stringify({})),
            error: {
              Code: 500,
              Message: error instanceof Error ? error.message : "Unknown error",
              Data: Buffer.from(JSON.stringify({}))
            }
          };
          stream.write(response);
        }
      }
      /**
       * Start keepalive for streaming connection
       */
      startKeepalive(stream) {
        const keepaliveInterval = setInterval(() => {
          if (!stream.writable) {
            clearInterval(keepaliveInterval);
            return;
          }
          const keepaliveRequest = {
            RequestIdentifier: BigInt(0),
            Method: "keepalive.ping",
            Parameter: Buffer.from(JSON.stringify({}))
          };
          stream.write({
            RequestIdentifier: keepaliveRequest.RequestIdentifier,
            Result: Buffer.from(JSON.stringify({ status: "alive" }))
          });
        }, this.keepaliveInterval);
        stream.on("close", () => {
          clearInterval(keepaliveInterval);
        });
      }
      /**
       * Broadcast event to all active streaming connections
       */
      BroadcastEvent(_method, data) {
        const notification = {
          RequestIdentifier: BigInt(0),
          Result: Buffer.from(JSON.stringify(data))
        };
        this.streamingHandlers.forEach((stream) => {
          if (stream.writable) {
            stream.write(notification);
          }
        });
      }
      // ==================================================================
      // Request Handling
      // ==================================================================
      /**
       * Handle Mountain request with validation and routing
       */
      async handleMountainRequest(request2) {
        const startTime = Date.now();
        this.requestCount++;
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Processing Mountain request: ${request2.Method}`
        );
        this.activeRequests.set(request2.RequestIdentifier, {
          method: request2.Method,
          startTime
        });
        try {
          const parameters = this.parseParameters(request2.Parameter);
          if (!request2.Method || !this.IsValidMethod(request2.Method)) {
            throw new Error(`Invalid method: ${request2.Method}`);
          }
          const responseData = await this.routeRequest(
            request2.Method,
            parameters
          );
          const response = {
            RequestIdentifier: request2.RequestIdentifier,
            Result: this.SerializeResponseData(responseData)
          };
          const processingTime = Date.now() - startTime;
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Request ${request2.Method} processed in ${processingTime}ms`
          );
          this.activeRequests.delete(request2.RequestIdentifier);
          return response;
        } catch (error) {
          this.errorCount++;
          const IsExtensionProvidedHandler = request2.Method.startsWith("$provide") || request2.Method.startsWith("$resolve") || request2.Method.startsWith("$get");
          if (IsExtensionProvidedHandler) {
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Extension handler ${request2.Method} rejected (extension-side): ${error instanceof Error ? error.message : String(error)}`
            );
          } else {
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Error processing request ${request2.Method}:`,
              error
            );
          }
          this.activeRequests.delete(request2.RequestIdentifier);
          const response = {
            RequestIdentifier: request2.RequestIdentifier,
            Result: Buffer.from(JSON.stringify({})),
            error: {
              Code: 500,
              Message: error instanceof Error ? error.message : "Unknown error",
              Data: Buffer.from(JSON.stringify({}))
            }
          };
          return response;
        }
      }
      /**
       * Validate request method format.
       * Accepts:
       *   - "service.method" (e.g., "extension.activate")
       *   - "$provideFeature" (e.g., "$provideHover", "$provideCompletions")
       *     Mountain invokes these when Sky requests language intelligence.
       *   - "InitializeExtensionHost" - Mountain's extension host init handshake
       *   - "$deltaExtensions", "$activateByEvent", "$startExtensionHost"
       *     Mountain's extension host lifecycle methods
       *   - "{Prefix}${Method}" - VS Code-style proxied RPC (e.g.
       *     "ExtHostCommands$ExecuteContributedCommand"). Mountain's
       *     CommandProvider uses this shape to dispatch extension commands.
       *   - "$shutdown" - Mountain initiates graceful shutdown via this method.
       */
      IsValidMethod(method) {
        return typeof method === "string" && method.length > 0;
      }
      /**
       * Serialize response data to buffer. `undefined` is a valid resolved
       * value for VS Code command handlers (e.g. `workbench.action.open*`
       * returns `undefined` on success); `JSON.stringify(undefined)` itself
       * returns `undefined`, which `Buffer.from` then rejects with
       * ERR_INVALID_ARG_TYPE. Normalise to `null` so the wire payload is a
       * well-formed JSON literal Mountain can deserialize.
       */
      SerializeResponseData(data) {
        try {
          const Normalised = data === void 0 ? null : data;
          const serialized = JSON.stringify(Normalised);
          return Buffer.from(serialized ?? "null", "utf8");
        } catch (error) {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Failed to serialize response:",
            error
          );
          return Buffer.from("{}", "utf8");
        }
      }
      /**
       * Parse parameters from JSON with enhanced error handling
       */
      parseParameters(parameterBuffer) {
        try {
          const parameterString = parameterBuffer.toString("utf8");
          if (!parameterString || parameterString.length === 0) {
            return {};
          }
          return JSON.parse(parameterString);
        } catch (error) {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Failed to parse parameters:",
            error
          );
          throw new Error(
            `Invalid parameter format: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      /**
       * Route request to appropriate service.
       * Delegates to RequestRoutingHandler for service.method patterns,
       * ExtensionHostHandler for lifecycle methods, and
       * LanguageProviderHandler for $provide* methods.
       */
      async routeRequest(method, parameters) {
        const ServiceResult = await Handler_default(method, parameters);
        if (ServiceResult !== void 0) {
          return ServiceResult;
        }
        const Context13 = this.GetHandlerContext();
        if (method === "InitializeExtensionHost") {
          return Handler_default3.HandleInitializeExtensionHost(
            Context13,
            parameters
          );
        }
        if (method === "$deltaExtensions") {
          return Handler_default3.HandleDeltaExtensions(
            Context13,
            parameters
          );
        }
        if (method === "$activateByEvent") {
          return Handler_default3.HandleActivateByEvent(
            Context13,
            parameters
          );
        }
        if (method === "$startExtensionHost") {
          return Handler_default3.HandleStartExtensionHost(
            Context13,
            parameters
          );
        }
        if (method === "$provideTreeChildren") {
          const RequestRoutingHandler = (await Promise.resolve().then(() => (init_Handler(), Handler_exports))).default;
          return RequestRoutingHandler(method, parameters);
        }
        const HierarchyMethodMap = {
          "language:prepareCallHierarchy": "$prepareCallHierarchy",
          "language:provideCallHierarchyIncomingCalls": "$provideCallHierarchyIncomingCalls",
          "language:provideCallHierarchyOutgoingCalls": "$provideCallHierarchyOutgoingCalls",
          "language:prepareTypeHierarchy": "$prepareTypeHierarchy",
          "language:provideTypeHierarchySupertypes": "$provideTypeHierarchySupertypes",
          "language:provideTypeHierarchySubtypes": "$provideTypeHierarchySubtypes",
          "language:provideLinkedEditingRanges": "$provideLinkedEditingRanges"
        };
        if (method in HierarchyMethodMap) {
          return Handler_default4(
            HierarchyMethodMap[method],
            parameters,
            this.documentContentCache
          );
        }
        if (/^\$provide[A-Z]/.test(method) || /^\$resolve[A-Z]/.test(method) || /^\$prepare[A-Z]/.test(method)) {
          return Handler_default4(
            method,
            parameters,
            this.documentContentCache
          );
        }
        if (/^ExtHostCommands\$ExecuteContributedCommand/.test(method)) {
          const Args = Array.isArray(parameters) ? parameters : [parameters];
          const CommandId = typeof Args[0] === "string" ? Args[0] : "";
          const CommandArguments = Args[1];
          if (CommandId) {
            const LanguageProviderRegistry = await Promise.resolve().then(() => (init_Registry(), Registry_exports));
            const ExtensionArguments = Array.isArray(CommandArguments) ? CommandArguments : CommandArguments === void 0 ? [] : [CommandArguments];
            return LanguageProviderRegistry.ExecuteCommand(
              CommandId,
              ...ExtensionArguments
            );
          }
          return void 0;
        }
        if (method === "$shutdown") {
          return { ok: true };
        }
        if (/^ExtHostAuthentication\$/.test(method)) {
          const AuthMethod = method.slice("ExtHostAuthentication$".length);
          if (AuthMethod === "getSession") {
            const Context14 = this.GetHandlerContext();
            const Args = Array.isArray(parameters) ? parameters : [parameters];
            const ProviderId = typeof Args[0] === "string" ? Args[0] : "";
            const Scopes = Array.isArray(Args[1]) ? Args[1] : [];
            const Options = Args[2] ?? {};
            const ProviderKey = `__authProvider:${ProviderId}`;
            const Provider = Context14.ExtensionRegistry?.get(
              ProviderKey
            );
            if (Provider && typeof Provider.getSessions === "function") {
              try {
                const Sessions = await Provider.getSessions(Scopes);
                if (Array.isArray(Sessions) && Sessions.length > 0) {
                  return Sessions[0];
                }
              } catch {
              }
            }
          }
          return null;
        }
        if (/^ExtHostTaskService\$/.test(method)) {
          const TaskMethod = method.slice("ExtHostTaskService$".length);
          const Context14 = this.GetHandlerContext();
          if (TaskMethod === "fetchTasks" || TaskMethod === "provideTasks") {
            const Filter = Array.isArray(parameters) ? parameters[0] : parameters;
            const AllTasks = [];
            for (const [Key, Provider] of Context14.ExtensionRegistry.entries()) {
              if (!String(Key).startsWith("__taskProvider:")) continue;
              try {
                const CancellationToken = {
                  isCancellationRequested: false,
                  onCancellationRequested: /* @__PURE__ */ __name(() => ({
                    dispose: /* @__PURE__ */ __name(() => {
                    }, "dispose")
                  }), "onCancellationRequested")
                };
                const Tasks = await Provider.provideTasks?.(
                  CancellationToken
                );
                if (Array.isArray(Tasks)) AllTasks.push(...Tasks);
              } catch {
              }
            }
            return AllTasks;
          }
          if (TaskMethod === "executeTask") {
            const TaskId = String(Date.now());
            const TaskDef = Array.isArray(parameters) ? parameters[0] : parameters;
            for (const [Key, Provider] of Context14.ExtensionRegistry.entries()) {
              if (!String(Key).startsWith("__taskProvider:")) continue;
              try {
                const CancellationToken = {
                  isCancellationRequested: false,
                  onCancellationRequested: /* @__PURE__ */ __name(() => ({
                    dispose: /* @__PURE__ */ __name(() => {
                    }, "dispose")
                  }), "onCancellationRequested")
                };
                Context14.Emitter.emit("task.didStart", {
                  execution: { task: TaskDef, terminate: /* @__PURE__ */ __name(() => {
                  }, "terminate") },
                  id: TaskId
                });
                if (typeof Provider.runHandler === "function") {
                  void Promise.resolve(
                    Provider.runHandler(
                      TaskDef,
                      CancellationToken
                    )
                  ).then(
                    () => Context14.Emitter.emit("task.didEnd", {
                      execution: {
                        task: TaskDef,
                        terminate: /* @__PURE__ */ __name(() => {
                        }, "terminate")
                      },
                      id: TaskId
                    })
                  ).catch(
                    () => Context14.Emitter.emit("task.didEnd", {
                      execution: {
                        task: TaskDef,
                        terminate: /* @__PURE__ */ __name(() => {
                        }, "terminate")
                      },
                      id: TaskId
                    })
                  );
                }
              } catch {
              }
            }
            return { id: TaskId, task: TaskDef };
          }
          return null;
        }
        if (/^ExtHostWebviewPanels\$/.test(method)) {
          const PanelMethod = method.slice("ExtHostWebviewPanels$".length);
          const Context14 = this.GetHandlerContext();
          const Args = Array.isArray(parameters) ? parameters : [parameters];
          if (PanelMethod === "serializeAllWebviewPanels") {
            const ActivePanels = Context14.__webviewPanels ?? /* @__PURE__ */ new Map();
            const Result = [];
            for (const [PanelHandle, Panel] of ActivePanels.entries()) {
              const ViewType = String(Panel?.viewType ?? "");
              if (!ViewType) continue;
              const Key = `__webviewSerializer:${ViewType}`;
              const Serializer = Context14.ExtensionRegistry?.get(
                Key
              );
              if (!Serializer?.serializeWebviewPanel) continue;
              try {
                const State = await Serializer.serializeWebviewPanel(Panel);
                Result.push({
                  viewType: ViewType,
                  state: State ?? null
                });
              } catch {
              }
              void PanelHandle;
            }
            return Result;
          }
          if (PanelMethod === "deserializeWebviewPanel") {
            const ViewType = String(Args[0] ?? "");
            const Panel = Args[1];
            const State = Args[2];
            const Key = `__webviewSerializer:${ViewType}`;
            const Serializer = Context14.ExtensionRegistry?.get(Key);
            if (!Serializer?.deserializeWebviewPanel) {
              return {
                success: false,
                reason: "no serializer registered",
                viewType: ViewType
              };
            }
            try {
              await Serializer.deserializeWebviewPanel(Panel, State);
              return { success: true, viewType: ViewType };
            } catch (Error2) {
              return {
                success: false,
                viewType: ViewType,
                error: String(
                  Error2?.message ?? Error2
                )
              };
            }
          }
          return null;
        }
        if (/^ExtHostDebug\$/.test(method)) {
          const DebugMethod = method.slice("ExtHostDebug$".length);
          const Context14 = this.GetHandlerContext();
          if (DebugMethod === "resolveDebugConfiguration" || DebugMethod === "resolveDebugConfigurationWithSubstitutedVariables") {
            const Args = Array.isArray(parameters) ? parameters : [parameters];
            const Config = Args[1] ?? Args[0] ?? {};
            const DebugType = Config?.type ?? "";
            for (const [Key, Provider] of Context14.ExtensionRegistry.entries()) {
              if (!String(Key).startsWith("__debugConfigProvider:"))
                continue;
              try {
                const CancellationToken = {
                  isCancellationRequested: false,
                  onCancellationRequested: /* @__PURE__ */ __name(() => ({
                    dispose: /* @__PURE__ */ __name(() => {
                    }, "dispose")
                  }), "onCancellationRequested")
                };
                const Resolved = await Provider.resolveDebugConfiguration?.(
                  Args[0],
                  Config,
                  CancellationToken
                );
                if (Resolved != null) return Resolved;
              } catch {
              }
            }
            return Config;
          }
          if (DebugMethod === "sendDAPRequest") {
            const Args = Array.isArray(parameters) ? parameters : [parameters];
            const Payload = Args[0] ?? {};
            const SessionId = String(Payload?.sessionId ?? "");
            const Request = Payload?.request;
            const Adapters = Context14.__dapAdapters;
            const Adapter = Adapters?.get(SessionId);
            if (!Adapter || typeof Adapter.handleMessage !== "function") {
              return {
                success: false,
                reason: "no inline adapter registered for session",
                sessionId: SessionId
              };
            }
            try {
              Adapter.handleMessage(Request);
              return {
                success: true,
                sessionId: SessionId,
                transport: "inline"
              };
            } catch (Error2) {
              return {
                success: false,
                sessionId: SessionId,
                error: String(
                  Error2?.message ?? Error2
                )
              };
            }
          }
          if (DebugMethod === "provideDebugConfigurations") {
            const Args = Array.isArray(parameters) ? parameters : [parameters];
            const Folder = Args[0];
            const AllConfigs = [];
            for (const [Key, Provider] of Context14.ExtensionRegistry.entries()) {
              if (!String(Key).startsWith("__debugConfigProvider:"))
                continue;
              try {
                const CancellationToken = {
                  isCancellationRequested: false,
                  onCancellationRequested: /* @__PURE__ */ __name(() => ({
                    dispose: /* @__PURE__ */ __name(() => {
                    }, "dispose")
                  }), "onCancellationRequested")
                };
                const Configs = await Provider.provideDebugConfigurations?.(
                  Folder,
                  CancellationToken
                );
                if (Array.isArray(Configs)) AllConfigs.push(...Configs);
              } catch {
              }
            }
            return AllConfigs;
          }
          return null;
        }
        if (/^ExtHostSCM\$/.test(method)) {
          return null;
        }
        if (/^ExtHostTesting\$/.test(method)) {
          const TestMethod = method.slice("ExtHostTesting$".length);
          if (TestMethod === "runTests" || TestMethod === "cancelRun") {
            return null;
          }
          return null;
        }
        if (/^ExtHostFileSystem\$/.test(method)) {
          const FSMethod = method.slice("ExtHostFileSystem$".length);
          const Context14 = this.GetHandlerContext();
          const Args = Array.isArray(parameters) ? parameters : [parameters];
          const UriArg = Args[0];
          const UriStr = typeof UriArg === "string" ? UriArg : UriArg?.external ?? (UriArg?.scheme && UriArg?.path ? `${UriArg.scheme}://${UriArg.authority ?? ""}${UriArg.path}` : "") ?? "";
          const Scheme = UriStr.split(":")[0] ?? "file";
          const ProviderKey = `__fileSystemProvider:${Scheme}`;
          const Provider = Context14.ExtensionRegistry?.get(
            ProviderKey
          );
          if (Provider) {
            try {
              switch (FSMethod) {
                case "readFile":
                  return await Provider.readFile?.(UriArg) ?? new Uint8Array();
                case "writeFile":
                  return await Provider.writeFile?.(
                    UriArg,
                    Args[1],
                    Args[2]
                  );
                case "stat":
                  return await Provider.stat?.(UriArg) ?? {
                    type: 1,
                    size: 0,
                    ctime: 0,
                    mtime: 0
                  };
                case "readDirectory":
                  return await Provider.readDirectory?.(
                    UriArg
                  ) ?? [];
                case "createDirectory":
                  return await Provider.createDirectory?.(
                    UriArg
                  );
                case "delete":
                  return await Provider.delete?.(
                    UriArg,
                    Args[1]
                  );
                case "rename":
                  return await Provider.rename?.(
                    UriArg,
                    Args[1],
                    Args[2]
                  );
                case "copy":
                  return await Provider.copy?.(
                    UriArg,
                    Args[1],
                    Args[2]
                  );
                default:
                  return null;
              }
            } catch {
              return null;
            }
          }
          return null;
        }
        if (/^ExtHost[A-Z]/.test(method)) {
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Unhandled ExtHost method: ${method}`
          );
          return null;
        }
        throw new Error(`Unknown method: ${method}`);
      }
      // ==================================================================
      // Notification Handling
      // ==================================================================
      /**
       * Handle Mountain notification with event emission
       */
      handleMountainNotification(notification) {
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Handling Mountain notification: ${notification.Method}`
        );
        try {
          const parameters = this.parseParameters(notification.Parameter);
          this.emit("notification", {
            method: notification.Method,
            parameters
          });
          Handler_default5(
            this,
            this.documentContentCache,
            Handler_default2.HandleDocumentChange,
            Handler_default2.HandleDocumentOpen,
            Handler_default2.HandleDocumentClose,
            Handler_default2.HandleDocumentSave,
            notification.Method,
            parameters,
            this.workspaceEventEmitter,
            this.GetHandlerContext()
          );
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Notification ${notification.Method} handled`,
            parameters
          );
        } catch (error) {
          this.errorCount++;
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Error handling notification ${notification.Method}:`,
            error
          );
        }
      }
      /**
       * Get cached document content, or null if not cached.
       * Used by InvokeLanguageProvider's VsDocument.getText().
       */
      GetDocumentContent(Uri) {
        return Handler_default2.GetDocumentContent(
          this.documentContentCache,
          Uri
        );
      }
      // ==================================================================
      // Cancellation
      // ==================================================================
      /**
       * Handle cancel operation with request tracking
       */
      handleCancelOperation(cancelRequest) {
        const requestId = cancelRequest.RequestIdentifierToCancel;
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Canceling operation: ${requestId}`
        );
        try {
          const requestEntry = this.activeRequests.get(requestId);
          if (requestEntry) {
            if (requestEntry.cancelHandler) {
              try {
                requestEntry.cancelHandler();
                CocoonDevLog2(
                  "grpc",
                  `[GRPCServerService] Cancel handler executed for request ${requestId}`
                );
              } catch (error) {
                this.errorCount++;
                CocoonDevLog2(
                  "grpc",
                  `[GRPCServerService] Cancel handler failed for request ${requestId}:`,
                  error
                );
              }
            }
            this.activeRequests.delete(requestId);
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Request ${requestId} canceled successfully`
            );
          } else {
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Request ${requestId} not found in active requests (may have already completed)`
            );
          }
        } catch (error) {
          this.errorCount++;
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Error canceling operation ${requestId}:`,
            error
          );
        }
      }
      /**
       * Register cancel handler for a request
       * TODO: FUTURE: Integrate with Cancellation service for enhanced cancellation support
       * Specification: MOUNTAIN-OPERATIONS.md (Cancellation Semantics)
       * Implementation: Proper cancellation propagation across service boundaries
       * Dependencies: CancellationService, operation context
       * Validation: Test with nested and parallel operations
       */
      registerCancelHandler(requestId, handler) {
        const entry = this.activeRequests.get(requestId);
        if (entry) {
          entry.cancelHandler = handler;
        }
      }
      // ==================================================================
      // Mountain Client Connection
      // ==================================================================
      /**
       * Connect to Mountain's gRPC server (MountainService on :50051).
       * Called after InitializeExtensionHost confirms Mountain is running.
       * Creates a new MountainClientService instance and connects.
       */
      async ConnectToMountain() {
        if (this.mountainClient) {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Already connected to Mountain"
          );
          return;
        }
        const MountainPort = parseInt(
          process.env["MOUNTAIN_GRPC_PORT"] || "50051",
          10
        );
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Connecting to Mountain gRPC at localhost:${MountainPort}...`
        );
        const { MountainClientService: MountainClientService2 } = await Promise.resolve().then(() => (init_Service2(), Service_exports));
        const Client = new MountainClientService2();
        await Client.connect();
        this.mountainClient = Client;
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Connected to Mountain gRPC - return path active`
        );
        this.emit("mountainConnected", { port: MountainPort });
      }
      /**
       * Send a notification back to Mountain (for forwarding to Wind).
       * Used for extension host protocol messages, provider registrations, etc.
       *
       * Honours the env-controlled Rust-deference knob from `DualTrack`:
       * `Defer=false`, `Defer<DOMAIN>=false`, or
       * `Defer<METHOD>=false` short-circuits the call -
       * the notification is dropped on the Cocoon side and a `node-bypass`
       * line is logged via `LogDualTrack`. Fire-and-forget callers see the
       * same `Promise<void>` resolution they always saw, so no call-site
       * change is needed; the bypass is invisible to extensions.
       */
      async SendToMountain(Method, Parameters) {
        const { IsRustDeferralEnabled: IsRustDeferralEnabled2, LogDualTrack: LogDualTrack2 } = await Promise.resolve().then(() => (init_Track(), Track_exports));
        if (!IsRustDeferralEnabled2(Method)) {
          LogDualTrack2(Method, "node-bypass");
          return;
        }
        if (!this.mountainClient) {
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] Cannot send ${Method} to Mountain - not connected`
          );
          return;
        }
        await this.mountainClient.sendNotification(Method, Parameters);
      }
      // ==================================================================
      // Server Lifecycle
      // ==================================================================
      /**
       * Start gRPC server
       */
      async start() {
        if (this.isRunning) {
          CocoonDevLog2("grpc", "[GRPCServerService] Server already running");
          return;
        }
        CocoonDevLog2(
          "grpc",
          `[GRPCServerService] Starting gRPC server on port ${this.port}`
        );
        try {
          const packageDefinition = await this.loadProtocolDefinition();
          const protoDescriptor = grpc2.loadPackageDefinition(
            packageDefinition
          );
          this.server = new grpc2.Server({
            "grpc.max_receive_message_length": 1024 * 1024 * 100,
            // 100MB
            "grpc.max_send_message_length": 1024 * 1024 * 100
            // 100MB
          });
          const CocoonSvc = protoDescriptor.Vine?.CocoonService || protoDescriptor.CocoonService;
          this.server.addService(
            CocoonSvc.service,
            this.serviceImplementation
          );
          await this.startServer();
          this.isRunning = true;
          CocoonDevLog2(
            "grpc",
            `[GRPCServerService] gRPC server started successfully on port ${this.port}`
          );
        } catch (error) {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Failed to start gRPC server:",
            error
          );
          throw error;
        }
      }
      /**
       * Load protocol definition from Mountain's Vine.proto with fallback support
       * Protocol loading is fully implemented with multiple search paths and fallback
       */
      async loadProtocolDefinition() {
        CocoonDevLog2(
          "grpc",
          "[GRPCServerService] Loading Vine.proto protocol definition"
        );
        try {
          const fs = require3("fs");
          const path = require3("path");
          const protoSearchPaths = [
            path.resolve(
              __dirname2,
              "../../../../Mountain/Proto/Vine.proto"
            ),
            path.resolve(
              __dirname2,
              "../../../../../Mountain/Proto/Vine.proto"
            ),
            path.resolve(
              __dirname2,
              "../../../../../../Mountain/Proto/Vine.proto"
            ),
            path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto"),
            path.resolve(process.cwd(), "../../Mountain/Proto/Vine.proto")
          ];
          let mountainProtoPath = null;
          for (const protoPath of protoSearchPaths) {
            if (fs.existsSync(protoPath)) {
              mountainProtoPath = protoPath;
              break;
            }
          }
          if (mountainProtoPath) {
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Found Vine.proto at: ${mountainProtoPath}`
            );
            return protoLoader2.loadSync(mountainProtoPath, {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
              includeDirs: [path.dirname(mountainProtoPath)]
            });
          } else {
            CocoonDevLog2(
              "grpc",
              "[GRPCServerService] Vine.proto not found in any search path"
            );
            CocoonDevLog2(
              "grpc",
              "[GRPCServerService] Search paths attempted:",
              protoSearchPaths
            );
            const fallbackProtoContent = `
                    syntax = "proto3";

                    package Vine;

                    service CocoonService {
                        rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);
                        rpc SendMountainNotification(GenericNotification) returns (Empty);
                        rpc CancelOperation(CancelOperationRequest) returns (Empty);
                    }

                    message GenericRequest {
                        uint64 RequestIdentifier = 1;
                        string Method = 2;
                        bytes Parameter = 3;
                    }

                    message GenericResponse {
                        uint64 RequestIdentifier = 1;
                        bool Success = 2;
                        bytes Data = 3;
                        string Error = 4;
                    }

                    message GenericNotification {
                        string Method = 1;
                        bytes Parameter = 2;
                    }

                    message CancelOperationRequest {
                        uint64 RequestIdentifier = 1;
                        string Reason = 2;
                    }

                    message Empty {}
                `;
            const tempDir = require3("os").tmpdir();
            const tempProtoPath = path.join(tempDir, "vine_fallback.proto");
            fs.writeFileSync(tempProtoPath, fallbackProtoContent);
            CocoonDevLog2(
              "grpc",
              `[GRPCServerService] Using enhanced fallback protocol at: ${tempProtoPath}`
            );
            return protoLoader2.loadSync(tempProtoPath, {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true
            });
          }
        } catch (error) {
          CocoonDevLog2(
            "grpc",
            "[GRPCServerService] Failed to load protocol definition:",
            error
          );
          throw new Error(
            `Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      startServer() {
        return new Promise((resolve, reject) => {
          if (!this.server) {
            reject(new Error("Server not initialized"));
            return;
          }
          this.server.bindAsync(
            `0.0.0.0:${this.port}`,
            grpc2.ServerCredentials.createInsecure(),
            (error, port) => {
              if (error) {
                reject(error);
              } else {
                CocoonDevLog2(
                  "grpc",
                  `[GRPCServerService] Server bound to port ${port}`
                );
                resolve();
              }
            }
          );
        });
      }
      /**
       * Stop gRPC server
       */
      async stop() {
        if (!this.isRunning || !this.server) {
          CocoonDevLog2("grpc", "[GRPCServerService] Server not running");
          return;
        }
        CocoonDevLog2("grpc", "[GRPCServerService] Stopping gRPC server");
        return new Promise((resolve) => {
          this.server.tryShutdown(() => {
            this.isRunning = false;
            this.server = null;
            CocoonDevLog2("grpc", "[GRPCServerService] gRPC server stopped");
            resolve();
          });
        });
      }
      /**
       * Get server status with detailed metrics
       */
      getStatus() {
        return {
          running: this.isRunning,
          port: this.port,
          errorCount: this.errorCount,
          requestCount: this.requestCount,
          activeConnections: this.streamingHandlers.size,
          authEnabled: this.authEnabled,
          ...this.isRunning ? { uptime: Date.now() - this.startTime } : {}
        };
      }
      /**
       * Add event listener for notifications
       */
      onNotification(callback) {
        this.on("notification", (event) => {
          callback(event.method, event.parameters);
        });
      }
    };
    GRPCServerServiceLayer = Layer8.effect(
      IGRPCServerService,
      Effect9.sync(() => new GRPCServerService())
    );
    GRPCServerServiceLive = Layer8.effect(
      IGRPCServerService,
      Effect9.sync(() => new GRPCServerService())
    );
  }
});

// Source/Effect/RPCServer.ts
import { Context as Context11, Effect as Effect10, Layer as Layer9, Ref as Ref5, SubscriptionRef as SubscriptionRef5 } from "effect";
var ServerStartError, ServerStopError, ServerNotRunningError, RPCServerTag, RPCServer, RPCServerLive, makeMockRPCServer, RPCServerMock;
var init_RPCServer = __esm({
  async "Source/Effect/RPCServer.ts"() {
    "use strict";
    init_Log();
    await init_Service8();
    init_Telemetry();
    ServerStartError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.message = message;
        this.cause = cause;
      }
      message;
      cause;
      static {
        __name(this, "ServerStartError");
      }
      _tag = "ServerStartError";
    };
    ServerStopError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.message = message;
        this.cause = cause;
      }
      message;
      cause;
      static {
        __name(this, "ServerStopError");
      }
      _tag = "ServerStopError";
    };
    ServerNotRunningError = class extends Error {
      static {
        __name(this, "ServerNotRunningError");
      }
      _tag = "ServerNotRunningError";
      constructor() {
        super("Server is not running");
      }
    };
    RPCServerTag = class extends Context11.Tag("Cocoon/RPCServer")() {
      static {
        __name(this, "RPCServerTag");
      }
    };
    RPCServer = RPCServerTag;
    RPCServerLive = Layer9.effect(
      RPCServer,
      Effect10.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const stateRef = yield* SubscriptionRef5.make({
          _tag: "Idle"
        });
        let grpcServer;
        let currentConfig;
        let metrics = {
          uptime: 0,
          connections: 0,
          requestsHandled: 0,
          errors: 0,
          averageLatency: 0
        };
        let startTime = 0;
        const latencies = [];
        const start = /* @__PURE__ */ __name((config) => Effect10.gen(function* () {
          const startTimeMs = Date.now();
          const currentState = yield* stateRef.get;
          if (currentState._tag === "Running") {
            telemetry.log("warn", "[RPCServer] Server already running");
            return;
          }
          const CocoonPort = parseInt(
            process.env["COCOON_GRPC_PORT"] || "50052",
            10
          );
          currentConfig = config ?? {
            host: "0.0.0.0",
            port: CocoonPort,
            maxConnections: 100,
            enableCompression: true,
            enableTls: false
          };
          yield* Ref5.set(stateRef, {
            _tag: "Starting",
            startTime: startTimeMs
          });
          CocoonDevLog2(
            "grpc",
            `[RPCServer] Starting REAL gRPC server on ${currentConfig.host}:${currentConfig.port}...`
          );
          telemetry.log(
            "info",
            `[RPCServer] Starting REAL gRPC server on ${currentConfig.host}:${currentConfig.port}...`
          );
          try {
            grpcServer = new GRPCServerService();
            grpcServer.port = currentConfig.port;
            yield* Effect10.promise(() => grpcServer.start());
            startTime = Date.now();
            metrics = {
              uptime: 0,
              connections: 0,
              requestsHandled: 0,
              errors: 0,
              averageLatency: 0
            };
            yield* Ref5.set(stateRef, {
              _tag: "Running",
              address: currentConfig.host,
              port: currentConfig.port,
              startedAt: startTime
            });
            telemetry.log(
              "info",
              `[RPCServer] gRPC server started on ${currentConfig.host}:${currentConfig.port}`
            );
          } catch (error) {
            yield* Ref5.set(stateRef, {
              _tag: "Error",
              error: String(error)
            });
            telemetry.log(
              "error",
              `[RPCServer] Failed to start gRPC server: ${String(error)}`
            );
            return yield* Effect10.fail(
              new ServerStartError(
                "Failed to start gRPC server",
                error
              )
            );
          }
        }), "start");
        const stop = Effect10.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Running") {
            telemetry.log("warn", "[RPCServer] Server is not running");
            return yield* Effect10.fail(new ServerNotRunningError());
          }
          yield* Ref5.set(stateRef, {
            _tag: "Stopping"
          });
          telemetry.log("info", "[RPCServer] Stopping gRPC server...");
          if (grpcServer) {
            yield* Effect10.promise(() => grpcServer.stop());
            grpcServer = void 0;
          }
          yield* Ref5.set(stateRef, {
            _tag: "Stopped"
          });
          telemetry.log("info", "[RPCServer] Server stopped successfully");
        });
        const handleRequest = /* @__PURE__ */ __name((request2) => Effect10.gen(function* () {
          const requestStartTime = Date.now();
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Running") {
            return {
              requestId: request2.requestId,
              success: false,
              data: null,
              error: "Server not running",
              timestamp: Date.now()
            };
          }
          telemetry.log(
            "debug",
            `[RPCServer] Handling request: ${request2.method} (${request2.requestId})`
          );
          metrics.requestsHandled = metrics.requestsHandled + 1;
          yield* Effect10.sleep("5 millis");
          const processingTime = Date.now() - requestStartTime;
          latencies.push(processingTime);
          if (latencies.length > 100) {
            latencies.shift();
          }
          metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
          telemetry.log(
            "debug",
            `[RPCServer] Request completed: ${request2.method} (${processingTime}ms)`
          );
          return {
            requestId: request2.requestId,
            success: true,
            data: {
              method: request2.method,
              result: "ok"
            },
            timestamp: Date.now()
          };
        }).pipe(
          Effect10.catchAll(
            (error) => Effect10.gen(function* () {
              metrics.errors = metrics.errors + 1;
              telemetry.log(
                "error",
                `[RPCServer] Request failed: ${request2.method} (${error})`
              );
              return {
                requestId: request2.requestId,
                success: false,
                data: null,
                error: String(error),
                timestamp: Date.now()
              };
            })
          )
        ), "handleRequest");
        const getMetrics = Effect10.gen(function* () {
          const currentState = yield* stateRef.get;
          if (currentState._tag !== "Running") {
            return yield* Effect10.fail(new ServerNotRunningError());
          }
          metrics.uptime = Date.now() - startTime;
          return { ...metrics };
        });
        return {
          state: stateRef.get,
          stateChanges: Effect10.map(
            stateRef.get,
            (state) => [state]
          ),
          start,
          stop,
          handleRequest,
          getMetrics
        };
      })
    );
    makeMockRPCServer = /* @__PURE__ */ __name(() => {
      const mockStateRef = { _tag: "Idle" };
      return {
        state: Effect10.succeed(mockStateRef),
        stateChanges: Effect10.succeed([mockStateRef]),
        start: /* @__PURE__ */ __name(() => Effect10.succeed(void 0), "start"),
        stop: Effect10.succeed(void 0),
        handleRequest: /* @__PURE__ */ __name((request2) => Effect10.succeed({
          requestId: request2.requestId,
          success: true,
          data: { method: request2.method, result: "mock" },
          timestamp: Date.now()
        }), "handleRequest"),
        getMetrics: Effect10.succeed({
          uptime: 0,
          connections: 0,
          requestsHandled: 0,
          errors: 0,
          averageLatency: 0
        })
      };
    }, "makeMockRPCServer");
    RPCServerMock = Layer9.effect(
      RPCServer,
      Effect10.succeed(makeMockRPCServer())
    );
  }
});

// Source/Effect/Bootstrap.ts
import { createConnection } from "node:net";
import { Context as Context12, Duration, Effect as Effect11, Layer as Layer10, Schedule as Schedule2 } from "effect";
var ProbeTcp, BootstrapTag, stage1_Environment, stage2_Configuration, MountainProbeTimeoutMs, MountainProbeMaxAttempts, MountainProbeDelayMs, MountainProbeBackoffFactor, MountainProbeMaxDelayMs, MountainConnectMaxAttempts, stage3_MountainConnection, stage4_ModuleInterceptor, stage5_RPCServer, stage6_Extensions, stage7_HealthCheck, makeBootstrap, BootstrapLive, makeMockBootstrap, BootstrapMock, runBootstrap;
var init_Bootstrap = __esm({
  async "Source/Effect/Bootstrap.ts"() {
    init_Log();
    init_Log2();
    init_Extension();
    init_Health();
    init_Interceptor();
    init_Client();
    await init_RPCServer();
    init_Telemetry();
    ProbeTcp = /* @__PURE__ */ __name((Host, Port, TimeoutMs) => Effect11.async((Resume) => {
      let Settled = false;
      const Settle = /* @__PURE__ */ __name((Value) => {
        if (Settled) return;
        Settled = true;
        try {
          Socket.destroy();
        } catch {
        }
        Resume(Effect11.succeed(Value));
      }, "Settle");
      const Socket = createConnection({ host: Host, port: Port });
      const Timer = setTimeout(() => Settle(false), TimeoutMs);
      Socket.once("connect", () => {
        clearTimeout(Timer);
        Settle(true);
      });
      Socket.once("error", () => {
        clearTimeout(Timer);
        Settle(false);
      });
      return Effect11.sync(() => {
        clearTimeout(Timer);
        try {
          Socket.destroy();
        } catch {
        }
      });
    }), "ProbeTcp");
    BootstrapTag = class extends Context12.Tag("Cocoon/Bootstrap")() {
      static {
        __name(this, "BootstrapTag");
      }
    };
    stage1_Environment = withSpan(
      "stage1_environment",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const StageStart = Date.now();
        CocoonDevLog2(
          "bootstrap-stage",
          "[Bootstrap] stage=Environment event=start"
        );
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 1: Detecting environment..."
        );
        const nodeVersion = process.version;
        const platform = process.platform;
        const arch = process.arch;
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Node.js ${nodeVersion} on ${platform}/${arch}`
        );
        CocoonDevLog2(
          "bootstrap-stage",
          `[Bootstrap] stage=Environment event=ok node=${nodeVersion} platform=${platform}/${arch} duration_ms=${Date.now() - StageStart}`
        );
        return {
          stageName: "Environment",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    stage2_Configuration = withSpan(
      "stage2_configuration",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const StageStart = Date.now();
        CocoonDevLog2(
          "bootstrap-stage",
          "[Bootstrap] stage=Configuration event=start"
        );
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 2: Loading configuration..."
        );
        const ParsePort = /* @__PURE__ */ __name((Raw2, Fallback) => {
          if (Raw2 === void 0) return Fallback;
          const Value = parseInt(Raw2, 10);
          return Number.isFinite(Value) && Value > 0 && Value < 65536 ? Value : Fallback;
        }, "ParsePort");
        const ResolvedConfig = {
          MountainPort: ParsePort(process.env["MOUNTAIN_GRPC_PORT"], 50051),
          CocoonPort: ParsePort(process.env["COCOON_GRPC_PORT"], 50052),
          NodeEnv: process.env["NODE_ENV"] ?? "production",
          DevLog: process.env["Trace"] ?? "",
          DebugFlag: process.env["TAURI_ENV_DEBUG"] === "true"
        };
        globalThis.__cocoonBootstrapConfig = ResolvedConfig;
        Log_default2.Info(
          "Bootstrap",
          `Configuration resolved: MountainPort=${ResolvedConfig.MountainPort} CocoonPort=${ResolvedConfig.CocoonPort} NodeEnv=${ResolvedConfig.NodeEnv} DevLog=${ResolvedConfig.DevLog || "<unset>"} TauriDebug=${ResolvedConfig.DebugFlag}`
        );
        telemetry.log("info", "[Cocoon Bootstrap] Configuration loaded");
        CocoonDevLog2(
          "bootstrap-stage",
          `[Bootstrap] stage=Configuration event=ok mountain_port=${ResolvedConfig.MountainPort} cocoon_port=${ResolvedConfig.CocoonPort} node_env=${ResolvedConfig.NodeEnv} duration_ms=${Date.now() - StageStart}`
        );
        return {
          stageName: "Configuration",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    MountainProbeTimeoutMs = 300;
    MountainProbeMaxAttempts = 3;
    MountainProbeDelayMs = 100;
    MountainProbeBackoffFactor = 2;
    MountainProbeMaxDelayMs = 500;
    MountainConnectMaxAttempts = 5;
    stage3_MountainConnection = withSpan(
      "stage3_mountain_connection",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const mountainClient = yield* MountainClientTag;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 3: Connecting to Mountain..."
        );
        const MountainPort = parseInt(
          process.env["MOUNTAIN_GRPC_PORT"] || "50051",
          10
        );
        const MountainHost = "localhost";
        let ProbeAttempt = 0;
        let ProbeDelay = MountainProbeDelayMs;
        let Listening = false;
        while (ProbeAttempt < MountainProbeMaxAttempts && !Listening) {
          ProbeAttempt++;
          Listening = yield* ProbeTcp(
            MountainHost,
            MountainPort,
            MountainProbeTimeoutMs
          );
          if (Listening) {
            Log_default2.Info(
              "Bootstrap",
              `Mountain TCP port ${MountainHost}:${MountainPort} listening after ${ProbeAttempt} probe(s)`
            );
            break;
          }
          yield* Effect11.sleep(Duration.millis(ProbeDelay));
          ProbeDelay = Math.min(
            ProbeDelay * MountainProbeBackoffFactor,
            MountainProbeMaxDelayMs
          );
        }
        if (!Listening) {
          Log_default2.Warn(
            "Bootstrap",
            `Mountain TCP port ${MountainHost}:${MountainPort} unreachable after ${MountainProbeMaxAttempts} probes; attempting connect anyway`
          );
        }
        const AttemptRef = { value: 0 };
        const Connect = Effect11.gen(function* () {
          AttemptRef.value++;
          yield* mountainClient.connect({
            host: MountainHost,
            port: MountainPort
          });
        }).pipe(
          Effect11.tapError(
            (Failure) => Effect11.sync(() => {
              const Message = Failure instanceof Error ? Failure.message : String(Failure);
              Log_default2.Warn(
                "Bootstrap",
                `MountainConnection attempt ${AttemptRef.value}/${MountainConnectMaxAttempts} failed: ${Message}`
              );
            })
          ),
          Effect11.retry(
            Schedule2.exponential(Duration.millis(500)).pipe(
              Schedule2.union(Schedule2.spaced(Duration.seconds(5))),
              Schedule2.intersect(
                Schedule2.recurs(MountainConnectMaxAttempts - 1)
              )
            )
          )
        );
        yield* Connect;
        const version = yield* mountainClient.version;
        Log_default2.Info(
          "Bootstrap",
          `MountainConnection OK (v${version}) after ${AttemptRef.value} attempt(s), probe settled after ${ProbeAttempt}`
        );
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Connected to Mountain (v${version})`
        );
        return {
          stageName: "MountainConnection",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    stage4_ModuleInterceptor = withSpan(
      "stage4_module_interceptor",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const moduleInterceptor = yield* ModuleInterceptorTag;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 4: Setting up module interceptor..."
        );
        yield* moduleInterceptor.initialize;
        yield* moduleInterceptor.install;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Module interceptor installed successfully"
        );
        return {
          stageName: "ModuleInterceptor",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    stage5_RPCServer = withSpan(
      "stage5_rpc_server",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const rpcServer = yield* RPCServerTag;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 5: Starting gRPC server..."
        );
        const CocoonPort = parseInt(
          process.env["COCOON_GRPC_PORT"] || "50052",
          10
        );
        CocoonDevLog2(
          "bootstrap",
          `[Cocoon Bootstrap] Stage 5: Starting gRPC on port ${CocoonPort}`
        );
        yield* rpcServer.start({
          host: "0.0.0.0",
          port: CocoonPort
        });
        telemetry.log("info", "[Cocoon Bootstrap] gRPC server started");
        return {
          stageName: "RPCServer",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    stage6_Extensions = withSpan(
      "stage6_extensions",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const extension = yield* ExtensionTag;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 6: Initializing extensions..."
        );
        const extensions = yield* extension.getAll;
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Found ${extensions.length} extensions`
        );
        const EligibleExtensions = extensions.filter(
          (Ext) => Ext.manifest.enabled
        );
        const ActivationAttempts = yield* Effect11.forEach(
          EligibleExtensions,
          (Ext) => extension.activate(Ext.id).pipe(
            Effect11.map(() => ({ Id: Ext.id, Ok: true })),
            Effect11.catchAll((Failure) => {
              const Message = Failure instanceof Error ? Failure.message : String(Failure);
              telemetry.log(
                "warn",
                `[Cocoon Bootstrap] Extension ${Ext.id} activation failed: ${Message}`
              );
              return Effect11.succeed({
                Id: Ext.id,
                Ok: false,
                Error: Message
              });
            })
          ),
          { concurrency: 8 }
        );
        const Successful = ActivationAttempts.filter((R) => R.Ok).length;
        const FailedCount = ActivationAttempts.length - Successful;
        const activeCount = yield* extension.getActiveCount;
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Activated ${activeCount} extensions (${Successful} this stage, ${FailedCount} failed)`
        );
        return {
          stageName: "Extensions",
          success: true,
          duration: 0,
          error: void 0
        };
      })
    );
    stage7_HealthCheck = withSpan(
      "stage7_healthcheck",
      Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const health = yield* HealthTag;
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Stage 7: Running health checks..."
        );
        const systemHealth = yield* health.checkAllServices();
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Health check result: ${systemHealth.overallStatus}`
        );
        if (systemHealth.overallStatus === "unhealthy") {
          telemetry.log(
            "error",
            "[Cocoon Bootstrap] Some services are unhealthy!"
          );
        }
        return {
          stageName: "HealthCheck",
          success: systemHealth.overallStatus !== "unhealthy",
          duration: 0,
          error: void 0
        };
      })
    );
    makeBootstrap = /* @__PURE__ */ __name(() => ({
      run: /* @__PURE__ */ __name((options) => Effect11.gen(function* () {
        const telemetry = yield* TelemetryTag;
        const startTime = Date.now();
        const { skipHealthCheck = false, debugMode = false } = options ?? {};
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] ==============================================="
        );
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] Cocoon Extension Host Bootstrap"
        );
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Debug mode: ${debugMode}`
        );
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] ==============================================="
        );
        const stages = [
          ["Environment", stage1_Environment],
          ["Configuration", stage2_Configuration],
          // RPCServer must bind port 50052 BEFORE MountainConnection so
          // Mountain's 20-second gRPC retry budget sees the server in time.
          // MountainConnection retries for up to 45s; running it first meant
          // Stage 5 (RPCServer) never started within Mountain's window.
          ["RPCServer", stage5_RPCServer],
          // ModuleInterceptor must run BEFORE MountainConnection so the
          // require('vscode') shim is installed before Mountain sends
          // InitializeExtensionHost and extensions begin activating.
          ["ModuleInterceptor", stage4_ModuleInterceptor],
          ["MountainConnection", stage3_MountainConnection],
          ["Extensions", stage6_Extensions],
          ...skipHealthCheck ? [] : [["HealthCheck", stage7_HealthCheck]]
        ];
        const results = [];
        for (const [StageName, stage] of stages) {
          const stageStartTime = Date.now();
          const SafeStage = Effect11.suspend(() => stage).pipe(
            Effect11.catchAllCause((Cause) => {
              const Message = String(Cause).slice(0, 300);
              process.stdout.write(
                `[LandFix:Bootstrap] Stage "${StageName}" failed (continuing): ${Message}
`
              );
              return Effect11.succeed({
                stageName: StageName,
                success: false,
                duration: Date.now() - stageStartTime,
                error: new Error(Message)
              });
            })
          );
          const result = yield* SafeStage;
          if (result?.success === false) {
            process.stdout.write(
              `[LandFix:Bootstrap] Stage "${StageName}" reported failure: ${result.error?.message ?? "<no message>"}
`
            );
          } else {
            process.stdout.write(
              `[LandFix:Bootstrap] Stage "${StageName}" OK in ${Date.now() - stageStartTime}ms
`
            );
          }
          results.push({
            ...result,
            duration: Date.now() - stageStartTime
          });
        }
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        const allSuccess = results.every((r) => r.success);
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] ==============================================="
        );
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] ${allSuccess ? "\u2713 Bootstrap completed successfully" : "\u2717 Bootstrap failed"}`
        );
        telemetry.log(
          "info",
          `[Cocoon Bootstrap] Total duration: ${totalDuration}ms`
        );
        telemetry.log(
          "info",
          "[Cocoon Bootstrap] ==============================================="
        );
        if (!allSuccess) {
          const failedStages = results.filter((r) => !r.success);
          telemetry.log("error", "[Cocoon Bootstrap] Failed stages:");
          for (const failed of failedStages) {
            telemetry.log(
              "error",
              `[Cocoon Bootstrap]   - ${failed.stageName}: ${failed.error?.message || "Unknown error"}`
            );
          }
        }
        return {
          success: allSuccess,
          totalDuration,
          stages: results,
          error: allSuccess ? void 0 : new Error("Bootstrap failed")
        };
      }), "run")
    }), "makeBootstrap");
    BootstrapLive = Layer10.effect(
      BootstrapTag,
      Effect11.succeed(makeBootstrap())
    );
    makeMockBootstrap = /* @__PURE__ */ __name(() => ({
      run: /* @__PURE__ */ __name((options) => Effect11.gen(function* () {
        yield* Effect11.sleep("1 millis");
        return {
          success: true,
          totalDuration: 1,
          stages: [
            {
              stageName: "Environment",
              success: true,
              duration: 0,
              error: void 0
            },
            {
              stageName: "Configuration",
              success: true,
              duration: 0,
              error: void 0
            },
            {
              stageName: "MountainConnection",
              success: true,
              duration: 0,
              error: void 0
            },
            {
              stageName: "RPCServer",
              success: true,
              duration: 0,
              error: void 0
            },
            {
              stageName: "Extensions",
              success: true,
              duration: 0,
              error: void 0
            },
            ...options?.skipHealthCheck ? [] : [
              {
                stageName: "HealthCheck",
                success: true,
                duration: 0,
                error: void 0
              }
            ]
          ],
          error: void 0
        };
      }), "run")
    }), "makeMockBootstrap");
    BootstrapMock = Layer10.effect(
      BootstrapTag,
      Effect11.succeed(makeMockBootstrap())
    );
    runBootstrap = /* @__PURE__ */ __name((options) => Effect11.gen(function* () {
      const bootstrap = yield* BootstrapTag;
      return yield* bootstrap.run(options);
    }).pipe(Effect11.provide(BootstrapLive)), "runBootstrap");
  }
});
await init_Bootstrap();
export {
  BootstrapLive,
  BootstrapMock,
  BootstrapTag,
  makeMockBootstrap,
  runBootstrap
};
//# sourceMappingURL=Bootstrap.js.map
