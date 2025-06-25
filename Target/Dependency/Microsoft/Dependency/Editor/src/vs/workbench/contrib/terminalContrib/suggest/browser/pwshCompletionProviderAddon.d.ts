import { ITerminalCompletionProvider } from './terminalCompletionService.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import type { ITerminalAddon, Terminal } from '@xterm/xterm';
import { Event } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { GeneralShellType } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/capabilities.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ITerminalCompletion } from './terminalCompletionItem.js';
export declare const enum VSCodeSuggestOscPt {
    Completions = "Completions"
}
export type CompressedPwshCompletion = [
    completionText: string,
    resultType: number,
    toolTip?: string,
    customIcon?: string
];
export type PwshCompletion = {
    CompletionText: string;
    ResultType: number;
    ToolTip?: string;
    CustomIcon?: string;
};
declare const enum RequestCompletionsSequence {
    Contextual = "\u001B[24~e"
}
export declare class PwshCompletionProviderAddon extends Disposable implements ITerminalAddon, ITerminalCompletionProvider {
    private readonly _configurationService;
    static readonly ID = "pwsh-shell-integration";
    id: string;
    triggerCharacters?: string[] | undefined;
    isBuiltin?: boolean;
    readonly shellTypes: GeneralShellType[];
    private _lastUserDataTimestamp;
    private _terminal?;
    private _mostRecentCompletion?;
    private _promptInputModel?;
    private _enableWidget;
    isPasting: boolean;
    private _completionsDeferred;
    private readonly _onDidReceiveCompletions;
    readonly onDidReceiveCompletions: Event<void>;
    private readonly _onDidRequestSendText;
    readonly onDidRequestSendText: Event<RequestCompletionsSequence>;
    constructor(capabilities: ITerminalCapabilityStore, _configurationService: IConfigurationService);
    activate(xterm: Terminal): void;
    private _handleVSCodeSequence;
    private _handleCompletionsSequence;
    private _resolveCompletions;
    private _getCompletionsPromise;
    provideCompletions(value: string, cursorPosition: number, allowFallbackCompletions: boolean, token: CancellationToken): Promise<ITerminalCompletion[] | undefined>;
}
export declare function parseCompletionsFromShell(rawCompletions: PwshCompletion | PwshCompletion[] | CompressedPwshCompletion[] | CompressedPwshCompletion, replacementIndex: number, replacementLength: number): ITerminalCompletion[];
export {};
