/**
 * @module Document
 * @description Defines the service for managing the state of all open text documents.
 * It acts as the extension host's source of truth for document content, lifecycle
 * events, and provides an implementation of `vscode.workspace`'s document-related APIs.
 */
import { Effect, Option } from "effect";
import { Disposable, type Event, type TextDocument, type TextDocumentChangeEvent, type TextDocumentContentProvider, type Uri } from "vscode";
import { IPCService } from "./IPC.js";
/**
 * @interface Document
 * @description The contract for the Document service.
 */
export interface Document {
    readonly TextDocuments: readonly TextDocument[];
    readonly OnDidOpenTextDocument: Event<TextDocument>;
    readonly OnDidCloseTextDocument: Event<TextDocument>;
    readonly OnDidChangeTextDocument: Event<TextDocumentChangeEvent>;
    readonly OnDidSaveTextDocument: Event<TextDocument>;
    readonly GetDocument: (Uri: Uri) => Effect.Effect<Option.Option<TextDocument>, never>;
    readonly RegisterTextDocumentContentProvider: (Scheme: string, Provider: TextDocumentContentProvider) => Disposable;
}
declare const DocumentService_base: Effect.Service.Class<DocumentService, "Service/Document", {
    readonly effect: Effect.Effect<{
        readonly TextDocuments: TextDocument[];
        OnDidOpenTextDocument: import("vs/workbench/workbench.web.main.internal.js").Event<TextDocument>;
        OnDidCloseTextDocument: import("vs/workbench/workbench.web.main.internal.js").Event<TextDocument>;
        OnDidChangeTextDocument: import("vs/workbench/workbench.web.main.internal.js").Event<TextDocumentChangeEvent>;
        OnDidSaveTextDocument: import("vs/workbench/workbench.web.main.internal.js").Event<TextDocument>;
        GetDocument: (Uri: Uri) => Effect.Effect<Option.Option<TextDocument>, never, never>;
        RegisterTextDocumentContentProvider: (Scheme: string, Provider: TextDocumentContentProvider) => Disposable;
    }, never, IPCService>;
}>;
/**
 * @class DocumentService
 * @description The `Effect.Service` for managing text documents.
 */
export declare class DocumentService extends DocumentService_base {
}
export {};
