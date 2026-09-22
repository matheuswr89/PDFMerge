import { StyleSheet, Text, View } from "react-native";
import SelectDropdown from "react-native-select-dropdown";
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from "../theme";

export default function Dropdown({ array, setValor }: any) {
  const theme = useTheme();

  return (
    <SelectDropdown
      defaultValue={array[0]}
      data={array}
      onSelect={(selectedItem, index) => {
        setValor(selectedItem.title);
      }}
      renderButton={(selectedItem, isOpened) => {
        return (
          <View style={[styles.dropdownButtonStyle, { backgroundColor: theme.dropdownBackground }]}>
            <Text style={[styles.dropdownButtonTxtStyle, { color: theme.text }]}>
              {(selectedItem && selectedItem.title) || 'Selecione...'}
            </Text>
            <Icon name={isOpened ? 'chevron-up' : 'chevron-down'} style={[styles.dropdownButtonArrowStyle, { color: theme.text }]} />
          </View>
        );
      }}
      renderItem={(item, index, isSelected) => {
        return (
          <View style={[styles.dropdownItemStyle, { backgroundColor: isSelected ? theme.dropdownItemSelected : theme.dropdownBackground }]}>
            <Text style={[styles.dropdownItemTxtStyle, { color: theme.text }]}>{item.title}</Text>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
      dropdownStyle={[styles.dropdownMenuStyle, { backgroundColor: theme.dropdownBackground }]}
    />
  )
}

const styles = StyleSheet.create({
  dropdownButtonStyle: {
    width: 200,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dropdownButtonTxtStyle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  dropdownButtonArrowStyle: {
    fontSize: 28,
  },
  dropdownButtonIconStyle: {
    fontSize: 28,
    marginRight: 8,
  },
  dropdownMenuStyle: {
    borderRadius: 8,
    marginTop: -40
  },
  dropdownItemStyle: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dropdownItemTxtStyle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
});
