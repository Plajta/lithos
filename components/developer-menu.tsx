import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProtocol } from "~/components/protocol-context";
import { ProtocolInfo } from "~/components/protocol-info";
import { Button } from "~/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";

interface OutputLine {
	command: string | null;
	line: string;
}

export function DeveloperMenu() {
	const [menuOpen, setMenuOpen] = useState<boolean>(false);
	const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
	const [output, setOutput] = useState<OutputLine[]>([]);
	const [pushFileArguments, setPushFileArguments] = useState<{ blob: Blob | null; dest: string | null }>({
		blob: null,
		dest: null,
	});

	const { connect, protocol } = useProtocol();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			setKeysPressed((prevKeys) => {
				const newKeys = new Set(prevKeys);
				newKeys.add(event.code);
				return newKeys;
			});
		};

		const handleKeyUp = (event: KeyboardEvent): void => {
			setKeysPressed((prevKeys) => {
				const newKeys = new Set(prevKeys);
				newKeys.delete(event.code);
				return newKeys;
			});
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	useEffect(() => {
		if (
			(keysPressed.has("Digit6") || keysPressed.has("Numpad6")) &&
			(keysPressed.has("Digit9") || keysPressed.has("Numpad9")) &&
			(keysPressed.has("ControlLeft") ||
				keysPressed.has("ControlRight") ||
				keysPressed.has("MetaLeft") ||
				keysPressed.has("MetaRight"))
		) {
			setKeysPressed(new Set());
			setMenuOpen((prev) => !prev);
		}
	}, [keysPressed]);

	return (
		<Dialog open={menuOpen} onOpenChange={setMenuOpen}>
			<DialogContent className="h-[90vh] flex min-w-[90vw] flex-col">
				<DialogHeader>
					<DialogTitle>Developer Menu</DialogTitle>
				</DialogHeader>

				{!protocol.connected && (
					<Button onClick={async () => await connect()} variant="outline">
						<p>Připojit Komunikátor</p>
					</Button>
				)}

				<ProtocolInfo />

				<div className="flex flex-col gap-2 flex-1">
					<Separator />

					{!protocol.connected ? (
						<p className="font-bold text-center">Pro posílání příkazů prosím připojte zařízení!</p>
					) : (
						<div className="flex flex-col gap-2 flex-1">
							<p className="text-sm">Dostupné příkazy</p>

							<div className="flex flex-col justify-between gap-10 flex-1">
								<div className="grid grid-cols-3 gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											const response = await protocol.commands.info();

											setOutput((prev) => [
												...prev,
												{ command: "INFO", line: JSON.stringify(response.data) },
											]);
										}}
									>
										info
									</Button>

									<div className="col-span-2"></div>

									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											if (!pushFileArguments.blob || !pushFileArguments.dest) {
												toast.error("Požadované argumenty nejsou vyplňěny!");

												return;
											}
											const response = await protocol.commands.push(
												pushFileArguments.blob,
												pushFileArguments.dest
											);

											setOutput((prev) => [
												...prev,
												{ command: "PUSH", line: JSON.stringify(response.data) },
											]);
										}}
									>
										push
									</Button>

									<Button variant="outline" size="sm">
										<Input
											type="file"
											variant="ghost"
											className="h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
											onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
												const file = event.target.files?.[0];
												if (!file) return;

												setPushFileArguments((prev) => ({ ...prev, blob: file }));
											}}
										/>
									</Button>

									<Input
										type="text"
										className="h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
										placeholder="file dest"
										onChange={(e) =>
											setPushFileArguments((prev) => ({ ...prev, dest: e.target.value }))
										}
									/>

									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											const response = await protocol.commands.ls();

											if (response.success) {
												for (const [index, item] of Object.entries(response.data)) {
													setOutput((prev) => [
														...prev,
														{
															command: +index === 0 ? "LS" : null,
															line: JSON.stringify(item),
														},
													]);
												}
											}
										}}
									>
										ls
									</Button>
								</div>

								<div className="grow flex flex-col text-sm gap-2">
									<Separator />

									<div className="flex justify-between items-center">
										<p>Výstup příkazu</p>

										<Button variant="outline" size="sm" onClick={() => setOutput([])}>
											Vymazat output
										</Button>
									</div>

									<div className="border rounded-lg p-2 grow flex flex-col gap-1 overflow-y-auto h-0">
										{output.map(({ command, line }, index) => (
											<p key={`line-${index}`} className={`${!command && "ml-[31px]"}`}>
												{command ? `${command} - ` : ""} {line}
											</p>
										))}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
