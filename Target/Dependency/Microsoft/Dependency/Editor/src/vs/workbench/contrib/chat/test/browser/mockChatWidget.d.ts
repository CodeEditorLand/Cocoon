import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { IChatWidget, IChatWidgetService } from '../../browser/chat.js';
import { ChatAgentLocation } from '../../common/constants.js';
export declare class MockChatWidgetService implements IChatWidgetService {
    readonly onDidAddWidget: Event<IChatWidget>;
    readonly _serviceBrand: undefined;
    /**
     * Returns the most recently focused widget if any.
     */
    readonly lastFocusedWidget: IChatWidget | undefined;
    getWidgetByInputUri(uri: URI): IChatWidget | undefined;
    getWidgetBySessionId(sessionId: string): IChatWidget | undefined;
    getWidgetsByLocations(location: ChatAgentLocation): ReadonlyArray<IChatWidget>;
    getAllWidgets(): ReadonlyArray<IChatWidget>;
}
