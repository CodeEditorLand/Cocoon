var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateOutputChannel.ts
var CreateOutputChannel_default = /* @__PURE__ */ __name((Context, Handle, Name, Options) => {
  const IsLog = typeof Options === "object" && Options !== null ? Options.log === true : false;
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
    show: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("outputChannel.show", {
        handle: Handle
      }).catch(() => {
      });
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("outputChannel.hide", {
        handle: Handle
      }).catch(() => {
      });
    }, "hide"),
    replace: /* @__PURE__ */ __name((Value) => {
      Context.SendToMountain("outputChannel.clear", {
        handle: Handle
      }).catch(() => {
      });
      Append(Value);
    }, "replace"),
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("outputChannel.dispose", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose"),
    logLevel: 2,
    // VS Code's LogLevel.Info
    onDidChangeLogLevel: /* @__PURE__ */ __name((_Listener) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "onDidChangeLogLevel"),
    trace: /* @__PURE__ */ __name((Message, ..._Arguments) => Append(`[trace] ${Message}
`), "trace"),
    debug: /* @__PURE__ */ __name((Message, ..._Arguments) => Append(`[debug] ${Message}
`), "debug"),
    info: /* @__PURE__ */ __name((Message, ..._Arguments) => Append(`[info] ${Message}
`), "info"),
    warn: /* @__PURE__ */ __name((Message, ..._Arguments) => Append(`[warn] ${Message}
`), "warn"),
    error: /* @__PURE__ */ __name((MessageOrError, ..._Arguments) => {
      const Text = MessageOrError instanceof Error ? MessageOrError.stack ?? MessageOrError.message : String(MessageOrError);
      Append(`[error] ${Text}
`);
    }, "error")
  };
  return Channel;
}, "default");
export {
  CreateOutputChannel_default as default
};
//# sourceMappingURL=CreateOutputChannel.js.map
