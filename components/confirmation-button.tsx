import { PopoverClose, PopoverContentProps } from "@radix-ui/react-popover";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

interface ConfirmationButtonProps {
	disclaimer: string;
	action: () => Promise<void>;
	side?: PopoverContentProps["side"];
	destructive?: boolean;
	children: React.ReactNode;
}

export function ConfirmationButton({ disclaimer, action, side, destructive, children }: ConfirmationButtonProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>{children}</PopoverTrigger>

			<PopoverContent className="p-2" side={side}>
				<div className="flex flex-col gap-2">
					<p>{disclaimer}</p>

					<div className="flex gap-2">
						<PopoverClose asChild className="flex-1">
							<Button variant="outline" size="sm">
								Zrušit
							</Button>
						</PopoverClose>

						<Button
							variant={destructive ? "destructive" : "outline"}
							className="flex-1"
							size="sm"
							onClick={async () => await action()}
						>
							Potvrdit
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
