import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Location } from '../../../../../editor/common/languages.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatRequestImplicitVariableEntry, IChatRequestVariableEntry } from '../../common/chatVariableEntries.js';
import { IChatService } from '../../common/chatService.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
import { IChatWidgetService } from '../chat.js';
export declare class ChatImplicitContextContribution extends Disposable implements IWorkbenchContribution {
    private readonly codeEditorService;
    private readonly editorService;
    private readonly chatWidgetService;
    private readonly chatService;
    private readonly chatEditingService;
    private readonly configurationService;
    private readonly ignoredFilesService;
    static readonly ID = "chat.implicitContext";
    private readonly _currentCancelTokenSource;
    private _implicitContextEnablement;
    constructor(codeEditorService: ICodeEditorService, editorService: IEditorService, chatWidgetService: IChatWidgetService, chatService: IChatService, chatEditingService: IChatEditingService, configurationService: IConfigurationService, ignoredFilesService: ILanguageModelIgnoredFilesService);
    private findActiveCodeEditor;
    private findActiveNotebookEditor;
    private updateImplicitContext;
}
export declare class ChatImplicitContext extends Disposable implements IChatRequestImplicitVariableEntry {
    get id(): "vscode.implicit.file" | "vscode.implicit.selection" | "vscode.implicit.viewport" | "vscode.implicit";
    get name(): string;
    readonly kind = "implicit";
    get modelDescription(): string;
    readonly isFile = true;
    private _isSelection;
    get isSelection(): boolean;
    private _onDidChangeValue;
    readonly onDidChangeValue: Event<void>;
    private _value;
    get value(): URI | Location | undefined;
    private _enabled;
    get enabled(): boolean;
    set enabled(value: boolean);
    setValue(value: Location | URI | undefined, isSelection: boolean, languageId?: string): void;
    toBaseEntries(): IChatRequestVariableEntry[];
}
