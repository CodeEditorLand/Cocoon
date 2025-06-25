import { type TDehydrated } from './headerBase.js';
import { PromptHeader, type IPromptMetadata } from './promptHeader.js';
import { PromptsType } from '../../promptTypes.js';
/**
 * Metadata utility object for mode files.
 */
interface IModeMetadata extends IPromptMetadata {
}
/**
 * Metadata for mode files.
 */
export type TModeMetadata = Partial<TDehydrated<IModeMetadata>> & {
    promptType: PromptsType.mode;
};
/**
 * Header object for mode files.
 */
export declare class ModeHeader extends PromptHeader {
}
export {};
