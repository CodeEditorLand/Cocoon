import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatWidgetService, IChatWidget } from '../../chat/browser/chat.js';
export declare function openPanelChatAndGetWidget(viewsService: IViewsService, chatService: IChatWidgetService): Promise<IChatWidget | undefined>;
