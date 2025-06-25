import { URI } from '../../../../base/common/uri.js';
import { Workspace as BaseWorkspace, WorkspaceFolder } from '../../common/workspace.js';
export declare class Workspace extends BaseWorkspace {
    constructor(id: string, folders?: WorkspaceFolder[], configuration?: URI | null, ignorePathCasing?: (key: URI) => boolean);
}
export declare const TestWorkspace: Workspace;
export declare function testWorkspace(resource: URI): Workspace;
