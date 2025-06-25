import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IToolData, ToolSet } from '../../common/languageModelToolsService.js';
export declare function showToolsPicker(accessor: ServicesAccessor, placeHolder: string, toolsEntries?: ReadonlyMap<ToolSet | IToolData, boolean>, onUpdate?: (toolsEntries: ReadonlyMap<ToolSet | IToolData, boolean>) => void): Promise<ReadonlyMap<ToolSet | IToolData, boolean> | undefined>;
