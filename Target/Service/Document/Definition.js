var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Ref } from "effect";
import { ExtHostDocumentData } from "vs/workbench/api/common/extHostDocumentData.js";
import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const DocumentMapRef = yield* G(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const MainThreadDocumentsProxy = IPC.CreateProxy(
    "$rpc:mainThreadDocuments"
  );
  const OnDidOpenTextDocumentStream = CreateEventStream();
  const OnDidCloseTextDocumentStream = CreateEventStream();
  const OnDidChangeTextDocumentStream = CreateEventStream();
  const OnDidSaveTextDocumentStream = CreateEventStream();
  const AcceptModelAddedEffect = /* @__PURE__ */ __name((Data) => Effect.gen(function* (G2) {
    const RevivedURI = URIConverter.ToAPI(Data.uri);
    const DocumentData = new ExtHostDocumentData(
      MainThreadDocumentsProxy,
      RevivedURI,
      Data.lines,
      Data.eol,
      Data.versionId,
      Data.languageId,
      Data.isDirty,
      Data.encoding
    );
    yield* G2(
      Ref.update(
        DocumentMapRef,
        (Map2) => Map2.set(DocumentData.document.uri.toString(), DocumentData)
      )
    );
    yield* G2(OnDidOpenTextDocumentStream.Fire(DocumentData.document));
  }), "AcceptModelAddedEffect");
  const AcceptModelRemovedEffect = /* @__PURE__ */ __name((UriDTO) => Effect.gen(function* (G2) {
    const URIString = URIConverter.ToAPI(UriDTO).toString();
    const DocumentData = (yield* G2(Ref.get(DocumentMapRef))).get(
      URIString
    );
    if (DocumentData) {
      yield* G2(
        Ref.update(
          DocumentMapRef,
          (Map2) => (Map2.delete(URIString), Map2)
        )
      );
      yield* G2(
        OnDidCloseTextDocumentStream.Fire(DocumentData.document)
      );
    }
  }), "AcceptModelRemovedEffect");
  const AcceptModelChangedEffect = /* @__PURE__ */ __name((UriDTO, ChangeEventDTO) => Effect.gen(function* (G2) {
    const URIString = URIConverter.ToAPI(UriDTO).toString();
    const DocumentData = (yield* G2(Ref.get(DocumentMapRef))).get(
      URIString
    );
    if (DocumentData) {
      const ModelChangedEvent = {
        changes: ChangeEventDTO.changes,
        eol: ChangeEventDTO.eol,
        versionId: ChangeEventDTO.versionId,
        isUndoing: false,
        isRedoing: false
      };
      DocumentData.onEvents(ModelChangedEvent);
      yield* G2(
        OnDidChangeTextDocumentStream.Fire({
          document: DocumentData.document,
          contentChanges: ChangeEventDTO.changes.map(
            (Change) => ({
              range: RangeConverter.ToAPI(Change.range),
              rangeOffset: Change.rangeOffset,
              rangeLength: Change.rangeLength,
              text: Change.text
            })
          ),
          reason: ChangeEventDTO.reason
        })
      );
    }
  }), "AcceptModelChangedEffect");
  yield* G(
    Effect.sync(() => {
      IPC.RegisterInvokeHandler(
        "$acceptModelAdded",
        ([Data]) => Effect.runPromise(AcceptModelAddedEffect(Data))
      );
      IPC.RegisterInvokeHandler(
        "$acceptModelRemoved",
        ([Uri]) => Effect.runPromise(AcceptModelRemovedEffect(Uri))
      );
      IPC.RegisterInvokeHandler(
        "$acceptModelChanged",
        ([Uri, Changes]) => Effect.runPromise(AcceptModelChangedEffect(Uri, Changes))
      );
    })
  );
  const DocumentImplementation = {
    get TextDocuments() {
      const Map2 = Effect.runSync(Ref.get(DocumentMapRef));
      return Array.from(Map2.values()).map((data) => data.document);
    },
    onDidOpenTextDocument: OnDidOpenTextDocumentStream.event,
    onDidCloseTextDocument: OnDidCloseTextDocumentStream.event,
    onDidChangeTextDocument: OnDidChangeTextDocumentStream.event,
    onDidSaveTextDocument: OnDidSaveTextDocumentStream.event,
    GetDocument: /* @__PURE__ */ __name((URI) => Ref.get(DocumentMapRef).pipe(
      Effect.map(
        (Map2) => Option.fromNullable(Map2.get(URI.toString()))
      ),
      Effect.map(Option.map((data) => data.document))
    ), "GetDocument")
  };
  return DocumentImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
