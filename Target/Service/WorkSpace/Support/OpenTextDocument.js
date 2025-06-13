var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Uri } from "vscode";
import * as TypeConverter from "../../../TypeConverter.js";
function OpenTextDocument(IPCService, DocumentService, options) {
  return Effect.gen(function* (_) {
    if (options instanceof Uri) {
      const existing = yield* _(DocumentService.GetDocument(options));
      if (existing) {
        return existing;
      }
      const uriDTO = TypeConverter.URIConverter.FromAPI(options);
      yield* _(
        IPCService.SendNotification("$openTextDocument", [uriDTO])
      );
      return yield* _(
        Effect.fail(
          new Error(
            "Async document opening flow not fully implemented."
          )
        )
      );
    } else {
      const resultDTO = yield* _(
        IPCService.SendRequest("$openTextDocument", [options])
      );
      const uri = TypeConverter.URIConverter.ToAPI(resultDTO.uri);
      const doc = yield* _(DocumentService.GetDocument(uri));
      if (!doc) {
        return yield* _(
          Effect.fail(
            new Error(
              "Failed to find newly created untitled document."
            )
          )
        );
      }
      return doc;
    }
  });
}
__name(OpenTextDocument, "OpenTextDocument");
export {
  OpenTextDocument
};
//# sourceMappingURL=OpenTextDocument.js.map
