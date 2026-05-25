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

// Source/Utility/Land/Fix/Log.ts
var Mode = process.env["Mend"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["Mend"];
  if (!Raw || Raw.trim().length === 0) return void 0;
  const Tags = Raw.split(",").map((Entry) => Entry.trim()).filter((Entry) => Entry.length > 0);
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
var Log_default = LandFixLog;

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
  Log_default.InfoOnce(
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

// Source/Services/Handler/VscodeAPI/Wrap/Languages/Namespace.ts
var WrapLanguagesNamespace = /* @__PURE__ */ __name((Concrete) => Heuristics_default("languages", Concrete), "WrapLanguagesNamespace");
var Namespace_default = WrapLanguagesNamespace;

// Source/Services/Handler/VscodeAPI/Languages/Namespace.ts
var UriKey = /* @__PURE__ */ __name((Value) => {
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
var _AllDiagnostics = /* @__PURE__ */ new Map();
var RegisterProvider = /* @__PURE__ */ __name((Context, LanguageProviderRegistry, MethodName, Selector, Provider, Extra) => {
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
  Context.SendToMountain(MethodName, {
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
var CreateLanguagesNamespace = /* @__PURE__ */ __name((Context, LanguageProviderRegistry) => Namespace_default({
  registerHoverProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_hover_provider",
    Selector,
    Provider
  ), "registerHoverProvider"),
  registerCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, ...TriggerCharacters) => RegisterProvider(
    Context,
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
    Context,
    LanguageProviderRegistry,
    "register_definition_provider",
    Selector,
    Provider
  ), "registerDefinitionProvider"),
  registerReferenceProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_reference_provider",
    Selector,
    Provider
  ), "registerReferenceProvider"),
  registerCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider, Metadata) => RegisterProvider(
    Context,
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
    Context,
    LanguageProviderRegistry,
    "register_document_symbol_provider",
    Selector,
    Provider
  ), "registerDocumentSymbolProvider"),
  registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_formatting_provider",
    Selector,
    Provider
  ), "registerDocumentFormattingEditProvider"),
  registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_range_formatting_provider",
    Selector,
    Provider
  ), "registerDocumentRangeFormattingEditProvider"),
  registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider, FirstTrigger, ...MoreTriggers) => RegisterProvider(
    Context,
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
    Context,
    LanguageProviderRegistry,
    "register_type_definition_provider",
    Selector,
    Provider
  ), "registerTypeDefinitionProvider"),
  registerImplementationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_implementation_provider",
    Selector,
    Provider
  ), "registerImplementationProvider"),
  registerDeclarationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_declaration_provider",
    Selector,
    Provider
  ), "registerDeclarationProvider"),
  registerDocumentLinkProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_link_provider",
    Selector,
    Provider
  ), "registerDocumentLinkProvider"),
  registerColorProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_color_provider",
    Selector,
    Provider
  ), "registerColorProvider"),
  registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_linked_editing_range_provider",
    Selector,
    Provider
  ), "registerLinkedEditingRangeProvider"),
  registerCallHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_call_hierarchy_provider",
    Selector,
    Provider
  ), "registerCallHierarchyProvider"),
  registerTypeHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_type_hierarchy_provider",
    Selector,
    Provider
  ), "registerTypeHierarchyProvider"),
  registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_evaluatable_expression_provider",
    Selector,
    Provider
  ), "registerEvaluatableExpressionProvider"),
  registerInlineValuesProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
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
      Context,
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
    Context,
    LanguageProviderRegistry,
    "register_document_highlight_provider",
    Selector,
    Provider
  ), "registerDocumentHighlightProvider"),
  registerCodeLensProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_code_lens_provider",
    Selector,
    Provider
  ), "registerCodeLensProvider"),
  registerRenameProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_rename_provider",
    Selector,
    Provider
  ), "registerRenameProvider"),
  registerFoldingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_folding_range_provider",
    Selector,
    Provider
  ), "registerFoldingRangeProvider"),
  registerSelectionRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_selection_range_provider",
    Selector,
    Provider
  ), "registerSelectionRangeProvider"),
  registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((Selector, Provider, _Legend) => RegisterProvider(
    Context,
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
    Context,
    LanguageProviderRegistry,
    "register_semantic_tokens_provider",
    Selector,
    Provider
  ), "registerDocumentRangeSemanticTokensProvider"),
  registerInlayHintsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
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
      Context,
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
        Context.Emitter.emit("diagnostics.didChange", {
          uris: [...Store.keys()]
        });
        Context.MountainClient?.sendRequest("Diagnostic.Set", [
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
        Context.Emitter.emit("diagnostics.didChange", {
          uris: [UriKey(Uri)]
        });
        Context.MountainClient?.sendRequest("Diagnostic.Set", [
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
        Context.Emitter.emit("diagnostics.didChange", { uris: [] });
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [
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
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [
          Owner
        ]).catch(() => {
        });
      }, "dispose")
    };
  }, "createDiagnosticCollection"),
  getLanguages: /* @__PURE__ */ __name(async () => {
    try {
      const Result = await Context.MountainClient?.sendRequest(
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
    Context.SendToMountain("languages.setDocumentLanguage", {
      uri: Uri,
      languageId: LanguageId
    }).catch(() => {
    });
    try {
      if (Document && typeof Document === "object") {
        Document.languageId = LanguageId;
      }
      const TextDocs = Context.__textDocuments;
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
    Context.SendToMountain("set_language_configuration", {
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
    Context.Emitter.on("diagnostics.didChange", Listener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.off("diagnostics.didChange", Listener);
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
    Context,
    LanguageProviderRegistry,
    "register_document_paste_edit_provider",
    Selector,
    Provider
  ), "registerDocumentPasteEditProvider"),
  registerDocumentDropEditProvider: /* @__PURE__ */ __name((Selector, Provider, _Metadata) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_drop_edit_provider",
    Selector,
    Provider
  ), "registerDocumentDropEditProvider"),
  registerInlineCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inline_completion_item_provider",
    Selector,
    Provider
  ), "registerInlineCompletionItemProvider"),
  registerInlineEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inline_edit_provider",
    Selector,
    Provider
  ), "registerInlineEditProvider"),
  registerMultiDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_multi_document_highlight_provider",
    Selector,
    Provider
  ), "registerMultiDocumentHighlightProvider"),
  registerMappedEditsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
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
var Namespace_default2 = CreateLanguagesNamespace;
export {
  Namespace_default2 as default
};
//# sourceMappingURL=Namespace.js.map
