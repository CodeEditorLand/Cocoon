import { PromptApplyToMetadata } from './metadata/applyTo.js';
import { HeaderBase, IHeaderMetadata, type TDehydrated } from './headerBase.js';
import { PromptsType } from '../../promptTypes.js';
import { FrontMatterRecord } from '../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Metadata utility object for instruction files.
 */
interface IInstructionsMetadata extends IHeaderMetadata {
    /**
     * Chat 'applyTo' metadata in the prompt header.
     */
    applyTo: PromptApplyToMetadata;
}
/**
 * Metadata for instruction files.
 */
export type TInstructionsMetadata = Partial<TDehydrated<IInstructionsMetadata>> & {
    promptType: PromptsType.instructions;
};
/**
 * Header object for instruction files.
 */
export declare class InstructionsHeader extends HeaderBase<IInstructionsMetadata> {
    protected handleToken(token: FrontMatterRecord): boolean;
}
export {};
