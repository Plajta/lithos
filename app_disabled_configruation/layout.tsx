export default function Layout({ dialogs, children }: { dialogs: React.ReactNode; children: React.ReactNode }) {
	return (
		<>
			{dialogs}
			{children}
		</>
	);
}
