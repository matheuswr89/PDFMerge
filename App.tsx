import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { getFolderPermission, getPermissions } from './src/hooks/permissions';
import Home from './src/Home';

export default function App() {
  useEffect(() => {
    getPermissions();
    getFolderPermission();
  }, [])

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
