import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IMcpServerContainer, IWorkbenchMcpServer } from '../common/mcpTypes.js';
export declare abstract class McpServerWidget extends Disposable implements IMcpServerContainer {
    private _mcpServer;
    get mcpServer(): IWorkbenchMcpServer | null;
    set mcpServer(mcpServer: IWorkbenchMcpServer | null);
    update(): void;
    abstract render(): void;
}
export declare function onClick(element: HTMLElement, callback: () => void): IDisposable;
export declare class McpServerIconWidget extends McpServerWidget {
    private readonly disposables;
    private readonly element;
    private readonly iconElement;
    private readonly defaultIconElement;
    private iconUrl;
    constructor(container: HTMLElement);
    private clear;
    render(): void;
}
export declare class PublisherWidget extends McpServerWidget {
    readonly container: HTMLElement;
    private small;
    private readonly hoverService;
    private readonly openerService;
    private element;
    private containerHover;
    private readonly disposables;
    constructor(container: HTMLElement, small: boolean, hoverService: IHoverService, openerService: IOpenerService);
    private clear;
    render(): void;
}
export declare class InstallCountWidget extends McpServerWidget {
    readonly container: HTMLElement;
    private small;
    private readonly hoverService;
    private readonly disposables;
    constructor(container: HTMLElement, small: boolean, hoverService: IHoverService);
    private clear;
    render(): void;
    static getInstallLabel(extension: IWorkbenchMcpServer, small: boolean): string | undefined;
}
export declare class RatingsWidget extends McpServerWidget {
    readonly container: HTMLElement;
    private small;
    private readonly hoverService;
    private containerHover;
    private readonly disposables;
    constructor(container: HTMLElement, small: boolean, hoverService: IHoverService);
    private clear;
    render(): void;
}
