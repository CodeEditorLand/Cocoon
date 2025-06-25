import { IHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegate.js';
import * as event from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { Location, SymbolKind } from '../../../../editor/common/languages.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, IScopedContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IResourceLabel, ResourceLabels } from '../../../browser/labels.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { IChatContentReference } from '../common/chatService.js';
import { IChatRequestPasteVariableEntry, IChatRequestToolEntry, IChatRequestToolSetEntry, IChatRequestVariableEntry, IElementVariableEntry, INotebookOutputVariableEntry, IPromptFileVariableEntry, IPromptTextVariableEntry, ISCMHistoryItemVariableEntry } from '../common/chatVariableEntries.js';
import { ILanguageModelChatMetadataAndIdentifier, ILanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
declare abstract class AbstractChatAttachmentWidget extends Disposable {
    private readonly attachment;
    private readonly options;
    protected readonly hoverDelegate: IHoverDelegate;
    protected readonly currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined;
    protected readonly commandService: ICommandService;
    protected readonly openerService: IOpenerService;
    readonly element: HTMLElement;
    readonly label: IResourceLabel;
    private readonly _onDidDelete;
    get onDidDelete(): event.Event<Event>;
    private readonly _onDidOpen;
    get onDidOpen(): event.Event<void>;
    constructor(attachment: IChatRequestVariableEntry, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, commandService: ICommandService, openerService: IOpenerService);
    protected modelSupportsVision(): boolean;
    protected attachClearButton(): void;
    protected addResourceOpenHandlers(resource: URI, range: IRange | undefined): void;
    protected openResource(resource: URI, isDirectory: true): Promise<void>;
    protected openResource(resource: URI, isDirectory: false, range: IRange | undefined): Promise<void>;
}
export declare class FileAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly themeService;
    private readonly hoverService;
    private readonly languageModelsService;
    private readonly instantiationService;
    constructor(resource: URI, range: IRange | undefined, attachment: IChatRequestVariableEntry, correspondingContentReference: IChatContentReference | undefined, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, themeService: IThemeService, hoverService: IHoverService, languageModelsService: ILanguageModelsService, instantiationService: IInstantiationService);
    private renderOmittedWarning;
}
export declare class ImageAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly hoverService;
    private readonly languageModelsService;
    private readonly telemetryService;
    private readonly labelService;
    constructor(resource: URI | undefined, attachment: IChatRequestVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, hoverService: IHoverService, languageModelsService: ILanguageModelsService, telemetryService: ITelemetryService, instantiationService: IInstantiationService, labelService: ILabelService);
}
export declare class PasteAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly hoverService;
    private readonly instantiationService;
    constructor(attachment: IChatRequestPasteVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, hoverService: IHoverService, instantiationService: IInstantiationService);
}
export declare class DefaultChatAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly contextKeyService;
    private readonly instantiationService;
    constructor(resource: URI | undefined, range: IRange | undefined, attachment: IChatRequestVariableEntry, correspondingContentReference: IChatContentReference | undefined, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, contextKeyService: IContextKeyService, instantiationService: IInstantiationService);
}
export declare class PromptFileAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly labelService;
    private readonly promptService;
    private readonly instantiationService;
    private hintElement;
    constructor(attachment: IPromptFileVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, labelService: ILabelService, promptService: IPromptsService, instantiationService: IInstantiationService);
    private updateLabel;
}
export declare class PromptTextAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment: IPromptTextVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, preferencesService: IPreferencesService, hoverService: IHoverService);
}
export declare class ToolSetOrToolItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment: IChatRequestToolSetEntry | IChatRequestToolEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, toolsService: ILanguageModelToolsService, commandService: ICommandService, openerService: IOpenerService, hoverService: IHoverService);
}
export declare class NotebookCellOutputChatAttachmentWidget extends AbstractChatAttachmentWidget {
    private readonly hoverService;
    private readonly languageModelsService;
    private readonly notebookService;
    private readonly instantiationService;
    constructor(resource: URI, attachment: INotebookOutputVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, hoverService: IHoverService, languageModelsService: ILanguageModelsService, notebookService: INotebookService, instantiationService: IInstantiationService);
    getAriaLabel(attachment: INotebookOutputVariableEntry): string;
    private renderErrorOutput;
    private renderGenericOutput;
    private renderImageOutput;
    private getOutputItem;
}
export declare class ElementChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment: IElementVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, openerService: IOpenerService, editorService: IEditorService);
}
export declare class SCMHistoryItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment: ISCMHistoryItemVariableEntry, currentLanguageModel: ILanguageModelChatMetadataAndIdentifier | undefined, options: {
        shouldFocusClearButton: boolean;
        supportsDeletion: boolean;
    }, container: HTMLElement, contextResourceLabels: ResourceLabels, hoverDelegate: IHoverDelegate, commandService: ICommandService, hoverService: IHoverService, openerService: IOpenerService, themeService: IThemeService);
    private _openAttachment;
}
export declare function hookUpResourceAttachmentDragAndContextMenu(accessor: ServicesAccessor, widget: HTMLElement, resource: URI): IDisposable;
export declare function hookUpSymbolAttachmentDragAndContextMenu(accessor: ServicesAccessor, widget: HTMLElement, scopedContextKeyService: IScopedContextKeyService, attachment: {
    name: string;
    value: Location;
    kind: SymbolKind;
}, contextMenuId: MenuId): IDisposable;
export declare const chatAttachmentResourceContextKey: RawContextKey<string>;
export {};
