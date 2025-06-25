import type { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { PromptsType } from '../promptTypes.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link PromptsConfig.KEY}, {@link PromptsConfig.PROMPT_LOCATIONS_KEY}, {@link PromptsConfig.INSTRUCTIONS_LOCATION_KEY} or {@link PromptsConfig.MODE_LOCATION_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export declare namespace PromptsConfig {
    /**
     * Configuration key for the `reusable prompts` feature
     * (also known as `prompt files`, `prompt instructions`, etc.).
     */
    const KEY = "chat.promptFiles";
    /**
     * Configuration key for the locations of reusable prompt files.
     */
    const PROMPT_LOCATIONS_KEY = "chat.promptFilesLocations";
    /**
     * Configuration key for the locations of instructions files.
     */
    const INSTRUCTIONS_LOCATION_KEY = "chat.instructionsFilesLocations";
    /**
     * Configuration key for the locations of mode files.
     */
    const MODE_LOCATION_KEY = "chat.modeFilesLocations";
    /**
     * Configuration key for use of the copilot instructions file.
     */
    const USE_COPILOT_INSTRUCTION_FILES = "github.copilot.chat.codeGeneration.useInstructionFiles";
    /**
     * Configuration key for the copilot instruction setting.
     */
    const COPILOT_INSTRUCTIONS = "github.copilot.chat.codeGeneration.instructions";
    /**
     * Checks if the feature is enabled.
     * @see {@link PromptsConfig.KEY}.
     */
    function enabled(configService: IConfigurationService): boolean;
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    const enabledCtx: import("../../../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression;
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link PROMPT_LOCATIONS_CONFIG_KEY}, {@link INSTRUCTIONS_LOCATIONS_CONFIG_KEY}, {@link MODE_LOCATIONS_CONFIG_KEY}.
     */
    function getLocationsValue(configService: IConfigurationService, type: PromptsType): Record<string, boolean> | undefined;
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link PROMPT_DEFAULT_SOURCE_FOLDER}, {@link INSTRUCTIONS_DEFAULT_SOURCE_FOLDER} or {@link MODE_DEFAULT_SOURCE_FOLDER}.
     */
    function promptSourceFolders(configService: IConfigurationService, type: PromptsType): string[];
}
export declare function getPromptFileLocationsConfigKey(type: PromptsType): string;
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
export declare function asBoolean(value: unknown): boolean | undefined;
