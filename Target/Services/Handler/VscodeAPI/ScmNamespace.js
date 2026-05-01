var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/LanguageProviderRegistry.ts
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

// Source/Telemetry/PostHog/Event.ts
var BaseProperties = {
  $app: "land-editor",
  $app_version: "0.0.1",
  $build_mode: "debug",
  $component: "cocoon",
  $tier: "cocoon",
  $lib: "cocoon-posthog-bridge"
};
var Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
  Name,
  Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  Properties
}), "Create");
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version
}), "Enrich");
var Event_default = { Create, Enrich };

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps from "node:https";
var RequestTimeoutMilliseconds = 5e3;
var Transport_default = /* @__PURE__ */ __name((Host, Key, DistinctIdentifier2, Batch) => {
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
    const Request = NodeHttps.request(
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

// Source/Telemetry/PostHog/Buffer.ts
var Buffer_default = /* @__PURE__ */ __name((Config, DistinctIdentifier2) => {
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

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey = "";
var DefaultHost = "https://eu.i.posthog.com";
var DefaultBatchWindowMilliseconds = 3e3;
var DefaultBatchMaximum = 50;
var ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  return Value && Value.length > 0 ? Value : Fallback;
}, "ReadString");
var ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  if (Value === void 0) return Fallback;
  return !["false", "0", "off", ""].includes(Value.toLowerCase());
}, "ReadBoolean");
var ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  const Parsed = Value ? Number(Value) : Number.NaN;
  return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
}, "ReadNumber");
var Configuration_default = /* @__PURE__ */ __name(() => ({
  Key: ReadString("Authorize", DefaultKey),
  Host: ReadString("Beam", DefaultHost),
  Enabled: ReadBoolean("Report", true) && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "Buffer",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber(
    "Batch",
    DefaultBatchMaximum
  ),
  DistinctIdentifierSeed: process.env["Brand"] ?? ""
}), "default");

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default = /* @__PURE__ */ __name((Seed) => {
  if (Seed.length > 0) return Seed;
  const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
  return `land-dev-${Username}`;
}, "default");

// Source/Telemetry/PostHogBridge.ts
var Configuration = Configuration_default();
var DistinctIdentifier = Identifier_default(
  Configuration.DistinctIdentifierSeed
);
var ActiveBuffer;
var Initialized = false;
var Buffered = /* @__PURE__ */ __name(() => {
  if (!Configuration.Enabled) return void 0;
  if (!ActiveBuffer) {
    ActiveBuffer = Buffer_default(Configuration, DistinctIdentifier);
  }
  return ActiveBuffer;
}, "Buffered");
var CaptureEvent = /* @__PURE__ */ __name((Name, Properties = {}) => {
  try {
    Buffered()?.Enqueue(Name, Properties);
  } catch {
  }
}, "CaptureEvent");
var CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
  const Bridge = Buffered();
  if (!Bridge) return;
  Bridge.Enqueue("cocoon:error", {
    ...Extra,
    error_tag: Tag,
    error_message: Message
  });
  Bridge.Drain();
}, "CaptureError");
var Initialize = /* @__PURE__ */ __name(() => {
  if (Initialized) return;
  Initialized = true;
  const Bridge = Buffered();
  if (!Bridge) return;
  const OnExit = /* @__PURE__ */ __name(() => Bridge.Drain(), "OnExit");
  process.once("exit", OnExit);
  process.once("SIGINT", OnExit);
  process.once("SIGTERM", OnExit);
  CaptureEvent("cocoon:session:start", {
    pid: process.pid,
    platform: process.platform,
    arch: process.arch
  });
}, "Initialize");
var PostHogBridge_default = { CaptureEvent, CaptureError, Initialize };

// Source/Utility/LandFixLog.ts
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
var LandFixLog_default = LandFixLog;

// Source/Services/Handler/VscodeAPI/WrapNamespaceWithHeuristics.ts
import { Effect } from "effect";
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
  LandFixLog_default.InfoOnce(
    "VSCODE-API-GAP",
    Key,
    `${NamespaceName}.${Property} \u2192 ${Kind}`
  );
  CaptureEvent("cocoon:vscode_api_gap", {
    namespace: NamespaceName,
    method: Property,
    kind: Kind
  });
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
var WrapNamespaceWithHeuristics_default = WrapNamespaceWithHeuristics;

// Source/Services/Handler/VscodeAPI/WrapScmNamespace.ts
var WrapScmNamespace = /* @__PURE__ */ __name((Concrete) => WrapNamespaceWithHeuristics_default("scm", Concrete), "WrapScmNamespace");
var WrapScmNamespace_default = WrapScmNamespace;

// Source/Services/Handler/VscodeAPI/ScmNamespace.ts
var ScmTraceEnabled = typeof process !== "undefined" && typeof process.env["Trace"] === "string";
var ScmTrace = /* @__PURE__ */ __name((Message) => {
  if (!ScmTraceEnabled) return;
  try {
    process.stdout.write(`[DEV:SCM-TRACE] ${Message}
`);
  } catch {
  }
}, "ScmTrace");
var SanitizeResourceState = /* @__PURE__ */ __name((Raw) => {
  if (Raw == null || typeof Raw !== "object") return Raw;
  const Source = Raw;
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
var CreateScmNamespace = /* @__PURE__ */ __name((Context) => WrapScmNamespace_default({
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
    const ProviderReady = Context.SendToMountain(
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
      inputBox: WrapNamespaceWithHeuristics_default(
        `scm.sourceControl[${Id}].inputBox`,
        {
          value: "",
          placeholder: "",
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
          () => Context.SendToMountain("register_scm_resource_group", {
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
            const SanitizedStates = Array.isArray(Value) ? Value.map((Raw) => SanitizeResourceState(Raw)) : [];
            GroupReady.then(
              () => Context.SendToMountain("update_scm_group", {
                scmHandle: Handle,
                groupHandle: GroupHandle,
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
              () => Context.SendToMountain(
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
      commitTemplate: "",
      acceptInputCommand: void 0,
      quickDiffProvider: void 0,
      dispose: /* @__PURE__ */ __name(() => {
        ProviderReady.then(
          () => Context.SendToMountain("unregister_scm_provider", {
            handle: Handle
          })
        ).catch(() => {
        });
        Groups.clear();
      }, "dispose")
    };
    return WrapNamespaceWithHeuristics_default(
      `scm.sourceControl[${Id}]`,
      ConcreteSourceControl
    );
  }, "createSourceControl"),
  inputBox: { value: "" }
}), "CreateScmNamespace");
var ScmNamespace_default = CreateScmNamespace;
export {
  ScmNamespace_default as default
};
//# sourceMappingURL=ScmNamespace.js.map
