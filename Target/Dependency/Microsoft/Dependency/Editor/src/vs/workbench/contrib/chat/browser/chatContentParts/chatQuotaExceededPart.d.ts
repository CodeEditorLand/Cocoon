import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IChatErrorDetailsPart, IChatRendererContent, IChatResponseViewModel } from '../../common/chatViewModel.js';
import { IChatWidgetService } from '../chat.js';
import { IChatContentPart } from './chatContentParts.js';
export declare class ChatQuotaExceededPart extends Disposable implements IChatContentPart {
    private readonly content;
    readonly domNode: HTMLElement;
    private readonly _onDidChangeHeight;
    readonly onDidChangeHeight: import("../../../../workbench.web.main.internal.js").Event<void>;
    constructor(element: IChatResponseViewModel, content: IChatErrorDetailsPart, renderer: MarkdownRenderer, chatWidgetService: IChatWidgetService, commandService: ICommandService, telemetryService: ITelemetryService, chatEntitlementService: IChatEntitlementService);
    hasSameContent(other: IChatRendererContent): boolean;
    addDisposable(disposable: IDisposable): void;
}
