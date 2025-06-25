import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { TextModelPromptParser } from '../../common/promptSyntax/parsers/textModelPromptParser.js';
import { IChatPromptSlashCommand, ICustomChatMode, IMetadata, IPromptParserResult, IPromptPath, IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
export declare class MockPromptsService implements IPromptsService {
    _serviceBrand: undefined;
    getAllMetadata(_files: readonly URI[]): Promise<readonly IMetadata[]>;
    getSyntaxParserFor(_model: ITextModel): TextModelPromptParser & {
        isDisposed: false;
    };
    listPromptFiles(_type: PromptsType): Promise<readonly IPromptPath[]>;
    getSourceFolders(_type: PromptsType): readonly IPromptPath[];
    asPromptSlashCommand(command: string): IChatPromptSlashCommand | undefined;
    resolvePromptSlashCommand(_data: IChatPromptSlashCommand, _token: CancellationToken): Promise<IPromptParserResult | undefined>;
    findPromptSlashCommands(): Promise<IChatPromptSlashCommand[]>;
    onDidChangeCustomChatModes: Event<void>;
    getCustomChatModes(token: CancellationToken): Promise<readonly ICustomChatMode[]>;
    parse(uri: URI, token: CancellationToken): Promise<IPromptParserResult>;
    getPromptFileType(resource: URI): PromptsType | undefined;
    dispose(): void;
}
