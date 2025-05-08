"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "~/components/ui/dialog";

interface DialogWrapperProps {
	children: React.ReactNode;
}

export function DialogWrapper({ children }: DialogWrapperProps) {
	const router = useRouter();

	function onOpenChange(open: boolean): void {
		if (!open) {
			router.back();
		}
	}

	return (
		<Dialog open onOpenChange={onOpenChange}>
			{children}
		</Dialog>
	);
}
