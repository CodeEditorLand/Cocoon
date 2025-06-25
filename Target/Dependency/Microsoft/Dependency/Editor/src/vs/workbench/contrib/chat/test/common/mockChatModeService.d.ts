import { Event } from '../../../../../base/common/event.js';
import { IChatMode, IChatModeService } from '../../common/chatModes.js';
export declare class MockChatModeService implements IChatModeService {
    readonly _serviceBrand: undefined;
    private _modes;
    readonly onDidChangeChatModes: Event<any>;
    getModes(): {
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    };
    getModesAsync(): Promise<{
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    }>;
}
