import { CancellationToken } from '../../../../base/common/cancellation.js';
import { DisposableStore, IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { DefaultQuickAccessFilterValue, IQuickAccessProvider, IQuickAccessProviderRunOptions } from '../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService, IQuickPick, IQuickPickItem, IQuickPickSeparator } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAttachmentResolveService } from '../../chat/browser/chatAttachmentResolveService.js';
import { IChatRequestVariableEntry } from '../../chat/common/chatVariableEntries.js';
import { IMcpResource, IMcpResourceTemplate, IMcpServer, IMcpService } from '../common/mcpTypes.js';
export declare class McpResourcePickHelper {
    private readonly _mcpService;
    private readonly _fileService;
    private readonly _quickInputService;
    private readonly _notificationService;
    private readonly _chatAttachmentResolveService;
    static sep(server: IMcpServer): IQuickPickSeparator;
    static item(resource: IMcpResource | IMcpResourceTemplate): IQuickPickItem;
    hasServersWithResources: import("../../../../base/common/observable.js").IObservableWithChange<boolean, void>;
    explicitServers?: IMcpServer[];
    constructor(_mcpService: IMcpService, _fileService: IFileService, _quickInputService: IQuickInputService, _notificationService: INotificationService, _chatAttachmentResolveService: IChatAttachmentResolveService);
    toAttachment(resource: IMcpResource | IMcpResourceTemplate): Promise<IChatRequestVariableEntry | undefined>;
    toURI(resource: IMcpResource | IMcpResourceTemplate): Promise<URI | undefined>;
    private _resourceToAttachment;
    private _resourceTemplateToAttachment;
    private _verifyUriIfNeeded;
    private _resourceTemplateToURI;
    private _promptForTemplateValue;
    getPicks(onChange: (value: Map<IMcpServer, (IMcpResourceTemplate | IMcpResource)[]>) => void, token?: CancellationToken): Promise<void[]>;
}
export declare abstract class AbstractMcpResourceAccessPick {
    private readonly _scopeTo;
    private readonly _instantiationService;
    private readonly _editorService;
    protected readonly _chatWidgetService: IChatWidgetService;
    private readonly _viewsService;
    constructor(_scopeTo: IMcpServer | undefined, _instantiationService: IInstantiationService, _editorService: IEditorService, _chatWidgetService: IChatWidgetService, _viewsService: IViewsService);
    protected applyToPick(picker: IQuickPick<IQuickPickItem, {
        useSeparators: true;
    }>, token: CancellationToken, runOptions?: IQuickAccessProviderRunOptions): DisposableStore;
}
export declare class McpResourceQuickPick extends AbstractMcpResourceAccessPick {
    private readonly _quickInputService;
    constructor(scopeTo: IMcpServer | undefined, instantiationService: IInstantiationService, editorService: IEditorService, chatWidgetService: IChatWidgetService, viewsService: IViewsService, _quickInputService: IQuickInputService);
    pick(token?: Readonly<CancellationToken>): Promise<void>;
}
export declare class McpResourceQuickAccess extends AbstractMcpResourceAccessPick implements IQuickAccessProvider {
    static readonly PREFIX = "mcpr ";
    defaultFilterValue: DefaultQuickAccessFilterValue;
    constructor(instantiationService: IInstantiationService, editorService: IEditorService, chatWidgetService: IChatWidgetService, viewsService: IViewsService);
    provide(picker: IQuickPick<IQuickPickItem, {
        useSeparators: true;
    }>, token: CancellationToken, runOptions?: IQuickAccessProviderRunOptions): IDisposable;
}
