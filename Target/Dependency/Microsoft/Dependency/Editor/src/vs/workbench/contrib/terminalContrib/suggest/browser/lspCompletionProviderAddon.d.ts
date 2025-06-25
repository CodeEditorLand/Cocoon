import type { ITerminalAddon, Terminal } from '@xterm/xterm';
import { Disposable, IReference } from '../../../../../base/common/lifecycle.js';
import { ITerminalCompletionProvider, type TerminalCompletionList } from './terminalCompletionService.js';
import type { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ITerminalCompletion, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { IResolvedTextEditorModel } from '../../../../../editor/common/services/resolverService.js';
import { CompletionItemLabel, CompletionItemProvider } from '../../../../../editor/common/languages.js';
import { LspTerminalModelContentProvider } from './lspTerminalModelContentProvider.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
export declare class LspCompletionProviderAddon extends Disposable implements ITerminalAddon, ITerminalCompletionProvider {
    readonly id = "lsp";
    readonly isBuiltin = true;
    readonly triggerCharacters?: string[];
    private _provider;
    private _textVirtualModel;
    private _lspTerminalModelContentProvider;
    constructor(provider: CompletionItemProvider, textVirtualModel: IReference<IResolvedTextEditorModel>, lspTerminalModelContentProvider: LspTerminalModelContentProvider);
    activate(terminal: Terminal): void;
    provideCompletions(value: string, cursorPosition: number, allowFallbackCompletions: false, token: CancellationToken): Promise<ITerminalCompletion[] | TerminalCompletionList<ITerminalCompletion> | undefined>;
}
export declare function createCompletionItemPython(cursorPosition: number, prefix: string, kind: TerminalCompletionItemKind, label: string | CompletionItemLabel, detail: string | undefined): TerminalCompletionItem;
export interface TerminalCompletionItem {
    /**
     * The label of the completion.
     */
    label: string | CompletionItemLabel;
    /**
     * The index of the start of the range to replace.
     */
    replacementIndex: number;
    /**
     * The length of the range to replace.
     */
    replacementLength: number;
    /**
     * The completion's detail which appears on the right of the list.
     */
    detail?: string;
    /**
     * A human-readable string that represents a doc-comment.
     */
    documentation?: string | MarkdownString;
    /**
     * The completion's kind. Note that this will map to an icon.
     */
    kind?: TerminalCompletionItemKind;
}
