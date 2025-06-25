import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { IOutputItemDto } from '../../common/notebookCommon.js';
import { ICellOutputViewModel, ICellViewModel } from '../notebookBrowser.js';
export declare function getAllOutputsText(notebook: NotebookTextModel, viewCell: ICellViewModel, shortErrors?: boolean): string;
export declare function getOutputStreamText(output: ICellOutputViewModel): {
    text: string;
    count: number;
};
export declare function getOutputText(mimeType: string, buffer: IOutputItemDto, shortError?: boolean): string;
export declare function copyCellOutput(mimeType: string | undefined, outputViewModel: ICellOutputViewModel, clipboardService: IClipboardService, logService: ILogService): Promise<void>;
export declare const TEXT_BASED_MIMETYPES: string[];
