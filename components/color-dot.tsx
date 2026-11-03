interface ColorDot {
	size: number;
	value: string;
}

export function ColorDot({ size, value }: ColorDot) {
	return (
		<div
			style={{
				backgroundColor: value,
				width: size,
				height: size,
				borderRadius: "50%",
				display: "inline-block",
				border: "1px solid rgba(0,0,0,0.2)",
				boxSizing: "border-box",
			}}
		></div>
	);
}
