import { ITerminalProfiles } from '../../common/terminal.js';
export interface ITestTerminalConfig {
    profiles: ITerminalProfiles;
    useWslProfiles: boolean;
}
