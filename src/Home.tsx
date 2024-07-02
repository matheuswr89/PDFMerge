import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, StorageAccessFramework, writeAsStringAsync } from "expo-file-system";
import { startActivityAsync } from "expo-intent-launcher";
import { useState } from "react";
import { Animated, NativeModules, StyleSheet, Text } from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Button } from "./components/Button";
import Dropdown from "./components/Dropdown";
import Modal from "./components/Modal";
import UploadPreview from "./components/UploadPreview";

let dataValores = [
  { title: 'Selecione...', },
  { title: '1', },
  { title: '2', },
  { title: '3', },
  { title: '4', },
  { title: '5', },
  { title: '6', },
  { title: '7', },
  { title: '8', },
  { title: '9', }
];
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
    if (pages === "Selecione...") {
      alert(`Selecione uma quantidade de páginas por folha!`)
      return;
    }
    setModalVisible(true);
    const uris = document.map(doc => doc.uri)
    console.log(uris)
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
  return (
    <>
      <Button onPress={pickDocument} text="Selecione um ou mais PDF ou imagem" showIcon={true} />
      {document.length > 0 &&
        <>
          {document.map((doc: any) => <UploadPreview fileName={doc.name} previewImage={doc.uri} key={doc.name} />)}
          <Text style={styles.text}>Selecione a quantidade de páginas por folha:</Text>
          <Dropdown array={dataValores} setValor={setPages} />
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
  }
});
