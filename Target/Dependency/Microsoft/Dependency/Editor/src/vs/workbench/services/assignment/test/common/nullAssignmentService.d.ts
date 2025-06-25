import { IWorkbenchAssignmentService } from '../../common/assignmentService.js';
export declare class NullWorkbenchAssignmentService implements IWorkbenchAssignmentService {
    _serviceBrand: undefined;
    getCurrentExperiments(): Promise<string[] | undefined>;
    getTreatment<T extends string | number | boolean>(name: string): Promise<T | undefined>;
}
