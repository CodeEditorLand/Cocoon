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
  return {
    name: Name,
    get processId() {
      return ResolveProcessId();
    },
    sendText: /* @__PURE__ */ __name(async (Text, _AddNewLine) => {
      Context.SendToMountain("terminal.sendText", {
        handle: Handle,
        text: Text
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
