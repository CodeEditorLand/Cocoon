import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { UriComponents } from '../../../../../base/common/uri.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { CountTokensCallback, IPreparedToolInvocation, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolProgress } from '../../common/languageModelToolsService.js';
export declare const ExtensionEditToolId = "vscode_editFile";
export declare const InternalEditToolId = "vscode_editFile_internal";
export declare const EditToolData: IToolData;
export interface EditToolParams {
    uri: UriComponents;
    explanation: string;
    code: string;
}
export declare class EditTool implements IToolImpl {
    private readonly chatService;
    private readonly codeMapperService;
    private readonly notebookService;
    constructor(chatService: IChatService, codeMapperService: ICodeMapperService, notebookService: INotebookService);
    invoke(invocation: IToolInvocation, countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult>;
    prepareToolInvocation(parameters: any, token: CancellationToken): Promise<IPreparedToolInvocation | undefined>;
}
