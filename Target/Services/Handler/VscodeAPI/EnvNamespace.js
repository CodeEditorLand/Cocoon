var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/LandFixLog.ts
var Mode = process.env["LAND_LANDFIX_LOG"] ?? "short";
var Enabled = Mode !== "off";
var Long = Mode === "long";
var DebugEnabled = Long;
var AllowList = (() => {
  const Raw = process.env["LAND_LANDFIX_TAGS"];
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

// Source/Services/Handler/VscodeAPI/EnvNamespace.ts
var CreateEnvNamespace = /* @__PURE__ */ __name((Context) => {
  const Env = Context.ExtensionHostInitData?.environment ?? {};
  const NormalizeAppRoot = /* @__PURE__ */ __name((Raw) => {
    if (typeof Raw !== "string" || Raw.length === 0) {
      LandFixLog_default.Warn(
        "EnvNs",
        "appRoot empty or non-string, returning ''"
      );
      return "";
    }
    if (!Raw.startsWith("file:")) {
      LandFixLog_default.Info("EnvNs", `appRoot already plain path: ${Raw}`);
      return Raw;
    }
    try {
      const Normalised = decodeURIComponent(
        new URL(Raw).pathname
      ).replace(/\/$/, "");
      LandFixLog_default.Info(
        "EnvNs",
        `appRoot normalised file-URL ${Raw} \u2192 ${Normalised}`
      );
      return Normalised;
    } catch (Error2) {
      const Fallback = Raw.replace(/^file:\/\//, "").replace(/\/$/, "");
      LandFixLog_default.Warn(
        "EnvNs",
        `appRoot URL parse failed; fallback ${Raw} \u2192 ${Fallback}`,
        {
          error: Error2 instanceof Error2 ? Error2.message : String(Error2)
        }
      );
      return Fallback;
    }
  }, "NormalizeAppRoot");
  const Call = /* @__PURE__ */ __name(async (Method, Parameters) => {
    try {
      return await Context.MountainClient?.sendRequest(
        Method,
        Parameters
      );
    } catch {
      return void 0;
    }
  }, "Call");
  return {
    appName: Env["appName"] ?? "CodeEditorLand",
    appRoot: NormalizeAppRoot(Env["appRoot"]),
    appHost: Env["appHost"] ?? "desktop",
    uiKind: 1,
    // vscode.UIKind.Desktop
    language: Env["language"] ?? "en",
    machineId: Context.ExtensionHostInitData?.telemetry?.machineId ?? Env["machineId"] ?? "land",
    sessionId: Env["sessionId"] ?? `land-session-${Date.now().toString(36)}`,
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
        const FromMountain = await Call("Clipboard.Read", []);
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
        await Call("Clipboard.Write", [Value]);
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
      const OkFromMountain = await Call(
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
}, "CreateEnvNamespace");
var EnvNamespace_default = CreateEnvNamespace;
export {
  EnvNamespace_default as default
};
//# sourceMappingURL=EnvNamespace.js.map
