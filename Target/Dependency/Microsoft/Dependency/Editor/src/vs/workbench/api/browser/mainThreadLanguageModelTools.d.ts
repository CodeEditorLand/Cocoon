import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILanguageModelToolsService, IToolInvocation, IToolProgressStep, IToolResult } from '../../contrib/chat/common/languageModelToolsService.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { Dto, SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { IToolDataDto, MainThreadLanguageModelToolsShape } from '../common/extHost.protocol.js';
export declare class MainThreadLanguageModelTools extends Disposable implements MainThreadLanguageModelToolsShape {
    private readonly _languageModelToolsService;
    private readonly _proxy;
    private readonly _tools;
    private readonly _runningToolCalls;
    constructor(extHostContext: IExtHostContext, _languageModelToolsService: ILanguageModelToolsService);
    private getToolDtos;
    $getTools(): Promise<IToolDataDto[]>;
    $invokeTool(dto: IToolInvocation, token?: CancellationToken): Promise<Dto<IToolResult> | SerializableObjectWithBuffers<Dto<IToolResult>>>;
    $acceptToolProgress(callId: string, progress: IToolProgressStep): void;
    $countTokensForInvocation(callId: string, input: string, token: CancellationToken): Promise<number>;
    $registerTool(id: string): void;
    $unregisterTool(name: string): void;
}
