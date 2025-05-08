"use client";

import { ButtonCard } from "~/components/button-card";
import { useConfigurationStore } from "~/store/useConfigurationStore";

export default function Page() {
	const { configuration } = useConfigurationStore();

	return configuration ? (
		<div className="flex flex-1 flex-col gap-4 px-4 pb-0">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
				{configuration.buttons.map((item) => (
					<ButtonCard key={item.label} button={item} />
				))}
			</div>
		</div>
	) : (
		<div className="flex flex-1 flex-col gap-4 px-4 py-10 justify-center items-center">
			<div className="flex flex-col">
				<p className="text-xl font-bold text-center">Komunikátor není připojen.</p>
				<p className="text-muted-foreground text-sm">
					Pro konfiguraci komuníkátoru prosím ho prosím připojte do USB díry, díks
				</p>
			</div>
		</div>
	);
}
