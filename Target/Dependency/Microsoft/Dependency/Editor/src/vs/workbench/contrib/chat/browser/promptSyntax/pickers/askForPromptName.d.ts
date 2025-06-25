import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ServicesAccessor } from '../../../../../../editor/browser/editorExtensions.js';
/**
 * Asks the user for a file name.
 */
export declare function askForPromptFileName(accessor: ServicesAccessor, type: PromptsType, selectedFolder: URI, existingFileName?: string): Promise<string | undefined>;
