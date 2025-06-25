import { PromptStringMetadata } from './base/string.js';
import { PromptMetadataDiagnostic } from '../diagnostics.js';
import { FrontMatterRecord, FrontMatterToken } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Prompt `applyTo` metadata record inside the prompt header.
 */
export declare class PromptApplyToMetadata extends PromptStringMetadata {
    constructor(recordToken: FrontMatterRecord, languageId: string);
    get recordName(): string;
    validate(): readonly PromptMetadataDiagnostic[];
    /**
     * Check if a provided string contains a valid glob pattern.
     */
    private isValidGlob;
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `applyTo`.
     */
    static isApplyToRecord(token: FrontMatterToken): boolean;
}
