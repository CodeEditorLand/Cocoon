var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option } from "effect";
import { Uri } from "vscode";
import URIConverter from "../../../TypeConverter/Main/URI.js";
var OpenTextDocument_default = /* @__PURE__ */ __name((IPC, Document, options) => Effect.gen(function* (G) {
  if (options instanceof Uri) {
    const Existing = yield* G(Document.GetDocument(options));
    if (Option.isSome(Existing)) {
      return Existing.value;
    }
    const UriDTO = URIConverter.FromAPI(options);
    yield* G(IPC.SendNotification("$openTextDocument", [UriDTO]));
    return yield* G(
      Effect.fail(
        new Error(
          "Async document opening flow not fully implemented."
        )
      )
    );
  } else {
    const ResultDTO = yield* G(
      IPC.SendRequest("$openTextDocument", [options])
    );
    const uri = URIConverter.ToAPI(ResultDTO.uri);
    const Doc = yield* G(Document.GetDocument(uri));
    return yield* G(
      Option.match(Doc, {
        onSome: /* @__PURE__ */ __name((doc) => Effect.succeed(doc), "onSome"),
        onNone: /* @__PURE__ */ __name(() => Effect.fail(
          new Error(
            "Failed to find newly created untitled document."
          )
        ), "onNone")
      })
    );
  }
}), "default");
export {
  OpenTextDocument_default as default
};
//# sourceMappingURL=OpenTextDocument.js.map
