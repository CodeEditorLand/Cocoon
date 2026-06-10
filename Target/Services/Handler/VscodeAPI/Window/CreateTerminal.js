var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateTerminal.ts
var CreateTerminal_default = /* @__PURE__ */ __name((Context, Handle, Options) => {
  const Name = Options?.name ?? `Terminal ${Handle}`;
  Context.SendToMountain("window.createTerminal", {
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
        const Response = await Context.MountainClient?.sendRequest(
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
    Context.Emitter?.on?.(
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
      return Context?.[`__terminalExitStatus:${Handle}`];
    },
    sendText: /* @__PURE__ */ __name(async (Text, AddNewLine) => {
      const ShouldAppendNewLine = AddNewLine !== false;
      const Payload = ShouldAppendNewLine ? `${Text}\r` : Text;
      Context.SendToMountain("terminal.sendText", {
        handle: Handle,
        text: Payload
      }).catch(() => {
      });
    }, "sendText"),
    show: /* @__PURE__ */ __name((PreserveFocus) => {
      Context.SendToMountain("terminal.show", {
        handle: Handle,
        preserveFocus: PreserveFocus
      }).catch(() => {
      });
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("terminal.hide", {
        handle: Handle
      }).catch(() => {
      });
    }, "hide"),
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("terminal.dispose", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose"),
    resize: /* @__PURE__ */ __name(async (Columns, Rows) => {
      try {
        await Context.MountainClient?.sendRequest("Terminal.Resize", [
          Handle,
          Columns,
          Rows
        ]);
      } catch {
      }
    }, "resize")
  };
}, "default");
export {
  CreateTerminal_default as default
};
//# sourceMappingURL=CreateTerminal.js.map
