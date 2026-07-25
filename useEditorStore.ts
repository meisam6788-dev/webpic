import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppImage, Preset, EditorState } from '../types';

interface EditorStore extends EditorState {
    setImage: (image: AppImage | null) => void;
    setPreset: (preset: Preset | null) => void;
    setBrightness: (val: number) => void;
    setContrast: (val: number) => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      // مقادیر اولیه
      image: null,
      selectedPreset: null,
      brightness: 1,
      contrast: 1,

      // توابع تغییر
      setImage: (image) => set({ image }),
      setPreset: (preset) => set({ selectedPreset: preset }),
      setBrightness: (val) => set({ brightness: val }),
      setContrast: (val) => set({ contrast: val }),
    }),
    {
      name: 'webpic-storage', 
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ ...state, image: null }), // این خط باعث می‌شود عکس قبلی ذخیره نشود
    }
  )
);