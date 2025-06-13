var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Hub, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { TextDocument as VscTextDocument } from "vs/workbench/api/common/extHostDocuments.js";
import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const DocumentMap = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const EventHub = yield* _(Hub.unbounded());
  const onDidOpenTextDocument = new Emitter();
  const onDidCloseTextDocument = new Emitter();
  const onDidChangeTextDocument = new Emitter();
  const onDidSaveTextDocument = new Emitter();
  const AcceptModelAdded = /* @__PURE__ */ __name((Data) => Effect.gen(function* (_2) {
    const revivedURI = TypeConverter.URIConverter.ToAPI(Data.uri);
    const document = new VscTextDocument(
      IPCService.CreateProtocolAdapter(),
      revivedURI,
      Data.lines,
      Data.eol,
      Data.versionId,
      Data.languageId,
      Data.isDirty
    );
    yield* _2(
      Ref.update(
        DocumentMap,
        (map) => map.set(document.uri.toString(), document)
      )
    );
    onDidOpenTextDocument.fire(document);
  }), "AcceptModelAdded");
  const AcceptModelRemoved = /* @__PURE__ */ __name((UriDTO) => Effect.gen(function* (_2) {
    const URIString = TypeConverter.URIConverter.ToAPI(UriDTO).toString();
    const Document = (yield* _2(Ref.get(DocumentMap))).get(URIString);
    if (Document) {
      yield* _2(
        Ref.update(
          DocumentMap,
          (map) => (map.delete(URIString), map)
        )
      );
      onDidCloseTextDocument.fire(Document);
    }
  }), "AcceptModelRemoved");
  const AcceptModelChanged = /* @__PURE__ */ __name((UriDTO, ChangeEventDTO) => Effect.gen(function* (_2) {
    const URIString = TypeConverter.URIConverter.ToAPI(UriDTO).toString();
    const Document = (yield* _2(Ref.get(DocumentMap))).get(URIString);
    if (Document) {
      Document.$acceptEvents(ChangeEventDTO);
      onDidChangeTextDocument.fire({
        document: Document,
        contentChanges: ChangeEventDTO.changes.map(
          (change) => ({
            range: TypeConverter.RangeConverter.ToAPI(
              change.range
            ),
            rangeOffset: change.rangeOffset,
            rangeLength: change.rangeLength,
            text: change.text
          })
        ),
        reason: ChangeEventDTO.reason
      });
    }
  }), "AcceptModelChanged");
  IPCService.RegisterInvokeHandler(
    "$acceptModelAdded",
    ([data]) => Effect.runPromise(AcceptModelAdded(data))
  );
  IPCService.RegisterInvokeHandler(
    "$acceptModelRemoved",
    ([uri]) => Effect.runPromise(AcceptModelRemoved(uri))
  );
  IPCService.RegisterInvokeHandler(
    "$acceptModelChanged",
    ([uri, changes]) => Effect.runPromise(AcceptModelChanged(uri, changes))
  );
  const ServiceImplementation = {
    get TextDocuments() {
      return Array.from(
        Ref.get(DocumentMap).pipe(Effect.runSync).values()
      );
    },
    onDidOpenTextDocument: onDidOpenTextDocument.event,
    onDidCloseTextDocument: onDidCloseTextDocument.event,
    onDidChangeTextDocument: onDidChangeTextDocument.event,
    onDidSaveTextDocument: onDidSaveTextDocument.event,
    GetDocument: /* @__PURE__ */ __name((URI) => Ref.get(DocumentMap).pipe(
      Effect.map((map) => map.get(URI.toString()))
    ), "GetDocument")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
