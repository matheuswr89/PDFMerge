import { useColorScheme } from "react-native";

export type Theme = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  inputBackground: string;
  placeholder: string;
  dropdownBackground: string;
  dropdownItemSelected: string;
  modalOverlay: string;
  statusBarStyle: "dark" | "light";
};

const lightColors: Theme = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  text: "#151E26",
  textSecondary: "#5B6673",
  border: "#D8DEE4",
  primary: "#2ECC71",
  onPrimary: "#FFFFFF",
  danger: "#E63946",
  inputBackground: "#FFFFFF",
  placeholder: "#8A94A3",
  dropdownBackground: "#E9ECEF",
  dropdownItemSelected: "#D2D9DF",
  modalOverlay: "rgba(15, 18, 22, 0.5)",
  statusBarStyle: "dark",
};

const darkColors: Theme = {
  background: "#121417",
  surface: "#1E2126",
  text: "#F2F4F7",
  textSecondary: "#9AA4B2",
  border: "#2C3038",
  primary: "#2ECC71",
  onPrimary: "#0B1F14",
  danger: "#FF6B6B",
  inputBackground: "#23262C",
  placeholder: "#6B7280",
  dropdownBackground: "#23262C",
  dropdownItemSelected: "#2F343C",
  modalOverlay: "rgba(0, 0, 0, 0.7)",
  statusBarStyle: "light",
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}
