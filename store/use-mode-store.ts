import { create } from "zustand";

interface ModeState {
	mode: "PROD" | "DEBUG";
	setDebug: () => void;
	setProd: () => void;
}

export const useModeStore = create<ModeState>()((set) => ({
	mode: "PROD",
	setDebug: () => set((state) => ({ mode: "DEBUG" })),
	setProd: () => set((state) => ({ mode: "PROD" })),
}));
