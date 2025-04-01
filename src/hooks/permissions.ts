import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAccessFramework } from "expo-file-system";
import { PermissionsAndroid } from "react-native";

const getPermissions = async () => {
  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    const isAllGranted = permissions.every(
      (permission) => granted[permission] === PermissionsAndroid.RESULTS.GRANTED
    );

    return isAllGranted;
  } catch (error) {
    console.error("Erro ao solicitar permissões de armazenamento:", error);
    return false;
  }
};

const getFolderPermission = async () => {
  try {
    const storedUri = await AsyncStorage.getItem("@editpdf:LOCAL");

    if (storedUri) {
      return storedUri;
    }

    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      console.warn("Permissão para acessar a pasta negada.");
      return null;
    }

    await AsyncStorage.setItem("@editpdf:LOCAL", permissions.directoryUri);
    return permissions.directoryUri;
  } catch (error) {
    console.error("Erro ao obter permissão de pasta:", error);
    return null;
  }
};

export { getFolderPermission, getPermissions };

