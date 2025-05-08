import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { VoiceButton } from "~/components/voice-button";
import { Button as ButtonType } from "~/store/useConfigurationStore";

export function ButtonCard({ button: { label, imageUrl, audioUrl } }: { button: ButtonType }) {
	return (
		<Card style={{ height: 280 }}>
			<CardHeader className="flex justify-center">
				<div style={{ height: 150 }}>
					{imageUrl ? <img width={150} height={100} src={imageUrl} /> : <p>Není nahrán obrázek</p>}
				</div>
			</CardHeader>

			<Separator />

			<CardContent>
				<div className="flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<Input className="text-lg p-0 m-0" variant="ghost" defaultValue={label} />

						<div className="flex gap-1">
							<VoiceButton source={audioUrl} />

							{/* <Link href={`/dashboard/configuration/sheet/${sheetId}/dialog/button/${id}`}>
								<Button variant="outline">
									<Edit />
								</Button>
							</Link> */}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
