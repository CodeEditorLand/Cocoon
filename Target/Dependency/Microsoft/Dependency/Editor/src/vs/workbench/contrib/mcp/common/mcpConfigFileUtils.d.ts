import { Location } from '../../../../editor/common/languages.js';
import { ITextModel } from '../../../../editor/common/model.js';
export declare const getMcpServerMapping: (opts: {
    model: ITextModel;
    pathToServers: string[];
}) => Map<string, Location>;
