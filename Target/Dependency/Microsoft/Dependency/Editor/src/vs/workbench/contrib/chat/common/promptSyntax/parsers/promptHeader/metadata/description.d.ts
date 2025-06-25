import { PromptStringMetadata } from './base/string.js';
import { FrontMatterRecord, FrontMatterToken } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Prompt `description` metadata record inside the prompt header.
 */
export declare class PromptDescriptionMetadata extends PromptStringMetadata {
    get recordName(): string;
    constructor(recordToken: FrontMatterRecord, languageId: string);
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `description`.
     */
    static isDescriptionRecord(token: FrontMatterToken): boolean;
}
