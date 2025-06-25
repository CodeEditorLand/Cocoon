import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IGalleryMcpServer, ILocalMcpServer, IMcpGalleryService, IMcpManagementService, IQueryOptions } from '../../../../platform/mcp/common/mcpManagement.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IMcpWorkbenchService, IWorkbenchMcpServer } from '../common/mcpTypes.js';
declare class McpWorkbenchServer implements IWorkbenchMcpServer {
    local: ILocalMcpServer | undefined;
    gallery: IGalleryMcpServer | undefined;
    private readonly mcpGalleryService;
    private readonly fileService;
    constructor(local: ILocalMcpServer | undefined, gallery: IGalleryMcpServer | undefined, mcpGalleryService: IMcpGalleryService, fileService: IFileService);
    get id(): string;
    get name(): string;
    get label(): string;
    get iconUrl(): string | undefined;
    get publisherDisplayName(): string | undefined;
    get publisherUrl(): string | undefined;
    get description(): string;
    get installCount(): number;
    get url(): string | undefined;
    get repository(): string | undefined;
    getReadme(token: CancellationToken): Promise<string>;
}
export declare class McpWorkbenchService extends Disposable implements IMcpWorkbenchService {
    private readonly mcpGalleryService;
    private readonly mcpManagementService;
    private readonly editorService;
    private readonly instantiationService;
    _serviceBrand: undefined;
    private _local;
    get local(): readonly McpWorkbenchServer[];
    private readonly _onChange;
    readonly onChange: import("../../../workbench.web.main.internal.js").Event<IWorkbenchMcpServer | undefined>;
    constructor(mcpGalleryService: IMcpGalleryService, mcpManagementService: IMcpManagementService, editorService: IEditorService, instantiationService: IInstantiationService);
    private onDidUninstallMcpServer;
    private onDidInstallMcpServers;
    private fromGallery;
    queryGallery(options?: IQueryOptions, token?: CancellationToken): Promise<IWorkbenchMcpServer[]>;
    queryLocal(): Promise<IWorkbenchMcpServer[]>;
    install(server: IWorkbenchMcpServer): Promise<void>;
    uninstall(server: IWorkbenchMcpServer): Promise<void>;
    open(extension: IWorkbenchMcpServer, options?: IEditorOptions): Promise<void>;
}
export declare class MCPContextsInitialisation extends Disposable implements IWorkbenchContribution {
    static ID: string;
    constructor(mcpWorkbenchService: IMcpWorkbenchService, mcpGalleryService: IMcpGalleryService, contextKeyService: IContextKeyService);
}
export {};
