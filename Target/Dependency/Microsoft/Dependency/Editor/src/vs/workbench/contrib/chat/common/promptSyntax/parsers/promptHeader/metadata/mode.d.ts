import { ChatMode } from '../../../../constants.js';
import { PromptEnumMetadata } from './base/enum.js';
import { FrontMatterRecord, FrontMatterToken } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Prompt `mode` metadata record inside the prompt header.
 */
export declare class PromptModeMetadata extends PromptEnumMetadata<ChatMode> {
    constructor(recordToken: FrontMatterRecord, languageId: string);
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `mode`.
     */
    static isModeRecord(token: FrontMatterToken): boolean;
}
