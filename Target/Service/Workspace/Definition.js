var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { ConfigurationProvider } from "../Configuration/mod.js";
import { DocumentsProvider } from "../Documents/mod.js";
import { FileSystemProvider } from "../FileSystem/mod.js";
import { IpcProvider } from "../Ipc/mod.js";
import { InternalWorkspace } from "./State.js";
import { FindFilesEffect } from "./Support/FindFiles.js";
import { OpenTextDocumentEffect } from "./Support/OpenTextDocument.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Documents = yield* _(DocumentsProvider.Tag);
  const Fs = yield* _(FileSystemProvider.Tag);
  const Configuration = yield* _(ConfigurationProvider.Tag);
  const InternalWorkspaceRef = yield* _(
    Ref.make(void 0)
  );
  const OnDidChangeFoldersEvent = CreateEventStream();
  Ipc.RegisterInvokeHandler(
    "$acceptWorkspaceData",
    ([data]) => Effect.gen(function* (_2) {
      const OldWorkspace = yield* _2(Ref.get(InternalWorkspaceRef));
      const NewWorkspace = new InternalWorkspace(
        data.id,
        data.name,
        data.folders.map(
          (f) => TypeConverter.WorkspaceFolder.fromDto(f)
        ),
        TypeConverter.Uri.fromDto(data.configuration)
      );
      yield* _2(Ref.set(InternalWorkspaceRef, NewWorkspace));
      const Added = NewWorkspace.Folders.filter(
        (f) => !OldWorkspace?.Folders.some(
          (of) => of.uri.toString() === f.uri.toString()
        )
      );
      const Removed = OldWorkspace?.Folders.filter(
        (f) => !NewWorkspace.Folders.some(
          (nf) => nf.uri.toString() === f.uri.toString()
        )
      ) ?? [];
      if (Added.length > 0 || Removed.length > 0) {
        yield* _2(
          OnDidChangeFoldersEvent.Fire({
            added: Added,
            removed: Removed
          })
        );
      }
    }).pipe(Effect.runPromise)
  );
  const ServiceImplementation = {
    // --- Properties ---
    get name() {
      return Ref.get(InternalWorkspaceRef).pipe(
        Effect.map((ws) => ws?.Name),
        Effect.runSync
      );
    },
    get workspaceFile() {
      return Ref.get(InternalWorkspaceRef).pipe(
        Effect.map((ws) => ws?.Configuration),
        Effect.runSync
      );
    },
    get workspaceFolders() {
      return Ref.get(InternalWorkspaceRef).pipe(
        Effect.map((ws) => ws?.Folders),
        Effect.runSync
      );
    },
    get isTrusted() {
      return true;
    },
    // This would come from InitData
    // --- Events ---
    onDidChangeWorkspaceFolders: OnDidChangeFoldersEvent.Stream,
    // --- Methods ---
    getWorkspaceFolder: /* @__PURE__ */ __name((uri) => Ref.get(InternalWorkspaceRef).pipe(
      Effect.map(
        (ws) => ws?.Folders.find(
          (f) => uri.fsPath.startsWith(f.uri.fsPath)
        )
      )
    ), "getWorkspaceFolder"),
    findFiles: /* @__PURE__ */ __name((include, exclude, max, token) => FindFilesEffect(Ipc, include, exclude, max, token), "findFiles"),
    openTextDocument: /* @__PURE__ */ __name((options) => OpenTextDocumentEffect(Ipc, Documents, options), "openTextDocument"),
    // --- Delegated Services/Properties ---
    getConfiguration: Configuration.GetConfiguration,
    fs: Fs,
    textDocuments: Documents.TextDocuments,
    onDidOpenTextDocument: Documents.OnDidOpenTextDocument,
    onDidCloseTextDocument: Documents.OnDidCloseTextDocument,
    onDidChangeTextDocument: Documents.OnDidChangeTextDocument
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
