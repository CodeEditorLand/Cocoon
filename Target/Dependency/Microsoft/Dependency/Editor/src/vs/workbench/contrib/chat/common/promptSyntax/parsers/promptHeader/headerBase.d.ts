import { type TModeMetadata } from './modeHeader.js';
import { type TPromptMetadata } from './promptHeader.js';
import { type IMetadataRecord } from './metadata/base/record.js';
import { PromptDescriptionMetadata } from './metadata/index.js';
import { type TInstructionsMetadata } from './instructionsHeader.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { type TDiagnostic } from './diagnostics.js';
import { FrontMatterRecord } from '../../codecs/base/frontMatterCodec/tokens/index.js';
import { FrontMatterHeader } from '../../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
/**
 * A metadata utility class "dehydrated" into a plain data object with
 * semi-primitive record values (string, boolean, string[], boolean[], etc.).
 */
export type TDehydrated<T extends IHeaderMetadata> = {
    [K in keyof T]: T[K] extends IMetadataRecord<infer U> ? (U extends undefined ? undefined : NonNullable<U>) : undefined;
};
/**
 * Metadata defined in the prompt header.
 */
export interface IHeaderMetadata {
    /**
     * Description metadata in the prompt header.
     */
    description: PromptDescriptionMetadata;
}
/**
 * Metadata for prompt/instruction/mode files.
 */
export type THeaderMetadata = Partial<TDehydrated<IHeaderMetadata>>;
/**
 * Metadata defined in the header of prompt/instruction/mode files.
 */
export type TMetadata = TPromptMetadata | TModeMetadata | TInstructionsMetadata;
/**
 * Base class for prompt/instruction/mode headers.
 */
export declare abstract class HeaderBase<TMetadata extends IHeaderMetadata> extends Disposable {
    readonly token: FrontMatterHeader;
    readonly languageId: string;
    /**
     * Underlying decoder for a Front Matter header.
     */
    private readonly stream;
    /**
     * Metadata records.
     */
    protected readonly meta: Partial<TMetadata>;
    /**
     * Data object with all header's metadata records.
     */
    get metadata(): Partial<TDehydrated<TMetadata>>;
    /**
     * A copy of metadata object with utility classes as values
     * for each of prompt header's record.
     *
     * Please use {@link metadata} instead if all you need to read is
     * the plain "data" object representation of valid metadata records.
     */
    get metadataUtility(): Partial<TMetadata>;
    /**
     * List of all unique metadata record names.
     */
    private readonly recordNames;
    /**
     * List of all issues found while parsing the prompt header.
     */
    protected readonly issues: TDiagnostic[];
    /**
     * List of all diagnostic issues found while parsing
     * the prompt header.
     */
    get diagnostics(): readonly TDiagnostic[];
    /**
     * Full range of the header in the original document.
     */
    get range(): Range;
    constructor(token: FrontMatterHeader, languageId: string);
    /**
     * Process a front matter record token, which includes:
     *  - validation of the record and whether it is compatible with other header records
     *  - adding validation-related diagnostic messages to the {@link issues} list
     *  - setting associated utility class for the record on the {@link meta} object
     *
     * @returns a boolean flag that indicates whether the token was handled and therefore
     *          should not be processed any further.
     */
    protected abstract handleToken(token: FrontMatterRecord): boolean;
    /**
     * Process front matter tokens, converting them into
     * well-known prompt metadata records.
     */
    private onData;
    /**
     * Process errors from the underlying front matter decoder.
     */
    private onError;
    /**
     * Promise that resolves when parsing process of
     * the prompt header completes.
     */
    get settled(): Promise<void>;
    /**
     * Starts the parsing process of the prompt header.
     */
    start(): this;
}
