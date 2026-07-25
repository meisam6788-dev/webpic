import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEditorStore } from './src/store/useEditorStore';
import ImageCanvas from './src/components/canvas/ImageCanvas'; // فراخوانی بوم جدید

export default function App() {
    const { image, setImage } = useEditorStore();

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled) {
            setImage({
                uri: result.assets[0].uri,
                width: result.assets[0].width,
                height: result.assets[0].height,
            });
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>webpic.</Text>
            </View>

            <View style={styles.canvasContainer}>
                {image ? (
                    <ImageCanvas /> // استفاده از بوم متحرک و امن
                ) : (
                    <Text style={styles.canvasText}>تصویری برای ویرایش انتخاب کنید</Text>
                )}
            </View>

            <View style={styles.bottomMenu}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={pickImage}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>گالری</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    header: {
        marginTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 10,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: 2,
    },
    canvasContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111111',
        marginHorizontal: 24,
        marginTop: 10,
        marginBottom: 30,
        borderRadius: 32,
        overflow: 'hidden',
    },
    canvasText: {
        color: '#555555',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    bottomMenu: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 50,
        borderRadius: 100,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
});