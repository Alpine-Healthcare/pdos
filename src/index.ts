import pdos, { Core } from "./Core";
import { DataGroup, getAllRecords, sync, getGroup } from "./actions/Data";
import { clear, get, add, Inbox } from "./actions/Inbox";
import {
  addTreatment,
  getActive,
  getActiveTreatments,
  getTreatmentBinaryForTreatment,
  getTreatmentInstances,
  enable,
  disable,
  Treatment,
  hardDelete,
  all,
  TreatmentInstance,
} from "./actions/Treatments";
import PDOSNode from "./tree/base/PDOSNode";
import { updateInfo, getInfo, User, updatePushToken } from "./actions/User";

export const actions = {
  inbox: {
    get,
    clear,
    add,
  },
  treatments: {
    all,
    hardDelete,
    getActive,
    getActiveTreatments,
    getTreatmentInstances,
    getTreatmentBinaryForTreatment,
    addTreatment,
    enable,
    disable,
  },
  data: {
    sync,
    getAllRecords,
    getGroup,
  },
  user: {
    updateInfo,
    getInfo,
    updatePushToken,
  },
};

export type { User, Treatment, Inbox, TreatmentInstance, DataGroup };
export { Core, PDOSNode, pdos };
