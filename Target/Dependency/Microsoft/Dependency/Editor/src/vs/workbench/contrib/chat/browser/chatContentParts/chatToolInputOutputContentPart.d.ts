import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';
import { ChatTreeItem, IChatCodeBlockInfo } from '../chat.js';
import { ICodeBlockRenderOptions } from '../codeBlockPart.js';
import { IChatContentPartRenderContext } from './chatContentParts.js';
import { EditorPool } from './chatMarkdownContentPart.js';
export interface IChatCollapsibleIOCodePart {
    kind: 'code';
    textModel: ITextModel;
    languageId: string;
    options: ICodeBlockRenderOptions;
    codeBlockInfo: IChatCodeBlockInfo;
}
export interface IChatCollapsibleIODataPart {
    kind: 'data';
    value: Uint8Array;
    mimeType: string | undefined;
    uri: URI;
}
export type ChatCollapsibleIOPart = IChatCollapsibleIOCodePart | IChatCollapsibleIODataPart;
export interface IChatCollapsibleInputData extends IChatCollapsibleIOCodePart {
}
export interface IChatCollapsibleOutputData {
    parts: ChatCollapsibleIOPart[];
}
export declare class ChatCollapsibleInputOutputContentPart extends Disposable {
    private readonly context;
    private readonly editorPool;
    private readonly input;
    private readonly output;
    private readonly contextKeyService;
    private readonly _instantiationService;
    private readonly _contextMenuService;
    private readonly _onDidChangeHeight;
    readonly onDidChangeHeight: import("../../../../workbench.web.main.internal.js").Event<void>;
    private _currentWidth;
    private readonly _editorReferences;
    private readonly _titlePart;
    readonly domNode: HTMLElement;
    readonly codeblocks: IChatCodeBlockInfo[];
    set title(s: string | IMarkdownString);
    get title(): string | IMarkdownString;
    private readonly _expanded;
    get expanded(): boolean;
    constructor(title: IMarkdownString | string, subtitle: string | IMarkdownString | undefined, context: IChatContentPartRenderContext, editorPool: EditorPool, input: IChatCollapsibleInputData, output: IChatCollapsibleOutputData | undefined, isError: boolean, initiallyExpanded: boolean, width: number, contextKeyService: IContextKeyService, _instantiationService: IInstantiationService, _contextMenuService: IContextMenuService);
    private createMessageContents;
    private addResourceGroup;
    private addCodeBlock;
    hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
    layout(width: number): void;
}
