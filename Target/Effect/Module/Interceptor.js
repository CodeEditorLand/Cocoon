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

// Source/Effect/Module/Interceptor.ts
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
var ModuleInterceptorTag = {
  _tag: "Cocoon/ModuleInterceptor"
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
async function makeModuleInterceptorService() {
  const telemetry = getTelemetry();
  const policies = /* @__PURE__ */ new Map();
  const moduleCache = /* @__PURE__ */ new Map();
  let stats = {
    totalInterceptions: 0,
    blockedModules: 0,
    averageResolutionTime: 0,
    securityViolations: 0
  };
  const resolutionTimes = [];
  const vscodeAPIRegistry = /* @__PURE__ */ new Map();
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
  const initialize = /* @__PURE__ */ __name(async () => {
    telemetry.log(
      "info",
      "[ModuleInterceptor] Initializing module interceptor service..."
    );
    await new Promise((r) => setTimeout(r, 5));
    telemetry.log(
      "info",
      "[ModuleInterceptor] Module interceptor service initialized"
    );
  }, "initialize");
  const install = /* @__PURE__ */ __name(async () => {
    telemetry.log(
      "info",
      "[ModuleInterceptor] Installing Node.js Module._load hook..."
    );
    const { default: NodeModule } = await import("node:module");
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
  }, "install");
  const interceptRequire = /* @__PURE__ */ __name(async (request) => {
    const startTime = Date.now();
    stats = { ...stats, totalInterceptions: stats.totalInterceptions + 1 };
    const policy = policies.get(request.extensionId) ?? {
      ...defaultSecurityPolicy,
      extensionId: request.extensionId
    };
    if (!policies.has(request.extensionId)) {
      telemetry.log(
        "warn",
        `[ModuleInterceptor] No policy for extension ${request.extensionId}, using default`
      );
    }
    if (policy.blockedModules.includes(request.moduleId)) {
      telemetry.log(
        "warn",
        `[ModuleInterceptor] Blocked module access: ${request.moduleId} for ${request.extensionId}`
      );
      stats = {
        ...stats,
        blockedModules: stats.blockedModules + 1,
        securityViolations: stats.securityViolations + 1
      };
      return {
        success: false,
        error: `Module access denied: ${request.moduleId}`,
        securityLevel: "BLOCKED" /* BLOCKED */
      };
    }
    if (!policy.allowedModules.includes(request.moduleId) && !isNodeBuiltin(request.moduleId)) {
      telemetry.log(
        "warn",
        `[ModuleInterceptor] Module not in allowlist: ${request.moduleId} for ${request.extensionId}`
      );
      stats = {
        ...stats,
        blockedModules: stats.blockedModules + 1,
        securityViolations: stats.securityViolations + 1
      };
      return {
        success: false,
        error: `Module not in allowlist: ${request.moduleId}`,
        securityLevel: "RESTRICTED" /* RESTRICTED */
      };
    }
    const cacheKey = `${request.extensionId}:${request.moduleId}`;
    const cachedModule = moduleCache.get(cacheKey);
    if (cachedModule !== void 0) {
      const duration2 = Date.now() - startTime;
      resolutionTimes.push(duration2);
      const avgTime2 = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
      stats = { ...stats, averageResolutionTime: avgTime2 };
      telemetry.log(
        "debug",
        `[ModuleInterceptor] Module cache hit: ${request.moduleId} (${duration2}ms)`
      );
      return {
        success: true,
        module: cachedModule,
        securityLevel: policy.securityLevel
      };
    }
    await new Promise((r) => setTimeout(r, 5));
    telemetry.log(
      "info",
      `[ModuleInterceptor] Module loaded: ${request.moduleId} for ${request.extensionId}`
    );
    const loadedModule = { module: request.moduleId };
    moduleCache.set(cacheKey, loadedModule);
    const duration = Date.now() - startTime;
    resolutionTimes.push(duration);
    const avgTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    stats = { ...stats, averageResolutionTime: avgTime };
    return {
      success: true,
      module: loadedModule,
      securityLevel: policy.securityLevel
    };
  }, "interceptRequire");
  const resolveModule = /* @__PURE__ */ __name(async (extensionId, modulePath) => {
    await new Promise((r) => setTimeout(r, 5));
    if (!modulePath) {
      throw new ModuleNotFoundError(modulePath, extensionId);
    }
    return `/node_modules/${modulePath}/index.js`;
  }, "resolveModule");
  const setSecurityPolicy = /* @__PURE__ */ __name(async (policy) => {
    policies.set(policy.extensionId, policy);
    telemetry.log(
      "info",
      `[ModuleInterceptor] Security policy set for extension ${policy.extensionId} (${policy.securityLevel})`
    );
  }, "setSecurityPolicy");
  const getSecurityPolicy = /* @__PURE__ */ __name(async (extensionId) => {
    const policy = policies.get(extensionId);
    if (policy === void 0) {
      throw new SecurityPolicyNotFoundError(extensionId);
    }
    return policy;
  }, "getSecurityPolicy");
  const validateModuleSecurity = /* @__PURE__ */ __name(async (extensionId, moduleId) => {
    const policy = policies.get(extensionId) ?? {
      ...defaultSecurityPolicy,
      extensionId
    };
    return !policy.blockedModules.includes(moduleId) || policy.allowedModules.includes(moduleId) || isNodeBuiltin(moduleId);
  }, "validateModuleSecurity");
  const getStatistics = /* @__PURE__ */ __name(async () => stats, "getStatistics");
  const registerVscodeAPI = /* @__PURE__ */ __name(async (extensionId, api) => {
    vscodeAPIRegistry.set(extensionId, api);
    telemetry.log(
      "info",
      `[ModuleInterceptor] Registered vscode API for extension: ${extensionId}`
    );
  }, "registerVscodeAPI");
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
}
__name(makeModuleInterceptorService, "makeModuleInterceptorService");
var _instance;
async function getModuleInterceptor() {
  if (_instance === void 0) {
    _instance = await makeModuleInterceptorService();
  }
  return _instance;
}
__name(getModuleInterceptor, "getModuleInterceptor");
var ModuleInterceptorLive = makeModuleInterceptorService();
var makeMockModuleInterceptor = /* @__PURE__ */ __name(() => ({
  initialize: /* @__PURE__ */ __name(async () => {
    await new Promise((r) => setTimeout(r, 1));
  }, "initialize"),
  install: /* @__PURE__ */ __name(async () => {
    await new Promise((r) => setTimeout(r, 1));
  }, "install"),
  registerVscodeAPI: /* @__PURE__ */ __name(async (_extensionId, _api) => {
    await new Promise((r) => setTimeout(r, 1));
  }, "registerVscodeAPI"),
  interceptRequire: /* @__PURE__ */ __name(async (request) => {
    await new Promise((r) => setTimeout(r, 1));
    return {
      success: true,
      module: { mock: true, moduleId: request.moduleId },
      securityLevel: "SANDBOXED" /* SANDBOXED */
    };
  }, "interceptRequire"),
  resolveModule: /* @__PURE__ */ __name(async (_extensionId, modulePath) => {
    await new Promise((r) => setTimeout(r, 1));
    return `/node_modules/${modulePath}/index.js`;
  }, "resolveModule"),
  setSecurityPolicy: /* @__PURE__ */ __name(async (_policy) => {
    await new Promise((r) => setTimeout(r, 1));
  }, "setSecurityPolicy"),
  getSecurityPolicy: /* @__PURE__ */ __name(async (extensionId) => {
    await new Promise((r) => setTimeout(r, 1));
    return {
      extensionId,
      allowedModules: ["path", "util"],
      blockedModules: ["fs"],
      securityLevel: "SANDBOXED" /* SANDBOXED */
    };
  }, "getSecurityPolicy"),
  validateModuleSecurity: /* @__PURE__ */ __name(async (_extensionId, _moduleId) => {
    await new Promise((r) => setTimeout(r, 1));
    return true;
  }, "validateModuleSecurity"),
  getStatistics: /* @__PURE__ */ __name(async () => {
    await new Promise((r) => setTimeout(r, 1));
    return {
      totalInterceptions: 100,
      blockedModules: 5,
      averageResolutionTime: 2.5,
      securityViolations: 3
    };
  }, "getStatistics")
}), "makeMockModuleInterceptor");
var ModuleInterceptorMock = makeMockModuleInterceptor();
export {
  ModuleAccessDeniedError,
  ModuleInterceptor,
  ModuleInterceptorLive,
  ModuleInterceptorMock,
  ModuleInterceptorTag,
  ModuleNotFoundError,
  SecurityLevel,
  SecurityPolicyNotFoundError,
  getModuleInterceptor,
  makeMockModuleInterceptor
};
//# sourceMappingURL=Interceptor.js.map
