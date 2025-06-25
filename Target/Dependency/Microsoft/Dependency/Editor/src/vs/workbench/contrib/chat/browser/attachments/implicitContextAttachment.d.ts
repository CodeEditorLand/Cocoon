import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { IChatRequestImplicitVariableEntry } from '../../common/chatVariableEntries.js';
export declare class ImplicitContextAttachmentWidget extends Disposable {
    private readonly attachment;
    private readonly resourceLabels;
    private readonly contextKeyService;
    private readonly contextMenuService;
    private readonly labelService;
    private readonly menuService;
    private readonly fileService;
    private readonly languageService;
    private readonly modelService;
    private readonly hoverService;
    readonly domNode: HTMLElement;
    private readonly renderDisposables;
    constructor(attachment: IChatRequestImplicitVariableEntry, resourceLabels: ResourceLabels, contextKeyService: IContextKeyService, contextMenuService: IContextMenuService, labelService: ILabelService, menuService: IMenuService, fileService: IFileService, languageService: ILanguageService, modelService: IModelService, hoverService: IHoverService);
    private render;
}
