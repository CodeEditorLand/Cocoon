import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INotebookDocumentService } from '../../../services/notebook/common/notebookDocumentService.js';
import { IWorkspaceSymbol } from '../../search/common/search.js';
import { IChatContentInlineReference } from '../common/chatService.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
type ContentRefData = {
    readonly kind: 'symbol';
    readonly symbol: IWorkspaceSymbol;
} | {
    readonly kind?: undefined;
    readonly uri: URI;
    readonly range?: IRange;
};
export declare function renderFileWidgets(element: HTMLElement, instantiationService: IInstantiationService, chatMarkdownAnchorService: IChatMarkdownAnchorService, disposables: DisposableStore): void;
export declare class InlineAnchorWidget extends Disposable {
    private readonly element;
    readonly inlineReference: IChatContentInlineReference;
    private readonly notebookDocumentService;
    static readonly className = "chat-inline-anchor-widget";
    private readonly _chatResourceContext;
    readonly data: ContentRefData;
    private _isDisposed;
    constructor(element: HTMLAnchorElement | HTMLElement, inlineReference: IChatContentInlineReference, originalContextKeyService: IContextKeyService, contextMenuService: IContextMenuService, fileService: IFileService, hoverService: IHoverService, instantiationService: IInstantiationService, labelService: ILabelService, languageService: ILanguageService, menuService: IMenuService, modelService: IModelService, telemetryService: ITelemetryService, themeService: IThemeService, notebookDocumentService: INotebookDocumentService);
    dispose(): void;
    getHTMLElement(): HTMLElement;
    private getCellIndex;
}
export {};
