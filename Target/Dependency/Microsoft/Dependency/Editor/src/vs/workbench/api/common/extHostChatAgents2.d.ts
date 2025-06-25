import type * as vscode from 'vscode';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtensionDescription } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IChatAgentRequest, IChatAgentResult } from '../../contrib/chat/common/chatAgents.js';
import { IChatRelatedFile, IChatRequestDraft } from '../../contrib/chat/common/chatEditingService.js';
import { IChatFollowup, IChatUserActionEvent, IChatVoteAction } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { Dto } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostChatAgentsShape2, IChatAgentCompletionItem, IChatAgentHistoryEntryDto, IMainContext } from './extHost.protocol.js';
import { ExtHostCommands } from './extHostCommands.js';
import { ExtHostDiagnostics } from './extHostDiagnostics.js';
import { ExtHostDocuments } from './extHostDocuments.js';
import { ExtHostLanguageModels } from './extHostLanguageModels.js';
import { ExtHostLanguageModelTools } from './extHostLanguageModelTools.js';
export declare class ExtHostChatAgents2 extends Disposable implements ExtHostChatAgentsShape2 {
    private readonly _logService;
    private readonly _commands;
    private readonly _documents;
    private readonly _languageModels;
    private readonly _diagnostics;
    private readonly _tools;
    private static _idPool;
    private readonly _agents;
    private readonly _proxy;
    private static _participantDetectionProviderIdPool;
    private readonly _participantDetectionProviders;
    private static _relatedFilesProviderIdPool;
    private readonly _relatedFilesProviders;
    private readonly _sessionDisposables;
    private readonly _completionDisposables;
    private readonly _inFlightRequests;
    private readonly _onDidDisposeChatSession;
    readonly onDidDisposeChatSession: import("../../workbench.web.main.internal.js").Event<string>;
    constructor(mainContext: IMainContext, _logService: ILogService, _commands: ExtHostCommands, _documents: ExtHostDocuments, _languageModels: ExtHostLanguageModels, _diagnostics: ExtHostDiagnostics, _tools: ExtHostLanguageModelTools);
    transferActiveChat(newWorkspace: vscode.Uri): void;
    createChatAgent(extension: IExtensionDescription, id: string, handler: vscode.ChatExtendedRequestHandler): vscode.ChatParticipant;
    createDynamicChatAgent(extension: IExtensionDescription, id: string, dynamicProps: vscode.DynamicChatParticipantProps, handler: vscode.ChatExtendedRequestHandler): vscode.ChatParticipant;
    registerChatParticipantDetectionProvider(extension: IExtensionDescription, provider: vscode.ChatParticipantDetectionProvider): vscode.Disposable;
    registerRelatedFilesProvider(extension: IExtensionDescription, provider: vscode.ChatRelatedFilesProvider, metadata: vscode.ChatRelatedFilesProviderMetadata): vscode.Disposable;
    $provideRelatedFiles(handle: number, request: IChatRequestDraft, token: CancellationToken): Promise<Dto<IChatRelatedFile>[] | undefined>;
    $detectChatParticipant(handle: number, requestDto: Dto<IChatAgentRequest>, context: {
        history: IChatAgentHistoryEntryDto[];
    }, options: {
        location: ChatAgentLocation;
        participants?: vscode.ChatParticipantMetadata[];
    }, token: CancellationToken): Promise<vscode.ChatParticipantDetectionResult | null | undefined>;
    private _createRequest;
    private getModelForRequest;
    $setRequestPaused(handle: number, requestId: string, isPaused: boolean): Promise<void>;
    $invokeAgent(handle: number, requestDto: Dto<IChatAgentRequest>, context: {
        history: IChatAgentHistoryEntryDto[];
    }, token: CancellationToken): Promise<IChatAgentResult | undefined>;
    private getDiagnosticsWhenEnabled;
    private getToolsForRequest;
    private prepareHistoryTurns;
    $releaseSession(sessionId: string): void;
    $provideFollowups(requestDto: Dto<IChatAgentRequest>, handle: number, result: IChatAgentResult, context: {
        history: IChatAgentHistoryEntryDto[];
    }, token: CancellationToken): Promise<IChatFollowup[]>;
    $acceptFeedback(handle: number, result: IChatAgentResult, voteAction: IChatVoteAction): void;
    $acceptAction(handle: number, result: IChatAgentResult, event: IChatUserActionEvent): void;
    $invokeCompletionProvider(handle: number, query: string, token: CancellationToken): Promise<IChatAgentCompletionItem[]>;
    $provideChatTitle(handle: number, context: IChatAgentHistoryEntryDto[], token: CancellationToken): Promise<string | undefined>;
}
