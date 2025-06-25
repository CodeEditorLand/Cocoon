import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { IMarkdownString } from '../../../../base/common/htmlContent.js';
import { IJSONSchema } from '../../../../base/common/jsonSchema.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { Location } from '../../../../editor/common/languages.js';
import { ContextKeyExpression } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IProgress } from '../../../../platform/progress/common/progress.js';
import { IChatExtensionsContent, IChatTerminalToolInvocationData, IChatToolInputInvocationData } from './chatService.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IObservable, IReader, ITransaction, ObservableSet } from '../../../../base/common/observable.js';
export interface IToolData {
    id: string;
    source: ToolDataSource;
    toolReferenceName?: string;
    icon?: {
        dark: URI;
        light?: URI;
    } | ThemeIcon;
    when?: ContextKeyExpression;
    tags?: string[];
    displayName: string;
    userDescription?: string;
    modelDescription: string;
    inputSchema?: IJSONSchema;
    canBeReferencedInPrompt?: boolean;
    /**
     * True if the tool runs in the (possibly remote) workspace, false if it runs
     * on the host, undefined if known.
     */
    runsInWorkspace?: boolean;
    alwaysDisplayInputOutput?: boolean;
}
export interface IToolProgressStep {
    readonly message: string | IMarkdownString | undefined;
    readonly increment?: number;
    readonly total?: number;
}
export type ToolProgress = IProgress<IToolProgressStep>;
export type ToolDataSource = {
    type: 'extension';
    label: string;
    extensionId: ExtensionIdentifier;
} | {
    type: 'mcp';
    label: string;
    collectionId: string;
    definitionId: string;
} | {
    type: 'user';
    label: string;
    file: URI;
} | {
    type: 'internal';
    label: string;
};
export declare namespace ToolDataSource {
    const Internal: ToolDataSource;
    function toKey(source: ToolDataSource): string;
    function equals(a: ToolDataSource, b: ToolDataSource): boolean;
    function classify(source: ToolDataSource): {
        readonly ordinal: number;
        readonly label: string;
    };
}
export interface IToolInvocation {
    callId: string;
    toolId: string;
    parameters: Object;
    tokenBudget?: number;
    context: IToolInvocationContext | undefined;
    chatRequestId?: string;
    chatInteractionId?: string;
    toolSpecificData?: IChatTerminalToolInvocationData | IChatToolInputInvocationData | IChatExtensionsContent;
    modelId?: string;
}
export interface IToolInvocationContext {
    sessionId: string;
}
export declare function isToolInvocationContext(obj: any): obj is IToolInvocationContext;
export interface IToolResultInputOutputDetails {
    readonly input: string;
    readonly output: ({
        value: string;
        /** If true, value is text. If false or not given, value is base64 */
        isText?: boolean;
        /** Mimetype of the value, optional */
        mimeType?: string;
        /** URI of the resource on the MCP server. */
        uri?: URI;
        /** If true, this part came in as a resource reference rather than direct data. */
        asResource?: boolean;
    })[];
    readonly isError?: boolean;
}
export declare function isToolResultInputOutputDetails(obj: any): obj is IToolResultInputOutputDetails;
export interface IToolResult {
    content: (IToolResultPromptTsxPart | IToolResultTextPart | IToolResultDataPart)[];
    toolResultMessage?: string | IMarkdownString;
    toolResultDetails?: Array<URI | Location> | IToolResultInputOutputDetails;
    toolResultError?: string;
}
export declare function toolResultHasBuffers(result: IToolResult): boolean;
export interface IToolResultPromptTsxPart {
    kind: 'promptTsx';
    value: unknown;
}
export declare function stringifyPromptTsxPart(part: IToolResultPromptTsxPart): string;
export interface IToolResultTextPart {
    kind: 'text';
    value: string;
}
export interface IToolResultDataPart {
    kind: 'data';
    value: {
        mimeType: string;
        data: VSBuffer;
    };
}
export interface IToolConfirmationMessages {
    title: string | IMarkdownString;
    message: string | IMarkdownString;
    disclaimer?: string | IMarkdownString;
    allowAutoConfirm?: boolean;
}
export interface IPreparedToolInvocation {
    invocationMessage?: string | IMarkdownString;
    pastTenseMessage?: string | IMarkdownString;
    originMessage?: string | IMarkdownString;
    confirmationMessages?: IToolConfirmationMessages;
    presentation?: 'hidden' | undefined;
    toolSpecificData?: IChatTerminalToolInvocationData | IChatToolInputInvocationData | IChatExtensionsContent;
}
export interface IToolImpl {
    invoke(invocation: IToolInvocation, countTokens: CountTokensCallback, progress: ToolProgress, token: CancellationToken): Promise<IToolResult>;
    prepareToolInvocation?(parameters: any, token: CancellationToken): Promise<IPreparedToolInvocation | undefined>;
}
export declare class ToolSet {
    readonly id: string;
    readonly referenceName: string;
    readonly icon: ThemeIcon;
    readonly source: ToolDataSource;
    readonly description?: string | undefined;
    protected readonly _tools: ObservableSet<IToolData>;
    protected readonly _toolSets: ObservableSet<ToolSet>;
    /**
     * A homogenous tool set only contains tools from the same source as the tool set itself
     */
    readonly isHomogenous: IObservable<boolean>;
    constructor(id: string, referenceName: string, icon: ThemeIcon, source: ToolDataSource, description?: string | undefined);
    addTool(data: IToolData, tx?: ITransaction): IDisposable;
    addToolSet(toolSet: ToolSet, tx?: ITransaction): IDisposable;
    getTools(r?: IReader): Iterable<IToolData>;
}
export declare const ILanguageModelToolsService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ILanguageModelToolsService>;
export type CountTokensCallback = (input: string, token: CancellationToken) => Promise<number>;
export interface ILanguageModelToolsService {
    _serviceBrand: undefined;
    onDidChangeTools: Event<void>;
    registerToolData(toolData: IToolData): IDisposable;
    registerToolImplementation(id: string, tool: IToolImpl): IDisposable;
    getTools(): Iterable<Readonly<IToolData>>;
    getTool(id: string): IToolData | undefined;
    getToolByName(name: string, includeDisabled?: boolean): IToolData | undefined;
    invokeTool(invocation: IToolInvocation, countTokens: CountTokensCallback, token: CancellationToken): Promise<IToolResult>;
    setToolAutoConfirmation(toolId: string, scope: 'workspace' | 'profile' | 'memory', autoConfirm?: boolean): void;
    resetToolAutoConfirmation(): void;
    cancelToolCallsForRequest(requestId: string): void;
    toEnablementMap(toolOrToolSetNames: Iterable<string>): Record<string, boolean>;
    readonly toolSets: IObservable<Iterable<ToolSet>>;
    getToolSetByName(name: string): ToolSet | undefined;
    createToolSet(source: ToolDataSource, id: string, referenceName: string, options?: {
        icon?: ThemeIcon;
        description?: string;
    }): ToolSet & IDisposable;
}
export declare function createToolInputUri(toolOrId: IToolData | string): URI;
export declare function createToolSchemaUri(toolOrId: IToolData | string): URI;
