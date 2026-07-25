import React from 'react';
import { StyleSheet, View } from 'react-native';

// در آینده این مقادیر را از استیت منیجر (State Manager) می‌گیریم تا کاربر با زدن یک دکمه، سایز کادر را تغییر دهد
export default function CropFrame({ width = 250, height = 250 }) {
    return (
        // ویژگی pointerEvents="none" باعث می‌شود این لایه هیچ لمسی را دریافت نکند و شما بتوانید عکس زیرین را حتی از داخل کادر جابه‌جا کنید
        <View style={styles.overlay} pointerEvents="none">

            {/* کادر برش که حالا ابعاد ثابت دارد و بعداً به صورت داینامیک تغییر می‌کند */}
            <View style={[styles.cropBox, { width: width, height: height }]}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    cropBox: {
        borderWidth: 1,
        borderColor: '#FFFFFF',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // یک هاله بسیار ملایم برای مشخص شدن محدوده خروجی
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: '#007AFF', // گوشه‌های آبی برای زیبایی بصری کادر
    },
    topLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: -2,
        right: -2,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
});