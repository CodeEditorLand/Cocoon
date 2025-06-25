import { IChatAgentData, IChatAgentService } from './chatAgents.js';
import { IParsedChatRequest } from './chatParserTypes.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
import { IPromptsService } from './promptSyntax/service/promptsService.js';
export interface IChatParserContext {
    /** Used only as a disambiguator, when the query references an agent that has a duplicate with the same name. */
    selectedAgent?: IChatAgentData;
    mode?: ChatMode;
}
export declare class ChatRequestParser {
    private readonly agentService;
    private readonly variableService;
    private readonly slashCommandService;
    private readonly promptsService;
    constructor(agentService: IChatAgentService, variableService: IChatVariablesService, slashCommandService: IChatSlashCommandService, promptsService: IPromptsService);
    parseChatRequest(sessionId: string, message: string, location?: ChatAgentLocation, context?: IChatParserContext): IParsedChatRequest;
    private tryToParseAgent;
    private tryToParseVariable;
    private tryToParseSlashCommand;
    private tryToParseDynamicVariable;
}
