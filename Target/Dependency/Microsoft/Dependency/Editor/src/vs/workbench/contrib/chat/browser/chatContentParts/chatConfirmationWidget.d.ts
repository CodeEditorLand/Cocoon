import { Emitter, Event } from '../../../../../base/common/event.js';
import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import './media/chatConfirmationWidget.css';
export interface IChatConfirmationButton {
    label: string;
    isSecondary?: boolean;
    tooltip?: string;
    data: any;
    disabled?: boolean;
    onDidChangeDisablement?: Event<boolean>;
    moreActions?: IChatConfirmationButton[];
}
export declare class ChatQueryTitlePart extends Disposable {
    private readonly element;
    private _title;
    private readonly _renderer;
    private readonly _openerService;
    private readonly _onDidChangeHeight;
    readonly onDidChangeHeight: Event<void>;
    private readonly _renderedTitle;
    get title(): string | IMarkdownString;
    set title(value: string | IMarkdownString);
    constructor(element: HTMLElement, _title: IMarkdownString | string, subtitle: string | IMarkdownString | undefined, _renderer: MarkdownRenderer, _openerService: IOpenerService);
    private toMdString;
}
declare abstract class BaseChatConfirmationWidget extends Disposable {
    protected readonly instantiationService: IInstantiationService;
    private readonly _configurationService;
    private readonly _hostService;
    private _onDidClick;
    get onDidClick(): Event<IChatConfirmationButton>;
    protected _onDidChangeHeight: Emitter<void>;
    get onDidChangeHeight(): Event<void>;
    private _domNode;
    get domNode(): HTMLElement;
    private get showingButtons();
    setShowButtons(showButton: boolean): void;
    private readonly messageElement;
    protected readonly markdownRenderer: MarkdownRenderer;
    constructor(title: string | IMarkdownString, subtitle: string | IMarkdownString | undefined, buttons: IChatConfirmationButton[], instantiationService: IInstantiationService, contextMenuService: IContextMenuService, _configurationService: IConfigurationService, _hostService: IHostService);
    protected renderMessage(element: HTMLElement, listContainer: HTMLElement): void;
}
export declare class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    private readonly _container;
    private _renderedMessage;
    constructor(title: string | IMarkdownString, subtitle: string | IMarkdownString | undefined, message: string | IMarkdownString, buttons: IChatConfirmationButton[], _container: HTMLElement, instantiationService: IInstantiationService, contextMenuService: IContextMenuService, configurationService: IConfigurationService, hostService: IHostService);
    updateMessage(message: string | IMarkdownString): void;
}
export declare class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title: string | IMarkdownString, subtitle: string | IMarkdownString | undefined, messageElement: HTMLElement, buttons: IChatConfirmationButton[], container: HTMLElement, instantiationService: IInstantiationService, contextMenuService: IContextMenuService, configurationService: IConfigurationService, hostService: IHostService);
}
export {};
