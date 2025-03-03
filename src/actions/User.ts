import pdos from "../Core";

export interface User {
  name?: string;
  profileImageHash?: string;
}

export const updateInfo = async (name?: string, profileImageHash?: string) => {
  const user = pdos().tree.root;

  await user.update({
    name,
    profileImageHash,
  });

  await pdos().tree.root.syncLocalRootHash();
};

export const getInfo = async (): Promise<User> => {
  const user = await pdos().tree.root;
  return user._rawNode.data;
};
