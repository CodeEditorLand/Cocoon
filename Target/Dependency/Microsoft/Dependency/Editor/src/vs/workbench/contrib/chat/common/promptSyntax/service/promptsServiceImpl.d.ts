import { PromptsType } from '../promptTypes.js';
import { type URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../../base/common/event.js';
import { type ITextModel } from '../../../../../../editor/common/model.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { TextModelPromptParser } from '../parsers/textModelPromptParser.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import type { IChatPromptSlashCommand, ICustomChatMode, IMetadata, IPromptParserResult, IPromptPath, IPromptsService } from './promptsService.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Provides prompt services.
 */
export declare class PromptsService extends Disposable implements IPromptsService {
    readonly logger: ILogService;
    private readonly labelService;
    private readonly modelService;
    private readonly instantiationService;
    private readonly userDataService;
    private readonly languageService;
    private readonly configurationService;
    readonly _serviceBrand: undefined;
    /**
     * Cache of text model content prompt parsers.
     */
    private readonly cache;
    /**
     * Prompt files locator utility.
     */
    private readonly fileLocator;
    /**
     * Lazily created event that is fired when the custom chat modes change.
     */
    private onDidChangeCustomChatModesEvent;
    constructor(logger: ILogService, labelService: ILabelService, modelService: IModelService, instantiationService: IInstantiationService, userDataService: IUserDataProfileService, languageService: ILanguageService, configurationService: IConfigurationService);
    /**
     * Emitter for the custom chat modes change event.
     */
    get onDidChangeCustomChatModes(): Event<void>;
    getPromptFileType(uri: URI): PromptsType | undefined;
    /**
     * @throws {Error} if:
     * 	- the provided model is disposed
     * 	- newly created parser is disposed immediately on initialization.
     * 	  See factory function in the {@link constructor} for more info.
     */
    getSyntaxParserFor(model: ITextModel): TextModelPromptParser & {
        isDisposed: false;
    };
    listPromptFiles(type: PromptsType, token: CancellationToken): Promise<readonly IPromptPath[]>;
    getSourceFolders(type: PromptsType): readonly IPromptPath[];
    asPromptSlashCommand(command: string): IChatPromptSlashCommand | undefined;
    resolvePromptSlashCommand(data: IChatPromptSlashCommand, token: CancellationToken): Promise<IPromptParserResult | undefined>;
    private getPromptPath;
    findPromptSlashCommands(): Promise<IChatPromptSlashCommand[]>;
    getCustomChatModes(token: CancellationToken): Promise<readonly ICustomChatMode[]>;
    parse(uri: URI, token: CancellationToken): Promise<IPromptParserResult>;
    getAllMetadata(promptUris: readonly URI[]): Promise<IMetadata[]>;
}
export declare function getPromptCommandName(path: string): string;
