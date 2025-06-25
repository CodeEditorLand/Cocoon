import type { ITextureAtlasPageGlyph } from '../../../../browser/gpu/atlas/atlas.js';
import { TextureAtlas } from '../../../../browser/gpu/atlas/textureAtlas.js';
export declare function assertIsValidGlyph(glyph: Readonly<ITextureAtlasPageGlyph> | undefined, atlasOrSource: TextureAtlas | OffscreenCanvas): void;
