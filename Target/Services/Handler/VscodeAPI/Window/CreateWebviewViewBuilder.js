var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateWebviewViewBuilder.ts
var CreateWebviewViewBuilder_default = /* @__PURE__ */ __name((Context, Handle, ViewId, ToWebviewUri, SharedCspSource) => {
  let CurrentHtml = "";
  let CurrentVisible = true;
  const VisibilityListeners = /* @__PURE__ */ new Set();
  const DisposeListeners = /* @__PURE__ */ new Set();
  const ChannelVisibility = `webview.viewVisibility:${Handle}`;
  const ChannelDispose = `webview.dispose:${Handle}`;
  const VisibilityForward = /* @__PURE__ */ __name((Visible) => {
    CurrentVisible = !!Visible;
    for (const L of VisibilityListeners) {
      try {
        L(!!Visible);
      } catch (_e) {
      }
    }
  }, "VisibilityForward");
  const DisposeForward = /* @__PURE__ */ __name(() => {
    for (const L of DisposeListeners) {
      try {
        L();
      } catch (_e) {
      }
    }
    DisposeListeners.clear();
    VisibilityListeners.clear();
    Context.Emitter?.off?.(ChannelVisibility, VisibilityForward);
    Context.Emitter?.off?.(ChannelDispose, DisposeForward);
  }, "DisposeForward");
  Context.Emitter?.on?.(ChannelVisibility, VisibilityForward);
  Context.Emitter?.on?.(ChannelDispose, DisposeForward);
  let CurrentTitle;
  let CurrentDescription;
  let CurrentBadge;
  const FireMetadataUpdate = /* @__PURE__ */ __name(() => {
    Context.SendToMountain("webview.updateView", {
      handle: Handle,
      viewId: ViewId,
      title: CurrentTitle ?? null,
      description: CurrentDescription ?? null,
      badge: CurrentBadge ?? null
    }).catch(() => {
    });
  }, "FireMetadataUpdate");
  const View = {
    // `viewType` is the manifest-declared id from
    // `contributes.views[*].id` - same string as `ViewId`. Roo
    // and others log it when the view resolves and crash on
    // `undefined.toString()`.
    viewType: ViewId,
    // Stock VS Code's `WebviewView.visible: boolean` reflects
    // whether the pane is body-visible. Roo, Claude, GitLens
    // all early-return from `resolveWebviewView` /
    // `getHtmlContent` when this reads falsy - the missing
    // getter previously made every `view.visible` read produce
    // `undefined` and the React mount pipeline never kicked
    // off. Backed by `CurrentVisible` which is updated by the
    // visibility channel forwarder above.
    get visible() {
      return CurrentVisible;
    },
    // Some extensions (Continue, occasionally GitLens) cache the
    // view in their own state and reassign `view.visible = X`
    // when they think they detect external visibility changes.
    // Stock VS Code's `WebviewView.visible` is read-only - in
    // strict-mode ES modules a getter-only property would throw
    // `TypeError: Cannot set property visible` on those writes
    // and bring down the resolver chain. A no-op setter
    // (matching the read-only spirit of the spec) absorbs those
    // writes without observable behaviour change; the truth
    // still flows through the visibility channel.
    set visible(_Ignored) {
    },
    get title() {
      return CurrentTitle;
    },
    set title(Value) {
      CurrentTitle = Value;
      FireMetadataUpdate();
    },
    get description() {
      return CurrentDescription;
    },
    set description(Value) {
      CurrentDescription = Value;
      FireMetadataUpdate();
    },
    get badge() {
      return CurrentBadge;
    },
    set badge(Value) {
      CurrentBadge = Value;
      FireMetadataUpdate();
    },
    webview: {
      get html() {
        return CurrentHtml;
      },
      set html(Value) {
        CurrentHtml = String(Value ?? "");
        try {
          if (process.env["Trace"]) {
            process.stdout.write(
              `[WebviewView] set-html-enter handle=${Handle} viewId=${ViewId} htmlLen=${CurrentHtml.length}
`
            );
          }
        } catch {
        }
        Context.SendToMountain("webview.setHtml", {
          handle: Handle,
          viewId: ViewId,
          html: CurrentHtml
        }).then(
          () => {
            try {
              if (process.env["Trace"]) {
                process.stdout.write(
                  `[WebviewView] set-html-sent handle=${Handle} viewId=${ViewId}
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
                  `[WebviewView] set-html-failed handle=${Handle} viewId=${ViewId} error=${String(Error2?.message ?? Error2).slice(0, 120)}
`
                );
              }
            } catch {
            }
          }
        );
      },
      // Stock VS Code populates `webview.options` from the
      // `WebviewOptions` passed to
      // `registerWebviewViewProvider(viewId, provider, { webviewOptions })`.
      // Roo / Claude / Continue all read
      // `view.webview.options.localResourceRoots` when composing
      // CSP and `<script nonce>` attributes - `undefined`
      // crashed those reads or produced a CSP that blocked the
      // extension's own bundle. Permissive dev-time defaults
      // keep extensions that never set options happy.
      options: {
        enableScripts: true,
        enableCommandUris: true,
        enableForms: true,
        localResourceRoots: [],
        portMapping: []
      },
      cspSource: SharedCspSource,
      asWebviewUri: ToWebviewUri,
      postMessage: /* @__PURE__ */ __name(async (Message) => {
        await Context.SendToMountain("webview.postMessage", {
          handle: Handle,
          viewId: ViewId,
          message: Message
        }).catch(() => {
        });
        return true;
      }, "postMessage"),
      onDidReceiveMessage: /* @__PURE__ */ __name((Listener) => {
        const Channel = `webview.message:${Handle}`;
        Context.Emitter?.on?.(Channel, Listener);
        return {
          dispose: /* @__PURE__ */ __name(() => Context.Emitter?.off?.(Channel, Listener), "dispose")
        };
      }, "onDidReceiveMessage")
    },
    show: /* @__PURE__ */ __name((PreserveFocus) => {
      Context.SendToMountain("webview.reveal", {
        handle: Handle,
        viewId: ViewId,
        preserveFocus: !!PreserveFocus
      }).catch(() => {
      });
    }, "show"),
    onDidChangeVisibility: /* @__PURE__ */ __name((Listener) => {
      VisibilityListeners.add(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => VisibilityListeners.delete(Listener), "dispose")
      };
    }, "onDidChangeVisibility"),
    onDispose: /* @__PURE__ */ __name((Listener) => {
      DisposeListeners.add(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => DisposeListeners.delete(Listener), "dispose")
      };
    }, "onDispose"),
    // Canonical VS Code API name. Roo's `resolveWebviewView` calls
    // `webviewView.onDidDispose(() => {})`; without this alias the
    // call surfaces as `r.onDidDispose is not a function` and the
    // resolver promise rejects AFTER `webview.html` was already
    // set. VS Code spells the listener `onDidDispose: Event<void>`;
    // alias to the existing `onDispose` listener-set rather than
    // duplicate the storage.
    onDidDispose: /* @__PURE__ */ __name((Listener) => {
      DisposeListeners.add(Listener);
      return {
        dispose: /* @__PURE__ */ __name(() => DisposeListeners.delete(Listener), "dispose")
      };
    }, "onDidDispose"),
    dispose: /* @__PURE__ */ __name(() => {
      DisposeForward();
    }, "dispose")
  };
  return View;
}, "default");
export {
  CreateWebviewViewBuilder_default as default
};
//# sourceMappingURL=CreateWebviewViewBuilder.js.map
