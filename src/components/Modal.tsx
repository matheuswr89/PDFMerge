import { Modal as ReactNativeModal, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { useTheme } from '../theme';

export default function Modal({ modalVisible }: any) {
  const theme = useTheme();

  return (
      <ReactNativeModal animationType="fade"
        transparent={true}
        visible={modalVisible}>
        <View style={[styles.centeredView, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalView, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.modalText, { color: theme.text }]}>Aguarde o PDF ser gerado...</Text>
          </View>
        </View>
      </ReactNativeModal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginTop: 15,
    textAlign: 'center',
  },
})
