import { IWorkspace } from '../../../../platform/workspace/common/workspace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
export declare function areWorkspaceFoldersEmpty(workspace: IWorkspace, fileService: IFileService): Promise<boolean>;
