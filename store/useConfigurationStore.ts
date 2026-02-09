import JSZip from "jszip";
import { toast } from "sonner";
import { create } from "zustand";
import { generatePdf } from "~/lib/pdf-generator";

export const COLOR_LOOKUP_TABLE = {
	RED: "ff0000",
	GREEN: "00ff00",
	BLUE: "0000ff",
	CYAN: "00ffff",
	MAGENTA: "ff00ff",
	YELLOW: "ffff00",
	PURPLE: "800080",
	ORANGE: "ffa500",
	BLACK: "000000",
} as const;

export const Colors = ["RED", "GREEN", "BLUE", "CYAN", "MAGENTA", "YELLOW", "PURPLE", "ORANGE", "BLACK"] as const;

export const ConfigurationTypes = ["sisyphus"] as const;

export interface Configuration {
	name: string;
	colorCode: string;
	buttons: Button[];
	size: number;
}

export interface Button {
	id: number;
	label: string | null;
	imageUrl: string | null;
	audioUrl: string | null;
}

interface Manifest {
	version: number;
	name: string;
	colorCode: string;
	buttons: { label: string | null }[];
}

interface ConfigurationInfo {
	colorCode: string;
	name: string;
	uploadedAt: Date;
	size: number;
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
	updateConfiguration: ({ name, colorCode }: { name: string; colorCode: (typeof Colors)[number] }) => void;
	loadConfiguration: (file: File) => Promise<void>;
	saveConfiguration: () => Promise<void>;
	getColorLookupTable: () => string;
	uploadButtonImage: (index: number, image: Blob | null) => void;
	uploadButtonAudio: (index: number, voice: Blob | null) => Promise<void>;
	updateButtonLabel: (index: number, label: string) => void;
	generateConfigurationPdf: () => Promise<void>;
}

export const useConfigurationStore = create<ConfigurationState>()((set, get) => ({
	configuration: null,
	createConfiguration: ({ name, type, colorCode }) => {
		set(() => ({
			configuration: {
				name,
				colorCode,
				buttons: Array.from({ length: type === "sisyphus" ? 16 : 9 }).map((_, index) => ({
					id: index + 1,
					label: null,
					imageUrl: null,
					audioUrl: null,
				})),
				size: 0,
			},
		}));
	},
	updateConfiguration: ({ name, colorCode }) => {
		set((prev) => {
			if (!prev.configuration) {
				return prev;
			}

			return {
				...prev,
				configuration: {
					...prev.configuration,
					name,
					colorCode,
				},
			};
		});
	},
	loadConfiguration: async (file) => {
		const zip = new JSZip();
		const content = await file.arrayBuffer();
		const zipContent = await zip.loadAsync(content);

		const manifestFile = zipContent.file(`manifest.json`);

		if (!manifestFile) {
			toast.error("Nelze načíst nahranou konfiguraci!");
			return;
		}

		const manifest = JSON.parse(await manifestFile.async("string")) as Manifest;

		let size = 0;

		const rawButtons: Button[] = [
			...manifest.buttons.map((button, index) => ({ ...button, id: index + 1, imageUrl: null, audioUrl: null })),
		];

		const buttons = await Promise.all(
			rawButtons.map(async (button) => {
				const buttonImage = zipContent.file(`images/${button.id}.png`);
				const buttonAudio = zipContent.file(`audio/${button.id}.wav`);

				// tlacitko je prazdne - dulezite pro zachovani spravnych pozic tlacitek
				if (!buttonImage || !buttonAudio) {
					return button;
				}

				const imageBlob = await buttonImage.async("blob");
				const audioBlob = await buttonAudio.async("blob");

				size += imageBlob.size;
				size += audioBlob.size;

				return {
					...button,
					imageUrl: URL.createObjectURL(imageBlob),
					audioUrl: URL.createObjectURL(audioBlob),
				};
			})
		);

		set((state) => ({
			configuration: {
				name: manifest.name,
				colorCode: manifest.colorCode,
				buttons,
				size,
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
			buttons: configuration.buttons.map(({ label }) => ({ label })),
		} satisfies Manifest;

		zip.file("manifest.json", JSON.stringify(manifest, null, 4));

		for (const [index, button] of Object.entries(configuration.buttons)) {
			if (!button.audioUrl || !button.imageUrl || !button.label) {
				continue;
			}

			const audioBlob = await fetch(button.audioUrl).then((r) => r.blob());
			const imageUrl = await fetch(button.imageUrl).then((r) => r.blob());

			zip.file(`audio/${Number(button.id)}.wav`, audioBlob);
			zip.file(`images/${Number(button.id)}.png`, imageUrl);
		}

		const content = await zip.generateAsync({ type: "blob" });

		const url = URL.createObjectURL(content);
		const a = document.createElement("a");

		a.href = url;
		a.download = `${configuration.name}_lithos.zip`;
		document.body.appendChild(a);

		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	},
	getColorLookupTable: () => {
		let result = "";

		for (const [key, value] of Object.entries(COLOR_LOOKUP_TABLE)) {
			result += `${value} ${key.toLocaleLowerCase()}\n`;
		}

		return result;
	},
	uploadButtonImage: (id, image) => {
		const { configuration } = get();

		if (!configuration) {
			return;
		}

		if (!image) {
			set((state) => ({
				configuration: {
					...configuration,
					name: state.configuration!.name,
					colorCode: state.configuration!.colorCode,
					buttons: state.configuration!.buttons.map((button, buttonIndex) => {
						if (buttonIndex === id - 1) {
							return { ...button, imageUrl: null };
						} else {
							return button;
						}
					}),
				},
			}));

			return;
		}

		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("ss");
			}

			ctx.drawImage(img, 0, 0);

			set((state) => ({
				configuration: {
					name: state.configuration!.name,
					colorCode: state.configuration!.colorCode,
					size: state.configuration!.size + image.size,
					buttons: state.configuration!.buttons.map((button, buttonIndex) => {
						if (buttonIndex === id - 1) {
							return { ...button, imageUrl: canvas.toDataURL("image/png") };
						} else {
							return button;
						}
					}),
				},
			}));
		};

		img.src = URL.createObjectURL(image);
	},
	uploadButtonAudio: async (id, audio) => {
		const { configuration } = get();

		if (!configuration) {
			return;
		}

		if (!audio) {
			set(() => ({
				configuration: {
					...configuration,
					name: configuration.name,
					colorCode: configuration.colorCode,
					buttons: configuration.buttons.map((button, buttonIndex) => {
						if (buttonIndex === id - 1) {
							return {
								...button,
								audioUrl: null,
							};
						} else {
							return button;
						}
					}),
				},
			}));

			return;
		}

		try {
			const arrayBuffer = await audio.arrayBuffer();
			const audioCtx = new AudioContext();
			const decoded = await audioCtx.decodeAudioData(arrayBuffer);

			const sampleRate = 22000;
			const offlineCtx = new OfflineAudioContext(1, decoded.duration * sampleRate, sampleRate);
			const source = offlineCtx.createBufferSource();
			source.buffer = decoded;
			source.connect(offlineCtx.destination);
			source.start(0);

			const rendered = await offlineCtx.startRendering();
			const samples = rendered.getChannelData(0);
			const numSamples = rendered.length;
			const wavData = new ArrayBuffer(44 + numSamples * 2);
			const view = new DataView(wavData);

			const writeStr = (offset: number, str: string) => {
				for (let i = 0; i < str.length; i++) {
					view.setUint8(offset + i, str.charCodeAt(i));
				}
			};

			// Write WAV header
			writeStr(0, "RIFF");
			view.setUint32(4, 36 + numSamples * 2, true);
			writeStr(8, "WAVE");
			writeStr(12, "fmt ");
			view.setUint32(16, 16, true); // Subchunk1Size
			view.setUint16(20, 1, true); // AudioFormat (PCM)
			view.setUint16(22, 1, true); // NumChannels (mono)
			view.setUint32(24, sampleRate, true); // SampleRate
			view.setUint32(28, sampleRate * 2, true); // ByteRate
			view.setUint16(32, 2, true); // BlockAlign
			view.setUint16(34, 16, true); // BitsPerSample
			writeStr(36, "data");
			view.setUint32(40, numSamples * 2, true); // Subchunk2Size

			// Write 16-bit PCM samples
			for (let i = 0; i < numSamples; i++) {
				const s = Math.max(-1, Math.min(1, samples[i]));
				view.setInt16(44 + i * 2, s * 0x7fff, true);
			}

			set((state) => ({
				configuration: {
					name: configuration.name,
					colorCode: configuration.colorCode,
					size: configuration.size + audio.size,
					buttons: configuration.buttons.map((button, buttonIndex) => {
						if (buttonIndex === id - 1) {
							return {
								...button,
								audioUrl: URL.createObjectURL(new Blob([view], { type: "audio/wav" })),
							};
						} else {
							return button;
						}
					}),
				},
			}));
		} catch (err) {
			toast.error(`Převod zvuku selhal s chybou: ${err}`);

			return;
		}
	},
	updateButtonLabel: (id, label) => {
		set((state) => {
			const currentConfig = state.configuration!;

			return {
				configuration: {
					name: currentConfig.name,
					colorCode: currentConfig.colorCode,
					size: currentConfig.size,
					buttons: currentConfig.buttons.map((button, buttonIndex) => {
						if (buttonIndex === id - 1) {
							return { ...button, label };
						} else {
							return button;
						}
					}),
				},
			};
		});
	},
	generateConfigurationPdf: async () => {
		const { configuration } = get();

		if (configuration) {
			await generatePdf({ configuration });
		}
	},
}));
