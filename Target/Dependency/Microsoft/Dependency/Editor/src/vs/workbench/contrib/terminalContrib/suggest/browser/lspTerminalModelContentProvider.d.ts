import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextModelContentProvider, ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { ITerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/capabilities.js';
import { TerminalShellType } from '../../../../../platform/terminal/common/terminal.js';
export interface ILspTerminalModelContentProvider extends ITextModelContentProvider {
    setContent(content: string): void;
    dispose(): void;
}
export declare class LspTerminalModelContentProvider extends Disposable implements ILspTerminalModelContentProvider, ITextModelContentProvider {
    private readonly _modelService;
    private readonly _languageService;
    static readonly scheme = "vscode-terminal";
    private _commandDetection;
    private _capabilitiesStore;
    private readonly _virtualTerminalDocumentUri;
    private _shellType;
    private readonly _onCommandFinishedListener;
    constructor(capabilityStore: ITerminalCapabilityStore, terminalId: number, virtualTerminalDocument: URI, shellType: TerminalShellType | undefined, textModelService: ITextModelService, _modelService: IModelService, _languageService: ILanguageService);
    shellTypeChanged(shellType: TerminalShellType | undefined): void;
    /**
     * Sets or updates content for a terminal virtual document.
     * This is when user has executed succesful command in terminal.
     * Transfer the content to virtual document, and relocate delimiter to get terminal prompt ready for next prompt.
     */
    setContent(content: string): void;
    /**
     * Real-time conversion of terminal input to virtual document happens here.
     * This is when user types in terminal, and we want to track the input.
     * We want to track the input and update the virtual document.
     * Note: This is for non-executed command.
    */
    trackPromptInputToVirtualFile(content: string): void;
    private _registerTerminalCommandFinishedListener;
    provideTextContent(resource: URI): Promise<ITextModel | null>;
}
/**
 * Creates a terminal language virtual URI.
 */
export declare function createTerminalLanguageVirtualUri(terminalId: number, languageExtension: string): URI;
