"use client";

import { ColorDot } from "~/components/color-dot";
import { ConfigurationActions } from "~/components/configuration-actions";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "~/components/ui/breadcrumb";
import { useConfigurationStore } from "~/store/useConfigurationStore";

export function PageBreadcrumb() {
	const { configuration } = useConfigurationStore();

	return (
		<Breadcrumb className="flex-1 flex">
			<BreadcrumbList className="flex-1 flex">
				<BreadcrumbItem className="flex-1 flex">
					<BreadcrumbPage className="line-clamp-1 flex-1 flex">
						<div className="flex-1 flex justify-between pr-1">
							<div className="flex gap-2 items-center">
								{configuration && (
									<>
										<ColorDot size={10} value={`#${configuration.colorCode}`} />

										<p className="font-bold">{configuration.name}</p>
									</>
								)}
							</div>

							<ConfigurationActions />
						</div>
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
