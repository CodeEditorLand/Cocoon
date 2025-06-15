var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import * as TypeConverter from "../../TypeConverter/Main.js";
import * as WorkSpaceEditConverter from "../../TypeConverter/WorkSpaceEdit.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import InternalWorkSpace from "./State.js";
import FindFilesEffect from "./Support/FindFiles.js";
import OpenTextDocumentEffect from "./Support/OpenTextDocument.js";
var Definition_default = Effect.gen(function* (_) {
  const IPC = yield* _(IPCService);
  const Document = yield* _(DocumentService);
  const Fs = yield* _(FileSystemService);
  const Configuration = yield* _(ConfigurationService);
  const InternalWorkSpaceRef = yield* _(
    Ref.make(void 0)
  );
  const OnDidChangeFoldersEvent = new Emitter();
  const TextEditorsMap = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  const ActiveTextEditorRef = yield* _(
    Ref.make(void 0)
  );
  const VisibleTextEditorsRef = yield* _(Ref.make([]));
  const onDidChangeActiveTextEditorEmitter = new Emitter();
  const onDidChangeVisibleTextEditorsEmitter = new Emitter();
  IPC.RegisterInvokeHandler(
    "$acceptWorkspaceData",
    ([data]) => Effect.gen(function* (_2) {
      const OldWorkSpace = yield* _2(Ref.get(InternalWorkSpaceRef));
      const NewWorkSpace = new InternalWorkSpace(
        data.id,
        data.name,
        data.folders.map(
          (f) => TypeConverter.WorkspaceFolder.fromDTO(f)
        ),
        data.configuration ? TypeConverter.URI.ToAPI(data.configuration) : void 0
      );
      yield* _2(Ref.set(InternalWorkSpaceRef, NewWorkSpace));
      const oldFolders = OldWorkSpace?.Folders ?? [];
      const newFolders = NewWorkSpace.Folders;
      const added = newFolders.filter(
        (f) => !oldFolders.some(
          (of) => of.uri.toString() === f.uri.toString()
        )
      );
      const removed = oldFolders.filter(
        (f) => !newFolders.some(
          (nf) => nf.uri.toString() === f.uri.toString()
        )
      );
      if (added.length > 0 || removed.length > 0) {
        OnDidChangeFoldersEvent.fire({ added, removed });
      }
    })
  );
  IPC.RegisterInvokeHandler(
    "$acceptEditorState",
    ([activeEditorId, visibleEditorIds]) => Effect.gen(function* () {
      const editors = yield* Ref.get(TextEditorsMap);
      const newActive = activeEditorId ? editors.get(activeEditorId) : void 0;
      const newVisible = visibleEditorIds.map((id) => editors.get(id)).filter(Boolean);
      yield* Ref.set(ActiveTextEditorRef, newActive);
      yield* Ref.set(
        VisibleTextEditorsRef,
        newVisible
      );
      onDidChangeActiveTextEditorEmitter.fire(newActive);
      onDidChangeVisibleTextEditorsEmitter.fire(
        newVisible
      );
    })
  );
  const ServiceImplementation = {
    get name() {
      return Effect.runSync(
        Ref.get(InternalWorkSpaceRef).pipe(
          Effect.map((ws) => ws?.Name)
        )
      );
    },
    get workspaceFile() {
      return Effect.runSync(
        Ref.get(InternalWorkSpaceRef).pipe(
          Effect.map((ws) => ws?.Configuration)
        )
      );
    },
    get workspaceFolders() {
      return Effect.runSync(
        Ref.get(InternalWorkSpaceRef).pipe(
          Effect.map((ws) => ws?.Folders)
        )
      );
    },
    get isTrusted() {
      return true;
    },
    onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
    getWorkspaceFolder: /* @__PURE__ */ __name((uri) => {
      const folders = Effect.runSync(
        Ref.get(InternalWorkSpaceRef).pipe(
          Effect.map((ws) => ws?.Folders)
        )
      ) ?? [];
      return folders.find((f) => uri.fsPath.startsWith(f.uri.fsPath));
    }, "getWorkspaceFolder"),
    findFiles: /* @__PURE__ */ __name((include, exclude, max, token) => FindFilesEffect(IPC, include, exclude, max, token).pipe(
      Effect.mapError((e) => new Error(String(e)))
    ), "findFiles"),
    openTextDocument: /* @__PURE__ */ __name((options) => OpenTextDocumentEffect(IPC, Document, options).pipe(
      Effect.mapError((e) => new Error(String(e)))
    ), "openTextDocument"),
    getConfiguration: Configuration.GetConfiguration,
    applyEdit: /* @__PURE__ */ __name((edit) => Effect.runPromise(
      IPC.SendRequest("$applyWorkspaceEdit", [
        WorkSpaceEditConverter.FromAPI(edit)
      ])
    ), "applyEdit"),
    fs: Fs,
    textDocuments: Document.TextDocuments,
    onDidOpenTextDocument: Document.onDidOpenTextDocument,
    onDidCloseTextDocument: Document.onDidCloseTextDocument,
    onDidChangeTextDocument: Document.onDidChangeTextDocument,
    get activeTextEditor() {
      return Effect.runSync(Ref.get(ActiveTextEditorRef));
    },
    get visibleTextEditors() {
      return Effect.runSync(Ref.get(VisibleTextEditorsRef));
    },
    onDidChangeActiveTextEditor: onDidChangeActiveTextEditorEmitter.event,
    onDidChangeVisibleTextEditors: onDidChangeVisibleTextEditorsEmitter.event,
    findTextEditorById: /* @__PURE__ */ __name((id) => Effect.runSync(
      Ref.get(TextEditorsMap).pipe(Effect.map((m) => m.get(id)))
    ), "findTextEditorById")
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
