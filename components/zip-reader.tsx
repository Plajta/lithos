import React, { useState, ChangeEvent } from "react";
import JSZip from "jszip";

interface ZipFile {
	name: string;
	content: string;
}

const ZipReader: React.FC = () => {
	const [fileList, setFileList] = useState<ZipFile[]>([]);

	const handleZipUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const zip = new JSZip();
		const content = await file.arrayBuffer();
		const zipContent = await zip.loadAsync(content);

		const files: ZipFile[] = [];

		for (const fileName of Object.keys(zipContent.files)) {
			const zipEntry = zipContent.files[fileName];
			if (!zipEntry.dir) {
				const fileData = await zipEntry.async("string");
				files.push({ name: fileName, content: fileData });
			}
		}

		setFileList(files);
		console.log(files);
	};

	return (
		<div className="p-4">
			<input type="file" accept=".zip" onChange={handleZipUpload} />
			<ul>
				{fileList.map((file, index) => (
					<li key={index}>
						<strong>{file.name}</strong>
					</li>
				))}
			</ul>
		</div>
	);
};

export default ZipReader;
