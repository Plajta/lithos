"use client";

import React, { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function VoiceRecorder() {
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [audioURL, setAudioURL] = useState<string | null>(null);
	const mediaRecorder = useRef<MediaRecorder | null>(null);
	const audioChunks = useRef<Blob[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

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

	return (
		<div className="flex gap-4 items-center h-10">
			<Button
				type="button"
				className={`${isRecording ? "bg-red-600 hover:bg-red-500" : ""} text-white`}
				onClick={isRecording ? stopRecording : startRecording}
			>
				{isRecording ? "Zastavit Nahrávání" : "Začít Nahrávat"}
			</Button>

			{audioURL && !isRecording && <audio controls src={audioURL} />}

			<input ref={fileInputRef} type="file" name="voice" style={{ display: "none" }} />

			{!audioURL && !isRecording && <Input id="picture" name="image" type="file" accept="voice/wav" />}
		</div>
	);
}
