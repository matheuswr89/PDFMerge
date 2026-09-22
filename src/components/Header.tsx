import { StyleSheet, Text, View } from "react-native";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";

import { useTheme } from "../theme";

export default function Header() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
        <Icon name="file-pdf-box" size={26} color={theme.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.text }]}>PDF Merge</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Combine PDFs e imagens em um único arquivo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
