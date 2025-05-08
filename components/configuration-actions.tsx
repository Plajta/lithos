"use client";

import { Button } from "~/components/ui/button";

export function ConfigurationActions() {
	return (
		<div className="flex gap-2">
			<Button variant="outline" onClick={() => console.log("uložit")}>
				Uložit konfiguraci
			</Button>
		</div>
	);
}
