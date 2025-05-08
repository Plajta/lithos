import { createSheet } from "~/actions/sheet/create";
import { DialogWrapper } from "~/components/dialog-wrapper";
import { FormWrapper } from "~/components/form-wrapper";
import { Button } from "~/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

export default async function Page() {
	return (
		<DialogWrapper>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Tvorba Konfigurace</DialogTitle>
				</DialogHeader>

				<FormWrapper action={createSheet} className="flex flex-col gap-4">
					<div className="flex flex-col gap-4">
						<div className="grid w-full items-center gap-1.5">
							<Label htmlFor="picture">Název</Label>
							<Input name="name" placeholder="Název konfigurace" />
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<div className="grid w-full items-center gap-1.5">
							<Label htmlFor="picture">Typ komunikátoru</Label>

							<RadioGroup name="type" defaultValue="plajta">
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="plajta" id="option-one" />
									<Label htmlFor="option-one">Sisyphus</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="ft12" id="option-two" />
									<Label htmlFor="option-two">QuickTalker FT12</Label>
								</div>
							</RadioGroup>
						</div>
					</div>

					<Button>Vytvořit</Button>
				</FormWrapper>
			</DialogContent>
		</DialogWrapper>
	);
}
