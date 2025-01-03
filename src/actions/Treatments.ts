import pdos from "../Core"


export const addTreatment = async (name: string, hashId: string) => {
  pdos().stores.userAccount.edges.e_out_TreatmentManifest.addTreatment(name, hashId)
}

export const getActiveTreatments = () => {
  const activeTreatments =
    pdos().
      stores.
      userAccount?.
      edges?.
      e_out_TreatmentManifest?.
      treatments ?? []

  return activeTreatments
}

export const getTreatment = (treatment: string) => {
  return getActiveTreatments().find((t: any) => {
    return t._rawNode.treatment === treatment
  })
}

export const getTreatmentInstances = (treatment: string) => {
  const activeTreatment = getTreatment(treatment)

  if (!activeTreatment) {
    return []
  }

  const instances = Object.entries(activeTreatment.edges).filter(([key, value]: [string, any]) => {
    return key.startsWith("e_out_TreatmentInstance")
  })

  return instances.map(([key, value]: [string, any]) => {
    return value
  })
}
