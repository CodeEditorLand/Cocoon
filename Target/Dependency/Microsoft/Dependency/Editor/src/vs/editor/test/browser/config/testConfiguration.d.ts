import { EditorConfiguration, IEnvConfiguration } from '../../../browser/config/editorConfiguration.js';
import { BareFontInfo, FontInfo } from '../../../common/config/fontInfo.js';
import { TestCodeEditorCreationOptions } from '../testCodeEditor.js';
export declare class TestConfiguration extends EditorConfiguration {
    constructor(opts: Readonly<TestCodeEditorCreationOptions>);
    protected _readEnvConfiguration(): IEnvConfiguration;
    protected _readFontInfo(styling: BareFontInfo): FontInfo;
}
