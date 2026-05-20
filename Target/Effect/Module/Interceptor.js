var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Dev/Log.ts
var Raw = process.env["Trace"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

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

// Source/Effect/Module/Interceptor.ts
import { Context as Context2, Effect as Effect2, HashMap as HashMap2, Layer as Layer2, Ref as Ref2, SubscriptionRef as SubscriptionRef2 } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
  SecurityLevel2["TRUSTED"] = "TRUSTED";
  SecurityLevel2["SANDBOXED"] = "SANDBOXED";
  SecurityLevel2["RESTRICTED"] = "RESTRICTED";
  SecurityLevel2["BLOCKED"] = "BLOCKED";
  return SecurityLevel2;
})(SecurityLevel || {});
var ModuleNotFoundError = class extends Error {
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
var ModuleAccessDeniedError = class extends Error {
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
var SecurityPolicyNotFoundError = class extends Error {
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
var ModuleInterceptorTag = class extends Context2.Tag(
  "Cocoon/ModuleInterceptor"
)() {
  static {
    __name(this, "ModuleInterceptorTag");
  }
};
var ModuleInterceptor = ModuleInterceptorTag;
var defaultSecurityPolicy = {
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
var ModuleInterceptorLive = Layer2.effect(
  ModuleInterceptor,
  Effect2.gen(function* () {
    const telemetry = yield* TelemetryTag;
    const policiesRef = yield* SubscriptionRef2.make(HashMap2.empty());
    const moduleCacheRef = yield* SubscriptionRef2.make(HashMap2.empty());
    const statsRef = yield* SubscriptionRef2.make({
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
    const initialize = Effect2.gen(function* () {
      telemetry.log(
        "info",
        "[ModuleInterceptor] Initializing module interceptor service..."
      );
      yield* Effect2.sleep("5 millis");
      telemetry.log(
        "info",
        "[ModuleInterceptor] Module interceptor service initialized"
      );
    });
    const vscodeAPIRegistry = /* @__PURE__ */ new Map();
    const install = Effect2.gen(function* () {
      telemetry.log(
        "info",
        "[ModuleInterceptor] Installing Node.js Module._load hook..."
      );
      const { default: NodeModule } = yield* Effect2.tryPromise({
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
          CocoonDevLog(
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
    const interceptRequire = /* @__PURE__ */ __name((request) => Effect2.gen(function* () {
      const startTime = Date.now();
      const currentStats = yield* statsRef.get;
      yield* Ref2.set(statsRef, {
        ...currentStats,
        totalInterceptions: currentStats.totalInterceptions + 1
      });
      const policyOpt = HashMap2.get(
        yield* policiesRef.get,
        request.extensionId
      );
      if (policyOpt._tag === "None") {
        yield* telemetry.log(
          "warn",
          `[ModuleInterceptor] No policy for extension ${request.extensionId}, using default`
        );
      }
      const policy = policyOpt._tag === "Some" ? policyOpt.value : {
        ...defaultSecurityPolicy,
        extensionId: request.extensionId
      };
      if (policy.blockedModules.includes(request.moduleId)) {
        yield* telemetry.log(
          "warn",
          `[ModuleInterceptor] Blocked module access: ${request.moduleId} for ${request.extensionId}`
        );
        const statsAfter2 = yield* statsRef.get;
        yield* Ref2.set(statsRef, {
          ...statsAfter2,
          blockedModules: statsAfter2.blockedModules + 1,
          securityViolations: statsAfter2.securityViolations + 1
        });
        return {
          success: false,
          error: `Module access denied: ${request.moduleId}`,
          securityLevel: "BLOCKED" /* BLOCKED */
        };
      }
      if (!policy.allowedModules.includes(request.moduleId) && !isNodeBuiltin(request.moduleId)) {
        yield* telemetry.log(
          "warn",
          `[ModuleInterceptor] Module not in allowlist: ${request.moduleId} for ${request.extensionId}`
        );
        const statsAfter2 = yield* statsRef.get;
        yield* Ref2.set(statsRef, {
          ...statsAfter2,
          blockedModules: statsAfter2.blockedModules + 1,
          securityViolations: statsAfter2.securityViolations + 1
        });
        return {
          success: false,
          error: `Module not in allowlist: ${request.moduleId}`,
          securityLevel: "RESTRICTED" /* RESTRICTED */
        };
      }
      const cacheKey = `${request.extensionId}:${request.moduleId}`;
      const cachedModule = HashMap2.get(
        yield* moduleCacheRef.get,
        cacheKey
      );
      if (cachedModule._tag === "Some") {
        const duration2 = Date.now() - startTime;
        resolutionTimes.push(duration2);
        const allTimes2 = [...resolutionTimes];
        const avgTime2 = allTimes2.reduce((a, b) => a + b, 0) / allTimes2.length;
        const statsAfter2 = yield* statsRef.get;
        yield* Ref2.set(statsRef, {
          ...statsAfter2,
          averageResolutionTime: avgTime2
        });
        telemetry.log(
          "debug",
          `[ModuleInterceptor] Module cache hit: ${request.moduleId} (${duration2}ms)`
        );
        return {
          success: true,
          module: cachedModule.value,
          securityLevel: policy.securityLevel
        };
      }
      yield* Effect2.sleep("5 millis");
      telemetry.log(
        "info",
        `[ModuleInterceptor] Module loaded: ${request.moduleId} for ${request.extensionId}`
      );
      const module = { module: request.moduleId };
      const currentCache = yield* moduleCacheRef.get;
      yield* Ref2.set(
        moduleCacheRef,
        HashMap2.set(currentCache, cacheKey, module)
      );
      const duration = Date.now() - startTime;
      resolutionTimes.push(duration);
      const allTimes = [...resolutionTimes];
      const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
      const statsAfter = yield* statsRef.get;
      yield* Ref2.set(statsRef, {
        ...statsAfter,
        averageResolutionTime: avgTime
      });
      return {
        success: true,
        module,
        securityLevel: policy.securityLevel
      };
    }), "interceptRequire");
    const resolveModule = /* @__PURE__ */ __name((extensionId, modulePath) => Effect2.gen(function* () {
      yield* Effect2.sleep("5 millis");
      if (!modulePath) {
        return yield* Effect2.fail(
          new ModuleNotFoundError(modulePath, extensionId)
        );
      }
      const resolvedPath = `/node_modules/${modulePath}/index.js`;
      return resolvedPath;
    }), "resolveModule");
    const setSecurityPolicy = /* @__PURE__ */ __name((policy) => Effect2.gen(function* () {
      const currentPolicies = yield* policiesRef.get;
      yield* Ref2.set(
        policiesRef,
        HashMap2.set(currentPolicies, policy.extensionId, policy)
      );
      telemetry.log(
        "info",
        `[ModuleInterceptor] Security policy set for extension ${policy.extensionId} (${policy.securityLevel})`
      );
    }), "setSecurityPolicy");
    const getSecurityPolicy = /* @__PURE__ */ __name((extensionId) => Effect2.gen(function* () {
      const policies = yield* policiesRef.get;
      const policy = HashMap2.get(policies, extensionId);
      if (policy._tag === "None") {
        return yield* Effect2.fail(
          new SecurityPolicyNotFoundError(extensionId)
        );
      }
      return policy.value;
    }), "getSecurityPolicy");
    const validateModuleSecurity = /* @__PURE__ */ __name((extensionId, moduleId) => Effect2.gen(function* () {
      const policies = yield* policiesRef.get;
      const policyOpt = HashMap2.get(policies, extensionId);
      if (policyOpt._tag === "None") {
        const policy2 = { ...defaultSecurityPolicy, extensionId };
        return !policy2.blockedModules.includes(moduleId) || policy2.allowedModules.includes(moduleId) || isNodeBuiltin(moduleId);
      }
      const policy = policyOpt.value;
      return !policy.blockedModules.includes(moduleId) || policy.allowedModules.includes(moduleId) || isNodeBuiltin(moduleId);
    }), "validateModuleSecurity");
    const getStatistics = Effect2.gen(function* () {
      return yield* statsRef.get;
    });
    const registerVscodeAPI = /* @__PURE__ */ __name((extensionId, api) => Effect2.gen(function* () {
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
var makeMockModuleInterceptor = /* @__PURE__ */ __name(() => ({
  initialize: Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
  }),
  install: Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
  }),
  registerVscodeAPI: /* @__PURE__ */ __name((_extensionId, _api) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
  }), "registerVscodeAPI"),
  interceptRequire: /* @__PURE__ */ __name((request) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
    return {
      success: true,
      module: { mock: true, moduleId: request.moduleId },
      securityLevel: "SANDBOXED" /* SANDBOXED */
    };
  }), "interceptRequire"),
  resolveModule: /* @__PURE__ */ __name((_extensionId, modulePath) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
    return `/node_modules/${modulePath}/index.js`;
  }), "resolveModule"),
  setSecurityPolicy: /* @__PURE__ */ __name((_policy) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
  }), "setSecurityPolicy"),
  getSecurityPolicy: /* @__PURE__ */ __name((extensionId) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
    return {
      extensionId,
      allowedModules: ["path", "util"],
      blockedModules: ["fs"],
      securityLevel: "SANDBOXED" /* SANDBOXED */
    };
  }), "getSecurityPolicy"),
  validateModuleSecurity: /* @__PURE__ */ __name((_extensionId, _moduleId) => Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
    return true;
  }), "validateModuleSecurity"),
  getStatistics: Effect2.gen(function* () {
    yield* Effect2.sleep("1 millis");
    return {
      totalInterceptions: 100,
      blockedModules: 5,
      averageResolutionTime: 2.5,
      securityViolations: 3
    };
  })
}), "makeMockModuleInterceptor");
var ModuleInterceptorMock = Layer2.effect(
  ModuleInterceptor,
  Effect2.succeed(makeMockModuleInterceptor())
);
export {
  ModuleAccessDeniedError,
  ModuleInterceptor,
  ModuleInterceptorLive,
  ModuleInterceptorMock,
  ModuleInterceptorTag,
  ModuleNotFoundError,
  SecurityLevel,
  SecurityPolicyNotFoundError,
  makeMockModuleInterceptor
};
//# sourceMappingURL=Interceptor.js.map
