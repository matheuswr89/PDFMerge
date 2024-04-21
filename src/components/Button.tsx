import React, { useState } from 'react';
import { Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const Button = ({ onPress, text, showIcon }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: showIcon ? "#2ccc71" : "#2ecc71" }]}>
      {showIcon && <Icon name="cloud-upload-outline" size={24} color="white" style={styles.icon} />}
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10
  },
  text: { color: 'white', fontSize: 16 },
  icon: { marginRight: 10 }
})