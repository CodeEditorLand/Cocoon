var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { TextDocument as VscTextDocument } from "vs/workbench/api/common/extHostDocuments.js";
import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const DocumentMap = yield* Ref.make(/* @__PURE__ */ new Map());
  const OnDidOpenTextDocument = CreateEventStream();
  const OnDidCloseTextDocument = CreateEventStream();
  const OnDidChangeTextDocument = CreateEventStream();
  const OnDidSaveTextDocument = CreateEventStream();
  const AcceptModelAdded = /* @__PURE__ */ __name((Data) => Effect.gen(function* () {
    const RevivedURI = TypeConverter.URI.ToAPI(Data.uri);
    const Document = new VscTextDocument(
      IPC.CreateProtocolAdapter(),
      RevivedURI,
      Data.lines,
      Data.eol,
      Data.versionId,
      Data.languageId,
      Data.isDirty
    );
    yield* Ref.update(
      DocumentMap,
      (Map2) => Map2.set(Document.uri.toString(), Document)
    );
    yield* OnDidOpenTextDocument.Fire(Document);
  }), "AcceptModelAdded");
  const AcceptModelRemoved = /* @__PURE__ */ __name((UriDTO) => Effect.gen(function* () {
    const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
    const Document = (yield* Ref.get(DocumentMap)).get(URIString);
    if (Document) {
      yield* Ref.update(
        DocumentMap,
        (Map2) => (Map2.delete(URIString), Map2)
      );
      yield* OnDidCloseTextDocument.Fire(Document);
    }
  }), "AcceptModelRemoved");
  const AcceptModelChanged = /* @__PURE__ */ __name((UriDTO, ChangeEventDTO) => Effect.gen(function* () {
    const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
    const Document = (yield* Ref.get(DocumentMap)).get(URIString);
    if (Document) {
      Document.$acceptEvents(ChangeEventDTO);
      yield* OnDidChangeTextDocument.Fire({
        document: Document,
        contentChanges: ChangeEventDTO.changes.map(
          (Change) => ({
            range: TypeConverter.Range.ToAPI(Change.range),
            rangeOffset: Change.rangeOffset,
            rangeLength: Change.rangeLength,
            text: Change.text
          })
        ),
        reason: ChangeEventDTO.reason
      });
    }
  }), "AcceptModelChanged");
  IPC.RegisterInvokeHandler(
    "$acceptModelAdded",
    ([Data]) => Effect.runPromise(AcceptModelAdded(Data))
  );
  IPC.RegisterInvokeHandler(
    "$acceptModelRemoved",
    ([Uri]) => Effect.runPromise(AcceptModelRemoved(Uri))
  );
  IPC.RegisterInvokeHandler(
    "$acceptModelChanged",
    ([Uri, Changes]) => Effect.runPromise(AcceptModelChanged(Uri, Changes))
  );
  const DocumentImplementation = {
    get TextDocuments() {
      return Array.from(Effect.runSync(Ref.get(DocumentMap)).values());
    },
    onDidOpenTextDocument: OnDidOpenTextDocument.event,
    onDidCloseTextDocument: OnDidCloseTextDocument.event,
    onDidChangeTextDocument: OnDidChangeTextDocument.event,
    onDidSaveTextDocument: OnDidSaveTextDocument.event,
    GetDocument: /* @__PURE__ */ __name((URI) => Ref.get(DocumentMap).pipe(
      Effect.map((Map2) => Map2.get(URI.toString()))
    ), "GetDocument")
  };
  return DocumentImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
