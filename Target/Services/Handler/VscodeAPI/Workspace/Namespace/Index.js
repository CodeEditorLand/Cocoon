var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
      let Queue2 = [];
      let FlushTimer;
      const Send = /* @__PURE__ */ __name(() => {
        if (Queue2.length === 0) return;
        const Pending = Queue2;
        Queue2 = [];
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
          Queue2.push(Event_default.Create(Name, Properties));
          if (Queue2.length >= Config.BatchMaximum) {
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

// Source/Generated/RouteManifest.ts
var MountainMethods = /* @__PURE__ */ new Set(["$disposeStatusBarMessage", "$gitExec", "$resolveCustomEditor", "$scm:createSourceControl", "$scm:openDiff", "$scm:registerInputBox", "$scm:updateGroup", "$scm:updateSourceControl", "$setStatusBarMessage", "$statusBar:dispose", "$statusBar:set", "$terminal:create", "$terminal:dispose", "$terminal:resize", "$terminal:sendText", "$tree:register", "$updateWorkspaceFolders", "applyEdit", "Authentication.GetAccounts", "Authentication.GetSession", "Clipboard.Read", "Clipboard.Write", "Command.Execute", "Command.GetAll", "config.get", "config.update", "Configuration.Inspect", "Configuration.Update", "Debug.RegisterConfigurationProvider", "Debug.Start", "Debug.Stop", "Diagnostic.Clear", "Diagnostic.Set", "Document.Save", "Document.SaveAs", "error", "executeCommand", "FileSystem.Copy", "FileSystem.CreateDirectory", "FileSystem.Delete", "FileSystem.ReadDirectory", "FileSystem.ReadFile", "FileSystem.Rename", "FileSystem.Stat", "FileSystem.WriteFile", "FileWatcher.Register", "FileWatcher.Unregister", "findFiles", "findTextInFiles", "html", "Keybinding.GetResolved", "Languages.GetAll", "message", "NativeHost.OpenExternal", "openDocument", "postMessage", "readFile", "register_call_hierarchy_provider", "register_code_actions_provider", "register_code_lens_provider", "register_color_provider", "register_completion_item_provider", "register_declaration_provider", "register_definition_provider", "register_document_formatting_provider", "register_document_highlight_provider", "register_document_link_provider", "register_document_range_formatting_provider", "register_document_symbol_provider", "register_evaluatable_expression_provider", "register_folding_range_provider", "register_hover_provider", "register_implementation_provider", "register_inlay_hints_provider", "register_inline_values_provider", "register_linked_editing_range_provider", "register_on_type_formatting_provider", "register_reference_provider", "register_rename_provider", "register_selection_range_provider", "register_semantic_tokens_provider", "register_signature_help_provider", "register_type_definition_provider", "register_type_hierarchy_provider", "register_workspace_symbol_provider", "Search.TextSearch", "secrets.delete", "secrets.get", "secrets.store", "setHtml", "showTextDocument", "stat", "Storage.Get", "Storage.Set", "Task.Execute", "Task.Fetch", "Terminal.GetProcessId", "Terminal.Resize", "tree.dispose", "tree.register", "tree.unregister", "UserInterface.ShowInputBox", "UserInterface.ShowMessage", "UserInterface.ShowOpenDialog", "UserInterface.ShowQuickPick", "UserInterface.ShowSaveDialog", "viewId", "vscode.diff", "warning", "webview.postMessage", "webview.registerView", "webview.setHtml", "webview.unregisterView", "Window.ShowInputBox", "Window.ShowMessage", "Window.ShowOpenDialog", "Window.ShowQuickPick", "Window.ShowSaveDialog", "Workspace.IsResourceTrusted", "Workspace.RequestResourceTrust"]);
var StockLiftExports = /* @__PURE__ */ new Set();
var BespokeCocoonMethods = /* @__PURE__ */ new Set(["FindTextInFilesNodeFallback"]);
var RouteManifestSummary = {
  mountain: 120,
  stockLift: 0,
  bespoke: 1,
  generatedAt: "2026-05-19T04:25:35Z"
};

// Source/Services/Dual/Track.ts
var NotImplementedError = class extends Error {
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
var IsBypassValue = /* @__PURE__ */ __name((Raw2) => {
  if (!Raw2) return false;
  const Normalised = Raw2.trim().toLowerCase();
  return Normalised === "false" || Normalised === "0" || Normalised === "no" || Normalised === "off";
}, "IsBypassValue");
var ParseDomain = /* @__PURE__ */ __name((Method) => {
  const Dot = Method.indexOf(".");
  if (Dot <= 0) return "";
  return Method.slice(0, Dot).toUpperCase();
}, "ParseDomain");
var IsRustDeferralEnabled = /* @__PURE__ */ __name((Method) => {
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
function IsUnknownMethodError(Err) {
  if (Err == null) return false;
  const Message = Err instanceof Error ? Err.message : typeof Err === "string" ? Err : typeof Err.message === "string" ? Err.message : "";
  if (!Message) return false;
  return Message.includes("Unknown method:") || Message.includes("Unknown IPC command") || Message.includes("no handler for method") || Message.includes("not routed to any domain");
}
__name(IsUnknownMethodError, "IsUnknownMethodError");
async function TryMountainThenNode(Context, Method, Arguments, NodeFallback) {
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
    const MountainResult = await Context.MountainClient?.sendRequest(
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
__name(TryMountainThenNode, "TryMountainThenNode");
async function TryMountainWithEmptyFallback(Context, Method, Arguments, NodeFallback, IsEmpty) {
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
    MountainResult = await Context.MountainClient?.sendRequest(
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
__name(TryMountainWithEmptyFallback, "TryMountainWithEmptyFallback");
function MarkUnavailable(Method) {
  LogDualTrack(Method, "unavailable");
  throw new NotImplementedError(Method);
}
__name(MarkUnavailable, "MarkUnavailable");
var SendToMountainOrLocal = /* @__PURE__ */ __name((Context, Method, Payload, OnLocalFallback) => {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      OnLocalFallback?.();
    } catch {
    }
    return Promise.resolve();
  }
  const Send = Context.SendToMountain;
  return Send.call(Context, Method, Payload).then(
    () => {
      LogDualTrack(Method, "mountain");
    },
    (_Err) => {
      LogDualTrack(Method, "error");
    }
  );
}, "SendToMountainOrLocal");
var LogDualTrack = /* @__PURE__ */ __name((Method, Route2) => {
  if (!process.env["Trace"]) return;
  process.stdout.write(`[DEV:DUAL-TRACK] method=${Method} route=${Route2}
`);
}, "LogDualTrack");

// ../Output/Target/Microsoft/VSCode/vs/base/common/arraysFind.js
function findLast(array, predicate, fromIndex = array.length - 1) {
  const idx = findLastIdx(array, predicate, fromIndex);
  if (idx === -1) {
    return void 0;
  }
  return array[idx];
}
__name(findLast, "findLast");
function findLastIdx(array, predicate, fromIndex = array.length - 1) {
  for (let i = fromIndex; i >= 0; i--) {
    const element = array[i];
    if (predicate(element, i)) {
      return i;
    }
  }
  return -1;
}
__name(findLastIdx, "findLastIdx");
function findFirst(array, predicate, fromIndex = 0) {
  const idx = findFirstIdx(array, predicate, fromIndex);
  if (idx === -1) {
    return void 0;
  }
  return array[idx];
}
__name(findFirst, "findFirst");
function findFirstIdx(array, predicate, fromIndex = 0) {
  for (let i = fromIndex; i < array.length; i++) {
    const element = array[i];
    if (predicate(element, i)) {
      return i;
    }
  }
  return -1;
}
__name(findFirstIdx, "findFirstIdx");
function findLastMonotonous(array, predicate) {
  const idx = findLastIdxMonotonous(array, predicate);
  return idx === -1 ? void 0 : array[idx];
}
__name(findLastMonotonous, "findLastMonotonous");
function findLastIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      i = k + 1;
    } else {
      j = k;
    }
  }
  return i - 1;
}
__name(findLastIdxMonotonous, "findLastIdxMonotonous");
function findFirstMonotonous(array, predicate) {
  const idx = findFirstIdxMonotonousOrArrLen(array, predicate);
  return idx === array.length ? void 0 : array[idx];
}
__name(findFirstMonotonous, "findFirstMonotonous");
function findFirstIdxMonotonousOrArrLen(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      j = k;
    } else {
      i = k + 1;
    }
  }
  return i;
}
__name(findFirstIdxMonotonousOrArrLen, "findFirstIdxMonotonousOrArrLen");
function findFirstIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
  const idx = findFirstIdxMonotonousOrArrLen(array, predicate, startIdx, endIdxEx);
  return idx === array.length ? -1 : idx;
}
__name(findFirstIdxMonotonous, "findFirstIdxMonotonous");
var MonotonousArray = class _MonotonousArray {
  static {
    __name(this, "MonotonousArray");
  }
  static {
    this.assertInvariants = false;
  }
  constructor(_array) {
    this._array = _array;
    this._findLastMonotonousLastIdx = 0;
  }
  /**
   * The predicate must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
   * For subsequent calls, current predicate must be weaker than (or equal to) the previous predicate, i.e. more entries must be `true`.
   */
  findLastMonotonous(predicate) {
    if (_MonotonousArray.assertInvariants) {
      if (this._prevFindLastPredicate) {
        for (const item of this._array) {
          if (this._prevFindLastPredicate(item) && !predicate(item)) {
            throw new Error("MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.");
          }
        }
      }
      this._prevFindLastPredicate = predicate;
    }
    const idx = findLastIdxMonotonous(this._array, predicate, this._findLastMonotonousLastIdx);
    this._findLastMonotonousLastIdx = idx + 1;
    return idx === -1 ? void 0 : this._array[idx];
  }
};
function findFirstMax(array, comparator) {
  if (array.length === 0) {
    return void 0;
  }
  let max = array[0];
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, max) > 0) {
      max = item;
    }
  }
  return max;
}
__name(findFirstMax, "findFirstMax");
function findLastMax(array, comparator) {
  if (array.length === 0) {
    return void 0;
  }
  let max = array[0];
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, max) >= 0) {
      max = item;
    }
  }
  return max;
}
__name(findLastMax, "findLastMax");
function findFirstMin(array, comparator) {
  return findFirstMax(array, (a, b) => -comparator(a, b));
}
__name(findFirstMin, "findFirstMin");
function findMaxIdx(array, comparator) {
  if (array.length === 0) {
    return -1;
  }
  let maxIdx = 0;
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, array[maxIdx]) > 0) {
      maxIdx = i;
    }
  }
  return maxIdx;
}
__name(findMaxIdx, "findMaxIdx");
function mapFindFirst(items, mapFn) {
  for (const value of items) {
    const mapped = mapFn(value);
    if (mapped !== void 0) {
      return mapped;
    }
  }
  return void 0;
}
__name(mapFindFirst, "mapFindFirst");

// ../Output/Target/Microsoft/VSCode/vs/base/common/errors.js
var ErrorHandler = class {
  static {
    __name(this, "ErrorHandler");
  }
  constructor() {
    this.listeners = [];
    this.unexpectedErrorHandler = function(e) {
      setTimeout(() => {
        if (e.stack) {
          if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
            throw new ErrorNoTelemetry(e.message + "\n\n" + e.stack);
          }
          throw new Error(e.message + "\n\n" + e.stack);
        }
        throw e;
      }, 0);
    };
  }
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this._removeListener(listener);
    };
  }
  emit(e) {
    this.listeners.forEach((listener) => {
      listener(e);
    });
  }
  _removeListener(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
  setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    this.unexpectedErrorHandler = newUnexpectedErrorHandler;
  }
  getUnexpectedErrorHandler() {
    return this.unexpectedErrorHandler;
  }
  onUnexpectedError(e) {
    this.unexpectedErrorHandler(e);
    this.emit(e);
  }
  // For external errors, we don't want the listeners to be called
  onUnexpectedExternalError(e) {
    this.unexpectedErrorHandler(e);
  }
};
var errorHandler = new ErrorHandler();
function setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
  errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}
__name(setUnexpectedErrorHandler, "setUnexpectedErrorHandler");
function isSigPipeError(e) {
  if (!e || typeof e !== "object") {
    return false;
  }
  const cast = e;
  return cast.code === "EPIPE" && cast.syscall?.toUpperCase() === "WRITE";
}
__name(isSigPipeError, "isSigPipeError");
function onBugIndicatingError(e) {
  errorHandler.onUnexpectedError(e);
  return void 0;
}
__name(onBugIndicatingError, "onBugIndicatingError");
function onUnexpectedError(e) {
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedError(e);
  }
  return void 0;
}
__name(onUnexpectedError, "onUnexpectedError");
function onUnexpectedExternalError(e) {
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedExternalError(e);
  }
  return void 0;
}
__name(onUnexpectedExternalError, "onUnexpectedExternalError");
function transformErrorForSerialization(error) {
  if (error instanceof Error) {
    const { name, message, cause } = error;
    const stack = error.stacktrace || error.stack;
    return {
      $isError: true,
      name,
      message,
      stack,
      noTelemetry: ErrorNoTelemetry.isErrorNoTelemetry(error),
      cause: cause ? transformErrorForSerialization(cause) : void 0,
      code: error.code
    };
  }
  return error;
}
__name(transformErrorForSerialization, "transformErrorForSerialization");
function transformErrorFromSerialization(data) {
  let error;
  if (data.noTelemetry) {
    error = new ErrorNoTelemetry();
  } else {
    error = new Error();
    error.name = data.name;
  }
  error.message = data.message;
  error.stack = data.stack;
  if (data.code) {
    error.code = data.code;
  }
  if (data.cause) {
    error.cause = transformErrorFromSerialization(data.cause);
  }
  return error;
}
__name(transformErrorFromSerialization, "transformErrorFromSerialization");
var canceledName = "Canceled";
function isCancellationError(error) {
  if (error instanceof CancellationError) {
    return true;
  }
  return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
__name(isCancellationError, "isCancellationError");
var CancellationError = class extends Error {
  static {
    __name(this, "CancellationError");
  }
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
};
var PendingMigrationError = class _PendingMigrationError extends Error {
  static {
    __name(this, "PendingMigrationError");
  }
  static {
    this._name = "PendingMigrationError";
  }
  static is(error) {
    return error instanceof _PendingMigrationError || error instanceof Error && error.name === _PendingMigrationError._name;
  }
  constructor(message) {
    super(message);
    this.name = _PendingMigrationError._name;
  }
};
function canceled() {
  const error = new Error(canceledName);
  error.name = error.message;
  return error;
}
__name(canceled, "canceled");
function illegalArgument(name) {
  if (name) {
    return new Error(`Illegal argument: ${name}`);
  } else {
    return new Error("Illegal argument");
  }
}
__name(illegalArgument, "illegalArgument");
function illegalState(name) {
  if (name) {
    return new Error(`Illegal state: ${name}`);
  } else {
    return new Error("Illegal state");
  }
}
__name(illegalState, "illegalState");
var ReadonlyError = class extends TypeError {
  static {
    __name(this, "ReadonlyError");
  }
  constructor(name) {
    super(name ? `${name} is read-only and cannot be changed` : "Cannot change read-only property");
  }
};
function getErrorMessage(err) {
  if (!err) {
    return "Error";
  }
  if (err.message) {
    return err.message;
  }
  if (err.stack) {
    return err.stack.split("\n")[0];
  }
  return String(err);
}
__name(getErrorMessage, "getErrorMessage");
var NotImplementedError2 = class extends Error {
  static {
    __name(this, "NotImplementedError");
  }
  constructor(message) {
    super("NotImplemented");
    if (message) {
      this.message = message;
    }
  }
};
var NotSupportedError = class extends Error {
  static {
    __name(this, "NotSupportedError");
  }
  constructor(message) {
    super("NotSupported");
    if (message) {
      this.message = message;
    }
  }
};
var ExpectedError = class extends Error {
  static {
    __name(this, "ExpectedError");
  }
  constructor() {
    super(...arguments);
    this.isExpected = true;
  }
};
var ErrorNoTelemetry = class _ErrorNoTelemetry extends Error {
  static {
    __name(this, "ErrorNoTelemetry");
  }
  constructor(msg) {
    super(msg);
    this.name = "CodeExpectedError";
  }
  static fromError(err) {
    if (err instanceof _ErrorNoTelemetry) {
      return err;
    }
    const result = new _ErrorNoTelemetry();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "CodeExpectedError";
  }
};
var BugIndicatingError = class _BugIndicatingError extends Error {
  static {
    __name(this, "BugIndicatingError");
  }
  constructor(message) {
    super(message || "An unexpected bug occurred.");
    Object.setPrototypeOf(this, _BugIndicatingError.prototype);
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/arrays.js
function topStep(array, compare2, result, i, m) {
  for (const n = result.length; i < m; i++) {
    const element = array[i];
    if (compare2(element, result[n - 1]) < 0) {
      result.pop();
      const j = findFirstIdxMonotonousOrArrLen(result, (e) => compare2(element, e) < 0);
      result.splice(j, 0, element);
    }
  }
}
__name(topStep, "topStep");
function getActualStartIndex(array, start) {
  return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}
__name(getActualStartIndex, "getActualStartIndex");
function tail(arr) {
  if (arr.length === 0) {
    throw new Error("Invalid tail call");
  }
  return [arr.slice(0, arr.length - 1), arr[arr.length - 1]];
}
__name(tail, "tail");
function equals(one, other, itemEquals = (a, b) => a === b) {
  if (one === other) {
    return true;
  }
  if (!one || !other) {
    return false;
  }
  if (one.length !== other.length) {
    return false;
  }
  for (let i = 0, len = one.length; i < len; i++) {
    if (!itemEquals(one[i], other[i])) {
      return false;
    }
  }
  return true;
}
__name(equals, "equals");
function removeFastWithoutKeepingOrder(array, index2) {
  const last = array.length - 1;
  if (index2 < last) {
    array[index2] = array[last];
  }
  array.pop();
}
__name(removeFastWithoutKeepingOrder, "removeFastWithoutKeepingOrder");
function binarySearch(array, key, comparator) {
  return binarySearch2(array.length, (i) => comparator(array[i], key));
}
__name(binarySearch, "binarySearch");
function binarySearch2(length, compareToKey) {
  let low = 0, high = length - 1;
  while (low <= high) {
    const mid = (low + high) / 2 | 0;
    const comp = compareToKey(mid);
    if (comp < 0) {
      low = mid + 1;
    } else if (comp > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}
__name(binarySearch2, "binarySearch2");
function quickSelect(nth, data, compare2) {
  nth = nth | 0;
  if (nth >= data.length) {
    throw new TypeError("invalid index");
  }
  const pivotValue = data[Math.floor(data.length * Math.random())];
  const lower = [];
  const higher = [];
  const pivots = [];
  for (const value of data) {
    const val = compare2(value, pivotValue);
    if (val < 0) {
      lower.push(value);
    } else if (val > 0) {
      higher.push(value);
    } else {
      pivots.push(value);
    }
  }
  if (nth < lower.length) {
    return quickSelect(nth, lower, compare2);
  } else if (nth < lower.length + pivots.length) {
    return pivots[0];
  } else {
    return quickSelect(nth - (lower.length + pivots.length), higher, compare2);
  }
}
__name(quickSelect, "quickSelect");
function groupBy(data, compare2) {
  const result = [];
  let currentGroup = void 0;
  for (const element of data.slice(0).sort(compare2)) {
    if (!currentGroup || compare2(currentGroup[0], element) !== 0) {
      currentGroup = [element];
      result.push(currentGroup);
    } else {
      currentGroup.push(element);
    }
  }
  return result;
}
__name(groupBy, "groupBy");
function* groupAdjacentBy(items, shouldBeGrouped) {
  let currentGroup;
  let last;
  for (const item of items) {
    if (last !== void 0 && shouldBeGrouped(last, item)) {
      currentGroup.push(item);
    } else {
      if (currentGroup) {
        yield currentGroup;
      }
      currentGroup = [item];
    }
    last = item;
  }
  if (currentGroup) {
    yield currentGroup;
  }
}
__name(groupAdjacentBy, "groupAdjacentBy");
function forEachAdjacent(arr, f) {
  for (let i = 0; i <= arr.length; i++) {
    f(i === 0 ? void 0 : arr[i - 1], i === arr.length ? void 0 : arr[i]);
  }
}
__name(forEachAdjacent, "forEachAdjacent");
function forEachWithNeighbors(arr, f) {
  for (let i = 0; i < arr.length; i++) {
    f(i === 0 ? void 0 : arr[i - 1], arr[i], i + 1 === arr.length ? void 0 : arr[i + 1]);
  }
}
__name(forEachWithNeighbors, "forEachWithNeighbors");
function concatArrays(...arrays) {
  return [].concat(...arrays);
}
__name(concatArrays, "concatArrays");
function sortedDiff(before, after, compare2) {
  const result = [];
  function pushSplice(start, deleteCount, toInsert) {
    if (deleteCount === 0 && toInsert.length === 0) {
      return;
    }
    const latest = result[result.length - 1];
    if (latest && latest.start + latest.deleteCount === start) {
      latest.deleteCount += deleteCount;
      latest.toInsert.push(...toInsert);
    } else {
      result.push({ start, deleteCount, toInsert });
    }
  }
  __name(pushSplice, "pushSplice");
  let beforeIdx = 0;
  let afterIdx = 0;
  while (true) {
    if (beforeIdx === before.length) {
      pushSplice(beforeIdx, 0, after.slice(afterIdx));
      break;
    }
    if (afterIdx === after.length) {
      pushSplice(beforeIdx, before.length - beforeIdx, []);
      break;
    }
    const beforeElement = before[beforeIdx];
    const afterElement = after[afterIdx];
    const n = compare2(beforeElement, afterElement);
    if (n === 0) {
      beforeIdx += 1;
      afterIdx += 1;
    } else if (n < 0) {
      pushSplice(beforeIdx, 1, []);
      beforeIdx += 1;
    } else if (n > 0) {
      pushSplice(beforeIdx, 0, [afterElement]);
      afterIdx += 1;
    }
  }
  return result;
}
__name(sortedDiff, "sortedDiff");
function delta(before, after, compare2) {
  const splices = sortedDiff(before, after, compare2);
  const removed = [];
  const added = [];
  for (const splice2 of splices) {
    removed.push(...before.slice(splice2.start, splice2.start + splice2.deleteCount));
    added.push(...splice2.toInsert);
  }
  return { removed, added };
}
__name(delta, "delta");
function top(array, compare2, n) {
  if (n === 0) {
    return [];
  }
  const result = array.slice(0, n).sort(compare2);
  topStep(array, compare2, result, n, array.length);
  return result;
}
__name(top, "top");
function topAsync(array, compare2, n, batch, token) {
  if (n === 0) {
    return Promise.resolve([]);
  }
  return new Promise((resolve2, reject) => {
    (async () => {
      const o = array.length;
      const result = array.slice(0, n).sort(compare2);
      for (let i = n, m = Math.min(n + batch, o); i < o; i = m, m = Math.min(m + batch, o)) {
        if (i > n) {
          await new Promise((resolve3) => setTimeout(resolve3));
        }
        if (token && token.isCancellationRequested) {
          throw new CancellationError();
        }
        topStep(array, compare2, result, i, m);
      }
      return result;
    })().then(resolve2, reject);
  });
}
__name(topAsync, "topAsync");
function coalesce(array) {
  return array.filter((e) => !!e);
}
__name(coalesce, "coalesce");
function coalesceInPlace(array) {
  let to = 0;
  for (let i = 0; i < array.length; i++) {
    if (!!array[i]) {
      array[to] = array[i];
      to += 1;
    }
  }
  array.length = to;
}
__name(coalesceInPlace, "coalesceInPlace");
function move(array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
}
__name(move, "move");
function isFalsyOrEmpty(obj) {
  return !Array.isArray(obj) || obj.length === 0;
}
__name(isFalsyOrEmpty, "isFalsyOrEmpty");
function isNonEmptyArray(obj) {
  return Array.isArray(obj) && obj.length > 0;
}
__name(isNonEmptyArray, "isNonEmptyArray");
function distinct(array, keyFn = (value) => value) {
  const seen = /* @__PURE__ */ new Set();
  return array.filter((element) => {
    const key = keyFn(element);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
__name(distinct, "distinct");
function uniqueFilter(keyFn) {
  const seen = /* @__PURE__ */ new Set();
  return (element) => {
    const key = keyFn(element);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  };
}
__name(uniqueFilter, "uniqueFilter");
function commonPrefixLength(one, other, equals3 = (a, b) => a === b) {
  let result = 0;
  for (let i = 0, len = Math.min(one.length, other.length); i < len && equals3(one[i], other[i]); i++) {
    result++;
  }
  return result;
}
__name(commonPrefixLength, "commonPrefixLength");
function range(arg, to) {
  let from = typeof to === "number" ? arg : 0;
  if (typeof to === "number") {
    from = arg;
  } else {
    from = 0;
    to = arg;
  }
  const result = [];
  if (from <= to) {
    for (let i = from; i < to; i++) {
      result.push(i);
    }
  } else {
    for (let i = from; i > to; i--) {
      result.push(i);
    }
  }
  return result;
}
__name(range, "range");
function index(array, indexer, mapper) {
  return array.reduce((r, t) => {
    r[indexer(t)] = mapper ? mapper(t) : t;
    return r;
  }, /* @__PURE__ */ Object.create(null));
}
__name(index, "index");
function insert(array, element) {
  array.push(element);
  return () => remove(array, element);
}
__name(insert, "insert");
function remove(array, element) {
  const index2 = array.indexOf(element);
  if (index2 > -1) {
    array.splice(index2, 1);
    return element;
  }
  return void 0;
}
__name(remove, "remove");
function arrayInsert(target, insertIndex, insertArr) {
  const before = target.slice(0, insertIndex);
  const after = target.slice(insertIndex);
  return before.concat(insertArr, after);
}
__name(arrayInsert, "arrayInsert");
function shuffle(array, _seed) {
  let rand;
  if (typeof _seed === "number") {
    let seed = _seed;
    rand = /* @__PURE__ */ __name(() => {
      const x = Math.sin(seed++) * 179426549;
      return x - Math.floor(x);
    }, "rand");
  } else {
    rand = Math.random;
  }
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
__name(shuffle, "shuffle");
function pushToStart(arr, value) {
  const index2 = arr.indexOf(value);
  if (index2 > -1) {
    arr.splice(index2, 1);
    arr.unshift(value);
  }
}
__name(pushToStart, "pushToStart");
function pushToEnd(arr, value) {
  const index2 = arr.indexOf(value);
  if (index2 > -1) {
    arr.splice(index2, 1);
    arr.push(value);
  }
}
__name(pushToEnd, "pushToEnd");
function pushMany(arr, items) {
  for (const item of items) {
    arr.push(item);
  }
}
__name(pushMany, "pushMany");
function mapArrayOrNot(items, fn) {
  return Array.isArray(items) ? items.map(fn) : fn(items);
}
__name(mapArrayOrNot, "mapArrayOrNot");
function mapFilter(array, fn) {
  const result = [];
  for (const item of array) {
    const mapped = fn(item);
    if (mapped !== void 0) {
      result.push(mapped);
    }
  }
  return result;
}
__name(mapFilter, "mapFilter");
function withoutDuplicates(array) {
  const s = new Set(array);
  return Array.from(s);
}
__name(withoutDuplicates, "withoutDuplicates");
function asArray(x) {
  return Array.isArray(x) ? x : [x];
}
__name(asArray, "asArray");
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
__name(getRandomElement, "getRandomElement");
function insertInto(array, start, newItems) {
  const startIdx = getActualStartIndex(array, start);
  const originalLength = array.length;
  const newItemsLength = newItems.length;
  array.length = originalLength + newItemsLength;
  for (let i = originalLength - 1; i >= startIdx; i--) {
    array[i + newItemsLength] = array[i];
  }
  for (let i = 0; i < newItemsLength; i++) {
    array[i + startIdx] = newItems[i];
  }
}
__name(insertInto, "insertInto");
function splice(array, start, deleteCount, newItems) {
  const index2 = getActualStartIndex(array, start);
  let result = array.splice(index2, deleteCount);
  if (result === void 0) {
    result = [];
  }
  insertInto(array, index2, newItems);
  return result;
}
__name(splice, "splice");
var CompareResult;
(function(CompareResult2) {
  function isLessThan(result) {
    return result < 0;
  }
  __name(isLessThan, "isLessThan");
  CompareResult2.isLessThan = isLessThan;
  function isLessThanOrEqual(result) {
    return result <= 0;
  }
  __name(isLessThanOrEqual, "isLessThanOrEqual");
  CompareResult2.isLessThanOrEqual = isLessThanOrEqual;
  function isGreaterThan(result) {
    return result > 0;
  }
  __name(isGreaterThan, "isGreaterThan");
  CompareResult2.isGreaterThan = isGreaterThan;
  function isNeitherLessOrGreaterThan(result) {
    return result === 0;
  }
  __name(isNeitherLessOrGreaterThan, "isNeitherLessOrGreaterThan");
  CompareResult2.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
  CompareResult2.greaterThan = 1;
  CompareResult2.lessThan = -1;
  CompareResult2.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
function compareBy(selector, comparator) {
  return (a, b) => comparator(selector(a), selector(b));
}
__name(compareBy, "compareBy");
function tieBreakComparators(...comparators) {
  return (item1, item2) => {
    for (const comparator of comparators) {
      const result = comparator(item1, item2);
      if (!CompareResult.isNeitherLessOrGreaterThan(result)) {
        return result;
      }
    }
    return CompareResult.neitherLessOrGreaterThan;
  };
}
__name(tieBreakComparators, "tieBreakComparators");
var numberComparator = /* @__PURE__ */ __name((a, b) => a - b, "numberComparator");
var booleanComparator = /* @__PURE__ */ __name((a, b) => numberComparator(a ? 1 : 0, b ? 1 : 0), "booleanComparator");
function reverseOrder(comparator) {
  return (a, b) => -comparator(a, b);
}
__name(reverseOrder, "reverseOrder");
function compareUndefinedSmallest(comparator) {
  return (a, b) => {
    if (a === void 0) {
      return b === void 0 ? CompareResult.neitherLessOrGreaterThan : CompareResult.lessThan;
    } else if (b === void 0) {
      return CompareResult.greaterThan;
    }
    return comparator(a, b);
  };
}
__name(compareUndefinedSmallest, "compareUndefinedSmallest");
var ArrayQueue = class {
  static {
    __name(this, "ArrayQueue");
  }
  /**
   * Constructs a queue that is backed by the given array. Runtime is O(1).
  */
  constructor(items) {
    this.firstIdx = 0;
    this.items = items;
    this.lastIdx = this.items.length - 1;
  }
  get length() {
    return this.lastIdx - this.firstIdx + 1;
  }
  /**
   * Consumes elements from the beginning of the queue as long as the predicate returns true.
   * If no elements were consumed, `null` is returned. Has a runtime of O(result.length).
  */
  takeWhile(predicate) {
    let startIdx = this.firstIdx;
    while (startIdx < this.items.length && predicate(this.items[startIdx])) {
      startIdx++;
    }
    const result = startIdx === this.firstIdx ? null : this.items.slice(this.firstIdx, startIdx);
    this.firstIdx = startIdx;
    return result;
  }
  /**
   * Consumes elements from the end of the queue as long as the predicate returns true.
   * If no elements were consumed, `null` is returned.
   * The result has the same order as the underlying array!
  */
  takeFromEndWhile(predicate) {
    let endIdx = this.lastIdx;
    while (endIdx >= 0 && predicate(this.items[endIdx])) {
      endIdx--;
    }
    const result = endIdx === this.lastIdx ? null : this.items.slice(endIdx + 1, this.lastIdx + 1);
    this.lastIdx = endIdx;
    return result;
  }
  peek() {
    if (this.length === 0) {
      return void 0;
    }
    return this.items[this.firstIdx];
  }
  peekLast() {
    if (this.length === 0) {
      return void 0;
    }
    return this.items[this.lastIdx];
  }
  dequeue() {
    const result = this.items[this.firstIdx];
    this.firstIdx++;
    return result;
  }
  removeLast() {
    const result = this.items[this.lastIdx];
    this.lastIdx--;
    return result;
  }
  takeCount(count2) {
    const result = this.items.slice(this.firstIdx, this.firstIdx + count2);
    this.firstIdx += count2;
    return result;
  }
};
var CallbackIterable = class _CallbackIterable {
  static {
    __name(this, "CallbackIterable");
  }
  static {
    this.empty = new _CallbackIterable((_callback) => {
    });
  }
  constructor(iterate) {
    this.iterate = iterate;
  }
  forEach(handler) {
    this.iterate((item) => {
      handler(item);
      return true;
    });
  }
  toArray() {
    const result = [];
    this.iterate((item) => {
      result.push(item);
      return true;
    });
    return result;
  }
  filter(predicate) {
    return new _CallbackIterable((cb) => this.iterate((item) => predicate(item) ? cb(item) : true));
  }
  map(mapFn) {
    return new _CallbackIterable((cb) => this.iterate((item) => cb(mapFn(item))));
  }
  some(predicate) {
    let result = false;
    this.iterate((item) => {
      result = predicate(item);
      return !result;
    });
    return result;
  }
  findFirst(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
        return false;
      }
      return true;
    });
    return result;
  }
  findLast(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
      }
      return true;
    });
    return result;
  }
  findLastMaxBy(comparator) {
    let result;
    let first2 = true;
    this.iterate((item) => {
      if (first2 || CompareResult.isGreaterThan(comparator(item, result))) {
        first2 = false;
        result = item;
      }
      return true;
    });
    return result;
  }
};
var Permutation = class _Permutation {
  static {
    __name(this, "Permutation");
  }
  constructor(_indexMap) {
    this._indexMap = _indexMap;
  }
  /**
   * Returns a permutation that sorts the given array according to the given compare function.
   */
  static createSortPermutation(arr, compareFn) {
    const sortIndices = Array.from(arr.keys()).sort((index1, index2) => compareFn(arr[index1], arr[index2]));
    return new _Permutation(sortIndices);
  }
  /**
   * Returns a new array with the elements of the given array re-arranged according to this permutation.
   */
  apply(arr) {
    return arr.map((_, index2) => arr[this._indexMap[index2]]);
  }
  /**
   * Returns a new permutation that undoes the re-arrangement of this permutation.
  */
  inverse() {
    const inverseIndexMap = this._indexMap.slice();
    for (let i = 0; i < this._indexMap.length; i++) {
      inverseIndexMap[this._indexMap[i]] = i;
    }
    return new _Permutation(inverseIndexMap);
  }
};
async function findAsync(array, predicate) {
  const results = await Promise.all(array.map(async (element, index2) => ({ element, ok: await predicate(element, index2) })));
  return results.find((r) => r.ok)?.element;
}
__name(findAsync, "findAsync");
function sum(array) {
  return array.reduce((acc, value) => acc + value, 0);
}
__name(sum, "sum");
function sumBy(array, selector) {
  return array.reduce((acc, value) => acc + selector(value), 0);
}
__name(sumBy, "sumBy");

// ../Output/Target/Microsoft/VSCode/vs/base/common/collections.js
var _a;
function groupBy2(data, groupFn) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const element of data) {
    const key = groupFn(element);
    let target = result[key];
    if (!target) {
      target = result[key] = [];
    }
    target.push(element);
  }
  return result;
}
__name(groupBy2, "groupBy");
function groupByMap(data, groupFn) {
  const result = /* @__PURE__ */ new Map();
  for (const element of data) {
    const key = groupFn(element);
    let target = result.get(key);
    if (!target) {
      target = [];
      result.set(key, target);
    }
    target.push(element);
  }
  return result;
}
__name(groupByMap, "groupByMap");
function diffSets(before, after) {
  const removed = [];
  const added = [];
  for (const element of before) {
    if (!after.has(element)) {
      removed.push(element);
    }
  }
  for (const element of after) {
    if (!before.has(element)) {
      added.push(element);
    }
  }
  return { removed, added };
}
__name(diffSets, "diffSets");
function diffMaps(before, after) {
  const removed = [];
  const added = [];
  for (const [index2, value] of before) {
    if (!after.has(index2)) {
      removed.push(value);
    }
  }
  for (const [index2, value] of after) {
    if (!before.has(index2)) {
      added.push(value);
    }
  }
  return { removed, added };
}
__name(diffMaps, "diffMaps");
function intersection(setA, setB) {
  const result = /* @__PURE__ */ new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      result.add(elem);
    }
  }
  return result;
}
__name(intersection, "intersection");
var SetWithKey = class {
  static {
    __name(this, "SetWithKey");
  }
  static {
    _a = Symbol.toStringTag;
  }
  constructor(values, toKey) {
    this.toKey = toKey;
    this._map = /* @__PURE__ */ new Map();
    this[_a] = "SetWithKey";
    for (const value of values) {
      this.add(value);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    const key = this.toKey(value);
    this._map.set(key, value);
    return this;
  }
  delete(value) {
    return this._map.delete(this.toKey(value));
  }
  has(value) {
    return this._map.has(this.toKey(value));
  }
  *entries() {
    for (const entry of this._map.values()) {
      yield [entry, entry];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }
  clear() {
    this._map.clear();
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((entry) => callbackfn.call(thisArg, entry, entry, this));
  }
  [Symbol.iterator]() {
    return this.values();
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/functional.js
function createSingleCallFunction(fn, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function() {
    if (didCall) {
      return result;
    }
    didCall = true;
    if (fnDidRunCallback) {
      try {
        result = fn.apply(_this, arguments);
      } finally {
        fnDidRunCallback();
      }
    } else {
      result = fn.apply(_this, arguments);
    }
    return result;
  };
}
__name(createSingleCallFunction, "createSingleCallFunction");

// ../Output/Target/Microsoft/VSCode/vs/base/common/map.js
var _a2, _b, _c;
function getOrSet(map, key, value) {
  let result = map.get(key);
  if (result === void 0) {
    result = value;
    map.set(key, result);
  }
  return result;
}
__name(getOrSet, "getOrSet");
function mapToString(map) {
  const entries = [];
  map.forEach((value, key) => {
    entries.push(`${key} => ${value}`);
  });
  return `Map(${map.size}) {${entries.join(", ")}}`;
}
__name(mapToString, "mapToString");
function setToString(set) {
  const entries = [];
  set.forEach((value) => {
    entries.push(value);
  });
  return `Set(${set.size}) {${entries.join(", ")}}`;
}
__name(setToString, "setToString");
var ResourceMapEntry = class {
  static {
    __name(this, "ResourceMapEntry");
  }
  constructor(uri, value) {
    this.uri = uri;
    this.value = value;
  }
};
function isEntries(arg) {
  return Array.isArray(arg);
}
__name(isEntries, "isEntries");
var ResourceMap = class _ResourceMap {
  static {
    __name(this, "ResourceMap");
  }
  static {
    this.defaultToKey = (resource) => resource.toString();
  }
  constructor(arg, toKey) {
    this[_a2] = "ResourceMap";
    if (arg instanceof _ResourceMap) {
      this.map = new Map(arg.map);
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
    } else if (isEntries(arg)) {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
      for (const [resource, value] of arg) {
        this.set(resource, value);
      }
    } else {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = arg ?? _ResourceMap.defaultToKey;
    }
  }
  set(resource, value) {
    this.map.set(this.toKey(resource), new ResourceMapEntry(resource, value));
    return this;
  }
  get(resource) {
    return this.map.get(this.toKey(resource))?.value;
  }
  has(resource) {
    return this.map.has(this.toKey(resource));
  }
  get size() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  delete(resource) {
    return this.map.delete(this.toKey(resource));
  }
  forEach(clb, thisArg) {
    if (typeof thisArg !== "undefined") {
      clb = clb.bind(thisArg);
    }
    for (const [_, entry] of this.map) {
      clb(entry.value, entry.uri, this);
    }
  }
  *values() {
    for (const entry of this.map.values()) {
      yield entry.value;
    }
  }
  *keys() {
    for (const entry of this.map.values()) {
      yield entry.uri;
    }
  }
  *entries() {
    for (const entry of this.map.values()) {
      yield [entry.uri, entry.value];
    }
  }
  *[(_a2 = Symbol.toStringTag, Symbol.iterator)]() {
    for (const [, entry] of this.map) {
      yield [entry.uri, entry.value];
    }
  }
};
var ResourceSet = class {
  static {
    __name(this, "ResourceSet");
  }
  constructor(entriesOrKey, toKey) {
    this[_b] = "ResourceSet";
    if (!entriesOrKey || typeof entriesOrKey === "function") {
      this._map = new ResourceMap(entriesOrKey);
    } else {
      this._map = new ResourceMap(toKey);
      entriesOrKey.forEach(this.add, this);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    this._map.set(value, value);
    return this;
  }
  clear() {
    this._map.clear();
  }
  delete(value) {
    return this._map.delete(value);
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((_value, key) => callbackfn.call(thisArg, key, key, this));
  }
  has(value) {
    return this._map.has(value);
  }
  entries() {
    return this._map.entries();
  }
  keys() {
    return this._map.keys();
  }
  values() {
    return this._map.keys();
  }
  [(_b = Symbol.toStringTag, Symbol.iterator)]() {
    return this.keys();
  }
};
var Touch;
(function(Touch2) {
  Touch2[Touch2["None"] = 0] = "None";
  Touch2[Touch2["AsOld"] = 1] = "AsOld";
  Touch2[Touch2["AsNew"] = 2] = "AsNew";
})(Touch || (Touch = {}));
var LinkedMap = class {
  static {
    __name(this, "LinkedMap");
  }
  constructor() {
    this[_c] = "LinkedMap";
    this._map = /* @__PURE__ */ new Map();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state = 0;
  }
  clear() {
    this._map.clear();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state++;
  }
  isEmpty() {
    return !this._head && !this._tail;
  }
  get size() {
    return this._size;
  }
  get first() {
    return this._head?.value;
  }
  get last() {
    return this._tail?.value;
  }
  has(key) {
    return this._map.has(key);
  }
  get(key, touch = 0) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    if (touch !== 0) {
      this.touch(item, touch);
    }
    return item.value;
  }
  set(key, value, touch = 0) {
    let item = this._map.get(key);
    if (item) {
      item.value = value;
      if (touch !== 0) {
        this.touch(item, touch);
      }
    } else {
      item = { key, value, next: void 0, previous: void 0 };
      switch (touch) {
        case 0:
          this.addItemLast(item);
          break;
        case 1:
          this.addItemFirst(item);
          break;
        case 2:
          this.addItemLast(item);
          break;
        default:
          this.addItemLast(item);
          break;
      }
      this._map.set(key, item);
      this._size++;
    }
    return this;
  }
  delete(key) {
    return !!this.remove(key);
  }
  remove(key) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    this._map.delete(key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  shift() {
    if (!this._head && !this._tail) {
      return void 0;
    }
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    const item = this._head;
    this._map.delete(item.key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  forEach(callbackfn, thisArg) {
    const state = this._state;
    let current = this._head;
    while (current) {
      if (thisArg) {
        callbackfn.bind(thisArg)(current.value, current.key, this);
      } else {
        callbackfn(current.value, current.key, this);
      }
      if (this._state !== state) {
        throw new Error(`LinkedMap got modified during iteration.`);
      }
      current = current.next;
    }
  }
  keys() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.key, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  values() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.value, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  entries() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: [current.key, current.value], done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  [(_c = Symbol.toStringTag, Symbol.iterator)]() {
    return this.entries();
  }
  trimOld(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._head;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.next;
      currentSize--;
    }
    this._head = current;
    this._size = currentSize;
    if (current) {
      current.previous = void 0;
    }
    this._state++;
  }
  trimNew(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._tail;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.previous;
      currentSize--;
    }
    this._tail = current;
    this._size = currentSize;
    if (current) {
      current.next = void 0;
    }
    this._state++;
  }
  addItemFirst(item) {
    if (!this._head && !this._tail) {
      this._tail = item;
    } else if (!this._head) {
      throw new Error("Invalid list");
    } else {
      item.next = this._head;
      this._head.previous = item;
    }
    this._head = item;
    this._state++;
  }
  addItemLast(item) {
    if (!this._head && !this._tail) {
      this._head = item;
    } else if (!this._tail) {
      throw new Error("Invalid list");
    } else {
      item.previous = this._tail;
      this._tail.next = item;
    }
    this._tail = item;
    this._state++;
  }
  removeItem(item) {
    if (item === this._head && item === this._tail) {
      this._head = void 0;
      this._tail = void 0;
    } else if (item === this._head) {
      if (!item.next) {
        throw new Error("Invalid list");
      }
      item.next.previous = void 0;
      this._head = item.next;
    } else if (item === this._tail) {
      if (!item.previous) {
        throw new Error("Invalid list");
      }
      item.previous.next = void 0;
      this._tail = item.previous;
    } else {
      const next = item.next;
      const previous = item.previous;
      if (!next || !previous) {
        throw new Error("Invalid list");
      }
      next.previous = previous;
      previous.next = next;
    }
    item.next = void 0;
    item.previous = void 0;
    this._state++;
  }
  touch(item, touch) {
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    if (touch !== 1 && touch !== 2) {
      return;
    }
    if (touch === 1) {
      if (item === this._head) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._tail) {
        previous.next = void 0;
        this._tail = previous;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.previous = void 0;
      item.next = this._head;
      this._head.previous = item;
      this._head = item;
      this._state++;
    } else if (touch === 2) {
      if (item === this._tail) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._head) {
        next.previous = void 0;
        this._head = next;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.next = void 0;
      item.previous = this._tail;
      this._tail.next = item;
      this._tail = item;
      this._state++;
    }
  }
  toJSON() {
    const data = [];
    this.forEach((value, key) => {
      data.push([key, value]);
    });
    return data;
  }
  fromJSON(data) {
    this.clear();
    for (const [key, value] of data) {
      this.set(key, value);
    }
  }
};
var Cache = class extends LinkedMap {
  static {
    __name(this, "Cache");
  }
  constructor(limit, ratio = 1) {
    super();
    this._limit = limit;
    this._ratio = Math.min(Math.max(0, ratio), 1);
  }
  get limit() {
    return this._limit;
  }
  set limit(limit) {
    this._limit = limit;
    this.checkTrim();
  }
  get ratio() {
    return this._ratio;
  }
  set ratio(ratio) {
    this._ratio = Math.min(Math.max(0, ratio), 1);
    this.checkTrim();
  }
  get(key, touch = 2) {
    return super.get(key, touch);
  }
  peek(key) {
    return super.get(
      key,
      0
      /* Touch.None */
    );
  }
  set(key, value) {
    super.set(
      key,
      value,
      2
      /* Touch.AsNew */
    );
    return this;
  }
  checkTrim() {
    if (this.size > this._limit) {
      this.trim(Math.round(this._limit * this._ratio));
    }
  }
};
var LRUCache = class extends Cache {
  static {
    __name(this, "LRUCache");
  }
  constructor(limit, ratio = 1) {
    super(limit, ratio);
  }
  trim(newSize) {
    this.trimOld(newSize);
  }
  set(key, value) {
    super.set(key, value);
    this.checkTrim();
    return this;
  }
};
var MRUCache = class extends Cache {
  static {
    __name(this, "MRUCache");
  }
  constructor(limit, ratio = 1) {
    super(limit, ratio);
  }
  trim(newSize) {
    this.trimNew(newSize);
  }
  set(key, value) {
    if (this._limit <= this.size && !this.has(key)) {
      this.trim(Math.round(this._limit * this._ratio) - 1);
    }
    super.set(key, value);
    return this;
  }
};
var CounterSet = class {
  static {
    __name(this, "CounterSet");
  }
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(value) {
    this.map.set(value, (this.map.get(value) || 0) + 1);
    return this;
  }
  delete(value) {
    let counter = this.map.get(value) || 0;
    if (counter === 0) {
      return false;
    }
    counter--;
    if (counter === 0) {
      this.map.delete(value);
    } else {
      this.map.set(value, counter);
    }
    return true;
  }
  has(value) {
    return this.map.has(value);
  }
};
var BidirectionalMap = class {
  static {
    __name(this, "BidirectionalMap");
  }
  constructor(entries) {
    this._m1 = /* @__PURE__ */ new Map();
    this._m2 = /* @__PURE__ */ new Map();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }
  clear() {
    this._m1.clear();
    this._m2.clear();
  }
  set(key, value) {
    this._m1.set(key, value);
    this._m2.set(value, key);
  }
  get(key) {
    return this._m1.get(key);
  }
  getKey(value) {
    return this._m2.get(value);
  }
  delete(key) {
    const value = this._m1.get(key);
    if (value === void 0) {
      return false;
    }
    this._m1.delete(key);
    this._m2.delete(value);
    return true;
  }
  forEach(callbackfn, thisArg) {
    this._m1.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }
  keys() {
    return this._m1.keys();
  }
  values() {
    return this._m1.values();
  }
};
var SetMap = class {
  static {
    __name(this, "SetMap");
  }
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(key, value) {
    let values = this.map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      this.map.set(key, values);
    }
    values.add(value);
  }
  delete(key, value) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.map.delete(key);
    }
  }
  forEach(key, fn) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.forEach(fn);
  }
  get(key) {
    const values = this.map.get(key);
    if (!values) {
      return /* @__PURE__ */ new Set();
    }
    return values;
  }
};
function mapsStrictEqualIgnoreOrder(a, b) {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, value] of a) {
    if (!b.has(key) || b.get(key) !== value) {
      return false;
    }
  }
  for (const [key] of b) {
    if (!a.has(key)) {
      return false;
    }
  }
  return true;
}
__name(mapsStrictEqualIgnoreOrder, "mapsStrictEqualIgnoreOrder");
var NKeyMap = class {
  static {
    __name(this, "NKeyMap");
  }
  constructor() {
    this._data = /* @__PURE__ */ new Map();
  }
  /**
   * Sets a value on the map. Note that unlike a standard `Map`, the first argument is the value.
   * This is because the spread operator is used for the keys and must be last..
   * @param value The value to set.
   * @param keys The keys for the value.
   */
  set(value, ...keys) {
    let currentMap = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      let nextMap = currentMap.get(keys[i]);
      if (nextMap === void 0) {
        nextMap = /* @__PURE__ */ new Map();
        currentMap.set(keys[i], nextMap);
      }
      currentMap = nextMap;
    }
    currentMap.set(keys[keys.length - 1], value);
  }
  get(...keys) {
    let currentMap = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      const nextMap = currentMap.get(keys[i]);
      if (nextMap === void 0) {
        return void 0;
      }
      currentMap = nextMap;
    }
    return currentMap.get(keys[keys.length - 1]);
  }
  clear() {
    this._data.clear();
  }
  *values() {
    function* iterate(map) {
      for (const value of map.values()) {
        if (value instanceof Map) {
          yield* iterate(value);
        } else {
          yield value;
        }
      }
    }
    __name(iterate, "iterate");
    yield* iterate(this._data);
  }
  /**
   * Get a textual representation of the map for debugging purposes.
   */
  toString() {
    const printMap = /* @__PURE__ */ __name((map, depth) => {
      let result = "";
      for (const [key, value] of map) {
        result += `${"  ".repeat(depth)}${key}: `;
        if (value instanceof Map) {
          result += "\n" + printMap(value, depth + 1);
        } else {
          result += `${value}
`;
        }
      }
      return result;
    }, "printMap");
    return printMap(this._data, 0);
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/assert.js
function ok(value, message) {
  if (!value) {
    throw new Error(message ? `Assertion failed (${message})` : "Assertion Failed");
  }
}
__name(ok, "ok");
function assertNever(value, message = "Unreachable") {
  throw new Error(message);
}
__name(assertNever, "assertNever");
function softAssertNever(value) {
}
__name(softAssertNever, "softAssertNever");
function assert(condition, messageOrError = "unexpected state") {
  if (!condition) {
    const errorToThrow = typeof messageOrError === "string" ? new BugIndicatingError(`Assertion Failed: ${messageOrError}`) : messageOrError;
    throw errorToThrow;
  }
}
__name(assert, "assert");
function softAssert(condition, message = "Soft Assertion Failed") {
  if (!condition) {
    onUnexpectedError(new BugIndicatingError(message));
  }
}
__name(softAssert, "softAssert");
function assertFn(condition) {
  if (!condition()) {
    debugger;
    condition();
    onUnexpectedError(new BugIndicatingError("Assertion Failed"));
  }
}
__name(assertFn, "assertFn");
function checkAdjacentItems(items, predicate) {
  let i = 0;
  while (i < items.length - 1) {
    const a = items[i];
    const b = items[i + 1];
    if (!predicate(a, b)) {
      return false;
    }
    i++;
  }
  return true;
}
__name(checkAdjacentItems, "checkAdjacentItems");

// ../Output/Target/Microsoft/VSCode/vs/base/common/types.js
function isString(str) {
  return typeof str === "string";
}
__name(isString, "isString");
function isStringArray(value) {
  return isArrayOf(value, isString);
}
__name(isStringArray, "isStringArray");
function isArrayOf(value, check) {
  return Array.isArray(value) && value.every(check);
}
__name(isArrayOf, "isArrayOf");
function isObject(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj) && !(obj instanceof RegExp) && !(obj instanceof Date);
}
__name(isObject, "isObject");
function isTypedArray(obj) {
  const TypedArray = Object.getPrototypeOf(Uint8Array);
  return typeof obj === "object" && obj instanceof TypedArray;
}
__name(isTypedArray, "isTypedArray");
function isNumber(obj) {
  return typeof obj === "number" && !isNaN(obj);
}
__name(isNumber, "isNumber");
function isIterable(obj) {
  return !!obj && typeof obj[Symbol.iterator] === "function";
}
__name(isIterable, "isIterable");
function isAsyncIterable(obj) {
  return !!obj && typeof obj[Symbol.asyncIterator] === "function";
}
__name(isAsyncIterable, "isAsyncIterable");
function isBoolean(obj) {
  return obj === true || obj === false;
}
__name(isBoolean, "isBoolean");
function isUndefined(obj) {
  return typeof obj === "undefined";
}
__name(isUndefined, "isUndefined");
function isDefined(arg) {
  return !isUndefinedOrNull(arg);
}
__name(isDefined, "isDefined");
function isUndefinedOrNull(obj) {
  return isUndefined(obj) || obj === null;
}
__name(isUndefinedOrNull, "isUndefinedOrNull");
function assertType(condition, type) {
  if (!condition) {
    throw new Error(type ? `Unexpected type, expected '${type}'` : "Unexpected type");
  }
}
__name(assertType, "assertType");
function assertReturnsDefined(arg) {
  assert(arg !== null && arg !== void 0, "Argument is `undefined` or `null`.");
  return arg;
}
__name(assertReturnsDefined, "assertReturnsDefined");
function assertDefined(value, error) {
  if (value === null || value === void 0) {
    const errorToThrow = typeof error === "string" ? new Error(error) : error;
    throw errorToThrow;
  }
}
__name(assertDefined, "assertDefined");
function assertReturnsAllDefined(...args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (isUndefinedOrNull(arg)) {
      throw new Error(`Assertion Failed: argument at index ${i} is undefined or null`);
    }
    result.push(arg);
  }
  return result;
}
__name(assertReturnsAllDefined, "assertReturnsAllDefined");
var isOneOf = /* @__PURE__ */ __name((value, validValues) => {
  return validValues.includes(value);
}, "isOneOf");
function typeCheck(_thing) {
}
__name(typeCheck, "typeCheck");
var hasOwnProperty = Object.prototype.hasOwnProperty;
function isEmptyObject(obj) {
  if (!isObject(obj)) {
    return false;
  }
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}
__name(isEmptyObject, "isEmptyObject");
function isFunction(obj) {
  return typeof obj === "function";
}
__name(isFunction, "isFunction");
function areFunctions(...objects) {
  return objects.length > 0 && objects.every(isFunction);
}
__name(areFunctions, "areFunctions");
function validateConstraints(args, constraints) {
  const len = Math.min(args.length, constraints.length);
  for (let i = 0; i < len; i++) {
    validateConstraint(args[i], constraints[i]);
  }
}
__name(validateConstraints, "validateConstraints");
function validateConstraint(arg, constraint) {
  if (isString(constraint)) {
    if (typeof arg !== constraint) {
      throw new Error(`argument does not match constraint: typeof ${constraint}`);
    }
  } else if (isFunction(constraint)) {
    try {
      if (arg instanceof constraint) {
        return;
      }
    } catch {
    }
    if (!isUndefinedOrNull(arg) && arg.constructor === constraint) {
      return;
    }
    if (constraint.length === 1 && constraint.call(void 0, arg) === true) {
      return;
    }
    throw new Error(`argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true`);
  }
}
__name(validateConstraint, "validateConstraint");
function upcast(x) {
  return x;
}
__name(upcast, "upcast");
function hasKey(x, key) {
  for (const k in key) {
    if (!(k in x)) {
      return false;
    }
  }
  return true;
}
__name(hasKey, "hasKey");

// ../Output/Target/Microsoft/VSCode/vs/base/common/iterator.js
var Iterable;
(function(Iterable2) {
  function is(thing) {
    return !!thing && typeof thing === "object" && typeof thing[Symbol.iterator] === "function";
  }
  __name(is, "is");
  Iterable2.is = is;
  const _empty2 = Object.freeze([]);
  function empty() {
    return _empty2;
  }
  __name(empty, "empty");
  Iterable2.empty = empty;
  function* single(element) {
    yield element;
  }
  __name(single, "single");
  Iterable2.single = single;
  function wrap(iterableOrElement) {
    if (is(iterableOrElement)) {
      return iterableOrElement;
    } else {
      return single(iterableOrElement);
    }
  }
  __name(wrap, "wrap");
  Iterable2.wrap = wrap;
  function from(iterable) {
    return iterable ?? _empty2;
  }
  __name(from, "from");
  Iterable2.from = from;
  function* reverse(array) {
    for (let i = array.length - 1; i >= 0; i--) {
      yield array[i];
    }
  }
  __name(reverse, "reverse");
  Iterable2.reverse = reverse;
  function isEmpty(iterable) {
    return !iterable || iterable[Symbol.iterator]().next().done === true;
  }
  __name(isEmpty, "isEmpty");
  Iterable2.isEmpty = isEmpty;
  function first2(iterable) {
    return iterable[Symbol.iterator]().next().value;
  }
  __name(first2, "first");
  Iterable2.first = first2;
  function some(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (predicate(element, i++)) {
        return true;
      }
    }
    return false;
  }
  __name(some, "some");
  Iterable2.some = some;
  function every(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (!predicate(element, i++)) {
        return false;
      }
    }
    return true;
  }
  __name(every, "every");
  Iterable2.every = every;
  function find(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        return element;
      }
    }
    return void 0;
  }
  __name(find, "find");
  Iterable2.find = find;
  function* filter(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        yield element;
      }
    }
  }
  __name(filter, "filter");
  Iterable2.filter = filter;
  function* map(iterable, fn) {
    let index2 = 0;
    for (const element of iterable) {
      yield fn(element, index2++);
    }
  }
  __name(map, "map");
  Iterable2.map = map;
  function* flatMap(iterable, fn) {
    let index2 = 0;
    for (const element of iterable) {
      yield* fn(element, index2++);
    }
  }
  __name(flatMap, "flatMap");
  Iterable2.flatMap = flatMap;
  function* concat(...iterables) {
    for (const item of iterables) {
      if (isIterable(item)) {
        yield* item;
      } else {
        yield item;
      }
    }
  }
  __name(concat, "concat");
  Iterable2.concat = concat;
  function reduce(iterable, reducer, initialValue) {
    let value = initialValue;
    for (const element of iterable) {
      value = reducer(value, element);
    }
    return value;
  }
  __name(reduce, "reduce");
  Iterable2.reduce = reduce;
  function length(iterable) {
    let count2 = 0;
    for (const _ of iterable) {
      count2++;
    }
    return count2;
  }
  __name(length, "length");
  Iterable2.length = length;
  function* slice(arr, from2, to = arr.length) {
    if (from2 < -arr.length) {
      from2 = 0;
    }
    if (from2 < 0) {
      from2 += arr.length;
    }
    if (to < 0) {
      to += arr.length;
    } else if (to > arr.length) {
      to = arr.length;
    }
    for (; from2 < to; from2++) {
      yield arr[from2];
    }
  }
  __name(slice, "slice");
  Iterable2.slice = slice;
  function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
    const consumed = [];
    if (atMost === 0) {
      return [consumed, iterable];
    }
    const iterator = iterable[Symbol.iterator]();
    for (let i = 0; i < atMost; i++) {
      const next = iterator.next();
      if (next.done) {
        return [consumed, Iterable2.empty()];
      }
      consumed.push(next.value);
    }
    return [consumed, { [Symbol.iterator]() {
      return iterator;
    } }];
  }
  __name(consume, "consume");
  Iterable2.consume = consume;
  async function asyncToArray(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  __name(asyncToArray, "asyncToArray");
  Iterable2.asyncToArray = asyncToArray;
  async function asyncToArrayFlat(iterable) {
    let result = [];
    for await (const item of iterable) {
      result = result.concat(item);
    }
    return result;
  }
  __name(asyncToArrayFlat, "asyncToArrayFlat");
  Iterable2.asyncToArrayFlat = asyncToArrayFlat;
})(Iterable || (Iterable = {}));

// ../Output/Target/Microsoft/VSCode/vs/base/common/lifecycle.js
var TRACK_DISPOSABLES = false;
var disposableTracker = null;
var GCBasedDisposableTracker = class {
  static {
    __name(this, "GCBasedDisposableTracker");
  }
  constructor() {
    this._registry = new FinalizationRegistry((heldValue) => {
      console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
    });
  }
  trackDisposable(disposable) {
    const stack = new Error("CREATED via:").stack;
    this._registry.register(disposable, stack, disposable);
  }
  setParent(child, parent) {
    if (parent) {
      this._registry.unregister(child);
    } else {
      this.trackDisposable(child);
    }
  }
  markAsDisposed(disposable) {
    this._registry.unregister(disposable);
  }
  markAsSingleton(disposable) {
    this._registry.unregister(disposable);
  }
};
var DisposableTracker = class _DisposableTracker {
  static {
    __name(this, "DisposableTracker");
  }
  constructor() {
    this.livingDisposables = /* @__PURE__ */ new Map();
  }
  static {
    this.idx = 0;
  }
  getDisposableData(d) {
    let val = this.livingDisposables.get(d);
    if (!val) {
      val = { parent: null, source: null, isSingleton: false, value: d, idx: _DisposableTracker.idx++ };
      this.livingDisposables.set(d, val);
    }
    return val;
  }
  trackDisposable(d) {
    const data = this.getDisposableData(d);
    if (!data.source) {
      data.source = new Error().stack;
    }
  }
  setParent(child, parent) {
    const data = this.getDisposableData(child);
    data.parent = parent;
  }
  markAsDisposed(x) {
    this.livingDisposables.delete(x);
  }
  markAsSingleton(disposable) {
    this.getDisposableData(disposable).isSingleton = true;
  }
  getRootParent(data, cache) {
    const cacheValue = cache.get(data);
    if (cacheValue) {
      return cacheValue;
    }
    const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
    cache.set(data, result);
    return result;
  }
  getTrackedDisposables() {
    const rootParentCache = /* @__PURE__ */ new Map();
    const leaking = [...this.livingDisposables.entries()].filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton).flatMap(([k]) => k);
    return leaking;
  }
  computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
    let uncoveredLeakingObjs;
    if (preComputedLeaks) {
      uncoveredLeakingObjs = preComputedLeaks;
    } else {
      const rootParentCache = /* @__PURE__ */ new Map();
      const leakingObjects = [...this.livingDisposables.values()].filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
      if (leakingObjects.length === 0) {
        return;
      }
      const leakingObjsSet = new Set(leakingObjects.map((o) => o.value));
      uncoveredLeakingObjs = leakingObjects.filter((l) => {
        return !(l.parent && leakingObjsSet.has(l.parent));
      });
      if (uncoveredLeakingObjs.length === 0) {
        throw new Error("There are cyclic diposable chains!");
      }
    }
    if (!uncoveredLeakingObjs) {
      return void 0;
    }
    function getStackTracePath(leaking) {
      function removePrefix(array, linesToRemove) {
        while (array.length > 0 && linesToRemove.some((regexp) => typeof regexp === "string" ? regexp === array[0] : array[0].match(regexp))) {
          array.shift();
        }
      }
      __name(removePrefix, "removePrefix");
      const lines = leaking.source.split("\n").map((p) => p.trim().replace("at ", "")).filter((l) => l !== "");
      removePrefix(lines, ["Error", /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
      return lines.reverse();
    }
    __name(getStackTracePath, "getStackTracePath");
    const stackTraceStarts = new SetMap();
    for (const leaking of uncoveredLeakingObjs) {
      const stackTracePath = getStackTracePath(leaking);
      for (let i2 = 0; i2 <= stackTracePath.length; i2++) {
        stackTraceStarts.add(stackTracePath.slice(0, i2).join("\n"), leaking);
      }
    }
    uncoveredLeakingObjs.sort(compareBy((l) => l.idx, numberComparator));
    let message = "";
    let i = 0;
    for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
      i++;
      const stackTracePath = getStackTracePath(leaking);
      const stackTraceFormattedLines = [];
      for (let i2 = 0; i2 < stackTracePath.length; i2++) {
        let line = stackTracePath[i2];
        const starts = stackTraceStarts.get(stackTracePath.slice(0, i2 + 1).join("\n"));
        line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
        const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i2).join("\n"));
        const continuations = groupBy2([...prevStarts].map((d) => getStackTracePath(d)[i2]), (v) => v);
        delete continuations[stackTracePath[i2]];
        for (const [cont, set] of Object.entries(continuations)) {
          if (set) {
            stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
          }
        }
        stackTraceFormattedLines.unshift(line);
      }
      message += `


==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================
${stackTraceFormattedLines.join("\n")}
============================================================

`;
    }
    if (uncoveredLeakingObjs.length > maxReported) {
      message += `


... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables

`;
    }
    return { leaks: uncoveredLeakingObjs, details: message };
  }
};
function setDisposableTracker(tracker) {
  disposableTracker = tracker;
}
__name(setDisposableTracker, "setDisposableTracker");
if (TRACK_DISPOSABLES) {
  const __is_disposable_tracked__ = "__is_disposable_tracked__";
  setDisposableTracker(new class {
    trackDisposable(x) {
      const stack = new Error("Potentially leaked disposable").stack;
      setTimeout(() => {
        if (!x[__is_disposable_tracked__]) {
          console.log(stack);
        }
      }, 3e3);
    }
    setParent(child, parent) {
      if (child && child !== Disposable.None) {
        try {
          child[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsDisposed(disposable) {
      if (disposable && disposable !== Disposable.None) {
        try {
          disposable[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsSingleton(disposable) {
    }
  }());
}
function trackDisposable(x) {
  disposableTracker?.trackDisposable(x);
  return x;
}
__name(trackDisposable, "trackDisposable");
function markAsDisposed(disposable) {
  disposableTracker?.markAsDisposed(disposable);
}
__name(markAsDisposed, "markAsDisposed");
function setParentOfDisposable(child, parent) {
  disposableTracker?.setParent(child, parent);
}
__name(setParentOfDisposable, "setParentOfDisposable");
function setParentOfDisposables(children, parent) {
  if (!disposableTracker) {
    return;
  }
  for (const child of children) {
    disposableTracker.setParent(child, parent);
  }
}
__name(setParentOfDisposables, "setParentOfDisposables");
function markAsSingleton(singleton) {
  disposableTracker?.markAsSingleton(singleton);
  return singleton;
}
__name(markAsSingleton, "markAsSingleton");
function isDisposable(thing) {
  return typeof thing === "object" && thing !== null && typeof thing.dispose === "function" && thing.dispose.length === 0;
}
__name(isDisposable, "isDisposable");
function dispose(arg) {
  if (Iterable.is(arg)) {
    const errors = [];
    for (const d of arg) {
      if (d) {
        try {
          d.dispose();
        } catch (e) {
          errors.push(e);
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Encountered errors while disposing of store");
    }
    return Array.isArray(arg) ? [] : arg;
  } else if (arg) {
    arg.dispose();
    return arg;
  }
}
__name(dispose, "dispose");
function disposeIfDisposable(disposables) {
  for (const d of disposables) {
    if (isDisposable(d)) {
      d.dispose();
    }
  }
  return [];
}
__name(disposeIfDisposable, "disposeIfDisposable");
function combinedDisposable(...disposables) {
  const parent = toDisposable(() => dispose(disposables));
  setParentOfDisposables(disposables, parent);
  return parent;
}
__name(combinedDisposable, "combinedDisposable");
var FunctionDisposable = class {
  static {
    __name(this, "FunctionDisposable");
  }
  constructor(fn) {
    this._isDisposed = false;
    this._fn = fn;
    trackDisposable(this);
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    if (!this._fn) {
      throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
    }
    this._isDisposed = true;
    markAsDisposed(this);
    this._fn();
  }
};
function toDisposable(fn) {
  return new FunctionDisposable(fn);
}
__name(toDisposable, "toDisposable");
var DisposableStore = class _DisposableStore {
  static {
    __name(this, "DisposableStore");
  }
  static {
    this.DISABLE_DISPOSED_WARNING = false;
  }
  constructor() {
    this._toDispose = /* @__PURE__ */ new Set();
    this._isDisposed = false;
    trackDisposable(this);
  }
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   *
   * Any future disposables added to this object will be disposed of on `add`.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    markAsDisposed(this);
    this._isDisposed = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this._isDisposed;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o) {
    if (!o || o === Disposable.None) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    setParentOfDisposable(o, this);
    if (this._isDisposed) {
      if (!_DisposableStore.DISABLE_DISPOSED_WARNING) {
        console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack);
      }
    } else {
      this._toDispose.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
   * disposable even when the disposable is not part in the store.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    if (this._toDispose.delete(o)) {
      setParentOfDisposable(o, null);
    }
  }
  assertNotDisposed() {
    if (this._isDisposed) {
      onUnexpectedError(new BugIndicatingError("Object disposed"));
    }
  }
};
var Disposable = class {
  static {
    __name(this, "Disposable");
  }
  static {
    this.None = Object.freeze({ dispose() {
    } });
  }
  constructor() {
    this._store = new DisposableStore();
    trackDisposable(this);
    setParentOfDisposable(this._store, this);
  }
  dispose() {
    markAsDisposed(this);
    this._store.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
};
var MutableDisposable = class {
  static {
    __name(this, "MutableDisposable");
  }
  constructor() {
    this._isDisposed = false;
    trackDisposable(this);
  }
  /**
   * Get the currently held disposable value, or `undefined` if this MutableDisposable has been disposed
   */
  get value() {
    return this._isDisposed ? void 0 : this._value;
  }
  /**
   * Set a new disposable value.
   *
   * Behaviour:
   * - If the MutableDisposable has been disposed, the setter is a no-op.
   * - If the new value is strictly equal to the current value, the setter is a no-op.
   * - Otherwise the previous value (if any) is disposed and the new value is stored.
   *
   * Related helpers:
   * - clear() resets the value to `undefined` (and disposes the previous value).
   * - clearAndLeak() returns the old value without disposing it and removes its parent.
   */
  set value(value) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    if (value) {
      setParentOfDisposable(value, this);
    }
    this._value = value;
  }
  /**
   * Resets the stored value and disposed of the previously stored value.
   */
  clear() {
    this.value = void 0;
  }
  dispose() {
    this._isDisposed = true;
    markAsDisposed(this);
    this._value?.dispose();
    this._value = void 0;
  }
  /**
   * Clears the value, but does not dispose it.
   * The old value is returned.
  */
  clearAndLeak() {
    const oldValue = this._value;
    this._value = void 0;
    if (oldValue) {
      setParentOfDisposable(oldValue, null);
    }
    return oldValue;
  }
};
var MandatoryMutableDisposable = class {
  static {
    __name(this, "MandatoryMutableDisposable");
  }
  constructor(initialValue) {
    this._disposable = new MutableDisposable();
    this._isDisposed = false;
    this._disposable.value = initialValue;
  }
  get value() {
    return this._disposable.value;
  }
  set value(value) {
    if (this._isDisposed || value === this._disposable.value) {
      return;
    }
    this._disposable.value = value;
  }
  dispose() {
    this._isDisposed = true;
    this._disposable.dispose();
  }
};
var RefCountedDisposable = class {
  static {
    __name(this, "RefCountedDisposable");
  }
  constructor(_disposable) {
    this._disposable = _disposable;
    this._counter = 1;
  }
  acquire() {
    this._counter++;
    return this;
  }
  release() {
    if (--this._counter === 0) {
      this._disposable.dispose();
    }
    return this;
  }
};
var ReferenceCollection = class {
  static {
    __name(this, "ReferenceCollection");
  }
  constructor() {
    this.references = /* @__PURE__ */ new Map();
  }
  acquire(key, ...args) {
    let reference = this.references.get(key);
    if (!reference) {
      reference = { counter: 0, object: this.createReferencedObject(key, ...args) };
      this.references.set(key, reference);
    }
    const { object } = reference;
    const dispose2 = createSingleCallFunction(() => {
      if (--reference.counter === 0) {
        this.destroyReferencedObject(key, reference.object);
        this.references.delete(key);
      }
    });
    reference.counter++;
    return { object, dispose: dispose2 };
  }
};
var AsyncReferenceCollection = class {
  static {
    __name(this, "AsyncReferenceCollection");
  }
  constructor(referenceCollection) {
    this.referenceCollection = referenceCollection;
  }
  async acquire(key, ...args) {
    const ref = this.referenceCollection.acquire(key, ...args);
    try {
      const object = await ref.object;
      return {
        object,
        dispose: /* @__PURE__ */ __name(() => ref.dispose(), "dispose")
      };
    } catch (error) {
      ref.dispose();
      throw error;
    }
  }
};
var ImmortalReference = class {
  static {
    __name(this, "ImmortalReference");
  }
  constructor(object) {
    this.object = object;
  }
  dispose() {
  }
};
function disposeOnReturn(fn) {
  const store = new DisposableStore();
  try {
    fn(store);
  } finally {
    store.dispose();
  }
}
__name(disposeOnReturn, "disposeOnReturn");
var DisposableMap = class {
  static {
    __name(this, "DisposableMap");
  }
  constructor(store = /* @__PURE__ */ new Map()) {
    this._isDisposed = false;
    this._store = store;
    trackDisposable(this);
  }
  /**
   * Disposes of all stored values and mark this object as disposed.
   *
   * Trying to use this object after it has been disposed of is an error.
   */
  dispose() {
    markAsDisposed(this);
    this._isDisposed = true;
    this.clearAndDisposeAll();
  }
  /**
   * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
   */
  clearAndDisposeAll() {
    if (!this._store.size) {
      return;
    }
    try {
      dispose(this._store.values());
    } finally {
      this._store.clear();
    }
  }
  has(key) {
    return this._store.has(key);
  }
  get size() {
    return this._store.size;
  }
  get(key) {
    return this._store.get(key);
  }
  set(key, value, skipDisposeOnOverwrite = false) {
    if (this._isDisposed) {
      console.warn(new Error("Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!").stack);
    }
    if (!skipDisposeOnOverwrite) {
      this._store.get(key)?.dispose();
    }
    this._store.set(key, value);
    setParentOfDisposable(value, this);
  }
  /**
   * Delete the value stored for `key` from this map and also dispose of it.
   */
  deleteAndDispose(key) {
    this._store.get(key)?.dispose();
    this._store.delete(key);
  }
  /**
   * Delete the value stored for `key` from this map but return it. The caller is
   * responsible for disposing of the value.
   */
  deleteAndLeak(key) {
    const value = this._store.get(key);
    if (value) {
      setParentOfDisposable(value, null);
    }
    this._store.delete(key);
    return value;
  }
  keys() {
    return this._store.keys();
  }
  values() {
    return this._store.values();
  }
  [Symbol.iterator]() {
    return this._store[Symbol.iterator]();
  }
};
var DisposableSet = class {
  static {
    __name(this, "DisposableSet");
  }
  constructor(store = /* @__PURE__ */ new Set()) {
    this._isDisposed = false;
    this._store = store;
    trackDisposable(this);
  }
  /**
   * Disposes of all stored values and mark this object as disposed.
   *
   * Trying to use this object after it has been disposed of is an error.
   */
  dispose() {
    markAsDisposed(this);
    this._isDisposed = true;
    this.clearAndDisposeAll();
  }
  /**
   * Disposes of all stored values and clear the set, but DO NOT mark this object as disposed.
   */
  clearAndDisposeAll() {
    if (!this._store.size) {
      return;
    }
    try {
      dispose(this._store.values());
    } finally {
      this._store.clear();
    }
  }
  has(value) {
    return this._store.has(value);
  }
  get size() {
    return this._store.size;
  }
  add(value) {
    if (this._isDisposed) {
      console.warn(new Error("Trying to add a disposable to a DisposableSet that has already been disposed of. The added object will be leaked!").stack);
    }
    this._store.add(value);
    setParentOfDisposable(value, this);
  }
  /**
   * Delete the value from this set and also dispose of it.
   */
  deleteAndDispose(value) {
    if (this._store.delete(value)) {
      value.dispose();
    }
  }
  /**
   * Delete the value from this set but return it. The caller is
   * responsible for disposing of the value.
   */
  deleteAndLeak(value) {
    if (this._store.delete(value)) {
      setParentOfDisposable(value, null);
      return value;
    }
    return void 0;
  }
  values() {
    return this._store.values();
  }
  [Symbol.iterator]() {
    return this._store[Symbol.iterator]();
  }
};
function thenIfNotDisposed(promise, then) {
  let disposed = false;
  promise.then((result) => {
    if (disposed) {
      return;
    }
    then(result);
  });
  return toDisposable(() => {
    disposed = true;
  });
}
__name(thenIfNotDisposed, "thenIfNotDisposed");
function thenRegisterOrDispose(promise, store) {
  return promise.then((disposable) => {
    if (store.isDisposed) {
      disposable.dispose();
    } else {
      store.add(disposable);
    }
    return disposable;
  });
}
__name(thenRegisterOrDispose, "thenRegisterOrDispose");
var DisposableResourceMap = class extends DisposableMap {
  static {
    __name(this, "DisposableResourceMap");
  }
  constructor() {
    super(new ResourceMap());
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/linkedList.js
var Node = class _Node {
  static {
    __name(this, "Node");
  }
  static {
    this.Undefined = new _Node(void 0);
  }
  constructor(element) {
    this.element = element;
    this.next = _Node.Undefined;
    this.prev = _Node.Undefined;
  }
};
var LinkedList = class {
  static {
    __name(this, "LinkedList");
  }
  constructor() {
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === Node.Undefined;
  }
  clear() {
    let node = this._first;
    while (node !== Node.Undefined) {
      const next = node.next;
      node.prev = Node.Undefined;
      node.next = Node.Undefined;
      node = next;
    }
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }
  unshift(element) {
    return this._insert(element, false);
  }
  push(element) {
    return this._insert(element, true);
  }
  _insert(element, atTheEnd) {
    const newNode = new Node(element);
    if (this._first === Node.Undefined) {
      this._first = newNode;
      this._last = newNode;
    } else if (atTheEnd) {
      const oldLast = this._last;
      this._last = newNode;
      newNode.prev = oldLast;
      oldLast.next = newNode;
    } else {
      const oldFirst = this._first;
      this._first = newNode;
      newNode.next = oldFirst;
      oldFirst.prev = newNode;
    }
    this._size += 1;
    let didRemove = false;
    return () => {
      if (!didRemove) {
        didRemove = true;
        this._remove(newNode);
      }
    };
  }
  shift() {
    if (this._first === Node.Undefined) {
      return void 0;
    } else {
      const res = this._first.element;
      this._remove(this._first);
      return res;
    }
  }
  pop() {
    if (this._last === Node.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      this._remove(this._last);
      return res;
    }
  }
  peek() {
    if (this._last === Node.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      return res;
    }
  }
  _remove(node) {
    if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
      const anchor = node.prev;
      anchor.next = node.next;
      node.next.prev = anchor;
    } else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
      this._first = Node.Undefined;
      this._last = Node.Undefined;
    } else if (node.next === Node.Undefined) {
      this._last = this._last.prev;
      this._last.next = Node.Undefined;
    } else if (node.prev === Node.Undefined) {
      this._first = this._first.next;
      this._first.prev = Node.Undefined;
    }
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let node = this._first;
    while (node !== Node.Undefined) {
      yield node.element;
      node = node.next;
    }
  }
};

// ../Output/Target/Microsoft/VSCode/vs/nls.js
function getNLSMessages() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
__name(getNLSMessages, "getNLSMessages");
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}
__name(getNLSLanguage, "getNLSLanguage");
var isPseudo = getNLSLanguage() === "pseudo" || typeof document !== "undefined" && document.location && typeof document.location.hash === "string" && document.location.hash.indexOf("pseudo=true") >= 0;
function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match2, rest) => {
      const index2 = rest[0];
      const arg = args[index2];
      let result2 = match2;
      if (typeof arg === "string") {
        result2 = arg;
      } else if (typeof arg === "number" || typeof arg === "boolean" || arg === void 0 || arg === null) {
        result2 = String(arg);
      }
      return result2;
    });
  }
  if (isPseudo) {
    result = "\uFF3B" + result.replace(/[aouei]/g, "$&$&") + "\uFF3D";
  }
  return result;
}
__name(_format, "_format");
function localize(data, message, ...args) {
  if (typeof data === "number") {
    return _format(lookupMessage(data, message), args);
  }
  return _format(message, args);
}
__name(localize, "localize");
function lookupMessage(index2, fallback) {
  const message = getNLSMessages()?.[index2];
  if (typeof message !== "string") {
    if (typeof fallback === "string") {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index2} !!!`);
  }
  return message;
}
__name(lookupMessage, "lookupMessage");
function localize2(data, originalMessage, ...args) {
  let message;
  if (typeof data === "number") {
    message = lookupMessage(data, originalMessage);
  } else {
    message = originalMessage;
  }
  const value = _format(message, args);
  return {
    value,
    original: originalMessage === message ? value : _format(originalMessage, args)
  };
}
__name(localize2, "localize2");

// ../Output/Target/Microsoft/VSCode/vs/base/common/platform.js
var LANGUAGE_DEFAULT = "en";
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isLinuxSnap = false;
var _isNative = false;
var _isWeb = false;
var _isElectron = false;
var _isIOS = false;
var _isCI = false;
var _isMobile = false;
var _locale = void 0;
var _language = LANGUAGE_DEFAULT;
var _platformLocale = LANGUAGE_DEFAULT;
var _translationsConfigFile = void 0;
var _userAgent = void 0;
var $globalThis = globalThis;
var nodeProcess = void 0;
if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
  nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  nodeProcess = process;
}
var isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
var isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
if (typeof nodeProcess === "object") {
  _isWindows = nodeProcess.platform === "win32";
  _isMacintosh = nodeProcess.platform === "darwin";
  _isLinux = nodeProcess.platform === "linux";
  _isLinuxSnap = _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
  _isElectron = isElectronProcess;
  _isCI = !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || !!nodeProcess.env["GITHUB_WORKSPACE"];
  _locale = LANGUAGE_DEFAULT;
  _language = LANGUAGE_DEFAULT;
  const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale;
      _platformLocale = nlsConfig.osLocale;
      _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
      _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
    } catch (e) {
    }
  }
  _isNative = true;
} else if (typeof navigator === "object" && !isElectronRenderer) {
  _userAgent = navigator.userAgent;
  _isWindows = _userAgent.indexOf("Windows") >= 0;
  _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
  _isIOS = (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  _isLinux = _userAgent.indexOf("Linux") >= 0;
  _isMobile = _userAgent?.indexOf("Mobi") >= 0;
  _isWeb = true;
  _language = getNLSLanguage() || LANGUAGE_DEFAULT;
  _locale = navigator.language.toLowerCase();
  _platformLocale = _locale;
} else {
  console.error("Unable to resolve platform.");
}
var Platform;
(function(Platform2) {
  Platform2[Platform2["Web"] = 0] = "Web";
  Platform2[Platform2["Mac"] = 1] = "Mac";
  Platform2[Platform2["Linux"] = 2] = "Linux";
  Platform2[Platform2["Windows"] = 3] = "Windows";
})(Platform || (Platform = {}));
function PlatformToString(platform3) {
  switch (platform3) {
    case 0:
      return "Web";
    case 1:
      return "Mac";
    case 2:
      return "Linux";
    case 3:
      return "Windows";
  }
}
__name(PlatformToString, "PlatformToString");
var _platform = 0;
if (_isMacintosh) {
  _platform = 1;
} else if (_isWindows) {
  _platform = 3;
} else if (_isLinux) {
  _platform = 2;
}
var isWindows = _isWindows;
var isMacintosh = _isMacintosh;
var isLinux = _isLinux;
var isLinuxSnap = _isLinuxSnap;
var isNative = _isNative;
var isElectron = _isElectron;
var isWeb = _isWeb;
var isWebWorker = _isWeb && typeof $globalThis.importScripts === "function";
var webWorkerOrigin = isWebWorker ? $globalThis.origin : void 0;
var isIOS = _isIOS;
var isMobile = _isMobile;
var isCI = _isCI;
var platform = _platform;
var userAgent = _userAgent;
var language = _language;
var Language;
(function(Language2) {
  function value() {
    return language;
  }
  __name(value, "value");
  Language2.value = value;
  function isDefaultVariant() {
    if (language.length === 2) {
      return language === "en";
    } else if (language.length >= 3) {
      return language[0] === "e" && language[1] === "n" && language[2] === "-";
    } else {
      return false;
    }
  }
  __name(isDefaultVariant, "isDefaultVariant");
  Language2.isDefaultVariant = isDefaultVariant;
  function isDefault() {
    return language === "en";
  }
  __name(isDefault, "isDefault");
  Language2.isDefault = isDefault;
})(Language || (Language = {}));
var locale = _locale;
var platformLocale = _platformLocale;
var translationsConfigFile = _translationsConfigFile;
var setTimeout0IsFaster = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
var setTimeout0 = (() => {
  if (setTimeout0IsFaster) {
    const pending = [];
    $globalThis.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
    };
  }
  return (callback) => setTimeout(callback);
})();
var OperatingSystem;
(function(OperatingSystem2) {
  OperatingSystem2[OperatingSystem2["Windows"] = 1] = "Windows";
  OperatingSystem2[OperatingSystem2["Macintosh"] = 2] = "Macintosh";
  OperatingSystem2[OperatingSystem2["Linux"] = 3] = "Linux";
})(OperatingSystem || (OperatingSystem = {}));
var OS = _isMacintosh || _isIOS ? 2 : _isWindows ? 1 : 3;
var _isLittleEndian = true;
var _isLittleEndianComputed = false;
function isLittleEndian() {
  if (!_isLittleEndianComputed) {
    _isLittleEndianComputed = true;
    const test = new Uint8Array(2);
    test[0] = 1;
    test[1] = 2;
    const view = new Uint16Array(test.buffer);
    _isLittleEndian = view[0] === (2 << 8) + 1;
  }
  return _isLittleEndian;
}
__name(isLittleEndian, "isLittleEndian");
var isChrome = !!(userAgent && userAgent.indexOf("Chrome") >= 0);
var isFirefox = !!(userAgent && userAgent.indexOf("Firefox") >= 0);
var isSafari = !!(!isChrome && (userAgent && userAgent.indexOf("Safari") >= 0));
var isEdge = !!(userAgent && userAgent.indexOf("Edg/") >= 0);
var isAndroid = !!(userAgent && userAgent.indexOf("Android") >= 0);
function isTahoeOrNewer(osVersion) {
  return parseFloat(osVersion) >= 25;
}
__name(isTahoeOrNewer, "isTahoeOrNewer");

// ../Output/Target/Microsoft/VSCode/vs/base/common/process.js
var safeProcess;
var vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
  const sandboxProcess = vscodeGlobal.process;
  safeProcess = {
    get platform() {
      return sandboxProcess.platform;
    },
    get arch() {
      return sandboxProcess.arch;
    },
    get env() {
      return sandboxProcess.env;
    },
    cwd() {
      return sandboxProcess.cwd();
    }
  };
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  safeProcess = {
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get env() {
      return process.env;
    },
    cwd() {
      return process.env["VSCODE_CWD"] || process.cwd();
    }
  };
} else {
  safeProcess = {
    // Supported
    get platform() {
      return isWindows ? "win32" : isMacintosh ? "darwin" : "linux";
    },
    get arch() {
      return void 0;
    },
    // Unsupported
    get env() {
      return {};
    },
    cwd() {
      return "/";
    }
  };
}
var cwd = safeProcess.cwd;
var env = safeProcess.env;
var platform2 = safeProcess.platform;
var arch = safeProcess.arch;

// ../Output/Target/Microsoft/VSCode/vs/base/common/stopwatch.js
var performanceNow = globalThis.performance.now.bind(globalThis.performance);
var StopWatch = class _StopWatch {
  static {
    __name(this, "StopWatch");
  }
  static create(highResolution) {
    return new _StopWatch(highResolution);
  }
  constructor(highResolution) {
    this._now = highResolution === false ? Date.now : performanceNow;
    this._startTime = this._now();
    this._stopTime = -1;
  }
  stop() {
    this._stopTime = this._now();
  }
  reset() {
    this._startTime = this._now();
    this._stopTime = -1;
  }
  elapsed() {
    if (this._stopTime !== -1) {
      return this._stopTime - this._startTime;
    }
    return this._now() - this._startTime;
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/event.js
var _enableDisposeWithListenerWarning = false;
var _enableSnapshotPotentialLeakWarning = false;
var _bufferLeakWarnCountThreshold = 100;
var _bufferLeakWarnTimeThreshold = 6e4;
function _isBufferLeakWarningEnabled() {
  return !!env["VSCODE_DEV"];
}
__name(_isBufferLeakWarningEnabled, "_isBufferLeakWarningEnabled");
var Event;
(function(Event2) {
  Event2.None = () => Disposable.None;
  function _addLeakageTraceLogic(options) {
    if (_enableSnapshotPotentialLeakWarning) {
      const { onDidAddListener: origListenerDidAdd } = options;
      const stack = Stacktrace.create();
      let count2 = 0;
      options.onDidAddListener = () => {
        if (++count2 === 2) {
          console.warn("snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here");
          stack.print();
        }
        origListenerDidAdd?.();
      };
    }
  }
  __name(_addLeakageTraceLogic, "_addLeakageTraceLogic");
  function defer(event, flushOnListenerRemove, disposable) {
    return debounce(event, () => void 0, 0, void 0, flushOnListenerRemove ?? true, void 0, disposable);
  }
  __name(defer, "defer");
  Event2.defer = defer;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      let result = void 0;
      result = event((e) => {
        if (didFire) {
          return;
        } else if (result) {
          result.dispose();
        } else {
          didFire = true;
        }
        return listener.call(thisArgs, e);
      }, null, disposables);
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  __name(once, "once");
  Event2.once = once;
  function onceIf(event, condition) {
    return Event2.once(Event2.filter(event, condition));
  }
  __name(onceIf, "onceIf");
  Event2.onceIf = onceIf;
  function map(event, map2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map2(i)), null, disposables), disposable);
  }
  __name(map, "map");
  Event2.map = map;
  function forEach(event, each, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => {
      each(i);
      listener.call(thisArgs, i);
    }, null, disposables), disposable);
  }
  __name(forEach, "forEach");
  Event2.forEach = forEach;
  function filter(event, filter2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((e) => filter2(e) && listener.call(thisArgs, e), null, disposables), disposable);
  }
  __name(filter, "filter");
  Event2.filter = filter;
  function signal(event) {
    return event;
  }
  __name(signal, "signal");
  Event2.signal = signal;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  __name(any, "any");
  Event2.any = any;
  function reduce(event, merge, initial, disposable) {
    let output = initial;
    return map(event, (e) => {
      output = merge(output, e);
      return output;
    }, disposable);
  }
  __name(reduce, "reduce");
  Event2.reduce = reduce;
  function snapshot(event, disposable) {
    let listener;
    const options = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener?.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(snapshot, "snapshot");
  function addAndReturnDisposable(d, store) {
    if (store instanceof Array) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
  __name(addAndReturnDisposable, "addAndReturnDisposable");
  function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numDebouncedCalls = 0;
    let doFire;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numDebouncedCalls++;
          output = merge(output, cur);
          if (leading && !handle) {
            emitter.fire(output);
            output = void 0;
          }
          doFire = /* @__PURE__ */ __name(() => {
            const _output = output;
            output = void 0;
            handle = void 0;
            if (!leading || numDebouncedCalls > 1) {
              emitter.fire(_output);
            }
            numDebouncedCalls = 0;
          }, "doFire");
          if (typeof delay === "number") {
            if (handle) {
              clearTimeout(handle);
            }
            handle = setTimeout(doFire, delay);
          } else {
            if (handle === void 0) {
              handle = null;
              queueMicrotask(doFire);
            }
          }
        });
      },
      onWillRemoveListener() {
        if (flushOnListenerRemove && numDebouncedCalls > 0) {
          doFire?.();
        }
      },
      onDidRemoveLastListener() {
        doFire = void 0;
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(debounce, "debounce");
  Event2.debounce = debounce;
  function accumulate(event, delay = 0, flushOnListenerRemove, disposable) {
    return Event2.debounce(event, (last, e) => {
      if (!last) {
        return [e];
      }
      last.push(e);
      return last;
    }, delay, void 0, flushOnListenerRemove ?? true, void 0, disposable);
  }
  __name(accumulate, "accumulate");
  Event2.accumulate = accumulate;
  function throttle(event, merge, delay = 100, leading = true, trailing = true, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numThrottledCalls = 0;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numThrottledCalls++;
          output = merge(output, cur);
          if (handle === void 0) {
            if (leading) {
              emitter.fire(output);
              output = void 0;
              numThrottledCalls = 0;
            }
            if (typeof delay === "number") {
              handle = setTimeout(() => {
                if (trailing && numThrottledCalls > 0) {
                  emitter.fire(output);
                }
                output = void 0;
                handle = void 0;
                numThrottledCalls = 0;
              }, delay);
            } else {
              handle = 0;
              queueMicrotask(() => {
                if (trailing && numThrottledCalls > 0) {
                  emitter.fire(output);
                }
                output = void 0;
                handle = void 0;
                numThrottledCalls = 0;
              });
            }
          }
        });
      },
      onDidRemoveLastListener() {
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(throttle, "throttle");
  Event2.throttle = throttle;
  function latch(event, equals3 = (a, b) => a === b, disposable) {
    let firstCall = true;
    let cache;
    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals3(value, cache);
      firstCall = false;
      cache = value;
      return shouldEmit;
    }, disposable);
  }
  __name(latch, "latch");
  Event2.latch = latch;
  function split(event, isT, disposable) {
    return [
      Event2.filter(event, isT, disposable),
      Event2.filter(event, (e) => !isT(e), disposable)
    ];
  }
  __name(split, "split");
  Event2.split = split;
  function buffer(event, debugName, flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let bufferLeakWarningData;
    if (_isBufferLeakWarningEnabled()) {
      bufferLeakWarningData = {
        stack: Stacktrace.create(),
        timerId: setTimeout(() => {
          if (buffer2 && buffer2.length > 0 && bufferLeakWarningData && !bufferLeakWarningData.warned) {
            bufferLeakWarningData.warned = true;
            console.warn(`[Event.buffer][${debugName}] potential LEAK detected: ${buffer2.length} events buffered for ${_bufferLeakWarnTimeThreshold / 1e3}s without being consumed. Buffered here:`);
            bufferLeakWarningData.stack.print();
          }
        }, _bufferLeakWarnTimeThreshold),
        warned: false
      };
      if (disposable) {
        disposable.add(toDisposable(() => clearTimeout(bufferLeakWarningData.timerId)));
      }
    }
    const clearLeakWarningTimer = /* @__PURE__ */ __name(() => {
      if (bufferLeakWarningData) {
        clearTimeout(bufferLeakWarningData.timerId);
      }
    }, "clearLeakWarningTimer");
    let listener = event((e) => {
      if (buffer2) {
        buffer2.push(e);
        if (_isBufferLeakWarningEnabled() && bufferLeakWarningData && !bufferLeakWarningData.warned && buffer2.length >= _bufferLeakWarnCountThreshold) {
          bufferLeakWarningData.warned = true;
          console.warn(`[Event.buffer][${debugName}] potential LEAK detected: ${buffer2.length} events buffered without being consumed. Buffered here:`);
          bufferLeakWarningData.stack.print();
        }
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = /* @__PURE__ */ __name(() => {
      buffer2?.forEach((e) => emitter.fire(e));
      buffer2 = null;
      clearLeakWarningTimer();
    }, "flush");
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          if (flushAfterTimeout) {
            setTimeout(flush);
          } else {
            flush();
          }
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
        clearLeakWarningTimer();
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  __name(buffer, "buffer");
  Event2.buffer = buffer;
  function chain(event, sythensize) {
    const fn = /* @__PURE__ */ __name((listener, thisArgs, disposables) => {
      const cs = sythensize(new ChainableSynthesis());
      return event(function(value) {
        const result = cs.evaluate(value);
        if (result !== HaltChainable) {
          listener.call(thisArgs, result);
        }
      }, void 0, disposables);
    }, "fn");
    return fn;
  }
  __name(chain, "chain");
  Event2.chain = chain;
  const HaltChainable = /* @__PURE__ */ Symbol("HaltChainable");
  class ChainableSynthesis {
    static {
      __name(this, "ChainableSynthesis");
    }
    constructor() {
      this.steps = [];
    }
    map(fn) {
      this.steps.push(fn);
      return this;
    }
    forEach(fn) {
      this.steps.push((v) => {
        fn(v);
        return v;
      });
      return this;
    }
    filter(fn) {
      this.steps.push((v) => fn(v) ? v : HaltChainable);
      return this;
    }
    reduce(merge, initial) {
      let last = initial;
      this.steps.push((v) => {
        last = merge(last, v);
        return last;
      });
      return this;
    }
    latch(equals3 = (a, b) => a === b) {
      let firstCall = true;
      let cache;
      this.steps.push((value) => {
        const shouldEmit = firstCall || !equals3(value, cache);
        firstCall = false;
        cache = value;
        return shouldEmit ? value : HaltChainable;
      });
      return this;
    }
    evaluate(value) {
      for (const step of this.steps) {
        value = step(value);
        if (value === HaltChainable) {
          break;
        }
      }
      return value;
    }
  }
  function fromNodeEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = /* @__PURE__ */ __name((...args) => result.fire(map2(...args)), "fn");
    const onFirstListenerAdd = /* @__PURE__ */ __name(() => emitter.on(eventName, fn), "onFirstListenerAdd");
    const onLastListenerRemove = /* @__PURE__ */ __name(() => emitter.removeListener(eventName, fn), "onLastListenerRemove");
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  __name(fromNodeEventEmitter, "fromNodeEventEmitter");
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
  function fromDOMEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = /* @__PURE__ */ __name((...args) => result.fire(map2(...args)), "fn");
    const onFirstListenerAdd = /* @__PURE__ */ __name(() => emitter.addEventListener(eventName, fn), "onFirstListenerAdd");
    const onLastListenerRemove = /* @__PURE__ */ __name(() => emitter.removeEventListener(eventName, fn), "onLastListenerRemove");
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  __name(fromDOMEventEmitter, "fromDOMEventEmitter");
  Event2.fromDOMEventEmitter = fromDOMEventEmitter;
  function toPromise(event, disposables) {
    let cancelRef;
    let listener;
    const promise = new Promise((resolve2) => {
      listener = once(event)(resolve2);
      addToDisposables(listener, disposables);
      cancelRef = /* @__PURE__ */ __name(() => {
        disposeAndRemove(listener, disposables);
      }, "cancelRef");
    });
    promise.cancel = cancelRef;
    if (disposables) {
      promise.finally(() => disposeAndRemove(listener, disposables));
    }
    return promise;
  }
  __name(toPromise, "toPromise");
  Event2.toPromise = toPromise;
  function forward(from, to) {
    return from((e) => to.fire(e));
  }
  __name(forward, "forward");
  Event2.forward = forward;
  function runAndSubscribe(event, handler, initial) {
    handler(initial);
    return event((e) => handler(e));
  }
  __name(runAndSubscribe, "runAndSubscribe");
  Event2.runAndSubscribe = runAndSubscribe;
  class EmitterObserver {
    static {
      __name(this, "EmitterObserver");
    }
    constructor(_observable, store) {
      this._observable = _observable;
      this._counter = 0;
      this._hasChanged = false;
      const options = {
        onWillAddFirstListener: /* @__PURE__ */ __name(() => {
          _observable.addObserver(this);
          this._observable.reportChanges();
        }, "onWillAddFirstListener"),
        onDidRemoveLastListener: /* @__PURE__ */ __name(() => {
          _observable.removeObserver(this);
        }, "onDidRemoveLastListener")
      };
      if (!store) {
        _addLeakageTraceLogic(options);
      }
      this.emitter = new Emitter(options);
      if (store) {
        store.add(this.emitter);
      }
    }
    beginUpdate(_observable) {
      this._counter++;
    }
    handlePossibleChange(_observable) {
    }
    handleChange(_observable, _change) {
      this._hasChanged = true;
    }
    endUpdate(_observable) {
      this._counter--;
      if (this._counter === 0) {
        this._observable.reportChanges();
        if (this._hasChanged) {
          this._hasChanged = false;
          this.emitter.fire(this._observable.get());
        }
      }
    }
  }
  function fromObservable(obs, store) {
    const observer = new EmitterObserver(obs, store);
    return observer.emitter.event;
  }
  __name(fromObservable, "fromObservable");
  Event2.fromObservable = fromObservable;
  function fromObservableLight(observable) {
    return (listener, thisArgs, disposables) => {
      let count2 = 0;
      let didChange = false;
      const observer = {
        beginUpdate() {
          count2++;
        },
        endUpdate() {
          count2--;
          if (count2 === 0) {
            observable.reportChanges();
            if (didChange) {
              didChange = false;
              listener.call(thisArgs);
            }
          }
        },
        handlePossibleChange() {
        },
        handleChange() {
          didChange = true;
        }
      };
      observable.addObserver(observer);
      observable.reportChanges();
      const disposable = {
        dispose() {
          observable.removeObserver(observer);
        }
      };
      addToDisposables(disposable, disposables);
      return disposable;
    };
  }
  __name(fromObservableLight, "fromObservableLight");
  Event2.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
var EventProfiling = class _EventProfiling {
  static {
    __name(this, "EventProfiling");
  }
  static {
    this.all = /* @__PURE__ */ new Set();
  }
  static {
    this._idPool = 0;
  }
  constructor(name) {
    this.listenerCount = 0;
    this.invocationCount = 0;
    this.elapsedOverall = 0;
    this.durations = [];
    this.name = `${name}_${_EventProfiling._idPool++}`;
    _EventProfiling.all.add(this);
  }
  start(listenerCount) {
    this._stopWatch = new StopWatch();
    this.listenerCount = listenerCount;
  }
  stop() {
    if (this._stopWatch) {
      const elapsed = this._stopWatch.elapsed();
      this.durations.push(elapsed);
      this.elapsedOverall += elapsed;
      this.invocationCount += 1;
      this._stopWatch = void 0;
    }
  }
};
var _globalLeakWarningThreshold = -1;
function setGlobalLeakWarningThreshold(n) {
  const oldValue = _globalLeakWarningThreshold;
  _globalLeakWarningThreshold = n;
  return {
    dispose() {
      _globalLeakWarningThreshold = oldValue;
    }
  };
}
__name(setGlobalLeakWarningThreshold, "setGlobalLeakWarningThreshold");
var LeakageMonitor = class _LeakageMonitor {
  static {
    __name(this, "LeakageMonitor");
  }
  static {
    this._idPool = 1;
  }
  constructor(_errorHandler, threshold, name = (_LeakageMonitor._idPool++).toString(16).padStart(3, "0")) {
    this._errorHandler = _errorHandler;
    this.threshold = threshold;
    this.name = name;
    this._warnCountdown = 0;
  }
  dispose() {
    this._stacks?.clear();
  }
  check(stack, listenerCount) {
    const threshold = this.threshold;
    if (threshold <= 0 || listenerCount < threshold) {
      return void 0;
    }
    if (!this._stacks) {
      this._stacks = /* @__PURE__ */ new Map();
    }
    const count2 = this._stacks.get(stack.value) || 0;
    this._stacks.set(stack.value, count2 + 1);
    this._warnCountdown -= 1;
    if (this._warnCountdown <= 0) {
      this._warnCountdown = threshold * 0.5;
      const [topStack, topCount] = this.getMostFrequentStack();
      const emitterName = /^[0-9a-f]+$/i.test(this.name) ? void 0 : this.name;
      const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
      console.warn(message);
      console.warn(topStack);
      const kind = topCount / listenerCount > 0.3 ? "dominated" : "popular";
      const error = new ListenerLeakError(kind, message, topStack, listenerCount, emitterName);
      this._errorHandler(error);
    }
    return () => {
      const count3 = this._stacks.get(stack.value) || 0;
      this._stacks.set(stack.value, count3 - 1);
    };
  }
  getMostFrequentStack() {
    if (!this._stacks) {
      return void 0;
    }
    let topStack;
    let topCount = 0;
    for (const [stack, count2] of this._stacks) {
      if (!topStack || topCount < count2) {
        topStack = [stack, count2];
        topCount = count2;
      }
    }
    return topStack;
  }
};
var Stacktrace = class _Stacktrace {
  static {
    __name(this, "Stacktrace");
  }
  static create() {
    const err = new Error();
    return new _Stacktrace(err.stack ?? "");
  }
  constructor(value) {
    this.value = value;
  }
  print() {
    console.warn(this.value.split("\n").slice(2).join("\n"));
  }
};
var ListenerLeakError = class _ListenerLeakError extends Error {
  static {
    __name(this, "ListenerLeakError");
  }
  constructor(kind, details, stack, listenerCount, emitterName) {
    super(emitterName ? `[${emitterName}] potential listener LEAK detected, ${kind}` : `potential listener LEAK detected, ${kind}`);
    this.name = "ListenerLeakError";
    this.kind = kind;
    this.listenerCount = listenerCount;
    this.details = details;
    this.stack = stack;
  }
  static is(err) {
    return err instanceof _ListenerLeakError || err instanceof Error && typeof err.kind === "string" && typeof err.listenerCount === "number";
  }
};
var ListenerRefusalError = class extends ListenerLeakError {
  static {
    __name(this, "ListenerRefusalError");
  }
  constructor(kind, details, stack, listenerCount, emitterName) {
    super(kind, details, stack, listenerCount, emitterName);
    this.name = "ListenerRefusalError";
  }
};
var id = 0;
var UniqueContainer = class {
  static {
    __name(this, "UniqueContainer");
  }
  constructor(value) {
    this.value = value;
    this.id = id++;
  }
};
var compactionThreshold = 2;
var forEachListener = /* @__PURE__ */ __name((listeners, fn) => {
  if (listeners instanceof UniqueContainer) {
    fn(listeners);
  } else {
    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];
      if (l) {
        fn(l);
      }
    }
  }
}, "forEachListener");
var Emitter = class {
  static {
    __name(this, "Emitter");
  }
  constructor(options) {
    this._size = 0;
    this._options = options;
    this._leakageMon = _globalLeakWarningThreshold > 0 || this._options?.leakWarningThreshold ? new LeakageMonitor(options?.onListenerError ?? onUnexpectedError, this._options?.leakWarningThreshold ?? _globalLeakWarningThreshold, this._options?.leakWarningName) : void 0;
    this._perfMon = this._options?._profName ? new EventProfiling(this._options._profName) : void 0;
    this._deliveryQueue = this._options?.deliveryQueue;
  }
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      if (this._deliveryQueue?.current === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        if (_enableDisposeWithListenerWarning) {
          const listeners = this._listeners;
          queueMicrotask(() => {
            forEachListener(listeners, (l) => l.stack?.print());
          });
        }
        this._listeners = void 0;
        this._size = 0;
      }
      this._options?.onDidRemoveLastListener?.();
      this._leakageMon?.dispose();
    }
  }
  /**
   * For the public to allow to subscribe
   * to events from this Emitter
   */
  get event() {
    this._event ??= (callback, thisArgs, disposables) => {
      if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
        const message = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
        console.warn(message);
        const tuple = this._leakageMon.getMostFrequentStack() ?? ["UNKNOWN stack", -1];
        const kind = tuple[1] / this._size > 0.3 ? "dominated" : "popular";
        const error = new ListenerRefusalError(kind, `${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0], this._size, this._options?.leakWarningName);
        const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
        errorHandler2(error);
        return Disposable.None;
      }
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      let removeMonitor;
      let stack;
      if (this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2)) {
        contained.stack = Stacktrace.create();
        removeMonitor = this._leakageMon.check(contained.stack, this._size + 1);
      }
      if (_enableDisposeWithListenerWarning) {
        contained.stack = stack ?? Stacktrace.create();
      }
      if (!this._listeners) {
        this._options?.onWillAddFirstListener?.(this);
        this._listeners = contained;
        this._options?.onDidAddFirstListener?.(this);
      } else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ??= new EventDeliveryQueuePrivate();
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._options?.onDidAddListener?.(this);
      this._size++;
      const result = toDisposable(() => {
        removeMonitor?.();
        this._removeListener(contained);
      });
      addToDisposables(result, disposables);
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    this._options?.onWillRemoveListener?.(this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      this._options?.onDidRemoveLastListener?.(this);
      this._size = 0;
      return;
    }
    const listeners = this._listeners;
    const index2 = listeners.indexOf(listener);
    if (index2 === -1) {
      console.log("disposed?", this._disposed);
      console.log("size?", this._size);
      console.log("arr?", JSON.stringify(this._listeners));
      throw new Error("Attempted to dispose unknown listener");
    }
    this._size--;
    listeners[index2] = void 0;
    const adjustDeliveryQueue = this._deliveryQueue.current === this;
    if (this._size * compactionThreshold <= listeners.length) {
      let n = 0;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i]) {
          listeners[n++] = listeners[i];
        } else if (adjustDeliveryQueue && n < this._deliveryQueue.end) {
          this._deliveryQueue.end--;
          if (n < this._deliveryQueue.i) {
            this._deliveryQueue.i--;
          }
        }
      }
      listeners.length = n;
    }
  }
  _deliver(listener, value) {
    if (!listener) {
      return;
    }
    const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
    if (!errorHandler2) {
      listener.value(value);
      return;
    }
    try {
      listener.value(value);
    } catch (e) {
      errorHandler2(e);
    }
  }
  /** Delivers items in the queue. Assumes the queue is ready to go. */
  _deliverQueue(dq) {
    const listeners = dq.current._listeners;
    while (dq.i < dq.end) {
      this._deliver(listeners[dq.i++], dq.value);
    }
    dq.reset();
  }
  /**
   * To be kept private to fire an event to
   * subscribers
   */
  fire(event) {
    if (this._deliveryQueue?.current) {
      this._deliverQueue(this._deliveryQueue);
      this._perfMon?.stop();
    }
    this._perfMon?.start(this._size);
    if (!this._listeners) {
    } else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
    this._perfMon?.stop();
  }
  hasListeners() {
    return this._size > 0;
  }
};
var createEventDeliveryQueue = /* @__PURE__ */ __name(() => new EventDeliveryQueuePrivate(), "createEventDeliveryQueue");
var EventDeliveryQueuePrivate = class {
  static {
    __name(this, "EventDeliveryQueuePrivate");
  }
  constructor() {
    this.i = -1;
    this.end = 0;
  }
  enqueue(emitter, value, end) {
    this.i = 0;
    this.end = end;
    this.current = emitter;
    this.value = value;
  }
  reset() {
    this.i = this.end;
    this.current = void 0;
    this.value = void 0;
  }
};
var AsyncEmitter = class extends Emitter {
  static {
    __name(this, "AsyncEmitter");
  }
  async fireAsync(data, token, promiseJoin) {
    if (!this._listeners) {
      return;
    }
    if (!this._asyncDeliveryQueue) {
      this._asyncDeliveryQueue = new LinkedList();
    }
    forEachListener(this._listeners, (listener) => this._asyncDeliveryQueue.push([listener.value, data]));
    while (this._asyncDeliveryQueue.size > 0 && !token.isCancellationRequested) {
      const [listener, data2] = this._asyncDeliveryQueue.shift();
      const thenables = [];
      const event = {
        ...data2,
        token,
        waitUntil: /* @__PURE__ */ __name((p) => {
          if (Object.isFrozen(thenables)) {
            throw new Error("waitUntil can NOT be called asynchronous");
          }
          if (promiseJoin) {
            p = promiseJoin(p, listener);
          }
          thenables.push(p);
        }, "waitUntil")
      };
      try {
        listener(event);
      } catch (e) {
        onUnexpectedError(e);
        continue;
      }
      Object.freeze(thenables);
      await Promise.allSettled(thenables).then((values) => {
        for (const value of values) {
          if (value.status === "rejected") {
            onUnexpectedError(value.reason);
          }
        }
      });
    }
  }
};
var PauseableEmitter = class extends Emitter {
  static {
    __name(this, "PauseableEmitter");
  }
  get isPaused() {
    return this._isPaused !== 0;
  }
  constructor(options) {
    super(options);
    this._isPaused = 0;
    this._eventQueue = new LinkedList();
    this._mergeFn = options?.merge;
  }
  pause() {
    this._isPaused++;
  }
  resume() {
    if (this._isPaused !== 0 && --this._isPaused === 0) {
      if (this._mergeFn) {
        if (this._eventQueue.size > 0) {
          const events = Array.from(this._eventQueue);
          this._eventQueue.clear();
          super.fire(this._mergeFn(events));
        }
      } else {
        while (!this._isPaused && this._eventQueue.size !== 0) {
          super.fire(this._eventQueue.shift());
        }
      }
    }
  }
  fire(event) {
    if (this._size) {
      if (this._isPaused !== 0) {
        this._eventQueue.push(event);
      } else {
        super.fire(event);
      }
    }
  }
};
var DebounceEmitter = class extends PauseableEmitter {
  static {
    __name(this, "DebounceEmitter");
  }
  constructor(options) {
    super(options);
    this._delay = options.delay ?? 100;
  }
  fire(event) {
    if (!this._handle) {
      this.pause();
      this._handle = setTimeout(() => {
        this._handle = void 0;
        this.resume();
      }, this._delay);
    }
    super.fire(event);
  }
};
var MicrotaskEmitter = class extends Emitter {
  static {
    __name(this, "MicrotaskEmitter");
  }
  constructor(options) {
    super(options);
    this._queuedEvents = [];
    this._mergeFn = options?.merge;
  }
  fire(event) {
    if (!this.hasListeners()) {
      return;
    }
    this._queuedEvents.push(event);
    if (this._queuedEvents.length === 1) {
      queueMicrotask(() => {
        if (this._mergeFn) {
          super.fire(this._mergeFn(this._queuedEvents));
        } else {
          this._queuedEvents.forEach((e) => super.fire(e));
        }
        this._queuedEvents = [];
      });
    }
  }
};
var EventMultiplexer = class {
  static {
    __name(this, "EventMultiplexer");
  }
  constructor() {
    this.hasListeners = false;
    this.events = [];
    this.emitter = new Emitter({
      onWillAddFirstListener: /* @__PURE__ */ __name(() => this.onFirstListenerAdd(), "onWillAddFirstListener"),
      onDidRemoveLastListener: /* @__PURE__ */ __name(() => this.onLastListenerRemove(), "onDidRemoveLastListener")
    });
  }
  get event() {
    return this.emitter.event;
  }
  add(event) {
    const e = { event, listener: null };
    this.events.push(e);
    if (this.hasListeners) {
      this.hook(e);
    }
    const dispose2 = /* @__PURE__ */ __name(() => {
      if (this.hasListeners) {
        this.unhook(e);
      }
      const idx = this.events.indexOf(e);
      this.events.splice(idx, 1);
    }, "dispose");
    return toDisposable(createSingleCallFunction(dispose2));
  }
  onFirstListenerAdd() {
    this.hasListeners = true;
    this.events.forEach((e) => this.hook(e));
  }
  onLastListenerRemove() {
    this.hasListeners = false;
    this.events.forEach((e) => this.unhook(e));
  }
  hook(e) {
    e.listener = e.event((r) => this.emitter.fire(r));
  }
  unhook(e) {
    e.listener?.dispose();
    e.listener = null;
  }
  dispose() {
    this.emitter.dispose();
    for (const e of this.events) {
      e.listener?.dispose();
    }
    this.events = [];
  }
};
var DynamicListEventMultiplexer = class {
  static {
    __name(this, "DynamicListEventMultiplexer");
  }
  constructor(items, onAddItem, onRemoveItem, getEvent) {
    this._store = new DisposableStore();
    const multiplexer = this._store.add(new EventMultiplexer());
    const itemListeners = this._store.add(new DisposableMap());
    function addItem(instance) {
      itemListeners.set(instance, multiplexer.add(getEvent(instance)));
    }
    __name(addItem, "addItem");
    for (const instance of items) {
      addItem(instance);
    }
    this._store.add(onAddItem((instance) => {
      addItem(instance);
    }));
    this._store.add(onRemoveItem((instance) => {
      itemListeners.deleteAndDispose(instance);
    }));
    this.event = multiplexer.event;
  }
  dispose() {
    this._store.dispose();
  }
};
var EventBufferer = class {
  static {
    __name(this, "EventBufferer");
  }
  constructor() {
    this.data = [];
  }
  wrapEvent(event, reduce, initial) {
    return (listener, thisArgs, disposables) => {
      return event((i) => {
        const data = this.data[this.data.length - 1];
        if (!reduce) {
          if (data) {
            data.buffers.push(() => listener.call(thisArgs, i));
          } else {
            listener.call(thisArgs, i);
          }
          return;
        }
        const reduceData = data;
        if (!reduceData) {
          listener.call(thisArgs, reduce(initial, i));
          return;
        }
        reduceData.items ??= [];
        reduceData.items.push(i);
        if (reduceData.buffers.length === 0) {
          data.buffers.push(() => {
            reduceData.reducedResult ??= initial ? reduceData.items.reduce(reduce, initial) : reduceData.items.reduce(reduce);
            listener.call(thisArgs, reduceData.reducedResult);
          });
        }
      }, void 0, disposables);
    };
  }
  bufferEvents(fn) {
    const data = { buffers: new Array() };
    this.data.push(data);
    const r = fn();
    this.data.pop();
    data.buffers.forEach((flush) => flush());
    return r;
  }
};
var Relay = class {
  static {
    __name(this, "Relay");
  }
  constructor() {
    this.listening = false;
    this.inputEvent = Event.None;
    this.inputEventListener = Disposable.None;
    this.emitter = new Emitter({
      onDidAddFirstListener: /* @__PURE__ */ __name(() => {
        this.listening = true;
        this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
      }, "onDidAddFirstListener"),
      onDidRemoveLastListener: /* @__PURE__ */ __name(() => {
        this.listening = false;
        this.inputEventListener.dispose();
      }, "onDidRemoveLastListener")
    });
    this.event = this.emitter.event;
  }
  set input(event) {
    this.inputEvent = event;
    if (this.listening) {
      this.inputEventListener.dispose();
      this.inputEventListener = event(this.emitter.fire, this.emitter);
    }
  }
  dispose() {
    this.inputEventListener.dispose();
    this.emitter.dispose();
  }
};
var ValueWithChangeEvent = class {
  static {
    __name(this, "ValueWithChangeEvent");
  }
  static const(value) {
    return new ConstValueWithChangeEvent(value);
  }
  constructor(_value) {
    this._value = _value;
    this._onDidChange = new Emitter();
    this.onDidChange = this._onDidChange.event;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    if (value !== this._value) {
      this._value = value;
      this._onDidChange.fire(void 0);
    }
  }
};
var ConstValueWithChangeEvent = class {
  static {
    __name(this, "ConstValueWithChangeEvent");
  }
  constructor(value) {
    this.value = value;
    this.onDidChange = Event.None;
  }
};
function trackSetChanges(getData, onDidChangeData, handleItem) {
  const map = new DisposableMap();
  let oldData = new Set(getData());
  for (const d of oldData) {
    map.set(d, handleItem(d));
  }
  const store = new DisposableStore();
  store.add(onDidChangeData(() => {
    const newData = getData();
    const diff = diffSets(oldData, newData);
    for (const r of diff.removed) {
      map.deleteAndDispose(r);
    }
    for (const a of diff.added) {
      map.set(a, handleItem(a));
    }
    oldData = new Set(newData);
  }));
  store.add(map);
  return store;
}
__name(trackSetChanges, "trackSetChanges");
function addToDisposables(result, disposables) {
  if (disposables instanceof DisposableStore) {
    disposables.add(result);
  } else if (Array.isArray(disposables)) {
    disposables.push(result);
  }
}
__name(addToDisposables, "addToDisposables");
function disposeAndRemove(result, disposables) {
  if (disposables instanceof DisposableStore) {
    disposables.delete(result);
  } else if (Array.isArray(disposables)) {
    const index2 = disposables.indexOf(result);
    if (index2 !== -1) {
      disposables.splice(index2, 1);
    }
  }
  result.dispose();
}
__name(disposeAndRemove, "disposeAndRemove");

// ../Output/Target/Microsoft/VSCode/vs/base/common/cancellation.js
var shortcutEvent = Object.freeze(function(callback, context) {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
var CancellationToken;
(function(CancellationToken2) {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  __name(isCancellationToken, "isCancellationToken");
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var MutableToken = class {
  static {
    __name(this, "MutableToken");
  }
  constructor() {
    this._isCancelled = false;
    this._emitter = null;
  }
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
};
var CancellationTokenSource = class {
  static {
    __name(this, "CancellationTokenSource");
  }
  constructor(parent) {
    this._token = void 0;
    this._parentListener = void 0;
    this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
  }
  get token() {
    if (!this._token) {
      this._token = new MutableToken();
    }
    return this._token;
  }
  cancel() {
    if (!this._token) {
      this._token = CancellationToken.Cancelled;
    } else if (this._token instanceof MutableToken) {
      this._token.cancel();
    }
  }
  dispose(cancel = false) {
    if (cancel) {
      this.cancel();
    }
    this._parentListener?.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
};
function cancelOnDispose(store) {
  const source = new CancellationTokenSource();
  store.add({ dispose() {
    source.cancel();
  } });
  return source.token;
}
__name(cancelOnDispose, "cancelOnDispose");
var CancellationTokenPool = class {
  static {
    __name(this, "CancellationTokenPool");
  }
  constructor() {
    this._source = new CancellationTokenSource();
    this._listeners = new DisposableStore();
    this._total = 0;
    this._cancelled = 0;
    this._isDone = false;
  }
  get token() {
    return this._source.token;
  }
  /**
   * Add a token to the pool. If the token is already cancelled it is counted
   * immediately. Tokens added after the pool token has been cancelled are ignored.
   */
  add(token) {
    if (this._isDone) {
      return;
    }
    this._total++;
    if (token.isCancellationRequested) {
      this._cancelled++;
      this._check();
      return;
    }
    const d = token.onCancellationRequested(() => {
      d.dispose();
      this._cancelled++;
      this._check();
    });
    this._listeners.add(d);
  }
  _check() {
    if (!this._isDone && this._total > 0 && this._total === this._cancelled) {
      this._isDone = true;
      this._listeners.dispose();
      this._source.cancel();
    }
  }
  dispose() {
    this._listeners.dispose();
    this._source.dispose();
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/path.js
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;
var CHAR_QUESTION_MARK = 63;
var ErrorInvalidArgType = class extends Error {
  static {
    __name(this, "ErrorInvalidArgType");
  }
  constructor(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && expected.indexOf("not ") === 0) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    const type = name.indexOf(".") !== -1 ? "property" : "argument";
    let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
    msg += `. Received type ${typeof actual}`;
    super(msg);
    this.code = "ERR_INVALID_ARG_TYPE";
  }
};
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
__name(validateObject, "validateObject");
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
__name(validateString, "validateString");
var platformIsWin32 = platform2 === "win32";
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
__name(isPathSeparator, "isPathSeparator");
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
__name(isPosixPathSeparator, "isPosixPathSeparator");
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
__name(isWindowsDeviceRoot, "isWindowsDeviceRoot");
function normalizeString(path, allowAboveRoot, separator, isPathSeparator3) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isPathSeparator3(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator3(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
__name(normalizeString, "normalizeString");
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
__name(formatExt, "formatExt");
function _format2(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
__name(_format2, "_format");
var win32 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1; i--) {
      let path;
      if (i >= 0) {
        path = pathSegments[i];
        validateString(path, `paths[${i}]`);
        if (path.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        path = cwd();
      } else {
        path = env[`=${resolvedDevice}`] || cwd();
        if (path === void 0 || path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          path = `${resolvedDevice}\\`;
        }
      }
      const len = path.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute2 = false;
      const code = path.charCodeAt(0);
      if (len === 1) {
        if (isPathSeparator(code)) {
          rootEnd = 1;
          isAbsolute2 = true;
        }
      } else if (isPathSeparator(code)) {
        isAbsolute2 = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            while (j < len && isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
          isAbsolute2 = true;
          rootEnd = 3;
        }
      }
      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }
      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute2;
        if (isAbsolute2 && resolvedDevice.length > 0) {
          break;
        }
      }
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
  },
  normalize(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = 0;
    let device;
    let isAbsolute2 = false;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPosixPathSeparator(code) ? "\\" : path;
    }
    if (isPathSeparator(code)) {
      isAbsolute2 = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            }
            if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      device = path.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
        isAbsolute2 = true;
        rootEnd = 3;
      }
    }
    let tail2 = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute2, "\\", isPathSeparator) : "";
    if (tail2.length === 0 && !isAbsolute2) {
      tail2 = ".";
    }
    if (tail2.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
      tail2 += "\\";
    }
    if (!isAbsolute2 && device === void 0 && path.includes(":")) {
      if (tail2.length >= 2 && isWindowsDeviceRoot(tail2.charCodeAt(0)) && tail2.charCodeAt(1) === CHAR_COLON) {
        return `.\\${tail2}`;
      }
      let index2 = path.indexOf(":");
      do {
        if (index2 === len - 1 || isPathSeparator(path.charCodeAt(index2 + 1))) {
          return `.\\${tail2}`;
        }
      } while ((index2 = path.indexOf(":", index2 + 1)) !== -1);
    }
    if (device === void 0) {
      return isAbsolute2 ? `\\${tail2}` : tail2;
    }
    return isAbsolute2 ? `${device}\\${tail2}` : `${device}${tail2}`;
  },
  isAbsolute(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return false;
    }
    const code = path.charCodeAt(0);
    return isPathSeparator(code) || // Possible device root
    len > 2 && isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON && isPathSeparator(path.charCodeAt(2));
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    let firstPart;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = firstPart = arg;
        } else {
          joined += `\\${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    let needsReplace = true;
    let slashCount = 0;
    if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return win32.normalize(joined);
  },
  // It will solve the relative path from `from` to `to`, for instance:
  //  from = 'C:\\orandea\\test\\aaa'
  //  to = 'C:\\orandea\\impl\\bbb'
  // The output of the function should be: '..\\..\\impl\\bbb'
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    const fromOrig = win32.resolve(from);
    const toOrig = win32.resolve(to);
    if (fromOrig === toOrig) {
      return "";
    }
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) {
      return "";
    }
    if (fromOrig.length !== from.length || toOrig.length !== to.length) {
      const fromSplit = fromOrig.split("\\");
      const toSplit = toOrig.split("\\");
      if (fromSplit[fromSplit.length - 1] === "") {
        fromSplit.pop();
      }
      if (toSplit[toSplit.length - 1] === "") {
        toSplit.pop();
      }
      const fromLen2 = fromSplit.length;
      const toLen2 = toSplit.length;
      const length2 = fromLen2 < toLen2 ? fromLen2 : toLen2;
      let i2;
      for (i2 = 0; i2 < length2; i2++) {
        if (fromSplit[i2].toLowerCase() !== toSplit[i2].toLowerCase()) {
          break;
        }
      }
      if (i2 === 0) {
        return toOrig;
      } else if (i2 === length2) {
        if (toLen2 > length2) {
          return toSplit.slice(i2).join("\\");
        }
        if (fromLen2 > length2) {
          return "..\\".repeat(fromLen2 - 1 - i2) + "..";
        }
        return "";
      }
      return "..\\".repeat(fromLen2 - i2) + toSplit.slice(i2).join("\\");
    }
    let fromStart = 0;
    while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
      fromStart++;
    }
    let fromEnd = from.length;
    while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
      fromEnd--;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      toStart++;
    }
    let toEnd = to.length;
    while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
      toEnd--;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_BACKWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i !== length) {
      if (lastCommonSep === -1) {
        return toOrig;
      }
    } else {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        }
        if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
        out += out.length === 0 ? ".." : "\\..";
      }
    }
    toStart += lastCommonSep;
    if (out.length > 0) {
      return `${out}${toOrig.slice(toStart, toEnd)}`;
    }
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      ++toStart;
    }
    return toOrig.slice(toStart, toEnd);
  },
  toNamespacedPath(path) {
    if (typeof path !== "string" || path.length === 0) {
      return path;
    }
    const resolvedPath = win32.resolve(path);
    if (resolvedPath.length <= 2) {
      return path;
    }
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
      return `\\\\?\\${resolvedPath}`;
    }
    return resolvedPath;
  },
  dirname(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = -1;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPathSeparator(code) ? path : ".";
    }
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }
    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      if (rootEnd === -1) {
        return ".";
      }
      end = rootEnd;
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2 && isWindowsDeviceRoot(path.charCodeAt(0)) && path.charCodeAt(1) === CHAR_COLON) {
      start = 2;
    }
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= start; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
      start = startPart = 2;
    }
    for (let i = path.length - 1; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "\\"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const len = path.length;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len === 1) {
      if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
      }
      ret.base = ret.name = path;
      return ret;
    }
    if (isPathSeparator(code)) {
      rootEnd = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              rootEnd = j;
            } else if (j !== last) {
              rootEnd = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      if (len <= 2) {
        ret.root = ret.dir = path;
        return ret;
      }
      rootEnd = 2;
      if (isPathSeparator(path.charCodeAt(2))) {
        if (len === 3) {
          ret.root = ret.dir = path;
          return ret;
        }
        rootEnd = 3;
      }
    }
    if (rootEnd > 0) {
      ret.root = path.slice(0, rootEnd);
    }
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= rootEnd; --i) {
      code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(startPart, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0 && startPart !== rootEnd) {
      ret.dir = path.slice(0, startPart - 1);
    } else {
      ret.dir = ret.root;
    }
    return ret;
  },
  sep: "\\",
  delimiter: ";",
  win32: null,
  posix: null
};
var posixCwd = (() => {
  if (platformIsWin32) {
    const regexp = /\\/g;
    return () => {
      const cwd2 = cwd().replace(regexp, "/");
      return cwd2.slice(cwd2.indexOf("/"));
    };
  }
  return () => cwd();
})();
var posix = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
      const path = pathSegments[i];
      validateString(path, `paths[${i}]`);
      if (path.length === 0) {
        continue;
      }
      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    if (!resolvedAbsolute) {
      const cwd2 = posixCwd();
      resolvedPath = `${cwd2}/${resolvedPath}`;
      resolvedAbsolute = cwd2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },
  normalize(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
    path = normalizeString(path, !isAbsolute2, "/", isPosixPathSeparator);
    if (path.length === 0) {
      if (isAbsolute2) {
        return "/";
      }
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator) {
      path += "/";
    }
    return isAbsolute2 ? `/${path}` : path;
  },
  isAbsolute(path) {
    validateString(path, "path");
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    const path = [];
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        path.push(arg);
      }
    }
    if (path.length === 0) {
      return ".";
    }
    return posix.normalize(path.join("/"));
  },
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    from = posix.resolve(from);
    to = posix.resolve(to);
    if (from === to) {
      return "";
    }
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_FORWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  },
  toNamespacedPath(path) {
    return path;
  },
  dirname(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      return hasRoot ? "/" : ".";
    }
    if (hasRoot && end === 1) {
      return "//";
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for (let i = path.length - 1; i >= 0; --i) {
      const char = path[i];
      if (char === "/") {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (char === ".") {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "/"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute2) {
      ret.root = "/";
      start = 1;
    } else {
      start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute2 ? 1 : startPart;
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(start2, end);
      } else {
        ret.name = path.slice(start2, startDot);
        ret.base = path.slice(start2, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0) {
      ret.dir = path.slice(0, startPart - 1);
    } else if (isAbsolute2) {
      ret.dir = "/";
    }
    return ret;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
var normalize = platformIsWin32 ? win32.normalize : posix.normalize;
var isAbsolute = platformIsWin32 ? win32.isAbsolute : posix.isAbsolute;
var join = platformIsWin32 ? win32.join : posix.join;
var resolve = platformIsWin32 ? win32.resolve : posix.resolve;
var relative = platformIsWin32 ? win32.relative : posix.relative;
var dirname = platformIsWin32 ? win32.dirname : posix.dirname;
var basename = platformIsWin32 ? win32.basename : posix.basename;
var extname = platformIsWin32 ? win32.extname : posix.extname;
var format = platformIsWin32 ? win32.format : posix.format;
var parse = platformIsWin32 ? win32.parse : posix.parse;
var toNamespacedPath = platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath;
var sep = platformIsWin32 ? win32.sep : posix.sep;
var delimiter = platformIsWin32 ? win32.delimiter : posix.delimiter;

// ../Output/Target/Microsoft/VSCode/vs/base/common/cache.js
var Cache2 = class {
  static {
    __name(this, "Cache");
  }
  constructor(task) {
    this.task = task;
    this.result = null;
  }
  get() {
    if (this.result) {
      return this.result;
    }
    const cts = new CancellationTokenSource();
    const promise = this.task(cts.token);
    this.result = {
      promise,
      dispose: /* @__PURE__ */ __name(() => {
        this.result = null;
        cts.cancel();
        cts.dispose();
      }, "dispose")
    };
    return this.result;
  }
};
function identity(t) {
  return t;
}
__name(identity, "identity");
var LRUCachedFunction = class {
  static {
    __name(this, "LRUCachedFunction");
  }
  constructor(arg1, arg2) {
    this.lastCache = void 0;
    this.lastArgKey = void 0;
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this.lastArgKey !== key) {
      this.lastArgKey = key;
      this.lastCache = this._fn(arg);
    }
    return this.lastCache;
  }
};
var CachedFunction = class {
  static {
    __name(this, "CachedFunction");
  }
  get cachedValues() {
    return this._map;
  }
  constructor(arg1, arg2) {
    this._map = /* @__PURE__ */ new Map();
    this._map2 = /* @__PURE__ */ new Map();
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this._map2.has(key)) {
      return this._map2.get(key);
    }
    const value = this._fn(arg);
    this._map.set(arg, value);
    this._map2.set(key, value);
    return value;
  }
};
var WeakCachedFunction = class {
  static {
    __name(this, "WeakCachedFunction");
  }
  constructor(arg1, arg2) {
    this._map = /* @__PURE__ */ new WeakMap();
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this._map.has(key)) {
      return this._map.get(key);
    }
    const value = this._fn(arg);
    this._map.set(key, value);
    return value;
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/lazy.js
var LazyValueState;
(function(LazyValueState2) {
  LazyValueState2[LazyValueState2["Uninitialized"] = 0] = "Uninitialized";
  LazyValueState2[LazyValueState2["Running"] = 1] = "Running";
  LazyValueState2[LazyValueState2["Completed"] = 2] = "Completed";
})(LazyValueState || (LazyValueState = {}));
var Lazy = class {
  static {
    __name(this, "Lazy");
  }
  constructor(executor) {
    this.executor = executor;
    this._state = LazyValueState.Uninitialized;
  }
  /**
   * True if the lazy value has been resolved.
   */
  get hasValue() {
    return this._state === LazyValueState.Completed;
  }
  /**
   * Get the wrapped value.
   *
   * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
   * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
   */
  get value() {
    if (this._state === LazyValueState.Uninitialized) {
      this._state = LazyValueState.Running;
      try {
        this._value = this.executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._state = LazyValueState.Completed;
      }
    } else if (this._state === LazyValueState.Running) {
      throw new Error("Cannot read the value of a lazy that is being initialized");
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
  /**
   * Get the wrapped value without forcing evaluation.
   */
  get rawValue() {
    return this._value;
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/strings.js
function isFalsyOrWhitespace(str) {
  if (!str || typeof str !== "string") {
    return true;
  }
  return str.trim().length === 0;
}
__name(isFalsyOrWhitespace, "isFalsyOrWhitespace");
var _formatRegexp = /{(\d+)}/g;
function format2(value, ...args) {
  if (args.length === 0) {
    return value;
  }
  return value.replace(_formatRegexp, function(match2, group) {
    const idx = parseInt(group, 10);
    return isNaN(idx) || idx < 0 || idx >= args.length ? match2 : args[idx];
  });
}
__name(format2, "format");
var _format2Regexp = /{([^}]+)}/g;
function format22(template, values) {
  if (Object.keys(values).length === 0) {
    return template;
  }
  return template.replace(_format2Regexp, (match2, group) => values[group] ?? match2);
}
__name(format22, "format2");
function htmlAttributeEncodeValue(value) {
  return value.replace(/[<>"'&]/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      case "&":
        return "&amp;";
    }
    return ch;
  });
}
__name(htmlAttributeEncodeValue, "htmlAttributeEncodeValue");
function escape(html) {
  return html.replace(/[<>&]/g, function(match2) {
    switch (match2) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return match2;
    }
  });
}
__name(escape, "escape");
function escapeRegExpCharacters(value) {
  return value.replace(/[\\\{\}\*\+\?\|\^\$\.\[\]\(\)]/g, "\\$&");
}
__name(escapeRegExpCharacters, "escapeRegExpCharacters");
function count(value, substr) {
  let result = 0;
  let index2 = value.indexOf(substr);
  while (index2 !== -1) {
    result++;
    index2 = value.indexOf(substr, index2 + substr.length);
  }
  return result;
}
__name(count, "count");
function truncate(value, maxLength, suffix = Ellipsis) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.substr(0, maxLength)}${suffix}`;
}
__name(truncate, "truncate");
function truncateMiddle(value, maxLength, suffix = Ellipsis) {
  if (value.length <= maxLength) {
    return value;
  }
  const prefixLength = Math.ceil(maxLength / 2) - suffix.length / 2;
  const suffixLength = Math.floor(maxLength / 2) - suffix.length / 2;
  return `${value.substr(0, prefixLength)}${suffix}${value.substr(value.length - suffixLength)}`;
}
__name(truncateMiddle, "truncateMiddle");
function trim(haystack, needle = " ") {
  const trimmed = ltrim(haystack, needle);
  return rtrim(trimmed, needle);
}
__name(trim, "trim");
function ltrim(haystack, needle) {
  if (!haystack || !needle) {
    return haystack;
  }
  const needleLen = needle.length;
  let offset = 0;
  if (needleLen === 1) {
    const ch = needle.charCodeAt(0);
    while (offset < haystack.length && haystack.charCodeAt(offset) === ch) {
      offset++;
    }
  } else {
    while (haystack.startsWith(needle, offset)) {
      offset += needleLen;
    }
  }
  return haystack.substring(offset);
}
__name(ltrim, "ltrim");
function rtrim(haystack, needle) {
  if (!haystack || !needle) {
    return haystack;
  }
  const needleLen = needle.length, haystackLen = haystack.length;
  if (needleLen === 1) {
    let end = haystackLen;
    const ch = needle.charCodeAt(0);
    while (end > 0 && haystack.charCodeAt(end - 1) === ch) {
      end--;
    }
    return haystack.substring(0, end);
  }
  let offset = haystackLen;
  while (offset > 0 && haystack.endsWith(needle, offset)) {
    offset -= needleLen;
  }
  return haystack.substring(0, offset);
}
__name(rtrim, "rtrim");
function convertSimple2RegExpPattern(pattern) {
  return pattern.replace(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, "\\$&").replace(/[\*]/g, ".*");
}
__name(convertSimple2RegExpPattern, "convertSimple2RegExpPattern");
function createRegExp(searchString, isRegex, options = {}) {
  if (!searchString) {
    throw new Error("Cannot create regex from empty string");
  }
  if (!isRegex) {
    searchString = escapeRegExpCharacters(searchString);
  }
  if (options.wholeWord) {
    if (!/\B/.test(searchString.charAt(0))) {
      searchString = "\\b" + searchString;
    }
    if (!/\B/.test(searchString.charAt(searchString.length - 1))) {
      searchString = searchString + "\\b";
    }
  }
  let modifiers = "";
  if (options.global) {
    modifiers += "g";
  }
  if (!options.matchCase) {
    modifiers += "i";
  }
  if (options.multiline) {
    modifiers += "m";
  }
  if (options.unicode) {
    modifiers += "u";
  }
  return new RegExp(searchString, modifiers);
}
__name(createRegExp, "createRegExp");
function regExpLeadsToEndlessLoop(regexp) {
  if (regexp.source === "^" || regexp.source === "^$" || regexp.source === "$" || regexp.source === "^\\s*$") {
    return false;
  }
  const match2 = regexp.exec("");
  return !!(match2 && regexp.lastIndex === 0);
}
__name(regExpLeadsToEndlessLoop, "regExpLeadsToEndlessLoop");
function joinStrings(items, separator) {
  return items.filter((item) => item !== void 0 && item !== null && item !== false).join(separator);
}
__name(joinStrings, "joinStrings");
function splitLines(str) {
  return str.split(/\r\n|\r|\n/);
}
__name(splitLines, "splitLines");
function splitLinesIncludeSeparators(str) {
  const linesWithSeparators = [];
  const splitLinesAndSeparators = str.split(/(\r\n|\r|\n)/);
  for (let i = 0; i < Math.ceil(splitLinesAndSeparators.length / 2); i++) {
    linesWithSeparators.push(splitLinesAndSeparators[2 * i] + (splitLinesAndSeparators[2 * i + 1] ?? ""));
  }
  return linesWithSeparators;
}
__name(splitLinesIncludeSeparators, "splitLinesIncludeSeparators");
function indexOfPattern(str, re) {
  const match2 = re.exec(str);
  if (match2) {
    return match2.index;
  }
  return -1;
}
__name(indexOfPattern, "indexOfPattern");
function firstNonWhitespaceIndex(str) {
  for (let i = 0, len = str.length; i < len; i++) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return i;
    }
  }
  return -1;
}
__name(firstNonWhitespaceIndex, "firstNonWhitespaceIndex");
function getLeadingWhitespace(str, start = 0, end = str.length) {
  for (let i = start; i < end; i++) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return str.substring(start, i);
    }
  }
  return str.substring(start, end);
}
__name(getLeadingWhitespace, "getLeadingWhitespace");
function lastNonWhitespaceIndex(str, startIndex = str.length - 1) {
  for (let i = startIndex; i >= 0; i--) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return i;
    }
  }
  return -1;
}
__name(lastNonWhitespaceIndex, "lastNonWhitespaceIndex");
function getIndentationLength(str) {
  const idx = firstNonWhitespaceIndex(str);
  if (idx === -1) {
    return str.length;
  }
  return idx;
}
__name(getIndentationLength, "getIndentationLength");
function replaceAsync(str, search, replacer) {
  const parts = [];
  let last = 0;
  for (const match2 of str.matchAll(search)) {
    parts.push(str.slice(last, match2.index));
    if (match2.index === void 0) {
      throw new Error("match.index should be defined");
    }
    last = match2.index + match2[0].length;
    parts.push(replacer(match2[0], ...match2.slice(1), match2.index, str, match2.groups));
  }
  parts.push(str.slice(last));
  return Promise.all(parts).then((p) => p.join(""));
}
__name(replaceAsync, "replaceAsync");
function compare(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}
__name(compare, "compare");
function compareSubstring(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);
    if (codeA < codeB) {
      return -1;
    } else if (codeA > codeB) {
      return 1;
    }
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
__name(compareSubstring, "compareSubstring");
function compareIgnoreCase(a, b) {
  return compareSubstringIgnoreCase(a, b, 0, a.length, 0, b.length);
}
__name(compareIgnoreCase, "compareIgnoreCase");
function compareSubstringIgnoreCase(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    let codeA = a.charCodeAt(aStart);
    let codeB = b.charCodeAt(bStart);
    if (codeA === codeB) {
      continue;
    }
    if (codeA >= 128 || codeB >= 128) {
      return compareSubstring(a.toLowerCase(), b.toLowerCase(), aStart, aEnd, bStart, bEnd);
    }
    if (isLowerAsciiLetter(codeA)) {
      codeA -= 32;
    }
    if (isLowerAsciiLetter(codeB)) {
      codeB -= 32;
    }
    const diff = codeA - codeB;
    if (diff === 0) {
      continue;
    }
    return diff;
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
__name(compareSubstringIgnoreCase, "compareSubstringIgnoreCase");
function isAsciiDigit(code) {
  return code >= 48 && code <= 57;
}
__name(isAsciiDigit, "isAsciiDigit");
function isLowerAsciiLetter(code) {
  return code >= 97 && code <= 122;
}
__name(isLowerAsciiLetter, "isLowerAsciiLetter");
function isUpperAsciiLetter(code) {
  return code >= 65 && code <= 90;
}
__name(isUpperAsciiLetter, "isUpperAsciiLetter");
function equalsIgnoreCase(a, b) {
  return a.length === b.length && compareSubstringIgnoreCase(a, b) === 0;
}
__name(equalsIgnoreCase, "equalsIgnoreCase");
function equals2(a, b, ignoreCase) {
  return a === b || !!ignoreCase && a !== void 0 && b !== void 0 && equalsIgnoreCase(a, b);
}
__name(equals2, "equals");
function startsWithIgnoreCase(str, candidate) {
  const len = candidate.length;
  return len <= str.length && compareSubstringIgnoreCase(str, candidate, 0, len) === 0;
}
__name(startsWithIgnoreCase, "startsWithIgnoreCase");
function endsWithIgnoreCase(str, candidate) {
  const len = str.length;
  const start = len - candidate.length;
  return start >= 0 && compareSubstringIgnoreCase(str, candidate, start, len) === 0;
}
__name(endsWithIgnoreCase, "endsWithIgnoreCase");
function commonPrefixLength2(a, b) {
  const len = Math.min(a.length, b.length);
  let i;
  for (i = 0; i < len; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) {
      return i;
    }
  }
  return len;
}
__name(commonPrefixLength2, "commonPrefixLength");
function commonSuffixLength(a, b) {
  const len = Math.min(a.length, b.length);
  let i;
  const aLastIndex = a.length - 1;
  const bLastIndex = b.length - 1;
  for (i = 0; i < len; i++) {
    if (a.charCodeAt(aLastIndex - i) !== b.charCodeAt(bLastIndex - i)) {
      return i;
    }
  }
  return len;
}
__name(commonSuffixLength, "commonSuffixLength");
function isHighSurrogate(charCode) {
  return 55296 <= charCode && charCode <= 56319;
}
__name(isHighSurrogate, "isHighSurrogate");
function isLowSurrogate(charCode) {
  return 56320 <= charCode && charCode <= 57343;
}
__name(isLowSurrogate, "isLowSurrogate");
function computeCodePoint(highSurrogate, lowSurrogate) {
  return (highSurrogate - 55296 << 10) + (lowSurrogate - 56320) + 65536;
}
__name(computeCodePoint, "computeCodePoint");
function getNextCodePoint(str, len, offset) {
  const charCode = str.charCodeAt(offset);
  if (isHighSurrogate(charCode) && offset + 1 < len) {
    const nextCharCode = str.charCodeAt(offset + 1);
    if (isLowSurrogate(nextCharCode)) {
      return computeCodePoint(charCode, nextCharCode);
    }
  }
  return charCode;
}
__name(getNextCodePoint, "getNextCodePoint");
function getPrevCodePoint(str, offset) {
  const charCode = str.charCodeAt(offset - 1);
  if (isLowSurrogate(charCode) && offset > 1) {
    const prevCharCode = str.charCodeAt(offset - 2);
    if (isHighSurrogate(prevCharCode)) {
      return computeCodePoint(prevCharCode, charCode);
    }
  }
  return charCode;
}
__name(getPrevCodePoint, "getPrevCodePoint");
var CodePointIterator = class {
  static {
    __name(this, "CodePointIterator");
  }
  get offset() {
    return this._offset;
  }
  constructor(str, offset = 0) {
    this._str = str;
    this._len = str.length;
    this._offset = offset;
  }
  setOffset(offset) {
    this._offset = offset;
  }
  prevCodePoint() {
    const codePoint = getPrevCodePoint(this._str, this._offset);
    this._offset -= codePoint >= 65536 ? 2 : 1;
    return codePoint;
  }
  nextCodePoint() {
    const codePoint = getNextCodePoint(this._str, this._len, this._offset);
    this._offset += codePoint >= 65536 ? 2 : 1;
    return codePoint;
  }
  eol() {
    return this._offset >= this._len;
  }
};
var GraphemeIterator = class {
  static {
    __name(this, "GraphemeIterator");
  }
  get offset() {
    return this._iterator.offset;
  }
  constructor(str, offset = 0) {
    this._iterator = new CodePointIterator(str, offset);
  }
  nextGraphemeLength() {
    const graphemeBreakTree = GraphemeBreakTree.getInstance();
    const iterator = this._iterator;
    const initialOffset = iterator.offset;
    let graphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.nextCodePoint());
    while (!iterator.eol()) {
      const offset = iterator.offset;
      const nextGraphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.nextCodePoint());
      if (breakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
        iterator.setOffset(offset);
        break;
      }
      graphemeBreakType = nextGraphemeBreakType;
    }
    return iterator.offset - initialOffset;
  }
  prevGraphemeLength() {
    const graphemeBreakTree = GraphemeBreakTree.getInstance();
    const iterator = this._iterator;
    const initialOffset = iterator.offset;
    let graphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.prevCodePoint());
    while (iterator.offset > 0) {
      const offset = iterator.offset;
      const prevGraphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.prevCodePoint());
      if (breakBetweenGraphemeBreakType(prevGraphemeBreakType, graphemeBreakType)) {
        iterator.setOffset(offset);
        break;
      }
      graphemeBreakType = prevGraphemeBreakType;
    }
    return initialOffset - iterator.offset;
  }
  eol() {
    return this._iterator.eol();
  }
};
function nextCharLength(str, initialOffset) {
  const iterator = new GraphemeIterator(str, initialOffset);
  return iterator.nextGraphemeLength();
}
__name(nextCharLength, "nextCharLength");
function prevCharLength(str, initialOffset) {
  const iterator = new GraphemeIterator(str, initialOffset);
  return iterator.prevGraphemeLength();
}
__name(prevCharLength, "prevCharLength");
function getCharContainingOffset(str, offset) {
  if (offset > 0 && isLowSurrogate(str.charCodeAt(offset))) {
    offset--;
  }
  const endOffset = offset + nextCharLength(str, offset);
  const startOffset = endOffset - prevCharLength(str, endOffset);
  return [startOffset, endOffset];
}
__name(getCharContainingOffset, "getCharContainingOffset");
function charCount(str) {
  const iterator = new GraphemeIterator(str);
  let length = 0;
  while (!iterator.eol()) {
    length++;
    iterator.nextGraphemeLength();
  }
  return length;
}
__name(charCount, "charCount");
var CONTAINS_RTL = void 0;
function makeContainsRtl() {
  return /(?:[\u05BE\u05C0\u05C3\u05C6\u05D0-\u05F4\u0608\u060B\u060D\u061B-\u064A\u066D-\u066F\u0671-\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u0710\u0712-\u072F\u074D-\u07A5\u07B1-\u07EA\u07F4\u07F5\u07FA\u07FE-\u0815\u081A\u0824\u0828\u0830-\u0858\u085E-\u088E\u08A0-\u08C9\u200F\uFB1D\uFB1F-\uFB28\uFB2A-\uFD3D\uFD50-\uFDC7\uFDF0-\uFDFC\uFE70-\uFEFC]|\uD802[\uDC00-\uDD1B\uDD20-\uDE00\uDE10-\uDE35\uDE40-\uDEE4\uDEEB-\uDF35\uDF40-\uDFFF]|\uD803[\uDC00-\uDD23\uDE80-\uDEA9\uDEAD-\uDF45\uDF51-\uDF81\uDF86-\uDFF6]|\uD83A[\uDC00-\uDCCF\uDD00-\uDD43\uDD4B-\uDFFF]|\uD83B[\uDC00-\uDEBB])/;
}
__name(makeContainsRtl, "makeContainsRtl");
function containsRTL(str) {
  if (!CONTAINS_RTL) {
    CONTAINS_RTL = makeContainsRtl();
  }
  return CONTAINS_RTL.test(str);
}
__name(containsRTL, "containsRTL");
var IS_BASIC_ASCII = /^[\t\n\r\x20-\x7E]*$/;
function isBasicASCII(str) {
  return IS_BASIC_ASCII.test(str);
}
__name(isBasicASCII, "isBasicASCII");
var UNUSUAL_LINE_TERMINATORS = /[\u2028\u2029]/;
function containsUnusualLineTerminators(str) {
  return UNUSUAL_LINE_TERMINATORS.test(str);
}
__name(containsUnusualLineTerminators, "containsUnusualLineTerminators");
function isFullWidthCharacter(charCode) {
  return charCode >= 11904 && charCode <= 55215 || charCode >= 63744 && charCode <= 64255 || charCode >= 65281 && charCode <= 65374 || charCode >= 65504 && charCode <= 65510;
}
__name(isFullWidthCharacter, "isFullWidthCharacter");
function isEmojiImprecise(x) {
  return x >= 127462 && x <= 127487 || x === 8986 || x === 8987 || x === 9200 || x === 9203 || x >= 9728 && x <= 10175 || x === 11088 || x === 11093 || x >= 127744 && x <= 128591 || x >= 128640 && x <= 128764 || x >= 128992 && x <= 129008 || x >= 129280 && x <= 129535 || x >= 129648 && x <= 129782;
}
__name(isEmojiImprecise, "isEmojiImprecise");
function lcut(text, n, prefix = "") {
  const trimmed = text.trimStart();
  if (trimmed.length < n) {
    return trimmed;
  }
  const re = /\b/g;
  let i = 0;
  while (re.test(trimmed)) {
    if (trimmed.length - re.lastIndex < n) {
      break;
    }
    i = re.lastIndex;
    re.lastIndex += 1;
  }
  if (i === 0) {
    return trimmed;
  }
  return prefix + trimmed.substring(i).trimStart();
}
__name(lcut, "lcut");
function rcut(text, n, suffix = "") {
  const trimmed = text.trimEnd();
  if (trimmed.length <= n) {
    return trimmed;
  }
  const re = /\b/g;
  let lastGoodBreak = 0;
  let foundBoundaryAfterN = false;
  while (re.test(trimmed)) {
    if (re.lastIndex > n) {
      foundBoundaryAfterN = true;
      break;
    }
    lastGoodBreak = re.lastIndex;
    re.lastIndex += 1;
  }
  if (!foundBoundaryAfterN) {
    return trimmed;
  }
  if (lastGoodBreak === 0) {
    return suffix;
  }
  const result = trimmed.substring(0, lastGoodBreak).trimEnd();
  if (result.length < lastGoodBreak / 2) {
    return trimmed;
  }
  return result + suffix;
}
__name(rcut, "rcut");
var CSI_SEQUENCE = /(?:\x1b\[|\x9b)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^`{}|~]/;
var OSC_SEQUENCE = /(?:\x1b\]|\x9d).*?(?:\x1b\\|\x07|\x9c)/;
var ESC_SEQUENCE = /\x1b(?:[ #%\(\)\*\+\-\.\/]?[a-zA-Z0-9\|}~@])/;
var CONTROL_SEQUENCES = new RegExp("(?:" + [
  CSI_SEQUENCE.source,
  OSC_SEQUENCE.source,
  ESC_SEQUENCE.source
].join("|") + ")", "g");
function* forAnsiStringParts(str) {
  let last = 0;
  for (const match2 of str.matchAll(CONTROL_SEQUENCES)) {
    if (last !== match2.index) {
      yield { isCode: false, str: str.substring(last, match2.index) };
    }
    yield { isCode: true, str: match2[0] };
    last = match2.index + match2[0].length;
  }
  if (last !== str.length) {
    yield { isCode: false, str: str.substring(last) };
  }
}
__name(forAnsiStringParts, "forAnsiStringParts");
function removeAnsiEscapeCodes(str) {
  if (str) {
    str = str.replace(CONTROL_SEQUENCES, "");
  }
  return str;
}
__name(removeAnsiEscapeCodes, "removeAnsiEscapeCodes");
var PROMPT_NON_PRINTABLE = /\\\[.*?\\\]/g;
function removeAnsiEscapeCodesFromPrompt(str) {
  return removeAnsiEscapeCodes(str).replace(PROMPT_NON_PRINTABLE, "");
}
__name(removeAnsiEscapeCodesFromPrompt, "removeAnsiEscapeCodesFromPrompt");
var UTF8_BOM_CHARACTER = String.fromCharCode(
  65279
  /* CharCode.UTF8_BOM */
);
function startsWithUTF8BOM(str) {
  return !!(str && str.length > 0 && str.charCodeAt(0) === 65279);
}
__name(startsWithUTF8BOM, "startsWithUTF8BOM");
function stripUTF8BOM(str) {
  return startsWithUTF8BOM(str) ? str.substr(1) : str;
}
__name(stripUTF8BOM, "stripUTF8BOM");
function fuzzyContains(target, query) {
  if (!target || !query) {
    return false;
  }
  if (target.length < query.length) {
    return false;
  }
  const queryLen = query.length;
  const targetLower = target.toLowerCase();
  let index2 = 0;
  let lastIndexOf = -1;
  while (index2 < queryLen) {
    const indexOf = targetLower.indexOf(query[index2], lastIndexOf + 1);
    if (indexOf < 0) {
      return false;
    }
    lastIndexOf = indexOf;
    index2++;
  }
  return true;
}
__name(fuzzyContains, "fuzzyContains");
function containsUppercaseCharacter(target, ignoreEscapedChars = false) {
  if (!target) {
    return false;
  }
  if (ignoreEscapedChars) {
    target = target.replace(/\\./g, "");
  }
  return target.toLowerCase() !== target;
}
__name(containsUppercaseCharacter, "containsUppercaseCharacter");
function uppercaseFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
__name(uppercaseFirstLetter, "uppercaseFirstLetter");
function getNLines(str, n = 1) {
  if (n === 0) {
    return "";
  }
  let idx = -1;
  do {
    idx = str.indexOf("\n", idx + 1);
    n--;
  } while (n > 0 && idx >= 0);
  if (idx === -1) {
    return str;
  }
  if (str[idx - 1] === "\r") {
    idx--;
  }
  return str.substr(0, idx);
}
__name(getNLines, "getNLines");
function singleLetterHash(n) {
  const LETTERS_CNT = 90 - 65 + 1;
  n = n % (2 * LETTERS_CNT);
  if (n < LETTERS_CNT) {
    return String.fromCharCode(97 + n);
  }
  return String.fromCharCode(65 + n - LETTERS_CNT);
}
__name(singleLetterHash, "singleLetterHash");
function getGraphemeBreakType(codePoint) {
  const graphemeBreakTree = GraphemeBreakTree.getInstance();
  return graphemeBreakTree.getGraphemeBreakType(codePoint);
}
__name(getGraphemeBreakType, "getGraphemeBreakType");
function breakBetweenGraphemeBreakType(breakTypeA, breakTypeB) {
  if (breakTypeA === 0) {
    return breakTypeB !== 5 && breakTypeB !== 7;
  }
  if (breakTypeA === 2) {
    if (breakTypeB === 3) {
      return false;
    }
  }
  if (breakTypeA === 4 || breakTypeA === 2 || breakTypeA === 3) {
    return true;
  }
  if (breakTypeB === 4 || breakTypeB === 2 || breakTypeB === 3) {
    return true;
  }
  if (breakTypeA === 8) {
    if (breakTypeB === 8 || breakTypeB === 9 || breakTypeB === 11 || breakTypeB === 12) {
      return false;
    }
  }
  if (breakTypeA === 11 || breakTypeA === 9) {
    if (breakTypeB === 9 || breakTypeB === 10) {
      return false;
    }
  }
  if (breakTypeA === 12 || breakTypeA === 10) {
    if (breakTypeB === 10) {
      return false;
    }
  }
  if (breakTypeB === 5 || breakTypeB === 13) {
    return false;
  }
  if (breakTypeB === 7) {
    return false;
  }
  if (breakTypeA === 1) {
    return false;
  }
  if (breakTypeA === 13 && breakTypeB === 14) {
    return false;
  }
  if (breakTypeA === 6 && breakTypeB === 6) {
    return false;
  }
  return true;
}
__name(breakBetweenGraphemeBreakType, "breakBetweenGraphemeBreakType");
var GraphemeBreakType;
(function(GraphemeBreakType2) {
  GraphemeBreakType2[GraphemeBreakType2["Other"] = 0] = "Other";
  GraphemeBreakType2[GraphemeBreakType2["Prepend"] = 1] = "Prepend";
  GraphemeBreakType2[GraphemeBreakType2["CR"] = 2] = "CR";
  GraphemeBreakType2[GraphemeBreakType2["LF"] = 3] = "LF";
  GraphemeBreakType2[GraphemeBreakType2["Control"] = 4] = "Control";
  GraphemeBreakType2[GraphemeBreakType2["Extend"] = 5] = "Extend";
  GraphemeBreakType2[GraphemeBreakType2["Regional_Indicator"] = 6] = "Regional_Indicator";
  GraphemeBreakType2[GraphemeBreakType2["SpacingMark"] = 7] = "SpacingMark";
  GraphemeBreakType2[GraphemeBreakType2["L"] = 8] = "L";
  GraphemeBreakType2[GraphemeBreakType2["V"] = 9] = "V";
  GraphemeBreakType2[GraphemeBreakType2["T"] = 10] = "T";
  GraphemeBreakType2[GraphemeBreakType2["LV"] = 11] = "LV";
  GraphemeBreakType2[GraphemeBreakType2["LVT"] = 12] = "LVT";
  GraphemeBreakType2[GraphemeBreakType2["ZWJ"] = 13] = "ZWJ";
  GraphemeBreakType2[GraphemeBreakType2["Extended_Pictographic"] = 14] = "Extended_Pictographic";
})(GraphemeBreakType || (GraphemeBreakType = {}));
var GraphemeBreakTree = class _GraphemeBreakTree {
  static {
    __name(this, "GraphemeBreakTree");
  }
  static {
    this._INSTANCE = null;
  }
  static getInstance() {
    if (!_GraphemeBreakTree._INSTANCE) {
      _GraphemeBreakTree._INSTANCE = new _GraphemeBreakTree();
    }
    return _GraphemeBreakTree._INSTANCE;
  }
  constructor() {
    this._data = getGraphemeBreakRawData();
  }
  getGraphemeBreakType(codePoint) {
    if (codePoint < 32) {
      if (codePoint === 10) {
        return 3;
      }
      if (codePoint === 13) {
        return 2;
      }
      return 4;
    }
    if (codePoint < 127) {
      return 0;
    }
    const data = this._data;
    const nodeCount = data.length / 3;
    let nodeIndex = 1;
    while (nodeIndex <= nodeCount) {
      if (codePoint < data[3 * nodeIndex]) {
        nodeIndex = 2 * nodeIndex;
      } else if (codePoint > data[3 * nodeIndex + 1]) {
        nodeIndex = 2 * nodeIndex + 1;
      } else {
        return data[3 * nodeIndex + 2];
      }
    }
    return 0;
  }
};
function getGraphemeBreakRawData() {
  return JSON.parse("[0,0,0,51229,51255,12,44061,44087,12,127462,127487,6,7083,7085,5,47645,47671,12,54813,54839,12,128678,128678,14,3270,3270,5,9919,9923,14,45853,45879,12,49437,49463,12,53021,53047,12,71216,71218,7,128398,128399,14,129360,129374,14,2519,2519,5,4448,4519,9,9742,9742,14,12336,12336,14,44957,44983,12,46749,46775,12,48541,48567,12,50333,50359,12,52125,52151,12,53917,53943,12,69888,69890,5,73018,73018,5,127990,127990,14,128558,128559,14,128759,128760,14,129653,129655,14,2027,2035,5,2891,2892,7,3761,3761,5,6683,6683,5,8293,8293,4,9825,9826,14,9999,9999,14,43452,43453,5,44509,44535,12,45405,45431,12,46301,46327,12,47197,47223,12,48093,48119,12,48989,49015,12,49885,49911,12,50781,50807,12,51677,51703,12,52573,52599,12,53469,53495,12,54365,54391,12,65279,65279,4,70471,70472,7,72145,72147,7,119173,119179,5,127799,127818,14,128240,128244,14,128512,128512,14,128652,128652,14,128721,128722,14,129292,129292,14,129445,129450,14,129734,129743,14,1476,1477,5,2366,2368,7,2750,2752,7,3076,3076,5,3415,3415,5,4141,4144,5,6109,6109,5,6964,6964,5,7394,7400,5,9197,9198,14,9770,9770,14,9877,9877,14,9968,9969,14,10084,10084,14,43052,43052,5,43713,43713,5,44285,44311,12,44733,44759,12,45181,45207,12,45629,45655,12,46077,46103,12,46525,46551,12,46973,46999,12,47421,47447,12,47869,47895,12,48317,48343,12,48765,48791,12,49213,49239,12,49661,49687,12,50109,50135,12,50557,50583,12,51005,51031,12,51453,51479,12,51901,51927,12,52349,52375,12,52797,52823,12,53245,53271,12,53693,53719,12,54141,54167,12,54589,54615,12,55037,55063,12,69506,69509,5,70191,70193,5,70841,70841,7,71463,71467,5,72330,72342,5,94031,94031,5,123628,123631,5,127763,127765,14,127941,127941,14,128043,128062,14,128302,128317,14,128465,128467,14,128539,128539,14,128640,128640,14,128662,128662,14,128703,128703,14,128745,128745,14,129004,129007,14,129329,129330,14,129402,129402,14,129483,129483,14,129686,129704,14,130048,131069,14,173,173,4,1757,1757,1,2200,2207,5,2434,2435,7,2631,2632,5,2817,2817,5,3008,3008,5,3201,3201,5,3387,3388,5,3542,3542,5,3902,3903,7,4190,4192,5,6002,6003,5,6439,6440,5,6765,6770,7,7019,7027,5,7154,7155,7,8205,8205,13,8505,8505,14,9654,9654,14,9757,9757,14,9792,9792,14,9852,9853,14,9890,9894,14,9937,9937,14,9981,9981,14,10035,10036,14,11035,11036,14,42654,42655,5,43346,43347,7,43587,43587,5,44006,44007,7,44173,44199,12,44397,44423,12,44621,44647,12,44845,44871,12,45069,45095,12,45293,45319,12,45517,45543,12,45741,45767,12,45965,45991,12,46189,46215,12,46413,46439,12,46637,46663,12,46861,46887,12,47085,47111,12,47309,47335,12,47533,47559,12,47757,47783,12,47981,48007,12,48205,48231,12,48429,48455,12,48653,48679,12,48877,48903,12,49101,49127,12,49325,49351,12,49549,49575,12,49773,49799,12,49997,50023,12,50221,50247,12,50445,50471,12,50669,50695,12,50893,50919,12,51117,51143,12,51341,51367,12,51565,51591,12,51789,51815,12,52013,52039,12,52237,52263,12,52461,52487,12,52685,52711,12,52909,52935,12,53133,53159,12,53357,53383,12,53581,53607,12,53805,53831,12,54029,54055,12,54253,54279,12,54477,54503,12,54701,54727,12,54925,54951,12,55149,55175,12,68101,68102,5,69762,69762,7,70067,70069,7,70371,70378,5,70720,70721,7,71087,71087,5,71341,71341,5,71995,71996,5,72249,72249,7,72850,72871,5,73109,73109,5,118576,118598,5,121505,121519,5,127245,127247,14,127568,127569,14,127777,127777,14,127872,127891,14,127956,127967,14,128015,128016,14,128110,128172,14,128259,128259,14,128367,128368,14,128424,128424,14,128488,128488,14,128530,128532,14,128550,128551,14,128566,128566,14,128647,128647,14,128656,128656,14,128667,128673,14,128691,128693,14,128715,128715,14,128728,128732,14,128752,128752,14,128765,128767,14,129096,129103,14,129311,129311,14,129344,129349,14,129394,129394,14,129413,129425,14,129466,129471,14,129511,129535,14,129664,129666,14,129719,129722,14,129760,129767,14,917536,917631,5,13,13,2,1160,1161,5,1564,1564,4,1807,1807,1,2085,2087,5,2307,2307,7,2382,2383,7,2497,2500,5,2563,2563,7,2677,2677,5,2763,2764,7,2879,2879,5,2914,2915,5,3021,3021,5,3142,3144,5,3263,3263,5,3285,3286,5,3398,3400,7,3530,3530,5,3633,3633,5,3864,3865,5,3974,3975,5,4155,4156,7,4229,4230,5,5909,5909,7,6078,6085,7,6277,6278,5,6451,6456,7,6744,6750,5,6846,6846,5,6972,6972,5,7074,7077,5,7146,7148,7,7222,7223,5,7416,7417,5,8234,8238,4,8417,8417,5,9000,9000,14,9203,9203,14,9730,9731,14,9748,9749,14,9762,9763,14,9776,9783,14,9800,9811,14,9831,9831,14,9872,9873,14,9882,9882,14,9900,9903,14,9929,9933,14,9941,9960,14,9974,9974,14,9989,9989,14,10006,10006,14,10062,10062,14,10160,10160,14,11647,11647,5,12953,12953,14,43019,43019,5,43232,43249,5,43443,43443,5,43567,43568,7,43696,43696,5,43765,43765,7,44013,44013,5,44117,44143,12,44229,44255,12,44341,44367,12,44453,44479,12,44565,44591,12,44677,44703,12,44789,44815,12,44901,44927,12,45013,45039,12,45125,45151,12,45237,45263,12,45349,45375,12,45461,45487,12,45573,45599,12,45685,45711,12,45797,45823,12,45909,45935,12,46021,46047,12,46133,46159,12,46245,46271,12,46357,46383,12,46469,46495,12,46581,46607,12,46693,46719,12,46805,46831,12,46917,46943,12,47029,47055,12,47141,47167,12,47253,47279,12,47365,47391,12,47477,47503,12,47589,47615,12,47701,47727,12,47813,47839,12,47925,47951,12,48037,48063,12,48149,48175,12,48261,48287,12,48373,48399,12,48485,48511,12,48597,48623,12,48709,48735,12,48821,48847,12,48933,48959,12,49045,49071,12,49157,49183,12,49269,49295,12,49381,49407,12,49493,49519,12,49605,49631,12,49717,49743,12,49829,49855,12,49941,49967,12,50053,50079,12,50165,50191,12,50277,50303,12,50389,50415,12,50501,50527,12,50613,50639,12,50725,50751,12,50837,50863,12,50949,50975,12,51061,51087,12,51173,51199,12,51285,51311,12,51397,51423,12,51509,51535,12,51621,51647,12,51733,51759,12,51845,51871,12,51957,51983,12,52069,52095,12,52181,52207,12,52293,52319,12,52405,52431,12,52517,52543,12,52629,52655,12,52741,52767,12,52853,52879,12,52965,52991,12,53077,53103,12,53189,53215,12,53301,53327,12,53413,53439,12,53525,53551,12,53637,53663,12,53749,53775,12,53861,53887,12,53973,53999,12,54085,54111,12,54197,54223,12,54309,54335,12,54421,54447,12,54533,54559,12,54645,54671,12,54757,54783,12,54869,54895,12,54981,55007,12,55093,55119,12,55243,55291,10,66045,66045,5,68325,68326,5,69688,69702,5,69817,69818,5,69957,69958,7,70089,70092,5,70198,70199,5,70462,70462,5,70502,70508,5,70750,70750,5,70846,70846,7,71100,71101,5,71230,71230,7,71351,71351,5,71737,71738,5,72000,72000,7,72160,72160,5,72273,72278,5,72752,72758,5,72882,72883,5,73031,73031,5,73461,73462,7,94192,94193,7,119149,119149,7,121403,121452,5,122915,122916,5,126980,126980,14,127358,127359,14,127535,127535,14,127759,127759,14,127771,127771,14,127792,127793,14,127825,127867,14,127897,127899,14,127945,127945,14,127985,127986,14,128000,128007,14,128021,128021,14,128066,128100,14,128184,128235,14,128249,128252,14,128266,128276,14,128335,128335,14,128379,128390,14,128407,128419,14,128444,128444,14,128481,128481,14,128499,128499,14,128526,128526,14,128536,128536,14,128543,128543,14,128556,128556,14,128564,128564,14,128577,128580,14,128643,128645,14,128649,128649,14,128654,128654,14,128660,128660,14,128664,128664,14,128675,128675,14,128686,128689,14,128695,128696,14,128705,128709,14,128717,128719,14,128725,128725,14,128736,128741,14,128747,128748,14,128755,128755,14,128762,128762,14,128981,128991,14,129009,129023,14,129160,129167,14,129296,129304,14,129320,129327,14,129340,129342,14,129356,129356,14,129388,129392,14,129399,129400,14,129404,129407,14,129432,129442,14,129454,129455,14,129473,129474,14,129485,129487,14,129648,129651,14,129659,129660,14,129671,129679,14,129709,129711,14,129728,129730,14,129751,129753,14,129776,129782,14,917505,917505,4,917760,917999,5,10,10,3,127,159,4,768,879,5,1471,1471,5,1536,1541,1,1648,1648,5,1767,1768,5,1840,1866,5,2070,2073,5,2137,2139,5,2274,2274,1,2363,2363,7,2377,2380,7,2402,2403,5,2494,2494,5,2507,2508,7,2558,2558,5,2622,2624,7,2641,2641,5,2691,2691,7,2759,2760,5,2786,2787,5,2876,2876,5,2881,2884,5,2901,2902,5,3006,3006,5,3014,3016,7,3072,3072,5,3134,3136,5,3157,3158,5,3260,3260,5,3266,3266,5,3274,3275,7,3328,3329,5,3391,3392,7,3405,3405,5,3457,3457,5,3536,3537,7,3551,3551,5,3636,3642,5,3764,3772,5,3895,3895,5,3967,3967,7,3993,4028,5,4146,4151,5,4182,4183,7,4226,4226,5,4253,4253,5,4957,4959,5,5940,5940,7,6070,6070,7,6087,6088,7,6158,6158,4,6432,6434,5,6448,6449,7,6679,6680,5,6742,6742,5,6754,6754,5,6783,6783,5,6912,6915,5,6966,6970,5,6978,6978,5,7042,7042,7,7080,7081,5,7143,7143,7,7150,7150,7,7212,7219,5,7380,7392,5,7412,7412,5,8203,8203,4,8232,8232,4,8265,8265,14,8400,8412,5,8421,8432,5,8617,8618,14,9167,9167,14,9200,9200,14,9410,9410,14,9723,9726,14,9733,9733,14,9745,9745,14,9752,9752,14,9760,9760,14,9766,9766,14,9774,9774,14,9786,9786,14,9794,9794,14,9823,9823,14,9828,9828,14,9833,9850,14,9855,9855,14,9875,9875,14,9880,9880,14,9885,9887,14,9896,9897,14,9906,9916,14,9926,9927,14,9935,9935,14,9939,9939,14,9962,9962,14,9972,9972,14,9978,9978,14,9986,9986,14,9997,9997,14,10002,10002,14,10017,10017,14,10055,10055,14,10071,10071,14,10133,10135,14,10548,10549,14,11093,11093,14,12330,12333,5,12441,12442,5,42608,42610,5,43010,43010,5,43045,43046,5,43188,43203,7,43302,43309,5,43392,43394,5,43446,43449,5,43493,43493,5,43571,43572,7,43597,43597,7,43703,43704,5,43756,43757,5,44003,44004,7,44009,44010,7,44033,44059,12,44089,44115,12,44145,44171,12,44201,44227,12,44257,44283,12,44313,44339,12,44369,44395,12,44425,44451,12,44481,44507,12,44537,44563,12,44593,44619,12,44649,44675,12,44705,44731,12,44761,44787,12,44817,44843,12,44873,44899,12,44929,44955,12,44985,45011,12,45041,45067,12,45097,45123,12,45153,45179,12,45209,45235,12,45265,45291,12,45321,45347,12,45377,45403,12,45433,45459,12,45489,45515,12,45545,45571,12,45601,45627,12,45657,45683,12,45713,45739,12,45769,45795,12,45825,45851,12,45881,45907,12,45937,45963,12,45993,46019,12,46049,46075,12,46105,46131,12,46161,46187,12,46217,46243,12,46273,46299,12,46329,46355,12,46385,46411,12,46441,46467,12,46497,46523,12,46553,46579,12,46609,46635,12,46665,46691,12,46721,46747,12,46777,46803,12,46833,46859,12,46889,46915,12,46945,46971,12,47001,47027,12,47057,47083,12,47113,47139,12,47169,47195,12,47225,47251,12,47281,47307,12,47337,47363,12,47393,47419,12,47449,47475,12,47505,47531,12,47561,47587,12,47617,47643,12,47673,47699,12,47729,47755,12,47785,47811,12,47841,47867,12,47897,47923,12,47953,47979,12,48009,48035,12,48065,48091,12,48121,48147,12,48177,48203,12,48233,48259,12,48289,48315,12,48345,48371,12,48401,48427,12,48457,48483,12,48513,48539,12,48569,48595,12,48625,48651,12,48681,48707,12,48737,48763,12,48793,48819,12,48849,48875,12,48905,48931,12,48961,48987,12,49017,49043,12,49073,49099,12,49129,49155,12,49185,49211,12,49241,49267,12,49297,49323,12,49353,49379,12,49409,49435,12,49465,49491,12,49521,49547,12,49577,49603,12,49633,49659,12,49689,49715,12,49745,49771,12,49801,49827,12,49857,49883,12,49913,49939,12,49969,49995,12,50025,50051,12,50081,50107,12,50137,50163,12,50193,50219,12,50249,50275,12,50305,50331,12,50361,50387,12,50417,50443,12,50473,50499,12,50529,50555,12,50585,50611,12,50641,50667,12,50697,50723,12,50753,50779,12,50809,50835,12,50865,50891,12,50921,50947,12,50977,51003,12,51033,51059,12,51089,51115,12,51145,51171,12,51201,51227,12,51257,51283,12,51313,51339,12,51369,51395,12,51425,51451,12,51481,51507,12,51537,51563,12,51593,51619,12,51649,51675,12,51705,51731,12,51761,51787,12,51817,51843,12,51873,51899,12,51929,51955,12,51985,52011,12,52041,52067,12,52097,52123,12,52153,52179,12,52209,52235,12,52265,52291,12,52321,52347,12,52377,52403,12,52433,52459,12,52489,52515,12,52545,52571,12,52601,52627,12,52657,52683,12,52713,52739,12,52769,52795,12,52825,52851,12,52881,52907,12,52937,52963,12,52993,53019,12,53049,53075,12,53105,53131,12,53161,53187,12,53217,53243,12,53273,53299,12,53329,53355,12,53385,53411,12,53441,53467,12,53497,53523,12,53553,53579,12,53609,53635,12,53665,53691,12,53721,53747,12,53777,53803,12,53833,53859,12,53889,53915,12,53945,53971,12,54001,54027,12,54057,54083,12,54113,54139,12,54169,54195,12,54225,54251,12,54281,54307,12,54337,54363,12,54393,54419,12,54449,54475,12,54505,54531,12,54561,54587,12,54617,54643,12,54673,54699,12,54729,54755,12,54785,54811,12,54841,54867,12,54897,54923,12,54953,54979,12,55009,55035,12,55065,55091,12,55121,55147,12,55177,55203,12,65024,65039,5,65520,65528,4,66422,66426,5,68152,68154,5,69291,69292,5,69633,69633,5,69747,69748,5,69811,69814,5,69826,69826,5,69932,69932,7,70016,70017,5,70079,70080,7,70095,70095,5,70196,70196,5,70367,70367,5,70402,70403,7,70464,70464,5,70487,70487,5,70709,70711,7,70725,70725,7,70833,70834,7,70843,70844,7,70849,70849,7,71090,71093,5,71103,71104,5,71227,71228,7,71339,71339,5,71344,71349,5,71458,71461,5,71727,71735,5,71985,71989,7,71998,71998,5,72002,72002,7,72154,72155,5,72193,72202,5,72251,72254,5,72281,72283,5,72344,72345,5,72766,72766,7,72874,72880,5,72885,72886,5,73023,73029,5,73104,73105,5,73111,73111,5,92912,92916,5,94095,94098,5,113824,113827,4,119142,119142,7,119155,119162,4,119362,119364,5,121476,121476,5,122888,122904,5,123184,123190,5,125252,125258,5,127183,127183,14,127340,127343,14,127377,127386,14,127491,127503,14,127548,127551,14,127744,127756,14,127761,127761,14,127769,127769,14,127773,127774,14,127780,127788,14,127796,127797,14,127820,127823,14,127869,127869,14,127894,127895,14,127902,127903,14,127943,127943,14,127947,127950,14,127972,127972,14,127988,127988,14,127992,127994,14,128009,128011,14,128019,128019,14,128023,128041,14,128064,128064,14,128102,128107,14,128174,128181,14,128238,128238,14,128246,128247,14,128254,128254,14,128264,128264,14,128278,128299,14,128329,128330,14,128348,128359,14,128371,128377,14,128392,128393,14,128401,128404,14,128421,128421,14,128433,128434,14,128450,128452,14,128476,128478,14,128483,128483,14,128495,128495,14,128506,128506,14,128519,128520,14,128528,128528,14,128534,128534,14,128538,128538,14,128540,128542,14,128544,128549,14,128552,128555,14,128557,128557,14,128560,128563,14,128565,128565,14,128567,128576,14,128581,128591,14,128641,128642,14,128646,128646,14,128648,128648,14,128650,128651,14,128653,128653,14,128655,128655,14,128657,128659,14,128661,128661,14,128663,128663,14,128665,128666,14,128674,128674,14,128676,128677,14,128679,128685,14,128690,128690,14,128694,128694,14,128697,128702,14,128704,128704,14,128710,128714,14,128716,128716,14,128720,128720,14,128723,128724,14,128726,128727,14,128733,128735,14,128742,128744,14,128746,128746,14,128749,128751,14,128753,128754,14,128756,128758,14,128761,128761,14,128763,128764,14,128884,128895,14,128992,129003,14,129008,129008,14,129036,129039,14,129114,129119,14,129198,129279,14,129293,129295,14,129305,129310,14,129312,129319,14,129328,129328,14,129331,129338,14,129343,129343,14,129351,129355,14,129357,129359,14,129375,129387,14,129393,129393,14,129395,129398,14,129401,129401,14,129403,129403,14,129408,129412,14,129426,129431,14,129443,129444,14,129451,129453,14,129456,129465,14,129472,129472,14,129475,129482,14,129484,129484,14,129488,129510,14,129536,129647,14,129652,129652,14,129656,129658,14,129661,129663,14,129667,129670,14,129680,129685,14,129705,129708,14,129712,129718,14,129723,129727,14,129731,129733,14,129744,129750,14,129754,129759,14,129768,129775,14,129783,129791,14,917504,917504,4,917506,917535,4,917632,917759,4,918000,921599,4,0,9,4,11,12,4,14,31,4,169,169,14,174,174,14,1155,1159,5,1425,1469,5,1473,1474,5,1479,1479,5,1552,1562,5,1611,1631,5,1750,1756,5,1759,1764,5,1770,1773,5,1809,1809,5,1958,1968,5,2045,2045,5,2075,2083,5,2089,2093,5,2192,2193,1,2250,2273,5,2275,2306,5,2362,2362,5,2364,2364,5,2369,2376,5,2381,2381,5,2385,2391,5,2433,2433,5,2492,2492,5,2495,2496,7,2503,2504,7,2509,2509,5,2530,2531,5,2561,2562,5,2620,2620,5,2625,2626,5,2635,2637,5,2672,2673,5,2689,2690,5,2748,2748,5,2753,2757,5,2761,2761,7,2765,2765,5,2810,2815,5,2818,2819,7,2878,2878,5,2880,2880,7,2887,2888,7,2893,2893,5,2903,2903,5,2946,2946,5,3007,3007,7,3009,3010,7,3018,3020,7,3031,3031,5,3073,3075,7,3132,3132,5,3137,3140,7,3146,3149,5,3170,3171,5,3202,3203,7,3262,3262,7,3264,3265,7,3267,3268,7,3271,3272,7,3276,3277,5,3298,3299,5,3330,3331,7,3390,3390,5,3393,3396,5,3402,3404,7,3406,3406,1,3426,3427,5,3458,3459,7,3535,3535,5,3538,3540,5,3544,3550,7,3570,3571,7,3635,3635,7,3655,3662,5,3763,3763,7,3784,3789,5,3893,3893,5,3897,3897,5,3953,3966,5,3968,3972,5,3981,3991,5,4038,4038,5,4145,4145,7,4153,4154,5,4157,4158,5,4184,4185,5,4209,4212,5,4228,4228,7,4237,4237,5,4352,4447,8,4520,4607,10,5906,5908,5,5938,5939,5,5970,5971,5,6068,6069,5,6071,6077,5,6086,6086,5,6089,6099,5,6155,6157,5,6159,6159,5,6313,6313,5,6435,6438,7,6441,6443,7,6450,6450,5,6457,6459,5,6681,6682,7,6741,6741,7,6743,6743,7,6752,6752,5,6757,6764,5,6771,6780,5,6832,6845,5,6847,6862,5,6916,6916,7,6965,6965,5,6971,6971,7,6973,6977,7,6979,6980,7,7040,7041,5,7073,7073,7,7078,7079,7,7082,7082,7,7142,7142,5,7144,7145,5,7149,7149,5,7151,7153,5,7204,7211,7,7220,7221,7,7376,7378,5,7393,7393,7,7405,7405,5,7415,7415,7,7616,7679,5,8204,8204,5,8206,8207,4,8233,8233,4,8252,8252,14,8288,8292,4,8294,8303,4,8413,8416,5,8418,8420,5,8482,8482,14,8596,8601,14,8986,8987,14,9096,9096,14,9193,9196,14,9199,9199,14,9201,9202,14,9208,9210,14,9642,9643,14,9664,9664,14,9728,9729,14,9732,9732,14,9735,9741,14,9743,9744,14,9746,9746,14,9750,9751,14,9753,9756,14,9758,9759,14,9761,9761,14,9764,9765,14,9767,9769,14,9771,9773,14,9775,9775,14,9784,9785,14,9787,9791,14,9793,9793,14,9795,9799,14,9812,9822,14,9824,9824,14,9827,9827,14,9829,9830,14,9832,9832,14,9851,9851,14,9854,9854,14,9856,9861,14,9874,9874,14,9876,9876,14,9878,9879,14,9881,9881,14,9883,9884,14,9888,9889,14,9895,9895,14,9898,9899,14,9904,9905,14,9917,9918,14,9924,9925,14,9928,9928,14,9934,9934,14,9936,9936,14,9938,9938,14,9940,9940,14,9961,9961,14,9963,9967,14,9970,9971,14,9973,9973,14,9975,9977,14,9979,9980,14,9982,9985,14,9987,9988,14,9992,9996,14,9998,9998,14,10000,10001,14,10004,10004,14,10013,10013,14,10024,10024,14,10052,10052,14,10060,10060,14,10067,10069,14,10083,10083,14,10085,10087,14,10145,10145,14,10175,10175,14,11013,11015,14,11088,11088,14,11503,11505,5,11744,11775,5,12334,12335,5,12349,12349,14,12951,12951,14,42607,42607,5,42612,42621,5,42736,42737,5,43014,43014,5,43043,43044,7,43047,43047,7,43136,43137,7,43204,43205,5,43263,43263,5,43335,43345,5,43360,43388,8,43395,43395,7,43444,43445,7,43450,43451,7,43454,43456,7,43561,43566,5,43569,43570,5,43573,43574,5,43596,43596,5,43644,43644,5,43698,43700,5,43710,43711,5,43755,43755,7,43758,43759,7,43766,43766,5,44005,44005,5,44008,44008,5,44012,44012,7,44032,44032,11,44060,44060,11,44088,44088,11,44116,44116,11,44144,44144,11,44172,44172,11,44200,44200,11,44228,44228,11,44256,44256,11,44284,44284,11,44312,44312,11,44340,44340,11,44368,44368,11,44396,44396,11,44424,44424,11,44452,44452,11,44480,44480,11,44508,44508,11,44536,44536,11,44564,44564,11,44592,44592,11,44620,44620,11,44648,44648,11,44676,44676,11,44704,44704,11,44732,44732,11,44760,44760,11,44788,44788,11,44816,44816,11,44844,44844,11,44872,44872,11,44900,44900,11,44928,44928,11,44956,44956,11,44984,44984,11,45012,45012,11,45040,45040,11,45068,45068,11,45096,45096,11,45124,45124,11,45152,45152,11,45180,45180,11,45208,45208,11,45236,45236,11,45264,45264,11,45292,45292,11,45320,45320,11,45348,45348,11,45376,45376,11,45404,45404,11,45432,45432,11,45460,45460,11,45488,45488,11,45516,45516,11,45544,45544,11,45572,45572,11,45600,45600,11,45628,45628,11,45656,45656,11,45684,45684,11,45712,45712,11,45740,45740,11,45768,45768,11,45796,45796,11,45824,45824,11,45852,45852,11,45880,45880,11,45908,45908,11,45936,45936,11,45964,45964,11,45992,45992,11,46020,46020,11,46048,46048,11,46076,46076,11,46104,46104,11,46132,46132,11,46160,46160,11,46188,46188,11,46216,46216,11,46244,46244,11,46272,46272,11,46300,46300,11,46328,46328,11,46356,46356,11,46384,46384,11,46412,46412,11,46440,46440,11,46468,46468,11,46496,46496,11,46524,46524,11,46552,46552,11,46580,46580,11,46608,46608,11,46636,46636,11,46664,46664,11,46692,46692,11,46720,46720,11,46748,46748,11,46776,46776,11,46804,46804,11,46832,46832,11,46860,46860,11,46888,46888,11,46916,46916,11,46944,46944,11,46972,46972,11,47000,47000,11,47028,47028,11,47056,47056,11,47084,47084,11,47112,47112,11,47140,47140,11,47168,47168,11,47196,47196,11,47224,47224,11,47252,47252,11,47280,47280,11,47308,47308,11,47336,47336,11,47364,47364,11,47392,47392,11,47420,47420,11,47448,47448,11,47476,47476,11,47504,47504,11,47532,47532,11,47560,47560,11,47588,47588,11,47616,47616,11,47644,47644,11,47672,47672,11,47700,47700,11,47728,47728,11,47756,47756,11,47784,47784,11,47812,47812,11,47840,47840,11,47868,47868,11,47896,47896,11,47924,47924,11,47952,47952,11,47980,47980,11,48008,48008,11,48036,48036,11,48064,48064,11,48092,48092,11,48120,48120,11,48148,48148,11,48176,48176,11,48204,48204,11,48232,48232,11,48260,48260,11,48288,48288,11,48316,48316,11,48344,48344,11,48372,48372,11,48400,48400,11,48428,48428,11,48456,48456,11,48484,48484,11,48512,48512,11,48540,48540,11,48568,48568,11,48596,48596,11,48624,48624,11,48652,48652,11,48680,48680,11,48708,48708,11,48736,48736,11,48764,48764,11,48792,48792,11,48820,48820,11,48848,48848,11,48876,48876,11,48904,48904,11,48932,48932,11,48960,48960,11,48988,48988,11,49016,49016,11,49044,49044,11,49072,49072,11,49100,49100,11,49128,49128,11,49156,49156,11,49184,49184,11,49212,49212,11,49240,49240,11,49268,49268,11,49296,49296,11,49324,49324,11,49352,49352,11,49380,49380,11,49408,49408,11,49436,49436,11,49464,49464,11,49492,49492,11,49520,49520,11,49548,49548,11,49576,49576,11,49604,49604,11,49632,49632,11,49660,49660,11,49688,49688,11,49716,49716,11,49744,49744,11,49772,49772,11,49800,49800,11,49828,49828,11,49856,49856,11,49884,49884,11,49912,49912,11,49940,49940,11,49968,49968,11,49996,49996,11,50024,50024,11,50052,50052,11,50080,50080,11,50108,50108,11,50136,50136,11,50164,50164,11,50192,50192,11,50220,50220,11,50248,50248,11,50276,50276,11,50304,50304,11,50332,50332,11,50360,50360,11,50388,50388,11,50416,50416,11,50444,50444,11,50472,50472,11,50500,50500,11,50528,50528,11,50556,50556,11,50584,50584,11,50612,50612,11,50640,50640,11,50668,50668,11,50696,50696,11,50724,50724,11,50752,50752,11,50780,50780,11,50808,50808,11,50836,50836,11,50864,50864,11,50892,50892,11,50920,50920,11,50948,50948,11,50976,50976,11,51004,51004,11,51032,51032,11,51060,51060,11,51088,51088,11,51116,51116,11,51144,51144,11,51172,51172,11,51200,51200,11,51228,51228,11,51256,51256,11,51284,51284,11,51312,51312,11,51340,51340,11,51368,51368,11,51396,51396,11,51424,51424,11,51452,51452,11,51480,51480,11,51508,51508,11,51536,51536,11,51564,51564,11,51592,51592,11,51620,51620,11,51648,51648,11,51676,51676,11,51704,51704,11,51732,51732,11,51760,51760,11,51788,51788,11,51816,51816,11,51844,51844,11,51872,51872,11,51900,51900,11,51928,51928,11,51956,51956,11,51984,51984,11,52012,52012,11,52040,52040,11,52068,52068,11,52096,52096,11,52124,52124,11,52152,52152,11,52180,52180,11,52208,52208,11,52236,52236,11,52264,52264,11,52292,52292,11,52320,52320,11,52348,52348,11,52376,52376,11,52404,52404,11,52432,52432,11,52460,52460,11,52488,52488,11,52516,52516,11,52544,52544,11,52572,52572,11,52600,52600,11,52628,52628,11,52656,52656,11,52684,52684,11,52712,52712,11,52740,52740,11,52768,52768,11,52796,52796,11,52824,52824,11,52852,52852,11,52880,52880,11,52908,52908,11,52936,52936,11,52964,52964,11,52992,52992,11,53020,53020,11,53048,53048,11,53076,53076,11,53104,53104,11,53132,53132,11,53160,53160,11,53188,53188,11,53216,53216,11,53244,53244,11,53272,53272,11,53300,53300,11,53328,53328,11,53356,53356,11,53384,53384,11,53412,53412,11,53440,53440,11,53468,53468,11,53496,53496,11,53524,53524,11,53552,53552,11,53580,53580,11,53608,53608,11,53636,53636,11,53664,53664,11,53692,53692,11,53720,53720,11,53748,53748,11,53776,53776,11,53804,53804,11,53832,53832,11,53860,53860,11,53888,53888,11,53916,53916,11,53944,53944,11,53972,53972,11,54000,54000,11,54028,54028,11,54056,54056,11,54084,54084,11,54112,54112,11,54140,54140,11,54168,54168,11,54196,54196,11,54224,54224,11,54252,54252,11,54280,54280,11,54308,54308,11,54336,54336,11,54364,54364,11,54392,54392,11,54420,54420,11,54448,54448,11,54476,54476,11,54504,54504,11,54532,54532,11,54560,54560,11,54588,54588,11,54616,54616,11,54644,54644,11,54672,54672,11,54700,54700,11,54728,54728,11,54756,54756,11,54784,54784,11,54812,54812,11,54840,54840,11,54868,54868,11,54896,54896,11,54924,54924,11,54952,54952,11,54980,54980,11,55008,55008,11,55036,55036,11,55064,55064,11,55092,55092,11,55120,55120,11,55148,55148,11,55176,55176,11,55216,55238,9,64286,64286,5,65056,65071,5,65438,65439,5,65529,65531,4,66272,66272,5,68097,68099,5,68108,68111,5,68159,68159,5,68900,68903,5,69446,69456,5,69632,69632,7,69634,69634,7,69744,69744,5,69759,69761,5,69808,69810,7,69815,69816,7,69821,69821,1,69837,69837,1,69927,69931,5,69933,69940,5,70003,70003,5,70018,70018,7,70070,70078,5,70082,70083,1,70094,70094,7,70188,70190,7,70194,70195,7,70197,70197,7,70206,70206,5,70368,70370,7,70400,70401,5,70459,70460,5,70463,70463,7,70465,70468,7,70475,70477,7,70498,70499,7,70512,70516,5,70712,70719,5,70722,70724,5,70726,70726,5,70832,70832,5,70835,70840,5,70842,70842,5,70845,70845,5,70847,70848,5,70850,70851,5,71088,71089,7,71096,71099,7,71102,71102,7,71132,71133,5,71219,71226,5,71229,71229,5,71231,71232,5,71340,71340,7,71342,71343,7,71350,71350,7,71453,71455,5,71462,71462,7,71724,71726,7,71736,71736,7,71984,71984,5,71991,71992,7,71997,71997,7,71999,71999,1,72001,72001,1,72003,72003,5,72148,72151,5,72156,72159,7,72164,72164,7,72243,72248,5,72250,72250,1,72263,72263,5,72279,72280,7,72324,72329,1,72343,72343,7,72751,72751,7,72760,72765,5,72767,72767,5,72873,72873,7,72881,72881,7,72884,72884,7,73009,73014,5,73020,73021,5,73030,73030,1,73098,73102,7,73107,73108,7,73110,73110,7,73459,73460,5,78896,78904,4,92976,92982,5,94033,94087,7,94180,94180,5,113821,113822,5,118528,118573,5,119141,119141,5,119143,119145,5,119150,119154,5,119163,119170,5,119210,119213,5,121344,121398,5,121461,121461,5,121499,121503,5,122880,122886,5,122907,122913,5,122918,122922,5,123566,123566,5,125136,125142,5,126976,126979,14,126981,127182,14,127184,127231,14,127279,127279,14,127344,127345,14,127374,127374,14,127405,127461,14,127489,127490,14,127514,127514,14,127538,127546,14,127561,127567,14,127570,127743,14,127757,127758,14,127760,127760,14,127762,127762,14,127766,127768,14,127770,127770,14,127772,127772,14,127775,127776,14,127778,127779,14,127789,127791,14,127794,127795,14,127798,127798,14,127819,127819,14,127824,127824,14,127868,127868,14,127870,127871,14,127892,127893,14,127896,127896,14,127900,127901,14,127904,127940,14,127942,127942,14,127944,127944,14,127946,127946,14,127951,127955,14,127968,127971,14,127973,127984,14,127987,127987,14,127989,127989,14,127991,127991,14,127995,127999,5,128008,128008,14,128012,128014,14,128017,128018,14,128020,128020,14,128022,128022,14,128042,128042,14,128063,128063,14,128065,128065,14,128101,128101,14,128108,128109,14,128173,128173,14,128182,128183,14,128236,128237,14,128239,128239,14,128245,128245,14,128248,128248,14,128253,128253,14,128255,128258,14,128260,128263,14,128265,128265,14,128277,128277,14,128300,128301,14,128326,128328,14,128331,128334,14,128336,128347,14,128360,128366,14,128369,128370,14,128378,128378,14,128391,128391,14,128394,128397,14,128400,128400,14,128405,128406,14,128420,128420,14,128422,128423,14,128425,128432,14,128435,128443,14,128445,128449,14,128453,128464,14,128468,128475,14,128479,128480,14,128482,128482,14,128484,128487,14,128489,128494,14,128496,128498,14,128500,128505,14,128507,128511,14,128513,128518,14,128521,128525,14,128527,128527,14,128529,128529,14,128533,128533,14,128535,128535,14,128537,128537,14]");
}
__name(getGraphemeBreakRawData, "getGraphemeBreakRawData");
function getLeftDeleteOffset(offset, str) {
  if (offset === 0) {
    return 0;
  }
  const emojiOffset = getOffsetBeforeLastEmojiComponent(offset, str);
  if (emojiOffset !== void 0) {
    return emojiOffset;
  }
  const iterator = new CodePointIterator(str, offset);
  iterator.prevCodePoint();
  return iterator.offset;
}
__name(getLeftDeleteOffset, "getLeftDeleteOffset");
function getOffsetBeforeLastEmojiComponent(initialOffset, str) {
  const iterator = new CodePointIterator(str, initialOffset);
  let codePoint = iterator.prevCodePoint();
  while (isEmojiModifier(codePoint) || codePoint === 65039 || codePoint === 8419) {
    if (iterator.offset === 0) {
      return void 0;
    }
    codePoint = iterator.prevCodePoint();
  }
  if (!isEmojiImprecise(codePoint)) {
    return void 0;
  }
  let resultOffset = iterator.offset;
  if (resultOffset > 0) {
    const optionalZwjCodePoint = iterator.prevCodePoint();
    if (optionalZwjCodePoint === 8205) {
      resultOffset = iterator.offset;
    }
  }
  return resultOffset;
}
__name(getOffsetBeforeLastEmojiComponent, "getOffsetBeforeLastEmojiComponent");
function isEmojiModifier(codePoint) {
  return 127995 <= codePoint && codePoint <= 127999;
}
__name(isEmojiModifier, "isEmojiModifier");
var CodePoint;
(function(CodePoint2) {
  CodePoint2[CodePoint2["zwj"] = 8205] = "zwj";
  CodePoint2[CodePoint2["emojiVariantSelector"] = 65039] = "emojiVariantSelector";
  CodePoint2[CodePoint2["enclosingKeyCap"] = 8419] = "enclosingKeyCap";
  CodePoint2[CodePoint2["space"] = 32] = "space";
})(CodePoint || (CodePoint = {}));
var noBreakWhitespace = "\xA0";
var AmbiguousCharacters = class _AmbiguousCharacters {
  static {
    __name(this, "AmbiguousCharacters");
  }
  static {
    this.ambiguousCharacterData = new Lazy(() => {
      return JSON.parse('{"_common":[8232,32,8233,32,5760,32,8192,32,8193,32,8194,32,8195,32,8196,32,8197,32,8198,32,8200,32,8201,32,8202,32,8287,32,8199,32,8239,32,2042,95,65101,95,65102,95,65103,95,8208,45,8209,45,8210,45,65112,45,1748,45,8259,45,727,45,8722,45,10134,45,11450,45,1549,44,1643,44,184,44,42233,44,894,59,2307,58,2691,58,1417,58,1795,58,1796,58,5868,58,65072,58,6147,58,6153,58,8282,58,1475,58,760,58,42889,58,8758,58,720,58,42237,58,451,33,11601,33,660,63,577,63,2429,63,5038,63,42731,63,119149,46,8228,46,1793,46,1794,46,42510,46,68176,46,1632,46,1776,46,42232,46,1373,96,65287,96,8219,96,1523,96,8242,96,1370,96,8175,96,65344,96,900,96,8189,96,8125,96,8127,96,8190,96,697,96,884,96,712,96,714,96,715,96,756,96,699,96,701,96,700,96,702,96,42892,96,1497,96,2036,96,2037,96,5194,96,5836,96,94033,96,94034,96,65339,91,10088,40,10098,40,12308,40,64830,40,65341,93,10089,41,10099,41,12309,41,64831,41,10100,123,119060,123,10101,125,65342,94,8270,42,1645,42,8727,42,66335,42,5941,47,8257,47,8725,47,8260,47,9585,47,10187,47,10744,47,119354,47,12755,47,12339,47,11462,47,20031,47,12035,47,65340,92,65128,92,8726,92,10189,92,10741,92,10745,92,119311,92,119355,92,12756,92,20022,92,12034,92,42872,38,708,94,710,94,5869,43,10133,43,66203,43,8249,60,10094,60,706,60,119350,60,5176,60,5810,60,5120,61,11840,61,12448,61,42239,61,8250,62,10095,62,707,62,119351,62,5171,62,94015,62,8275,126,732,126,8128,126,8764,126,65372,124,65293,45,118002,50,120784,50,120794,50,120804,50,120814,50,120824,50,130034,50,42842,50,423,50,1000,50,42564,50,5311,50,42735,50,119302,51,118003,51,120785,51,120795,51,120805,51,120815,51,120825,51,130035,51,42923,51,540,51,439,51,42858,51,11468,51,1248,51,94011,51,71882,51,118004,52,120786,52,120796,52,120806,52,120816,52,120826,52,130036,52,5070,52,71855,52,118005,53,120787,53,120797,53,120807,53,120817,53,120827,53,130037,53,444,53,71867,53,118006,54,120788,54,120798,54,120808,54,120818,54,120828,54,130038,54,11474,54,5102,54,71893,54,119314,55,118007,55,120789,55,120799,55,120809,55,120819,55,120829,55,130039,55,66770,55,71878,55,2819,56,2538,56,2666,56,125131,56,118008,56,120790,56,120800,56,120810,56,120820,56,120830,56,130040,56,547,56,546,56,66330,56,2663,57,2920,57,2541,57,3437,57,118009,57,120791,57,120801,57,120811,57,120821,57,120831,57,130041,57,42862,57,11466,57,71884,57,71852,57,71894,57,9082,97,65345,97,119834,97,119886,97,119938,97,119990,97,120042,97,120094,97,120146,97,120198,97,120250,97,120302,97,120354,97,120406,97,120458,97,593,97,945,97,120514,97,120572,97,120630,97,120688,97,120746,97,65313,65,117974,65,119808,65,119860,65,119912,65,119964,65,120016,65,120068,65,120120,65,120172,65,120224,65,120276,65,120328,65,120380,65,120432,65,913,65,120488,65,120546,65,120604,65,120662,65,120720,65,5034,65,5573,65,42222,65,94016,65,66208,65,119835,98,119887,98,119939,98,119991,98,120043,98,120095,98,120147,98,120199,98,120251,98,120303,98,120355,98,120407,98,120459,98,388,98,5071,98,5234,98,5551,98,65314,66,8492,66,117975,66,119809,66,119861,66,119913,66,120017,66,120069,66,120121,66,120173,66,120225,66,120277,66,120329,66,120381,66,120433,66,42932,66,914,66,120489,66,120547,66,120605,66,120663,66,120721,66,5108,66,5623,66,42192,66,66178,66,66209,66,66305,66,65347,99,8573,99,119836,99,119888,99,119940,99,119992,99,120044,99,120096,99,120148,99,120200,99,120252,99,120304,99,120356,99,120408,99,120460,99,7428,99,1010,99,11429,99,43951,99,66621,99,128844,67,71913,67,71922,67,65315,67,8557,67,8450,67,8493,67,117976,67,119810,67,119862,67,119914,67,119966,67,120018,67,120174,67,120226,67,120278,67,120330,67,120382,67,120434,67,1017,67,11428,67,5087,67,42202,67,66210,67,66306,67,66581,67,66844,67,8574,100,8518,100,119837,100,119889,100,119941,100,119993,100,120045,100,120097,100,120149,100,120201,100,120253,100,120305,100,120357,100,120409,100,120461,100,1281,100,5095,100,5231,100,42194,100,8558,68,8517,68,117977,68,119811,68,119863,68,119915,68,119967,68,120019,68,120071,68,120123,68,120175,68,120227,68,120279,68,120331,68,120383,68,120435,68,5024,68,5598,68,5610,68,42195,68,8494,101,65349,101,8495,101,8519,101,119838,101,119890,101,119942,101,120046,101,120098,101,120150,101,120202,101,120254,101,120306,101,120358,101,120410,101,120462,101,43826,101,1213,101,8959,69,65317,69,8496,69,117978,69,119812,69,119864,69,119916,69,120020,69,120072,69,120124,69,120176,69,120228,69,120280,69,120332,69,120384,69,120436,69,917,69,120492,69,120550,69,120608,69,120666,69,120724,69,11577,69,5036,69,42224,69,71846,69,71854,69,66182,69,119839,102,119891,102,119943,102,119995,102,120047,102,120099,102,120151,102,120203,102,120255,102,120307,102,120359,102,120411,102,120463,102,43829,102,42905,102,383,102,7837,102,1412,102,119315,70,8497,70,117979,70,119813,70,119865,70,119917,70,120021,70,120073,70,120125,70,120177,70,120229,70,120281,70,120333,70,120385,70,120437,70,42904,70,988,70,120778,70,5556,70,42205,70,71874,70,71842,70,66183,70,66213,70,66853,70,65351,103,8458,103,119840,103,119892,103,119944,103,120048,103,120100,103,120152,103,120204,103,120256,103,120308,103,120360,103,120412,103,120464,103,609,103,7555,103,397,103,1409,103,117980,71,119814,71,119866,71,119918,71,119970,71,120022,71,120074,71,120126,71,120178,71,120230,71,120282,71,120334,71,120386,71,120438,71,1292,71,5056,71,5107,71,42198,71,65352,104,8462,104,119841,104,119945,104,119997,104,120049,104,120101,104,120153,104,120205,104,120257,104,120309,104,120361,104,120413,104,120465,104,1211,104,1392,104,5058,104,65320,72,8459,72,8460,72,8461,72,117981,72,119815,72,119867,72,119919,72,120023,72,120179,72,120231,72,120283,72,120335,72,120387,72,120439,72,919,72,120494,72,120552,72,120610,72,120668,72,120726,72,11406,72,5051,72,5500,72,42215,72,66255,72,731,105,9075,105,65353,105,8560,105,8505,105,8520,105,119842,105,119894,105,119946,105,119998,105,120050,105,120102,105,120154,105,120206,105,120258,105,120310,105,120362,105,120414,105,120466,105,120484,105,618,105,617,105,953,105,8126,105,890,105,120522,105,120580,105,120638,105,120696,105,120754,105,1110,105,42567,105,1231,105,43893,105,5029,105,71875,105,65354,106,8521,106,119843,106,119895,106,119947,106,119999,106,120051,106,120103,106,120155,106,120207,106,120259,106,120311,106,120363,106,120415,106,120467,106,1011,106,1112,106,65322,74,117983,74,119817,74,119869,74,119921,74,119973,74,120025,74,120077,74,120129,74,120181,74,120233,74,120285,74,120337,74,120389,74,120441,74,42930,74,895,74,1032,74,5035,74,5261,74,42201,74,119844,107,119896,107,119948,107,120000,107,120052,107,120104,107,120156,107,120208,107,120260,107,120312,107,120364,107,120416,107,120468,107,8490,75,65323,75,117984,75,119818,75,119870,75,119922,75,119974,75,120026,75,120078,75,120130,75,120182,75,120234,75,120286,75,120338,75,120390,75,120442,75,922,75,120497,75,120555,75,120613,75,120671,75,120729,75,11412,75,5094,75,5845,75,42199,75,66840,75,1472,108,8739,73,9213,73,65512,73,1633,108,1777,73,66336,108,125127,108,118001,108,120783,73,120793,73,120803,73,120813,73,120823,73,130033,73,65321,73,8544,73,8464,73,8465,73,117982,108,119816,73,119868,73,119920,73,120024,73,120128,73,120180,73,120232,73,120284,73,120336,73,120388,73,120440,73,65356,108,8572,73,8467,108,119845,108,119897,108,119949,108,120001,108,120053,108,120105,73,120157,73,120209,73,120261,73,120313,73,120365,73,120417,73,120469,73,448,73,120496,73,120554,73,120612,73,120670,73,120728,73,11410,73,1030,73,1216,73,1493,108,1503,108,1575,108,126464,108,126592,108,65166,108,65165,108,1994,108,11599,73,5825,73,42226,73,93992,73,66186,124,66313,124,119338,76,8556,76,8466,76,117985,76,119819,76,119871,76,119923,76,120027,76,120079,76,120131,76,120183,76,120235,76,120287,76,120339,76,120391,76,120443,76,11472,76,5086,76,5290,76,42209,76,93974,76,71843,76,71858,76,66587,76,66854,76,65325,77,8559,77,8499,77,117986,77,119820,77,119872,77,119924,77,120028,77,120080,77,120132,77,120184,77,120236,77,120288,77,120340,77,120392,77,120444,77,924,77,120499,77,120557,77,120615,77,120673,77,120731,77,1018,77,11416,77,5047,77,5616,77,5846,77,42207,77,66224,77,66321,77,119847,110,119899,110,119951,110,120003,110,120055,110,120107,110,120159,110,120211,110,120263,110,120315,110,120367,110,120419,110,120471,110,1400,110,1404,110,65326,78,8469,78,117987,78,119821,78,119873,78,119925,78,119977,78,120029,78,120081,78,120185,78,120237,78,120289,78,120341,78,120393,78,120445,78,925,78,120500,78,120558,78,120616,78,120674,78,120732,78,11418,78,42208,78,66835,78,3074,111,3202,111,3330,111,3458,111,2406,111,2662,111,2790,111,3046,111,3174,111,3302,111,3430,111,3664,111,3792,111,4160,111,1637,111,1781,111,65359,111,8500,111,119848,111,119900,111,119952,111,120056,111,120108,111,120160,111,120212,111,120264,111,120316,111,120368,111,120420,111,120472,111,7439,111,7441,111,43837,111,959,111,120528,111,120586,111,120644,111,120702,111,120760,111,963,111,120532,111,120590,111,120648,111,120706,111,120764,111,11423,111,4351,111,1413,111,1505,111,1607,111,126500,111,126564,111,126596,111,65259,111,65260,111,65258,111,65257,111,1726,111,64428,111,64429,111,64427,111,64426,111,1729,111,64424,111,64425,111,64423,111,64422,111,1749,111,3360,111,4125,111,66794,111,71880,111,71895,111,66604,111,1984,79,2534,79,2918,79,12295,79,70864,79,71904,79,118000,79,120782,79,120792,79,120802,79,120812,79,120822,79,130032,79,65327,79,117988,79,119822,79,119874,79,119926,79,119978,79,120030,79,120082,79,120134,79,120186,79,120238,79,120290,79,120342,79,120394,79,120446,79,927,79,120502,79,120560,79,120618,79,120676,79,120734,79,11422,79,1365,79,11604,79,4816,79,2848,79,66754,79,42227,79,71861,79,66194,79,66219,79,66564,79,66838,79,9076,112,65360,112,119849,112,119901,112,119953,112,120005,112,120057,112,120109,112,120161,112,120213,112,120265,112,120317,112,120369,112,120421,112,120473,112,961,112,120530,112,120544,112,120588,112,120602,112,120646,112,120660,112,120704,112,120718,112,120762,112,120776,112,11427,112,65328,80,8473,80,117989,80,119823,80,119875,80,119927,80,119979,80,120031,80,120083,80,120187,80,120239,80,120291,80,120343,80,120395,80,120447,80,929,80,120504,80,120562,80,120620,80,120678,80,120736,80,11426,80,5090,80,5229,80,42193,80,66197,80,119850,113,119902,113,119954,113,120006,113,120058,113,120110,113,120162,113,120214,113,120266,113,120318,113,120370,113,120422,113,120474,113,1307,113,1379,113,1382,113,8474,81,117990,81,119824,81,119876,81,119928,81,119980,81,120032,81,120084,81,120188,81,120240,81,120292,81,120344,81,120396,81,120448,81,11605,81,119851,114,119903,114,119955,114,120007,114,120059,114,120111,114,120163,114,120215,114,120267,114,120319,114,120371,114,120423,114,120475,114,43847,114,43848,114,7462,114,11397,114,43905,114,119318,82,8475,82,8476,82,8477,82,117991,82,119825,82,119877,82,119929,82,120033,82,120189,82,120241,82,120293,82,120345,82,120397,82,120449,82,422,82,5025,82,5074,82,66740,82,5511,82,42211,82,94005,82,65363,115,119852,115,119904,115,119956,115,120008,115,120060,115,120112,115,120164,115,120216,115,120268,115,120320,115,120372,115,120424,115,120476,115,42801,115,445,115,1109,115,43946,115,71873,115,66632,115,65331,83,117992,83,119826,83,119878,83,119930,83,119982,83,120034,83,120086,83,120138,83,120190,83,120242,83,120294,83,120346,83,120398,83,120450,83,1029,83,1359,83,5077,83,5082,83,42210,83,94010,83,66198,83,66592,83,119853,116,119905,116,119957,116,120009,116,120061,116,120113,116,120165,116,120217,116,120269,116,120321,116,120373,116,120425,116,120477,116,8868,84,10201,84,128872,84,65332,84,117993,84,119827,84,119879,84,119931,84,119983,84,120035,84,120087,84,120139,84,120191,84,120243,84,120295,84,120347,84,120399,84,120451,84,932,84,120507,84,120565,84,120623,84,120681,84,120739,84,11430,84,5026,84,42196,84,93962,84,71868,84,66199,84,66225,84,66325,84,119854,117,119906,117,119958,117,120010,117,120062,117,120114,117,120166,117,120218,117,120270,117,120322,117,120374,117,120426,117,120478,117,42911,117,7452,117,43854,117,43858,117,651,117,965,117,120534,117,120592,117,120650,117,120708,117,120766,117,1405,117,66806,117,71896,117,8746,85,8899,85,117994,85,119828,85,119880,85,119932,85,119984,85,120036,85,120088,85,120140,85,120192,85,120244,85,120296,85,120348,85,120400,85,120452,85,1357,85,4608,85,66766,85,5196,85,42228,85,94018,85,71864,85,8744,118,8897,118,65366,118,8564,118,119855,118,119907,118,119959,118,120011,118,120063,118,120115,118,120167,118,120219,118,120271,118,120323,118,120375,118,120427,118,120479,118,7456,118,957,118,120526,118,120584,118,120642,118,120700,118,120758,118,1141,118,1496,118,71430,118,43945,118,71872,118,119309,86,1639,86,1783,86,8548,86,117995,86,119829,86,119881,86,119933,86,119985,86,120037,86,120089,86,120141,86,120193,86,120245,86,120297,86,120349,86,120401,86,120453,86,1140,86,11576,86,5081,86,5167,86,42719,86,42214,86,93960,86,71840,86,66845,86,623,119,119856,119,119908,119,119960,119,120012,119,120064,119,120116,119,120168,119,120220,119,120272,119,120324,119,120376,119,120428,119,120480,119,7457,119,1121,119,1309,119,1377,119,71434,119,71438,119,71439,119,43907,119,71910,87,71919,87,117996,87,119830,87,119882,87,119934,87,119986,87,120038,87,120090,87,120142,87,120194,87,120246,87,120298,87,120350,87,120402,87,120454,87,1308,87,5043,87,5076,87,42218,87,5742,120,10539,120,10540,120,10799,120,65368,120,8569,120,119857,120,119909,120,119961,120,120013,120,120065,120,120117,120,120169,120,120221,120,120273,120,120325,120,120377,120,120429,120,120481,120,5441,120,5501,120,5741,88,9587,88,66338,88,71916,88,65336,88,8553,88,117997,88,119831,88,119883,88,119935,88,119987,88,120039,88,120091,88,120143,88,120195,88,120247,88,120299,88,120351,88,120403,88,120455,88,42931,88,935,88,120510,88,120568,88,120626,88,120684,88,120742,88,11436,88,11613,88,5815,88,42219,88,66192,88,66228,88,66327,88,66855,88,611,121,7564,121,65369,121,119858,121,119910,121,119962,121,120014,121,120066,121,120118,121,120170,121,120222,121,120274,121,120326,121,120378,121,120430,121,120482,121,655,121,7935,121,43866,121,947,121,8509,121,120516,121,120574,121,120632,121,120690,121,120748,121,1199,121,4327,121,71900,121,65337,89,117998,89,119832,89,119884,89,119936,89,119988,89,120040,89,120092,89,120144,89,120196,89,120248,89,120300,89,120352,89,120404,89,120456,89,933,89,978,89,120508,89,120566,89,120624,89,120682,89,120740,89,11432,89,1198,89,5033,89,5053,89,42220,89,94019,89,71844,89,66226,89,119859,122,119911,122,119963,122,120015,122,120067,122,120119,122,120171,122,120223,122,120275,122,120327,122,120379,122,120431,122,120483,122,7458,122,43923,122,71876,122,71909,90,66293,90,65338,90,8484,90,8488,90,117999,90,119833,90,119885,90,119937,90,119989,90,120041,90,120197,90,120249,90,120301,90,120353,90,120405,90,120457,90,918,90,120493,90,120551,90,120609,90,120667,90,120725,90,5059,90,42204,90,71849,90,65282,34,65283,35,65284,36,65285,37,65286,38,65290,42,65291,43,65294,46,65295,47,65296,48,65298,50,65299,51,65300,52,65301,53,65302,54,65303,55,65304,56,65305,57,65308,60,65309,61,65310,62,65312,64,65316,68,65318,70,65319,71,65324,76,65329,81,65330,82,65333,85,65334,86,65335,87,65343,95,65346,98,65348,100,65350,102,65355,107,65357,109,65358,110,65361,113,65362,114,65364,116,65365,117,65367,119,65370,122,65371,123,65373,125,119846,109],"_default":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"cs":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"de":[65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"es":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"fr":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"it":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ja":[8211,45,8218,44,65281,33,8216,96,8245,96,180,96,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65292,44,65297,49,65307,59],"ko":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pl":[65374,126,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pt-BR":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"qps-ploc":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ru":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,305,105,921,73,1009,112,215,120,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"tr":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"zh-hans":[160,32,65374,126,8218,44,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65297,49],"zh-hant":[8211,45,65374,126,8218,44,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89]}');
    });
  }
  static {
    this.cache = new LRUCachedFunction((localesStr) => {
      const locales = localesStr.split(",");
      function arrayToMap(arr) {
        const result = /* @__PURE__ */ new Map();
        for (let i = 0; i < arr.length; i += 2) {
          result.set(arr[i], arr[i + 1]);
        }
        return result;
      }
      __name(arrayToMap, "arrayToMap");
      function mergeMaps(map1, map2) {
        const result = new Map(map1);
        for (const [key, value] of map2) {
          result.set(key, value);
        }
        return result;
      }
      __name(mergeMaps, "mergeMaps");
      function intersectMaps(map1, map2) {
        if (!map1) {
          return map2;
        }
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of map1) {
          if (map2.has(key)) {
            result.set(key, value);
          }
        }
        return result;
      }
      __name(intersectMaps, "intersectMaps");
      const data = this.ambiguousCharacterData.value;
      let filteredLocales = locales.filter((l) => !l.startsWith("_") && Object.hasOwn(data, l));
      if (filteredLocales.length === 0) {
        filteredLocales = ["_default"];
      }
      let languageSpecificMap = void 0;
      for (const locale2 of filteredLocales) {
        const map2 = arrayToMap(data[locale2]);
        languageSpecificMap = intersectMaps(languageSpecificMap, map2);
      }
      const commonMap = arrayToMap(data["_common"]);
      const map = mergeMaps(commonMap, languageSpecificMap);
      return new _AmbiguousCharacters(map);
    });
  }
  static getInstance(locales) {
    return _AmbiguousCharacters.cache.get(Array.from(locales).join(","));
  }
  static {
    this._locales = new Lazy(() => Object.keys(_AmbiguousCharacters.ambiguousCharacterData.value).filter((k) => !k.startsWith("_")));
  }
  static getLocales() {
    return _AmbiguousCharacters._locales.value;
  }
  constructor(confusableDictionary) {
    this.confusableDictionary = confusableDictionary;
  }
  isAmbiguous(codePoint) {
    return this.confusableDictionary.has(codePoint);
  }
  containsAmbiguousCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && this.isAmbiguous(codePoint)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns the non basic ASCII code point that the given code point can be confused,
   * or undefined if such code point does note exist.
   */
  getPrimaryConfusable(codePoint) {
    return this.confusableDictionary.get(codePoint);
  }
  getConfusableCodePoints() {
    return new Set(this.confusableDictionary.keys());
  }
};
var InvisibleCharacters = class _InvisibleCharacters {
  static {
    __name(this, "InvisibleCharacters");
  }
  static getRawData() {
    return JSON.parse('{"_common":[11,12,13,127,847,1564,4447,4448,6068,6069,6155,6156,6157,6158,7355,7356,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8204,8205,8206,8207,8234,8235,8236,8237,8238,8239,8287,8288,8289,8290,8291,8292,8293,8294,8295,8296,8297,8298,8299,8300,8301,8302,8303,10240,12644,65024,65025,65026,65027,65028,65029,65030,65031,65032,65033,65034,65035,65036,65037,65038,65039,65279,65440,65520,65521,65522,65523,65524,65525,65526,65527,65528,65532,78844,119155,119156,119157,119158,119159,119160,119161,119162,917504,917505,917506,917507,917508,917509,917510,917511,917512,917513,917514,917515,917516,917517,917518,917519,917520,917521,917522,917523,917524,917525,917526,917527,917528,917529,917530,917531,917532,917533,917534,917535,917536,917537,917538,917539,917540,917541,917542,917543,917544,917545,917546,917547,917548,917549,917550,917551,917552,917553,917554,917555,917556,917557,917558,917559,917560,917561,917562,917563,917564,917565,917566,917567,917568,917569,917570,917571,917572,917573,917574,917575,917576,917577,917578,917579,917580,917581,917582,917583,917584,917585,917586,917587,917588,917589,917590,917591,917592,917593,917594,917595,917596,917597,917598,917599,917600,917601,917602,917603,917604,917605,917606,917607,917608,917609,917610,917611,917612,917613,917614,917615,917616,917617,917618,917619,917620,917621,917622,917623,917624,917625,917626,917627,917628,917629,917630,917631,917760,917761,917762,917763,917764,917765,917766,917767,917768,917769,917770,917771,917772,917773,917774,917775,917776,917777,917778,917779,917780,917781,917782,917783,917784,917785,917786,917787,917788,917789,917790,917791,917792,917793,917794,917795,917796,917797,917798,917799,917800,917801,917802,917803,917804,917805,917806,917807,917808,917809,917810,917811,917812,917813,917814,917815,917816,917817,917818,917819,917820,917821,917822,917823,917824,917825,917826,917827,917828,917829,917830,917831,917832,917833,917834,917835,917836,917837,917838,917839,917840,917841,917842,917843,917844,917845,917846,917847,917848,917849,917850,917851,917852,917853,917854,917855,917856,917857,917858,917859,917860,917861,917862,917863,917864,917865,917866,917867,917868,917869,917870,917871,917872,917873,917874,917875,917876,917877,917878,917879,917880,917881,917882,917883,917884,917885,917886,917887,917888,917889,917890,917891,917892,917893,917894,917895,917896,917897,917898,917899,917900,917901,917902,917903,917904,917905,917906,917907,917908,917909,917910,917911,917912,917913,917914,917915,917916,917917,917918,917919,917920,917921,917922,917923,917924,917925,917926,917927,917928,917929,917930,917931,917932,917933,917934,917935,917936,917937,917938,917939,917940,917941,917942,917943,917944,917945,917946,917947,917948,917949,917950,917951,917952,917953,917954,917955,917956,917957,917958,917959,917960,917961,917962,917963,917964,917965,917966,917967,917968,917969,917970,917971,917972,917973,917974,917975,917976,917977,917978,917979,917980,917981,917982,917983,917984,917985,917986,917987,917988,917989,917990,917991,917992,917993,917994,917995,917996,917997,917998,917999],"cs":[173,8203,12288],"de":[173,8203,12288],"es":[8203,12288],"fr":[173,8203,12288],"it":[160,173,12288],"ja":[173],"ko":[173,12288],"pl":[173,8203,12288],"pt-BR":[173,8203,12288],"qps-ploc":[160,173,8203,12288],"ru":[173,12288],"tr":[160,173,8203,12288],"zh-hans":[160,173,8203,12288],"zh-hant":[173,12288]}');
  }
  static {
    this._data = void 0;
  }
  static getData() {
    if (!this._data) {
      this._data = new Set([...Object.values(_InvisibleCharacters.getRawData())].flat());
    }
    return this._data;
  }
  static isInvisibleCharacter(codePoint) {
    return _InvisibleCharacters.getData().has(codePoint);
  }
  static containsInvisibleCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && (_InvisibleCharacters.isInvisibleCharacter(codePoint) || codePoint === 32)) {
        return true;
      }
    }
    return false;
  }
  static get codePoints() {
    return _InvisibleCharacters.getData();
  }
};
var Ellipsis = "\u2026";
function toBinary(str) {
  const codeUnits = new Uint16Array(str.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = str.charCodeAt(i);
  }
  let binary = "";
  const uint8array = new Uint8Array(codeUnits.buffer);
  for (let i = 0; i < uint8array.length; i++) {
    binary += String.fromCharCode(uint8array[i]);
  }
  return binary;
}
__name(toBinary, "toBinary");
function multibyteAwareBtoa(str) {
  return btoa(toBinary(str));
}
__name(multibyteAwareBtoa, "multibyteAwareBtoa");

// ../Output/Target/Microsoft/VSCode/vs/base/common/extpath.js
function isPathSeparator2(code) {
  return code === 47 || code === 92;
}
__name(isPathSeparator2, "isPathSeparator");
function toSlashes(osPath) {
  return osPath.replace(/[\\/]/g, posix.sep);
}
__name(toSlashes, "toSlashes");
function toPosixPath(osPath) {
  if (osPath.indexOf("/") === -1) {
    osPath = toSlashes(osPath);
  }
  if (/^[a-zA-Z]:(\/|$)/.test(osPath)) {
    osPath = "/" + osPath;
  }
  return osPath;
}
__name(toPosixPath, "toPosixPath");
function getRoot(path, sep2 = posix.sep) {
  if (!path) {
    return "";
  }
  const len = path.length;
  const firstLetter = path.charCodeAt(0);
  if (isPathSeparator2(firstLetter)) {
    if (isPathSeparator2(path.charCodeAt(1))) {
      if (!isPathSeparator2(path.charCodeAt(2))) {
        let pos2 = 3;
        const start = pos2;
        for (; pos2 < len; pos2++) {
          if (isPathSeparator2(path.charCodeAt(pos2))) {
            break;
          }
        }
        if (start !== pos2 && !isPathSeparator2(path.charCodeAt(pos2 + 1))) {
          pos2 += 1;
          for (; pos2 < len; pos2++) {
            if (isPathSeparator2(path.charCodeAt(pos2))) {
              return path.slice(0, pos2 + 1).replace(/[\\/]/g, sep2);
            }
          }
        }
      }
    }
    return sep2;
  } else if (isWindowsDriveLetter(firstLetter)) {
    if (path.charCodeAt(1) === 58) {
      if (isPathSeparator2(path.charCodeAt(2))) {
        return path.slice(0, 2) + sep2;
      } else {
        return path.slice(0, 2);
      }
    }
  }
  let pos = path.indexOf("://");
  if (pos !== -1) {
    pos += 3;
    for (; pos < len; pos++) {
      if (isPathSeparator2(path.charCodeAt(pos))) {
        return path.slice(0, pos + 1);
      }
    }
  }
  return "";
}
__name(getRoot, "getRoot");
function isUNC(path) {
  if (!isWindows) {
    return false;
  }
  if (!path || path.length < 5) {
    return false;
  }
  let code = path.charCodeAt(0);
  if (code !== 92) {
    return false;
  }
  code = path.charCodeAt(1);
  if (code !== 92) {
    return false;
  }
  let pos = 2;
  const start = pos;
  for (; pos < path.length; pos++) {
    code = path.charCodeAt(pos);
    if (code === 92) {
      break;
    }
  }
  if (start === pos) {
    return false;
  }
  code = path.charCodeAt(pos + 1);
  if (isNaN(code) || code === 92) {
    return false;
  }
  return true;
}
__name(isUNC, "isUNC");
var WINDOWS_INVALID_FILE_CHARS = /[\\/:\*\?"<>\|]/g;
var UNIX_INVALID_FILE_CHARS = /[/]/g;
var WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])(\.(.*?))?$/i;
function isValidBasename(name, isWindowsOS = isWindows) {
  const invalidFileChars = isWindowsOS ? WINDOWS_INVALID_FILE_CHARS : UNIX_INVALID_FILE_CHARS;
  if (!name || name.length === 0 || /^\s+$/.test(name)) {
    return false;
  }
  invalidFileChars.lastIndex = 0;
  if (invalidFileChars.test(name)) {
    return false;
  }
  if (isWindowsOS && WINDOWS_FORBIDDEN_NAMES.test(name)) {
    return false;
  }
  if (name === "." || name === "..") {
    return false;
  }
  if (isWindowsOS && name[name.length - 1] === ".") {
    return false;
  }
  if (isWindowsOS && name.length !== name.trim().length) {
    return false;
  }
  if (name.length > 255) {
    return false;
  }
  return true;
}
__name(isValidBasename, "isValidBasename");
function isEqual(pathA, pathB, ignoreCase) {
  const identityEquals = pathA === pathB;
  if (!ignoreCase || identityEquals) {
    return identityEquals;
  }
  if (!pathA || !pathB) {
    return false;
  }
  return equalsIgnoreCase(pathA, pathB);
}
__name(isEqual, "isEqual");
function isEqualOrParent(base, parentCandidate, ignoreCase, separator = sep) {
  if (base === parentCandidate) {
    return true;
  }
  if (!base || !parentCandidate) {
    return false;
  }
  if (parentCandidate.length > base.length) {
    return false;
  }
  if (ignoreCase) {
    const beginsWith = startsWithIgnoreCase(base, parentCandidate);
    if (!beginsWith) {
      return false;
    }
    if (parentCandidate.length === base.length) {
      return true;
    }
    let sepOffset = parentCandidate.length;
    if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
      sepOffset--;
    }
    return base.charAt(sepOffset) === separator;
  }
  if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
    parentCandidate += separator;
  }
  return base.indexOf(parentCandidate) === 0;
}
__name(isEqualOrParent, "isEqualOrParent");
function isWindowsDriveLetter(char0) {
  return char0 >= 65 && char0 <= 90 || char0 >= 97 && char0 <= 122;
}
__name(isWindowsDriveLetter, "isWindowsDriveLetter");
function sanitizeFilePath(candidate, cwd2) {
  if (isWindows && candidate.endsWith(":")) {
    candidate += sep;
  }
  if (!isAbsolute(candidate)) {
    candidate = join(cwd2, candidate);
  }
  candidate = normalize(candidate);
  return removeTrailingPathSeparator(candidate);
}
__name(sanitizeFilePath, "sanitizeFilePath");
function removeTrailingPathSeparator(candidate) {
  if (isWindows) {
    candidate = rtrim(candidate, sep);
    if (candidate.endsWith(":")) {
      candidate += sep;
    }
  } else {
    candidate = rtrim(candidate, sep);
    if (!candidate) {
      candidate = sep;
    }
  }
  return candidate;
}
__name(removeTrailingPathSeparator, "removeTrailingPathSeparator");
function isRootOrDriveLetter(path) {
  const pathNormalized = normalize(path);
  if (isWindows) {
    if (path.length > 3) {
      return false;
    }
    return hasDriveLetter(pathNormalized) && (path.length === 2 || pathNormalized.charCodeAt(2) === 92);
  }
  return pathNormalized === posix.sep;
}
__name(isRootOrDriveLetter, "isRootOrDriveLetter");
function hasDriveLetter(path, isWindowsOS = isWindows) {
  if (isWindowsOS) {
    return isWindowsDriveLetter(path.charCodeAt(0)) && path.charCodeAt(1) === 58;
  }
  return false;
}
__name(hasDriveLetter, "hasDriveLetter");
function getDriveLetter(path, isWindowsOS = isWindows) {
  return hasDriveLetter(path, isWindowsOS) ? path[0] : void 0;
}
__name(getDriveLetter, "getDriveLetter");
function indexOfPath(path, candidate, ignoreCase) {
  if (candidate.length > path.length) {
    return -1;
  }
  if (path === candidate) {
    return 0;
  }
  if (ignoreCase) {
    path = path.toLowerCase();
    candidate = candidate.toLowerCase();
  }
  return path.indexOf(candidate);
}
__name(indexOfPath, "indexOfPath");
function parseLineAndColumnAware(rawPath) {
  const segments = rawPath.split(":");
  let path;
  let line;
  let column;
  for (const segment of segments) {
    const segmentAsNumber = Number(segment);
    if (!isNumber(segmentAsNumber)) {
      path = path ? [path, segment].join(":") : segment;
    } else if (line === void 0) {
      line = segmentAsNumber;
    } else if (column === void 0) {
      column = segmentAsNumber;
    }
  }
  if (!path) {
    throw new Error("Format for `--goto` should be: `FILE:LINE(:COLUMN)`");
  }
  return {
    path,
    line: line !== void 0 ? line : void 0,
    column: column !== void 0 ? column : line !== void 0 ? 1 : void 0
    // if we have a line, make sure column is also set
  };
}
__name(parseLineAndColumnAware, "parseLineAndColumnAware");
var pathChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var windowsSafePathFirstChars = "BDEFGHIJKMOQRSTUVWXYZbdefghijkmoqrstuvwxyz0123456789";
function randomPath(parent, prefix, randomLength = 8) {
  let suffix = "";
  for (let i = 0; i < randomLength; i++) {
    let pathCharsTouse;
    if (i === 0 && isWindows && !prefix && (randomLength === 3 || randomLength === 4)) {
      pathCharsTouse = windowsSafePathFirstChars;
    } else {
      pathCharsTouse = pathChars;
    }
    suffix += pathCharsTouse.charAt(Math.floor(Math.random() * pathCharsTouse.length));
  }
  let randomFileName;
  if (prefix) {
    randomFileName = `${prefix}-${suffix}`;
  } else {
    randomFileName = suffix;
  }
  if (parent) {
    return join(parent, randomFileName);
  }
  return randomFileName;
}
__name(randomPath, "randomPath");

// ../Output/Target/Microsoft/VSCode/vs/base/common/uri.js
var _schemePattern = /^\w[\w\d+.-]*$/;
var _singleSlashStart = /^\//;
var _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    const matches = [...ret.scheme.matchAll(/[^\w\d+.-]/gu)];
    const detail = matches.length > 0 ? ` Found '${matches[0][0]}' at index ${matches[0].index} (${matches.length} total)` : "";
    throw new Error(`[UriError]: Scheme contains illegal characters.${detail} (len:${ret.scheme.length})`);
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
__name(_validateUri, "_validateUri");
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
__name(_schemeFix, "_schemeFix");
function _referenceResolution(scheme, path) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path) {
        path = _slash;
      } else if (path[0] !== _slash) {
        path = _slash + path;
      }
      break;
  }
  return path;
}
__name(_referenceResolution, "_referenceResolution");
var _empty = "";
var _slash = "/";
var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
var URI = class _URI {
  static {
    __name(this, "URI");
  }
  static isUri(thing) {
    if (thing instanceof _URI) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
  }
  /**
   * @internal
   */
  constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
    if (typeof schemeOrData === "object") {
      this.scheme = schemeOrData.scheme || _empty;
      this.authority = schemeOrData.authority || _empty;
      this.path = schemeOrData.path || _empty;
      this.query = schemeOrData.query || _empty;
      this.fragment = schemeOrData.fragment || _empty;
    } else {
      this.scheme = _schemeFix(schemeOrData, _strict);
      this.authority = authority || _empty;
      this.path = _referenceResolution(this.scheme, path || _empty);
      this.query = query || _empty;
      this.fragment = fragment || _empty;
      _validateUri(this, _strict);
    }
  }
  // ---- filesystem path -----------------------
  /**
   * Returns a string representing the corresponding file system path of this URI.
   * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
   * platform specific path separator.
   *
   * * Will *not* validate the path for invalid characters and semantics.
   * * Will *not* look at the scheme of this URI.
   * * The result shall *not* be used for display purposes but for accessing a file on disk.
   *
   *
   * The *difference* to `URI#path` is the use of the platform specific separator and the handling
   * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
   *
   * ```ts
      const u = URI.parse('file://server/c$/folder/file.txt')
      u.authority === 'server'
      u.path === '/shares/c$/file.txt'
      u.fsPath === '\\server\c$\folder\file.txt'
  ```
   *
   * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
   * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
   * with URIs that represent files on disk (`file` scheme).
   */
  get fsPath() {
    return uriToFsPath(this, false);
  }
  // ---- modify to new -------------------------
  with(change) {
    if (!change) {
      return this;
    }
    let { scheme, authority, path, query, fragment } = change;
    if (scheme === void 0) {
      scheme = this.scheme;
    } else if (scheme === null) {
      scheme = _empty;
    }
    if (authority === void 0) {
      authority = this.authority;
    } else if (authority === null) {
      authority = _empty;
    }
    if (path === void 0) {
      path = this.path;
    } else if (path === null) {
      path = _empty;
    }
    if (query === void 0) {
      query = this.query;
    } else if (query === null) {
      query = _empty;
    }
    if (fragment === void 0) {
      fragment = this.fragment;
    } else if (fragment === null) {
      fragment = _empty;
    }
    if (scheme === this.scheme && authority === this.authority && path === this.path && query === this.query && fragment === this.fragment) {
      return this;
    }
    return new Uri(scheme, authority, path, query, fragment);
  }
  // ---- parse & validate ------------------------
  /**
   * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
   * `file:///usr/home`, or `scheme:with/path`.
   *
   * @param value A string which represents an URI (see `URI#toString`).
   */
  static parse(value, _strict = false) {
    const match2 = _regexp.exec(value);
    if (!match2) {
      return new Uri(_empty, _empty, _empty, _empty, _empty);
    }
    return new Uri(match2[2] || _empty, percentDecode(match2[4] || _empty), percentDecode(match2[5] || _empty), percentDecode(match2[7] || _empty), percentDecode(match2[9] || _empty), _strict);
  }
  /**
   * Creates a new URI from a file system path, e.g. `c:\my\files`,
   * `/usr/home`, or `\\server\share\some\path`.
   *
   * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
   * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
   * `URI.parse('file://' + path)` because the path might contain characters that are
   * interpreted (# and ?). See the following sample:
   * ```ts
  const good = URI.file('/coding/c#/project1');
  good.scheme === 'file';
  good.path === '/coding/c#/project1';
  good.fragment === '';
  const bad = URI.parse('file://' + '/coding/c#/project1');
  bad.scheme === 'file';
  bad.path === '/coding/c'; // path is now broken
  bad.fragment === '/project1';
  ```
   *
   * @param path A file system path (see `URI#fsPath`)
   */
  static file(path) {
    let authority = _empty;
    if (isWindows) {
      path = path.replace(/\\/g, _slash);
    }
    if (path[0] === _slash && path[1] === _slash) {
      const idx = path.indexOf(_slash, 2);
      if (idx === -1) {
        authority = path.substring(2);
        path = _slash;
      } else {
        authority = path.substring(2, idx);
        path = path.substring(idx) || _slash;
      }
    }
    return new Uri("file", authority, path, _empty, _empty);
  }
  /**
   * Creates new URI from uri components.
   *
   * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
   * validation and should be used for untrusted uri components retrieved from storage,
   * user input, command arguments etc
   */
  static from(components, strict) {
    const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
    return result;
  }
  /**
   * Join a URI path with path fragments and normalizes the resulting path.
   *
   * @param uri The input URI.
   * @param pathFragment The path fragment to add to the URI path.
   * @returns The resulting URI.
   */
  static joinPath(uri, ...pathFragment) {
    if (!uri.path) {
      throw new Error(`[UriError]: cannot call joinPath on URI without path: ${uri.toString()}`);
    }
    let newPath;
    if (isWindows && uri.scheme === "file") {
      newPath = _URI.file(win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
    } else {
      newPath = posix.join(uri.path, ...pathFragment);
    }
    return uri.with({ path: newPath });
  }
  // ---- printing/externalize ---------------------------
  /**
   * Creates a string representation for this URI. It's guaranteed that calling
   * `URI.parse` with the result of this function creates an URI which is equal
   * to this URI.
   *
   * * The result shall *not* be used for display purposes but for externalization or transport.
   * * The result will be encoded using the percentage encoding and encoding happens mostly
   * ignore the scheme-specific encoding rules.
   *
   * @param skipEncoding Do not encode the result, default is `false`
   */
  toString(skipEncoding = false) {
    return _asFormatted(this, skipEncoding);
  }
  toJSON() {
    return this;
  }
  static revive(data) {
    if (!data) {
      return data;
    } else if (data instanceof _URI) {
      return data;
    } else {
      const result = new Uri(data);
      result._formatted = data.external ?? null;
      result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
      return result;
    }
  }
  [/* @__PURE__ */ Symbol.for("debug.description")]() {
    return `URI(${this.toString()})`;
  }
};
function isUriComponents(thing) {
  if (!thing || typeof thing !== "object") {
    return false;
  }
  return typeof thing.scheme === "string" && (typeof thing.authority === "string" || typeof thing.authority === "undefined") && (typeof thing.path === "string" || typeof thing.path === "undefined") && (typeof thing.query === "string" || typeof thing.query === "undefined") && (typeof thing.fragment === "string" || typeof thing.fragment === "undefined");
}
__name(isUriComponents, "isUriComponents");
var _pathSepMarker = isWindows ? 1 : void 0;
var Uri = class extends URI {
  static {
    __name(this, "Uri");
  }
  constructor() {
    super(...arguments);
    this._formatted = null;
    this._fsPath = null;
  }
  get fsPath() {
    if (!this._fsPath) {
      this._fsPath = uriToFsPath(this, false);
    }
    return this._fsPath;
  }
  toString(skipEncoding = false) {
    if (!skipEncoding) {
      if (!this._formatted) {
        this._formatted = _asFormatted(this, false);
      }
      return this._formatted;
    } else {
      return _asFormatted(this, true);
    }
  }
  toJSON() {
    const res = {
      $mid: 1
      /* MarshalledId.Uri */
    };
    if (this._fsPath) {
      res.fsPath = this._fsPath;
      res._sep = _pathSepMarker;
    }
    if (this._formatted) {
      res.external = this._formatted;
    }
    if (this.path) {
      res.path = this.path;
    }
    if (this.scheme) {
      res.scheme = this.scheme;
    }
    if (this.authority) {
      res.authority = this.authority;
    }
    if (this.query) {
      res.query = this.query;
    }
    if (this.fragment) {
      res.fragment = this.fragment;
    }
    return res;
  }
};
var encodeTable = {
  [
    58
    /* CharCode.Colon */
  ]: "%3A",
  // gen-delims
  [
    47
    /* CharCode.Slash */
  ]: "%2F",
  [
    63
    /* CharCode.QuestionMark */
  ]: "%3F",
  [
    35
    /* CharCode.Hash */
  ]: "%23",
  [
    91
    /* CharCode.OpenSquareBracket */
  ]: "%5B",
  [
    93
    /* CharCode.CloseSquareBracket */
  ]: "%5D",
  [
    64
    /* CharCode.AtSign */
  ]: "%40",
  [
    33
    /* CharCode.ExclamationMark */
  ]: "%21",
  // sub-delims
  [
    36
    /* CharCode.DollarSign */
  ]: "%24",
  [
    38
    /* CharCode.Ampersand */
  ]: "%26",
  [
    39
    /* CharCode.SingleQuote */
  ]: "%27",
  [
    40
    /* CharCode.OpenParen */
  ]: "%28",
  [
    41
    /* CharCode.CloseParen */
  ]: "%29",
  [
    42
    /* CharCode.Asterisk */
  ]: "%2A",
  [
    43
    /* CharCode.Plus */
  ]: "%2B",
  [
    44
    /* CharCode.Comma */
  ]: "%2C",
  [
    59
    /* CharCode.Semicolon */
  ]: "%3B",
  [
    61
    /* CharCode.Equals */
  ]: "%3D",
  [
    32
    /* CharCode.Space */
  ]: "%20"
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
__name(encodeURIComponentFast, "encodeURIComponentFast");
function encodeURIComponentMinimal(path) {
  let res = void 0;
  for (let pos = 0; pos < path.length; pos++) {
    const code = path.charCodeAt(pos);
    if (code === 35 || code === 63) {
      if (res === void 0) {
        res = path.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path[pos];
      }
    }
  }
  return res !== void 0 ? res : path;
}
__name(encodeURIComponentMinimal, "encodeURIComponentMinimal");
function uriToFsPath(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if (isWindows) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
__name(uriToFsPath, "uriToFsPath");
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path) {
    if (path.length >= 3 && path.charCodeAt(0) === 47 && path.charCodeAt(2) === 58) {
      const code = path.charCodeAt(1);
      if (code >= 65 && code <= 90) {
        path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`;
      }
    } else if (path.length >= 2 && path.charCodeAt(1) === 58) {
      const code = path.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`;
      }
    }
    res += encoder(path, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
__name(_asFormatted, "_asFormatted");
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
__name(decodeURIComponentGraceful, "decodeURIComponentGraceful");
var _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match2) => decodeURIComponentGraceful(match2));
}
__name(percentDecode, "percentDecode");

// ../Output/Target/Microsoft/VSCode/vs/base/common/network.js
var Schemas;
(function(Schemas2) {
  Schemas2.inMemory = "inmemory";
  Schemas2.vscode = "vscode";
  Schemas2.internal = "private";
  Schemas2.walkThrough = "walkThrough";
  Schemas2.walkThroughSnippet = "walkThroughSnippet";
  Schemas2.http = "http";
  Schemas2.https = "https";
  Schemas2.file = "file";
  Schemas2.mailto = "mailto";
  Schemas2.untitled = "untitled";
  Schemas2.data = "data";
  Schemas2.command = "command";
  Schemas2.vscodeRemote = "vscode-remote";
  Schemas2.vscodeRemoteResource = "vscode-remote-resource";
  Schemas2.vscodeManagedRemoteResource = "vscode-managed-remote-resource";
  Schemas2.vscodeUserData = "vscode-userdata";
  Schemas2.vscodeCustomEditor = "vscode-custom-editor";
  Schemas2.vscodeNotebookCell = "vscode-notebook-cell";
  Schemas2.vscodeNotebookCellMetadata = "vscode-notebook-cell-metadata";
  Schemas2.vscodeNotebookCellMetadataDiff = "vscode-notebook-cell-metadata-diff";
  Schemas2.vscodeNotebookCellOutput = "vscode-notebook-cell-output";
  Schemas2.vscodeNotebookCellOutputDiff = "vscode-notebook-cell-output-diff";
  Schemas2.vscodeNotebookMetadata = "vscode-notebook-metadata";
  Schemas2.vscodeInteractiveInput = "vscode-interactive-input";
  Schemas2.vscodeSettings = "vscode-settings";
  Schemas2.vscodeWorkspaceTrust = "vscode-workspace-trust";
  Schemas2.vscodeTerminal = "vscode-terminal";
  Schemas2.vscodeImageCarousel = "vscode-image-carousel";
  Schemas2.vscodeChatCodeBlock = "vscode-chat-code-block";
  Schemas2.vscodeChatCodeCompareBlock = "vscode-chat-code-compare-block";
  Schemas2.vscodeChatEditor = "vscode-chat-editor";
  Schemas2.vscodeChatInput = "chatSessionInput";
  Schemas2.vscodeLocalChatSession = "vscode-chat-session";
  Schemas2.webviewPanel = "webview-panel";
  Schemas2.vscodeWebview = "vscode-webview";
  Schemas2.vscodeBrowser = "vscode-browser";
  Schemas2.extension = "extension";
  Schemas2.vscodeFileResource = "vscode-file";
  Schemas2.tmp = "tmp";
  Schemas2.vsls = "vsls";
  Schemas2.vscodeSourceControl = "vscode-scm";
  Schemas2.commentsInput = "comment";
  Schemas2.codeSetting = "code-setting";
  Schemas2.outputChannel = "output";
  Schemas2.accessibleView = "accessible-view";
  Schemas2.chatEditingSnapshotScheme = "chat-editing-snapshot-text-model";
  Schemas2.chatEditingModel = "chat-editing-text-model";
  Schemas2.copilotPr = "copilot-pr";
})(Schemas || (Schemas = {}));
function matchesScheme(target, scheme) {
  if (URI.isUri(target)) {
    return equalsIgnoreCase(target.scheme, scheme);
  } else {
    return startsWithIgnoreCase(target, scheme + ":");
  }
}
__name(matchesScheme, "matchesScheme");
function matchesSomeScheme(target, ...schemes) {
  return schemes.some((scheme) => matchesScheme(target, scheme));
}
__name(matchesSomeScheme, "matchesSomeScheme");
var connectionTokenCookieName = "vscode-tkn";
var connectionTokenQueryName = "tkn";
var RemoteAuthoritiesImpl = class {
  static {
    __name(this, "RemoteAuthoritiesImpl");
  }
  constructor() {
    this._hosts = /* @__PURE__ */ Object.create(null);
    this._ports = /* @__PURE__ */ Object.create(null);
    this._connectionTokens = /* @__PURE__ */ Object.create(null);
    this._preferredWebSchema = "http";
    this._delegate = null;
    this._serverRootPath = "/";
  }
  setPreferredWebSchema(schema) {
    this._preferredWebSchema = schema;
  }
  setDelegate(delegate) {
    this._delegate = delegate;
  }
  setServerRootPath(product, serverBasePath) {
    this._serverRootPath = posix.join(serverBasePath ?? "/", getServerProductSegment(product));
  }
  getServerRootPath() {
    return this._serverRootPath;
  }
  get _remoteResourcesPath() {
    return posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
  }
  set(authority, host, port) {
    this._hosts[authority] = host;
    this._ports[authority] = port;
  }
  setConnectionToken(authority, connectionToken) {
    this._connectionTokens[authority] = connectionToken;
  }
  getPreferredWebSchema() {
    return this._preferredWebSchema;
  }
  rewrite(uri) {
    if (this._delegate) {
      try {
        return this._delegate(uri);
      } catch (err) {
        onUnexpectedExternalError(err);
        return uri;
      }
    }
    const authority = uri.authority;
    let host = this._hosts[authority];
    if (host && host.indexOf(":") !== -1 && host.indexOf("[") === -1) {
      host = `[${host}]`;
    }
    const port = this._ports[authority];
    const connectionToken = this._connectionTokens[authority];
    let query = `path=${encodeURIComponent(uri.path)}`;
    if (typeof connectionToken === "string") {
      query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
    }
    return URI.from({
      scheme: isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
      authority: `${host}:${port}`,
      path: this._remoteResourcesPath,
      query
    });
  }
};
var RemoteAuthorities = new RemoteAuthoritiesImpl();
function getServerProductSegment(product) {
  return `${product.quality ?? "oss"}-${product.commit ?? "dev"}`;
}
__name(getServerProductSegment, "getServerProductSegment");
var builtinExtensionsPath = "vs/../extensions";
var nodeModulesPath = "vs/../node_modules";
var nodeModulesAsarPath = "vs/../node_modules.asar";
var nodeModulesAsarUnpackedPath = "vs/../node_modules.asar.unpacked";
var VSCODE_AUTHORITY = "vscode-app";
var FileAccessImpl = class _FileAccessImpl {
  static {
    __name(this, "FileAccessImpl");
  }
  static {
    this.FALLBACK_AUTHORITY = VSCODE_AUTHORITY;
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  asBrowserUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToBrowserUri(uri);
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  uriToBrowserUri(uri) {
    if (uri.scheme === Schemas.vscodeRemote) {
      return RemoteAuthorities.rewrite(uri);
    }
    if (
      // ...only ever for `file` resources
      uri.scheme === Schemas.file && // ...and we run in native environments
      (isNative || // ...or web worker extensions on desktop
      webWorkerOrigin === `${Schemas.vscodeFileResource}://${_FileAccessImpl.FALLBACK_AUTHORITY}`)
    ) {
      return uri.with({
        scheme: Schemas.vscodeFileResource,
        // We need to provide an authority here so that it can serve
        // as origin for network and loading matters in chromium.
        // If the URI is not coming with an authority already, we
        // add our own
        authority: uri.authority || _FileAccessImpl.FALLBACK_AUTHORITY,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  asFileUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToFileUri(uri);
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  uriToFileUri(uri) {
    if (uri.scheme === Schemas.vscodeFileResource) {
      return uri.with({
        scheme: Schemas.file,
        // Only preserve the `authority` if it is different from
        // our fallback authority. This ensures we properly preserve
        // Windows UNC paths that come with their own authority.
        authority: uri.authority !== _FileAccessImpl.FALLBACK_AUTHORITY ? uri.authority : null,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  toUri(uriOrModule) {
    if (URI.isUri(uriOrModule)) {
      return uriOrModule;
    }
    if (globalThis._VSCODE_FILE_ROOT) {
      const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
      if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
        return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
      }
      const modulePath = join(rootUriOrPath, uriOrModule);
      return URI.file(modulePath);
    }
    throw new Error("Cannot determine URI for module id!");
  }
};
var FileAccess = new FileAccessImpl();
var CacheControlheaders = Object.freeze({
  "Cache-Control": "no-cache, no-store"
});
var DocumentPolicyheaders = Object.freeze({
  "Document-Policy": "include-js-call-stacks-in-crash-reports"
});
var COI;
(function(COI2) {
  const coiHeaders = /* @__PURE__ */ new Map([
    ["1", { "Cross-Origin-Opener-Policy": "same-origin" }],
    ["2", { "Cross-Origin-Embedder-Policy": "require-corp" }],
    ["3", { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }]
  ]);
  COI2.CoopAndCoep = Object.freeze(coiHeaders.get("3"));
  const coiSearchParamName = "vscode-coi";
  function getHeadersFromQuery(url) {
    let params;
    if (typeof url === "string") {
      params = new URL(url).searchParams;
    } else if (url instanceof URL) {
      params = url.searchParams;
    } else if (URI.isUri(url)) {
      params = new URL(url.toString(true)).searchParams;
    }
    const value = params?.get(coiSearchParamName);
    if (!value) {
      return void 0;
    }
    return coiHeaders.get(value);
  }
  __name(getHeadersFromQuery, "getHeadersFromQuery");
  COI2.getHeadersFromQuery = getHeadersFromQuery;
  function addSearchParam(urlOrSearch, coop, coep) {
    if (!globalThis.crossOriginIsolated) {
      return;
    }
    const value = coop && coep ? "3" : coep ? "2" : "1";
    if (urlOrSearch instanceof URLSearchParams) {
      urlOrSearch.set(coiSearchParamName, value);
    } else {
      urlOrSearch[coiSearchParamName] = value;
    }
  }
  __name(addSearchParam, "addSearchParam");
  COI2.addSearchParam = addSearchParam;
})(COI || (COI = {}));

// ../Output/Target/Microsoft/VSCode/vs/base/common/resources.js
function originalFSPath(uri) {
  return uriToFsPath(uri, true);
}
__name(originalFSPath, "originalFSPath");
var ExtUri = class {
  static {
    __name(this, "ExtUri");
  }
  constructor(_ignorePathCasing) {
    this._ignorePathCasing = _ignorePathCasing;
  }
  compare(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return 0;
    }
    return compare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
  }
  isEqual(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return true;
    }
    if (!uri1 || !uri2) {
      return false;
    }
    return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
  }
  getComparisonKey(uri, ignoreFragment = false) {
    return uri.with({
      path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : void 0,
      fragment: ignoreFragment ? null : void 0
    }).toString();
  }
  ignorePathCasing(uri) {
    return this._ignorePathCasing(uri);
  }
  isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
    if (base.scheme === parentCandidate.scheme) {
      if (base.scheme === Schemas.file) {
        return isEqualOrParent(originalFSPath(base), originalFSPath(parentCandidate), this._ignorePathCasing(base)) && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
      if (isEqualAuthority(base.authority, parentCandidate.authority)) {
        return isEqualOrParent(base.path, parentCandidate.path, this._ignorePathCasing(base), "/") && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
    }
    return false;
  }
  // --- path math
  joinPath(resource, ...pathFragment) {
    return URI.joinPath(resource, ...pathFragment);
  }
  basenameOrAuthority(resource) {
    return basename2(resource) || resource.authority;
  }
  basename(resource, suffix) {
    return posix.basename(resource.path, suffix);
  }
  extname(resource) {
    return posix.extname(resource.path);
  }
  dirname(resource) {
    if (resource.path.length === 0) {
      return resource;
    }
    let dirname3;
    if (resource.scheme === Schemas.file) {
      dirname3 = URI.file(dirname(originalFSPath(resource))).path;
    } else {
      dirname3 = posix.dirname(resource.path);
      if (resource.authority && dirname3.length && dirname3.charCodeAt(0) !== 47) {
        console.error(`dirname("${resource.toString})) resulted in a relative path`);
        dirname3 = "/";
      }
    }
    return resource.with({
      path: dirname3
    });
  }
  normalizePath(resource) {
    if (!resource.path.length) {
      return resource;
    }
    let normalizedPath;
    if (resource.scheme === Schemas.file) {
      normalizedPath = URI.file(normalize(originalFSPath(resource))).path;
    } else {
      normalizedPath = posix.normalize(resource.path);
    }
    return resource.with({
      path: normalizedPath
    });
  }
  relativePath(from, to) {
    if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
      return void 0;
    }
    if (from.scheme === Schemas.file) {
      const relativePath2 = relative(originalFSPath(from), originalFSPath(to));
      return isWindows ? toSlashes(relativePath2) : relativePath2;
    }
    let fromPath = from.path || "/";
    const toPath = to.path || "/";
    if (this._ignorePathCasing(from)) {
      let i = 0;
      for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
        if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
          if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
            break;
          }
        }
      }
      fromPath = toPath.substr(0, i) + fromPath.substr(i);
    }
    return posix.relative(fromPath, toPath);
  }
  resolvePath(base, path) {
    if (base.scheme === Schemas.file) {
      const newURI = URI.file(resolve(originalFSPath(base), path));
      return base.with({
        authority: newURI.authority,
        path: newURI.path
      });
    }
    path = toPosixPath(path);
    return base.with({
      path: posix.resolve(base.path, path)
    });
  }
  // --- misc
  isAbsolutePath(resource) {
    return !!resource.path && resource.path[0] === "/";
  }
  isEqualAuthority(a1, a2) {
    return a1 === a2 || a1 !== void 0 && a2 !== void 0 && equalsIgnoreCase(a1, a2);
  }
  hasTrailingPathSeparator(resource, sep2 = sep) {
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      return fsp.length > getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      const p = resource.path;
      return p.length > 1 && p.charCodeAt(p.length - 1) === 47 && !/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath);
    }
  }
  removeTrailingPathSeparator(resource, sep2 = sep) {
    if (hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
    }
    return resource;
  }
  addTrailingPathSeparator(resource, sep2 = sep) {
    let isRootSep = false;
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      isRootSep = fsp !== void 0 && fsp.length === getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      sep2 = "/";
      const p = resource.path;
      isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47;
    }
    if (!isRootSep && !hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path + "/" });
    }
    return resource;
  }
};
var extUri = new ExtUri(() => false);
var extUriBiasedIgnorePathCase = new ExtUri((uri) => {
  return uri.scheme === Schemas.file ? !isLinux : true;
});
var extUriIgnorePathCase = new ExtUri((_) => true);
var isEqual2 = extUri.isEqual.bind(extUri);
var isEqualOrParent2 = extUri.isEqualOrParent.bind(extUri);
var getComparisonKey = extUri.getComparisonKey.bind(extUri);
var basenameOrAuthority = extUri.basenameOrAuthority.bind(extUri);
var basename2 = extUri.basename.bind(extUri);
var extname2 = extUri.extname.bind(extUri);
var dirname2 = extUri.dirname.bind(extUri);
var joinPath = extUri.joinPath.bind(extUri);
var normalizePath = extUri.normalizePath.bind(extUri);
var relativePath = extUri.relativePath.bind(extUri);
var resolvePath = extUri.resolvePath.bind(extUri);
var isAbsolutePath = extUri.isAbsolutePath.bind(extUri);
var isEqualAuthority = extUri.isEqualAuthority.bind(extUri);
var hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.bind(extUri);
var removeTrailingPathSeparator2 = extUri.removeTrailingPathSeparator.bind(extUri);
var addTrailingPathSeparator = extUri.addTrailingPathSeparator.bind(extUri);
function distinctParents(items, resourceAccessor) {
  const distinctParents2 = [];
  for (let i = 0; i < items.length; i++) {
    const candidateResource = resourceAccessor(items[i]);
    if (items.some((otherItem, index2) => {
      if (index2 === i) {
        return false;
      }
      return isEqualOrParent2(candidateResource, resourceAccessor(otherItem));
    })) {
      continue;
    }
    distinctParents2.push(items[i]);
  }
  return distinctParents2;
}
__name(distinctParents, "distinctParents");
var DataUri;
(function(DataUri2) {
  DataUri2.META_DATA_LABEL = "label";
  DataUri2.META_DATA_DESCRIPTION = "description";
  DataUri2.META_DATA_SIZE = "size";
  DataUri2.META_DATA_MIME = "mime";
  function parseMetaData(dataUri) {
    const metadata = /* @__PURE__ */ new Map();
    const meta = dataUri.path.substring(dataUri.path.indexOf(";") + 1, dataUri.path.lastIndexOf(";"));
    meta.split(";").forEach((property) => {
      const [key, value] = property.split(":");
      if (key && value) {
        metadata.set(key, value);
      }
    });
    const mime = dataUri.path.substring(0, dataUri.path.indexOf(";"));
    if (mime) {
      metadata.set(DataUri2.META_DATA_MIME, mime);
    }
    return metadata;
  }
  __name(parseMetaData, "parseMetaData");
  DataUri2.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));
function toLocalResource(resource, authority, localScheme) {
  if (authority) {
    let path = resource.path;
    if (path && path[0] !== posix.sep) {
      path = posix.sep + path;
    }
    return resource.with({ scheme: localScheme, authority, path });
  }
  return resource.with({ scheme: localScheme });
}
__name(toLocalResource, "toLocalResource");

// ../Output/Target/Microsoft/VSCode/vs/base/common/symbols.js
var MicrotaskDelay = /* @__PURE__ */ Symbol("MicrotaskDelay");

// ../Output/Target/Microsoft/VSCode/vs/base/common/async.js
function isThenable(obj) {
  return !!obj && typeof obj.then === "function";
}
__name(isThenable, "isThenable");
function createCancelablePromise(callback) {
  const source = new CancellationTokenSource();
  const thenable = callback(source.token);
  let isCancelled = false;
  const promise = new Promise((resolve2, reject) => {
    const subscription = source.token.onCancellationRequested(() => {
      isCancelled = true;
      subscription.dispose();
      reject(new CancellationError());
    });
    Promise.resolve(thenable).then((value) => {
      subscription.dispose();
      source.dispose();
      if (!isCancelled) {
        resolve2(value);
      } else if (isDisposable(value)) {
        value.dispose();
      }
    }, (err) => {
      subscription.dispose();
      source.dispose();
      reject(err);
    });
  });
  return new class {
    cancel() {
      source.cancel();
      source.dispose();
    }
    then(resolve2, reject) {
      return promise.then(resolve2, reject);
    }
    catch(reject) {
      return this.then(void 0, reject);
    }
    finally(onfinally) {
      return promise.finally(onfinally);
    }
  }();
}
__name(createCancelablePromise, "createCancelablePromise");
function raceCancellation(promise, token, defaultValue) {
  return new Promise((resolve2, reject) => {
    const ref = token.onCancellationRequested(() => {
      ref.dispose();
      resolve2(defaultValue);
    });
    promise.then(resolve2, reject).finally(() => ref.dispose());
  });
}
__name(raceCancellation, "raceCancellation");
function raceCancellationError(promise, token) {
  return new Promise((resolve2, reject) => {
    const ref = token.onCancellationRequested(() => {
      ref.dispose();
      reject(new CancellationError());
    });
    promise.then(resolve2, reject).finally(() => ref.dispose());
  });
}
__name(raceCancellationError, "raceCancellationError");
function rejectIfNotCanceled(err) {
  if (isCancellationError(err)) {
    return void 0;
  }
  return Promise.reject(err);
}
__name(rejectIfNotCanceled, "rejectIfNotCanceled");
function notCancellablePromise(promise) {
  return new Promise((resolve2, reject) => {
    promise.then(resolve2, reject);
  });
}
__name(notCancellablePromise, "notCancellablePromise");
function raceCancellablePromises(cancellablePromises) {
  let resolvedPromiseIndex = -1;
  const promises = cancellablePromises.map((promise2, index2) => promise2.then((result) => {
    resolvedPromiseIndex = index2;
    return result;
  }));
  const promise = Promise.race(promises);
  promise.cancel = () => {
    cancellablePromises.forEach((cancellablePromise, index2) => {
      if (index2 !== resolvedPromiseIndex && cancellablePromise.cancel) {
        cancellablePromise.cancel();
      }
    });
  };
  promise.finally(() => {
    promise.cancel();
  });
  return promise;
}
__name(raceCancellablePromises, "raceCancellablePromises");
function raceTimeout(promise, timeout2, onTimeout) {
  let promiseResolve = void 0;
  const timer = setTimeout(() => {
    promiseResolve?.(void 0);
    onTimeout?.();
  }, timeout2);
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((resolve2) => promiseResolve = resolve2)
  ]);
}
__name(raceTimeout, "raceTimeout");
function asPromise(callback) {
  return new Promise((resolve2, reject) => {
    const item = callback();
    if (isThenable(item)) {
      item.then(resolve2, reject);
    } else {
      resolve2(item);
    }
  });
}
__name(asPromise, "asPromise");
function promiseWithResolvers() {
  let resolve2;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve2 = res;
    reject = rej;
  });
  return { promise, resolve: resolve2, reject };
}
__name(promiseWithResolvers, "promiseWithResolvers");
var Throttler = class {
  static {
    __name(this, "Throttler");
  }
  constructor() {
    this.activePromise = null;
    this.queuedPromise = null;
    this.queuedPromiseFactory = null;
    this.cancellationTokenSource = new CancellationTokenSource();
  }
  queue(promiseFactory) {
    if (this.cancellationTokenSource.token.isCancellationRequested) {
      return Promise.reject(new Error("Throttler is disposed"));
    }
    if (this.activePromise) {
      this.queuedPromiseFactory = promiseFactory;
      if (!this.queuedPromise) {
        const onComplete = /* @__PURE__ */ __name(() => {
          this.queuedPromise = null;
          if (this.cancellationTokenSource.token.isCancellationRequested) {
            return;
          }
          const result = this.queue(this.queuedPromiseFactory);
          this.queuedPromiseFactory = null;
          return result;
        }, "onComplete");
        this.queuedPromise = new Promise((resolve2) => {
          this.activePromise.then(onComplete, onComplete).then(resolve2);
        });
      }
      return new Promise((resolve2, reject) => {
        this.queuedPromise.then(resolve2, reject);
      });
    }
    this.activePromise = promiseFactory(this.cancellationTokenSource.token);
    return new Promise((resolve2, reject) => {
      this.activePromise.then((result) => {
        this.activePromise = null;
        resolve2(result);
      }, (err) => {
        this.activePromise = null;
        reject(err);
      });
    });
  }
  dispose() {
    this.cancellationTokenSource.cancel();
  }
};
var Sequencer = class {
  static {
    __name(this, "Sequencer");
  }
  constructor() {
    this.current = Promise.resolve(null);
  }
  queue(promiseTask) {
    return this.current = this.current.then(() => promiseTask(), () => promiseTask());
  }
};
var SequencerByKey = class {
  static {
    __name(this, "SequencerByKey");
  }
  constructor() {
    this.promiseMap = /* @__PURE__ */ new Map();
  }
  queue(key, promiseTask) {
    const runningPromise = this.promiseMap.get(key) ?? Promise.resolve();
    const newPromise = runningPromise.catch(() => {
    }).then(promiseTask).finally(() => {
      if (this.promiseMap.get(key) === newPromise) {
        this.promiseMap.delete(key);
      }
    });
    this.promiseMap.set(key, newPromise);
    return newPromise;
  }
  peek(key) {
    return this.promiseMap.get(key) || void 0;
  }
  keys() {
    return this.promiseMap.keys();
  }
};
var timeoutDeferred = /* @__PURE__ */ __name((timeout2, fn) => {
  let scheduled = true;
  const handle = setTimeout(() => {
    scheduled = false;
    fn();
  }, timeout2);
  return {
    isTriggered: /* @__PURE__ */ __name(() => scheduled, "isTriggered"),
    dispose: /* @__PURE__ */ __name(() => {
      clearTimeout(handle);
      scheduled = false;
    }, "dispose")
  };
}, "timeoutDeferred");
var microtaskDeferred = /* @__PURE__ */ __name((fn) => {
  let scheduled = true;
  queueMicrotask(() => {
    if (scheduled) {
      scheduled = false;
      fn();
    }
  });
  return {
    isTriggered: /* @__PURE__ */ __name(() => scheduled, "isTriggered"),
    dispose: /* @__PURE__ */ __name(() => {
      scheduled = false;
    }, "dispose")
  };
}, "microtaskDeferred");
var Delayer = class {
  static {
    __name(this, "Delayer");
  }
  constructor(defaultDelay) {
    this.defaultDelay = defaultDelay;
    this.deferred = null;
    this.completionPromise = null;
    this.doResolve = null;
    this.doReject = null;
    this.task = null;
  }
  trigger(task, delay = this.defaultDelay) {
    this.task = task;
    this.cancelTimeout();
    if (!this.completionPromise) {
      this.completionPromise = new Promise((resolve2, reject) => {
        this.doResolve = resolve2;
        this.doReject = reject;
      }).then(() => {
        this.completionPromise = null;
        this.doResolve = null;
        if (this.task) {
          const task2 = this.task;
          this.task = null;
          return task2();
        }
        return void 0;
      });
    }
    const fn = /* @__PURE__ */ __name(() => {
      this.deferred = null;
      this.doResolve?.(null);
    }, "fn");
    this.deferred = delay === MicrotaskDelay ? microtaskDeferred(fn) : timeoutDeferred(delay, fn);
    return this.completionPromise;
  }
  isTriggered() {
    return !!this.deferred?.isTriggered();
  }
  cancel() {
    this.cancelTimeout();
    if (this.completionPromise) {
      this.doReject?.(new CancellationError());
      this.completionPromise = null;
    }
  }
  cancelTimeout() {
    this.deferred?.dispose();
    this.deferred = null;
  }
  dispose() {
    this.cancel();
  }
};
var ThrottledDelayer = class {
  static {
    __name(this, "ThrottledDelayer");
  }
  constructor(defaultDelay) {
    this.delayer = new Delayer(defaultDelay);
    this.throttler = new Throttler();
  }
  trigger(promiseFactory, delay) {
    return this.delayer.trigger(() => this.throttler.queue(promiseFactory), delay);
  }
  isTriggered() {
    return this.delayer.isTriggered();
  }
  cancel() {
    this.delayer.cancel();
  }
  dispose() {
    this.delayer.dispose();
    this.throttler.dispose();
  }
};
var Barrier = class {
  static {
    __name(this, "Barrier");
  }
  constructor() {
    this._isOpen = false;
    this._promise = new Promise((c, e) => {
      this._completePromise = c;
    });
  }
  isOpen() {
    return this._isOpen;
  }
  open() {
    this._isOpen = true;
    this._completePromise(true);
  }
  wait() {
    return this._promise;
  }
};
var AutoOpenBarrier = class extends Barrier {
  static {
    __name(this, "AutoOpenBarrier");
  }
  constructor(autoOpenTimeMs) {
    super();
    this._timeout = setTimeout(() => this.open(), autoOpenTimeMs);
  }
  open() {
    clearTimeout(this._timeout);
    super.open();
  }
};
function timeout(millis, token) {
  if (!token) {
    return createCancelablePromise((token2) => timeout(millis, token2));
  }
  return new Promise((resolve2, reject) => {
    const handle = setTimeout(() => {
      disposable.dispose();
      resolve2();
    }, millis);
    const disposable = token.onCancellationRequested(() => {
      clearTimeout(handle);
      disposable.dispose();
      reject(new CancellationError());
    });
  });
}
__name(timeout, "timeout");
function disposableTimeout(handler, timeout2 = 0, store) {
  const timer = setTimeout(() => {
    handler();
    if (store) {
      disposable.dispose();
    }
  }, timeout2);
  const disposable = toDisposable(() => {
    clearTimeout(timer);
    store?.delete(disposable);
  });
  store?.add(disposable);
  return disposable;
}
__name(disposableTimeout, "disposableTimeout");
function sequence(promiseFactories) {
  const results = [];
  let index2 = 0;
  const len = promiseFactories.length;
  function next() {
    return index2 < len ? promiseFactories[index2++]() : null;
  }
  __name(next, "next");
  function thenHandler(result) {
    if (result !== void 0 && result !== null) {
      results.push(result);
    }
    const n = next();
    if (n) {
      return n.then(thenHandler);
    }
    return Promise.resolve(results);
  }
  __name(thenHandler, "thenHandler");
  return Promise.resolve(null).then(thenHandler);
}
__name(sequence, "sequence");
function first(promiseFactories, shouldStop = (t) => !!t, defaultValue = null) {
  let index2 = 0;
  const len = promiseFactories.length;
  const loop = /* @__PURE__ */ __name(() => {
    if (index2 >= len) {
      return Promise.resolve(defaultValue);
    }
    const factory = promiseFactories[index2++];
    const promise = Promise.resolve(factory());
    return promise.then((result) => {
      if (shouldStop(result)) {
        return Promise.resolve(result);
      }
      return loop();
    });
  }, "loop");
  return loop();
}
__name(first, "first");
function firstParallel(promiseList, shouldStop = (t) => !!t, defaultValue = null) {
  if (promiseList.length === 0) {
    return Promise.resolve(defaultValue);
  }
  let todo = promiseList.length;
  const finish = /* @__PURE__ */ __name(() => {
    todo = -1;
    for (const promise of promiseList) {
      promise.cancel?.();
    }
  }, "finish");
  return new Promise((resolve2, reject) => {
    for (const promise of promiseList) {
      promise.then((result) => {
        if (--todo >= 0 && shouldStop(result)) {
          finish();
          resolve2(result);
        } else if (todo === 0) {
          resolve2(defaultValue);
        }
      }).catch((err) => {
        if (--todo >= 0) {
          finish();
          reject(err);
        }
      });
    }
  });
}
__name(firstParallel, "firstParallel");
var Limiter = class {
  static {
    __name(this, "Limiter");
  }
  constructor(maxDegreeOfParalellism) {
    this._size = 0;
    this._isDisposed = false;
    this.maxDegreeOfParalellism = maxDegreeOfParalellism;
    this.outstandingPromises = [];
    this.runningPromises = 0;
    this._onDrained = new Emitter();
  }
  /**
   *
   * @returns A promise that resolved when all work is done (onDrained) or when
   * there is nothing to do
   */
  whenIdle() {
    return this.size > 0 ? Event.toPromise(this.onDrained) : Promise.resolve();
  }
  get onDrained() {
    return this._onDrained.event;
  }
  get size() {
    return this._size;
  }
  queue(factory) {
    if (this._isDisposed) {
      throw new Error("Object has been disposed");
    }
    this._size++;
    return new Promise((c, e) => {
      this.outstandingPromises.push({ factory, c, e });
      this.consume();
    });
  }
  consume() {
    while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
      const iLimitedTask = this.outstandingPromises.shift();
      this.runningPromises++;
      const promise = iLimitedTask.factory();
      promise.then(iLimitedTask.c, iLimitedTask.e);
      promise.then(() => this.consumed(), () => this.consumed());
    }
  }
  consumed() {
    if (this._isDisposed) {
      return;
    }
    this.runningPromises--;
    if (--this._size === 0) {
      this._onDrained.fire();
    }
    if (this.outstandingPromises.length > 0) {
      this.consume();
    }
  }
  clear() {
    if (this._isDisposed) {
      throw new Error("Object has been disposed");
    }
    this.outstandingPromises.length = 0;
    this._size = this.runningPromises;
  }
  dispose() {
    this._isDisposed = true;
    this.outstandingPromises.length = 0;
    this._size = 0;
    this._onDrained.dispose();
  }
};
var Queue = class extends Limiter {
  static {
    __name(this, "Queue");
  }
  constructor() {
    super(1);
  }
};
var LimitedQueue = class {
  static {
    __name(this, "LimitedQueue");
  }
  constructor() {
    this.sequentializer = new TaskSequentializer();
    this.tasks = 0;
  }
  queue(factory) {
    if (!this.sequentializer.isRunning()) {
      return this.sequentializer.run(this.tasks++, factory());
    }
    return this.sequentializer.queue(() => {
      return this.sequentializer.run(this.tasks++, factory());
    });
  }
};
var ResourceQueue = class {
  static {
    __name(this, "ResourceQueue");
  }
  constructor() {
    this.queues = /* @__PURE__ */ new Map();
    this.drainers = /* @__PURE__ */ new Set();
    this.drainListeners = void 0;
    this.drainListenerCount = 0;
  }
  async whenDrained() {
    if (this.isDrained()) {
      return;
    }
    const promise = new DeferredPromise();
    this.drainers.add(promise);
    return promise.p;
  }
  isDrained() {
    for (const [, queue] of this.queues) {
      if (queue.size > 0) {
        return false;
      }
    }
    return true;
  }
  queueSize(resource, extUri2 = extUri) {
    const key = extUri2.getComparisonKey(resource);
    return this.queues.get(key)?.size ?? 0;
  }
  queueFor(resource, factory, extUri2 = extUri) {
    const key = extUri2.getComparisonKey(resource);
    let queue = this.queues.get(key);
    if (!queue) {
      queue = new Queue();
      const drainListenerId = this.drainListenerCount++;
      const drainListener = Event.once(queue.onDrained)(() => {
        queue?.dispose();
        this.queues.delete(key);
        this.onDidQueueDrain();
        this.drainListeners?.deleteAndDispose(drainListenerId);
        if (this.drainListeners?.size === 0) {
          this.drainListeners.dispose();
          this.drainListeners = void 0;
        }
      });
      if (!this.drainListeners) {
        this.drainListeners = new DisposableMap();
      }
      this.drainListeners.set(drainListenerId, drainListener);
      this.queues.set(key, queue);
    }
    return queue.queue(factory);
  }
  onDidQueueDrain() {
    if (!this.isDrained()) {
      return;
    }
    this.releaseDrainers();
  }
  releaseDrainers() {
    for (const drainer of this.drainers) {
      drainer.complete();
    }
    this.drainers.clear();
  }
  dispose() {
    for (const [, queue] of this.queues) {
      queue.dispose();
    }
    this.queues.clear();
    this.releaseDrainers();
    this.drainListeners?.dispose();
  }
};
var TaskQueue = class {
  static {
    __name(this, "TaskQueue");
  }
  constructor() {
    this._runningTask = void 0;
    this._pendingTasks = [];
  }
  /**
   * Waits for the current and pending tasks to finish, then runs and awaits the given task.
   * If the task is skipped because of clearPending, the promise is rejected with a CancellationError.
  */
  schedule(task) {
    const deferred = new DeferredPromise();
    this._pendingTasks.push({ task, deferred, setUndefinedWhenCleared: false });
    this._runIfNotRunning();
    return deferred.p;
  }
  /**
   * Waits for the current and pending tasks to finish, then runs and awaits the given task.
   * If the task is skipped because of clearPending, the promise is resolved with undefined.
  */
  scheduleSkipIfCleared(task) {
    const deferred = new DeferredPromise();
    this._pendingTasks.push({ task, deferred, setUndefinedWhenCleared: true });
    this._runIfNotRunning();
    return deferred.p;
  }
  _runIfNotRunning() {
    if (this._runningTask === void 0) {
      this._processQueue();
    }
  }
  async _processQueue() {
    if (this._pendingTasks.length === 0) {
      return;
    }
    const next = this._pendingTasks.shift();
    if (!next) {
      return;
    }
    if (this._runningTask) {
      throw new BugIndicatingError();
    }
    this._runningTask = next.task;
    try {
      const result = await next.task();
      next.deferred.complete(result);
    } catch (e) {
      next.deferred.error(e);
    } finally {
      this._runningTask = void 0;
      this._processQueue();
    }
  }
  /**
   * Clears all pending tasks. Does not cancel the currently running task.
  */
  clearPending() {
    const tasks = this._pendingTasks;
    this._pendingTasks = [];
    for (const task of tasks) {
      if (task.setUndefinedWhenCleared) {
        task.deferred.complete(void 0);
      } else {
        task.deferred.error(new CancellationError());
      }
    }
  }
};
var TimeoutTimer = class {
  static {
    __name(this, "TimeoutTimer");
  }
  constructor(runner, timeout2) {
    this._isDisposed = false;
    this._token = void 0;
    if (typeof runner === "function" && typeof timeout2 === "number") {
      this.setIfNotSet(runner, timeout2);
    }
  }
  dispose() {
    this.cancel();
    this._isDisposed = true;
  }
  cancel() {
    if (this._token !== void 0) {
      clearTimeout(this._token);
      this._token = void 0;
    }
  }
  cancelAndSet(runner, timeout2) {
    if (this._isDisposed) {
      throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed TimeoutTimer`);
    }
    this.cancel();
    this._token = setTimeout(() => {
      this._token = void 0;
      runner();
    }, timeout2);
  }
  setIfNotSet(runner, timeout2) {
    if (this._isDisposed) {
      throw new BugIndicatingError(`Calling 'setIfNotSet' on a disposed TimeoutTimer`);
    }
    if (this._token !== void 0) {
      return;
    }
    this._token = setTimeout(() => {
      this._token = void 0;
      runner();
    }, timeout2);
  }
};
var IntervalTimer = class {
  static {
    __name(this, "IntervalTimer");
  }
  constructor() {
    this.disposable = void 0;
    this.isDisposed = false;
  }
  cancel() {
    this.disposable?.dispose();
    this.disposable = void 0;
  }
  cancelAndSet(runner, interval, context = globalThis) {
    if (this.isDisposed) {
      throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed IntervalTimer`);
    }
    this.cancel();
    const handle = context.setInterval(() => {
      runner();
    }, interval);
    this.disposable = toDisposable(() => {
      context.clearInterval(handle);
      this.disposable = void 0;
    });
  }
  dispose() {
    this.cancel();
    this.isDisposed = true;
  }
};
var RunOnceScheduler = class {
  static {
    __name(this, "RunOnceScheduler");
  }
  constructor(runner, delay) {
    this.timeoutToken = void 0;
    this.runner = runner;
    this.timeout = delay;
    this.timeoutHandler = this.onTimeout.bind(this);
  }
  /**
   * Dispose RunOnceScheduler
   */
  dispose() {
    this.cancel();
    this.runner = null;
  }
  /**
   * Cancel current scheduled runner (if any).
   */
  cancel() {
    if (this.isScheduled()) {
      clearTimeout(this.timeoutToken);
      this.timeoutToken = void 0;
    }
  }
  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.timeout) {
    this.cancel();
    this.timeoutToken = setTimeout(this.timeoutHandler, delay);
  }
  get delay() {
    return this.timeout;
  }
  set delay(value) {
    this.timeout = value;
  }
  /**
   * Returns true if scheduled.
   */
  isScheduled() {
    return this.timeoutToken !== void 0;
  }
  flush() {
    if (this.isScheduled()) {
      this.cancel();
      this.doRun();
    }
  }
  onTimeout() {
    this.timeoutToken = void 0;
    if (this.runner) {
      this.doRun();
    }
  }
  doRun() {
    this.runner?.();
  }
};
var ProcessTimeRunOnceScheduler = class {
  static {
    __name(this, "ProcessTimeRunOnceScheduler");
  }
  constructor(runner, delay) {
    if (delay % 1e3 !== 0) {
      console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
    }
    this.runner = runner;
    this.timeout = delay;
    this.counter = 0;
    this.intervalToken = void 0;
    this.intervalHandler = this.onInterval.bind(this);
  }
  dispose() {
    this.cancel();
    this.runner = null;
  }
  cancel() {
    if (this.isScheduled()) {
      clearInterval(this.intervalToken);
      this.intervalToken = void 0;
    }
  }
  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.timeout) {
    if (delay % 1e3 !== 0) {
      console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
    }
    this.cancel();
    this.counter = Math.ceil(delay / 1e3);
    this.intervalToken = setInterval(this.intervalHandler, 1e3);
  }
  /**
   * Returns true if scheduled.
   */
  isScheduled() {
    return this.intervalToken !== void 0;
  }
  onInterval() {
    this.counter--;
    if (this.counter > 0) {
      return;
    }
    clearInterval(this.intervalToken);
    this.intervalToken = void 0;
    this.runner?.();
  }
};
var RunOnceWorker = class extends RunOnceScheduler {
  static {
    __name(this, "RunOnceWorker");
  }
  constructor(runner, timeout2) {
    super(runner, timeout2);
    this.units = [];
  }
  work(unit) {
    this.units.push(unit);
    if (!this.isScheduled()) {
      this.schedule();
    }
  }
  doRun() {
    const units = this.units;
    this.units = [];
    this.runner?.(units);
  }
  dispose() {
    this.units = [];
    super.dispose();
  }
};
var ThrottledWorker = class extends Disposable {
  static {
    __name(this, "ThrottledWorker");
  }
  constructor(options, handler) {
    super();
    this.options = options;
    this.handler = handler;
    this.pendingWork = [];
    this.throttler = this._register(new MutableDisposable());
    this.disposed = false;
    this.lastExecutionTime = 0;
  }
  /**
   * The number of work units that are pending to be processed.
   */
  get pending() {
    return this.pendingWork.length;
  }
  /**
   * Add units to be worked on. Use `pending` to figure out
   * how many units are not yet processed after this method
   * was called.
   *
   * @returns whether the work was accepted or not. If the
   * worker is disposed, it will not accept any more work.
   * If the number of pending units would become larger
   * than `maxPendingWork`, more work will also not be accepted.
   */
  work(units) {
    if (this.disposed) {
      return false;
    }
    if (typeof this.options.maxBufferedWork === "number") {
      if (this.throttler.value) {
        if (this.pending + units.length > this.options.maxBufferedWork) {
          return false;
        }
      } else {
        if (this.pending + units.length - this.options.maxWorkChunkSize > this.options.maxBufferedWork) {
          return false;
        }
      }
    }
    for (const unit of units) {
      this.pendingWork.push(unit);
    }
    const timeSinceLastExecution = Date.now() - this.lastExecutionTime;
    if (!this.throttler.value && (!this.options.waitThrottleDelayBetweenWorkUnits || timeSinceLastExecution >= this.options.throttleDelay)) {
      this.doWork();
    } else if (!this.throttler.value && this.options.waitThrottleDelayBetweenWorkUnits) {
      this.scheduleThrottler(Math.max(this.options.throttleDelay - timeSinceLastExecution, 0));
    } else {
    }
    return true;
  }
  doWork() {
    this.lastExecutionTime = Date.now();
    this.handler(this.pendingWork.splice(0, this.options.maxWorkChunkSize));
    if (this.pendingWork.length > 0) {
      this.scheduleThrottler();
    }
  }
  scheduleThrottler(delay = this.options.throttleDelay) {
    this.throttler.value = new RunOnceScheduler(() => {
      this.throttler.clear();
      this.doWork();
    }, delay);
    this.throttler.value.schedule();
  }
  dispose() {
    super.dispose();
    this.pendingWork.length = 0;
    this.disposed = true;
  }
};
var runWhenGlobalIdle;
var _runWhenIdle;
(function() {
  const safeGlobal = globalThis;
  if (typeof safeGlobal.requestIdleCallback !== "function" || typeof safeGlobal.cancelIdleCallback !== "function") {
    _runWhenIdle = /* @__PURE__ */ __name((_targetWindow, runner, timeout2) => {
      setTimeout0(() => {
        if (disposed) {
          return;
        }
        const end = Date.now() + 15;
        const deadline = {
          didTimeout: true,
          timeRemaining() {
            return Math.max(0, end - Date.now());
          }
        };
        runner(Object.freeze(deadline));
      });
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
        }
      };
    }, "_runWhenIdle");
  } else {
    _runWhenIdle = /* @__PURE__ */ __name((targetWindow, runner, timeout2) => {
      const handle = targetWindow.requestIdleCallback(runner, typeof timeout2 === "number" ? { timeout: timeout2 } : void 0);
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
          targetWindow.cancelIdleCallback(handle);
        }
      };
    }, "_runWhenIdle");
  }
  runWhenGlobalIdle = /* @__PURE__ */ __name((runner, timeout2) => _runWhenIdle(globalThis, runner, timeout2), "runWhenGlobalIdle");
})();
function installFakeRunWhenIdle(fakeImpl) {
  const origRunWhenIdle = _runWhenIdle;
  const origRunWhenGlobalIdle = runWhenGlobalIdle;
  _runWhenIdle = fakeImpl;
  runWhenGlobalIdle = /* @__PURE__ */ __name((runner, timeout2) => fakeImpl(globalThis, runner, timeout2), "runWhenGlobalIdle");
  return toDisposable(() => {
    _runWhenIdle = origRunWhenIdle;
    runWhenGlobalIdle = origRunWhenGlobalIdle;
  });
}
__name(installFakeRunWhenIdle, "installFakeRunWhenIdle");
var AbstractIdleValue = class {
  static {
    __name(this, "AbstractIdleValue");
  }
  constructor(targetWindow, executor) {
    this._didRun = false;
    this._executor = () => {
      try {
        this._value = executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._didRun = true;
      }
    };
    this._handle = _runWhenIdle(targetWindow, () => this._executor());
  }
  dispose() {
    this._handle.dispose();
  }
  get value() {
    if (!this._didRun) {
      this._handle.dispose();
      this._executor();
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
  get isInitialized() {
    return this._didRun;
  }
};
var GlobalIdleValue = class extends AbstractIdleValue {
  static {
    __name(this, "GlobalIdleValue");
  }
  constructor(executor) {
    super(globalThis, executor);
  }
};
async function retry(task, delay, retries) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      await timeout(delay);
    }
  }
  throw lastError;
}
__name(retry, "retry");
var TaskSequentializer = class {
  static {
    __name(this, "TaskSequentializer");
  }
  isRunning(taskId) {
    if (typeof taskId === "number") {
      return this._running?.taskId === taskId;
    }
    return !!this._running;
  }
  get running() {
    return this._running?.promise;
  }
  cancelRunning() {
    this._running?.cancel();
  }
  run(taskId, promise, onCancel) {
    this._running = { taskId, cancel: /* @__PURE__ */ __name(() => onCancel?.(), "cancel"), promise };
    promise.then(() => this.doneRunning(taskId), () => this.doneRunning(taskId));
    return promise;
  }
  doneRunning(taskId) {
    if (this._running && taskId === this._running.taskId) {
      this._running = void 0;
      this.runQueued();
    }
  }
  runQueued() {
    if (this._queued) {
      const queued = this._queued;
      this._queued = void 0;
      queued.run().then(queued.promiseResolve, queued.promiseReject);
    }
  }
  /**
   * Note: the promise to schedule as next run MUST itself call `run`.
   *       Otherwise, this sequentializer will report `false` for `isRunning`
   *       even when this task is running. Missing this detail means that
   *       suddenly multiple tasks will run in parallel.
   */
  queue(run) {
    if (!this._queued) {
      const { promise, resolve: promiseResolve, reject: promiseReject } = promiseWithResolvers();
      this._queued = {
        run,
        promise,
        promiseResolve,
        promiseReject
      };
    } else {
      this._queued.run = run;
    }
    return this._queued.promise;
  }
  hasQueued() {
    return !!this._queued;
  }
  async join() {
    return this._queued?.promise ?? this._running?.promise;
  }
};
var IntervalCounter = class {
  static {
    __name(this, "IntervalCounter");
  }
  constructor(interval, nowFn = () => Date.now()) {
    this.interval = interval;
    this.nowFn = nowFn;
    this.lastIncrementTime = 0;
    this.value = 0;
  }
  increment() {
    const now = this.nowFn();
    if (now - this.lastIncrementTime > this.interval) {
      this.lastIncrementTime = now;
      this.value = 0;
    }
    this.value++;
    return this.value;
  }
};
var DeferredOutcome;
(function(DeferredOutcome2) {
  DeferredOutcome2[DeferredOutcome2["Resolved"] = 0] = "Resolved";
  DeferredOutcome2[DeferredOutcome2["Rejected"] = 1] = "Rejected";
})(DeferredOutcome || (DeferredOutcome = {}));
var DeferredPromise = class _DeferredPromise {
  static {
    __name(this, "DeferredPromise");
  }
  static fromPromise(promise) {
    const deferred = new _DeferredPromise();
    deferred.settleWith(promise);
    return deferred;
  }
  get isRejected() {
    return this.outcome?.outcome === 1;
  }
  get isResolved() {
    return this.outcome?.outcome === 0;
  }
  get isSettled() {
    return !!this.outcome;
  }
  get value() {
    return this.outcome?.outcome === 0 ? this.outcome?.value : void 0;
  }
  constructor() {
    this.p = new Promise((c, e) => {
      this.completeCallback = c;
      this.errorCallback = e;
    });
  }
  complete(value) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve2) => {
      this.completeCallback(value);
      this.outcome = { outcome: 0, value };
      resolve2();
    });
  }
  error(err) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve2) => {
      this.errorCallback(err);
      this.outcome = { outcome: 1, value: err };
      resolve2();
    });
  }
  settleWith(promise) {
    return promise.then((value) => this.complete(value), (error) => this.error(error));
  }
  cancel() {
    return this.error(new CancellationError());
  }
};
var Promises;
(function(Promises2) {
  async function settled(promises) {
    let firstError = void 0;
    const result = await Promise.all(promises.map((promise) => promise.then((value) => value, (error) => {
      if (!firstError) {
        firstError = error;
      }
      return void 0;
    })));
    if (typeof firstError !== "undefined") {
      throw firstError;
    }
    return result;
  }
  __name(settled, "settled");
  Promises2.settled = settled;
  function withAsyncBody(bodyFn) {
    return new Promise(async (resolve2, reject) => {
      try {
        await bodyFn(resolve2, reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  __name(withAsyncBody, "withAsyncBody");
  Promises2.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
var StatefulPromise = class {
  static {
    __name(this, "StatefulPromise");
  }
  get value() {
    return this._value;
  }
  get error() {
    return this._error;
  }
  get isResolved() {
    return this._isResolved;
  }
  constructor(promise) {
    this._value = void 0;
    this._error = void 0;
    this._isResolved = false;
    this.promise = promise.then((value) => {
      this._value = value;
      this._isResolved = true;
      return value;
    }, (error) => {
      this._error = error;
      this._isResolved = true;
      throw error;
    });
  }
  /**
   * Returns the resolved value.
   * Throws if the promise is not resolved yet.
   */
  requireValue() {
    if (!this._isResolved) {
      throw new BugIndicatingError("Promise is not resolved yet");
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
};
var LazyStatefulPromise = class {
  static {
    __name(this, "LazyStatefulPromise");
  }
  constructor(_compute) {
    this._compute = _compute;
    this._promise = new Lazy(() => new StatefulPromise(this._compute()));
  }
  /**
   * Returns the resolved value.
   * Throws if the promise is not resolved yet.
   */
  requireValue() {
    return this._promise.value.requireValue();
  }
  /**
   * Returns the promise (and triggers a computation of the promise if not yet done so).
   */
  getPromise() {
    return this._promise.value.promise;
  }
  /**
   * Reads the current value without triggering a computation of the promise.
   */
  get currentValue() {
    return this._promise.rawValue?.value;
  }
};
var AsyncIterableSourceState;
(function(AsyncIterableSourceState2) {
  AsyncIterableSourceState2[AsyncIterableSourceState2["Initial"] = 0] = "Initial";
  AsyncIterableSourceState2[AsyncIterableSourceState2["DoneOK"] = 1] = "DoneOK";
  AsyncIterableSourceState2[AsyncIterableSourceState2["DoneError"] = 2] = "DoneError";
})(AsyncIterableSourceState || (AsyncIterableSourceState = {}));
var AsyncIterableObject = class _AsyncIterableObject {
  static {
    __name(this, "AsyncIterableObject");
  }
  static fromArray(items) {
    return new _AsyncIterableObject((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _AsyncIterableObject(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _AsyncIterableObject(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _AsyncIterableObject(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = this.fromArray([]);
  }
  constructor(executor, onReturn) {
    this._state = 0;
    this._results = [];
    this._error = null;
    this._onReturn = onReturn;
    this._onStateChanged = new Emitter();
    queueMicrotask(async () => {
      const writer = {
        emitOne: /* @__PURE__ */ __name((item) => this.emitOne(item), "emitOne"),
        emitMany: /* @__PURE__ */ __name((items) => this.emitMany(items), "emitMany"),
        reject: /* @__PURE__ */ __name((error) => this.reject(error), "reject")
      };
      try {
        await Promise.resolve(executor(writer));
        this.resolve();
      } catch (err) {
        this.reject(err);
      } finally {
        writer.emitOne = void 0;
        writer.emitMany = void 0;
        writer.reject = void 0;
      }
    });
  }
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: /* @__PURE__ */ __name(async () => {
        do {
          if (this._state === 2) {
            throw this._error;
          }
          if (i < this._results.length) {
            return { done: false, value: this._results[i++] };
          }
          if (this._state === 1) {
            return { done: true, value: void 0 };
          }
          await Event.toPromise(this._onStateChanged.event);
        } while (true);
      }, "next"),
      return: /* @__PURE__ */ __name(async () => {
        this._onReturn?.();
        return { done: true, value: void 0 };
      }, "return")
    };
  }
  static map(iterable, mapFn) {
    return new _AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  map(mapFn) {
    return _AsyncIterableObject.map(this, mapFn);
  }
  static filter(iterable, filterFn) {
    return new _AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _AsyncIterableObject.filter(this, filterFn);
  }
  static coalesce(iterable) {
    return _AsyncIterableObject.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _AsyncIterableObject.coalesce(this);
  }
  static async toPromise(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  toPromise() {
    return _AsyncIterableObject.toPromise(this);
  }
  /**
   * The value will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitOne(value) {
    if (this._state !== 0) {
      return;
    }
    this._results.push(value);
    this._onStateChanged.fire();
  }
  /**
   * The values will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitMany(values) {
    if (this._state !== 0) {
      return;
    }
    this._results = this._results.concat(values);
    this._onStateChanged.fire();
  }
  /**
   * Calling `resolve()` will mark the result array as complete.
   *
   * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  resolve() {
    if (this._state !== 0) {
      return;
    }
    this._state = 1;
    this._onStateChanged.fire();
  }
  /**
   * Writing an error will permanently invalidate this iterable.
   * The current users will receive an error thrown, as will all future users.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  reject(error) {
    if (this._state !== 0) {
      return;
    }
    this._state = 2;
    this._error = error;
    this._onStateChanged.fire();
  }
};
function createCancelableAsyncIterableProducer(callback) {
  const source = new CancellationTokenSource();
  const innerIterable = callback(source.token);
  return new CancelableAsyncIterableProducer(source, async (emitter) => {
    const subscription = source.token.onCancellationRequested(() => {
      subscription.dispose();
      source.dispose();
      emitter.reject(new CancellationError());
    });
    try {
      for await (const item of innerIterable) {
        if (source.token.isCancellationRequested) {
          return;
        }
        emitter.emitOne(item);
      }
      subscription.dispose();
      source.dispose();
    } catch (err) {
      subscription.dispose();
      source.dispose();
      emitter.reject(err);
    }
  });
}
__name(createCancelableAsyncIterableProducer, "createCancelableAsyncIterableProducer");
var AsyncIterableSource = class {
  static {
    __name(this, "AsyncIterableSource");
  }
  /**
   *
   * @param onReturn A function that will be called when consuming the async iterable
   * has finished by the consumer, e.g the for-await-loop has be existed (break, return) early.
   * This is NOT called when resolving this source by its owner.
   */
  constructor(onReturn) {
    this._deferred = new DeferredPromise();
    this._asyncIterable = new AsyncIterableObject((emitter) => {
      if (earlyError) {
        emitter.reject(earlyError);
        return;
      }
      if (earlyItems) {
        emitter.emitMany(earlyItems);
      }
      this._errorFn = (error) => emitter.reject(error);
      this._emitOneFn = (item) => emitter.emitOne(item);
      this._emitManyFn = (items) => emitter.emitMany(items);
      return this._deferred.p;
    }, onReturn);
    let earlyError;
    let earlyItems;
    this._errorFn = (error) => {
      if (!earlyError) {
        earlyError = error;
      }
    };
    this._emitOneFn = (item) => {
      if (!earlyItems) {
        earlyItems = [];
      }
      earlyItems.push(item);
    };
    this._emitManyFn = (items) => {
      if (!earlyItems) {
        earlyItems = items.slice();
      } else {
        items.forEach((item) => earlyItems.push(item));
      }
    };
  }
  get asyncIterable() {
    return this._asyncIterable;
  }
  resolve() {
    this._deferred.complete();
  }
  reject(error) {
    this._errorFn(error);
    this._deferred.complete();
  }
  emitOne(item) {
    this._emitOneFn(item);
  }
  emitMany(items) {
    this._emitManyFn(items);
  }
};
function cancellableIterable(iterableOrIterator, token) {
  const iterator = Symbol.asyncIterator in iterableOrIterator ? iterableOrIterator[Symbol.asyncIterator]() : iterableOrIterator;
  return {
    async next() {
      if (token.isCancellationRequested) {
        return { done: true, value: void 0 };
      }
      const result = await raceCancellation(iterator.next(), token);
      return result || { done: true, value: void 0 };
    },
    throw: iterator.throw?.bind(iterator),
    return: iterator.return?.bind(iterator),
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
__name(cancellableIterable, "cancellableIterable");
var ProducerConsumer = class {
  static {
    __name(this, "ProducerConsumer");
  }
  constructor() {
    this._unsatisfiedConsumers = [];
    this._unconsumedValues = [];
  }
  get hasFinalValue() {
    return !!this._finalValue;
  }
  produce(value) {
    this._ensureNoFinalValue();
    if (this._unsatisfiedConsumers.length > 0) {
      const deferred = this._unsatisfiedConsumers.shift();
      this._resolveOrRejectDeferred(deferred, value);
    } else {
      this._unconsumedValues.push(value);
    }
  }
  produceFinal(value) {
    this._ensureNoFinalValue();
    this._finalValue = value;
    for (const deferred of this._unsatisfiedConsumers) {
      this._resolveOrRejectDeferred(deferred, value);
    }
    this._unsatisfiedConsumers.length = 0;
  }
  _ensureNoFinalValue() {
    if (this._finalValue) {
      throw new BugIndicatingError("ProducerConsumer: cannot produce after final value has been set");
    }
  }
  _resolveOrRejectDeferred(deferred, value) {
    if (value.ok) {
      deferred.complete(value.value);
    } else {
      deferred.error(value.error);
    }
  }
  consume() {
    if (this._unconsumedValues.length > 0 || this._finalValue) {
      const value = this._unconsumedValues.length > 0 ? this._unconsumedValues.shift() : this._finalValue;
      if (value.ok) {
        return Promise.resolve(value.value);
      } else {
        return Promise.reject(value.error);
      }
    } else {
      const deferred = new DeferredPromise();
      this._unsatisfiedConsumers.push(deferred);
      return deferred.p;
    }
  }
};
var AsyncIterableProducer = class _AsyncIterableProducer {
  static {
    __name(this, "AsyncIterableProducer");
  }
  constructor(executor, _onReturn) {
    this._onReturn = _onReturn;
    this._producerConsumer = new ProducerConsumer();
    this._iterator = {
      next: /* @__PURE__ */ __name(() => this._producerConsumer.consume(), "next"),
      return: /* @__PURE__ */ __name(() => {
        this._onReturn?.();
        return Promise.resolve({ done: true, value: void 0 });
      }, "return"),
      throw: /* @__PURE__ */ __name(async (e) => {
        this._finishError(e);
        return { done: true, value: void 0 };
      }, "throw")
    };
    queueMicrotask(async () => {
      const p = executor({
        emitOne: /* @__PURE__ */ __name((value) => this._producerConsumer.produce({ ok: true, value: { done: false, value } }), "emitOne"),
        emitMany: /* @__PURE__ */ __name((values) => {
          for (const value of values) {
            this._producerConsumer.produce({ ok: true, value: { done: false, value } });
          }
        }, "emitMany"),
        reject: /* @__PURE__ */ __name((error) => this._finishError(error), "reject")
      });
      if (!this._producerConsumer.hasFinalValue) {
        try {
          await p;
          this._finishOk();
        } catch (error) {
          this._finishError(error);
        }
      }
    });
  }
  static fromArray(items) {
    return new _AsyncIterableProducer((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _AsyncIterableProducer(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _AsyncIterableProducer(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _AsyncIterableProducer(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = this.fromArray([]);
  }
  static map(iterable, mapFn) {
    return new _AsyncIterableProducer(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  static tee(iterable) {
    let emitter1;
    let emitter2;
    const defer = new DeferredPromise();
    const start = /* @__PURE__ */ __name(async () => {
      if (!emitter1 || !emitter2) {
        return;
      }
      try {
        for await (const item of iterable) {
          emitter1.emitOne(item);
          emitter2.emitOne(item);
        }
      } catch (err) {
        emitter1.reject(err);
        emitter2.reject(err);
      } finally {
        defer.complete();
      }
    }, "start");
    const p1 = new _AsyncIterableProducer(async (emitter) => {
      emitter1 = emitter;
      start();
      return defer.p;
    });
    const p2 = new _AsyncIterableProducer(async (emitter) => {
      emitter2 = emitter;
      start();
      return defer.p;
    });
    return [p1, p2];
  }
  map(mapFn) {
    return _AsyncIterableProducer.map(this, mapFn);
  }
  static coalesce(iterable) {
    return _AsyncIterableProducer.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _AsyncIterableProducer.coalesce(this);
  }
  static filter(iterable, filterFn) {
    return new _AsyncIterableProducer(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _AsyncIterableProducer.filter(this, filterFn);
  }
  _finishOk() {
    if (!this._producerConsumer.hasFinalValue) {
      this._producerConsumer.produceFinal({ ok: true, value: { done: true, value: void 0 } });
    }
  }
  _finishError(error) {
    if (!this._producerConsumer.hasFinalValue) {
      this._producerConsumer.produceFinal({ ok: false, error });
    }
  }
  [Symbol.asyncIterator]() {
    return this._iterator;
  }
};
var CancelableAsyncIterableProducer = class extends AsyncIterableProducer {
  static {
    __name(this, "CancelableAsyncIterableProducer");
  }
  constructor(_source, executor) {
    super(executor);
    this._source = _source;
  }
  cancel() {
    this._source.cancel();
  }
};
var AsyncReaderEndOfStream = /* @__PURE__ */ Symbol("AsyncReaderEndOfStream");
var AsyncReader = class {
  static {
    __name(this, "AsyncReader");
  }
  get endOfStream() {
    return this._buffer.length === 0 && this._atEnd;
  }
  constructor(_source) {
    this._source = _source;
    this._buffer = [];
    this._atEnd = false;
  }
  async read() {
    if (this._buffer.length === 0 && !this._atEnd) {
      await this._extendBuffer();
    }
    if (this._buffer.length === 0) {
      return AsyncReaderEndOfStream;
    }
    return this._buffer.shift();
  }
  async readWhile(predicate, callback) {
    do {
      const piece = await this.peek();
      if (piece === AsyncReaderEndOfStream) {
        break;
      }
      if (!predicate(piece)) {
        break;
      }
      await this.read();
      await callback(piece);
    } while (true);
  }
  readBufferedOrThrow() {
    const value = this.peekBufferedOrThrow();
    this._buffer.shift();
    return value;
  }
  async consumeToEnd() {
    while (!this.endOfStream) {
      await this.read();
    }
  }
  async peek() {
    if (this._buffer.length === 0 && !this._atEnd) {
      await this._extendBuffer();
    }
    if (this._buffer.length === 0) {
      return AsyncReaderEndOfStream;
    }
    return this._buffer[0];
  }
  peekBufferedOrThrow() {
    if (this._buffer.length === 0) {
      if (this._atEnd) {
        return AsyncReaderEndOfStream;
      }
      throw new BugIndicatingError("No buffered elements");
    }
    return this._buffer[0];
  }
  async peekTimeout(timeoutMs) {
    if (this._buffer.length === 0 && !this._atEnd) {
      await raceTimeout(this._extendBuffer(), timeoutMs);
    }
    if (this._atEnd) {
      return AsyncReaderEndOfStream;
    }
    if (this._buffer.length === 0) {
      return void 0;
    }
    return this._buffer[0];
  }
  _extendBuffer() {
    if (this._atEnd) {
      return Promise.resolve();
    }
    if (!this._extendBufferPromise) {
      this._extendBufferPromise = (async () => {
        const { value, done } = await this._source.next();
        this._extendBufferPromise = void 0;
        if (done) {
          this._atEnd = true;
        } else {
          this._buffer.push(value);
        }
      })();
    }
    return this._extendBufferPromise;
  }
};
function createTimeout(ms, cb) {
  const t = setTimeout(cb, ms);
  return toDisposable(() => clearTimeout(t));
}
__name(createTimeout, "createTimeout");

// ../Output/Target/Microsoft/VSCode/vs/base/common/glob.js
function getEmptyExpression() {
  return /* @__PURE__ */ Object.create(null);
}
__name(getEmptyExpression, "getEmptyExpression");
var GLOBSTAR = "**";
var GLOB_SPLIT = "/";
var PATH_REGEX = "[/\\\\]";
var NO_PATH_REGEX = "[^/\\\\]";
var ALL_FORWARD_SLASHES = /\//g;
function starsToRegExp(starCount, isLastPattern) {
  switch (starCount) {
    case 0:
      return "";
    case 1:
      return `${NO_PATH_REGEX}*?`;
    // 1 star matches any number of characters except path separator (/ and \) - non greedy (?)
    default:
      return `(?:${PATH_REGEX}|${NO_PATH_REGEX}+${PATH_REGEX}${isLastPattern ? `|${PATH_REGEX}${NO_PATH_REGEX}+` : ""})*?`;
  }
}
__name(starsToRegExp, "starsToRegExp");
function splitGlobAware(pattern, splitChar) {
  if (!pattern) {
    return [];
  }
  const segments = [];
  let inBraces = false;
  let inBrackets = false;
  let curVal = "";
  for (const char of pattern) {
    switch (char) {
      case splitChar:
        if (!inBraces && !inBrackets) {
          segments.push(curVal);
          curVal = "";
          continue;
        }
        break;
      case "{":
        inBraces = true;
        break;
      case "}":
        inBraces = false;
        break;
      case "[":
        inBrackets = true;
        break;
      case "]":
        inBrackets = false;
        break;
    }
    curVal += char;
  }
  if (curVal) {
    segments.push(curVal);
  }
  return segments;
}
__name(splitGlobAware, "splitGlobAware");
function parseRegExp(pattern) {
  if (!pattern) {
    return "";
  }
  let regEx = "";
  const segments = splitGlobAware(pattern, GLOB_SPLIT);
  if (segments.every((segment) => segment === GLOBSTAR)) {
    regEx = ".*";
  } else {
    let previousSegmentWasGlobStar = false;
    segments.forEach((segment, index2) => {
      if (segment === GLOBSTAR) {
        if (previousSegmentWasGlobStar) {
          return;
        }
        regEx += starsToRegExp(2, index2 === segments.length - 1);
      } else {
        let inBraces = false;
        let braceVal = "";
        let inBrackets = false;
        let bracketVal = "";
        for (const char of segment) {
          if (char !== "}" && inBraces) {
            braceVal += char;
            continue;
          }
          if (inBrackets && (char !== "]" || !bracketVal)) {
            let res;
            if (char === "-") {
              res = char;
            } else if ((char === "^" || char === "!") && !bracketVal) {
              res = "^";
            } else if (char === GLOB_SPLIT) {
              res = "";
            } else {
              res = escapeRegExpCharacters(char);
            }
            bracketVal += res;
            continue;
          }
          switch (char) {
            case "{":
              inBraces = true;
              continue;
            case "[":
              inBrackets = true;
              continue;
            case "}": {
              const choices = splitGlobAware(braceVal, ",");
              const braceRegExp = `(?:${choices.map((choice) => parseRegExp(choice)).join("|")})`;
              regEx += braceRegExp;
              inBraces = false;
              braceVal = "";
              break;
            }
            case "]": {
              regEx += "[" + bracketVal + "]";
              inBrackets = false;
              bracketVal = "";
              break;
            }
            case "?":
              regEx += NO_PATH_REGEX;
              continue;
            case "*":
              regEx += starsToRegExp(1);
              continue;
            default:
              regEx += escapeRegExpCharacters(char);
          }
        }
        if (index2 < segments.length - 1 && // more segments to come after this
        (segments[index2 + 1] !== GLOBSTAR || // next segment is not **, or...
        index2 + 2 < segments.length)) {
          regEx += PATH_REGEX;
        }
      }
      previousSegmentWasGlobStar = segment === GLOBSTAR;
    });
  }
  return regEx;
}
__name(parseRegExp, "parseRegExp");
var T1 = /^\*\*\/\*\.[\w\.-]+$/;
var T2 = /^\*\*\/([\w\.-]+)\/?$/;
var T3 = /^{\*\*\/\*?[\w\.-]+\/?(,\*\*\/\*?[\w\.-]+\/?)*}$/;
var T3_2 = /^{\*\*\/\*?[\w\.-]+(\/(\*\*)?)?(,\*\*\/\*?[\w\.-]+(\/(\*\*)?)?)*}$/;
var T4 = /^\*\*((\/[\w\.-]+)+)\/?$/;
var T5 = /^([\w\.-]+(\/[\w\.-]+)*)\/?$/;
var CACHE = new LRUCache(1e4);
var FALSE = /* @__PURE__ */ __name(function() {
  return false;
}, "FALSE");
var NULL = /* @__PURE__ */ __name(function() {
  return null;
}, "NULL");
function isEmptyPattern(pattern) {
  if (pattern === FALSE) {
    return true;
  }
  if (pattern === NULL) {
    return true;
  }
  return false;
}
__name(isEmptyPattern, "isEmptyPattern");
function parsePattern(arg1, options) {
  if (!arg1) {
    return NULL;
  }
  let pattern;
  if (typeof arg1 !== "string") {
    pattern = arg1.pattern;
  } else {
    pattern = arg1;
  }
  pattern = pattern.trim();
  const ignoreCase = options.ignoreCase ?? false;
  const internalOptions = {
    ...options,
    equals: ignoreCase ? equalsIgnoreCase : (a, b) => a === b,
    endsWith: ignoreCase ? endsWithIgnoreCase : (str, candidate) => str.endsWith(candidate),
    isEqualOrParent: /* @__PURE__ */ __name((base, candidate) => isEqualOrParent(
      base,
      candidate,
      options.ignoreCase ?? !isLinux
      /* preserve old behaviour for when option is not adopted */
    ), "isEqualOrParent")
  };
  const patternKey = `${ignoreCase ? pattern.toLowerCase() : pattern}_${!!options.trimForExclusions}_${ignoreCase}`;
  let parsedPattern = CACHE.get(patternKey);
  if (parsedPattern) {
    return wrapRelativePattern(parsedPattern, arg1, internalOptions);
  }
  let match2;
  if (T1.test(pattern)) {
    parsedPattern = trivia1(pattern.substring(4), pattern, internalOptions);
  } else if (match2 = T2.exec(trimForExclusions(pattern, internalOptions))) {
    parsedPattern = trivia2(match2[1], pattern, internalOptions);
  } else if ((options.trimForExclusions ? T3_2 : T3).test(pattern)) {
    parsedPattern = trivia3(pattern, internalOptions);
  } else if (match2 = T4.exec(trimForExclusions(pattern, internalOptions))) {
    parsedPattern = trivia4and5(match2[1].substring(1), pattern, true, internalOptions);
  } else if (match2 = T5.exec(trimForExclusions(pattern, internalOptions))) {
    parsedPattern = trivia4and5(match2[1], pattern, false, internalOptions);
  } else {
    parsedPattern = toRegExp(pattern, internalOptions);
  }
  CACHE.set(patternKey, parsedPattern);
  return wrapRelativePattern(parsedPattern, arg1, internalOptions);
}
__name(parsePattern, "parsePattern");
function wrapRelativePattern(parsedPattern, arg2, options) {
  if (typeof arg2 === "string") {
    return parsedPattern;
  }
  const wrappedPattern = /* @__PURE__ */ __name(function(path, basename3) {
    if (!options.isEqualOrParent(path, arg2.base)) {
      return null;
    }
    return parsedPattern(ltrim(path.substring(arg2.base.length), sep), basename3);
  }, "wrappedPattern");
  wrappedPattern.allBasenames = parsedPattern.allBasenames;
  wrappedPattern.allPaths = parsedPattern.allPaths;
  wrappedPattern.basenames = parsedPattern.basenames;
  wrappedPattern.patterns = parsedPattern.patterns;
  return wrappedPattern;
}
__name(wrapRelativePattern, "wrapRelativePattern");
function trimForExclusions(pattern, options) {
  return options.trimForExclusions && pattern.endsWith("/**") ? pattern.substring(0, pattern.length - 2) : pattern;
}
__name(trimForExclusions, "trimForExclusions");
function trivia1(base, pattern, options) {
  return function(path, basename3) {
    return typeof path === "string" && options.endsWith(path, base) ? pattern : null;
  };
}
__name(trivia1, "trivia1");
function trivia2(base, pattern, options) {
  const slashBase = `/${base}`;
  const backslashBase = `\\${base}`;
  const parsedPattern = /* @__PURE__ */ __name(function(path, basename3) {
    if (typeof path !== "string") {
      return null;
    }
    if (basename3) {
      return options.equals(basename3, base) ? pattern : null;
    }
    return options.equals(path, base) || options.endsWith(path, slashBase) || options.endsWith(path, backslashBase) ? pattern : null;
  }, "parsedPattern");
  const basenames = [base];
  parsedPattern.basenames = basenames;
  parsedPattern.patterns = [pattern];
  parsedPattern.allBasenames = basenames;
  return parsedPattern;
}
__name(trivia2, "trivia2");
function trivia3(pattern, options) {
  const parsedPatterns = aggregateBasenameMatches(pattern.slice(1, -1).split(",").map((pattern2) => parsePattern(pattern2, options)).filter((pattern2) => pattern2 !== NULL), pattern);
  const patternsLength = parsedPatterns.length;
  if (!patternsLength) {
    return NULL;
  }
  if (patternsLength === 1) {
    return parsedPatterns[0];
  }
  const parsedPattern = /* @__PURE__ */ __name(function(path, basename3) {
    for (let i = 0, n = parsedPatterns.length; i < n; i++) {
      if (parsedPatterns[i](path, basename3)) {
        return pattern;
      }
    }
    return null;
  }, "parsedPattern");
  const withBasenames = parsedPatterns.find((pattern2) => !!pattern2.allBasenames);
  if (withBasenames) {
    parsedPattern.allBasenames = withBasenames.allBasenames;
  }
  const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
  if (allPaths.length) {
    parsedPattern.allPaths = allPaths;
  }
  return parsedPattern;
}
__name(trivia3, "trivia3");
function trivia4and5(targetPath, pattern, matchPathEnds, options) {
  const usingPosixSep = sep === posix.sep;
  const nativePath = usingPosixSep ? targetPath : targetPath.replace(ALL_FORWARD_SLASHES, sep);
  const nativePathEnd = sep + nativePath;
  const targetPathEnd = posix.sep + targetPath;
  let parsedPattern;
  if (matchPathEnds) {
    parsedPattern = /* @__PURE__ */ __name(function(path, basename3) {
      return typeof path === "string" && (options.equals(path, nativePath) || options.endsWith(path, nativePathEnd) || !usingPosixSep && (options.equals(path, targetPath) || options.endsWith(path, targetPathEnd))) ? pattern : null;
    }, "parsedPattern");
  } else {
    parsedPattern = /* @__PURE__ */ __name(function(path, basename3) {
      return typeof path === "string" && (options.equals(path, nativePath) || !usingPosixSep && options.equals(path, targetPath)) ? pattern : null;
    }, "parsedPattern");
  }
  parsedPattern.allPaths = [(matchPathEnds ? "*/" : "./") + targetPath];
  return parsedPattern;
}
__name(trivia4and5, "trivia4and5");
function toRegExp(pattern, options) {
  try {
    const regExp = new RegExp(`^${parseRegExp(pattern)}$`, options.ignoreCase ? "i" : void 0);
    return function(path) {
      regExp.lastIndex = 0;
      return typeof path === "string" && regExp.test(path) ? pattern : null;
    };
  } catch {
    return NULL;
  }
}
__name(toRegExp, "toRegExp");
function match(arg1, path, options) {
  if (!arg1 || typeof path !== "string") {
    return false;
  }
  return parse2(arg1, options)(path);
}
__name(match, "match");
function parse2(arg1, options = {}) {
  if (!arg1) {
    return FALSE;
  }
  if (typeof arg1 === "string" || isRelativePattern(arg1)) {
    const parsedPattern = parsePattern(arg1, options);
    if (parsedPattern === NULL) {
      return FALSE;
    }
    const resultPattern = /* @__PURE__ */ __name(function(path, basename3) {
      return !!parsedPattern(path, basename3);
    }, "resultPattern");
    if (parsedPattern.allBasenames) {
      resultPattern.allBasenames = parsedPattern.allBasenames;
    }
    if (parsedPattern.allPaths) {
      resultPattern.allPaths = parsedPattern.allPaths;
    }
    return resultPattern;
  }
  return parsedExpression(arg1, options);
}
__name(parse2, "parse");
function isRelativePattern(obj) {
  const rp = obj;
  if (!rp) {
    return false;
  }
  return typeof rp.base === "string" && typeof rp.pattern === "string";
}
__name(isRelativePattern, "isRelativePattern");
function getBasenameTerms(patternOrExpression) {
  return patternOrExpression.allBasenames || [];
}
__name(getBasenameTerms, "getBasenameTerms");
function getPathTerms(patternOrExpression) {
  return patternOrExpression.allPaths || [];
}
__name(getPathTerms, "getPathTerms");
function parsedExpression(expression, options) {
  const parsedPatterns = aggregateBasenameMatches(Object.getOwnPropertyNames(expression).map((pattern) => parseExpressionPattern(pattern, expression[pattern], options)).filter((pattern) => pattern !== NULL));
  const patternsLength = parsedPatterns.length;
  if (!patternsLength) {
    return NULL;
  }
  if (!parsedPatterns.some((parsedPattern) => !!parsedPattern.requiresSiblings)) {
    if (patternsLength === 1) {
      return parsedPatterns[0];
    }
    const resultExpression2 = /* @__PURE__ */ __name(function(path, basename3) {
      let resultPromises = void 0;
      for (let i = 0, n = parsedPatterns.length; i < n; i++) {
        const result = parsedPatterns[i](path, basename3);
        if (typeof result === "string") {
          return result;
        }
        if (isThenable(result)) {
          if (!resultPromises) {
            resultPromises = [];
          }
          resultPromises.push(result);
        }
      }
      if (resultPromises) {
        return (async () => {
          for (const resultPromise of resultPromises) {
            const result = await resultPromise;
            if (typeof result === "string") {
              return result;
            }
          }
          return null;
        })();
      }
      return null;
    }, "resultExpression");
    const withBasenames2 = parsedPatterns.find((pattern) => !!pattern.allBasenames);
    if (withBasenames2) {
      resultExpression2.allBasenames = withBasenames2.allBasenames;
    }
    const allPaths2 = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
    if (allPaths2.length) {
      resultExpression2.allPaths = allPaths2;
    }
    return resultExpression2;
  }
  const resultExpression = /* @__PURE__ */ __name(function(path, base, hasSibling) {
    let name = void 0;
    let resultPromises = void 0;
    for (let i = 0, n = parsedPatterns.length; i < n; i++) {
      const parsedPattern = parsedPatterns[i];
      if (parsedPattern.requiresSiblings && hasSibling) {
        if (!base) {
          base = basename(path);
        }
        if (!name) {
          name = base.substring(0, base.length - extname(path).length);
        }
      }
      const result = parsedPattern(path, base, name, hasSibling);
      if (typeof result === "string") {
        return result;
      }
      if (isThenable(result)) {
        if (!resultPromises) {
          resultPromises = [];
        }
        resultPromises.push(result);
      }
    }
    if (resultPromises) {
      return (async () => {
        for (const resultPromise of resultPromises) {
          const result = await resultPromise;
          if (typeof result === "string") {
            return result;
          }
        }
        return null;
      })();
    }
    return null;
  }, "resultExpression");
  const withBasenames = parsedPatterns.find((pattern) => !!pattern.allBasenames);
  if (withBasenames) {
    resultExpression.allBasenames = withBasenames.allBasenames;
  }
  const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
  if (allPaths.length) {
    resultExpression.allPaths = allPaths;
  }
  return resultExpression;
}
__name(parsedExpression, "parsedExpression");
function parseExpressionPattern(pattern, value, options) {
  if (value === false) {
    return NULL;
  }
  const parsedPattern = parsePattern(pattern, options);
  if (parsedPattern === NULL) {
    return NULL;
  }
  if (typeof value === "boolean") {
    return parsedPattern;
  }
  if (value) {
    const when = value.when;
    if (typeof when === "string") {
      const result = /* @__PURE__ */ __name((path, basename3, name, hasSibling) => {
        if (!hasSibling || !parsedPattern(path, basename3)) {
          return null;
        }
        const clausePattern = when.replace("$(basename)", () => name);
        const matched = hasSibling(clausePattern);
        return isThenable(matched) ? matched.then((match2) => match2 ? pattern : null) : matched ? pattern : null;
      }, "result");
      result.requiresSiblings = true;
      return result;
    }
  }
  return parsedPattern;
}
__name(parseExpressionPattern, "parseExpressionPattern");
function aggregateBasenameMatches(parsedPatterns, result) {
  const basenamePatterns = parsedPatterns.filter((parsedPattern) => !!parsedPattern.basenames);
  if (basenamePatterns.length < 2) {
    return parsedPatterns;
  }
  const basenames = basenamePatterns.reduce((all, current) => {
    const basenames2 = current.basenames;
    return basenames2 ? all.concat(basenames2) : all;
  }, []);
  let patterns;
  if (result) {
    patterns = [];
    for (let i = 0, n = basenames.length; i < n; i++) {
      patterns.push(result);
    }
  } else {
    patterns = basenamePatterns.reduce((all, current) => {
      const patterns2 = current.patterns;
      return patterns2 ? all.concat(patterns2) : all;
    }, []);
  }
  const aggregate = /* @__PURE__ */ __name(function(path, basename3) {
    if (typeof path !== "string") {
      return null;
    }
    if (!basename3) {
      let i;
      for (i = path.length; i > 0; i--) {
        const ch = path.charCodeAt(i - 1);
        if (ch === 47 || ch === 92) {
          break;
        }
      }
      basename3 = path.substring(i);
    }
    const index2 = basenames.indexOf(basename3);
    return index2 !== -1 ? patterns[index2] : null;
  }, "aggregate");
  aggregate.basenames = basenames;
  aggregate.patterns = patterns;
  aggregate.allBasenames = basenames;
  const aggregatedPatterns = parsedPatterns.filter((parsedPattern) => !parsedPattern.basenames);
  aggregatedPatterns.push(aggregate);
  return aggregatedPatterns;
}
__name(aggregateBasenameMatches, "aggregateBasenameMatches");
function patternsEquals(patternsA, patternsB) {
  return equals(patternsA, patternsB, (a, b) => {
    if (typeof a === "string" && typeof b === "string") {
      return a === b;
    }
    if (typeof a !== "string" && typeof b !== "string") {
      return a.base === b.base && a.pattern === b.pattern;
    }
    return false;
  });
}
__name(patternsEquals, "patternsEquals");

// Source/Services/Handler/VscodeAPI/Stock/Lift.ts
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
__name(ToUri, "ToUri");
function RelativePath(From, To) {
  const FromUri = ToUri(From);
  const ToUriValue = ToUri(To);
  if (!FromUri || !ToUriValue) return void 0;
  return relativePath(FromUri, ToUriValue);
}
__name(RelativePath, "RelativePath");
function IsEqualOrParent(Resource, Candidate) {
  const R = ToUri(Resource);
  const C = ToUri(Candidate);
  if (!R || !C) return false;
  return isEqualOrParent2(R, C);
}
__name(IsEqualOrParent, "IsEqualOrParent");
function Basename(Resource) {
  const U = ToUri(Resource);
  return U ? basename2(U) : "";
}
__name(Basename, "Basename");
function Dirname(Resource) {
  const U = ToUri(Resource);
  return U ? dirname2(U) : void 0;
}
__name(Dirname, "Dirname");
function Extname(Resource) {
  const U = ToUri(Resource);
  return U ? extname2(U) : "";
}
__name(Extname, "Extname");
function JoinPath(Resource, ...Parts) {
  const U = ToUri(Resource);
  return U ? joinPath(U, ...Parts) : void 0;
}
__name(JoinPath, "JoinPath");
function GlobMatch(Pattern, Path) {
  return match(Pattern, Path);
}
__name(GlobMatch, "GlobMatch");
function GlobParsePattern(Pattern) {
  return parse2(Pattern);
}
__name(GlobParsePattern, "GlobParsePattern");
function GlobIsEmpty(Pattern) {
  return isEmptyPattern(Pattern);
}
__name(GlobIsEmpty, "GlobIsEmpty");

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

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Helpers.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.WorkspaceEventEmitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener(
        EventName,
        Listener
      );
    }, "dispose")
  };
}, "EventSubscriber");
var Call = /* @__PURE__ */ __name(async (Context, Method, Parameters) => {
  try {
    return await Context.MountainClient?.sendRequest(
      Method,
      Parameters
    );
  } catch {
    return void 0;
  }
}, "Call");
var DefaultExcludeSegments = /* @__PURE__ */ new Set([
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
var ExtractGlobPattern = /* @__PURE__ */ __name((Raw2) => {
  if (typeof Raw2 === "string" && Raw2.length > 0) return Raw2;
  if (Raw2 && typeof Raw2 === "object") {
    const Obj = Raw2;
    if (typeof Obj["pattern"] === "string") return Obj["pattern"];
    if (typeof Obj["glob"] === "string") return Obj["glob"];
  }
  return void 0;
}, "ExtractGlobPattern");
var FolderToFsPath = /* @__PURE__ */ __name((FolderUri) => {
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
var ResolveWorkspaceFolders = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  return (InitWorkspace.folders ?? []).map(
    (Folder) => {
      const FsPath = FolderToFsPath(Folder?.uri);
      const Record = { ...Folder };
      if (typeof FsPath === "string") Record.FsPath = FsPath;
      return Record;
    }
  );
}, "ResolveWorkspaceFolders");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Configuration.ts
var CreateConfigurationState = /* @__PURE__ */ __name((Context) => {
  const ConfigCache = /* @__PURE__ */ new Map();
  const ConfigInFlight = /* @__PURE__ */ new Set();
  const ConfigListeners = /* @__PURE__ */ new Set();
  const FireConfigChange = /* @__PURE__ */ __name((ChangedKey) => {
    if (ConfigListeners.size === 0) return;
    const Event2 = {
      affectsConfiguration: /* @__PURE__ */ __name((QueryKey) => ChangedKey === QueryKey || ChangedKey.startsWith(`${QueryKey}.`), "affectsConfiguration")
    };
    for (const Listener of ConfigListeners) {
      try {
        Listener(Event2);
      } catch {
      }
    }
  }, "FireConfigChange");
  const PrimeConfig = /* @__PURE__ */ __name((Key) => {
    if (ConfigInFlight.has(Key)) return;
    ConfigInFlight.add(Key);
    void Call(
      Context,
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
    CocoonDevLog(
      "config-prime",
      `[ConfigPrime] prepopulate ext=${ExtensionId || "<unknown>"} seeded=${Seeded} skipped=${Skipped}`
    );
  }, "PrePopulateFromManifest");
  Context.Emitter.on("configurationChanged", (Payload) => {
    const Shape = Payload ?? {};
    const Keys = Array.isArray(Shape.keys) ? Shape.keys : Array.isArray(Shape.affected) ? Shape.affected : [];
    if (Keys.length === 0) {
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
var SynthesiseSubtree = /* @__PURE__ */ __name((Cache3, Full) => {
  const Prefix = `${Full}.`;
  const Subtree = {};
  let Matched = false;
  for (const [CachedKey, CachedValue] of Cache3.entries()) {
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
var BuildGetConfiguration = /* @__PURE__ */ __name((Context, State) => (Section, _Scope) => ({
  get: /* @__PURE__ */ __name((Key, DefaultValue) => {
    const Full = Section ? `${Section}.${Key}` : Key;
    if (State.ConfigCache.has(Full)) {
      const Cached = State.ConfigCache.get(Full);
      if (Cached === null || Cached === void 0) {
        const Subtree2 = SynthesiseSubtree(State.ConfigCache, Full);
        if (Subtree2 !== void 0) {
          CocoonDevLog(
            "config-prime",
            `[ConfigPrime] synthesise key=${Full} source=null-shadowed`
          );
          return Subtree2;
        }
      }
      return Cached;
    }
    const Subtree = SynthesiseSubtree(State.ConfigCache, Full);
    if (Subtree !== void 0) {
      CocoonDevLog(
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
    await Call(Context, "Configuration.Update", [
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
var BuildOnDidChangeConfiguration = /* @__PURE__ */ __name((State) => (Listener, ThisArg, Disposables) => {
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

// Source/Utility/Land/Fix/Log.ts
var Mode = process.env["Mend"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw2 = process.env["Mend"];
  if (!Raw2 || Raw2.trim().length === 0) return void 0;
  const Tags = Raw2.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
  return Tags.length === 0 ? void 0 : new Set(Tags);
})();
var PadTwo = /* @__PURE__ */ __name((Value) => Value < 10 ? `0${Value}` : String(Value), "PadTwo");
var PadThree = /* @__PURE__ */ __name((Value) => Value < 10 ? `00${Value}` : Value < 100 ? `0${Value}` : String(Value), "PadThree");
var FormatTimestamp = /* @__PURE__ */ __name(() => {
  const Now = /* @__PURE__ */ new Date();
  if (Long) return Now.toISOString();
  return `${PadTwo(Now.getHours())}:${PadTwo(Now.getMinutes())}:${PadTwo(
    Now.getSeconds()
  )}.${PadThree(Now.getMilliseconds())}`;
}, "FormatTimestamp");
var SerializeContext = /* @__PURE__ */ __name((Context) => {
  const Seen = /* @__PURE__ */ new WeakSet();
  try {
    return JSON.stringify(Context, (_Key, Value) => {
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
var LevelTag = /* @__PURE__ */ __name((Level) => Level === "info" ? "" : ` ${Level.toUpperCase()}`, "LevelTag");
var FormatLine = /* @__PURE__ */ __name((Level, Tag, Message, Context) => {
  const Head = `${FormatTimestamp()} [LandFix:${Tag}]${LevelTag(Level)} ${Message}`;
  if (!Context) return `${Head}
`;
  return `${Head} ${SerializeContext(Context)}
`;
}, "FormatLine");
var Emit = /* @__PURE__ */ __name((Stream, Level, Tag, Message, Context) => {
  if (!Enabled) return;
  if (AllowList && !AllowList.has(Tag)) return;
  try {
    Stream.write(FormatLine(Level, Tag, Message, Context));
  } catch {
  }
}, "Emit");
var Info = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "info", Tag, Message, Context);
}, "Info");
var Warn = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stdout, "warn", Tag, Message, Context);
}, "Warn");
var ErrorLog = /* @__PURE__ */ __name((Tag, Message, Context) => {
  Emit(process.stderr, "error", Tag, Message, Context);
}, "ErrorLog");
var Debug = /* @__PURE__ */ __name((Tag, Message, Context) => {
  if (!DebugEnabled) return;
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "Debug");
var SeenOnce = /* @__PURE__ */ new Set();
var DebugOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  if (!DebugEnabled) return;
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "debug", Tag, Message, Context);
}, "DebugOnce");
var InfoOnce = /* @__PURE__ */ __name((Tag, Key, Message, Context) => {
  const Combined = `${Tag}:${Key}`;
  if (SeenOnce.has(Combined)) return;
  SeenOnce.add(Combined);
  Emit(process.stdout, "info", Tag, Message, Context);
}, "InfoOnce");
var LandFixLog = {
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
var Log_default2 = LandFixLog;

// Source/Utility/Tier.ts
var Injected = globalThis.__LandTiers ?? {};
var Pick = /* @__PURE__ */ __name((Capability, Fallback) => {
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
var Tier = {
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
  Telemetry: Pick("Telemetry", "Synchronous")
};
Log_default2.Info("Tier", `Cocoon tier set resolved: ${JSON.stringify(Tier)}`);
var Tier_default = Tier;

// Source/Services/Language/Provider/Registry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    console.warn(
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Providers.ts
var MakeProvider = /* @__PURE__ */ __name((Context, RegisterMethod, UnregisterMethod, _LegacyHandlePrefix, ExtraPayload, OnRegister, OnDispose) => (Key, _Provider, _Options) => {
  const Handle = NextProviderHandle();
  Context.SendToMountain(RegisterMethod, {
    handle: Handle,
    ...ExtraPayload(Key)
  }).catch(() => {
  });
  OnRegister?.(Handle, Key, _Provider);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      OnDispose?.(Handle, Key);
      Context.SendToMountain(UnregisterMethod, {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
}, "MakeProvider");
var BuildRegisterTextDocumentContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_text_document_content_provider",
  "unregister_text_document_content_provider",
  "textDocumentContent",
  (Scheme) => ({ scheme: Scheme, extensionId: "" }),
  (_Handle, Scheme, Provider) => {
    Context.ExtensionRegistry.set(
      `__textDocumentContentProvider:${Scheme}`,
      Provider
    );
  },
  (_Handle, Scheme) => {
    Context.ExtensionRegistry.delete(
      `__textDocumentContentProvider:${Scheme}`
    );
  }
), "BuildRegisterTextDocumentContentProvider");
var ClaimedFileSystemSchemes = /* @__PURE__ */ new Set();
var BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context) => (Scheme, _Provider, Options) => {
  const Handle = NextProviderHandle();
  ClaimedFileSystemSchemes.add(Scheme);
  Context.SendToMountain("register_file_system_provider", {
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
      Context.SendToMountain("unregister_file_system_provider", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterFileSystemProvider");
var BuildRegisterTaskProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_task_provider",
  "unregister_task_provider",
  "taskProvider",
  (TaskType) => ({ taskType: TaskType, extensionId: "" })
), "BuildRegisterTaskProvider");
var BuildRegisterNotebookContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_content_provider",
  "unregister_notebook_content_provider",
  "notebookContent",
  (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
), "BuildRegisterNotebookContentProvider");
var BuildRegisterNotebookSerializer = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_serializer",
  "unregister_notebook_serializer",
  "notebookSerializer",
  (NotebookType) => ({ notebookType: NotebookType, extensionId: "" })
), "BuildRegisterNotebookSerializer");
var BuildRegisterRemoteAuthorityResolver = /* @__PURE__ */ __name((Context) => (AuthorityPrefix, _Resolver) => {
  Context.SendToMountain("register_remote_authority_resolver", {
    authorityPrefix: AuthorityPrefix,
    extensionId: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("unregister_remote_authority_resolver", {
        authorityPrefix: AuthorityPrefix
      }).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterRemoteAuthorityResolver");
var BuildRegisterResourceLabelFormatter = /* @__PURE__ */ __name((Context) => (Formatter) => {
  Context.SendToMountain("register_resource_label_formatter", {
    formatter: Formatter
  }).catch(() => {
  });
  return { dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") };
}, "BuildRegisterResourceLabelFormatter");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Route.ts
function ExtractScheme(Uri2) {
  if (Uri2 && typeof Uri2 === "object") {
    const WithScheme = Uri2;
    if (typeof WithScheme.scheme === "string" && WithScheme.scheme.length > 0) {
      return WithScheme.scheme;
    }
  }
  if (typeof Uri2 === "string") {
    const Colon = Uri2.indexOf(":");
    if (Colon > 0 && Colon < 32) {
      const Scheme = Uri2.slice(0, Colon);
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(Scheme)) {
        return Scheme.toLowerCase();
      }
    }
    return "file";
  }
  return "file";
}
__name(ExtractScheme, "ExtractScheme");
function ExtractFsPath(Uri2) {
  if (Uri2 && typeof Uri2 === "object") {
    const WithPath = Uri2;
    if (typeof WithPath.fsPath === "string" && WithPath.fsPath.length > 0) {
      return WithPath.fsPath;
    }
    if (typeof WithPath.path === "string" && WithPath.path.length > 0) {
      return WithPath.path;
    }
  }
  if (typeof Uri2 === "string") {
    if (Uri2.startsWith("file://")) {
      try {
        return decodeURIComponent(Uri2.slice("file://".length));
      } catch {
        return Uri2.slice("file://".length);
      }
    }
    if (Uri2.startsWith("/")) return Uri2;
  }
  return void 0;
}
__name(ExtractFsPath, "ExtractFsPath");
function Route(Uri2) {
  const Scheme = ExtractScheme(Uri2);
  if (Tier_default.FileSystem === "Layer2") return "mountain";
  if (Scheme !== "file") return "mountain";
  if (ClaimedFileSystemSchemes.has("file")) return "mountain";
  if (Tier_default.FileSystem === "Layer4") {
    return ExtractFsPath(Uri2) !== void 0 ? "native" : "mountain";
  }
  return ExtractFsPath(Uri2) !== void 0 ? "native" : "mountain";
}
__name(Route, "Route");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Namespace.ts
import { promises as FsPromises } from "node:fs";
import { dirname as PathDirname } from "node:path";
var UriToString = /* @__PURE__ */ __name((Value) => {
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
var FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64
};
var LogRoute = /* @__PURE__ */ __name((Operation, Uri2, Decision) => {
  const Enabled2 = process.env["Trace"];
  if (!Enabled2 || !Enabled2.includes("fs-route")) return;
  process.stdout.write(
    `[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri2)} uri=${UriToString(Uri2)}
`
  );
}, "LogRoute");
var ThrowFileNotFound = /* @__PURE__ */ __name((Uri2) => {
  const Api = globalThis.__cocoonVscodeAPI;
  const FileNotFound = Api?.FileSystemError?.FileNotFound;
  if (typeof FileNotFound === "function") throw FileNotFound(Uri2);
  const Synthetic = new Error(
    `EntryNotFound (FileSystemError): ${UriToString(Uri2)}`
  );
  Synthetic.code = "FileNotFound";
  Synthetic.name = "FileSystemError";
  throw Synthetic;
}, "ThrowFileNotFound");
var MetadataToStat = /* @__PURE__ */ __name((Metadata) => ({
  type: Metadata.isSymbolicLink() ? FileType.SymbolicLink : Metadata.isDirectory() ? FileType.Directory : FileType.File,
  size: Metadata.size,
  mtime: Math.floor(Metadata.mtimeMs),
  ctime: Math.floor(Metadata.ctimeMs)
}), "MetadataToStat");
var BuildFileSystemNamespace = /* @__PURE__ */ __name((Context) => ({
  stat: /* @__PURE__ */ __name(async (Uri2) => {
    const Decision = Route(Uri2);
    LogRoute("stat", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
      try {
        const Metadata = await FsPromises.lstat(Path);
        return MetadataToStat(Metadata);
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri2);
        throw Err;
      }
    }
    return await Call(Context, "FileSystem.Stat", [
      UriToString(Uri2)
    ]) ?? {
      type: FileType.File,
      size: 0,
      ctime: 0,
      mtime: 0
    };
  }, "stat"),
  readFile: /* @__PURE__ */ __name(async (Uri2) => {
    const Decision = Route(Uri2);
    LogRoute("readFile", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
      try {
        return await FsPromises.readFile(Path);
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri2);
        throw Err;
      }
    }
    const UriString = UriToString(Uri2);
    try {
      const Raw2 = await Context.MountainClient?.sendRequest(
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
        ThrowFileNotFound(Uri2);
      }
      process.stdout.write(
        `[LandFix:FsRead] non-404 failure for ${UriString}: ${Message}
`
      );
      throw Err;
    }
  }, "readFile"),
  writeFile: /* @__PURE__ */ __name(async (Uri2, Content) => {
    const Decision = Route(Uri2);
    LogRoute("writeFile", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
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
    const Text = new TextDecoder().decode(Content);
    await Call(Context, "FileSystem.WriteFile", [
      UriToString(Uri2),
      Text
    ]);
  }, "writeFile"),
  readDirectory: /* @__PURE__ */ __name(async (Uri2) => {
    const Decision = Route(Uri2);
    LogRoute("readDirectory", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
      try {
        const Entries = await FsPromises.readdir(Path, {
          withFileTypes: true
        });
        return Entries.map((Entry) => {
          const Type = Entry.isSymbolicLink() ? FileType.SymbolicLink : Entry.isDirectory() ? FileType.Directory : FileType.File;
          return [Entry.name, Type];
        });
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri2);
        throw Err;
      }
    }
    return await Call(
      Context,
      "FileSystem.ReadDirectory",
      [UriToString(Uri2)]
    ) ?? [];
  }, "readDirectory"),
  createDirectory: /* @__PURE__ */ __name(async (Uri2) => {
    const Decision = Route(Uri2);
    LogRoute("createDirectory", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
      await FsPromises.mkdir(Path, { recursive: true });
      return;
    }
    await Call(Context, "FileSystem.CreateDirectory", [
      UriToString(Uri2)
    ]);
  }, "createDirectory"),
  delete: /* @__PURE__ */ __name(async (Uri2, Options) => {
    const Decision = Route(Uri2);
    LogRoute("delete", Uri2, Decision);
    if (Decision === "native") {
      const Path = ExtractFsPath(Uri2);
      try {
        await FsPromises.rm(Path, {
          recursive: Options?.recursive ?? false,
          force: false
        });
        return;
      } catch (Err) {
        if (Err?.code === "ENOENT") ThrowFileNotFound(Uri2);
        throw Err;
      }
    }
    await Call(Context, "FileSystem.Delete", [
      UriToString(Uri2),
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
    await Call(Context, "FileSystem.Rename", [
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
    await Call(Context, "FileSystem.Copy", [
      UriToString(Source),
      UriToString(Target)
    ]);
  }, "copy"),
  isWritableFileSystem: /* @__PURE__ */ __name((Scheme) => {
    if (Scheme === "file") return true;
    return true;
  }, "isWritableFileSystem")
}), "BuildFileSystemNamespace");

// Source/Utility/Glob/To/Regex.ts
var FindMatchingBrace = /* @__PURE__ */ __name((Input, Start, Open, Close) => {
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
var SplitTopLevelCommas = /* @__PURE__ */ __name((Body) => {
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
var ExpandBraces = /* @__PURE__ */ __name((Input) => {
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
var RegexEscape = /* @__PURE__ */ __name((Character) => /[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character, "RegexEscape");
var PlainGlobToRegexSource = /* @__PURE__ */ __name((Glob) => {
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
var GlobToRegex = /* @__PURE__ */ __name((Glob) => {
  const Variants = ExpandBraces(Glob);
  const Source = Variants.length === 1 ? PlainGlobToRegexSource(Variants[0]) : `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;
  return new RegExp(`^${Source}$`);
}, "GlobToRegex");
var Regex_default = GlobToRegex;

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/File/System/Watcher.ts
var CreateFileSystemWatcher = /* @__PURE__ */ __name((Context, Pattern, IgnoreCreateEvents, IgnoreChangeEvents, IgnoreDeleteEvents) => {
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
  const Folders = ResolveWorkspaceFolders(Context);
  const Root = Pattern?.baseUri?.fsPath ?? Pattern?.base ?? Folders[0]?.FsPath;
  if (!Root) {
    return StubWatcher;
  }
  const Handle = NextProviderHandle();
  const IsRecursive = PatternString.includes("**");
  Context.MountainClient?.sendRequest("FileWatcher.Register", [
    Handle,
    Root,
    IsRecursive,
    PatternString
  ]).catch(() => {
  });
  const EventName = `fileWatcher:${Handle}`;
  const MakeSubscriber = /* @__PURE__ */ __name((Kind, Ignore) => (Listener) => {
    if (Ignore) return StubDisposable;
    const WrappedListener = /* @__PURE__ */ __name((Event2) => {
      if (Event2.kind !== Kind) return;
      if (!Matcher.test(Event2.path)) return;
      try {
        Listener({
          scheme: "file",
          path: Event2.path,
          fsPath: Event2.path,
          toString: /* @__PURE__ */ __name(() => `file://${Event2.path}`, "toString")
        });
      } catch {
      }
    }, "WrappedListener");
    Context.Emitter.on(EventName, WrappedListener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.removeListener(EventName, WrappedListener);
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
      Context.Emitter.removeAllListeners(EventName);
      Context.MountainClient?.sendRequest("FileWatcher.Unregister", [
        Handle
      ]).catch(() => {
      });
    }, "dispose")
  };
}, "CreateFileSystemWatcher");

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
__name(CompileGlob, "CompileGlob");
var FindFilesLocal = /* @__PURE__ */ __name(async (_Context, Folders, Include, Exclude, MaxResults) => {
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
  const { join: join2, relative: relative2, sep: sep2 } = await import("node:path");
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
      const Full = join2(Current, Name);
      const RelativeFromRoot = relative2(Root, Full).split(sep2).join("/");
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

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Text/In/Files/Fallback.ts
import { promises as FsPromises2 } from "node:fs";
var ExtractPattern = /* @__PURE__ */ __name((Query) => {
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
var ToFsPath = /* @__PURE__ */ __name((Uri2) => {
  if (Uri2 == null) return void 0;
  if (typeof Uri2 === "string") {
    return Uri2.startsWith("file://") ? Uri2.slice("file://".length) : Uri2;
  }
  const U = Uri2;
  return U.fsPath ?? U.path;
}, "ToFsPath");
async function FindTextInFilesNodeFallback(Context, Folders, Query, Options, Callback) {
  const Pattern = ExtractPattern(Query);
  if (!Pattern) return { limitHit: false };
  const Opts = Options ?? {};
  const Max = typeof Opts.maxResults === "number" ? Opts.maxResults : 1e4;
  const Encoding = Opts.encoding ?? "utf8";
  const Candidates = await FindFilesLocal(
    Context,
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
__name(FindTextInFilesNodeFallback, "FindTextInFilesNodeFallback");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Language/Activation.ts
var STATIC_EXTENSION_TO_LANGUAGE = {
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
function ResolveLanguageIdFromRegistry(Context, FileExtension) {
  const ExtensionWithDot = `.${FileExtension}`;
  for (const Description of Context.ExtensionRegistry.values()) {
    const Contributes = Description?.contributes;
    const Languages = Contributes?.languages;
    if (!Languages) continue;
    for (const Language2 of Languages) {
      if (!Language2?.id) continue;
      if (Language2.extensions?.includes(ExtensionWithDot)) {
        return Language2.id;
      }
    }
  }
  return void 0;
}
__name(ResolveLanguageIdFromRegistry, "ResolveLanguageIdFromRegistry");
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
  const Extension = FileName.slice(Dot + 1).toLowerCase();
  return STATIC_EXTENSION_TO_LANGUAGE[Extension] ?? "plaintext";
}
__name(DeriveLanguageIdFromUri, "DeriveLanguageIdFromUri");
var FiredLanguages = /* @__PURE__ */ new Set();
function FireOnLanguageActivation(Context, LanguageId) {
  if (!LanguageId || LanguageId === "plaintext") return;
  if (FiredLanguages.has(LanguageId)) return;
  FiredLanguages.add(LanguageId);
  const Event2 = `onLanguage:${LanguageId}`;
  const Router = Context.ActivateByEvent;
  if (typeof Router === "function") {
    Router(Event2).catch((Error2) => {
      const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
      console.warn(
        `[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`
      );
    });
    return;
  }
  const Matching = Context.ActivationEventIndex?.get(Event2) ?? [];
  if (Matching.length > 0) {
    console.log(
      `[LanguageActivation] ${Event2} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
__name(FireOnLanguageActivation, "FireOnLanguageActivation");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Text/Document.ts
import { promises as FsPromises3 } from "node:fs";
var BuildOpenTextDocument = /* @__PURE__ */ __name((Context) => async (UriOrPath) => {
  const UriString = typeof UriOrPath === "string" ? UriOrPath : UriOrPath?.toString?.() ?? "";
  const Cached = Context.DocumentContentCache.get(UriString);
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
    const Decision = Route(UriOrPath);
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
          await Call(Context, "FileSystem.ReadFile", [
            UriString
          ])
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
        await Call(Context, "FileSystem.ReadFile", [
          UriString
        ])
      );
    }
  }
  const LanguageId = DeriveLanguageIdFromUri(UriString);
  if (LanguageId !== "plaintext") {
    FireOnLanguageActivation(Context, LanguageId);
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
var BuildSaveAll = /* @__PURE__ */ __name((Context) => async (_IncludeUntitled) => {
  await Call(Context, "Document.Save", []);
  return true;
}, "BuildSaveAll");
var BuildApplyEdit = /* @__PURE__ */ __name((Context) => async (_Edit) => {
  Context.SendToMountain("workspace.applyEdit", _Edit).catch(() => {
  });
  return true;
}, "BuildApplyEdit");
var BuildUpdateWorkspaceFolders = /* @__PURE__ */ __name((Context, ReadFolders) => (Start, DeleteCount, ...ToAdd) => {
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
  Context.MountainClient?.sendRequest("$updateWorkspaceFolders", {
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
var BuildDocumentEventMembers = /* @__PURE__ */ __name((Context) => ({
  onDidOpenTextDocument: EventSubscriber(Context, "didOpenTextDocument"),
  onDidCloseTextDocument: EventSubscriber(Context, "didCloseTextDocument"),
  onDidChangeTextDocument: EventSubscriber(Context, "didChangeTextDocument"),
  onDidSaveTextDocument: EventSubscriber(Context, "didSaveTextDocument"),
  onWillSaveTextDocument: EventSubscriber(Context, "willSaveTextDocument"),
  onDidCreateFiles: EventSubscriber(Context, "didCreateFiles"),
  onDidDeleteFiles: EventSubscriber(Context, "didDeleteFiles"),
  onDidRenameFiles: EventSubscriber(Context, "didRenameFiles"),
  onWillRenameFiles: EventSubscriber(Context, "willRenameFiles"),
  onWillCreateFiles: EventSubscriber(Context, "willCreateFiles"),
  onWillDeleteFiles: EventSubscriber(Context, "willDeleteFiles"),
  onDidOpenNotebookDocument: EventSubscriber(
    Context,
    "didOpenNotebookDocument"
  ),
  onDidCloseNotebookDocument: EventSubscriber(
    Context,
    "didCloseNotebookDocument"
  ),
  onDidChangeNotebookDocument: EventSubscriber(
    Context,
    "didChangeNotebookDocument"
  ),
  onDidSaveNotebookDocument: EventSubscriber(
    Context,
    "didSaveNotebookDocument"
  ),
  onWillSaveNotebookDocument: EventSubscriber(
    Context,
    "willSaveNotebookDocument"
  )
}), "BuildDocumentEventMembers");

// Source/Services/Handler/VscodeAPI/Wrap/Namespace/With/Heuristics.ts
import { Effect } from "effect";
var LazyCaptureEvent;
if (process.env["NODE_ENV"] !== "production") {
  void Promise.resolve().then(() => (init_Bridge(), Bridge_exports)).then((Module) => {
    LazyCaptureEvent = Module.CaptureEvent;
  }).catch(() => {
  });
}
var NoopDisposable = { dispose: /* @__PURE__ */ __name(() => {
}, "dispose") };
var IsTrustFamily = /* @__PURE__ */ __name((Property) => Property === "requestResourceTrust" || Property === "isResourceTrusted" || Property === "requestWorkspaceTrust" || /^(?:request|is|has)[A-Za-z]*Trust(?:ed)?$/.test(Property), "IsTrustFamily");
var ClassifyProperty = /* @__PURE__ */ __name((Property) => {
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
var RecordGap = /* @__PURE__ */ __name((NamespaceName, Property, Kind) => {
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
var BuildHeuristicMethod = /* @__PURE__ */ __name((NamespaceName, Property, Heuristic) => (...Arguments) => {
  const SpanName = `vscode.${NamespaceName}.${Property}`;
  const Program = Effect.gen(function* () {
    yield* Effect.sync(() => {
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
    Effect.withSpan(SpanName, {
      attributes: {
        "vscode.namespace": NamespaceName,
        "vscode.method": Property,
        "vscode.heuristic": Heuristic.Kind
      }
    })
  );
  try {
    return Heuristic.Sync ? Effect.runSync(Program) : Effect.runPromise(Program);
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
var WrapNamespaceWithHeuristics = /* @__PURE__ */ __name((NamespaceName, Concrete, Overrides) => new Proxy(Concrete, {
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
var Heuristics_default = WrapNamespaceWithHeuristics;

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Wrap/Workspace/Namespace.ts
var WrapWorkspaceNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("workspace", Concrete), "WrapWorkspaceNamespace");
var Namespace_default = WrapWorkspaceNamespace;

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Index.ts
var HydrateUriResults = /* @__PURE__ */ __name((Raw2) => {
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
var CreateWorkspaceNamespace = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  const HydrateFolder = /* @__PURE__ */ __name((Raw2, FallbackIndex) => {
    const Hydrated = ToUri(Raw2?.uri);
    if (!Hydrated) return null;
    const Name = typeof Raw2?.name === "string" && Raw2.name.length > 0 ? Raw2.name : Hydrated.fsPath.split(/[\\/]/).pop() ?? "";
    const Index = typeof Raw2?.index === "number" ? Raw2.index : FallbackIndex;
    return { uri: Hydrated, name: Name, index: Index };
  }, "HydrateFolder");
  const ReadFolders = /* @__PURE__ */ __name(() => {
    const Live = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
    const Raw2 = Live.folders ?? [];
    const Out = [];
    for (let I = 0; I < Raw2.length; I++) {
      const Hydrated = HydrateFolder(Raw2[I], I);
      if (Hydrated) Out.push(Hydrated);
    }
    return Out;
  }, "ReadFolders");
  const ReadName = /* @__PURE__ */ __name(() => {
    const Live = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
    return Live.name ?? InitWorkspace.name;
  }, "ReadName");
  const ConfigState = CreateConfigurationState(Context);
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
    textDocuments: [],
    notebookDocuments: [],
    getConfiguration: BuildGetConfiguration(Context, ConfigState),
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
        Context,
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
            Context,
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
        Context,
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
            Context,
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
      Context,
      "findTextInFiles",
      [Query, Options],
      async (Args) => {
        const [Q, O] = Args;
        return FindTextInFilesNodeFallback(
          Context,
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
      Context,
      "findTextInFiles",
      [Query, Options],
      async (Args) => {
        const [Q, O] = Args;
        return FindTextInFilesNodeFallback(
          Context,
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
    openTextDocument: BuildOpenTextDocument(Context),
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
    saveAll: BuildSaveAll(Context),
    // `save(uri)` / `saveAs(uri)` - VS Code 1.86+ per-URI save API.
    // Stock `extHostWorkspace.save` forwards to
    // `MainThreadWorkspace.$save` / `$saveAs`. Mountain has no
    // single-URI save handler wired yet; fall back to `saveAll`'s
    // behaviour by routing through the workbench command so dirty
    // documents still flush. Returns the URI on success to match the
    // stable signature.
    save: /* @__PURE__ */ __name(async (Uri2) => {
      try {
        await Context.MountainClient?.sendRequest("Workspace.Save", {
          uri: Uri2
        });
        return Uri2;
      } catch {
        return void 0;
      }
    }, "save"),
    saveAs: /* @__PURE__ */ __name(async (Uri2) => {
      try {
        const Result = await Context.MountainClient?.sendRequest(
          "Workspace.SaveAs",
          { uri: Uri2 }
        );
        return Result?.uri ?? Uri2;
      } catch {
        return void 0;
      }
    }, "saveAs"),
    applyEdit: BuildApplyEdit(Context),
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
    getWorkspaceFolder: /* @__PURE__ */ __name((Uri2) => {
      if (Uri2 == null) return void 0;
      for (const Folder of ReadFolders()) {
        if (IsEqualOrParent(Uri2, Folder.uri)) {
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
      Context,
      ReadFolders
    ),
    ...BuildDocumentEventMembers(Context),
    onDidChangeConfiguration: BuildOnDidChangeConfiguration(ConfigState),
    onDidChangeWorkspaceFolders: /* @__PURE__ */ __name((Listener) => {
      Context.WorkspaceEventEmitter.on(
        "didChangeWorkspaceFolders",
        Listener
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.WorkspaceEventEmitter.removeListener(
            "didChangeWorkspaceFolders",
            Listener
          );
        }, "dispose")
      };
    }, "onDidChangeWorkspaceFolders"),
    // Provider registrations - each backed by a Mountain round-trip.
    registerTextDocumentContentProvider: BuildRegisterTextDocumentContentProvider(Context),
    registerFileSystemProvider: BuildRegisterFileSystemProvider(Context),
    registerTaskProvider: BuildRegisterTaskProvider(Context),
    registerNotebookContentProvider: BuildRegisterNotebookContentProvider(Context),
    registerNotebookSerializer: BuildRegisterNotebookSerializer(Context),
    registerRemoteAuthorityResolver: BuildRegisterRemoteAuthorityResolver(Context),
    registerResourceLabelFormatter: BuildRegisterResourceLabelFormatter(Context),
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
      Context,
      Pattern,
      IgnoreCreateEvents,
      IgnoreChangeEvents,
      IgnoreDeleteEvents
    ), "createFileSystemWatcher"),
    fs: BuildFileSystemNamespace(Context)
  };
  return Namespace_default(Concrete);
}, "CreateWorkspaceNamespace");
var Index_default = CreateWorkspaceNamespace;
export {
  Index_default as default
};
//# sourceMappingURL=Index.js.map
