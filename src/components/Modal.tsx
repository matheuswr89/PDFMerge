import { Modal as ReactNativeModal, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { useTheme } from '../theme';

type Progress = { processed: number; total: number } | null;

export default function Modal({ modalVisible, progress }: { modalVisible: boolean; progress?: Progress }) {
  const theme = useTheme();
  const hasProgress = !!progress && progress.total > 0;
  const percent = hasProgress ? Math.min(100, Math.round((progress!.processed / progress!.total) * 100)) : 0;

  return (
      <ReactNativeModal animationType="fade"
        transparent={true}
        visible={modalVisible}>
        <View style={[styles.centeredView, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalView, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.modalText, { color: theme.text }]}>
              {hasProgress
                ? `Processando ${progress!.processed} de ${progress!.total} arquivos...`
                : "Aguarde o PDF ser gerado..."}
            </Text>
            {hasProgress && (
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${percent}%` }]} />
              </View>
            )}
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
    minWidth: 240,
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
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
})
