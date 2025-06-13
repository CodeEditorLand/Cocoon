var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, pipe } from "effect";
import {
  ShowErrorMessage,
  ShowInformationMessage
} from "../../Service/Window.js";
import { ActiveEditorNotFoundError } from "./ProcessUserData/Error.js";
import { GetActiveTextEditor } from "./ProcessUserData/GetActiveTextEditor.js";
import { GetDocumentText } from "./ProcessUserData/GetDocumentText.js";
import { InvokeProcessingService } from "./ProcessUserData/InvokeProcessingService.js";
const ProcessUserData = pipe(
  Effect.gen(function* (_) {
    const MaybeEditor = yield* _(GetActiveTextEditor);
    const Editor = yield* _(
      MaybeEditor,
      Effect.mapError(() => new ActiveEditorNotFoundError())
    );
    const TextContent = yield* _(GetDocumentText(Editor.document));
    const ProcessingResult = yield* _(InvokeProcessingService(TextContent));
    yield* _(
      ShowInformationMessage(
        `Processing complete: ${ProcessingResult.ID}`
      )
    );
  }),
  // Declaratively handle all known, tagged failure cases for this workflow.
  Effect.catchTags({
    ActiveEditorNotFoundError: /* @__PURE__ */ __name((Error2) => ShowErrorMessage(Error2.message), "ActiveEditorNotFoundError"),
    ProcessingServiceError: /* @__PURE__ */ __name((Error2) => ShowErrorMessage(Error2.message), "ProcessingServiceError")
  }),
  // Catch any other unexpected error that might have occurred, safely handling
  // the error type.
  Effect.catchAll(
    (Error2) => ShowErrorMessage(
      `An unexpected error occurred: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
    )
  )
);
export {
  ProcessUserData
};
//# sourceMappingURL=ProcessUserData.js.map
