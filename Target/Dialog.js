var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { isCancellationError } from "vs/base/common/errors.js";
import { ToDTO as OpenDialogOptionToDTO } from "./TypeConverter/Dialog/OpenDialogOption.js";
import { ToDTO as SaveDialogOptionToDTO } from "./TypeConverter/Dialog/SaveDialogOption.js";
import {
  ToURI as DTOToURI,
  ToURIArray as DTOToURIArray
} from "./TypeConverter/Dialog/DialogResult.js";
import { IPCService } from "./IPC.js";
import { DialogProblem } from "./Dialog/DialogProblem.js";
const CreateDialogEffect = /* @__PURE__ */ __name((IPC2, IPCMethod, Options, Token, OptionsToDTO, ResultFromDTO) => {
  return Effect.gen(function* () {
    if (Token?.isCancellationRequested) {
      return yield* Effect.interrupt;
    }
    const DTO = OptionsToDTO(Options);
    const RPCResult = yield* IPC2.SendRequest(IPCMethod, [DTO]).pipe(
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
      const IPC2 = yield* IPCService;
      return {
        ShowOpenDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
          IPC2,
          "$showOpenDialog",
          Options,
          Token,
          OpenDialogOptionToDTO,
          DTOToURIArray
        ), "ShowOpenDialog"),
        ShowSaveDialog: /* @__PURE__ */ __name((Options, Token) => CreateDialogEffect(
          IPC2,
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
