import { create } from "zustand";

interface DeviceState {
	connected: boolean;
	connectDevice: () => void;
	disconnectDevice: () => void;
}

export const useDeviceStore = create<DeviceState>()((set) => ({
	connected: false,
	connectDevice: () => set((state) => ({ connected: true })),
	disconnectDevice: () => set((state) => ({ connected: false })),
}));
