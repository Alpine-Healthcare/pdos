import { default as PDOSNode } from '../tree/base/PDOSNode';
export interface Treatment {
    name: string;
    treatmentName: string;
    treatmentBinaryHash: string;
    is_active: boolean;
    hashId: string;
    intake: object;
    active_on: string;
}
export interface TreatmentInstance {
    messages: {
        message: string;
        sender: string;
        sentOn: string;
    }[];
    date: string;
}
export declare const addTreatment: (name: string, hashId: string, intake: object) => Promise<void>;
export declare const getAll: () => Promise<PDOSNode[]>;
export declare const all: () => Promise<Treatment[]>;
export declare const getActiveTreatments: () => Promise<PDOSNode[]>;
export declare const hardDelete: (treatmentName: string) => Promise<void>;
export declare const getActive: () => Promise<Treatment[]>;
export declare const enable: (treatmentName: string) => Promise<void>;
export declare const disable: (treatmentName: string) => Promise<void>;
export declare const getTreatmentBinaryForTreatment: (treatment: PDOSNode) => Promise<PDOSNode>;
export declare const getTreatmentRaw: (treatment: string) => Promise<PDOSNode | undefined>;
export declare const getTreatment: (treatment: string) => Promise<PDOSNode | undefined>;
export declare const getTreatmentInstancesRaw: (treatment: string) => Promise<any[]>;
export declare const getTreatmentInstances: (treatment: string) => Promise<TreatmentInstance[]>;
//# sourceMappingURL=Treatments.d.ts.map