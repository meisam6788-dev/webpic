// مسیر فایل: src/types/index.ts

export interface AppImage {
    uri: string;
    width: number;
    height: number;
}

export interface Preset {
    id: string;
    name: string;
    width: number;
    height: number;
}

export interface EditorState {
    image: AppImage | null;
    selectedPreset: Preset | null;
    brightness: number;
    contrast: number;
}