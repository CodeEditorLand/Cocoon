import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { PromptMetadataDiagnostic, PromptMetadataError, PromptMetadataWarning } from '../../diagnostics.js';
import { FrontMatterRecord } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Supported primitive types for metadata values in a prompt header.
 */
type TMetadataPrimitive = string | boolean;
/**
 * Supported metadata values in a prompt header.
 */
type TMetadataValue = TMetadataPrimitive | TMetadataPrimitive[];
/**
 * Interface for a generic metadata record in the prompt header.
 */
export interface IMetadataRecord<T extends TMetadataValue> {
    /**
     * Value of a metadata record. If the value is not defined, it usually
     * means that a record is present but its value is not set or valid.
     */
    readonly value: T | undefined;
}
/**
 * Abstract class for all metadata records in the prompt header.
 */
export declare abstract class PromptMetadataRecord<TValue extends TMetadataValue> implements IMetadataRecord<TValue> {
    protected readonly expectedRecordName: string;
    protected readonly recordToken: FrontMatterRecord;
    protected readonly languageId: string;
    /**
     * Private field for tracking all diagnostic issues
     * related to this metadata record.
     */
    protected readonly issues: PromptMetadataDiagnostic[];
    /**
     * Full range of the metadata's record text in the prompt header.
     */
    get range(): Range;
    constructor(expectedRecordName: string, recordToken: FrontMatterRecord, languageId: string);
    /**
     * Name of the metadata record.
     */
    get recordName(): string;
    /**
     * Validate the metadata record and collect all issues
     * related to its content.
     */
    abstract validate(): readonly PromptMetadataDiagnostic[];
    /**
     * List of all diagnostic issues related to this metadata record.
     */
    get diagnostics(): readonly PromptMetadataDiagnostic[];
    /**
     * Get the value of the metadata record.
     */
    abstract get value(): TValue | undefined;
    /**
     * List of all `error` issue diagnostics.
     */
    get errorDiagnostics(): readonly PromptMetadataError[];
    /**
     * List of all `warning` issue diagnostics.
     */
    get warningDiagnostics(): readonly PromptMetadataWarning[];
}
export {};
