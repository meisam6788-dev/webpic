import React from 'react';
import { TouchableOpacity, Text, Linking, StyleSheet } from 'react-native';

export const BugReport = () => {
  const handleBugReport = () => {
    // ایمیل خود را به جای your-email@gmail.com قرار دهید
    Linking.openURL('mailto:your-email@gmail.com?subject=گزارش خطای اپلیکیشن وب‌پیک&body=لطفاً مشکل خود را اینجا بنویسید: ');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleBugReport}>
      <Text style={styles.text}>گزارش خطا / پشتیبانی</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
    margin: 10,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
  }
});