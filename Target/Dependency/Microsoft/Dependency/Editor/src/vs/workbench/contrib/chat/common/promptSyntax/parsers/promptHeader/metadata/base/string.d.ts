import { PromptMetadataRecord } from './record.js';
import { PromptMetadataDiagnostic } from '../../diagnostics.js';
import { FrontMatterSequence } from '../../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterRecord, FrontMatterString } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Base class for all metadata records with a `string` value.
 */
export declare abstract class PromptStringMetadata extends PromptMetadataRecord<string> {
    /**
     * Value token reference of the record.
     */
    protected valueToken: FrontMatterString | FrontMatterSequence | undefined;
    /**
     * String value of a metadata record.
     */
    get value(): string | undefined;
    constructor(expectedRecordName: string, recordToken: FrontMatterRecord, languageId: string);
    /**
     * Validate the metadata record has a 'string' value.
     */
    validate(): readonly PromptMetadataDiagnostic[];
}
