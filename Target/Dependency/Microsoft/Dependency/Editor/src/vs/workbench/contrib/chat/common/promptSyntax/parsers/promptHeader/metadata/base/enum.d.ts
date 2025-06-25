import { PromptStringMetadata } from './string.js';
import { PromptMetadataDiagnostic } from '../../diagnostics.js';
import { FrontMatterRecord } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Enum type is the special case of the {@link PromptStringMetadata string}
 * type that can take only a well-defined set of {@link validValues}.
 */
export declare abstract class PromptEnumMetadata<TValidValues extends string = string> extends PromptStringMetadata {
    private readonly validValues;
    constructor(validValues: readonly TValidValues[], expectedRecordName: string, recordToken: FrontMatterRecord, languageId: string);
    /**
     * Valid enum value or 'undefined'.
     */
    private enumValue;
    /**
     * Valid enum value or 'undefined'.
     */
    get value(): TValidValues | undefined;
    /**
     * Validate the metadata record has an allowed value.
     */
    validate(): readonly PromptMetadataDiagnostic[];
}
