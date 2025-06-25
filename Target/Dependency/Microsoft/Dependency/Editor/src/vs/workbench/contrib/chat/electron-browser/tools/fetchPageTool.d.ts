import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { CountTokensCallback, IPreparedToolInvocation, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolProgress } from '../../common/languageModelToolsService.js';
export declare const FetchWebPageToolData: IToolData;
export declare class FetchWebPageTool implements IToolImpl {
    private readonly _readerModeService;
    private _alreadyApprovedDomains;
    constructor(_readerModeService: IWebContentExtractorService);
    invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, _token: CancellationToken): Promise<IToolResult>;
    prepareToolInvocation(parameters: any, token: CancellationToken): Promise<IPreparedToolInvocation | undefined>;
    private _parseUris;
    private _getPromptPartsForResults;
}
