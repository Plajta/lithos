import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverClose } from "@radix-ui/react-popover";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Colors, ConfigurationTypes, useConfigurationStore } from "~/store/useConfigurationStore";

const FormSchema = z.object({
	name: z.string().min(3, {
		message: "Konifugrace musí mít alespoň 3 písmena.",
	}),
	type: z.enum(ConfigurationTypes),
	colorCode: z.enum(Colors),
});

export function NewConfigurationPopover() {
	const { createConfiguration } = useConfigurationStore();

	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			name: "",
		},
	});

	function onSubmit(data: z.infer<typeof FormSchema>) {
		createConfiguration(data);
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Nová Konfigurace</Button>
			</PopoverTrigger>

			<PopoverContent side="right" align="start">
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
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rozložení</FormLabel>

									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Vyber rožložení" />
											</SelectTrigger>
										</FormControl>

										<SelectContent>
											{ConfigurationTypes.map((type) => (
												<SelectItem key={`configuration-${type}`} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

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
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end">
							<PopoverClose asChild>
								<Button type="submit">Vytvořit</Button>
							</PopoverClose>
						</div>
					</form>
				</Form>
			</PopoverContent>
		</Popover>
	);
}
