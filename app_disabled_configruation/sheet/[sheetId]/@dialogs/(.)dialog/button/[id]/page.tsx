import { editButton } from "~/actions/button/edit";
import { DialogWrapper } from "~/components/dialog-wrapper";
import { FormWrapper } from "~/components/form-wrapper";
import { Button } from "~/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { VoiceRecorder } from "~/components/voice-recorder";
import { prisma } from "~/modules/prisma";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const button = await prisma.button.findFirst({
		where: {
			id: +id,
		},
	});

	return (
		button && (
			<DialogWrapper>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Úprava tlačítka {id}</DialogTitle>
					</DialogHeader>

					<FormWrapper action={editButton} className="flex flex-col gap-2">
						<input type="hidden" name="id" value={id} />

						<div className="flex flex-col gap-4">
							<div className="grid w-full items-center gap-1.5">
								<Label htmlFor="picture">Text</Label>
								<Input name="text" placeholder="Text tlačítka" defaultValue={button.text} />
							</div>

							<div className="grid w-full items-center gap-1.5">
								<Label htmlFor="picture">Obrázek</Label>
								<Input id="picture" name="image" type="file" accept="image/png" />
							</div>

							<div className="grid w-full items-center gap-1.5">
								<Label htmlFor="picture">Zvuk</Label>
								<VoiceRecorder />
							</div>
						</div>

						<Button>Uložit</Button>
					</FormWrapper>
				</DialogContent>
			</DialogWrapper>
		)
	);
}
