var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateWebviewPanel.ts
var CreateWebviewPanel_default = /* @__PURE__ */ __name((Context, Handle, ViewType, Title, ShowOptions, Options, ToWebviewUri, SharedCspSource) => {
  let CurrentHtml = "";
  let CurrentTitle = Title;
  let CurrentIconPath = void 0;
  let CurrentOptions = Options ?? {};
  const ShowOptionsTyped = ShowOptions ?? {};
  let CurrentViewColumn = typeof ShowOptionsTyped.viewColumn === "number" ? ShowOptionsTyped.viewColumn : 1;
  let CurrentActive = true;
  let CurrentVisible = true;
  let Disposed = false;
  const DisposeListeners = [];
  const ViewStateListeners = [];
  Context.MountainClient?.sendRequest("webview.create", {
    handle: Handle,
    viewType: ViewType,
    title: Title,
    showOptions: ShowOptions,
    options: CurrentOptions
  }).catch(() => {
  });
  const PanelRef = { value: void 0 };
  const ViewStateChannel = `webview.viewState:${Handle}`;
  const ViewStateListener = /* @__PURE__ */ __name((State) => {
    if (Disposed) return;
    const NextActive = State?.active != null ? !!State.active : CurrentActive;
    const NextVisible = State?.visible != null ? !!State.visible : CurrentVisible;
    const NextColumn = typeof State?.viewColumn === "number" ? State.viewColumn : CurrentViewColumn;
    const Changed = NextActive !== CurrentActive || NextVisible !== CurrentVisible || NextColumn !== CurrentViewColumn;
    CurrentActive = NextActive;
    CurrentVisible = NextVisible;
    CurrentViewColumn = NextColumn;
    if (!Changed) return;
    const Snapshot = {
      webviewPanel: PanelRef.value
    };
    for (const Listener of ViewStateListeners.slice()) {
      try {
        Listener(Snapshot);
      } catch {
      }
    }
  }, "ViewStateListener");
  Context.Emitter.on(ViewStateChannel, ViewStateListener);
  const DisposeChannel = `webview.dispose:${Handle}`;
  const DisposeListener = /* @__PURE__ */ __name(() => {
    DisposeInternal();
  }, "DisposeListener");
  Context.Emitter.on(DisposeChannel, DisposeListener);
  const DisposeInternal = /* @__PURE__ */ __name(() => {
    if (Disposed) return;
    Disposed = true;
    try {
      Context.Emitter.removeListener(ViewStateChannel, ViewStateListener);
    } catch {
    }
    try {
      Context.Emitter.removeListener(DisposeChannel, DisposeListener);
    } catch {
    }
    try {
      Context.Emitter.removeAllListeners(`webview.message:${Handle}`);
    } catch {
    }
    Context.MountainClient?.sendRequest("webview.dispose", {
      handle: Handle,
      viewId: ViewType
    }).catch(() => {
    });
    for (const Listener of DisposeListeners.slice()) {
      try {
        Listener();
      } catch {
      }
    }
  }, "DisposeInternal");
  const Panel = {
    get viewType() {
      return ViewType;
    },
    get title() {
      return CurrentTitle;
    },
    set title(Value) {
      if (Disposed) return;
      const Next = String(Value ?? "");
      if (Next === CurrentTitle) return;
      CurrentTitle = Next;
      Context.MountainClient?.sendRequest("webview.setTitle", {
        handle: Handle,
        viewId: ViewType,
        title: Next
      }).catch(() => {
      });
    },
    get iconPath() {
      return CurrentIconPath;
    },
    set iconPath(Value) {
      if (Disposed) return;
      CurrentIconPath = Value;
      Context.MountainClient?.sendRequest("webview.setIconPath", {
        handle: Handle,
        viewId: ViewType,
        iconPath: Value
      }).catch(() => {
      });
    },
    webview: {
      get options() {
        return CurrentOptions;
      },
      set options(Value) {
        if (Disposed) return;
        CurrentOptions = Value;
        Context.MountainClient?.sendRequest("webview.setOptions", {
          handle: Handle,
          viewId: ViewType,
          options: Value
        }).catch(() => {
        });
      },
      get html() {
        return CurrentHtml;
      },
      set html(Value) {
        if (Disposed) return;
        CurrentHtml = Value;
        Context.MountainClient?.sendRequest("webview.setHtml", {
          handle: Handle,
          viewId: ViewType,
          html: Value
        }).catch(() => {
        });
      },
      get cspSource() {
        return SharedCspSource;
      },
      asWebviewUri: ToWebviewUri,
      postMessage: /* @__PURE__ */ __name(async (Message) => {
        if (Disposed) return false;
        try {
          await Context.MountainClient?.sendRequest(
            "webview.postMessage",
            { handle: Handle, viewId: ViewType, message: Message }
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
            try {
              Context.Emitter.removeListener(Event, Listener);
            } catch {
            }
          }, "dispose")
        };
      }, "onDidReceiveMessage")
    },
    get options() {
      return CurrentOptions;
    },
    get viewColumn() {
      return CurrentViewColumn;
    },
    get active() {
      return CurrentActive;
    },
    get visible() {
      return CurrentVisible;
    },
    reveal: /* @__PURE__ */ __name((Column, PreserveFocus) => {
      if (Disposed) return;
      if (typeof Column === "number") {
        CurrentViewColumn = Column;
      }
      Context.MountainClient?.sendRequest("webview.reveal", {
        handle: Handle,
        viewId: ViewType,
        viewColumn: Column,
        preserveFocus: PreserveFocus
      }).catch(() => {
      });
    }, "reveal"),
    dispose: /* @__PURE__ */ __name(() => {
      DisposeInternal();
    }, "dispose"),
    onDidDispose: /* @__PURE__ */ __name((Listener) => {
      DisposeListeners.push(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          const Index = DisposeListeners.indexOf(Listener);
          if (Index >= 0) DisposeListeners.splice(Index, 1);
        }, "dispose")
      };
    }, "onDidDispose"),
    onDidChangeViewState: /* @__PURE__ */ __name((Listener) => {
      ViewStateListeners.push(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          const Index = ViewStateListeners.indexOf(Listener);
          if (Index >= 0) ViewStateListeners.splice(Index, 1);
        }, "dispose")
      };
    }, "onDidChangeViewState")
  };
  PanelRef.value = Panel;
  return Panel;
}, "default");
export {
  CreateWebviewPanel_default as default
};
//# sourceMappingURL=CreateWebviewPanel.js.map
