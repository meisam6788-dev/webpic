import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, Image } from 'react-native';

export default function WatermarkOverlay({
    isActive,
    text,
    imageUri,
    fontSize,
    color,
    bgColor,
    fontFamily,
    opacity = 1,
    rotation = 0,
}: any) {
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const lastPan = useRef({ x: 0, y: 0 });
    const isActiveRef = useRef(isActive);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    useEffect(() => {
        const listener = pan.addListener((value) => {
            lastPan.current = value;
        });
        return () => {
            pan.removeListener(listener);
        };
    }, [pan]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isActiveRef.current,
            onMoveShouldSetPanResponder: () => isActiveRef.current,
            onPanResponderGrant: () => {
                pan.setOffset({ x: lastPan.current.x, y: lastPan.current.y });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            },
        })
    ).current;

    if (!text && !imageUri) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: opacity,
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { rotate: `${rotation}deg` } // اعمال چرخش
                    ]
                }
            ]}
            {...panResponder.panHandlers}
        >
            {imageUri ? (
                <View style={[styles.imageWrapper, { backgroundColor: bgColor }]}>
                    <Image
                        source={{ uri: imageUri }}
                        // سایز لوگو مستقیماً توسط اسلایدر تنظیم می‌شود
                        style={{ width: fontSize * 4, height: fontSize * 4 }}
                        resizeMode="contain"
                    />
                </View>
            ) : (
                <Text
                    style={{
                        fontSize: fontSize,
                        color: color,
                        backgroundColor: bgColor,
                        fontFamily: fontFamily,
                        fontWeight: 'bold',
                        padding: 8,
                        borderRadius: 6,
                        textShadowColor: 'rgba(0,0,0,0.8)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 4,
                    }}
                >
                    {text}
                </Text>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 20,
        padding: 10,
    },
    imageWrapper: {
        padding: 5,
        borderRadius: 8,
    }
});