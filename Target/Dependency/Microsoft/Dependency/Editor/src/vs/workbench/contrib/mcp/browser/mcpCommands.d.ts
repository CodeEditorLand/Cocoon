import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { StorageScope } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IMcpServer, IMcpServerStartOpts, IMcpService } from '../common/mcpTypes.js';
export declare class ListMcpServerCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void | import("../../../common/views.js").IView | null>;
}
export declare class McpServerOptionsCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, id: string): Promise<void>;
    private _getAuthAction;
    private _getAllAllowedItems;
    private _handleAuth;
}
export declare class MCPServerActionRendering extends Disposable implements IWorkbenchContribution {
    constructor(actionViewItemService: IActionViewItemService, mcpService: IMcpService, instaService: IInstantiationService, commandService: ICommandService);
}
export declare class ResetMcpTrustCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): void;
}
export declare class ResetMcpCachedTools extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): void;
}
export declare class AddConfigurationAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, configUri?: string): Promise<void>;
}
export declare class RemoveStoredInput extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, scope: StorageScope, id?: string): void;
}
export declare class EditStoredInput extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, inputId: string, uri: URI | undefined, configSection: string, target: ConfigurationTarget): void;
}
export declare class ShowConfiguration extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, collectionId: string, serverId: string): void;
}
export declare class ShowOutput extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, serverId: string): void;
}
export declare class RestartServer extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, serverId: string, opts?: IMcpServerStartOpts): Promise<void>;
}
export declare class StartServer extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, serverId: string, opts?: IMcpServerStartOpts): Promise<void>;
}
export declare class StopServer extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, serverId: string): Promise<void>;
}
export declare class InstallFromActivation extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, uri: URI): Promise<void>;
}
export declare class McpBrowseCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class McpBrowseResourcesCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, server?: IMcpServer): void;
}
export declare class McpConfigureSamplingModels extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, server: IMcpServer): Promise<number>;
}
export declare class McpStartPromptingServerCommand extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, server: IMcpServer): Promise<void>;
}
