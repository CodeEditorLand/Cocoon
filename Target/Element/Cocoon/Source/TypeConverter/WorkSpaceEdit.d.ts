/**
 * @module WorkSpaceEdit
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */
import type { UriComponents } from "vs/base/common/uri.js";
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type * as VSCode from "vscode";
interface IWorkspaceTextEdit {
    resource: UriComponents;
    textEdit: IIdentifiedSingleEditOperation;
    versionId?: number;
    metadata?: any;
}
interface IWorkspaceFileEdit {
    oldResource?: UriComponents;
    newResource?: UriComponents;
    options?: any;
    metadata?: any;
}
type IWorkspaceEdit = {
    edits: Array<IWorkspaceTextEdit | IWorkspaceFileEdit>;
    metadata?: any;
};
export interface IVersionInformationProvider {
    GetTextDocumentVersion(Uri: VSCode.Uri): number | undefined;
}
export declare const FromAPI: (Edit: VSCode.WorkspaceEdit, VersionProvider?: IVersionInformationProvider) => IWorkspaceEdit;
export declare const ToAPI: (DTO: IWorkspaceEdit) => VSCode.WorkspaceEdit;
export {};
