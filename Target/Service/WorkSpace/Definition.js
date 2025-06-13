var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import * as TypeConverter from "../../TypeConverter.js";
import { Configuration } from "../Configuration/Service.js";
import { Document } from "../Document/Service.js";
import { FileSystem } from "../FileSystem/Service.js";
import { IPC } from "../IPC.js";
import { InternalWorkSpace } from "./State.js";
import { FindFiles as FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocument as OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const DocumentService = yield* _(Document.Tag);
  const FsService = yield* _(FileSystem.Tag);
  const ConfigurationService = yield* _(Configuration.Tag);
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
  IPCService.RegisterInvokeHandler(
    "$acceptWorkspaceData",
    ([data]) => Effect.gen(function* (_2) {
      const OldWorkSpace = yield* _2(Ref.get(InternalWorkSpaceRef));
      const NewWorkSpace = new InternalWorkSpace(
        data.id,
        data.name,
        data.folders.map(
          (f) => TypeConverter.Main.WorkspaceFolder.fromDTO(f)
        ),
        data.configuration ? TypeConverter.URIConverter.ToAPI(data.configuration) : void 0
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
    }).pipe(Effect.runPromise)
  );
  IPCService.RegisterInvokeHandler(
    "$acceptEditorState",
    ([activeEditorId, visibleEditorIds]) => Effect.gen(function* (_2) {
      const editors = yield* _2(Ref.get(TextEditorsMap));
      const newActive = activeEditorId ? editors.get(activeEditorId) : void 0;
      const newVisible = visibleEditorIds.map((id) => editors.get(id)).filter(Boolean);
      yield* _2(Ref.set(ActiveTextEditorRef, newActive));
      yield* _2(
        Ref.set(VisibleTextEditorsRef, newVisible)
      );
      onDidChangeActiveTextEditorEmitter.fire(newActive);
      onDidChangeVisibleTextEditorsEmitter.fire(
        newVisible
      );
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    // --- Properties ---
    get name() {
      return Ref.get(InternalWorkSpaceRef).pipe(
        Effect.map((ws) => ws?.Name),
        Effect.runSync
      );
    },
    get workspaceFile() {
      return Ref.get(InternalWorkSpaceRef).pipe(
        Effect.map((ws) => ws?.Configuration),
        Effect.runSync
      );
    },
    get workspaceFolders() {
      return Ref.get(InternalWorkSpaceRef).pipe(
        Effect.map((ws) => ws?.Folders),
        Effect.runSync
      );
    },
    get isTrusted() {
      return true;
    },
    // This would come from InitData
    // --- Events ---
    onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
    // --- Methods ---
    getWorkspaceFolder: /* @__PURE__ */ __name((uri) => {
      const folders = Ref.get(InternalWorkSpaceRef).pipe(
        Effect.map((ws) => ws?.Folders),
        Effect.runSync
      ) ?? [];
      return folders.find((f) => uri.fsPath.startsWith(f.uri.fsPath));
    }, "getWorkspaceFolder"),
    findFiles: /* @__PURE__ */ __name((include, exclude, max, token) => FindFilesEffect(IPCService, include, exclude, max, token), "findFiles"),
    openTextDocument: /* @__PURE__ */ __name((options) => OpenTextDocumentEffect(IPCService, DocumentService, options), "openTextDocument"),
    getConfiguration: ConfigurationService.GetConfiguration,
    applyEdit: /* @__PURE__ */ __name((edit) => IPCService.SendRequest("$applyWorkspaceEdit", [
      TypeConverter.WorkSpaceEdit.fromAPI(edit)
    ]).pipe(Effect.runPromise), "applyEdit"),
    // --- Delegated Properties & Events ---
    fs: FsService,
    textDocuments: DocumentService.TextDocuments,
    onDidOpenTextDocument: DocumentService.onDidOpenTextDocument,
    onDidCloseTextDocument: DocumentService.onDidCloseTextDocument,
    onDidChangeTextDocument: DocumentService.onDidChangeTextDocument,
    get activeTextEditor() {
      return Ref.get(ActiveTextEditorRef).pipe(Effect.runSync);
    },
    get visibleTextEditors() {
      return Ref.get(VisibleTextEditorsRef).pipe(Effect.runSync);
    },
    onDidChangeActiveTextEditor: onDidChangeActiveTextEditorEmitter.event,
    onDidChangeVisibleTextEditors: onDidChangeVisibleTextEditorsEmitter.event,
    findTextEditorById: /* @__PURE__ */ __name((id) => Ref.get(TextEditorsMap).pipe(
      Effect.map((m) => m.get(id)),
      Effect.runSync
    ), "findTextEditorById")
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
