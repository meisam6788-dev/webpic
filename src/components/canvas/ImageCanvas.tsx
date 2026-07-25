import React, { useRef, useState, useEffect } from 'react';
import {
    Animated, PanResponder, StyleSheet, View, Text,
    TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, StatusBar, Alert, BackHandler
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEditorStore } from '../../store/useEditorStore';
import CropFrame from './CropFrame';
import WatermarkOverlay from './WatermarkOverlay';
import { useUndoRedo } from './useUndoRedo';

export default function ImageCanvas() {
    const { image, setImage } = useEditorStore();
    const viewShotRef = useRef<any>(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    const [activeCategory, setActiveCategory] = useState('crop');
    const [activeAdjustTool, setActiveAdjustTool] = useState('brightness');
    const [activeCropTool, setActiveCropTool] = useState('aspect');
    const [activeWatermarkTool, setActiveWatermarkTool] = useState('text');

    const { state: adjustments, updateState: setAdjustments, undo, redo, canUndo, canRedo } = useUndoRedo({ brightness: 0, contrast: 1, saturation: 1, warmth: 0 });

    // وضعیت‌های واترمارک
    const [wmText, setWmText] = useState('');
    const [wmSize, setWmSize] = useState(24);
    const [wmColor, setWmColor] = useState('#FFFFFF');
    const [wmBgColor, setWmBgColor] = useState('transparent');
    const [wmFont, setWmFont] = useState('System');
    const [wmImageUri, setWmImageUri] = useState<string | null>(null);
    const [wmOpacity, setWmOpacity] = useState(1);
    const [wmRotation, setWmRotation] = useState(0);

    const [cropSize, setCropSize] = useState({ width: 1000, height: 1000 });
    const [cropBgColor, setCropBgColor] = useState('transparent');
    const [customW, setCustomW] = useState('1000');
    const [customH, setCustomH] = useState('1000');
    const [isLocked, setIsLocked] = useState(true);

    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const scale = useRef(new Animated.Value(1)).current;
    const stretchX = useRef(new Animated.Value(1)).current;
    const stretchY = useRef(new Animated.Value(1)).current;
    const rotation = useRef(new Animated.Value(0)).current;
    const flipX = useRef(new Animated.Value(0)).current;
    const flipY = useRef(new Animated.Value(0)).current;

    const initialDistance = useRef<number | null>(null);
    const lastScale = useRef(1);
    const lastPan = useRef({ x: 0, y: 0 });
    const currentRotation = useRef(0);
    const currentFlipX = useRef(0);
    const currentFlipY = useRef(0);

    const activeCategoryRef = useRef(activeCategory);

    useEffect(() => {
        activeCategoryRef.current = activeCategory;
    }, [activeCategory]);

    // لود کردن تنظیمات واترمارک ذخیره شده
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedData = await AsyncStorage.getItem('watermark_settings');
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.text !== undefined) setWmText(parsed.text);
                    if (parsed.color) setWmColor(parsed.color);
                    if (parsed.size) setWmSize(parsed.size);
                    if (parsed.font) setWmFont(parsed.font);
                    if (parsed.opacity) setWmOpacity(parsed.opacity);
                    if (parsed.rotation) setWmRotation(parsed.rotation);
                    if (parsed.bgColor) setWmBgColor(parsed.bgColor);
                }
            } catch (e) {
                console.log('Error loading watermark settings', e);
            }
        };
        loadSettings();
    }, []);

    // ذخیره خودکار تنظیمات واترمارک
    useEffect(() => {
        const saveSettings = async () => {
            try {
                const settings = JSON.stringify({ 
                    text: wmText, color: wmColor, size: wmSize, 
                    font: wmFont, opacity: wmOpacity, rotation: wmRotation, bgColor: wmBgColor 
                });
                await AsyncStorage.setItem('watermark_settings', settings);
            } catch (e) {
                console.log('Error saving watermark settings', e);
            }
        };
        saveSettings();
    }, [wmText, wmColor, wmSize, wmFont, wmOpacity, wmRotation, wmBgColor]);

    const colorsList: string[] = ['transparent', '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];
    const fontsList: string[] = ['System', 'serif', 'sans-serif', 'monospace'];
    const maxDisplaySize = 300;
    const visualScale = Math.min(maxDisplaySize / cropSize.width, maxDisplaySize / cropSize.height);
    const displayW = cropSize.width * visualScale;
    const displayH = cropSize.height * visualScale;

    const theme = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        surface: isDarkMode ? '#121212' : '#FFFFFF',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        textMuted: isDarkMode ? '#888888' : '#8E8E93',
        border: isDarkMode ? '#222222' : '#E5E5EA',
        primary: '#FFA500',
        canvasBg: isDarkMode ? '#050505' : '#E5E5EA',
        inputBg: isDarkMode ? '#1E1E1E' : '#F2F2F7',
    };

    useEffect(() => {
        const panId = pan.addListener((value) => { lastPan.current = value; });
        const scaleId = scale.addListener((value) => { lastScale.current = value.value; });
        return () => { pan.removeListener(panId); scale.removeListener(scaleId); };
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => activeCategoryRef.current !== 'watermark',
            onMoveShouldSetPanResponder: () => activeCategoryRef.current !== 'watermark',
            onPanResponderGrant: () => {
                pan.setOffset({ x: lastPan.current.x, y: lastPan.current.y });
                pan.setValue({ x: 0, y: 0 });
                initialDistance.current = null;
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;
                if (touches.length === 2) {
                    const dx = touches[0].pageX - touches[1].pageX;
                    const dy = touches[0].pageY - touches[1].pageY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (!initialDistance.current) { initialDistance.current = distance; }
                    else {
                        const rawScale = distance / initialDistance.current;
                        const dampenedScale = 1 + (rawScale - 1) * 0.15;
                        let newScale = lastScale.current * dampenedScale;
                        if (newScale < 0.2) newScale = 0.2;
                        if (newScale > 6) newScale = 6;
                        scale.setValue(newScale);
                    }
                }
                else if (touches.length === 1 && !initialDistance.current) {
                    pan.setValue({ x: gestureState.dx, y: gestureState.dy });
                }
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                initialDistance.current = null;
            },
        })
    ).current;

    if (!image) return null;
        
    const updateAdjustment = (key: string, value: number) => {
        setAdjustments({ ...adjustments, [key]: value });
    };

    // خروجی استاندارد WebP با سایز و حجم دقیق
    const handleSaveExport = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('خطا', 'مجوز گالری داده نشد.');
                return;
            }
            
            const rawUri = await viewShotRef.current?.capture();
            if (rawUri) {
                // تنظیم دقیق سایز به اندازه انتخاب شده کاربر و فشرده سازی مناسب
                const manipResult = await ImageManipulator.manipulateAsync(
                    rawUri,
                    [{ resize: { width: cropSize.width, height: cropSize.height } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
                );

                await MediaLibrary.saveToLibraryAsync(manipResult.uri);
                Alert.alert('موفقیت', 'عکس با کیفیت عالی و سایز دقیق ذخیره شد.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('خطا', 'مشکل در ذخیره عکس');
        }
    };

    const applyCustomSize = () => {
        const w = parseInt(customW) || 1000;
        const h = parseInt(customH) || 1000;
        setCropSize({ width: w, height: h });
        setActiveCropTool('aspect');
    };

    const rotate90 = () => { currentRotation.current += 90; Animated.timing(rotation, { toValue: currentRotation.current, duration: 200, useNativeDriver: false }).start(); };
    const toggleFlipX = () => { currentFlipX.current = currentFlipX.current === 0 ? 180 : 0; Animated.timing(flipX, { toValue: currentFlipX.current, duration: 200, useNativeDriver: false }).start(); };
    const toggleFlipY = () => { currentFlipY.current = currentFlipY.current === 0 ? 180 : 0; Animated.timing(flipY, { toValue: currentFlipY.current, duration: 200, useNativeDriver: false }).start(); };

    const resetAllTransforms = () => {
        Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
            Animated.spring(stretchX, { toValue: 1, useNativeDriver: false }),
            Animated.spring(stretchY, { toValue: 1, useNativeDriver: false }),
            Animated.spring(rotation, { toValue: 0, useNativeDriver: false }),
            Animated.spring(flipX, { toValue: 0, useNativeDriver: false }),
            Animated.spring(flipY, { toValue: 0, useNativeDriver: false }),
        ]).start(() => {
            currentRotation.current = 0; currentFlipX.current = 0; currentFlipY.current = 0;
        });
    };

    const pickWatermarkImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
        if (!result.canceled) { setWmImageUri(result.assets[0].uri); setActiveWatermarkTool('image'); }
    };

    const spin = rotation.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
    const flipXRot = flipX.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const flipYRot = flipY.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });

    const renderAdjustControl = () => {
        let value, min, max, defaultVal, iconName: any, key: string;
        switch (activeAdjustTool) {
            case 'brightness': value = adjustments.brightness; key = 'brightness'; min = -1; max = 1; defaultVal = 0; iconName = 'brightness-6'; break;
            case 'contrast': value = adjustments.contrast; key = 'contrast'; min = 0; max = 2; defaultVal = 1; iconName = 'contrast-circle'; break;
            case 'saturation': value = adjustments.saturation; key = 'saturation'; min = 0; max = 2; defaultVal = 1; iconName = 'palette'; break;
            case 'warmth': value = adjustments.warmth; key = 'warmth'; min = -1; max = 1; defaultVal = 0; iconName = 'thermometer'; break;
            default: return null;
        }
        return (
            <View style={styles.controlRow}>
                <MaterialCommunityIcons name={iconName} size={22} color={theme.text} />
                <Slider style={styles.largeSlider} minimumValue={min} maximumValue={max} value={value} onValueChange={(val) => updateAdjustment(key, val)} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} />
                <TouchableOpacity style={[styles.resetMiniButton, { backgroundColor: theme.inputBg }]} onPress={() => updateAdjustment(key, defaultVal)}>
                    <MaterialCommunityIcons name="reload" size={18} color={theme.primary} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

            <View style={[styles.topBar, { backgroundColor: theme.bg }]}>
                <View style={styles.topBarLeft}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={() => BackHandler.exitApp()}>
                        <MaterialCommunityIcons name="power" size={26} color="#FF3B30" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topIconBtn} onPress={handleSaveExport}>
                        <MaterialCommunityIcons name="content-save" size={26} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topIconBtn} onPress={undo} disabled={!canUndo}>
                        <MaterialCommunityIcons name="undo" size={24} color={canUndo ? theme.text : theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topIconBtn} onPress={redo} disabled={!canRedo}>
                        <MaterialCommunityIcons name="redo" size={24} color={canRedo ? theme.text : theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topIconBtn} onPress={resetAllTransforms}>
                        <MaterialCommunityIcons name="refresh" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.topIconBtn} onPress={() => setIsDarkMode(!isDarkMode)}>
                    <MaterialCommunityIcons name={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View style={[styles.canvasArea, { backgroundColor: theme.canvasBg }]}>

                {activeCategory === 'crop' && activeCropTool === 'custom' && (
                    <View style={[styles.floatingInputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.toolLabel, { color: theme.text }]}>Size:</Text>
                        <TextInput style={[styles.sizeInput, { backgroundColor: theme.inputBg, color: theme.text }]} keyboardType="numeric" value={customW} onChangeText={setCustomW} placeholderTextColor={theme.textMuted} />
                        <Text style={{ color: theme.textMuted, marginHorizontal: 8 }}>X</Text>
                        <TextInput style={[styles.sizeInput, { backgroundColor: theme.inputBg, color: theme.text }]} keyboardType="numeric" value={customH} onChangeText={setCustomH} placeholderTextColor={theme.textMuted} />
                        <TouchableOpacity style={[styles.applyButton, { backgroundColor: theme.primary }]} onPress={applyCustomSize}>
                            <Text style={styles.applyButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ViewShot
                    ref={viewShotRef}
                    options={{ format: 'png', quality: 1 }} 
                    style={{ width: displayW, height: displayH }}
                >
                    <View collapsable={false} style={{ flex: 1, overflow: 'hidden', backgroundColor: cropBgColor === 'transparent' ? 'transparent' : cropBgColor }}>
                        <Animated.View style={[styles.imageContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scale }, { scaleX: stretchX }, { scaleY: stretchY }, { rotate: spin }, { rotateY: flipXRot }, { rotateX: flipYRot }] }]} {...panResponder.panHandlers}>
                            <Animated.Image source={{ uri: image.uri }} style={[styles.image, { opacity: adjustments.contrast < 1 ? adjustments.contrast : 1 }]} resizeMode="contain" />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: adjustments.brightness > 0 ? '#FFF' : '#000', opacity: Math.abs(adjustments.brightness) * 0.5 }]} pointerEvents="none" />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: adjustments.warmth > 0 ? '#FFA500' : '#0000FF', opacity: Math.abs(adjustments.warmth) * 0.2 }]} pointerEvents="none" />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: adjustments.saturation > 1 ? '#FF6600' : '#808080', opacity: Math.abs(adjustments.saturation - 1) * 0.3 }]} pointerEvents="none" />
                        </Animated.View>

                        <WatermarkOverlay isActive={activeCategory === 'watermark'} text={wmText} imageUri={wmImageUri} fontSize={wmSize} color={wmColor} bgColor={wmBgColor} fontFamily={wmFont} opacity={wmOpacity} rotation={wmRotation} />
                    </View>
                </ViewShot>

                {activeCategory === 'crop' && (<CropFrame width={displayW} height={displayH} />)}
            </View>

            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={[styles.toolsArea, { backgroundColor: theme.surface }]}>
                <View style={styles.topControlPanel}>
                    {activeCategory === 'adjust' && renderAdjustControl()}

                    {activeCategory === 'crop' && activeCropTool === 'aspect' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratioScroll}>
                            <TouchableOpacity style={styles.simpleRatioBtn} onPress={() => setCropSize({ width: 1000, height: 1000 })}><Text style={[styles.simpleRatioText, { color: theme.text }]}>1:1</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.simpleRatioBtn} onPress={() => setCropSize({ width: 1000, height: 750 })}><Text style={[styles.simpleRatioText, { color: theme.text }]}>4:3</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.simpleRatioBtn} onPress={() => setCropSize({ width: 750, height: 1000 })}><Text style={[styles.simpleRatioText, { color: theme.text }]}>3:4</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.simpleRatioBtn} onPress={() => setCropSize({ width: 1000, height: 562 })}><Text style={[styles.simpleRatioText, { color: theme.text }]}>16:9</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.simpleRatioBtn} onPress={() => setCropSize({ width: 562, height: 1000 })}><Text style={[styles.simpleRatioText, { color: theme.text }]}>9:16</Text></TouchableOpacity>
                        </ScrollView>
                    )}

                    {activeCategory === 'crop' && activeCropTool === 'stretch' && (
                        <View style={styles.stretchContainer}>
                            <View style={styles.stretchSliders}>
                                <View style={styles.stretchRow}><Text style={[styles.toolLabelSmall, { color: theme.textMuted }]}>W</Text><Slider style={styles.slider} minimumValue={0.5} maximumValue={3} value={1} onValueChange={(val) => { stretchX.setValue(val); if (isLocked) stretchY.setValue(val); }} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} /></View>
                                <View style={styles.stretchRow}><Text style={[styles.toolLabelSmall, { color: theme.textMuted }]}>H</Text><Slider style={styles.slider} minimumValue={0.5} maximumValue={3} value={1} onValueChange={(val) => { stretchY.setValue(val); if (isLocked) stretchX.setValue(val); }} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} /></View>
                            </View>
                            <View style={styles.stretchActions}>
                                <TouchableOpacity style={styles.stretchBtn} onPress={() => setIsLocked(!isLocked)}><MaterialCommunityIcons name={isLocked ? "link" : "link-variant-off"} size={18} color={isLocked ? theme.primary : theme.text} /></TouchableOpacity>
                                <TouchableOpacity style={styles.stretchBtn} onPress={() => { stretchX.setValue(1); stretchY.setValue(1); }}><MaterialCommunityIcons name="refresh" size={18} color={theme.text} /></TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {activeCategory === 'crop' && activeCropTool === 'rotate' && (
                        <View style={styles.actionIconRow}>
                            <TouchableOpacity style={styles.actionIcon} onPress={rotate90}><MaterialCommunityIcons name="rotate-right" size={22} color={theme.text} /><Text style={[styles.actionText, { color: theme.text }]}>Rotate 90</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionIcon} onPress={toggleFlipX}><MaterialCommunityIcons name="flip-horizontal" size={22} color={theme.text} /><Text style={[styles.actionText, { color: theme.text }]}>Flip H</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionIcon} onPress={toggleFlipY}><MaterialCommunityIcons name="flip-vertical" size={22} color={theme.text} /><Text style={[styles.actionText, { color: theme.text }]}>Flip V</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionIcon} onPress={() => { currentRotation.current = 0; rotation.setValue(0); flipX.setValue(0); flipY.setValue(0); }}><MaterialCommunityIcons name="refresh" size={22} color="#FF453A" /><Text style={[styles.actionText, { color: '#FF453A' }]}>Reset</Text></TouchableOpacity>
                        </View>
                    )}

                    {activeCategory === 'crop' && activeCropTool === 'bgcolor' && (
                        <View style={styles.actionIconRow}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 15, height: 50 }}>
                                {colorsList.map(color => (
                                    <TouchableOpacity key={color} onPress={() => setCropBgColor(color)} style={[styles.colorCircle, { backgroundColor: color === 'transparent' ? '#333' : color, borderColor: theme.border, borderWidth: 1 }, cropBgColor === color && { borderColor: theme.primary, borderWidth: 2 }]}>
                                        {color === 'transparent' && <MaterialCommunityIcons name="block-helper" size={14} color="#FFF" style={{ alignSelf: 'center', marginTop: 4 }} />}
                                    </TouchableOpacity>
                                ))}
                                <TextInput style={{ width: 70, height: 30, borderRadius: 8, borderColor: theme.border, borderWidth: 1, color: theme.text, textAlign: 'center', fontSize: 12, marginLeft: 10, backgroundColor: theme.inputBg }} placeholder="#HEX" placeholderTextColor={theme.textMuted} onSubmitEditing={(e) => setCropBgColor(e.nativeEvent.text)} />
                            </ScrollView>
                        </View>
                    )}

                    {activeCategory === 'watermark' && (
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            {activeWatermarkTool === 'text' && (<TextInput style={[styles.wmTextInput, { backgroundColor: theme.inputBg, color: theme.text }]} value={wmText} onChangeText={setWmText} placeholder="Watermark..." placeholderTextColor={theme.textMuted} />)}
                            {activeWatermarkTool === 'font' && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 15 }}>
                                    {fontsList.map(font => (<TouchableOpacity key={font} onPress={() => setWmFont(font)} style={[styles.fontItem, { backgroundColor: theme.inputBg }, wmFont === font && { borderColor: theme.primary, borderWidth: 1 }]}><Text style={{ color: theme.text, fontFamily: font, fontSize: 14 }}>{font}</Text></TouchableOpacity>))}
                                </ScrollView>
                            )}
                            {activeWatermarkTool === 'color' && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 15 }}>
                                    {colorsList.map(color => (<TouchableOpacity key={color} onPress={() => setWmColor(color)} style={[styles.colorCircle, { backgroundColor: color === 'transparent' ? '#333' : color, borderColor: theme.border, borderWidth: 1 }, wmColor === color && { borderColor: theme.primary, borderWidth: 2 }]}>{color === 'transparent' && <MaterialCommunityIcons name="block-helper" size={14} color="#FFF" style={{ alignSelf: 'center', marginTop: 4 }} />}</TouchableOpacity>))}
                                </ScrollView>
                            )}
                            {activeWatermarkTool === 'bg' && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 15 }}>
                                    {colorsList.map(color => (<TouchableOpacity key={color} onPress={() => setWmBgColor(color)} style={[styles.colorCircle, { backgroundColor: color === 'transparent' ? '#333' : color, borderColor: theme.border, borderWidth: 1 }, wmBgColor === color && { borderColor: theme.primary, borderWidth: 2 }]}>{color === 'transparent' && <MaterialCommunityIcons name="block-helper" size={14} color="#FFF" style={{ alignSelf: 'center', marginTop: 4 }} />}</TouchableOpacity>))}
                                </ScrollView>
                            )}
                            {activeWatermarkTool === 'size' && (
                                <View style={styles.controlRow}>
                                    <MaterialCommunityIcons name="format-size" size={22} color={theme.text} />
                                    <Slider style={styles.largeSlider} minimumValue={10} maximumValue={150} value={wmSize} onValueChange={setWmSize} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} />
                                </View>
                            )}
                            {activeWatermarkTool === 'opacity' && (
                                <View style={styles.controlRow}>
                                    <MaterialCommunityIcons name="opacity" size={22} color={theme.text} />
                                    <Slider style={styles.largeSlider} minimumValue={0.1} maximumValue={1} value={wmOpacity} onValueChange={setWmOpacity} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} />
                                </View>
                            )}
                            {activeWatermarkTool === 'rotate' && (
                                <View style={styles.controlRow}>
                                    <MaterialCommunityIcons name="rotate-right" size={22} color={theme.text} />
                                    <Slider style={styles.largeSlider} minimumValue={-180} maximumValue={180} value={wmRotation} onValueChange={setWmRotation} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.text} />
                                    <TouchableOpacity style={[styles.resetMiniButton, { backgroundColor: theme.inputBg }]} onPress={() => setWmRotation(0)}>
                                        <MaterialCommunityIcons name="reload" size={18} color={theme.primary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.subMenuPanel, { borderBottomColor: theme.border }]}>
                    {activeCategory === 'adjust' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeAdjustTool === 'brightness' && { backgroundColor: theme.primary }]} onPress={() => setActiveAdjustTool('brightness')}><View style={styles.iconWithDot}><MaterialCommunityIcons name="brightness-6" size={18} color={activeAdjustTool === 'brightness' ? '#000' : theme.text} />{adjustments.brightness !== 0 && <View style={styles.changedDot} />}</View><Text style={[styles.subToolText, { color: activeAdjustTool === 'brightness' ? '#000' : theme.text }]}>Brightness</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeAdjustTool === 'contrast' && { backgroundColor: theme.primary }]} onPress={() => setActiveAdjustTool('contrast')}><View style={styles.iconWithDot}><MaterialCommunityIcons name="contrast-circle" size={18} color={activeAdjustTool === 'contrast' ? '#000' : theme.text} />{adjustments.contrast !== 1 && <View style={styles.changedDot} />}</View><Text style={[styles.subToolText, { color: activeAdjustTool === 'contrast' ? '#000' : theme.text }]}>Contrast</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeAdjustTool === 'saturation' && { backgroundColor: theme.primary }]} onPress={() => setActiveAdjustTool('saturation')}><View style={styles.iconWithDot}><MaterialCommunityIcons name="palette" size={18} color={activeAdjustTool === 'saturation' ? '#000' : theme.text} />{adjustments.saturation !== 1 && <View style={styles.changedDot} />}</View><Text style={[styles.subToolText, { color: activeAdjustTool === 'saturation' ? '#000' : theme.text }]}>Color</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeAdjustTool === 'warmth' && { backgroundColor: theme.primary }]} onPress={() => setActiveAdjustTool('warmth')}><View style={styles.iconWithDot}><MaterialCommunityIcons name="thermometer" size={18} color={activeAdjustTool === 'warmth' ? '#000' : theme.text} />{adjustments.warmth !== 0 && <View style={styles.changedDot} />}</View><Text style={[styles.subToolText, { color: activeAdjustTool === 'warmth' ? '#000' : theme.text }]}>Warmth</Text></TouchableOpacity>
                        </ScrollView>
                    )}

                    {activeCategory === 'crop' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeCropTool === 'aspect' && { backgroundColor: theme.primary }]} onPress={() => setActiveCropTool('aspect')}><MaterialCommunityIcons name="crop" size={18} color={activeCropTool === 'aspect' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeCropTool === 'aspect' ? '#000' : theme.text }]}>Aspect</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeCropTool === 'custom' && { backgroundColor: theme.primary }]} onPress={() => setActiveCropTool('custom')}><MaterialCommunityIcons name="pencil-ruler" size={18} color={activeCropTool === 'custom' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeCropTool === 'custom' ? '#000' : theme.text }]}>Custom</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeCropTool === 'stretch' && { backgroundColor: theme.primary }]} onPress={() => setActiveCropTool('stretch')}><MaterialCommunityIcons name="arrow-expand-all" size={18} color={activeCropTool === 'stretch' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeCropTool === 'stretch' ? '#000' : theme.text }]}>Stretch</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeCropTool === 'rotate' && { backgroundColor: theme.primary }]} onPress={() => setActiveCropTool('rotate')}><MaterialCommunityIcons name="rotate-3d-variant" size={18} color={activeCropTool === 'rotate' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeCropTool === 'rotate' ? '#000' : theme.text }]}>Rotate</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeCropTool === 'bgcolor' && { backgroundColor: theme.primary }]} onPress={() => setActiveCropTool('bgcolor')}><MaterialCommunityIcons name="format-color-fill" size={18} color={activeCropTool === 'bgcolor' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeCropTool === 'bgcolor' ? '#000' : theme.text }]}>Bg Color</Text></TouchableOpacity>
                        </ScrollView>
                    )}

                    {activeCategory === 'watermark' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }]} onPress={pickWatermarkImage}><MaterialCommunityIcons name="image-plus" size={18} color={wmImageUri ? theme.primary : theme.text} /><Text style={[styles.subToolText, { color: wmImageUri ? theme.primary : theme.text }]}>Logo</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'text' && { backgroundColor: theme.primary }]} onPress={() => { setWmImageUri(null); setActiveWatermarkTool('text'); }}><MaterialCommunityIcons name="format-text" size={18} color={activeWatermarkTool === 'text' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'text' ? '#000' : theme.text }]}>Text</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'font' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('font')}><MaterialCommunityIcons name="format-font" size={18} color={activeWatermarkTool === 'font' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'font' ? '#000' : theme.text }]}>Font</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'color' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('color')}><MaterialCommunityIcons name="palette" size={18} color={activeWatermarkTool === 'color' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'color' ? '#000' : theme.text }]}>Color</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'bg' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('bg')}><MaterialCommunityIcons name="format-color-fill" size={18} color={activeWatermarkTool === 'bg' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'bg' ? '#000' : theme.text }]}>Bg</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'size' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('size')}><MaterialCommunityIcons name="format-size" size={18} color={activeWatermarkTool === 'size' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'size' ? '#000' : theme.text }]}>Size</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'opacity' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('opacity')}><MaterialCommunityIcons name="opacity" size={18} color={activeWatermarkTool === 'opacity' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'opacity' ? '#000' : theme.text }]}>Opacity</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.subToolBtn, { backgroundColor: theme.inputBg }, activeWatermarkTool === 'rotate' && { backgroundColor: theme.primary }]} onPress={() => setActiveWatermarkTool('rotate')}><MaterialCommunityIcons name="rotate-right" size={18} color={activeWatermarkTool === 'rotate' ? '#000' : theme.text} /><Text style={[styles.subToolText, { color: activeWatermarkTool === 'rotate' ? '#000' : theme.text }]}>Rotate</Text></TouchableOpacity>
                        </ScrollView>
                    )}
                </View>

                <View style={styles.bottomTabBar}>
                    <TouchableOpacity style={styles.mainTab} onPress={() => setActiveCategory('adjust')}><Text style={[styles.mainTabText, { color: theme.textMuted }, activeCategory === 'adjust' && { color: theme.primary, fontWeight: 'bold' }]}>Adjust</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.mainTab} onPress={() => setActiveCategory('crop')}><Text style={[styles.mainTabText, { color: theme.textMuted }, activeCategory === 'crop' && { color: theme.primary, fontWeight: 'bold' }]}>Crop</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.mainTab} onPress={() => setActiveCategory('watermark')}><Text style={[styles.mainTabText, { color: theme.textMuted }, activeCategory === 'watermark' && { color: theme.primary, fontWeight: 'bold' }]}>Watermark</Text></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, zIndex: 10 },
    topBarLeft: { flexDirection: 'row', gap: 15 },
    topIconBtn: { padding: 5 },
    canvasArea: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', zIndex: 1 },
    floatingInputBox: { position: 'absolute', zIndex: 20, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, elevation: 5 },
    imageContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
    image: { width: '100%', height: '100%' },
    toolsArea: { height: 210, paddingTop: 5, zIndex: 2, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    topControlPanel: { height: 50, justifyContent: 'center', paddingHorizontal: 15 },
    controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    largeSlider: { flex: 1, marginHorizontal: 15, height: 40 },
    resetMiniButton: { padding: 6, borderRadius: 12 },
    ratioScroll: { alignItems: 'center', paddingHorizontal: 10 },
    stretchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    stretchSliders: { flex: 1 },
    stretchRow: { flexDirection: 'row', alignItems: 'center', height: 24 },
    stretchActions: { flexDirection: 'column', marginLeft: 15, gap: 10 },
    stretchBtn: { padding: 8, backgroundColor: '#333', borderRadius: 8, alignItems: 'center' },
    toolLabel: { fontSize: 13, marginRight: 8, fontWeight: 'bold' },
    toolLabelSmall: { fontSize: 11, width: 35 },
    slider: { flex: 1, height: 26 },
    sizeInput: { width: 70, height: 38, borderRadius: 8, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
    applyButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginLeft: 10 },
    applyButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
    actionIconRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    actionIcon: { alignItems: 'center' },
    actionText: { fontSize: 11, marginTop: 4 },
    wmTextInput: { height: 36, borderRadius: 8, paddingHorizontal: 15, fontSize: 14, textAlign: 'center' },
    colorCircle: { width: 28, height: 28, borderRadius: 14, marginRight: 15 },
    fontItem: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginRight: 10 },
    subMenuPanel: { height: 60, justifyContent: 'center', borderBottomWidth: 1 },
    scrollContent: { alignItems: 'center', paddingHorizontal: 10 },
    subToolBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 8 },
    subToolText: { fontSize: 11, marginLeft: 6, fontWeight: '600' },
    iconWithDot: { position: 'relative' },
    changedDot: { position: 'absolute', top: -2, right: -4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF453A' },
    simpleRatioBtn: { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
    simpleRatioText: { fontSize: 13, fontWeight: 'bold' },
    bottomTabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 50 },
    mainTab: { padding: 10 },
    mainTabText: { fontSize: 13 },
});