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

// Source/Generated/RouteManifest.ts
var MountainMethods = /* @__PURE__ */ new Set(["$disposeStatusBarMessage", "$gitExec", "$resolveCustomEditor", "$scm:createSourceControl", "$scm:openDiff", "$scm:registerInputBox", "$scm:updateGroup", "$scm:updateSourceControl", "$setStatusBarMessage", "$statusBar:dispose", "$statusBar:set", "$terminal:create", "$terminal:dispose", "$terminal:hide", "$terminal:resize", "$terminal:sendText", "$terminal:show", "$tree:register", "$updateWorkspaceFolders", "applyEdit", "Authentication.GetAccounts", "Authentication.GetSession", "Clipboard.Read", "Clipboard.Write", "Command.Execute", "Command.GetAll", "config.get", "config.update", "Configuration.Inspect", "Configuration.Update", "Debug.RegisterConfigurationProvider", "Debug.Start", "Debug.Stop", "Diagnostic.Clear", "Diagnostic.Set", "Document.Save", "Document.SaveAs", "error", "executeCommand", "FileSystem.Copy", "FileSystem.CreateDirectory", "FileSystem.Delete", "FileSystem.ReadDirectory", "FileSystem.ReadFile", "FileSystem.Rename", "FileSystem.Stat", "FileSystem.WriteFile", "FileWatcher.Register", "FileWatcher.Unregister", "findFiles", "findTextInFiles", "html", "Keybinding.GetResolved", "Languages.GetAll", "message", "NativeHost.OpenExternal", "openDocument", "postMessage", "readFile", "register_call_hierarchy_provider", "register_code_actions_provider", "register_code_lens_provider", "register_color_provider", "register_completion_item_provider", "register_declaration_provider", "register_definition_provider", "register_document_drop_edit_provider", "register_document_formatting_provider", "register_document_highlight_provider", "register_document_link_provider", "register_document_paste_edit_provider", "register_document_range_formatting_provider", "register_document_symbol_provider", "register_evaluatable_expression_provider", "register_folding_range_provider", "register_hover_provider", "register_implementation_provider", "register_inlay_hints_provider", "register_inline_completion_item_provider", "register_inline_edit_provider", "register_inline_values_provider", "register_linked_editing_range_provider", "register_mapped_edits_provider", "register_multi_document_highlight_provider", "register_on_type_formatting_provider", "register_reference_provider", "register_rename_provider", "register_selection_range_provider", "register_semantic_tokens_provider", "register_signature_help_provider", "register_type_definition_provider", "register_type_hierarchy_provider", "register_workspace_symbol_provider", "saveAll", "Search.TextSearch", "secrets.delete", "secrets.get", "secrets.store", "setHtml", "showTextDocument", "stat", "Storage.Get", "Storage.GetItems", "Storage.Set", "Task.Execute", "Task.Fetch", "Terminal.GetProcessId", "Terminal.Hide", "Terminal.Resize", "Terminal.Show", "tree.dispose", "tree.register", "tree.reveal", "tree.unregister", "UserInterface.ShowInputBox", "UserInterface.ShowMessage", "UserInterface.ShowOpenDialog", "UserInterface.ShowQuickPick", "UserInterface.ShowSaveDialog", "viewId", "vscode.diff", "warning", "webview.postMessage", "webview.registerView", "webview.setHtml", "webview.unregisterView", "window.revealRange", "Window.ShowInputBox", "Window.ShowMessage", "Window.ShowOpenDialog", "Window.ShowQuickPick", "Window.ShowSaveDialog", "Workspace.IsResourceTrusted", "Workspace.RequestResourceTrust", "Workspace.Save", "Workspace.SaveAll", "Workspace.SaveAs"]);
var StockLiftExports = /* @__PURE__ */ new Set();
var BespokeCocoonMethods = /* @__PURE__ */ new Set(["FindTextInFilesNodeFallback"]);
var RouteManifestSummary = {
  mountain: 137,
  stockLift: 0,
  bespoke: 1,
  generatedAt: "2026-05-25T19:09:39Z"
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
__name(ToUri, "ToUri");
function RelativePath(From, To) {
  const FromUri = ToUri(From);
  const ToUriValue = ToUri(To);
  if (!FromUri || !ToUriValue) return void 0;
  return StockRelativePath(FromUri, ToUriValue);
}
__name(RelativePath, "RelativePath");
function IsEqualOrParent(Resource, Candidate) {
  const R = ToUri(Resource);
  const C = ToUri(Candidate);
  if (!R || !C) return false;
  return StockIsEqualOrParent(R, C);
}
__name(IsEqualOrParent, "IsEqualOrParent");
function Basename(Resource) {
  const U = ToUri(Resource);
  return U ? StockBasename(U) : "";
}
__name(Basename, "Basename");
function Dirname(Resource) {
  const U = ToUri(Resource);
  return U ? StockDirname(U) : void 0;
}
__name(Dirname, "Dirname");
function Extname(Resource) {
  const U = ToUri(Resource);
  return U ? StockExtname(U) : "";
}
__name(Extname, "Extname");
function JoinPath(Resource, ...Parts) {
  const U = ToUri(Resource);
  return U ? StockJoinPath(U, ...Parts) : void 0;
}
__name(JoinPath, "JoinPath");
function GlobMatch(Pattern, Path) {
  return StockGlobMatch(Pattern, Path);
}
__name(GlobMatch, "GlobMatch");
function GlobParsePattern(Pattern) {
  return StockGlobParse(Pattern);
}
__name(GlobParsePattern, "GlobParsePattern");
function GlobIsEmpty(Pattern) {
  return StockGlobIsEmpty(Pattern);
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
var CocoonDevLog2 = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog2;

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
    CocoonDevLog2(
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
var SynthesiseSubtree = /* @__PURE__ */ __name((Cache, Full) => {
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
var BuildGetConfiguration = /* @__PURE__ */ __name((Context, State) => (Section, Scope) => ({
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
    CocoonDevLog(
      "registry",
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
              Context.DocumentContentCache?.set(
                UriStr,
                Content
              );
              Context.WorkspaceEventEmitter?.emit(
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
  (TaskType) => ({ taskType: TaskType, extensionId: "" }),
  (Handle, _TaskType, Provider) => {
    Context.ExtensionRegistry.set(`__taskProvider:${Handle}`, Provider);
  },
  (Handle, _TaskType) => {
    Context.ExtensionRegistry.delete(`__taskProvider:${Handle}`);
  }
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
__name(ExtractScheme, "ExtractScheme");
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
__name(ExtractFsPath, "ExtractFsPath");
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
var LogRoute = /* @__PURE__ */ __name((Operation, Uri, Decision) => {
  const Enabled2 = process.env["Trace"];
  if (!Enabled2 || !Enabled2.includes("fs-route")) return;
  process.stdout.write(
    `[DEV:FS-ROUTE] op=${Operation} route=${Decision} scheme=${ExtractScheme(Uri)} uri=${UriToString(Uri)}
`
  );
}, "LogRoute");
var ThrowFileNotFound = /* @__PURE__ */ __name((Uri) => {
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
var MetadataToStat = /* @__PURE__ */ __name((Metadata) => ({
  type: Metadata.isSymbolicLink() ? FileType.SymbolicLink : Metadata.isDirectory() ? FileType.Directory : FileType.File,
  size: Metadata.size,
  mtime: Math.floor(Metadata.mtimeMs),
  ctime: Math.floor(Metadata.ctimeMs)
}), "MetadataToStat");
var BuildFileSystemNamespace = /* @__PURE__ */ __name((Context) => ({
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
    return await Call(Context, "FileSystem.Stat", [
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
    await Call(Context, "FileSystem.WriteFile", [
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
      Context,
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
    await Call(Context, "FileSystem.CreateDirectory", [
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
    await Call(Context, "FileSystem.Delete", [
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
var ToFsPath = /* @__PURE__ */ __name((Uri) => {
  if (Uri == null) return void 0;
  if (typeof Uri === "string") {
    return Uri.startsWith("file://") ? Uri.slice("file://".length) : Uri;
  }
  const U = Uri;
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
    for (const Language of Languages) {
      if (!Language?.id) continue;
      if (Language.extensions?.includes(ExtensionWithDot)) {
        return Language.id;
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
  const Event = `onLanguage:${LanguageId}`;
  const Router = Context.ActivateByEvent;
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
  const Matching = Context.ActivationEventIndex?.get(Event) ?? [];
  if (Matching.length > 0) {
    CocoonDevLog2(
      "language-activation",
      `[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
__name(FireOnLanguageActivation, "FireOnLanguageActivation");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Text/Document.ts
import { promises as FsPromises3 } from "node:fs";
var BuildOpenTextDocument = /* @__PURE__ */ __name((Context) => async (UriOrPath) => {
  if (UriOrPath && typeof UriOrPath === "object" && !UriOrPath.scheme && !UriOrPath.path && !UriOrPath.fsPath && (typeof UriOrPath.language === "string" || typeof UriOrPath.content === "string")) {
    const InlineContent = typeof UriOrPath.content === "string" ? UriOrPath.content : "";
    const InlineLang = typeof UriOrPath.language === "string" ? UriOrPath.language : "plaintext";
    const UntitledKey = `untitled:Untitled-${Date.now()}`;
    Context.DocumentContentCache.set(UntitledKey, InlineContent);
    if (!Array.isArray(Context.__textDocuments))
      Context.__textDocuments = [];
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
    Context.__textDocuments.push(Doc);
    setImmediate(() => {
      try {
        Context.WorkspaceEventEmitter?.emit(
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
    const Content = Context.DocumentContentCache.get(UriString) ?? "";
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
      const Provider = Context.ExtensionRegistry?.get(
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
          Context.DocumentContentCache.set(UriString, Text);
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
              Context,
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
          await Call(Context, "FileSystem.ReadFile", [
            UriString
          ])
        );
      }
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
  try {
    await Call(Context, "Workspace.SaveAll", [
      _IncludeUntitled ?? false
    ]);
  } catch {
    Context.MountainClient?.sendRequest("Workspace.SaveAll", [
      _IncludeUntitled ?? false
    ]).catch(() => {
    });
  }
  return true;
}, "BuildSaveAll");
var BuildApplyEdit = /* @__PURE__ */ __name((Context) => async (Edit, _Metadata) => {
  try {
    const Result = await Call(Context, "applyEdit", [Edit]);
    if (typeof Result === "boolean") return Result;
    return true;
  } catch {
    Context.SendToMountain("workspace.applyEdit", Edit).catch(() => {
    });
    return false;
  }
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
  // `onWillSaveTextDocument` must add the listener to `__willSaveListeners`
  // (the array the notification handler iterates for `waitUntil` support)
  // AND also emit the event on WorkspaceEventEmitter so plain subscribers
  // still fire. Without the `__willSaveListeners` path, format-on-save
  // extensions that call `event.waitUntil(Promise<TextEdit[]>)` inside
  // their listener never deliver their edits before the disk write.
  onWillSaveTextDocument: /* @__PURE__ */ __name((Listener, ThisArg, Disposables) => {
    const Bound = ThisArg === void 0 ? Listener : Listener.bind(ThisArg);
    if (!Array.isArray(Context.__willSaveListeners)) {
      Context.__willSaveListeners = [];
    }
    Context.__willSaveListeners.push(Bound);
    const Subscription = {
      dispose: /* @__PURE__ */ __name(() => {
        const All = Context.__willSaveListeners;
        if (Array.isArray(All)) {
          const Idx = All.indexOf(Bound);
          if (Idx !== -1) All.splice(Idx, 1);
        }
        Context.WorkspaceEventEmitter.removeListener(
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
    // Live getter: returns the array populated by $acceptModelAdded
    // notifications so extensions reading `workspace.textDocuments` see
    // all currently-open files rather than an always-empty array.
    get textDocuments() {
      return Context.__textDocuments ?? [];
    },
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
    save: /* @__PURE__ */ __name(async (Uri) => {
      try {
        await Context.MountainClient?.sendRequest("Workspace.Save", {
          uri: Uri
        });
        return Uri;
      } catch {
        return void 0;
      }
    }, "save"),
    saveAs: /* @__PURE__ */ __name(async (Uri) => {
      try {
        const Result = await Context.MountainClient?.sendRequest(
          "Workspace.SaveAs",
          { uri: Uri }
        );
        return Result?.uri ?? Uri;
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
      Context,
      ReadFolders
    ),
    ...BuildDocumentEventMembers(Context),
    onDidChangeConfiguration: BuildOnDidChangeConfiguration(ConfigState),
    // `onWillSaveTextDocument` - fires before a document is persisted.
    // Mountain sends `document.willSave` just before `Document.Save` writes
    // to disk. Extensions subscribe here to apply last-minute edits
    // (format-on-save, organize-imports-on-save, etc.).
    // Implementation: store listeners on `Context.__willSaveListeners`.
    // NotificationHandler fires them and collects any returned TextEdits.
    onWillSaveTextDocument: /* @__PURE__ */ __name((Listener) => {
      const List = Context.__willSaveListeners ??= [];
      List.push(Listener);
      Context.WorkspaceEventEmitter.on("willSaveTextDocument", Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          const Idx = List.indexOf(Listener);
          if (Idx !== -1) List.splice(Idx, 1);
          Context.WorkspaceEventEmitter.removeListener(
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
