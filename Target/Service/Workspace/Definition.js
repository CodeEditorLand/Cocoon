var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import CreateEventStream from "Source/Utility/CreateEventStream.js";
import { Emitter } from "vs/base/common/event.js";
import {
  Disposable
} from "vscode";
import URIConverter from "../../TypeConverter/Main/URI.js";
import WorkSpaceFolderConverter from "../../TypeConverter/Main/WorkspaceFolder.js";
import { default as WorkSpaceEditConverter } from "../../TypeConverter/WorkSpaceEdit.js";
import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import InternalWorkSpace from "./State.js";
import FindFilesEffect from "./Support/FindFiles.js";
import OpenTextDocumentEffect from "./Support/OpenTextDocument.js";
var Definition_default = Effect.gen(function* (G) {
  const IPC = yield* G(IPCService);
  const Document = yield* G(DocumentService);
  const Fs = yield* G(FileSystemService);
  const Configuration = yield* G(ConfigurationService);
  const InternalWorkSpaceRef = yield* G(
    Ref.make(void 0)
  );
  const TextEditorsMapRef = yield* G(Ref.make(/* @__PURE__ */ new Map()));
  const ActiveTextEditorRef = yield* G(
    Ref.make(void 0)
  );
  const VisibleTextEditorsRef = yield* G(Ref.make([]));
  const OnDidChangeFoldersEvent = new Emitter();
  const { event: OnDidChangeActiveTextEditorEvent, Fire: FireActiveEditor } = CreateEventStream();
  const {
    event: OnDidChangeVisibleTextEditorsEvent,
    Fire: FireVisibleEditors
  } = CreateEventStream();
  const AcceptWorkspaceDataEffect = /* @__PURE__ */ __name((data) => Effect.gen(function* (G2) {
    const OldWorkSpace = yield* G2(Ref.get(InternalWorkSpaceRef));
    const NewWorkSpace = new InternalWorkSpace(
      data.id,
      data.name,
      data.folders.map(
        (f) => WorkSpaceFolderConverter.FromDTO(f)
      ),
      data.configuration ? URIConverter.ToAPI(data.configuration) : void 0
    );
    yield* G2(Ref.set(InternalWorkSpaceRef, NewWorkSpace));
    const OldFolders = OldWorkSpace?.Folders ?? [];
    const NewFolders = NewWorkSpace.Folders;
    const Added = NewFolders.filter(
      (f) => !OldFolders.some(
        (of) => of.uri.toString() === f.uri.toString()
      )
    );
    const Removed = OldFolders.filter(
      (f) => !NewFolders.some(
        (nf) => nf.uri.toString() === f.uri.toString()
      )
    );
    if (Added.length > 0 || Removed.length > 0) {
      OnDidChangeFoldersEvent.fire({
        added: Added,
        removed: Removed
      });
    }
  }), "AcceptWorkspaceDataEffect");
  const AcceptEditorStateEffect = /* @__PURE__ */ __name((activeEditorId, visibleEditorIds) => Effect.gen(function* (G2) {
    const Editors = yield* G2(Ref.get(TextEditorsMapRef));
    const NewActive = activeEditorId ? Editors.get(activeEditorId) : void 0;
    const NewVisible = visibleEditorIds.map((id) => Editors.get(id)).filter(Boolean);
    yield* G2(Ref.set(ActiveTextEditorRef, NewActive));
    yield* G2(
      Ref.set(VisibleTextEditorsRef, NewVisible)
    );
    yield* G2(FireActiveEditor(NewActive));
    yield* G2(FireVisibleEditors(NewVisible));
  }), "AcceptEditorStateEffect");
  yield* G(
    Effect.sync(() => {
      IPC.RegisterInvokeHandler(
        "$acceptWorkspaceData",
        ([data]) => Effect.runPromise(AcceptWorkspaceDataEffect(data))
      );
      IPC.RegisterInvokeHandler(
        "$acceptEditorState",
        ([activeId, visibleIds]) => Effect.runPromise(
          AcceptEditorStateEffect(activeId, visibleIds)
        )
      );
    })
  );
  const ServiceImplementation = {
    // Workspace properties
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
    // Editor State Properties
    get activeTextEditor() {
      return Effect.runSync(Ref.get(ActiveTextEditorRef));
    },
    get visibleTextEditors() {
      return Effect.runSync(Ref.get(VisibleTextEditorsRef));
    },
    // Editor State Events
    onDidChangeActiveTextEditor: OnDidChangeActiveTextEditorEvent,
    onDidChangeVisibleTextEditors: OnDidChangeVisibleTextEditorsEvent,
    onDidChangeTextEditorSelection: new Emitter().event,
    onDidChangeTextEditorVisibleRanges: new Emitter().event,
    onDidChangeTextEditorOptions: new Emitter().event,
    onDidChangeTextEditorViewColumn: new Emitter().event,
    // Methods
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
    applyEdit: /* @__PURE__ */ __name((edit) => IPC.SendRequest("$applyWorkspaceEdit", [
      WorkSpaceEditConverter.FromAPI(edit)
    ]).pipe(Effect.mapError((e) => new Error(String(e)))), "applyEdit"),
    fs: Fs,
    registerTextDocumentContentProvider: /* @__PURE__ */ __name((_scheme, _provider) => new Disposable(() => {
    }), "registerTextDocumentContentProvider")
    // Stub
  };
  return ServiceImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
