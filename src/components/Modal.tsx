import { Modal as ReactNativeModal, StyleSheet, Text, Pressable, View, ActivityIndicator } from 'react-native';


export default function Modal({ modalVisible }: any) {
  return (
      <ReactNativeModal animationType="fade"
        transparent={false}
        visible={modalVisible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ActivityIndicator size="large" />
            <Text style={styles.modalText}>Aguarde o PDF ser gerado...</Text>
          </View></View>
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
    backgroundColor: 'white',
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
    marginBottom: 15,
    textAlign: 'center',
  },
})