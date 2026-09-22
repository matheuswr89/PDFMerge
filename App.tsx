import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Home from './src/Home';
import { checkIfFolderExists } from './src/hooks/fileUtils';
import { getFolderPermission } from './src/hooks/permissions';
import { useTheme } from './src/theme';

export default function App() {
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

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
          await requestPermissions();
        } else {
          setLoading(false);
        }
      } else {
        await requestPermissions();
      }
    }

    folderExists();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Solicitando permissões...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Home />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
