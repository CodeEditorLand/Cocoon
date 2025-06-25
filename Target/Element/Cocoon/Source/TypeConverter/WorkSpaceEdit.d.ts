/**
 * @module WorkSpaceEdit
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */
import type { UriComponents } from "vs/base/common/uri.js";
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type * as VSCode from "vscode";
interface IWorkspaceTextEditDTO {
    _type: "text";
    resource: UriComponents;
    edit: IIdentifiedSingleEditOperation;
    metadata?: VSCode.WorkspaceEditEntryMetadata;
    versionId?: number;
}
interface IWorkspaceFileEditDTO {
    _type: "file";
    oldResource?: UriComponents;
    newResource?: UriComponents;
    options?: any;
    metadata?: VSCode.WorkspaceEditEntryMetadata;
}
type IWorkspaceEditDTO = {
    edits: Array<IWorkspaceTextEditDTO | IWorkspaceFileEditDTO>;
    metadata?: VSCode.WorkspaceEditMetadata;
};
export interface IVersionInformationProvider {
    GetTextDocumentVersion(Uri: VSCode.Uri): number | undefined;
}
export declare const FromAPI: (Edit: VSCode.WorkspaceEdit, VersionProvider?: IVersionInformationProvider) => IWorkspaceEditDTO;
export declare const ToAPI: (DTO: IWorkspaceEditDTO) => VSCode.WorkspaceEdit;
export {};
