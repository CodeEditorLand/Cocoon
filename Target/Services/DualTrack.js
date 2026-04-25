var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Generated/RouteManifest.ts
var MountainMethods = /* @__PURE__ */ new Set(["$disposeStatusBarMessage", "$gitExec", "$languageFeatures:registerProvider", "$resolveCustomEditor", "$scm:createSourceControl", "$scm:registerInputBox", "$scm:updateGroup", "$scm:updateSourceControl", "$setStatusBarMessage", "$statusBar:dispose", "$statusBar:set", "$terminal:create", "$terminal:dispose", "$terminal:resize", "$terminal:sendText", "$tree:register", "$updateWorkspaceFolders", "applyEdit", "Authentication.GetAccounts", "Authentication.GetSession", "Clipboard.Read", "Clipboard.Write", "Command.Execute", "Command.GetAll", "config.get", "config.update", "Configuration.Inspect", "Configuration.Update", "Debug.RegisterConfigurationProvider", "Debug.Start", "Debug.Stop", "Diagnostic.Clear", "Diagnostic.Set", "Document.Save", "Document.SaveAs", "error", "executeCommand", "FileSystem.Copy", "FileSystem.CreateDirectory", "FileSystem.Delete", "FileSystem.ReadDirectory", "FileSystem.ReadFile", "FileSystem.Rename", "FileSystem.Stat", "FileSystem.WriteFile", "FileWatcher.Register", "FileWatcher.Unregister", "findFiles", "findTextInFiles", "Keybinding.GetResolved", "Languages.GetAll", "NativeHost.OpenExternal", "openDocument", "readFile", "Search.TextSearch", "secrets.delete", "secrets.get", "secrets.store", "showTextDocument", "stat", "Storage.Get", "Storage.Set", "Task.Execute", "Task.Fetch", "Terminal.GetProcessId", "Terminal.Resize", "tree.dispose", "tree.register", "tree.unregister", "UserInterface.ShowInputBox", "UserInterface.ShowMessage", "UserInterface.ShowOpenDialog", "UserInterface.ShowQuickPick", "UserInterface.ShowSaveDialog", "warning", "Window.ShowInputBox", "Window.ShowMessage", "Window.ShowOpenDialog", "Window.ShowQuickPick", "Window.ShowSaveDialog"]);
var StockLiftExports = /* @__PURE__ */ new Set(["Basename", "Dirname", "Extname", "GlobIsEmpty", "GlobMatch", "GlobParsePattern", "IsEqualOrParent", "JoinPath", "RelativePath", "StockBasename", "StockDirname", "StockExtname", "StockGlobIsEmpty", "StockGlobMatch", "StockGlobParse", "StockIsEqualOrParent", "StockJoinPath", "StockRelativePath", "ToUri", "Uri", "URI"]);
var BespokeCocoonMethods = /* @__PURE__ */ new Set(["FindTextInFilesNodeFallback"]);
var RouteManifestSummary = {
  mountain: 80,
  stockLift: 21,
  bespoke: 1,
  generatedAt: "2026-04-25T01:20:57Z"
};

// Source/Services/DualTrack.ts
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
if (process.env["LAND_DEV_LOG"]) {
  process.stdout.write(
    `[DEV:DUAL-TRACK] manifest mountain=${RouteManifestSummary.mountain} stockLift=${RouteManifestSummary.stockLift} bespoke=${RouteManifestSummary.bespoke} generated=${RouteManifestSummary.generatedAt}
`
  );
}
function IsUnknownMethodError(Err) {
  if (Err == null) return false;
  const Message = Err instanceof Error ? Err.message : typeof Err === "string" ? Err : typeof Err.message === "string" ? Err.message : "";
  if (!Message) return false;
  return Message.includes("Unknown method:") || Message.includes("Unknown IPC command") || Message.includes("no handler for method") || Message.includes("not routed to any domain");
}
__name(IsUnknownMethodError, "IsUnknownMethodError");
async function TryMountainThenNode(Context, Method, Arguments, NodeFallback) {
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
        if (process.env["LAND_DEV_LOG"]) {
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
var LogDualTrack = /* @__PURE__ */ __name((Method, Route) => {
  if (!process.env["LAND_DEV_LOG"]) return;
  process.stdout.write(
    `[DEV:DUAL-TRACK] method=${Method} route=${Route}
`
  );
}, "LogDualTrack");
export {
  IsUnknownMethodError,
  LogDualTrack,
  MarkUnavailable,
  NotImplementedError,
  TryMountainThenNode,
  TryMountainWithEmptyFallback
};
//# sourceMappingURL=DualTrack.js.map
