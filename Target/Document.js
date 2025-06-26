var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Ref } from "effect";
import { ExtHostDocumentData } from "vs/workbench/api/common/extHostDocumentData.js";
import {
  CancellationTokenSource,
  Disposable
} from "vscode";
import { IPCService } from "./IPC.js";
import { ToAPI as RangeToAPI } from "./TypeConverter/Main/Range.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
class DocumentService extends Effect.Service()(
  "Service/Document",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const DocumentMapRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const ContentProvidersRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const MainThreadDocumentsProxy = IPC.CreateProxy(
        "$rpc:mainThreadDocuments"
      );
      const { event: OnDidOpenTextDocument, Fire: FireOpen } = CreateEventStream();
      const { event: OnDidCloseTextDocument, Fire: FireClose } = CreateEventStream();
      const { event: OnDidChangeTextDocument, Fire: FireChange } = CreateEventStream();
      const { event: OnDidSaveTextDocument } = CreateEventStream();
      const AcceptModelAdded = /* @__PURE__ */ __name((Data) => Effect.gen(function* () {
        const RevivedUri = UriToAPI(Data.uri);
        const DocumentData = new ExtHostDocumentData(
          MainThreadDocumentsProxy,
          RevivedUri,
          Data.lines,
          Data.eol,
          Data.versionId,
          Data.languageId,
          Data.isDirty,
          Data.encoding
        );
        yield* Ref.update(
          DocumentMapRef,
          (Map2) => Map2.set(
            DocumentData.document.uri.toString(),
            DocumentData
          )
        );
        yield* FireOpen(DocumentData.document);
      }), "AcceptModelAdded");
      const AcceptModelRemoved = /* @__PURE__ */ __name((UriDTO) => Effect.gen(function* () {
        const UriString = UriToAPI(UriDTO).toString();
        const DocumentData = (yield* Ref.get(DocumentMapRef)).get(
          UriString
        );
        if (DocumentData) {
          yield* Ref.update(
            DocumentMapRef,
            (Map2) => (Map2.delete(UriString), Map2)
          );
          yield* FireClose(DocumentData.document);
        }
      }), "AcceptModelRemoved");
      const AcceptModelChanged = /* @__PURE__ */ __name((UriDTO, ChangeEventDTO) => Effect.gen(function* () {
        const UriString = UriToAPI(UriDTO).toString();
        const DocumentData = (yield* Ref.get(DocumentMapRef)).get(
          UriString
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
          yield* FireChange({
            document: DocumentData.document,
            contentChanges: ChangeEventDTO.changes.map(
              (Change) => ({
                range: RangeToAPI(Change.range),
                rangeOffset: Change.rangeOffset,
                rangeLength: Change.rangeLength,
                text: Change.text
              })
            ),
            reason: ChangeEventDTO.reason
          });
        }
      }), "AcceptModelChanged");
      const ProvideTextDocumentContent = /* @__PURE__ */ __name((UriComponents) => Effect.gen(function* () {
        const Uri = UriToAPI(UriComponents);
        const Scheme = Uri.scheme;
        const Providers = yield* Ref.get(ContentProvidersRef);
        const Provider = Option.fromNullable(Providers.get(Scheme));
        if (Option.isNone(Provider) || !Provider.value.provideTextDocumentContent) {
          return Option.none();
        }
        const Token = new CancellationTokenSource().token;
        const Content = yield* Effect.promise(
          () => Promise.resolve(
            Provider.value.provideTextDocumentContent(
              Uri,
              Token
            )
          )
        );
        return Option.fromNullable(Content);
      }).pipe(
        Effect.catchAll(
          (Error2) => Effect.logError(Error2).pipe(
            Effect.as(Option.none())
          )
        ),
        Effect.map(Option.getOrElse(() => null))
      ), "ProvideTextDocumentContent");
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
      IPC.RegisterInvokeHandler(
        "$provideTextDocumentContent",
        ([UriComponents]) => Effect.runPromise(
          ProvideTextDocumentContent(UriComponents)
        )
      );
      return {
        get TextDocuments() {
          const documentMap = Effect.runSync(Ref.get(DocumentMapRef));
          return Array.from(documentMap.values()).map(
            (data) => data.document
          );
        },
        OnDidOpenTextDocument,
        OnDidCloseTextDocument,
        OnDidChangeTextDocument,
        OnDidSaveTextDocument,
        GetDocument: /* @__PURE__ */ __name((Uri) => Ref.get(DocumentMapRef).pipe(
          Effect.map(
            (Map2) => Option.fromNullable(Map2.get(Uri.toString()))
          ),
          Effect.map(Option.map((data) => data.document))
        ), "GetDocument"),
        RegisterTextDocumentContentProvider: /* @__PURE__ */ __name((Scheme, Provider) => {
          Effect.runFork(
            IPC.SendNotification(
              "$registerTextDocumentContentProvider",
              [Scheme]
            )
          );
          Effect.runSync(
            Ref.update(
              ContentProvidersRef,
              (Map2) => Map2.set(Scheme, Provider)
            )
          );
          return new Disposable(() => {
            const Unregister = Ref.update(
              ContentProvidersRef,
              (Map2) => (Map2.delete(Scheme), Map2)
            ).pipe(
              Effect.andThen(
                IPC.SendNotification(
                  "$unregisterTextDocumentContentProvider",
                  [Scheme]
                )
              )
            );
            Effect.runFork(Unregister);
          });
        }, "RegisterTextDocumentContentProvider")
      };
    })
  }
) {
  static {
    __name(this, "DocumentService");
  }
}
export {
  DocumentService
};
//# sourceMappingURL=Document.js.map
