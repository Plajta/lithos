"use client";

import { ConfigurationActions } from "~/components/configuration-actions";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "~/components/ui/breadcrumb";
import { useConfigurationStore } from "~/store/useConfigurationStore";

export function PageBreadcrumb() {
	const { configuration } = useConfigurationStore();

	return (
		configuration && (
			<Breadcrumb className="flex-1 flex">
				<BreadcrumbList className="flex-1 flex">
					<BreadcrumbItem className="flex-1 flex">
						<BreadcrumbPage className="line-clamp-1 flex-1 flex">
							<div className="flex-1 flex justify-between pr-1">
								<div className="flex gap-2 items-center">
									<div
										style={{
											backgroundColor: configuration.colorCode,
											width: 15,
											height: 15,
											borderRadius: "50%",
											display: "inline-block",
										}}
									></div>

									<p className="font-bold">{configuration.name}</p>
								</div>
								<ConfigurationActions />
							</div>
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		)
	);
}
