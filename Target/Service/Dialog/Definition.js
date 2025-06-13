var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import * as DialogConverter from "../../TypeConverter/Dialog.js";
import { IPC } from "../IPC.js";
import { DialogError } from "./Error.js";
function CreateDialogEffect(ipcMethod, options, token, optionsToDTO, resultFromDTO) {
  return Effect.gen(function* (_) {
    if (token?.isCancellationRequested) {
      return yield* _(Effect.interrupt);
    }
    const IPCService = yield* _(IPC.Tag);
    const DTO = optionsToDTO(options);
    const RPCResult = yield* _(
      IPCService.SendRequest(ipcMethod, [DTO]),
      // User cancellation is not an error; it resolves to an empty value.
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      ),
      // Any other error is mapped to our specific DialogError.
      Effect.mapError(
        (cause) => new DialogError({
          cause,
          context: `IPC call to ${ipcMethod} failed`
        })
      )
    );
    return resultFromDTO(RPCResult);
  });
}
__name(CreateDialogEffect, "CreateDialogEffect");
const Definition = Effect.succeed({
  ShowOpenDialog: /* @__PURE__ */ __name((Option, Token) => CreateDialogEffect(
    "$showOpenDialog",
    Option,
    Token,
    DialogConverter.OpenDialogOption.ToDTO,
    DialogConverter.DialogResult.ToURIArray
  ), "ShowOpenDialog"),
  ShowSaveDialog: /* @__PURE__ */ __name((Option, Token) => CreateDialogEffect(
    "$showSaveDialog",
    Option,
    Token,
    DialogConverter.SaveDialogOption.ToDTO,
    DialogConverter.DialogResult.ToURI
  ), "ShowSaveDialog")
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
