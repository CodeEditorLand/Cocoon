import { PromptToolsMetadata, PromptModeMetadata } from './metadata/index.js';
import { HeaderBase, IHeaderMetadata, type TDehydrated } from './headerBase.js';
import { PromptsType } from '../../promptTypes.js';
import { FrontMatterRecord } from '../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Metadata utility object for prompt files.
 */
export interface IPromptMetadata extends IHeaderMetadata {
    /**
     * Tools metadata in the prompt header.
     */
    tools: PromptToolsMetadata;
    /**
     * Chat mode metadata in the prompt header.
     */
    mode: PromptModeMetadata;
}
/**
 * Metadata for prompt files.
 */
export type TPromptMetadata = Partial<TDehydrated<IPromptMetadata>> & {
    promptType: PromptsType.prompt;
};
/**
 * Header object for prompt files.
 */
export declare class PromptHeader extends HeaderBase<IPromptMetadata> {
    protected handleToken(token: FrontMatterRecord): boolean;
    /**
     * Check if value of `tools` and `mode` metadata
     * are compatible with each other.
     */
    private get toolsAndModeCompatible();
    /**
     * Validate that the `tools` and `mode` metadata are compatible
     * with each other. If not, add a warning diagnostic.
     */
    private validateToolsAndModeCompatibility;
}
