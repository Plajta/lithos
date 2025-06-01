import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export const ConfigurationTypes = ["sysiphus"] as const;

const FormSchema = z.object({
	name: z.string().min(3, {
		message: "Konifugrace musí mít alespoň 3 písmena.",
	}),
	type: z.enum(ConfigurationTypes),
});

export function NewConfigurationPopover() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			name: "",
		},
	});

	function onSubmit(data: z.infer<typeof FormSchema>) {
		toast("You submitted the following values", {
			description: (
				<pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
					<code className="text-white">{JSON.stringify(data, null, 2)}</code>
				</pre>
			),
		});
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Nová Konfigurace</Button>
			</PopoverTrigger>

			<PopoverContent side="right">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
									<FormLabel>Rozložení konfigurace</FormLabel>

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

						<div className="flex justify-end">
							<Button type="submit">Vytvořit</Button>
						</div>
					</form>
				</Form>
			</PopoverContent>
		</Popover>
	);
}
