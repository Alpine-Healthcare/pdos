import pdos from "../Core"

export const clearMessages = async () => {
  await pdos().tree.root.edges.e_out_Inbox.clearMessages()
}

export const getMessages = async () => {
  return pdos().tree.root.edges.e_out_Inbox._rawNode.unread_messages
}

export const addMessage = async (message: string) => {
  return pdos().tree.root.edges.e_out_Inbox._rawNode.unread_messages
}