var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import { Dialog as DialogConverter } from "../../TypeConverter.js";
import IPCService from "../IPC/Service.js";
import { DialogError } from "./Error.js";
const CreateDialogEffect = /* @__PURE__ */ __name((IPC, IPCMethod, Options, Token, OptionsToDTO, ResultFromDTO) => {
  return Effect.gen(function* () {
    if (Token?.isCancellationRequested) {
      return yield* Effect.interrupt;
    }
    const DTO = OptionsToDTO(Options);
    const RPCResult = yield* IPC.SendRequest(IPCMethod, [DTO]).pipe(
      // User cancellation is not an error; it resolves to an empty value.
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      ),
      // Any other error is mapped to our specific DialogError.
      Effect.mapError(
        (Cause) => new DialogError({
          cause: Cause,
          context: `IPC call to ${IPCMethod} failed`
        })
      )
    );
    return ResultFromDTO(RPCResult);
  });
}, "CreateDialogEffect");
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const DialogImplementation = {
    ShowOpenDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
      IPC,
      "$showOpenDialog",
      Options,
      Token,
      (Options2) => DialogConverter.OpenDialogOption.ToDTO(Options2),
      (Result) => DialogConverter.DialogResult.ToURIArray(Result)
    ), "ShowOpenDialog"),
    ShowSaveDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
      IPC,
      "$showSaveDialog",
      Options,
      Token,
      DialogConverter.SaveDialogOption.ToDTO,
      (Result) => DialogConverter.DialogResult.ToURI(Result)
    ), "ShowSaveDialog")
  };
  return DialogImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
