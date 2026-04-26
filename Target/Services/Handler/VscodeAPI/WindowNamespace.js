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
  if (process.env.LAND_DEV_LOG) {
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

// Source/Services/Handler/VscodeAPI/WindowNamespace.ts
var MakeEventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Callback, ThisArg, Disposables) => {
  const Bound = ThisArg === void 0 ? Callback : Callback.bind(ThisArg);
  Context.Emitter.on(EventName, Bound);
  const Subscription = {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Bound);
    }, "dispose")
  };
  if (Disposables && typeof Disposables.push === "function") {
    Disposables.push(Subscription);
  }
  return Subscription;
}, "MakeEventSubscriber");
var TreeDataProviders = /* @__PURE__ */ new Map();
var TreeDataProvidersByViewId = /* @__PURE__ */ new Map();
var WebviewViewProviders = /* @__PURE__ */ new Map();
var CustomEditorProviders = /* @__PURE__ */ new Map();
var WebviewPanels = /* @__PURE__ */ new Map();
var CreateWindowNamespace = /* @__PURE__ */ __name((Context) => {
  const ShowMessage = /* @__PURE__ */ __name((Level) => async (Message, ...Items) => {
    let Options = void 0;
    let Actions = Items;
    if (Items.length > 0 && Items[0] && typeof Items[0] === "object" && !Array.isArray(Items[0]) && "modal" in Items[0]) {
      Options = Items[0];
      Actions = Items.slice(1);
    }
    try {
      const Selection = await Context.MountainClient?.sendRequest(
        "Window.ShowMessage",
        [
          {
            message: Message,
            level: Level,
            items: Actions,
            options: Options ?? {}
          }
        ]
      );
      return Selection ?? void 0;
    } catch {
      return void 0;
    }
  }, "ShowMessage");
  return {
    showInformationMessage: ShowMessage("info"),
    showErrorMessage: ShowMessage("error"),
    showWarningMessage: ShowMessage("warn"),
    showQuickPick: /* @__PURE__ */ __name(async (Items, Options) => {
      try {
        return await Context.MountainClient?.sendRequest(
          "Window.ShowQuickPick",
          [Items, Options ?? {}]
        );
      } catch {
        return void 0;
      }
    }, "showQuickPick"),
    showInputBox: /* @__PURE__ */ __name(async (Options) => {
      try {
        return await Context.MountainClient?.sendRequest(
          "Window.ShowInputBox",
          [Options ?? {}]
        );
      } catch {
        return void 0;
      }
    }, "showInputBox"),
    showOpenDialog: /* @__PURE__ */ __name(async (Options) => {
      try {
        const Selected = await Context.MountainClient?.sendRequest(
          "Window.ShowOpenDialog",
          [Options ?? {}]
        );
        return Array.isArray(Selected) ? Selected : [];
      } catch {
        return [];
      }
    }, "showOpenDialog"),
    showSaveDialog: /* @__PURE__ */ __name(async (Options) => {
      try {
        return await Context.MountainClient?.sendRequest(
          "Window.ShowSaveDialog",
          [Options ?? {}]
        );
      } catch {
        return void 0;
      }
    }, "showSaveDialog"),
    createTerminal: /* @__PURE__ */ __name((Options) => {
      const Handle = NextProviderHandle();
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
        // vscode.window.Terminal.resize(columns, rows) → Mountain
        // PTY master receives SIGWINCH; shell redraws line editor.
        resize: /* @__PURE__ */ __name(async (Columns, Rows) => {
          try {
            await Context.MountainClient?.sendRequest(
              "Terminal.Resize",
              [Handle, Columns, Rows]
            );
          } catch {
          }
        }, "resize")
      };
    }, "createTerminal"),
    createStatusBarItem: /* @__PURE__ */ __name((AlignmentOrId, Priority) => {
      const Handle = NextProviderHandle();
      const Item = {
        id: Handle,
        alignment: typeof AlignmentOrId === "number" ? AlignmentOrId : 1,
        priority: Priority,
        text: "",
        tooltip: "",
        command: void 0,
        show: /* @__PURE__ */ __name(() => {
          Context.SendToMountain("statusBar.update", {
            handle: Handle,
            text: Item.text,
            tooltip: Item.tooltip,
            command: Item.command,
            visible: true
          }).catch(() => {
          });
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
          Context.SendToMountain("statusBar.update", {
            handle: Handle,
            visible: false
          }).catch(() => {
          });
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
          Context.SendToMountain("statusBar.dispose", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose")
      };
      return Item;
    }, "createStatusBarItem"),
    createOutputChannel: /* @__PURE__ */ __name((Name, Options) => {
      const Handle = NextProviderHandle();
      const IsLog = typeof Options === "object" && Options !== null ? Options.log === true : false;
      Context.SendToMountain("outputChannel.create", {
        handle: Handle,
        name: Name,
        log: IsLog
      }).catch(() => {
      });
      const Channel = {
        name: Name,
        append: /* @__PURE__ */ __name((Value) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: Value
          }).catch(() => {
          });
        }, "append"),
        appendLine: /* @__PURE__ */ __name((Value) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `${Value}
`
          }).catch(() => {
          });
        }, "appendLine"),
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
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: Value
          }).catch(() => {
          });
        }, "replace"),
        dispose: /* @__PURE__ */ __name(() => {
          Context.SendToMountain("outputChannel.dispose", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose"),
        // LogOutputChannel additions - returned when the caller passes
        // `{ log: true }`. Kept on the base channel for simplicity;
        // these are inert on non-log channels.
        logLevel: 2,
        // LogLevel.Info
        onDidChangeLogLevel: /* @__PURE__ */ __name((_Listener) => ({
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "onDidChangeLogLevel"),
        trace: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `[trace] ${Message}
`
          }).catch(() => {
          });
        }, "trace"),
        debug: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `[debug] ${Message}
`
          }).catch(() => {
          });
        }, "debug"),
        info: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `[info] ${Message}
`
          }).catch(() => {
          });
        }, "info"),
        warn: /* @__PURE__ */ __name((Message, ..._Arguments) => {
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `[warn] ${Message}
`
          }).catch(() => {
          });
        }, "warn"),
        error: /* @__PURE__ */ __name((MessageOrError, ..._Arguments) => {
          const Text = MessageOrError instanceof Error ? MessageOrError.stack ?? MessageOrError.message : String(MessageOrError);
          Context.SendToMountain("outputChannel.append", {
            handle: Handle,
            value: `[error] ${Text}
`
          }).catch(() => {
          });
        }, "error")
      };
      void IsLog;
      return Channel;
    }, "createOutputChannel"),
    createTextEditorDecorationType: /* @__PURE__ */ __name((Options) => {
      const Key = `decoration:${Math.random().toString(36).slice(2)}`;
      Context.SendToMountain("window.createTextEditorDecorationType", {
        key: Key,
        options: Options ?? {}
      }).catch(() => {
      });
      return {
        key: Key,
        dispose: /* @__PURE__ */ __name(() => {
          Context.SendToMountain(
            "window.disposeTextEditorDecorationType",
            {
              key: Key
            }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "createTextEditorDecorationType"),
    registerTerminalQuickFixProvider: /* @__PURE__ */ __name((_Id, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTerminalQuickFixProvider"),
    registerTerminalCompletionProvider: /* @__PURE__ */ __name((_Id, _Provider, ..._TriggerCharacters) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTerminalCompletionProvider"),
    createQuickPick: /* @__PURE__ */ __name(() => ({
      value: "",
      placeholder: void 0,
      items: [],
      activeItems: [],
      selectedItems: [],
      canSelectMany: false,
      matchOnDescription: false,
      matchOnDetail: false,
      busy: false,
      enabled: true,
      ignoreFocusOut: false,
      step: void 0,
      totalSteps: void 0,
      title: void 0,
      buttons: [],
      show: /* @__PURE__ */ __name(() => {
      }, "show"),
      hide: /* @__PURE__ */ __name(() => {
      }, "hide"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose"),
      onDidAccept: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidAccept"),
      onDidChangeValue: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeValue"),
      onDidChangeActive: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeActive"),
      onDidChangeSelection: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeSelection"),
      onDidTriggerButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidTriggerButton"),
      onDidTriggerItemButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidTriggerItemButton"),
      onDidHide: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidHide")
    }), "createQuickPick"),
    createInputBox: /* @__PURE__ */ __name(() => ({
      value: "",
      valueSelection: void 0,
      placeholder: void 0,
      password: false,
      busy: false,
      enabled: true,
      ignoreFocusOut: false,
      prompt: void 0,
      validationMessage: void 0,
      step: void 0,
      totalSteps: void 0,
      title: void 0,
      buttons: [],
      show: /* @__PURE__ */ __name(() => {
      }, "show"),
      hide: /* @__PURE__ */ __name(() => {
      }, "hide"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose"),
      onDidAccept: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidAccept"),
      onDidChangeValue: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeValue"),
      onDidTriggerButton: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidTriggerButton"),
      onDidHide: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidHide")
    }), "createInputBox"),
    createWebviewPanel: /* @__PURE__ */ __name((ViewType, Title, ShowOptions, Options) => {
      const Handle = NextProviderHandle();
      let CurrentHtml = "";
      let CurrentOptions = Options ?? {};
      Context.MountainClient?.sendRequest("webview.create", [
        Handle,
        ViewType,
        Title,
        ShowOptions,
        CurrentOptions
      ]).catch(() => {
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
            Context.MountainClient?.sendRequest(
              "webview.setOptions",
              [Handle, Value]
            ).catch(() => {
            });
          },
          get html() {
            return CurrentHtml;
          },
          set html(Value) {
            CurrentHtml = Value;
            Context.MountainClient?.sendRequest(
              "webview.setHtml",
              [Handle, Value]
            ).catch(() => {
            });
          },
          cspSource: "vscode-resource: vscode-webview-resource: https:",
          asWebviewUri: /* @__PURE__ */ __name((Uri) => Uri, "asWebviewUri"),
          postMessage: /* @__PURE__ */ __name(async (Message) => {
            try {
              await Context.MountainClient?.sendRequest(
                "webview.postMessage",
                [Handle, Message]
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
                Context.Emitter.removeListener(
                  Event,
                  Listener
                );
              }, "dispose")
            };
          }, "onDidReceiveMessage")
        },
        options: CurrentOptions,
        viewColumn: 1,
        active: true,
        visible: true,
        reveal: /* @__PURE__ */ __name((Column, PreserveFocus) => {
          Context.MountainClient?.sendRequest("webview.reveal", [
            Handle,
            Column,
            PreserveFocus
          ]).catch(() => {
          });
        }, "reveal"),
        dispose: /* @__PURE__ */ __name(() => {
          WebviewPanels.delete(String(Handle));
          Context.Emitter.removeAllListeners(
            `webview.message:${Handle}`
          );
          Context.MountainClient?.sendRequest("webview.dispose", [
            Handle
          ]).catch(() => {
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
      WebviewPanels.set(String(Handle), Panel);
      return Panel;
    }, "createWebviewPanel"),
    showTextDocument: /* @__PURE__ */ __name(async (_Document, _Column, _PreserveFocus) => {
      Context.SendToMountain("window.showTextDocument", {
        document: _Document,
        column: _Column,
        preserveFocus: _PreserveFocus
      }).catch(() => {
      });
      return void 0;
    }, "showTextDocument"),
    showNotebookDocument: /* @__PURE__ */ __name(async (_Document, _Options) => void 0, "showNotebookDocument"),
    tabGroups: {
      all: [],
      activeTabGroup: {
        tabs: [],
        isActive: true,
        viewColumn: 1,
        activeTab: void 0
      },
      onDidChangeTabs: MakeEventSubscriber(
        Context,
        "window.didChangeTabs"
      ),
      onDidChangeTabGroups: MakeEventSubscriber(
        Context,
        "window.didChangeTabGroups"
      ),
      close: /* @__PURE__ */ __name(async (_Tab, _PreserveFocus) => {
        try {
          await Context.MountainClient?.sendRequest("Command.Execute", [
            "workbench.action.closeActiveEditor",
            []
          ]);
          return true;
        } catch {
          return false;
        }
      }, "close")
    },
    activeColorTheme: {
      kind: 2,
      // ColorThemeKind.Dark
      onDidChange: MakeEventSubscriber(
        Context,
        "window.didChangeActiveColorTheme"
      )
    },
    onDidChangeActiveColorTheme: MakeEventSubscriber(
      Context,
      "window.didChangeActiveColorTheme"
    ),
    createTreeView: /* @__PURE__ */ __name((Id, Options) => {
      const Provider = Options?.treeDataProvider;
      if (Provider) {
        const Handle = NextProviderHandle();
        TreeDataProviders.set(String(Handle), Provider);
        TreeDataProvidersByViewId.set(Id, Provider);
        const SerializableOptions = {
          showCollapseAll: Options?.showCollapseAll === true,
          canSelectMany: Options?.canSelectMany === true,
          manageCheckboxStateManually: Options?.manageCheckboxStateManually === true
        };
        Context.MountainClient?.sendRequest("tree.register", [
          Handle,
          Id,
          SerializableOptions
        ]).catch(() => {
        });
      }
      return {
        reveal: /* @__PURE__ */ __name(async () => {
        }, "reveal"),
        dispose: /* @__PURE__ */ __name(() => {
          TreeDataProvidersByViewId.delete(Id);
          Context.MountainClient?.sendRequest("tree.dispose", [
            Id
          ]).catch(() => {
          });
        }, "dispose"),
        selection: [],
        visible: true,
        title: void 0,
        description: void 0,
        message: void 0,
        badge: void 0,
        onDidChangeSelection: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeSelection"),
        onDidChangeVisibility: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeVisibility"),
        onDidCollapseElement: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidCollapseElement"),
        onDidExpandElement: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidExpandElement"),
        onDidChangeCheckboxState: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidChangeCheckboxState")
      };
    }, "createTreeView"),
    registerTreeDataProvider: /* @__PURE__ */ __name((ViewId, Provider) => {
      const Handle = NextProviderHandle();
      TreeDataProviders.set(String(Handle), Provider);
      TreeDataProvidersByViewId.set(ViewId, Provider);
      Context.MountainClient?.sendRequest("tree.register", [
        Handle,
        ViewId,
        {}
      ]).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          TreeDataProviders.delete(String(Handle));
          TreeDataProvidersByViewId.delete(ViewId);
          Context.MountainClient?.sendRequest("tree.unregister", [
            Handle
          ]).catch(() => {
          });
        }, "dispose")
      };
    }, "registerTreeDataProvider"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerWebviewPanelSerializer"),
    registerWebviewViewProvider: /* @__PURE__ */ __name((ViewId, Provider) => {
      const Handle = NextProviderHandle();
      WebviewViewProviders.set(String(Handle), Provider);
      Context.MountainClient?.sendRequest("webview.registerView", [
        Handle,
        ViewId
      ]).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          WebviewViewProviders.delete(String(Handle));
          Context.MountainClient?.sendRequest(
            "webview.unregisterView",
            [Handle]
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerWebviewViewProvider"),
    registerCustomEditorProvider: /* @__PURE__ */ __name((ViewType, Provider) => {
      const Handle = NextProviderHandle();
      CustomEditorProviders.set(String(Handle), Provider);
      Context.MountainClient?.sendRequest(
        "webview.registerCustomEditor",
        [Handle, ViewType]
      ).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          CustomEditorProviders.delete(String(Handle));
          Context.MountainClient?.sendRequest(
            "webview.unregisterCustomEditor",
            [Handle]
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerCustomEditorProvider"),
    registerFileDecorationProvider: /* @__PURE__ */ __name((Provider) => {
      const Handle = NextProviderHandle();
      Context.SendToMountain("register_file_decoration_provider", {
        handle: Handle,
        extension_id: ""
      }).catch(() => {
      });
      Context.ExtensionRegistry.set(
        `__fileDecorationProvider:${Handle}`,
        Provider
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.ExtensionRegistry.delete(
            `__fileDecorationProvider:${Handle}`
          );
          Context.SendToMountain(
            "unregister_file_decoration_provider",
            { handle: Handle }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerFileDecorationProvider"),
    registerUriHandler: /* @__PURE__ */ __name((Handler) => {
      const Handle = NextProviderHandle();
      Context.SendToMountain("register_uri_handler", {
        handle: Handle,
        extension_id: ""
      }).catch(() => {
      });
      Context.ExtensionRegistry.set(`__uriHandler:${Handle}`, Handler);
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.ExtensionRegistry.delete(`__uriHandler:${Handle}`);
          Context.SendToMountain("unregister_uri_handler", {
            handle: Handle
          }).catch(() => {
          });
        }, "dispose")
      };
    }, "registerUriHandler"),
    registerTerminalLinkProvider: /* @__PURE__ */ __name((Provider) => {
      const Handle = NextProviderHandle();
      Context.SendToMountain("register_terminal_link_provider", {
        handle: Handle,
        extension_id: ""
      }).catch(() => {
      });
      Context.ExtensionRegistry.set(
        `__terminalLinkProvider:${Handle}`,
        Provider
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.ExtensionRegistry.delete(
            `__terminalLinkProvider:${Handle}`
          );
          Context.SendToMountain(
            "unregister_terminal_link_provider",
            { handle: Handle }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerTerminalLinkProvider"),
    registerTerminalProfileProvider: /* @__PURE__ */ __name((Id, Provider) => {
      const Handle = NextProviderHandle();
      Context.SendToMountain("register_terminal_profile_provider", {
        handle: Handle,
        profile_id: Id,
        extension_id: ""
      }).catch(() => {
      });
      Context.ExtensionRegistry.set(
        `__terminalProfileProvider:${Handle}`,
        Provider
      );
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.ExtensionRegistry.delete(
            `__terminalProfileProvider:${Handle}`
          );
          Context.SendToMountain(
            "unregister_terminal_profile_provider",
            { handle: Handle }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerTerminalProfileProvider"),
    registerProfileContentHandler: /* @__PURE__ */ __name((_Id, _Handler) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "registerProfileContentHandler"),
    registerExternalUriOpener: /* @__PURE__ */ __name((Id, _Opener, _Metadata) => {
      const Handle = NextProviderHandle();
      Context.SendToMountain("register_external_uri_opener", {
        handle: Handle,
        opener_id: Id,
        extension_id: ""
      }).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          Context.SendToMountain(
            "unregister_external_uri_opener",
            { handle: Handle }
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerExternalUriOpener"),
    // Runs a Task with a progress object that reports to Mountain, which
    // in turn updates the status-bar progress indicator in Sky.
    // VS Code's contract: `Task(progress, cancellationToken) -> Thenable<R>`.
    // We provide a real `report({ message, increment })` path and a
    // no-op CancellationToken (no cancellation plumbing yet). The
    // Task's return value is forwarded verbatim.
    withProgress: /* @__PURE__ */ __name(async (Options, Task) => {
      const Handle = NextProviderHandle();
      const Title = Options && typeof Options === "object" && Options.title || "Progress";
      const Location = (Options && typeof Options === "object" && Options.location) ?? 15;
      let Increment = 0;
      const Progress = {
        report: /* @__PURE__ */ __name((Value) => {
          if (Value?.increment) Increment += Value.increment;
          Context.SendToMountain("progress.report", {
            handle: Handle,
            title: Title,
            location: Location,
            message: Value?.message,
            increment: Increment
          }).catch(() => {
          });
        }, "report")
      };
      const CancellationToken = {
        isCancellationRequested: false,
        onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onCancellationRequested")
      };
      Context.SendToMountain("progress.start", {
        handle: Handle,
        title: Title,
        location: Location
      }).catch(() => {
      });
      try {
        return await Task(Progress, CancellationToken);
      } finally {
        Context.SendToMountain("progress.end", {
          handle: Handle
        }).catch(() => {
        });
      }
    }, "withProgress"),
    setStatusBarMessage: /* @__PURE__ */ __name((Text, HideAfter) => {
      Context.SendToMountain("statusBar.message", {
        text: Text,
        hideAfter: typeof HideAfter === "number" ? HideAfter : void 0
      }).catch(() => {
      });
      return { dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") };
    }, "setStatusBarMessage"),
    // `showWorkspaceFolderPick` - stable API. Stock routes through
    // `MainThreadMessageService` to open a quick pick seeded with the
    // current `workspace.workspaceFolders`. Land's folder list lives
    // in `ExtensionHostInitData.workspace.folders`; pick the first by
    // default (no picker UI yet). Extensions only use this when a
    // command has to choose a folder for multi-root; degrading to
    // "auto-pick first folder" keeps those flows functional until the
    // picker is wired to Sky.
    showWorkspaceFolderPick: /* @__PURE__ */ __name(async (_Options) => {
      const Folders = Context.ExtensionHostInitData?.workspace?.folders ?? [];
      return Folders[0];
    }, "showWorkspaceFolderPick"),
    // `withScmProgress` - deprecated in `vscode.d.ts` but still present
    // for extensions that never migrated to `withProgress`. Run the
    // task with a no-op number-progress channel and surface its return
    // value. Stock extHost implementation does the same degradation
    // path.
    withScmProgress: /* @__PURE__ */ __name(async (Task) => Task({
      report: /* @__PURE__ */ __name(() => {
      }, "report")
    }), "withScmProgress"),
    // `registerQuickDiffProvider` - proposed API used by SCM-adjacent
    // extensions to overlay a diff gutter. Stub-as-disposable lets
    // opt-in extensions activate until Land wires a real quick-diff
    // channel to Mountain's git surface.
    registerQuickDiffProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Id, _Label, _RootUri) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerQuickDiffProvider"),
    // Events sourced from Mountain gRPC notifications → Context.Emitter
    onDidChangeActiveTextEditor: MakeEventSubscriber(
      Context,
      "window.didChangeActiveTextEditor"
    ),
    onDidChangeVisibleTextEditors: MakeEventSubscriber(
      Context,
      "window.didChangeVisibleTextEditors"
    ),
    onDidChangeTextEditorSelection: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorSelection"
    ),
    onDidChangeTextEditorVisibleRanges: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorVisibleRanges"
    ),
    onDidChangeTextEditorOptions: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorOptions"
    ),
    onDidChangeTextEditorViewColumn: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorViewColumn"
    ),
    onDidOpenTerminal: MakeEventSubscriber(
      Context,
      "window.didOpenTerminal"
    ),
    onDidCloseTerminal: MakeEventSubscriber(
      Context,
      "window.didCloseTerminal"
    ),
    onDidChangeActiveTerminal: MakeEventSubscriber(
      Context,
      "window.didChangeActiveTerminal"
    ),
    onDidChangeTerminalState: MakeEventSubscriber(
      Context,
      "window.didChangeTerminalState"
    ),
    onDidWriteTerminalData: MakeEventSubscriber(
      Context,
      "terminalData"
    ),
    // Shell-integration events added for openai.chatgpt activation;
    // Land doesn't track shell integration yet so these fire never.
    // Must be a subscribable function, not a plain object.
    onDidChangeTerminalShellIntegration: MakeEventSubscriber(
      Context,
      "window.didChangeTerminalShellIntegration"
    ),
    onDidStartTerminalShellExecution: MakeEventSubscriber(
      Context,
      "window.didStartTerminalShellExecution"
    ),
    onDidEndTerminalShellExecution: MakeEventSubscriber(
      Context,
      "window.didEndTerminalShellExecution"
    ),
    onDidChangeWindowState: MakeEventSubscriber(
      Context,
      "window.didChangeWindowState"
    ),
    // `vscode.git`'s `init()` subscribes to this at
    // `extensions/git/out/main.js` (via the diff decoration pipeline
    // it registers post-activation). Stock `extHostWindow.ts`
    // exposes this event; our shim didn't, so git activate() threw
    // `TypeError: …onDidChangeTextEditorDiffInformation is not a
    // function` and never reached `scm.createSourceControl`, leaving
    // the Source Control panel showing "No source control providers
    // registered". No Mountain-side event source yet; stub with the
    // disposable contract so subscription is a no-op. Real wiring
    // would route Mountain's diff-decoration change stream into a
    // `window.didChangeTextEditorDiffInformation` emit.
    onDidChangeTextEditorDiffInformation: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorDiffInformation"
    ),
    // Preemptive stubs for adjacent window event APIs stock VS Code
    // ships. Each is wired to a Tauri event channel Mountain may
    // populate later; until then the subscribe is a safe no-op.
    // Added in bulk because the `vscode.git` failure above is the
    // third whack-a-mole on the `vscode.window` namespace in this
    // session, and extensions subscribe to these events defensively
    // at activation time.
    onDidChangeTextEditorSelection: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorSelection"
    ),
    onDidChangeTextEditorVisibleRanges: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorVisibleRanges"
    ),
    onDidChangeTextEditorOptions: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorOptions"
    ),
    onDidChangeTextEditorViewColumn: MakeEventSubscriber(
      Context,
      "window.didChangeTextEditorViewColumn"
    ),
    onDidChangeActiveNotebookEditor: MakeEventSubscriber(
      Context,
      "window.didChangeActiveNotebookEditor"
    ),
    onDidChangeVisibleNotebookEditors: MakeEventSubscriber(
      Context,
      "window.didChangeVisibleNotebookEditors"
    ),
    onDidChangeNotebookEditorSelection: MakeEventSubscriber(
      Context,
      "window.didChangeNotebookEditorSelection"
    ),
    onDidChangeNotebookEditorVisibleRanges: MakeEventSubscriber(
      Context,
      "window.didChangeNotebookEditorVisibleRanges"
    ),
    onDidChangeActiveColorTheme: MakeEventSubscriber(
      Context,
      "window.didChangeActiveColorTheme"
    ),
    onDidChangeTerminalState: MakeEventSubscriber(
      Context,
      "window.didChangeTerminalState"
    ),
    onDidOpenTerminal: MakeEventSubscriber(Context, "window.didOpenTerminal"),
    onDidCloseTerminal: MakeEventSubscriber(Context, "window.didCloseTerminal"),
    onDidChangeActiveTerminal: MakeEventSubscriber(
      Context,
      "window.didChangeActiveTerminal"
    ),
    onDidWriteTerminalData: MakeEventSubscriber(
      Context,
      "window.didWriteTerminalData"
    ),
    onDidExecuteTerminalCommand: MakeEventSubscriber(
      Context,
      "window.didExecuteTerminalCommand"
    ),
    onDidChangeTerminalShellIntegration: MakeEventSubscriber(
      Context,
      "window.didChangeTerminalShellIntegration"
    ),
    onDidStartTerminalShellExecution: MakeEventSubscriber(
      Context,
      "window.didStartTerminalShellExecution"
    ),
    onDidEndTerminalShellExecution: MakeEventSubscriber(
      Context,
      "window.didEndTerminalShellExecution"
    ),
    activeTextEditor: void 0,
    activeColorTheme: {
      kind: 2
      /* Dark */
    },
    visibleTextEditors: [],
    visibleNotebookEditors: [],
    activeNotebookEditor: void 0,
    notebookEditors: [],
    tabGroups: {
      all: [],
      activeTabGroup: { tabs: [] },
      onDidChangeTabGroups: /* @__PURE__ */ __name((() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") })), "onDidChangeTabGroups"),
      onDidChangeTabs: /* @__PURE__ */ __name((() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") })), "onDidChangeTabs"),
      close: /* @__PURE__ */ __name(async () => false, "close")
    },
    terminals: [],
    activeTerminal: void 0,
    state: { focused: true, active: true }
  };
}, "CreateWindowNamespace");
var WindowNamespace_default = CreateWindowNamespace;
export {
  CustomEditorProviders,
  TreeDataProviders,
  TreeDataProvidersByViewId,
  WebviewPanels,
  WebviewViewProviders,
  WindowNamespace_default as default
};
//# sourceMappingURL=WindowNamespace.js.map
