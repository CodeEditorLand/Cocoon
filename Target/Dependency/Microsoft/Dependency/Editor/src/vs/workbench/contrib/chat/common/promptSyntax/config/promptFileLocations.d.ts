import { URI } from '../../../../../../base/common/uri.js';
import { PromptsType } from '../promptTypes.js';
/**
 * File extension for the reusable prompt files.
 */
export declare const PROMPT_FILE_EXTENSION = ".prompt.md";
/**
 * File extension for the reusable instruction files.
 */
export declare const INSTRUCTION_FILE_EXTENSION = ".instructions.md";
/**
 * File extension for the modes files.
 */
export declare const MODE_FILE_EXTENSION = ".chatmode.md";
/**
 * Copilot custom instructions file name.
 */
export declare const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = "copilot-instructions.md";
/**
 * Default reusable prompt files source folder.
 */
export declare const PROMPT_DEFAULT_SOURCE_FOLDER = ".github/prompts";
/**
 * Default reusable instructions files source folder.
 */
export declare const INSTRUCTIONS_DEFAULT_SOURCE_FOLDER = ".github/instructions";
/**
 * Default modes source folder.
 */
export declare const MODE_DEFAULT_SOURCE_FOLDER = ".github/chatmodes";
/**
 * Gets the prompt file type from the provided path.
 */
export declare function getPromptFileType(fileUri: URI): PromptsType | undefined;
/**
 * Check if provided URI points to a file that with prompt file extension.
 */
export declare function isPromptOrInstructionsFile(fileUri: URI): boolean;
export declare function getPromptFileExtension(type: PromptsType): string;
export declare function getPromptFileDefaultLocation(type: PromptsType): string;
/**
 * Gets clean prompt name without file extension.
 */
export declare function getCleanPromptName(fileUri: URI): string;
