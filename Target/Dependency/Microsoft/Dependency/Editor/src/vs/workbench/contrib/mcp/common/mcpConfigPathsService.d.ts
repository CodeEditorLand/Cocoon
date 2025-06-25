import { Disposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { StorageScope } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService, IWorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
export interface IMcpConfigPath {
    /** Short, unique ID for this config. */
    id: string;
    /** Configuration scope that maps to this path.  */
    key: 'userLocalValue' | 'userRemoteValue' | 'workspaceValue' | 'workspaceFolderValue';
    /** Display name */
    label: string;
    /** Storage where associated data should be stored. */
    scope: StorageScope;
    /** Configuration target that correspond to this file */
    target: ConfigurationTarget;
    /** Order in which the configuration should be displayed */
    order: number;
    /** Config's remote authority */
    remoteAuthority?: string;
    /** Config file URI. */
    uri: URI | undefined;
    /** When MCP config is nested in a config file, the parent nested key. */
    section?: string[];
    /** Workspace folder, when the config refers to a workspace folder value. */
    workspaceFolder?: IWorkspaceFolder;
}
export interface IMcpConfigPathsService {
    _serviceBrand: undefined;
    readonly paths: IObservable<readonly IMcpConfigPath[]>;
}
export declare const IMcpConfigPathsService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpConfigPathsService>;
export declare class McpConfigPathsService extends Disposable implements IMcpConfigPathsService {
    private readonly _environmentService;
    _serviceBrand: undefined;
    private readonly _paths;
    get paths(): IObservable<readonly IMcpConfigPath[]>;
    constructor(workspaceContextService: IWorkspaceContextService, productService: IProductService, labelService: ILabelService, _environmentService: IWorkbenchEnvironmentService, remoteAgentService: IRemoteAgentService, preferencesService: IPreferencesService);
    private _fromWorkspaceFolder;
}
