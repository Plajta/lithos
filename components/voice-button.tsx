import { PopoverClose } from "@radix-ui/react-popover";
import { Loader2, Plus, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { VoiceRecorder } from "~/components/voice-recorder";
import { useConfigurationStore } from "~/store/useConfigurationStore";

interface VoiceButtonProps {
	index: number;
	source: string | null;
}

export function VoiceButton({ index, source }: VoiceButtonProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const { uploadButtonAudio } = useConfigurationStore();

	const playSound = () => {
		if (audioRef.current) {
			setIsPlaying(true);
			audioRef.current.play();
		}
	};

	const handleAudioEnded = () => {
		setIsPlaying(false);
	};

	return (
		<div className="flex items-center justify-center">
			{source ? (
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline">
							<Volume2 />
						</Button>
					</PopoverTrigger>

					<PopoverContent className="p-1 w-[--radix-popover-trigger-width] gap-1 flex h-12">
						<PopoverClose asChild>
							<Button variant="outline" onClick={() => uploadButtonAudio(index, null)} disabled={!source}>
								Smazat
							</Button>
						</PopoverClose>

						<Separator orientation="vertical" />

						<Button variant="outline" onClick={playSound} disabled={!source}>
							{isPlaying ? <Loader2 className="animate-spin" /> : "Přehrát"}
						</Button>
					</PopoverContent>
				</Popover>
			) : (
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="outline">
							<Plus />
						</Button>
					</PopoverTrigger>

					<PopoverContent className="p-1 w-[--radix-popover-trigger-width]">
						<VoiceRecorder index={index} />
					</PopoverContent>
				</Popover>
			)}

			{source && <audio ref={audioRef} src={source} onEnded={handleAudioEnded} style={{ display: "none" }} />}
		</div>
	);
}
