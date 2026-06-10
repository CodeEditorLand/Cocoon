<<<<<<< HEAD
import{MountainMethods as d,RouteManifestSummary as u}from"../../Generated/RouteManifest.js";class m extends Error{constructor(o){super(`Method '${o}' is not implemented in Land: no Mountain Rust handler, no stock VS Code lift, no Cocoon bespoke fallback.`);this.Method=o;this.name="NotImplementedError"}Method;code="NotImplemented";_tag="NotImplementedError"}process.env.Trace&&process.stdout.write(`[DEV:DUAL-TRACK] manifest mountain=${u.mountain} stockLift=${u.stockLift} bespoke=${u.bespoke} generated=${u.generatedAt}
`);const c=e=>{if(!e)return!1;const n=e.trim().toLowerCase();return n==="false"||n==="0"||n==="no"||n==="off"},w=e=>{const n=e.indexOf(".");return n<=0?"":e.slice(0,n).toUpperCase()},l=e=>{const n=`Defer${e.replace(/[.:]/g,"_")}`;if(process.env[n]!==void 0)return!c(process.env[n]);const o=w(e);if(o){const t=`Defer${o}`;if(process.env[t]!==void 0)return!c(process.env[t])}return process.env.Defer!==void 0?!c(process.env.Defer):!0};if(process.env.Trace){const e=Object.keys(process.env).filter(n=>n==="Defer"||n.startsWith("Defer")).filter(n=>c(process.env[n])).join(",");e&&process.stdout.write(`[DEV:DUAL-TRACK] rust-deferral bypass-knobs=${e}
`)}function p(e){if(e==null)return!1;const n=e instanceof Error?e.message:typeof e=="string"?e:typeof e.message=="string"?e.message:"";return n?n.includes("Unknown method:")||n.includes("Unknown IPC command")||n.includes("no handler for method")||n.includes("not routed to any domain"):!1}async function T(e,n,o,t){if(!l(n)){r(n,"node-bypass");try{return await t(o)}catch(s){throw r(n,"error"),s}}if(!d.has(n)){r(n,"node-fallback");try{return await t(o)}catch(s){throw r(n,"error"),s}}try{const s=await e.MountainClient?.sendRequest(n,o);return r(n,"mountain"),s}catch(s){if(p(s)){r(n,"node-fallback");try{return await t(o)}catch(i){throw r(n,"error"),i}}throw r(n,"error"),s}}async function v(e,n,o,t,s){if(!l(n)){r(n,"node-bypass");try{return await t(o)}catch(a){throw r(n,"error"),a}}if(!d.has(n)){r(n,"node-fallback");try{return await t(o)}catch(a){throw r(n,"error"),a}}let i,f=!1;try{i=await e.MountainClient?.sendRequest(n,o),f=!0,r(n,"mountain")}catch(a){if(!p(a))throw r(n,"error"),a;r(n,"node-fallback")}if(f&&i!==void 0&&s(i))try{const a=await t(o);return s(a)?i:(process.env.Trace&&process.stdout.write(`[DEV:DUAL-TRACK] method=${n} route=node-shadow (mountain returned empty)
`),a)}catch{return i}if(f&&i!==void 0)return i;try{return await t(o)}catch(a){throw r(n,"error"),a}}function D(e){throw r(e,"unavailable"),new m(e)}const b=(e,n,o,t)=>{if(!l(n)){r(n,"node-bypass");try{t?.()}catch{}return Promise.resolve()}return e.SendToMountain.call(e,n,o).then(()=>{r(n,"mountain")},i=>{r(n,"error")})},r=(e,n)=>{process.env.Trace&&process.stdout.write(`[DEV:DUAL-TRACK] method=${e} route=${n}
`)};export{l as IsRustDeferralEnabled,p as IsUnknownMethodError,r as LogDualTrack,D as MarkUnavailable,m as NotImplementedError,b as SendToMountainOrLocal,T as TryMountainThenNode,v as TryMountainWithEmptyFallback};
=======
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Generated/RouteManifest.ts
var MountainMethods = /* @__PURE__ */ new Set(["$disposeStatusBarMessage", "$gitExec", "$resolveCustomEditor", "$scm:createSourceControl", "$scm:openDiff", "$scm:registerInputBox", "$scm:updateGroup", "$scm:updateSourceControl", "$setStatusBarMessage", "$statusBar:dispose", "$statusBar:set", "$terminal:create", "$terminal:dispose", "$terminal:hide", "$terminal:resize", "$terminal:sendText", "$terminal:show", "$tree:register", "$updateWorkspaceFolders", "applyEdit", "Authentication.GetAccounts", "Authentication.GetSession", "Clipboard.Read", "Clipboard.Write", "Command.Execute", "Command.GetAll", "config.get", "config.update", "Configuration.Inspect", "Configuration.Update", "Debug.RegisterConfigurationProvider", "Debug.Start", "Debug.Stop", "Diagnostic.Clear", "Diagnostic.Set", "Document.Save", "Document.SaveAs", "error", "executeCommand", "FileSystem.Copy", "FileSystem.CreateDirectory", "FileSystem.Delete", "FileSystem.ReadDirectory", "FileSystem.ReadFile", "FileSystem.Rename", "FileSystem.Stat", "FileSystem.WriteFile", "FileWatcher.Register", "FileWatcher.Unregister", "FileWatcher.Unwatch", "FileWatcher.Watch", "FileWatcher.WatchStatus", "findFiles", "findTextInFiles", "git.openChange", "git.openFile", "html", "Keybinding.GetResolved", "Languages.GetAll", "message", "NativeHost.OpenExternal", "openDocument", "postMessage", "readFile", "register_call_hierarchy_provider", "register_code_actions_provider", "register_code_lens_provider", "register_color_provider", "register_completion_item_provider", "register_declaration_provider", "register_definition_provider", "register_document_drop_edit_provider", "register_document_formatting_provider", "register_document_highlight_provider", "register_document_link_provider", "register_document_paste_edit_provider", "register_document_range_formatting_provider", "register_document_symbol_provider", "register_evaluatable_expression_provider", "register_folding_range_provider", "register_hover_provider", "register_implementation_provider", "register_inlay_hints_provider", "register_inline_completion_item_provider", "register_inline_edit_provider", "register_inline_values_provider", "register_linked_editing_range_provider", "register_mapped_edits_provider", "register_multi_document_highlight_provider", "register_on_type_formatting_provider", "register_reference_provider", "register_rename_provider", "register_selection_range_provider", "register_semantic_tokens_provider", "register_signature_help_provider", "register_type_definition_provider", "register_type_hierarchy_provider", "register_workspace_symbol_provider", "saveAll", "Search.TextSearch", "secrets.delete", "secrets.get", "secrets.store", "setHtml", "setStatusBarText", "showTextDocument", "stat", "Storage.Get", "Storage.GetItems", "Storage.Set", "Task.Execute", "Task.Fetch", "Task.Terminate", "Terminal.GetProcessId", "Terminal.Hide", "Terminal.Resize", "Terminal.Show", "terminate_task", "tree.dispose", "tree.register", "tree.reveal", "tree.unregister", "UserInterface.ShowInputBox", "UserInterface.ShowMessage", "UserInterface.ShowOpenDialog", "UserInterface.ShowQuickPick", "UserInterface.ShowSaveDialog", "viewId", "vscode.diff", "warning", "webview.postMessage", "webview.registerView", "webview.setHtml", "webview.unregisterView", "window.revealRange", "Window.ShowInputBox", "Window.ShowMessage", "Window.ShowOpenDialog", "Window.ShowQuickPick", "Window.ShowSaveDialog", "Workspace.IsResourceTrusted", "Workspace.RequestResourceTrust", "Workspace.Save", "Workspace.SaveAll", "Workspace.SaveAs"]);
var StockLiftExports = /* @__PURE__ */ new Set();
var BespokeCocoonMethods = /* @__PURE__ */ new Set(["FindTextInFilesNodeFallback"]);
var RouteManifestSummary = {
  mountain: 145,
  stockLift: 0,
  bespoke: 1,
  generatedAt: "2026-06-09T12:19:07Z"
};

// Source/Services/Dual/Track.ts
var NotImplementedError = class extends Error {
  constructor(Method) {
    super(
      `Method '${Method}' is not implemented in Land: no Mountain Rust handler, no stock VS Code lift, no Cocoon bespoke fallback.`
    );
    this.Method = Method;
    this.name = "NotImplementedError";
  }
  Method;
  static {
    __name(this, "NotImplementedError");
  }
  code = "NotImplemented";
  _tag = "NotImplementedError";
};
if (process.env["Trace"]) {
  process.stdout.write(
    `[DEV:DUAL-TRACK] manifest mountain=${RouteManifestSummary.mountain} stockLift=${RouteManifestSummary.stockLift} bespoke=${RouteManifestSummary.bespoke} generated=${RouteManifestSummary.generatedAt}
`
  );
}
var IsBypassValue = /* @__PURE__ */ __name((Raw) => {
  if (!Raw) return false;
  const Normalised = Raw.trim().toLowerCase();
  return Normalised === "false" || Normalised === "0" || Normalised === "no" || Normalised === "off";
}, "IsBypassValue");
var ParseDomain = /* @__PURE__ */ __name((Method) => {
  const Dot = Method.indexOf(".");
  if (Dot <= 0) return "";
  return Method.slice(0, Dot).toUpperCase();
}, "ParseDomain");
var IsRustDeferralEnabled = /* @__PURE__ */ __name((Method) => {
  const MethodKey = `Defer${Method.replace(/[.:]/g, "_")}`;
  if (process.env[MethodKey] !== void 0) {
    return !IsBypassValue(process.env[MethodKey]);
  }
  const Domain = ParseDomain(Method);
  if (Domain) {
    const DomainKey = `Defer${Domain}`;
    if (process.env[DomainKey] !== void 0) {
      return !IsBypassValue(process.env[DomainKey]);
    }
  }
  if (process.env["Defer"] !== void 0) {
    return !IsBypassValue(process.env["Defer"]);
  }
  return true;
}, "IsRustDeferralEnabled");
if (process.env["Trace"]) {
  const ActiveBypasses = Object.keys(process.env).filter((K) => K === "Defer" || K.startsWith("Defer")).filter((K) => IsBypassValue(process.env[K])).join(",");
  if (ActiveBypasses) {
    process.stdout.write(
      `[DEV:DUAL-TRACK] rust-deferral bypass-knobs=${ActiveBypasses}
`
    );
  }
}
function IsUnknownMethodError(Err) {
  if (Err == null) return false;
  const Message = Err instanceof Error ? Err.message : typeof Err === "string" ? Err : typeof Err.message === "string" ? Err.message : "";
  if (!Message) return false;
  return Message.includes("Unknown method:") || Message.includes("Unknown IPC command") || Message.includes("no handler for method") || Message.includes("not routed to any domain");
}
__name(IsUnknownMethodError, "IsUnknownMethodError");
async function TryMountainThenNode(Context, Method, Arguments, NodeFallback) {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  if (!MountainMethods.has(Method)) {
    LogDualTrack(Method, "node-fallback");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  try {
    const MountainResult = await Context.MountainClient?.sendRequest(
      Method,
      Arguments
    );
    LogDualTrack(Method, "mountain");
    return MountainResult;
  } catch (Err) {
    if (IsUnknownMethodError(Err)) {
      LogDualTrack(Method, "node-fallback");
      try {
        return await NodeFallback(Arguments);
      } catch (NodeErr) {
        LogDualTrack(Method, "error");
        throw NodeErr;
      }
    }
    LogDualTrack(Method, "error");
    throw Err;
  }
}
__name(TryMountainThenNode, "TryMountainThenNode");
async function TryMountainWithEmptyFallback(Context, Method, Arguments, NodeFallback, IsEmpty) {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  if (!MountainMethods.has(Method)) {
    LogDualTrack(Method, "node-fallback");
    try {
      return await NodeFallback(Arguments);
    } catch (NodeErr) {
      LogDualTrack(Method, "error");
      throw NodeErr;
    }
  }
  let MountainResult;
  let MountainSucceeded = false;
  try {
    MountainResult = await Context.MountainClient?.sendRequest(
      Method,
      Arguments
    );
    MountainSucceeded = true;
    LogDualTrack(Method, "mountain");
  } catch (Err) {
    if (!IsUnknownMethodError(Err)) {
      LogDualTrack(Method, "error");
      throw Err;
    }
    LogDualTrack(Method, "node-fallback");
  }
  if (MountainSucceeded && MountainResult !== void 0 && IsEmpty(MountainResult)) {
    try {
      const NodeResult = await NodeFallback(Arguments);
      const NodeIsEmpty = IsEmpty(NodeResult);
      if (!NodeIsEmpty) {
        if (process.env["Trace"]) {
          process.stdout.write(
            `[DEV:DUAL-TRACK] method=${Method} route=node-shadow (mountain returned empty)
`
          );
        }
        return NodeResult;
      }
      return MountainResult;
    } catch {
      return MountainResult;
    }
  }
  if (MountainSucceeded && MountainResult !== void 0) {
    return MountainResult;
  }
  try {
    return await NodeFallback(Arguments);
  } catch (NodeErr) {
    LogDualTrack(Method, "error");
    throw NodeErr;
  }
}
__name(TryMountainWithEmptyFallback, "TryMountainWithEmptyFallback");
function MarkUnavailable(Method) {
  LogDualTrack(Method, "unavailable");
  throw new NotImplementedError(Method);
}
__name(MarkUnavailable, "MarkUnavailable");
var SendToMountainOrLocal = /* @__PURE__ */ __name((Context, Method, Payload, OnLocalFallback) => {
  if (!IsRustDeferralEnabled(Method)) {
    LogDualTrack(Method, "node-bypass");
    try {
      OnLocalFallback?.();
    } catch {
    }
    return Promise.resolve();
  }
  const Send = Context.SendToMountain;
  return Send.call(Context, Method, Payload).then(
    () => {
      LogDualTrack(Method, "mountain");
    },
    (_Err) => {
      LogDualTrack(Method, "error");
    }
  );
}, "SendToMountainOrLocal");
var LogDualTrack = /* @__PURE__ */ __name((Method, Route) => {
  if (!process.env["Trace"]) return;
  process.stdout.write(`[DEV:DUAL-TRACK] method=${Method} route=${Route}
`);
}, "LogDualTrack");
export {
  IsRustDeferralEnabled,
  IsUnknownMethodError,
  LogDualTrack,
  MarkUnavailable,
  NotImplementedError,
  SendToMountainOrLocal,
  TryMountainThenNode,
  TryMountainWithEmptyFallback
};
//# sourceMappingURL=Track.js.map
>>>>>>> 65e8cd3175a891dd97554e6f4bac8114321648ec
