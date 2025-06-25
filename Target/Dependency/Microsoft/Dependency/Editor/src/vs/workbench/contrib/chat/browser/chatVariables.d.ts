import { IChatVariablesService, IDynamicVariable } from '../common/chatVariables.js';
import { IToolData, ToolSet } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
export declare class ChatVariablesService implements IChatVariablesService {
    private readonly chatWidgetService;
    _serviceBrand: undefined;
    constructor(chatWidgetService: IChatWidgetService);
    getDynamicVariables(sessionId: string): ReadonlyArray<IDynamicVariable>;
    getSelectedTools(sessionId: string): ReadonlyArray<IToolData>;
    getSelectedToolSets(sessionId: string): ReadonlyArray<ToolSet>;
}
