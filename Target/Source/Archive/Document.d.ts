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
        readonly TextDocuments: Readonly<{
            [x: symbol]: () => string;
            readonly uri: import("@codeeditorland/output/vs/base/common/uri.js").URI;
            readonly fileName: any;
            readonly isUntitled: boolean;
            readonly languageId: any;
            readonly version: number;
            readonly isClosed: boolean;
            readonly isDirty: any;
            readonly encoding: any;
            save(): any;
            getText(range: any): string;
            readonly eol: any;
            readonly lineCount: number;
            lineAt(lineOrPos: any): import("@codeeditorland/output/vs/workbench/api/common/extHostDocumentData.js").ExtHostDocumentLine;
            offsetAt(pos: any): any;
            positionAt(offset: any): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
            validateRange(ran: any): any;
            validatePosition(pos: any): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
            getWordRangeAtPosition(pos: any, regexp: any): {
                get start(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                get end(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                _start: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                _end: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                contains(positionOrRange: any): any;
                isEqual(other: any): boolean;
                intersection(other: any): any;
                union(other: any): any;
                get isEmpty(): boolean;
                get isSingleLine(): boolean;
                with(startOrChange: any, end?: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position): any;
                toJSON(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position[];
            } | undefined;
        }>[];
        OnDidOpenTextDocument: any;
        OnDidCloseTextDocument: any;
        OnDidChangeTextDocument: any;
        OnDidSaveTextDocument: any;
        GetDocument: (Uri: Uri) => Effect.Effect<Option.Option<Readonly<{
            [x: symbol]: () => string;
            readonly uri: import("@codeeditorland/output/vs/base/common/uri.js").URI;
            readonly fileName: any;
            readonly isUntitled: boolean;
            readonly languageId: any;
            readonly version: number;
            readonly isClosed: boolean;
            readonly isDirty: any;
            readonly encoding: any;
            save(): any;
            getText(range: any): string;
            readonly eol: any;
            readonly lineCount: number;
            lineAt(lineOrPos: any): import("@codeeditorland/output/vs/workbench/api/common/extHostDocumentData.js").ExtHostDocumentLine;
            offsetAt(pos: any): any;
            positionAt(offset: any): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
            validateRange(ran: any): any;
            validatePosition(pos: any): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
            getWordRangeAtPosition(pos: any, regexp: any): {
                get start(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                get end(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                _start: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                _end: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position;
                contains(positionOrRange: any): any;
                isEqual(other: any): boolean;
                intersection(other: any): any;
                union(other: any): any;
                get isEmpty(): boolean;
                get isSingleLine(): boolean;
                with(startOrChange: any, end?: import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position): any;
                toJSON(): import("@codeeditorland/output/vs/workbench/api/common/extHostTypes.js").Position[];
            } | undefined;
        }>>, never, never>;
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
//# sourceMappingURL=Document.d.ts.map