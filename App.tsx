import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import Home from './src/Home';
import { checkIfFolderExists } from './src/hooks/fileUtils';
import { getFolderPermission, getPermissions } from './src/hooks/permissions';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        await getFolderPermission();
      } catch (error) {
        console.error("Erro ao solicitar permissões:", error);
      } finally {
        setLoading(false);
      }
    };

    const folderExists = async () => {
      const localFolder: any = await AsyncStorage.getItem('@editpdf:LOCAL');
      if (localFolder) {
        const exists = await checkIfFolderExists(localFolder);
        if (!exists) {
          await AsyncStorage.removeItem("@editpdf:LOCAL");
          requestPermissions();
        }
      } else requestPermissions();
      setLoading(false);
    }

    folderExists();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Solicitando permissões...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Home />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
