import { useState } from "react";

export function use() {
	const [processing, setProcessing] = useState(false);

	const convert = async (file: File): Promise<Blob | null> => {
		setProcessing(true);
		try {
			const arrayBuffer = await file.arrayBuffer();
			const audioCtx = new AudioContext();
			const decoded = await audioCtx.decodeAudioData(arrayBuffer);

			const sampleRate = 44100;
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

			return new Blob([view], { type: "audio/wav" });
		} catch (err) {
			console.error("Conversion failed:", err);
			return null;
		} finally {
			setProcessing(false);
		}
	};

	return { convert, processing };
}
