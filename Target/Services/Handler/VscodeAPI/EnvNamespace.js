var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/EnvNamespace.ts
var CreateEnvNamespace = /* @__PURE__ */ __name((Context) => {
  const Env = Context.ExtensionHostInitData?.environment ?? {};
  const Call = /* @__PURE__ */ __name(async (Method, Parameters) => {
    try {
      return await Context.MountainClient?.sendRequest(Method, Parameters);
    } catch {
      return void 0;
    }
  }, "Call");
  return {
    appName: Env["appName"] ?? "CodeEditorLand",
    appRoot: Env["appRoot"] ?? "",
    appHost: Env["appHost"] ?? "desktop",
    uiKind: 1,
    // vscode.UIKind.Desktop
    language: Env["language"] ?? "en",
    machineId: Context.ExtensionHostInitData?.telemetry?.machineId ?? Env["machineId"] ?? "land",
    sessionId: Env["sessionId"] ?? `land-session-${Date.now().toString(36)}`,
    isNewAppInstall: false,
    isTelemetryEnabled: false,
    onDidChangeTelemetryEnabled: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeTelemetryEnabled"),
    uriScheme: Env["uriScheme"] ?? "vscode",
    shell: Env["shell"] ?? process.env["SHELL"] ?? "",
    remoteName: void 0,
    clipboard: {
      // Clipboard.Read / Clipboard.Write not yet routed — catch returns
      // empty string / undefined until the Rust dispatcher adds them.
      readText: /* @__PURE__ */ __name(async () => await Call("Clipboard.Read", []) ?? "", "readText"),
      writeText: /* @__PURE__ */ __name(async (Value) => {
        await Call("Clipboard.Write", [Value]);
      }, "writeText")
    },
    openExternal: /* @__PURE__ */ __name(async (Target) => {
      const Ok = await Call("NativeHost.OpenExternal", [
        typeof Target === "string" ? Target : String(Target)
      ]);
      return Ok ?? false;
    }, "openExternal"),
    asExternalUri: /* @__PURE__ */ __name(async (Target) => Target, "asExternalUri"),
    createTelemetryLogger: /* @__PURE__ */ __name((_Sender, _Options) => ({
      isUsageEnabled: false,
      isErrorsEnabled: false,
      onDidChangeEnableStates: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
      }, "dispose") }), "onDidChangeEnableStates"),
      logUsage: /* @__PURE__ */ __name((_EventName, _Data) => {
      }, "logUsage"),
      logError: /* @__PURE__ */ __name((_EventNameOrError, _Data) => {
      }, "logError"),
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "createTelemetryLogger"),
    logLevel: 2,
    onDidChangeLogLevel: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") }), "onDidChangeLogLevel")
  };
}, "CreateEnvNamespace");
var EnvNamespace_default = CreateEnvNamespace;
export {
  EnvNamespace_default as default
};
//# sourceMappingURL=EnvNamespace.js.map
