import { useMemo } from "react";
import { useProtocol } from "~/components/protocol-context";

export function ProtocolInfo() {
	const { protocol } = useProtocol();

	const usedTotal = useMemo(
		() =>
			protocol.connected
				? (
						(100 / (protocol.connected.info.blockSize * protocol.connected.info.blockCount)) *
						protocol.connected.info.usedBlockCount *
						protocol.connected.info.blockSize
				  ).toFixed(2)
				: null,
		[protocol]
	);

	return (
		protocol.connected && (
			<div>
				<div className="flex justify-center gap-3 border rounded-lg bg-white p-3 text-sm">
					<div className="flex flex-col justify-center">
						<div className="animate-pulse bg-green-500 w-2 h-2 rounded-2xl"></div>
					</div>

					<div className="flex flex-col align-top">
						<p>Připojeno zařízení: {protocol.connected.info.deviceName}</p>
						<p>
							Verze zařízení: {protocol.connected.info.version} ({protocol.connected.info.gitCommitSha})
						</p>
						<p>
							Využito: {usedTotal}% z{" "}
							{Math.round(
								(protocol.connected.info.blockSize * protocol.connected.info.blockCount) / 1000000
							).toFixed(1)}{" "}
							MB
						</p>
					</div>
				</div>
			</div>
		)
	);
}
