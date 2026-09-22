import { View, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from '../theme';

const UploadPreview = ({ fileName }: any) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={fileName.endsWith(".pdf") ? "file-pdf-box" : "file-image"} size={20} color={theme.text} />
      <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{fileName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: 'row',
    flex: 1,
    marginTop: 10,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UploadPreview;
