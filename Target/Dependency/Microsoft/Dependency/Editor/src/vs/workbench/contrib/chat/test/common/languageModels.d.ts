import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IChatMessage, ILanguageModelChat, ILanguageModelChatMetadata, ILanguageModelChatResponse, ILanguageModelChatSelector, ILanguageModelsService } from '../../common/languageModels.js';
export declare class NullLanguageModelsService implements ILanguageModelsService {
    _serviceBrand: undefined;
    onDidChangeLanguageModels: Event<any>;
    getLanguageModelIds(): string[];
    lookupLanguageModel(identifier: string): ILanguageModelChatMetadata | undefined;
    selectLanguageModels(selector: ILanguageModelChatSelector): Promise<string[]>;
    registerLanguageModelChat(identifier: string, provider: ILanguageModelChat): IDisposable;
    sendChatRequest(identifier: string, from: ExtensionIdentifier, messages: IChatMessage[], options: {
        [name: string]: any;
    }, token: CancellationToken): Promise<ILanguageModelChatResponse>;
    computeTokenLength(identifier: string, message: string | IChatMessage, token: CancellationToken): Promise<number>;
}
