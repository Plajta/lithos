import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ColorDot } from "~/components/color-dot";

import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { COLOR_LOOKUP_TABLE, Colors, useConfigurationStore } from "~/store/useConfigurationStore";

const FormSchema = z.object({
	name: z.string().min(3, {
		message: "Konifugrace musí mít alespoň 3 písmena.",
	}),
	colorCode: z.enum(Colors),
});

export function EditConfigurationPopover() {
	const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

	const { updateConfiguration, configuration } = useConfigurationStore();

	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		values: {
			name: configuration?.name!,
			colorCode: configuration?.colorCode as any,
		},
	});

	function onSubmit(data: z.infer<typeof FormSchema>) {
		form.reset();

		setPopoverOpen(false);

		updateConfiguration(data);
	}

	return (
		<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<ColorDot size={10} value={`#${COLOR_LOOKUP_TABLE[form.getValues().colorCode]}`} />
					<p>{form.getValues().name}</p>
				</Button>
			</PopoverTrigger>

			<PopoverContent side="bottom" align="start">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2" autoComplete="off">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Jméno</FormLabel>

									<FormControl>
										<Input placeholder="cool jméno" {...field} />
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="colorCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Barva</FormLabel>

									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Vyber barvu" />
											</SelectTrigger>
										</FormControl>

										<SelectContent>
											{Colors.map((type) => (
												<SelectItem key={`configuration-${type}`} value={type}>
													<span className="flex gap-2 items-center">
														<ColorDot size={10} value={`#${COLOR_LOOKUP_TABLE[type]}`} />
														<p>{type}</p>
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end">
							<Button type="submit">Uložit</Button>
						</div>
					</form>
				</Form>
			</PopoverContent>
		</Popover>
	);
}
