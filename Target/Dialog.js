var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { isCancellationError } from "@codeeditorland/output/vs/base/common/errors.js";
import { Effect } from "effect";
import { DialogProblem } from "./Dialog/DialogProblem.js";
import { IPCService } from "./IPC.js";
import {
  ToURI as DTOToURI,
  ToURIArray as DTOToURIArray
} from "./TypeConverter/Dialog/DialogResult.js";
import { ToDTO as OpenDialogOptionToDTO } from "./TypeConverter/Dialog/OpenDialogOption.js";
import { ToDTO as SaveDialogOptionToDTO } from "./TypeConverter/Dialog/SaveDialogOption.js";
const CreateDialogEffect = /* @__PURE__ */ __name((IPC, IPCMethod, Options, Token, OptionsToDTO, ResultFromDTO) => {
  return Effect.gen(function* () {
    if (Token?.isCancellationRequested) {
      return yield* Effect.interrupt;
    }
    const DTO = OptionsToDTO(Options);
    const RPCResult = yield* IPC.SendRequest(IPCMethod, [DTO]).pipe(
      Effect.catchIf(
        isCancellationError,
        () => Effect.succeed(void 0)
      ),
      Effect.mapError(
        (cause) => new DialogProblem({
          Cause: cause,
          Context: `IPC call to ${IPCMethod} failed`
        })
      )
    );
    return ResultFromDTO(RPCResult);
  });
}, "CreateDialogEffect");
class DialogService extends Effect.Service()(
  "Service/Dialog",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      return {
        ShowOpenDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
          IPC,
          "$showOpenDialog",
          Options,
          Token,
          OpenDialogOptionToDTO,
          DTOToURIArray
        ), "ShowOpenDialog"),
        ShowSaveDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
          IPC,
          "$showSaveDialog",
          Options,
          Token,
          SaveDialogOptionToDTO,
          DTOToURI
        ), "ShowSaveDialog")
      };
    })
  }
) {
  static {
    __name(this, "DialogService");
  }
}
export {
  DialogService
};
//# sourceMappingURL=Dialog.js.map
