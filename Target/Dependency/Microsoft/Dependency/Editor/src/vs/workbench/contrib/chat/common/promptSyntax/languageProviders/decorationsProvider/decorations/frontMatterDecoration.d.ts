import { Position } from '../../../../../../../../editor/common/core/position.js';
import { ColorIdentifier } from '../../../../../../../../platform/theme/common/colorUtils.js';
import { BaseToken } from '../../../codecs/base/baseToken.js';
import { FrontMatterHeader } from '../../../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
import { IReactiveDecorationClassNames, TAddAccessor, TDecorationStyles } from './utils/types.js';
/**
 * Decoration CSS class names.
 */
export declare enum CssClassNames {
    Main = ".prompt-front-matter-decoration",
    Inline = ".prompt-front-matter-decoration-inline",
    MainInactive = ".prompt-front-matter-decoration.prompt-decoration-inactive",
    InlineInactive = ".prompt-front-matter-decoration-inline.prompt-decoration-inactive"
}
/**
 * Main background color of `active` Front Matter header block.
 */
export declare const BACKGROUND_COLOR: ColorIdentifier;
/**
 * Background color of `inactive` Front Matter header block.
 */
export declare const INACTIVE_BACKGROUND_COLOR: ColorIdentifier;
/**
 * CSS styles for the decoration.
 */
export declare const CSS_STYLES: {
    ".prompt-front-matter-decoration": string[];
    ".prompt-front-matter-decoration.prompt-decoration-inactive": string[];
    ".prompt-front-matter-decoration-inline.prompt-decoration-inactive": string[];
};
/**
 * Editor decoration for the Front Matter header token inside a prompt.
 */
export declare class FrontMatterDecoration extends ReactiveDecorationBase<FrontMatterHeader, CssClassNames> {
    constructor(accessor: TAddAccessor, token: FrontMatterHeader);
    setCursorPosition(position: Position | null | undefined): this is {
        readonly changed: true;
    };
    protected get classNames(): IReactiveDecorationClassNames<CssClassNames>;
    protected get isWholeLine(): boolean;
    protected get description(): string;
    static get cssStyles(): TDecorationStyles;
    /**
     * Whether current decoration class can decorate provided token.
     */
    static handles(token: BaseToken): token is FrontMatterHeader;
}
