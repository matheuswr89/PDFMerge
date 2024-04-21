import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UploadPreview = ({ fileName }: any) => {
  return (
    <View style={styles.container}>
      <Icon name={fileName.endsWith(".pdf")? "file-pdf-box": "file-image"} size={20}/>
      <Text style={styles.fileName}>{fileName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    flexDirection: 'row',
    width: 200,
    marginTop: 10
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UploadPreview;
