import { TDecorationStyles, IReactiveDecorationClassNames } from './utils/types.js';
import { FrontMatterMarker } from '../../../codecs/base/markdownExtensionsCodec/tokens/frontMatterMarker.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
/**
 * Decoration CSS class names.
 */
export declare enum CssClassNames {
    Main = ".prompt-front-matter-decoration-marker",
    Inline = ".prompt-front-matter-decoration-marker-inline",
    MainInactive = ".prompt-front-matter-decoration-marker.prompt-decoration-inactive",
    InlineInactive = ".prompt-front-matter-decoration-marker-inline.prompt-decoration-inactive"
}
/**
 * Editor decoration for a `marker` token of a Front Matter header.
 */
export declare class FrontMatterMarkerDecoration extends ReactiveDecorationBase<FrontMatterMarker, CssClassNames> {
    /**
     * Activate/deactivate the decoration.
     */
    activate(state: boolean): this;
    protected get classNames(): IReactiveDecorationClassNames<CssClassNames>;
    protected get description(): string;
    static get cssStyles(): TDecorationStyles;
}
