"use client"
import {
    useState
} from "react"
import {
    toast
} from "sonner"
import {
    useForm
} from "react-hook-form"
import {
    zodResolver
} from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    useRouter
} from "next/navigation" // Import useRouter
import {
    Button
} from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Input
} from "@/components/ui/input"
import {
    Card,
    CardHeader,
    CardDescription,
    CardTitle
} from "@/components/ui/card"

const formSchema = z.object({
    YTStreamKey: z.string().min(1, {
        message: "Stream key is required"
    })
});

export default function StreamKeyForm() {
    const router = useRouter(); // Initialize the router

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            YTStreamKey: ""
        }
    });

    async function onSubmit(values) {
        try {
            console.log(values);
            toast(
                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(values, null, 2)}</code>
                </pre>
            );

            // Store the stream key in session storage
            await sessionStorage.setItem("YTStreamKey", values.YTStreamKey);

            // Redirect to /stream
            router.push("/stream");
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
        }
    }

    return (
        <>
            <div className="card-div flex justify-center mt-30">

                <Card className={'w-full max-w-md'}>

                    <CardHeader >
                        <CardTitle>YouTube Stream Setup</CardTitle>

                        <CardDescription>Do not share this key with anyone otherwise anyone can stream on behalf of you</CardDescription>
                    </CardHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="px-10 space-y-3">
                            <FormField
                                control={form.control}
                                name="YTStreamKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stream Key</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="********************************"
                                                type="text"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>Paste the stream key obtained from YouTube Studio</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className={'cursor-pointer'}>Submit</Button>
                        </form>
                    </Form>

                </Card>

            </div>

        </>
    )
}