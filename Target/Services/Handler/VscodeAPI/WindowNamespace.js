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
var TreeDataProviderCounter = 0;
var WebviewPanelCounter = 0;
var WebviewViewCounter = 0;
var CustomEditorCounter = 0;
var ProgressCounter = 0;
var TreeDataProviders = /* @__PURE__ */ new Map();
var WebviewViewProviders = /* @__PURE__ */ new Map();
var CustomEditorProviders = /* @__PURE__ */ new Map();
var WebviewPanels = /* @__PURE__ */ new Map();
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
    createWebviewPanel: /* @__PURE__ */ __name((ViewType, Title, ShowOptions, Options) => {
      const Handle = `webviewPanel:${++WebviewPanelCounter}`;
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
          WebviewPanels.delete(Handle);
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
      WebviewPanels.set(Handle, Panel);
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
    createTreeView: /* @__PURE__ */ __name((Id, Options) => {
      const Provider = Options?.treeDataProvider;
      if (Provider) {
        const Handle = `treeDataProvider:${++TreeDataProviderCounter}`;
        TreeDataProviders.set(Handle, Provider);
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
      const Handle = `treeDataProvider:${++TreeDataProviderCounter}`;
      TreeDataProviders.set(Handle, Provider);
      Context.MountainClient?.sendRequest("tree.register", [
        Handle,
        ViewId,
        {}
      ]).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          TreeDataProviders.delete(Handle);
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
      const Handle = `webviewView:${++WebviewViewCounter}`;
      WebviewViewProviders.set(Handle, Provider);
      Context.MountainClient?.sendRequest("webview.registerView", [
        Handle,
        ViewId
      ]).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          WebviewViewProviders.delete(Handle);
          Context.MountainClient?.sendRequest(
            "webview.unregisterView",
            [Handle]
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerWebviewViewProvider"),
    registerCustomEditorProvider: /* @__PURE__ */ __name((ViewType, Provider) => {
      const Handle = `customEditor:${++CustomEditorCounter}`;
      CustomEditorProviders.set(Handle, Provider);
      Context.MountainClient?.sendRequest(
        "webview.registerCustomEditor",
        [Handle, ViewType]
      ).catch(() => {
      });
      return {
        dispose: /* @__PURE__ */ __name(() => {
          CustomEditorProviders.delete(Handle);
          Context.MountainClient?.sendRequest(
            "webview.unregisterCustomEditor",
            [Handle]
          ).catch(() => {
          });
        }, "dispose")
      };
    }, "registerCustomEditorProvider"),
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
    // Runs a Task with a progress object that reports to Mountain, which
    // in turn updates the status-bar progress indicator in Sky.
    // VS Code's contract: `Task(progress, cancellationToken) -> Thenable<R>`.
    // We provide a real `report({ message, increment })` path and a
    // no-op CancellationToken (no cancellation plumbing yet). The
    // Task's return value is forwarded verbatim.
    withProgress: /* @__PURE__ */ __name(async (Options, Task) => {
      const Handle = `progress:${++ProgressCounter}`;
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
  CustomEditorProviders,
  TreeDataProviders,
  WebviewPanels,
  WebviewViewProviders,
  WindowNamespace_default as default
};
//# sourceMappingURL=WindowNamespace.js.map
