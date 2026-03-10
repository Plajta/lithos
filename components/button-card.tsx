import { ImageIcon, Loader2, Mic, Music, Upload, Volume2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { VoiceRecorder } from "~/components/voice-recorder";
import { Button as ButtonType, useConfigurationStore } from "~/store/useConfigurationStore";

type Mode = "image" | "audio";

export function ButtonCard({ button: { label, imageUrl, audioUrl, id } }: { button: ButtonType }) {
	const { uploadButtonImage, uploadButtonAudio, updateButtonLabel } = useConfigurationStore();

	const previousValue = useRef(label);
	const [isDragging, setIsDragging] = useState(false);
	const [mode, setMode] = useState<Mode>("image");
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const dropzoneBase = `flex-1 flex items-center p-0 m-0 justify-center w-full border-2 border-dashed rounded-t-xl transition-colors`;
	const dropzoneIdle = `border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800 hover:bg-gray-100 cursor-pointer`;
	const dropzoneDrag = `border-blue-400 bg-blue-50 dark:bg-blue-950 cursor-copy`;

	return (
		<Card className="h-[280px] p-0 gap-0 justify-between">
			<CardHeader className="flex-1 flex flex-col items-center justify-center p-0 overflow-hidden">
				{mode === "image" ? (
					imageUrl ? (
						<div className="relative group w-full flex-1 min-h-0 overflow-hidden rounded-t-xl">
							<div className="w-full h-full">
								<img src={imageUrl} className="w-full h-full object-contain" />
							</div>
							<div
								className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
								onClick={() => uploadButtonImage(id, null)}
								role="button"
								aria-label="Odebrat obrázek"
							>
								<X className="w-10 h-10 text-white" />
							</div>
						</div>
					) : (
						<label
							id={`dropzone-file-${id}`}
							className={`${dropzoneBase} ${isDragging ? dropzoneDrag : dropzoneIdle}`}
							onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
							onDragLeave={() => setIsDragging(false)}
							onDrop={(e) => {
								e.preventDefault();
								setIsDragging(false);
								const file = e.dataTransfer.files?.[0];
								if (!file) return;
								uploadButtonImage(id, file);
							}}
						>
							<div className="flex flex-col items-center justify-center flex-1">
								<Upload className={`w-8 h-8 transition-colors ${isDragging ? "text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
							</div>
							<input
								id={`dropzone-file-${id}`}
								accept="image/png,image/jpeg,image/webp,image/bmp"
								type="file"
								className="hidden"
								onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
									const file = event.target.files?.[0];
									if (!file) return;
									uploadButtonImage(id, file);
								}}
							/>
						</label>
					)
				) : (
					audioUrl ? (
						<div className="relative group w-full flex-1 min-h-0 overflow-hidden rounded-t-xl flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-700">
							<Volume2 className="w-10 h-10 text-gray-500 dark:text-gray-400" />
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										if (audioRef.current) {
											setIsPlaying(true);
											audioRef.current.play();
										}
									}}
									disabled={isPlaying}
								>
									{isPlaying ? <Loader2 className="animate-spin" /> : "Přehrát"}
								</Button>
								<Button variant="outline" size="sm" onClick={() => uploadButtonAudio(id, null)}>
									<X className="w-4 h-4" />
								</Button>
							</div>
							<audio
								ref={audioRef}
								src={audioUrl}
								onEnded={() => setIsPlaying(false)}
								style={{ display: "none" }}
							/>
						</div>
					) : (
						<div
							className={`${dropzoneBase} ${isDragging ? dropzoneDrag : dropzoneIdle} flex-col gap-3`}
							onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
							onDragLeave={() => setIsDragging(false)}
							onDrop={(e) => {
								e.preventDefault();
								setIsDragging(false);
								const file = e.dataTransfer.files?.[0];
								if (!file) return;
								uploadButtonAudio(id, file);
							}}
						>
							<Music className={`w-8 h-8 transition-colors ${isDragging ? "text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
							<div className="flex gap-2">							<label className="cursor-pointer">
								<Button variant="outline" size="sm" asChild>
									<span><Upload className="w-4 h-4" /></span>
								</Button>
								<input
									accept="audio/*"
									type="file"
									className="hidden"
									onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
										const file = event.target.files?.[0];
										if (!file) return;
										uploadButtonAudio(id, file);
									}}
								/>
							</label>								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline" size="sm"><Mic className="w-4 h-4" /></Button>
									</PopoverTrigger>
									<PopoverContent className="p-1 w-auto">
										<VoiceRecorder index={id} />
									</PopoverContent>
								</Popover>
							</div>
						</div>
					)
				)}
			</CardHeader>

			<div>
				<Separator />

				<CardContent className="p-4">
					<div className="flex justify-between items-center">
						<Input
							className="text-lg p-0 m-0"
							variant="ghost"
							placeholder={`Text tlačítka ${id}`}
							value={label ?? ""}
							onFocus={() => previousValue.current === label}
							onKeyDown={(e: any) => {
								if (e.key === "Escape") {
									updateButtonLabel(id, previousValue.current!);
									e.target.blur();
								}
							}}
							onClick={(e: any) => e.target.select()}
							onChange={(e) => updateButtonLabel(id, e.target.value)}
						/>
						<Button
							variant="outline"
							size="icon"
							onClick={() => { setMode((m) => (m === "image" ? "audio" : "image")); setIsDragging(false); }}
							aria-label="Přepnout režim"
						>
							{mode === "image" ? <Music className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
						</Button>
					</div>
				</CardContent>
			</div>
		</Card>
	);
}
