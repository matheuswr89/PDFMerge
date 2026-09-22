import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from '../theme';

export const Button = ({ onPress, text, showIcon }: any) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.button, { backgroundColor: theme.primary }]}>
      {showIcon && <Icon name="cloud-upload-outline" size={24} color={theme.onPrimary} style={styles.icon} />}
      <Text style={[styles.text, { color: theme.onPrimary }]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  text: { fontSize: 16, fontWeight: '600' },
  icon: { marginRight: 10 }
})
