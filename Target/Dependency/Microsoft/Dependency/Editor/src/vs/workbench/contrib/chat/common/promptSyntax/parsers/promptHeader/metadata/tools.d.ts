import { PromptMetadataRecord } from './base/record.js';
import { PromptMetadataDiagnostic } from '../diagnostics.js';
import { FrontMatterArray, FrontMatterRecord, FrontMatterToken } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Prompt `tools` metadata record inside the prompt header.
 */
export declare class PromptToolsMetadata extends PromptMetadataRecord<string[]> {
    /**
     * List of all valid tool names that were found in
     * this metadata record.
     */
    get value(): string[] | undefined;
    get recordName(): string;
    /**
     * Value token reference of the record.
     */
    protected valueToken: FrontMatterArray | undefined;
    /**
     * List of all valid tool names that were found in
     * this metadata record.
     */
    private validToolNames;
    constructor(recordToken: FrontMatterRecord, languageId: string);
    /**
     * Validate the metadata record and collect all issues
     * related to its content.
     */
    validate(): readonly PromptMetadataDiagnostic[];
    /**
     * Validate an individual provided value token that is used
     * for a tool name.
     */
    private validateToolName;
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `tools`.
     */
    static isToolsRecord(token: FrontMatterToken): boolean;
}
