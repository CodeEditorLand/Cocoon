var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WindowNamespace.ts
var MakeEventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Callback) => {
  Context.Emitter.on(EventName, Callback);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Callback);
    }, "dispose")
  };
}, "MakeEventSubscriber");
var OutputChannelCounter = 0;
var TerminalCounter = 0;
var StatusBarCounter = 0;
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
      const Handle = `terminal:${++TerminalCounter}`;
      const Name = Options?.name ?? `Terminal ${TerminalCounter}`;
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
        }, "dispose")
      };
    }, "createTerminal"),
    createStatusBarItem: /* @__PURE__ */ __name((AlignmentOrId, Priority) => {
      const Handle = `statusBar:${++StatusBarCounter}`;
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
      const Handle = `outputChannel:${++OutputChannelCounter}`;
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
        // LogOutputChannel additions — returned when the caller passes
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
    createWebviewPanel: /* @__PURE__ */ __name((_ViewType, _Title, _ShowOptions, _Options) => ({
      viewType: _ViewType,
      title: _Title,
      iconPath: void 0,
      webview: {
        options: {},
        html: "",
        cspSource: "",
        asWebviewUri: /* @__PURE__ */ __name((Uri) => Uri, "asWebviewUri"),
        postMessage: /* @__PURE__ */ __name(async () => false, "postMessage"),
        onDidReceiveMessage: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "onDidReceiveMessage")
      },
      options: {},
      viewColumn: 1,
      active: true,
      visible: true,
      reveal: /* @__PURE__ */ __name(() => {
      }, "reveal"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose"),
      onDidDispose: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidDispose"),
      onDidChangeViewState: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeViewState")
    }), "createWebviewPanel"),
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
      onDidChangeTabs: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeTabs"),
      onDidChangeTabGroups: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeTabGroups"),
      close: /* @__PURE__ */ __name(async () => true, "close")
    },
    activeColorTheme: {
      kind: 2,
      // ColorThemeKind.Dark
      onDidChange: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChange")
    },
    onDidChangeActiveColorTheme: MakeEventSubscriber(
      Context,
      "window.didChangeActiveColorTheme"
    ),
    createTreeView: /* @__PURE__ */ __name((_Id, _Options) => ({
      reveal: /* @__PURE__ */ __name(async () => {
      }, "reveal"),
      dispose: /* @__PURE__ */ __name(() => {
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
    }), "createTreeView"),
    registerTreeDataProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTreeDataProvider"),
    registerWebviewPanelSerializer: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerWebviewPanelSerializer"),
    registerWebviewViewProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerWebviewViewProvider"),
    registerCustomEditorProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerCustomEditorProvider"),
    registerFileDecorationProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerFileDecorationProvider"),
    registerUriHandler: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerUriHandler"),
    registerTerminalLinkProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTerminalLinkProvider"),
    registerTerminalProfileProvider: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerTerminalProfileProvider"),
    registerProfileContentHandler: /* @__PURE__ */ __name((_Id, _Handler) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "registerProfileContentHandler"),
    registerExternalUriOpener: /* @__PURE__ */ __name((_Id, _Opener, _Metadata) => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "registerExternalUriOpener"),
    withProgress: /* @__PURE__ */ __name(async (_Option, Task) => Task({ report: /* @__PURE__ */ __name(() => {
    }, "report") }), "withProgress"),
    setStatusBarMessage: /* @__PURE__ */ __name((Text, HideAfter) => {
      Context.SendToMountain("statusBar.message", {
        text: Text,
        hideAfter: typeof HideAfter === "number" ? HideAfter : void 0
      }).catch(() => {
      });
      return { dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") };
    }, "setStatusBarMessage"),
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
    onDidChangeWindowState: MakeEventSubscriber(
      Context,
      "window.didChangeWindowState"
    ),
    activeTextEditor: void 0,
    visibleTextEditors: [],
    terminals: [],
    activeTerminal: void 0,
    state: { focused: true, active: true }
  };
}, "CreateWindowNamespace");
var WindowNamespace_default = CreateWindowNamespace;
export {
  WindowNamespace_default as default
};
//# sourceMappingURL=WindowNamespace.js.map
