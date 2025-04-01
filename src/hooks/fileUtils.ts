import * as FileSystem from "expo-file-system";

const checkIfFolderExists = async (folderUri: string): Promise<boolean> => {
  try {
    await FileSystem.StorageAccessFramework.readDirectoryAsync(folderUri);
    return true; // Se conseguiu listar os arquivos, a pasta existe
  } catch (error) {
    console.error("Erro ao verificar a pasta:", error);
    return false;
  }
};

export { checkIfFolderExists };

