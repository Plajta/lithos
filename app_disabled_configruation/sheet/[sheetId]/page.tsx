import { notFound } from "next/navigation";
import { ExportSheetButton } from "~/components/export-sheet-button";
import { ImageCard } from "~/components/button-card";
import { prisma } from "~/modules/prisma";

export default async function Page({ params }: { params: Promise<{ sheetId: string }> }) {
	const { sheetId } = await params;

	const sheet = await prisma.sheet.findFirst({
		where: {
			id: +sheetId,
		},
		include: {
			buttons: {
				orderBy: {
					createdAt: "asc",
				},
				include: {
					files: true,
				},
			},
		},
	});

	if (!sheet) {
		return notFound();
	}

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-8 pb-0">
			<div className="flex justify-between items-center">
				<div className="flex gap-2 items-center">
					<div
						style={{
							backgroundColor: sheet.colorCode,
							width: 15,
							height: 15,
							borderRadius: "50%",
							display: "inline-block",
						}}
					></div>
					<p className="text-xl font-bold">{sheet.name}</p>
				</div>

				<ExportSheetButton id={sheet.id} />
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
				{sheet.buttons.map((item) => (
					<ImageCard key={item.id} item={item} sheetId={sheet.id} />
				))}
			</div>
		</div>
	);
}
