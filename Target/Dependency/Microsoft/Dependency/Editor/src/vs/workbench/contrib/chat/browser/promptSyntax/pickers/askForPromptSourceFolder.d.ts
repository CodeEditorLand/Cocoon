import { URI } from '../../../../../../base/common/uri.js';
import { ServicesAccessor } from '../../../../../../editor/browser/editorExtensions.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IPromptPath } from '../../../common/promptSyntax/service/promptsService.js';
/**
 * Asks the user for a specific prompt folder, if multiple folders provided.
 */
export declare function askForPromptSourceFolder(accessor: ServicesAccessor, type: PromptsType, existingFolder?: URI | undefined, isMove?: boolean): Promise<IPromptPath | undefined>;
