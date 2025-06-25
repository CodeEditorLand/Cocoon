var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Data } from "effect";
import { WindowService } from "./Window.js";
import { IPC, IPCService } from "./IPC.js";
class ActiveEditorNotFoundProblem extends Data.TaggedError(
  "ActiveEditorNotFoundProblem"
) {
  static {
    __name(this, "ActiveEditorNotFoundProblem");
  }
  message;
  constructor() {
    super();
    this.message = "No active text editor found. Please open a file to process.";
  }
}
class ProcessingServiceProblem extends Data.TaggedError(
  "ProcessingServiceProblem"
) {
  static {
    __name(this, "ProcessingServiceProblem");
  }
  message;
  constructor(Properties) {
    super(Properties);
    const CauseMessage = this.Cause instanceof Error ? this.Cause.message : String(this.Cause);
    this.message = `Failed to connect to the processing service: ${CauseMessage}`;
  }
}
const GetActiveTextEditor = Effect.gen(function* () {
  const TheWindow = yield* WindowService;
  return Option.fromNullable(TheWindow.activeTextEditor);
});
const GetDocumentText = /* @__PURE__ */ __name((Document) => {
  return Effect.sync(() => Document.getText());
}, "GetDocumentText");
const InvokeProcessingService = /* @__PURE__ */ __name((TextContent) => {
  return Effect.gen(function* () {
    const TheIPC = yield* IPCService;
    return yield* TheIPC.SendRequest("$processText", [
      TextContent
    ]).pipe(
      Effect.mapError((Cause) => new ProcessingServiceProblem({ Cause }))
    );
  });
}, "InvokeProcessingService");
const ShowInformationMessage = /* @__PURE__ */ __name((message) => Effect.flatMap(
  WindowService,
  (w) => w.ShowInformationMessage(message)
), "ShowInformationMessage");
const ProcessUserData = Effect.gen(function* () {
  const MaybeEditor = yield* GetActiveTextEditor;
  const Editor = yield* Effect.mapError(
    MaybeEditor,
    () => new ActiveEditorNotFoundProblem()
  );
  const TextContent = yield* GetDocumentText(Editor.document);
  const ProcessingResult = yield* InvokeProcessingService(TextContent);
  yield* ShowInformationMessage(
    `Processing complete: ${ProcessingResult.ID}`
  );
}).pipe(
  // Declaratively handle all known, tagged failure cases for this workflow.
  Effect.catchTags({
    ActiveEditorNotFoundProblem: /* @__PURE__ */ __name((Error2) => ShowInformationMessage(Error2.message), "ActiveEditorNotFoundProblem"),
    ProcessingServiceProblem: /* @__PURE__ */ __name((Error2) => ShowInformationMessage(Error2.message), "ProcessingServiceProblem")
  }),
  // Catch any other unexpected error.
  Effect.catchAll(
    (Error2) => ShowInformationMessage(
      `An unexpected error occurred: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
    )
  )
);
export {
  ActiveEditorNotFoundProblem,
  ProcessUserData,
  ProcessingServiceProblem
};
//# sourceMappingURL=ProcessUserData.js.map
