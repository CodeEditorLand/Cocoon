var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/IPC/Type/Converter.ts
import { Effect } from "effect";
var { URI } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");
var MIN_ZOOM_LEVEL = -20;
var MAX_ZOOM_LEVEL = 20;
var MAX_DOCUMENT_LINES = 1e6;
var MAX_LINE_LENGTH = 1e5;
var MAX_LANGUAGE_ID_LENGTH = 128;
var MAX_TERMINAL_NAME_LENGTH = 128;
var MAX_SHELL_PATH_LENGTH = 1024;
var MAX_SHELL_ARGUMENTS = 100;
var MAX_ARGUMENT_LENGTH = 4096;
var MAX_WEBVIEW_TITLE_LENGTH = 256;
var MAX_VIEW_TYPE_LENGTH = 128;
var MAX_HANDLE_LENGTH = 128;
var MAX_SIDECAR_IDENTIFIER_LENGTH = 128;
var MAX_EXTENSION_IDENTIFIER_LENGTH = 128;
var ValidateWindowStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.IsFocused !== "boolean") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.IsFocused must be a boolean")
    );
  }
  if (typeof dto.IsFullScreen !== "boolean") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.IsFullScreen must be a boolean")
    );
  }
  if (typeof dto.ZoomLevel !== "number") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.ZoomLevel must be a number")
    );
  }
  if (dto.ZoomLevel < MIN_ZOOM_LEVEL || dto.ZoomLevel > MAX_ZOOM_LEVEL) {
    return yield* Effect.fail(
      new Error(
        `WindowStateDTO.ZoomLevel must be between ${MIN_ZOOM_LEVEL} and ${MAX_ZOOM_LEVEL}, got ${dto.ZoomLevel}`
      )
    );
  }
  return dto;
}), "ValidateWindowStateDTO");
var ValidateDocumentStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.URI !== "string" || dto.URI.trim().length === 0) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.URI cannot be empty")
    );
  }
  try {
    new URL(dto.URI);
  } catch {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.URI has invalid format: ${dto.URI}`
      )
    );
  }
  if (typeof dto.LanguageIdentifier !== "string") {
    return yield* Effect.fail(
      new Error(
        "DocumentStateDTO.LanguageIdentifier must be a string"
      )
    );
  }
  if (dto.LanguageIdentifier.length > MAX_LANGUAGE_ID_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.LanguageIdentifier exceeds maximum length of ${MAX_LANGUAGE_ID_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.Version !== "number" || dto.Version < 1) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Version must be a positive number")
    );
  }
  if (!Array.isArray(dto.Lines)) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Lines must be an array")
    );
  }
  if (dto.Lines.length > MAX_DOCUMENT_LINES) {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.Lines exceeds maximum line count of ${MAX_DOCUMENT_LINES}`
      )
    );
  }
  for (let i = 0; i < dto.Lines.length; i++) {
    const line = dto.Lines[i];
    if (typeof line !== "string") {
      return yield* Effect.fail(
        new Error(`DocumentStateDTO.Lines[${i}] must be a string`)
      );
    }
    if (line.length > MAX_LINE_LENGTH) {
      return yield* Effect.fail(
        new Error(
          `DocumentStateDTO.Lines[${i}] exceeds maximum length of ${MAX_LINE_LENGTH} bytes`
        )
      );
    }
  }
  if (dto.EOL !== "\n" && dto.EOL !== "\r\n") {
    return yield* Effect.fail(
      new Error(
        "DocumentStateDTO.EOL must be either '\\n' or '\\r\\n'"
      )
    );
  }
  if (typeof dto.IsDirty !== "boolean") {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.IsDirty must be a boolean")
    );
  }
  if (typeof dto.Encoding !== "string" || dto.Encoding.length === 0) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Encoding cannot be empty")
    );
  }
  return dto;
}), "ValidateDocumentStateDTO");
var ValidateWebviewStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.Handle !== "string" || dto.Handle.trim().length === 0) {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.Handle cannot be empty")
    );
  }
  if (dto.Handle.length > MAX_HANDLE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.Handle exceeds maximum length of ${MAX_HANDLE_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ViewType !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.ViewType must be a string")
    );
  }
  if (dto.ViewType.length > MAX_VIEW_TYPE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.ViewType exceeds maximum length of ${MAX_VIEW_TYPE_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.Title !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.Title must be a string")
    );
  }
  if (dto.Title.length > MAX_WEBVIEW_TITLE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.Title exceeds maximum length of ${MAX_WEBVIEW_TITLE_LENGTH} bytes`
      )
    );
  }
  if (!dto.ContentOptions || typeof dto.ContentOptions !== "object") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.ContentOptions must be an object")
    );
  }
  if (typeof dto.ContentOptions.EnableScripts !== "boolean") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ContentOptions.EnableScripts must be a boolean"
      )
    );
  }
  if (!Array.isArray(dto.ContentOptions.LocalResourceRoots)) {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ContentOptions.LocalResourceRoots must be an array"
      )
    );
  }
  if (dto.PanelOptions !== null && typeof dto.PanelOptions !== "object") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.PanelOptions must be an object or null"
      )
    );
  }
  if (typeof dto.SideCarIdentifier !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.SideCarIdentifier must be a string")
    );
  }
  if (dto.SideCarIdentifier.length > MAX_SIDECAR_IDENTIFIER_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.SideCarIdentifier exceeds maximum length of ${MAX_SIDECAR_IDENTIFIER_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ExtensionIdentifier !== "string") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ExtensionIdentifier must be a string"
      )
    );
  }
  if (dto.ExtensionIdentifier.length > MAX_EXTENSION_IDENTIFIER_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.ExtensionIdentifier exceeds maximum length of ${MAX_EXTENSION_IDENTIFIER_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.IsActive !== "boolean") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.IsActive must be a boolean")
    );
  }
  if (typeof dto.IsVisible !== "boolean") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.IsVisible must be a boolean")
    );
  }
  return dto;
}), "ValidateWebviewStateDTO");
var ValidateTerminalStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.Identifier !== "number" || dto.Identifier <= 0) {
    return yield* Effect.fail(
      new Error(
        "TerminalStateDTO.Identifier must be a positive number"
      )
    );
  }
  if (typeof dto.Name !== "string") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.Name must be a string")
    );
  }
  if (dto.Name.length > MAX_TERMINAL_NAME_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.Name exceeds maximum length of ${MAX_TERMINAL_NAME_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ShellPath !== "string") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.ShellPath must be a string")
    );
  }
  if (dto.ShellPath.length > MAX_SHELL_PATH_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.ShellPath exceeds maximum length of ${MAX_SHELL_PATH_LENGTH} bytes`
      )
    );
  }
  if (!Array.isArray(dto.ShellArguments)) {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.ShellArguments must be an array")
    );
  }
  if (dto.ShellArguments.length > MAX_SHELL_ARGUMENTS) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.ShellArguments exceeds maximum count of ${MAX_SHELL_ARGUMENTS}`
      )
    );
  }
  for (let i = 0; i < dto.ShellArguments.length; i++) {
    const arg = dto.ShellArguments[i];
    if (typeof arg !== "string") {
      return yield* Effect.fail(
        new Error(
          `TerminalStateDTO.ShellArguments[${i}] must be a string`
        )
      );
    }
    if (arg.length > MAX_ARGUMENT_LENGTH) {
      return yield* Effect.fail(
        new Error(
          `TerminalStateDTO.ShellArguments[${i}] exceeds maximum length of ${MAX_ARGUMENT_LENGTH} bytes`
        )
      );
    }
  }
  if (typeof dto.IsPTY !== "boolean") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.IsPTY must be a boolean")
    );
  }
  return dto;
}), "ValidateTerminalStateDTO");
var WindowStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    IsFocused: state.isFocused,
    IsFullScreen: state.isFullScreen,
    ZoomLevel: state.zoomLevel
  };
  return yield* ValidateWindowStateDTO(dto);
}), "WindowStateConvertToDTO");
var DocumentStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    URI: state.uri.toString(),
    LanguageIdentifier: state.languageIdentifier,
    Version: state.version,
    Lines: state.lines,
    EOL: state.eol,
    IsDirty: state.isDirty,
    Encoding: state.encoding,
    VersionIdentifier: state.versionIdentifier
  };
  return yield* ValidateDocumentStateDTO(dto);
}), "DocumentStateConvertToDTO");
var WebviewStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    Handle: state.handle,
    ViewType: state.viewType,
    Title: state.title,
    ContentOptions: {
      EnableScripts: state.contentOptions.enableScripts,
      LocalResourceRoots: state.contentOptions.localResourceRoots
    },
    PanelOptions: state.panelOptions,
    SideCarIdentifier: state.sideCarIdentifier,
    ExtensionIdentifier: state.extensionIdentifier,
    IsActive: state.isActive,
    IsVisible: state.isVisible
  };
  return yield* ValidateWebviewStateDTO(dto);
}), "WebviewStateConvertToDTO");
var TerminalStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    Identifier: state.identifier,
    Name: state.name,
    OSProcessIdentifier: state.osProcessIdentifier,
    ShellPath: state.shellPath,
    ShellArguments: state.shellArguments,
    CurrentWorkingDirectory: state.currentWorkingDirectory,
    EnvironmentVariables: state.environmentVariables,
    IsPTY: state.isPTY
  };
  return yield* ValidateTerminalStateDTO(dto);
}), "TerminalStateConvertToDTO");
var WindowStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateWindowStateDTO(dto);
  return {
    isFocused: validated.IsFocused,
    isFullScreen: validated.IsFullScreen,
    zoomLevel: validated.ZoomLevel
  };
}), "WindowStateConvertFromDTO");
var DocumentStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateDocumentStateDTO(dto);
  const uri = URI.parse(validated.URI);
  const eol = validated.EOL === "\r\n" ? "\r\n" : "\n";
  return {
    uri,
    languageIdentifier: validated.LanguageIdentifier,
    version: validated.Version,
    lines: validated.Lines,
    eol,
    isDirty: validated.IsDirty,
    encoding: validated.Encoding,
    versionIdentifier: validated.VersionIdentifier
  };
}), "DocumentStateConvertFromDTO");
var WebviewStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateWebviewStateDTO(dto);
  return {
    handle: validated.Handle,
    viewType: validated.ViewType,
    title: validated.Title,
    contentOptions: {
      enableScripts: validated.ContentOptions.EnableScripts,
      localResourceRoots: validated.ContentOptions.LocalResourceRoots
    },
    panelOptions: validated.PanelOptions,
    sideCarIdentifier: validated.SideCarIdentifier,
    extensionIdentifier: validated.ExtensionIdentifier,
    isActive: validated.IsActive,
    isVisible: validated.IsVisible
  };
}), "WebviewStateConvertFromDTO");
var TerminalStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateTerminalStateDTO(dto);
  return {
    identifier: validated.Identifier,
    name: validated.Name,
    osProcessIdentifier: validated.OSProcessIdentifier,
    shellPath: validated.ShellPath,
    shellArguments: validated.ShellArguments,
    currentWorkingDirectory: validated.CurrentWorkingDirectory,
    environmentVariables: validated.EnvironmentVariables,
    isPTY: validated.IsPTY
  };
}), "TerminalStateConvertFromDTO");
var ValidateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const typename = dto.__typename || dto.URI ? "DocumentStateDTO" : dto.Handle ? "WebviewStateDTO" : dto.IsFocused !== void 0 ? "WindowStateDTO" : dto.Identifier !== void 0 ? "TerminalStateDTO" : "Unknown";
  switch (typename) {
    case "WindowStateDTO":
      return yield* ValidateWindowStateDTO(
        dto
      );
    case "DocumentStateDTO":
      return yield* ValidateDocumentStateDTO(
        dto
      );
    case "WebviewStateDTO":
      return yield* ValidateWebviewStateDTO(
        dto
      );
    case "TerminalStateDTO":
      return yield* ValidateTerminalStateDTO(
        dto
      );
    default:
      return yield* Effect.fail(
        new Error(
          `Unknown DTO type: ${typename}. Cannot validate.`
        )
      );
  }
}), "ValidateDTO");
export {
  DocumentStateConvertFromDTO,
  DocumentStateConvertToDTO,
  TerminalStateConvertFromDTO,
  TerminalStateConvertToDTO,
  ValidateDTO,
  WebviewStateConvertFromDTO,
  WebviewStateConvertToDTO,
  WindowStateConvertFromDTO,
  WindowStateConvertToDTO
};
//# sourceMappingURL=Converter.js.map
