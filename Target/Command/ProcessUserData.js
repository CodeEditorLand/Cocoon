var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import ShowInformationMessage from "../Service/Window/ShowInformationMessage.js";
import { ActiveEditorNotFoundError } from "./ProcessUserData/Error.js";
import GetActiveTextEditor from "./ProcessUserData/GetActiveTextEditor.js";
import GetDocumentText from "./ProcessUserData/GetDocumentText.js";
import InvokeProcessingService from "./ProcessUserData/InvokeProcessingService.js";
var ProcessUserData_default = Effect.gen(function* () {
  const MaybeEditor = yield* GetActiveTextEditor;
  const Editor = yield* Effect.mapError(
    MaybeEditor,
    () => new ActiveEditorNotFoundError()
  );
  const TextContent = yield* GetDocumentText(Editor.document);
  const ProcessingResult = yield* InvokeProcessingService(TextContent);
  yield* ShowInformationMessage(
    `Processing complete: ${ProcessingResult.ID}`
  );
}).pipe(
  // Declaratively handle all known, tagged failure cases for this workflow.
  Effect.catchTags({
    ActiveEditorNotFoundError: /* @__PURE__ */ __name((Error2) => ShowInformationMessage(Error2.message), "ActiveEditorNotFoundError"),
    ProcessingServiceError: /* @__PURE__ */ __name((Error2) => ShowInformationMessage(Error2.message), "ProcessingServiceError")
  }),
  // Catch any other unexpected error that might have occurred, safely handling
  // the error type.
  Effect.catchAll(
    (Error2) => ShowInformationMessage(
      `An unexpected error occurred: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
    )
  )
);
export {
  ProcessUserData_default as default
};
//# sourceMappingURL=ProcessUserData.js.map
