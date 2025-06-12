var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Hub, Ref, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { IpcProvider } from "../Ipc/mod.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const DocumentMap = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const EventHub = yield* _(Hub.unbounded());
  const AcceptModelAdded = /* @__PURE__ */ __name((Data) => Effect.gen(function* (_2) {
    const Doc = TypeConverter.TextDocument.fromDto(Data);
    yield* _2(
      Ref.update(
        DocumentMap,
        (map) => map.set(Doc.uri.toString(), Doc)
      )
    );
    yield* _2(Hub.publish(EventHub, { _tag: "Open", Document: Doc }));
  }), "AcceptModelAdded");
  const AcceptModelRemoved = /* @__PURE__ */ __name((UriDto) => Effect.gen(function* (_2) {
    const Uri = TypeConverter.Uri.fromDto(UriDto);
    const Doc = (yield* _2(Ref.get(DocumentMap))).get(Uri.toString());
    if (Doc) {
      yield* _2(
        Ref.update(
          DocumentMap,
          (map) => (map.delete(Uri.toString()), map)
        )
      );
      yield* _2(
        Hub.publish(EventHub, { _tag: "Close", Document: Doc })
      );
    }
  }), "AcceptModelRemoved");
  const AcceptModelChanged = /* @__PURE__ */ __name((UriDto, ChangeEventDto) => Effect.gen(function* (_2) {
    const Uri = TypeConverter.Uri.fromDto(UriDto);
    const Doc = (yield* _2(Ref.get(DocumentMap))).get(Uri.toString());
    if (Doc) {
      const ChangeEvent = TypeConverter.TextDocumentChangeEvent.fromDto(
        Doc,
        ChangeEventDto
      );
      yield* _2(
        Hub.publish(EventHub, {
          _tag: "Change",
          Event: ChangeEvent
        })
      );
    }
  }), "AcceptModelChanged");
  Ipc.RegisterInvokeHandler(
    "$acceptModelAdded",
    ([data]) => Effect.runPromise(AcceptModelAdded(data))
  );
  Ipc.RegisterInvokeHandler(
    "$acceptModelRemoved",
    ([uri]) => Effect.runPromise(AcceptModelRemoved(uri))
  );
  Ipc.RegisterInvokeHandler(
    "$acceptModelChanged",
    ([uri, changes]) => Effect.runPromise(AcceptModelChanged(uri, changes))
  );
  const ServiceImplementation = {
    get TextDocuments() {
      return Array.from(
        Ref.get(DocumentMap).pipe(Effect.runSync).values()
      );
    },
    OnDidOpenTextDocument: Stream.fromHub(EventHub).pipe(
      Stream.filter(
        (e) => e._tag === "Open"
      ),
      Stream.map((e) => e.Document)
    ),
    OnDidCloseTextDocument: Stream.fromHub(EventHub).pipe(
      Stream.filter(
        (e) => e._tag === "Close"
      ),
      Stream.map((e) => e.Document)
    ),
    OnDidChangeTextDocument: Stream.fromHub(EventHub).pipe(
      Stream.filter(
        (e) => e._tag === "Change"
      ),
      Stream.map((e) => e.Event)
    ),
    OnDidSaveTextDocument: Stream.fromHub(EventHub).pipe(
      Stream.filter(
        (e) => e._tag === "Save"
      ),
      Stream.map((e) => e.Document)
    ),
    GetDocument: /* @__PURE__ */ __name((Uri) => Ref.get(DocumentMap).pipe(
      Effect.map((map) => map.get(Uri.toString()))
    ), "GetDocument")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
