import { Upload } from "lucide-react";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { VoiceButton } from "~/components/voice-button";
import { Button as ButtonType, useConfigurationStore } from "~/store/useConfigurationStore";

export function ButtonCard({ button: { label, imageUrl, audioUrl }, index }: { button: ButtonType; index: number }) {
	const { uploadButtonImage, updateButtonLabel } = useConfigurationStore();

	return (
		<Card className="h-[280px] p-0 gap-0 justify-between">
			<CardHeader className="flex-1 flex flex-col items-center justify-center p-0">
				{imageUrl ? (
					<img width={150} height={100} src={imageUrl} />
				) : (
					<label
						htmlFor="dropzone-file"
						className="flex-1 flex items-center p-0 m-0 justify-center w-full border-2 border-gray-300 border-dashed rounded-t-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
					>
						<div className="flex flex-col items-center justify-center flex-1">
							<div className="flex flex-col items-center justify-center pt-5 pb-6">
								<Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />

								<p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
									<span className="font-semibold">Klikni pro nahrání</span> nebo přetáhni soubor
								</p>

								<p className="text-xs text-gray-500 dark:text-gray-400">zatím jenom PNG</p>
							</div>
						</div>

						<input
							id="dropzone-file"
							accept="image/png"
							type="file"
							className="hidden"
							onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
								const file = event.target.files?.[0];
								if (!file) return;

								uploadButtonImage(index, file);
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
								defaultValue={label ?? "Není zadán text tlačítka"}
								onChange={(e) => updateButtonLabel(index, e.target.value)}
							/>

							<div className="flex gap-1">
								<VoiceButton source={audioUrl} />
							</div>
						</div>
					</div>
				</CardContent>
			</div>
		</Card>
	);
}
