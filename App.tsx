import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import Home from './src/Home';
import { getFolderPermission, getPermissions } from './src/hooks/permissions';

export default function App() {
  useEffect(() => {
    //getPermissions();
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
