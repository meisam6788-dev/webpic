// مسیر فایل: src/store/useEditorStore.ts

import { create } from 'zustand';
import { AppImage, Preset, EditorState } from '../types';

interface EditorStore extends EditorState {
    setImage: (image: AppImage) => void;
    setPreset: (preset: Preset) => void;
    setBrightness: (val: number) => void;
    setContrast: (val: number) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
    // مقادیر اولیه (زمانی که اپلیکیشن تازه باز شده)
    image: null,
    selectedPreset: null,
    brightness: 1,
    contrast: 1,

    // توابعی برای تغییر مقادیر بالا
    setImage: (image) => set({ image }),
    setPreset: (preset) => set({ selectedPreset: preset }),
    setBrightness: (val) => set({ brightness: val }),
    setContrast: (val) => set({ contrast: val }),
}));