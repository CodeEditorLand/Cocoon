var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Uri } from "vscode";
import * as TypeConverter from "../../../TypeConverter/Main.js";
function OpenTextDocument_default(IPC, Document, options) {
  return Effect.gen(function* () {
    if (options instanceof Uri) {
      const existing = yield* Document.GetDocument(options);
      if (existing) {
        return existing;
      }
      const uriDTO = TypeConverter.URI.FromAPI(options);
      yield* IPC.SendNotification("$openTextDocument", [uriDTO]);
      return yield* Effect.fail(
        new Error("Async document opening flow not fully implemented.")
      );
    } else {
      const resultDTO = yield* IPC.SendRequest("$openTextDocument", [
        options
      ]);
      const uri = TypeConverter.URI.ToAPI(resultDTO.uri);
      const doc = yield* Document.GetDocument(uri);
      if (!doc) {
        return yield* Effect.fail(
          new Error(
            "Failed to find newly created untitled document."
          )
        );
      }
      return doc;
    }
  });
}
__name(OpenTextDocument_default, "default");
export {
  OpenTextDocument_default as default
};
//# sourceMappingURL=OpenTextDocument.js.map
