var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Dialog/Filter.ts
var SerializeFilters = /* @__PURE__ */ __name((Filters) => {
  if (!Filters) {
    return void 0;
  }
  return Object.entries(Filters).map(([Name, Extensions]) => ({
    name: Name,
    extensions: Extensions
  }));
}, "SerializeFilters");

// Source/TypeConverter/Dialog/OpenDialogOption.ts
var ToDTO = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");

// Source/TypeConverter/Dialog/SaveDialogOption.ts
var ToDTO2 = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");

// Source/Services/Window/FileDialogs.ts
import { Effect } from "effect";
var ShowOpenDialog = /* @__PURE__ */ __name((MountainClient, Logger, Options) => Effect.gen(function* () {
  yield* Logger.Debug(`[WindowService] Showing open dialog`);
  const OptionsDTO = ToDTO(Options);
  const Result = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowOpenDialog",
        [OptionsDTO]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      const FilePaths = Response;
      const { Uri } = await import("vscode");
      return FilePaths.map((Path) => Uri.file(Path));
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show open dialog: ${Error_.message}`
      );
    }, "catch")
  });
  return Result;
}), "ShowOpenDialog");
var ShowSaveDialog = /* @__PURE__ */ __name((MountainClient, Logger, Options) => Effect.gen(function* () {
  yield* Logger.Debug(`[WindowService] Showing save dialog`);
  const OptionsDTO = ToDTO2(Options);
  const ResultURI = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowSaveDialog",
        [OptionsDTO]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      const FilePath = Response;
      const { Uri } = await import("vscode");
      return Uri.file(FilePath);
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show save dialog: ${Error_.message}`
      );
    }, "catch")
  });
  return ResultURI ? await(async () => {
    const { Uri } = await import("vscode");
    return Uri.parse(ResultURI.toString());
  })() : void 0;
}), "ShowSaveDialog");
export {
  ShowOpenDialog,
  ShowSaveDialog
};
//# sourceMappingURL=FileDialogs.js.map
