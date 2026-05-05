var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateWebviewPanel.ts
var CreateWebviewPanel_default = /* @__PURE__ */ __name((Context, Handle, ViewType, Title, ShowOptions, Options, ToWebviewUri, SharedCspSource) => {
  let CurrentHtml = "";
  let CurrentOptions = Options ?? {};
  Context.MountainClient?.sendRequest("webview.create", {
    handle: Handle,
    viewType: ViewType,
    title: Title,
    showOptions: ShowOptions,
    options: CurrentOptions
  }).catch(() => {
  });
  const Panel = {
    viewType: ViewType,
    title: Title,
    iconPath: void 0,
    webview: {
      get options() {
        return CurrentOptions;
      },
      set options(Value) {
        CurrentOptions = Value;
        Context.MountainClient?.sendRequest("webview.setOptions", {
          handle: Handle,
          options: Value
        }).catch(() => {
        });
      },
      get html() {
        return CurrentHtml;
      },
      set html(Value) {
        CurrentHtml = Value;
        try {
          if (process.env["Trace"]) {
            process.stdout.write(
              `[WebviewPanel] set-html-enter handle=${Handle} htmlLen=${String(Value ?? "").length} hasMountainClient=${!!Context.MountainClient}
`
            );
          }
        } catch {
        }
        Context.MountainClient?.sendRequest("webview.setHtml", {
          handle: Handle,
          html: Value
        }).then(
          () => {
            try {
              if (process.env["Trace"]) {
                process.stdout.write(
                  `[WebviewPanel] set-html-sent handle=${Handle}
`
                );
              }
            } catch {
            }
          },
          (Error2) => {
            try {
              if (process.env["Trace"]) {
                process.stdout.write(
                  `[WebviewPanel] set-html-failed handle=${Handle} error=${String(Error2?.message ?? Error2).slice(0, 120)}
`
                );
              }
            } catch {
            }
          }
        );
      },
      cspSource: SharedCspSource,
      asWebviewUri: ToWebviewUri,
      postMessage: /* @__PURE__ */ __name(async (Message) => {
        try {
          await Context.MountainClient?.sendRequest(
            "webview.postMessage",
            { handle: Handle, message: Message }
          );
          return true;
        } catch {
          return false;
        }
      }, "postMessage"),
      onDidReceiveMessage: /* @__PURE__ */ __name((Listener) => {
        const Event = `webview.message:${Handle}`;
        Context.Emitter.on(Event, Listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Context.Emitter.removeListener(Event, Listener);
          }, "dispose")
        };
      }, "onDidReceiveMessage")
    },
    options: CurrentOptions,
    viewColumn: 1,
    active: true,
    visible: true,
    reveal: /* @__PURE__ */ __name((Column, PreserveFocus) => {
      Context.MountainClient?.sendRequest("webview.reveal", {
        handle: Handle,
        viewColumn: Column,
        preserveFocus: PreserveFocus
      }).catch(() => {
      });
    }, "reveal"),
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.removeAllListeners(`webview.message:${Handle}`);
      Context.MountainClient?.sendRequest("webview.dispose", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose"),
    onDidDispose: /* @__PURE__ */ __name((Listener) => {
      const Event = `webview.dispose:${Handle}`;
      Context.Emitter.on(Event, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.Emitter.removeListener(Event, Listener);
        }, "dispose")
      };
    }, "onDidDispose"),
    onDidChangeViewState: /* @__PURE__ */ __name((Listener) => {
      const Event = `webview.viewState:${Handle}`;
      Context.Emitter.on(Event, Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.Emitter.removeListener(Event, Listener);
        }, "dispose")
      };
    }, "onDidChangeViewState")
  };
  return Panel;
}, "default");
export {
  CreateWebviewPanel_default as default
};
//# sourceMappingURL=CreateWebviewPanel.js.map
