"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

interface FormWrapperProps {
	action: any;
	children: React.ReactNode;
	className?: string;
}

interface ResponseData {
	success: boolean;
	message?: string;
	redirect?: string;
}

export function FormWrapper({ action, children, className }: FormWrapperProps) {
	const router = useRouter();

	const { execute } = useAction(action, {
		onSuccess: ({ data }) => {
			const responseData = data as ResponseData;

			if (responseData.success) {
				if (responseData.redirect) {
					router.push(responseData.redirect);
				} else {
					router.back();
				}
			}
		},
	});

	return (
		<form action={execute} className={className}>
			{children}
		</form>
	);
}
