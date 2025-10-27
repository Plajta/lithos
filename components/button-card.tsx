import { Upload, X } from "lucide-react";
import { useRef } from "react";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { VoiceButton } from "~/components/voice-button";
import { Button as ButtonType, useConfigurationStore } from "~/store/useConfigurationStore";

export function ButtonCard({ button: { label, imageUrl, audioUrl, id } }: { button: ButtonType }) {
	const { uploadButtonImage, updateButtonLabel } = useConfigurationStore();

	const previousValue = useRef(label);

	return (
		<Card className="h-[280px] p-0 gap-0 justify-between">
			<CardHeader className="flex-1 flex flex-col items-center justify-center p-0">
				{imageUrl ? (
					<div className="relative group w-full h-full">
						<div className="flex justify-center items-center h-full">
							<img width={150} height={100} src={imageUrl} className="rounded-t-xl object-cover" />
						</div>

						<div
							className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-t-xl"
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
						className="flex-1 flex items-center p-0 m-0 justify-center w-full border-2 border-gray-300 border-dashed rounded-t-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
					>
						<div className="flex flex-col items-center justify-center flex-1">
							<div className="flex flex-col items-center justify-center pt-5 pb-6">
								<Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />

								<p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
									<span className="font-semibold">Klikni pro nahrání obrázku</span> nebo přetáhni
									soubor
								</p>

								<p className="text-xs text-gray-500 dark:text-gray-400">zatím jenom PNG</p>
							</div>
						</div>

						<input
							id={`dropzone-file-${id}`}
							accept="image/png"
							type="file"
							className="hidden"
							onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
								const file = event.target.files?.[0];
								if (!file) return;

								uploadButtonImage(id, file);
							}}
						/>
					</label>
				)}
			</CardHeader>

			<div>
				<Separator />

				<CardContent className="p-4">
					<div className="flex flex-col gap-4">
						<div className="flex justify-between items-center">
							<Input
								className="text-lg p-0 m-0"
								variant="ghost"
								placeholder={`Text tlačítka ${id + 1}`}
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

							<div className="flex gap-1">
								<VoiceButton index={id} source={audioUrl} />
							</div>
						</div>
					</div>
				</CardContent>
			</div>
		</Card>
	);
}
