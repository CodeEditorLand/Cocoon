import { IMarkdownString } from '../../../../../../base/common/htmlContent.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IChatToolInvocation, IChatToolInvocationSerialized } from '../../../common/chatService.js';
import { IToolResultInputOutputDetails } from '../../../common/languageModelToolsService.js';
import { IChatCodeBlockInfo } from '../../chat.js';
import { IChatContentPartRenderContext } from '../chatContentParts.js';
import { EditorPool } from '../chatMarkdownContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export declare class ChatInputOutputMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    /** Remembers expanded tool parts on re-render */
    private static readonly _expandedByDefault;
    readonly domNode: HTMLElement;
    private _codeblocks;
    get codeblocks(): IChatCodeBlockInfo[];
    constructor(toolInvocation: IChatToolInvocation | IChatToolInvocationSerialized, context: IChatContentPartRenderContext, editorPool: EditorPool, codeBlockStartIndex: number, message: string | IMarkdownString, subtitle: string | IMarkdownString | undefined, input: string, output: IToolResultInputOutputDetails['output'] | undefined, isError: boolean, currentWidthDelegate: () => number, instantiationService: IInstantiationService, modelService: IModelService, languageService: ILanguageService);
}
