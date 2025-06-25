import { DeferredPromise } from '../../../../../base/common/async.js';
import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { IChatExtensionsContent, IChatTerminalToolInvocationData, IChatToolInputInvocationData, IChatToolInvocation, IChatToolInvocationSerialized } from '../chatService.js';
import { IPreparedToolInvocation, IToolConfirmationMessages, IToolData, IToolProgressStep, IToolResult } from '../languageModelToolsService.js';
export declare class ChatToolInvocation implements IChatToolInvocation {
    readonly toolCallId: string;
    readonly kind: 'toolInvocation';
    private _isComplete;
    get isComplete(): boolean;
    private _isCompleteDeferred;
    get isCompletePromise(): Promise<void>;
    private _confirmDeferred;
    get confirmed(): DeferredPromise<boolean>;
    private _isConfirmed;
    get isConfirmed(): boolean | undefined;
    private _resultDetails;
    get resultDetails(): IToolResult['toolResultDetails'] | undefined;
    readonly invocationMessage: string | IMarkdownString;
    readonly originMessage: string | IMarkdownString | undefined;
    pastTenseMessage: string | IMarkdownString | undefined;
    private _confirmationMessages;
    readonly presentation: IPreparedToolInvocation['presentation'];
    readonly toolId: string;
    readonly toolSpecificData?: IChatTerminalToolInvocationData | IChatToolInputInvocationData | IChatExtensionsContent;
    readonly progress: import("../../../../../base/common/observable.js").ISettableObservable<{
        message?: string | IMarkdownString;
        progress: number;
    }, void>;
    constructor(preparedInvocation: IPreparedToolInvocation | undefined, toolData: IToolData, toolCallId: string);
    complete(result: IToolResult | undefined): void;
    get confirmationMessages(): IToolConfirmationMessages | undefined;
    acceptProgress(step: IToolProgressStep): void;
    toJSON(): IChatToolInvocationSerialized;
}
