var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateOutputChannel.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["Off"] = 0] = "Off";
  LogLevel2[LogLevel2["Trace"] = 1] = "Trace";
  LogLevel2[LogLevel2["Debug"] = 2] = "Debug";
  LogLevel2[LogLevel2["Info"] = 3] = "Info";
  LogLevel2[LogLevel2["Warning"] = 4] = "Warning";
  LogLevel2[LogLevel2["Error"] = 5] = "Error";
  return LogLevel2;
})(LogLevel || {});
var FormatTimestamp = /* @__PURE__ */ __name(() => {
  const Now = /* @__PURE__ */ new Date();
  const Pad = /* @__PURE__ */ __name((N, Width = 2) => String(N).padStart(Width, "0"), "Pad");
  return Now.getFullYear() + "-" + Pad(Now.getMonth() + 1) + "-" + Pad(Now.getDate()) + " " + Pad(Now.getHours()) + ":" + Pad(Now.getMinutes()) + ":" + Pad(Now.getSeconds()) + "." + Pad(Now.getMilliseconds(), 3);
}, "FormatTimestamp");
var FormatLog = /* @__PURE__ */ __name((Level, Message) => `${FormatTimestamp()} [${Level}] ${Message}
`, "FormatLog");
var CreateOutputChannel_default = /* @__PURE__ */ __name((Context, Handle, Name, Options) => {
  const IsLog = typeof Options === "object" && Options !== null ? Options.log === true : false;
  let CurrentLevel = 3 /* Info */;
  const LevelListeners = [];
  Context.SendToMountain("outputChannel.create", {
    handle: Handle,
    name: Name,
    log: IsLog
  }).catch(() => {
  });
  const Append = /* @__PURE__ */ __name((Value) => {
    Context.SendToMountain("outputChannel.append", {
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
  Context.Emitter?.on?.(LevelChannel, LevelListener);
  const Channel = {
    name: Name,
    append: Append,
    appendLine: /* @__PURE__ */ __name((Value) => Append(`${Value}
`), "appendLine"),
    clear: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("outputChannel.clear", {
        handle: Handle
      }).catch(() => {
      });
    }, "clear"),
    // `show(preserveFocus?)` is the modern signature; the historic
    // `show(column, preserveFocus?)` overload still exists for
    // pre-1.16 extensions. Forward both forms so the panel reveals.
    show: /* @__PURE__ */ __name((ColumnOrPreserveFocus, PreserveFocus) => {
      const Preserve = typeof ColumnOrPreserveFocus === "boolean" ? ColumnOrPreserveFocus : !!PreserveFocus;
      Context.SendToMountain("outputChannel.show", {
        handle: Handle,
        preserveFocus: Preserve
      }).catch(() => {
      });
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("outputChannel.hide", {
        handle: Handle
      }).catch(() => {
      });
    }, "hide"),
    // Stock VS Code's `replace(value)` does NOT prepend a newline;
    // it replaces the entire channel buffer atomically. Use a
    // dedicated Mountain method so the workbench can batch the
    // clear+write as one render rather than a flash of empty.
    replace: /* @__PURE__ */ __name((Value) => {
      Context.SendToMountain("outputChannel.replace", {
        handle: Handle,
        value: Value
      }).catch(() => {
      });
    }, "replace"),
    dispose: /* @__PURE__ */ __name(() => {
      try {
        Context.Emitter?.off?.(LevelChannel, LevelListener);
      } catch {
      }
      Context.SendToMountain("outputChannel.dispose", {
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
export {
  CreateOutputChannel_default as default
};
//# sourceMappingURL=CreateOutputChannel.js.map
