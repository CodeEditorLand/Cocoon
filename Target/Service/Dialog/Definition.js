var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import * as DialogConverter from "../../TypeConverter/Dialog.js";
import { IpcProvider } from "../Ipc/mod.js";
const createDialogEffect = /* @__PURE__ */ __name((ipcMethod, options, token, optionsToDto, resultFromDto) => Effect.gen(function* (_) {
  if (token?.isCancellationRequested) {
    return yield* _(Effect.interrupt);
  }
  const Ipc = yield* _(IpcProvider.Tag);
  const Dto = optionsToDto(options);
  const RpcResult = yield* _(
    Ipc.SendRequest(ipcMethod, Dto),
    // Gracefully handle user cancellation as a success with an empty value.
    Effect.catchIf(
      isCancellationError,
      () => Effect.succeed(void 0)
    )
  );
  return resultFromDto(RpcResult);
}), "createDialogEffect");
const Definition = Effect.succeed({
  ShowOpenDialog: /* @__PURE__ */ __name((Options, Token) => createDialogEffect(
    "ui_showOpenDialog",
    Options,
    Token,
    DialogConverter.OpenDialogOptions.ToDto,
    DialogConverter.DialogResult.ToUriArray
  ), "ShowOpenDialog"),
  ShowSaveDialog: /* @__PURE__ */ __name((Options, Token) => createDialogEffect(
    "ui_showSaveDialog",
    Options,
    Token,
    DialogConverter.SaveDialogOptions.ToDto,
    DialogConverter.DialogResult.ToUri
  ), "ShowSaveDialog")
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
