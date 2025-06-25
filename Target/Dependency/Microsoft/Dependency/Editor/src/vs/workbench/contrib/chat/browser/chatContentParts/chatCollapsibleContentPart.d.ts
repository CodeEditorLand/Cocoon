import { Emitter } from '../../../../../base/common/event.js';
import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../base/common/observable.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';
import { ChatTreeItem } from '../chat.js';
import { IChatContentPart, IChatContentPartRenderContext } from './chatContentParts.js';
export declare abstract class ChatCollapsibleContentPart extends Disposable implements IChatContentPart {
    private readonly title;
    protected readonly context: IChatContentPartRenderContext;
    private _domNode?;
    protected readonly _onDidChangeHeight: Emitter<void>;
    readonly onDidChangeHeight: import("../../../../workbench.web.main.internal.js").Event<void>;
    protected readonly hasFollowingContent: boolean;
    protected _isExpanded: import("../../../../../base/common/observable.js").ISettableObservable<boolean, void>;
    constructor(title: IMarkdownString | string, context: IChatContentPartRenderContext);
    get domNode(): HTMLElement;
    protected init(): HTMLElement;
    protected abstract initContent(): HTMLElement;
    abstract hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
    private updateAriaLabel;
    addDisposable(disposable: IDisposable): void;
    get expanded(): IObservable<boolean>;
    protected isExpanded(): boolean;
    protected setExpanded(value: boolean): void;
}
