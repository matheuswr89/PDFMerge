import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, StorageAccessFramework, writeAsStringAsync } from "expo-file-system/legacy";
import { startActivityAsync } from "expo-intent-launcher";
import { useEffect, useRef, useState } from "react";
import { FlatList, NativeEventEmitter, NativeModules, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

import { Button } from "./components/Button";
import Dropdown from "./components/Dropdown";
import Header from "./components/Header";
import Modal from "./components/Modal";
import UploadPreview from "./components/UploadPreview";
import { useTheme } from "./theme";

let dataModo = [
  { title: 'Selecione...', },
  { title: 'Retrato', },
  { title: 'Paisagem', }
];

// "Média" precisa ser o primeiro item: o Dropdown sempre exibe array[0] como
// valor inicial, e é esse o padrão que o estado `quality` já assume.
let dataQualidade = [
  { title: 'Média', },
  { title: 'Baixa', },
  { title: 'Alta', },
];

type Progress = { processed: number; total: number } | null;

export default function Home() {
  const theme = useTheme();
  const [document, setDocument] = useState<any[]>([]);
  const [pages, setPages] = useState<any>("0");
  const [modo, setModo] = useState<any>("");
  const [quality, setQuality] = useState<any>("Média");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [progress, setProgress] = useState<Progress>(null);
  const progressSubscription = useRef<{ remove: () => void } | null>(null);
  const orientationDropdownRef = useRef<any>(null);
  const qualityDropdownRef = useRef<any>(null);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], multiple: true, copyToCacheDirectory: true });
    if (result.canceled || !result.assets) {
      return;
    }
    setDocument(prevDocuments => {
      const existingUris = new Set(prevDocuments.map(doc => doc.uri));
      const newAssets = result.assets.filter(asset => !existingUris.has(asset.uri));
      return [...prevDocuments, ...newAssets];
    });
  }

  const continuarAcao = async () => {
    if (Number(pages) === 0 || pages === "") {
      alert(`Selecione uma quantidade de páginas por folha!`)
      return;
    }

    if (!modo || modo === "Selecione...") {
      alert(`Selecione a orientação da folha!`)
      return;
    }

    setProgress({ processed: 0, total: document.length });
    setModalVisible(true);

    const emitter = new NativeEventEmitter(NativeModules.PdfModule);
    progressSubscription.current = emitter.addListener("PdfModuleProgress", (event: Progress) => {
      setProgress(event);
    });

    try {
      const uris = document.map(doc => doc.uri)
      const allPages = await NativeModules.PdfModule.editPdf(uris, Number(pages), modo, quality)
      const localFolder: any = await AsyncStorage.getItem('@editpdf:LOCAL');

      if (!localFolder) {
        alert("Nenhuma pasta de destino selecionada.")
        return;
      }

      const baseName = document[0].name.replace(/\.pdf$/i, "");
      const uri = await StorageAccessFramework.createFileAsync(localFolder, `MERGED_${baseName}.pdf`, "application/pdf");
      await writeAsStringAsync(
        uri,
        allPages,
        {
          encoding: EncodingType.Base64,
        },
      );
      setDocument([]);
      setPages("0");
      setModo("");
      setQuality("Média");
      orientationDropdownRef.current?.reset();
      qualityDropdownRef.current?.selectIndex(0);
      await startActivityAsync('android.intent.action.VIEW', {
        data: uri,
        flags: 1,
        type: "application/pdf",
      });
    } catch (error) {
      console.error("Erro ao gerar o PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF.")
    } finally {
      progressSubscription.current?.remove();
      progressSubscription.current = null;
      setModalVisible(false);
      setProgress(null);
    }
  }

  useEffect(() => {
    return () => {
      progressSubscription.current?.remove();
    };
  }, []);

  function removerItem(index: number) {
    setDocument(prevDocuments => prevDocuments.filter((_, i) => i !== index));
  }

  const hasDocuments = document && document.length > 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Header />

      <Button onPress={pickDocument} text="Selecione um ou mais PDF ou imagem" showIcon={true} />

      {!hasDocuments && (
        <View style={[styles.card, styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialCommunityIcon name="file-outline" size={32} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum arquivo selecionado</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Toque no botão acima para escolher PDFs ou imagens
          </Text>
        </View>
      )}

      {hasDocuments &&
        <>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {document.length} {document.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
            </Text>
            <Text style={[styles.warning, { color: theme.danger }]}>Se desejar remover um item, basta clicar sobre ele.</Text>
            <FlatList
              data={document}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => removerItem(index)}
                  style={[styles.fileRow, { backgroundColor: theme.background, borderColor: theme.border }]}
                >
                  <UploadPreview fileName={item.name} previewImage={item.uri} />
                  <Icon name="remove" size={20} color={theme.danger} />
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `${item.uri}-${index}`}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.text, { color: theme.text }]}>Quantidade de páginas por folha</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Digite aqui..."
              placeholderTextColor={theme.placeholder}
              value={pages}
              keyboardType="numeric"
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                setPages(numericValue);
              }}
            />
            <Text style={[styles.text, { color: theme.text }]}>Orientação da folha</Text>
            <Dropdown ref={orientationDropdownRef} array={dataModo} setValor={setModo} />
            <Text style={[styles.text, { color: theme.text }]}>Qualidade das imagens</Text>
            <Dropdown ref={qualityDropdownRef} array={dataQualidade} setValor={setQuality} />
          </View>

          <Button onPress={continuarAcao} text="Gerar PDF" />
        </>}
      <Modal modalVisible={modalVisible} progress={progress} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  sectionLabel: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  warning: {
    alignSelf: "flex-start",
    fontSize: 13,
    marginBottom: 10,
  },
  fileRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
  text: {
    alignSelf: "flex-start",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    height: 44,
    width: 200,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
});
