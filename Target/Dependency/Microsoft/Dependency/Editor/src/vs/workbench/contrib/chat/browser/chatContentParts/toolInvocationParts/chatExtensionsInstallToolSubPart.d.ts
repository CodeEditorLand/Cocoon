import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IExtensionManagementService } from '../../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { IChatCodeBlockInfo, IChatWidgetService } from '../../chat.js';
import { IChatContentPartRenderContext } from '../chatContentParts.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export declare class ExtensionsInstallConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    readonly domNode: HTMLElement;
    readonly codeblocks: IChatCodeBlockInfo[];
    constructor(toolInvocation: IChatToolInvocation, context: IChatContentPartRenderContext, keybindingService: IKeybindingService, contextKeyService: IContextKeyService, chatWidgetService: IChatWidgetService, extensionManagementService: IExtensionManagementService, instantiationService: IInstantiationService);
}
