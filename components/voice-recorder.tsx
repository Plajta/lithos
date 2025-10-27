import { PopoverClose } from "@radix-ui/react-popover";
import React, { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useConfigurationStore } from "~/store/useConfigurationStore";

export function VoiceRecorder({ index }: { index: number }) {
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [audioURL, setAudioURL] = useState<string | null>(null);
	const mediaRecorder = useRef<MediaRecorder | null>(null);
	const audioChunks = useRef<Blob[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const { uploadButtonAudio } = useConfigurationStore();

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder.current = new MediaRecorder(stream);
			audioChunks.current = [];

			mediaRecorder.current.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					audioChunks.current.push(event.data);
				}
			};

			mediaRecorder.current.onstop = () => {
				const blob = new Blob(audioChunks.current, { type: "audio/wav" });

				const url = URL.createObjectURL(blob);
				setAudioURL(url);

				if (blob && fileInputRef.current) {
					const dataTransfer = new DataTransfer();
					dataTransfer.items.add(new File([blob], "recording.wav", { type: "audio/wav" }));

					fileInputRef.current.files = dataTransfer.files;
				}
			};

			mediaRecorder.current.start();
			setIsRecording(true);
		} catch (err) {}
	};

	const stopRecording = () => {
		if (mediaRecorder.current && isRecording) {
			mediaRecorder.current.stop();
			setIsRecording(false);
		}
	};

	const finishRecording = async () => {
		if (!audioURL) {
			return;
		}

		const blob = await fetch(audioURL).then((r) => r.blob());

		uploadButtonAudio(index, blob);
	};

	return (
		<div className="flex gap-1 items-center h-10">
			{!isRecording && audioURL ? (
				<PopoverClose asChild>
					<Button type="button" variant="outline" onClick={finishRecording}>
						Dokončit Nahrávání
					</Button>
				</PopoverClose>
			) : (
				<Button
					type="button"
					variant={isRecording ? "destructive" : "outline"}
					onClick={isRecording ? stopRecording : startRecording}
				>
					{isRecording ? "Zastavit Nahrávání" : "Začít Nahrávat"}
				</Button>
			)}

			{audioURL && !isRecording && <audio className="h-10" controls src={audioURL} />}

			<input ref={fileInputRef} type="file" name="voice" style={{ display: "none" }} />

			<Separator orientation="vertical" />

			<Button asChild variant="outline">
				<label htmlFor="audioInput">
					Nahrát soubor
					<input
						id="audioInput"
						name="image"
						type="file"
						accept="audio/wav"
						hidden
						onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
							const file = event.target.files?.[0];
							if (!file) return;

							uploadButtonAudio(index, file);
						}}
					/>
				</label>
			</Button>
		</div>
	);
}
