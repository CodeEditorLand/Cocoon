import { CancellationToken } from '../../../../base/common/cancellation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IChatService } from '../../chat/common/chatService.js';
import { IMcpElicitationService, IMcpServer, IMcpToolCallContext } from '../common/mcpTypes.js';
import { MCP } from '../common/modelContextProtocol.js';
export declare class McpElicitationService implements IMcpElicitationService {
    private readonly _notificationService;
    private readonly _quickInputService;
    private readonly _chatService;
    readonly _serviceBrand: undefined;
    constructor(_notificationService: INotificationService, _quickInputService: IQuickInputService, _chatService: IChatService);
    elicit(server: IMcpServer, context: IMcpToolCallContext | undefined, elicitation: MCP.ElicitRequest['params'], token: CancellationToken): Promise<MCP.ElicitResult>;
    private _doElicit;
    private _getFieldPlaceholder;
    private _handleEnumField;
    private _handleInputField;
    private _validateInput;
    private _validateString;
    private _validateStringFormat;
    private _validateNumber;
}
