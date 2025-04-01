import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, StorageAccessFramework, writeAsStringAsync } from "expo-file-system";
import { startActivityAsync } from "expo-intent-launcher";
import { useState } from "react";
import { FlatList, NativeModules, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";

import { Button } from "./components/Button";
import Dropdown from "./components/Dropdown";
import Modal from "./components/Modal";
import UploadPreview from "./components/UploadPreview";

let dataModo = [
  { title: 'Selecione...', },
  { title: 'Retrato', },
  { title: 'Paisagem', }
];

export default function Home() {
  const [document, setDocument] = useState<any[]>([]);
  const [pages, setPages] = useState<any>("0");
  const [modo, setModo] = useState<any>("0");
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const pickDocument = async () => {
    let result: any = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], multiple: true, copyToCacheDirectory: true });
    let newArray = result.assets
    setDocument(newArray);
  }

  const continuarAcao = async () => {
    if (pages === 0 || pages === "") {
      alert(`Selecione uma quantidade de páginas por folha!`)
      return;
    }

    setModalVisible(true);
    const uris = document.map(doc => doc.uri)
    const allPages = await NativeModules.PdfModule.editPdf(uris, Number(pages), modo)
    const localFolder: any = await AsyncStorage.getItem('@editpdf:LOCAL');

    if (String(allPages).match("ERROR")) {
      setModalVisible(false);
      alert("Ocorreu um erro ao gerar o PDF.")
      return;
    }

    const uri = await StorageAccessFramework.createFileAsync(localFolder, `MERGED_${document[0].name}.pdf`, "application/pdf");
    await writeAsStringAsync(
      uri,
      allPages,
      {
        encoding: EncodingType.Base64,
      },
    ).then(() => setDocument([]));
    setModalVisible(false);
    await startActivityAsync('android.intent.action.VIEW', {
      data: uri,
      flags: 1,
      type: "application/pdf",
    });
  }

  function removerItem(index: number) {
    setDocument(prevDocuments => prevDocuments.filter((_, i) => i !== index));
  }

  return (
    <>
      <Button onPress={pickDocument} text="Selecione um ou mais PDF ou imagem" showIcon={true} />
      {document && document.length > 0 &&
        <>
          <View style={{ maxHeight: 200 }}>
            <Text style={{ color: "red", fontSize: 16 }}>Se desejar remover um item, basta clicar sobre ele.</Text>
            <FlatList
              data={document}
              renderItem={({ item, index }) => (
                <TouchableOpacity onPress={() => removerItem(index)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 5, borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 10 }}>
                  <UploadPreview fileName={item.name} previewImage={item.uri} />
                  <Icon name="remove" size={24} color="red" />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.name}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10, width: "100%" }}
            />
          </View>
          <Text style={styles.text}>Selecione a quantidade de páginas por folha:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite aqui..."
            value={pages}
            keyboardType="numeric"
            onChangeText={(text) => {
              const numericValue = text.replace(/[^0-9]/g, "");
              setPages(numericValue);
            }}
          />
          <Text style={styles.text}>Selecione a orientação da folha:</Text>
          <Dropdown array={dataModo} setValor={setModo} />
          <Button onPress={continuarAcao} text="Gerar PDF" />
        </>}
      <Modal modalVisible={modalVisible} />
    </>
  )
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 10,
  },
  input: {
    height: 40,
    width: 200,
    borderColor: "gray",
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});
