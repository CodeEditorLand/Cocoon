import { IView } from '../../../../browser/ui/grid/grid.js';
import { GridNode } from '../../../../browser/ui/grid/gridview.js';
import { Event } from '../../../../common/event.js';
export declare class TestView implements IView {
    private _minimumWidth;
    private _maximumWidth;
    private _minimumHeight;
    private _maximumHeight;
    private readonly _onDidChange;
    readonly onDidChange: Event<{
        width: number;
        height: number;
    } | undefined>;
    get minimumWidth(): number;
    set minimumWidth(size: number);
    get maximumWidth(): number;
    set maximumWidth(size: number);
    get minimumHeight(): number;
    set minimumHeight(size: number);
    get maximumHeight(): number;
    set maximumHeight(size: number);
    private _element;
    get element(): HTMLElement;
    private readonly _onDidGetElement;
    readonly onDidGetElement: Event<void>;
    private _width;
    get width(): number;
    private _height;
    get height(): number;
    private _top;
    get top(): number;
    private _left;
    get left(): number;
    get size(): [number, number];
    private readonly _onDidLayout;
    readonly onDidLayout: Event<{
        width: number;
        height: number;
        top: number;
        left: number;
    }>;
    private readonly _onDidFocus;
    readonly onDidFocus: Event<void>;
    constructor(_minimumWidth: number, _maximumWidth: number, _minimumHeight: number, _maximumHeight: number);
    layout(width: number, height: number, top: number, left: number): void;
    focus(): void;
    dispose(): void;
}
export declare function nodesToArrays(node: GridNode): any;
