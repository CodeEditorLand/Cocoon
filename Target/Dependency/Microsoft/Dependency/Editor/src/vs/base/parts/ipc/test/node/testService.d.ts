import { Event } from '../../../../common/event.js';
import { IChannel, IServerChannel } from '../../common/ipc.js';
export interface IMarcoPoloEvent {
    answer: string;
}
export interface ITestService {
    onMarco: Event<IMarcoPoloEvent>;
    marco(): Promise<string>;
    pong(ping: string): Promise<{
        incoming: string;
        outgoing: string;
    }>;
    cancelMe(): Promise<boolean>;
}
export declare class TestService implements ITestService {
    private readonly _onMarco;
    onMarco: Event<IMarcoPoloEvent>;
    marco(): Promise<string>;
    pong(ping: string): Promise<{
        incoming: string;
        outgoing: string;
    }>;
    cancelMe(): Promise<boolean>;
}
export declare class TestChannel implements IServerChannel {
    private testService;
    constructor(testService: ITestService);
    listen(_: unknown, event: string): Event<any>;
    call(_: unknown, command: string, ...args: any[]): Promise<any>;
}
export declare class TestServiceClient implements ITestService {
    private channel;
    get onMarco(): Event<IMarcoPoloEvent>;
    constructor(channel: IChannel);
    marco(): Promise<string>;
    pong(ping: string): Promise<{
        incoming: string;
        outgoing: string;
    }>;
    cancelMe(): Promise<boolean>;
}
