import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../base/common/observable.js';
import { IProgressStep } from '../../../../../platform/progress/common/progress.js';
import { CountTokensCallback, ILanguageModelToolsService, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolSet } from '../../common/languageModelToolsService.js';
export declare class MockLanguageModelToolsService implements ILanguageModelToolsService {
    _serviceBrand: undefined;
    constructor();
    cancelToolCallsForRequest(requestId: string): void;
    onDidChangeTools: Event<void>;
    registerToolData(toolData: IToolData): IDisposable;
    resetToolAutoConfirmation(): void;
    setToolAutoConfirmation(toolId: string, scope: 'workspace' | 'profile', autoConfirm?: boolean): void;
    registerToolImplementation(name: string, tool: IToolImpl): IDisposable;
    getTools(): Iterable<Readonly<IToolData>>;
    getTool(id: string): IToolData | undefined;
    getToolByName(name: string, includeDisabled?: boolean): IToolData | undefined;
    acceptProgress(sessionId: string | undefined, callId: string, progress: IProgressStep): void;
    invokeTool(dto: IToolInvocation, countTokens: CountTokensCallback, token: CancellationToken): Promise<IToolResult>;
    toolSets: IObservable<readonly ToolSet[]>;
    getToolSetByName(name: string): ToolSet | undefined;
    createToolSet(): ToolSet & IDisposable;
    toEnablementMap(toolOrToolSetNames: Iterable<string>): Record<string, boolean>;
}
