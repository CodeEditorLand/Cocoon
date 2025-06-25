var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Option, Ref, Schedule } from "effect";
import { Emitter } from "vs/base/common/event.js";
import {
  Disposable
} from "vscode";
import { URI } from "vscode-uri";
import { FromDTO as WorkspaceFolderFromDTO } from "./TypeConverter/Main/WorkspaceFolder.js";
import { FromAPI as WorkspaceEditFromAPI } from "./TypeConverter/WorkSpaceEdit.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { DocumentService } from "./Document.js";
import { FileSystemService } from "./FileSystem.js";
import { IPCService } from "./IPC.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";
class InternalWorkspace {
  constructor(ID, Name, Folders, Configuration) {
    this.ID = ID;
    this.Name = Name;
    this.Folders = Folders;
    this.Configuration = Configuration;
  }
  static {
    __name(this, "InternalWorkspace");
  }
}
class WorkSpaceService extends Effect.Service()(
  "Service/WorkSpace",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Document = yield* DocumentService;
      const FileSystem = yield* FileSystemService;
      const ApplicationConfiguration = yield* ApplicationConfigurationService;
      const InternalWorkspaceRef = yield* Ref.make(void 0);
      const TextEditorsMapRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const ActiveTextEditorRef = yield* Ref.make(
        void 0
      );
      const VisibleTextEditorsRef = yield* Ref.make([]);
      const OnDidChangeFoldersEvent = new Emitter();
      const {
        event: onDidChangeActiveTextEditor,
        Fire: FireActiveEditor
      } = CreateEventStream();
      const {
        event: onDidChangeVisibleTextEditors,
        Fire: FireVisibleEditors
      } = CreateEventStream();
      const AcceptWorkspaceData = /* @__PURE__ */ __name((Data) => Effect.gen(function* () {
        const OldWorkspace = yield* Ref.get(InternalWorkspaceRef);
        const NewWorkspace = new InternalWorkspace(
          Data.id,
          Data.name,
          Data.folders.map(
            (FolderDTO) => WorkspaceFolderFromDTO(FolderDTO)
          ),
          Data.configuration ? UriToAPI(Data.configuration) : void 0
        );
        yield* Ref.set(InternalWorkspaceRef, NewWorkspace);
        const OldFolders = OldWorkspace?.Folders ?? [];
        const NewFolders = NewWorkspace.Folders;
        const AddedFolders = NewFolders.filter(
          (Folder) => !OldFolders.some(
            (OldFolder) => OldFolder.uri.toString() === Folder.uri.toString()
          )
        );
        const RemovedFolders = OldFolders.filter(
          (Folder) => !NewFolders.some(
            (NewFolder) => NewFolder.uri.toString() === Folder.uri.toString()
          )
        );
        if (AddedFolders.length > 0 || RemovedFolders.length > 0) {
          OnDidChangeFoldersEvent.fire({
            added: AddedFolders,
            removed: RemovedFolders
          });
        }
      }), "AcceptWorkspaceData");
      const AcceptEditorState = /* @__PURE__ */ __name((ActiveEditorId, VisibleEditorIds) => Effect.gen(function* () {
        const EditorsMap = yield* Ref.get(TextEditorsMapRef);
        const NewActiveEditor = ActiveEditorId ? EditorsMap.get(ActiveEditorId) : void 0;
        const NewVisibleEditors = VisibleEditorIds.map(
          (ID) => EditorsMap.get(ID)
        ).filter((Editor) => !!Editor);
        yield* Ref.set(ActiveTextEditorRef, NewActiveEditor);
        yield* Ref.set(VisibleTextEditorsRef, NewVisibleEditors);
        yield* FireActiveEditor(NewActiveEditor);
        yield* FireVisibleEditors(NewVisibleEditors);
      }), "AcceptEditorState");
      IPC.RegisterInvokeHandler(
        "$acceptWorkspaceData",
        ([Data]) => Effect.runPromise(AcceptWorkspaceData(Data))
      );
      IPC.RegisterInvokeHandler(
        "$acceptEditorState",
        ([ActiveId, VisibleIds]) => Effect.runPromise(AcceptEditorState(ActiveId, VisibleIds))
      );
      const service = {
        get name() {
          return Effect.runSync(Ref.get(InternalWorkspaceRef))?.Name;
        },
        get workspaceFile() {
          return Effect.runSync(Ref.get(InternalWorkspaceRef))?.Configuration;
        },
        get workspaceFolders() {
          return Effect.runSync(Ref.get(InternalWorkspaceRef))?.Folders;
        },
        isTrusted: true,
        fs: FileSystem,
        get activeTextEditor() {
          return Effect.runSync(Ref.get(ActiveTextEditorRef));
        },
        get visibleTextEditors() {
          return Effect.runSync(Ref.get(VisibleTextEditorsRef));
        },
        onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.event,
        onDidChangeActiveTextEditor,
        onDidChangeVisibleTextEditors,
        getWorkspaceFolder: /* @__PURE__ */ __name((uri) => {
          const Folders = Effect.runSync(Ref.get(InternalWorkspaceRef))?.Folders ?? [];
          return Folders.find(
            (Folder) => uri.fsPath.startsWith(Folder.uri.fsPath)
          );
        }, "getWorkspaceFolder"),
        findFiles: /* @__PURE__ */ __name((Include, Exclude, MaxResults, Token) => IPC.SendRequest("findFiles", [
          Include,
          Exclude,
          MaxResults,
          Token ? 1 : 0
        ]).pipe(
          Effect.map((Uris) => Uris.filter((u) => !!u)),
          Effect.mapError((Cause) => new Error(String(Cause)))
        ), "findFiles"),
        openTextDocument: /* @__PURE__ */ __name((OptionsOrUri) => Effect.gen(function* () {
          const IsUri = OptionsOrUri instanceof URI;
          const UriToOpen = IsUri ? OptionsOrUri : void 0;
          if (UriToOpen) {
            const ExistingDocument = yield* Document.GetDocument(UriToOpen);
            if (Option.isSome(ExistingDocument)) {
              return ExistingDocument.value;
            }
          }
          const DTO = IsUri ? OptionsOrUri.toJSON() : OptionsOrUri;
          const ResultDTO = yield* IPC.SendRequest(
            "$openTextDocument",
            [DTO]
          );
          const ResultUri = UriToAPI(ResultDTO.uri);
          const WaitForDocument = Document.GetDocument(
            ResultUri
          ).pipe(
            Effect.repeat({
              schedule: Schedule.spaced(50).pipe(
                Schedule.whileInput(
                  (o) => Option.isNone(o)
                ),
                Schedule.compose(Schedule.recurs(100))
              )
            }),
            Effect.someOrFail(
              () => new Error(
                `Failed to find newly opened document after timeout: ${ResultUri.toString()}`
              )
            )
          );
          return yield* WaitForDocument;
        }), "openTextDocument"),
        getConfiguration: /* @__PURE__ */ __name((section, scope) => Effect.sync(
          () => ApplicationConfiguration.getValue(section, scope)
        ), "getConfiguration"),
        applyEdit: /* @__PURE__ */ __name((Edit) => IPC.SendRequest("$applyWorkspaceEdit", [
          WorkspaceEditFromAPI(Edit)
        ]).pipe(
          Effect.mapError((Cause) => new Error(String(Cause)))
        ), "applyEdit"),
        registerTextDocumentContentProvider: Document.RegisterTextDocumentContentProvider,
        onDidChangeTextEditorSelection: new Emitter().event,
        onDidChangeTextEditorVisibleRanges: new Emitter().event,
        onDidChangeTextEditorOptions: new Emitter().event,
        onDidChangeTextEditorViewColumn: new Emitter().event
      };
      return service;
    })
  }
) {
  static {
    __name(this, "WorkSpaceService");
  }
}
export {
  WorkSpaceService
};
//# sourceMappingURL=WorkSpace.js.map
