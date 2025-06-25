import { IChatVariablesService, IDynamicVariable } from '../../common/chatVariables.js';
import { IToolData, ToolSet } from '../../common/languageModelToolsService.js';
export declare class MockChatVariablesService implements IChatVariablesService {
    _serviceBrand: undefined;
    getDynamicVariables(sessionId: string): readonly IDynamicVariable[];
    getSelectedTools(sessionId: string): readonly IToolData[];
    getSelectedToolSets(sessionId: string): readonly ToolSet[];
}
