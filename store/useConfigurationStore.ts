import JSZip from "jszip";
import { create } from "zustand";

export const COLOR_LOOKUP_TABLE = {
	RED: "ff0000",
	GREEN: "00ff00",
	BLUE: "0000ff",
} as const;

export const Colors = ["RED", "GREEN", "BLUE"] as const;

export const ConfigurationTypes = ["sysiphus"] as const;

interface Configuration {
	name: string;
	colorCode: string;
	buttons: Button[];
}

export interface Button {
	label: string | null;
	imageUrl: string | null;
	audioUrl: string | null;
}

interface Manifest {
	version: number;
	name: string;
	colorCode: string;
	buttons: { label: string }[];
}

interface ConfigurationState {
	configuration: Configuration | null;
	createConfiguration: ({
		name,
		type,
		colorCode,
	}: {
		name: string;
		type: (typeof ConfigurationTypes)[number];
		colorCode: (typeof Colors)[number];
	}) => void;
	loadConfiguration: (file: File) => Promise<void>;
	saveConfiguration: () => Promise<void>;
	getColorLookupTable: () => string;
	uploadButtonImage: (index: number, image: Blob) => void;
	uploadButtonAudio: (index: number, voice: Blob) => void;
	updateButtonLabel: (index: number, label: string) => void;
}

export const useConfigurationStore = create<ConfigurationState>()((set, get) => ({
	configuration: null,
	createConfiguration: ({ name, type, colorCode }) => {
		set(() => ({
			configuration: {
				name,
				colorCode,
				buttons: Array.from({ length: 9 }).map(() => ({ label: null, imageUrl: null, audioUrl: null })),
			},
		}));
	},
	loadConfiguration: async (file) => {
		const zip = new JSZip();
		const content = await file.arrayBuffer();
		const zipContent = await zip.loadAsync(content);

		const basePath = file.name.split(".zip")[0];

		const manifestFile = zipContent.file(`manifest.json`);

		if (!manifestFile) {
			console.log("Configuration is not valid!");
			return;
		}

		const manifest = JSON.parse(await manifestFile.async("string")) as Manifest;

		const images = zipContent
			.filter((path) => path.startsWith(`images`) && path.endsWith(".png"))
			.sort((a, b) => +a.name.split("/").pop()?.split(".")[0]! - +b.name.split("/").pop()?.split(".")[0]!);
		const audio = zipContent
			.filter((path) => path.startsWith(`audio`) && path.endsWith(".wav"))
			.sort((a, b) => +a.name.split("/").pop()?.split(".")[0]! - +b.name.split("/").pop()?.split(".")[0]!);

		const buttons: Button[] = [];

		for (const [index, button] of manifest.buttons.entries()) {
			const buttonImage = await images[index].async("blob");
			const buttonAudio = await audio[index].async("blob");

			if (!buttonImage || !buttonAudio) continue;

			buttons.push({
				label: button.label,
				imageUrl: URL.createObjectURL(buttonImage),
				audioUrl: URL.createObjectURL(buttonAudio),
			});
		}

		set((state) => ({
			configuration: {
				name: manifest.name,
				colorCode: manifest.colorCode,
				buttons,
			},
		}));
	},
	saveConfiguration: async () => {
		const zip = new JSZip();

		const { configuration } = get();

		if (!configuration) {
			return;
		}

		const manifest = {
			version: 1,
			name: configuration.name,
			colorCode: configuration.colorCode,
			buttons: configuration.buttons
				.filter((button) => button.label !== null && button.imageUrl !== null && button.audioUrl !== null)
				.map(({ label }) => ({ label } as { label: string })),
		} satisfies Manifest;

		zip.file("manifest.json", JSON.stringify(manifest, null, 4));

		for (const [index, button] of Object.entries(configuration.buttons)) {
			if (!button.audioUrl || !button.imageUrl || !button.label) {
				continue;
			}

			const audioBlob = await fetch(button.audioUrl).then((r) => r.blob());
			const imageUrl = await fetch(button.imageUrl).then((r) => r.blob());

			zip.file(`audio/${Number(index + 1)}.wav`, audioBlob);
			zip.file(`images/${Number(index + 1)}.png`, imageUrl);

			const content = await zip.generateAsync({ type: "blob" });

			const url = URL.createObjectURL(content);
			const a = document.createElement("a");

			a.href = url;
			a.download = `${configuration.name}_lithos.zip`;
			document.body.appendChild(a);

			a.click();

			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	},
	getColorLookupTable: () => {
		let result = "";

		for (const [key, value] of Object.entries(COLOR_LOOKUP_TABLE)) {
			result += `${value} ${key.toLocaleLowerCase()}\n`;
		}

		return result;
	},
	uploadButtonImage: (index, image) => {
		set((state) => {
			const currentConfig = state.configuration!;

			return {
				configuration: {
					name: currentConfig.name,
					colorCode: currentConfig.colorCode,
					buttons: currentConfig.buttons.map((button, buttonIndex) => {
						if (buttonIndex === index) {
							return { ...button, imageUrl: URL.createObjectURL(image) };
						} else {
							return button;
						}
					}),
				},
			};
		});
	},
	uploadButtonAudio: (index, audio) => {
		set((state) => {
			const currentConfig = state.configuration!;

			return {
				configuration: {
					name: currentConfig.name,
					colorCode: currentConfig.colorCode,
					buttons: currentConfig.buttons.map((button, buttonIndex) => {
						if (buttonIndex === index) {
							return { ...button, audioUrl: URL.createObjectURL(audio) };
						} else {
							return button;
						}
					}),
				},
			};
		});
	},
	updateButtonLabel: (index, label) => {
		set((state) => {
			const currentConfig = state.configuration!;

			return {
				configuration: {
					name: currentConfig.name,
					colorCode: currentConfig.colorCode,
					buttons: currentConfig.buttons.map((button, buttonIndex) => {
						if (buttonIndex === index) {
							return { ...button, label };
						} else {
							return button;
						}
					}),
				},
			};
		});
	},
}));
