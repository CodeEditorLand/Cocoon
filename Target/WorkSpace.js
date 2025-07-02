var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { Effect, Option, Ref, Schedule } from "effect";
import { URI } from "vscode-uri";
import { ApplicationConfigurationService } from "./ApplicationConfiguration.js";
import { DocumentService } from "./Document.js";
import { FileSystemService } from "./FileSystem.js";
import { IPCService } from "./IPC.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";
import { FromDTO as WorkspaceFolderFromDTO } from "./TypeConverter/Main/WorkspaceFolder.js";
import { FromAPI as WorkspaceEditFromAPI } from "./TypeConverter/WorkSpaceEdit.js";
import { CreateEventStream } from "./Utility/EventStream.js";
const toConfigurationOverrides = /* @__PURE__ */ __name((scope) => {
  if (!scope) {
    return {};
  }
  if (URI.isUri(scope)) {
    return { resource: scope };
  }
  if (typeof scope === "object") {
    const resource = "uri" in scope && scope.uri ? scope.uri : void 0;
    const languageId = "languageId" in scope ? scope.languageId : void 0;
    const result = {};
    if (resource) {
      result.resource = resource;
    }
    if (languageId) {
      result.overrideIdentifier = languageId;
    }
    return result;
  }
  return {};
}, "toConfigurationOverrides");
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
        openTextDocument: /* @__PURE__ */ __name((OptionsOrUri) => {
          return Effect.gen(function* () {
            if (OptionsOrUri instanceof URI) {
              const maybeDoc = yield* Document.GetDocument(OptionsOrUri);
              if (Option.isSome(maybeDoc)) {
                return yield* Effect.succeed(maybeDoc.value);
              }
            }
            const DTO = OptionsOrUri instanceof URI ? OptionsOrUri.toJSON() : OptionsOrUri;
            const ResultDTO = yield* IPC.SendRequest(
              "$openTextDocument",
              [DTO]
            ).pipe(
              Effect.mapError(
                (cause) => new Error(String(cause))
              )
            );
            const ResultUri = UriToAPI(ResultDTO.uri);
            const getDocEffect = Document.GetDocument(
              ResultUri
            ).pipe(
              Effect.flatMap(
                (maybeDoc) => Option.match(maybeDoc, {
                  onNone: /* @__PURE__ */ __name(() => Effect.fail(
                    new Error(
                      "Polling... Document not ready."
                    )
                  ), "onNone"),
                  onSome: /* @__PURE__ */ __name((doc) => Effect.succeed(doc), "onSome")
                })
              )
            );
            return yield* Effect.retry(getDocEffect, {
              schedule: Schedule.spaced(50).pipe(
                Schedule.compose(Schedule.recurs(100))
              )
            }).pipe(
              Effect.mapError(
                () => new Error(
                  `Polling for document timed out: ${ResultUri.toString()}`
                )
              )
            );
          }).pipe(Effect.withSpan("WorkSpace.openTextDocument"));
        }, "openTextDocument"),
        getConfiguration: /* @__PURE__ */ __name((section, scope) => Effect.succeed({
          get: /* @__PURE__ */ __name((key, defaultValue) => {
            const fullKey = section ? `${section}.${key}` : key;
            const value = ApplicationConfiguration.getValue(fullKey, toConfigurationOverrides(scope));
            return value === void 0 ? defaultValue : value;
          }, "get"),
          has: /* @__PURE__ */ __name((key) => {
            const fullKey = section ? `${section}.${key}` : key;
            return ApplicationConfiguration.getValue(
              fullKey,
              toConfigurationOverrides(scope)
            ) !== void 0;
          }, "has"),
          inspect: /* @__PURE__ */ __name((key) => {
            const fullKey = section ? `${section}.${key}` : key;
            const inspection = ApplicationConfiguration.inspect(
              fullKey,
              toConfigurationOverrides(scope)
            );
            return { key: fullKey, ...inspection };
          }, "inspect"),
          update: /* @__PURE__ */ __name((key, value, configurationTarget, overrideInLanguage) => {
            const fullKey = section ? `${section}.${key}` : key;
            const scopeAsOverrides = toConfigurationOverrides(scope);
            if (overrideInLanguage && scope && typeof scope === "object" && "languageId" in scope) {
              scopeAsOverrides.overrideIdentifier = scope.languageId;
            }
            return ApplicationConfiguration.updateValue(
              fullKey,
              value,
              scopeAsOverrides,
              configurationTarget
            );
          }, "update")
        }), "getConfiguration"),
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
