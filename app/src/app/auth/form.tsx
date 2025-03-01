"use client"

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import useCsrf from "@/hooks/use-csrf";
import { useLogin, useRegister } from "@/hooks/react-queries/auth";

const AuthForm = ({ isSignIn }: { isSignIn: boolean }) => {
  const router = useRouter();
  const csrfToken = useCsrf()
  const successCallback = () => {
    router.push("/")
  }
  const loginMutation = useLogin(successCallback);
  const registerMutation = useRegister(successCallback);
  const baseSchema = z.object({
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." }),
    name: z.string().optional(),
    email: z.string().optional(),
  });

  let formSchema: z.ZodObject<z.ZodRawShape> = baseSchema;

  if (!isSignIn) {
    formSchema = formSchema.extend({
      name: z.string().min(3, {
        message: "Name must be at least 3 characters.",
      }),
      email: z.string().email({
        message: "Invalid email format.",
      }),
    });
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "frothymeow",
      password: "Meow123!",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const body: any = {
      username: values.username,
      password: values.password,
      csrfToken: csrfToken
    };
    if (!isSignIn) {
      body.name = values.name;
      body.email = values.email;
      registerMutation.mutate(body);
    } else {
      loginMutation.mutate(body);
    }



  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isSignIn ? "Sign in to your account" : "Sign up to get started"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  {!isSignIn && (
                    <FormDescription>
                      This is your public display name.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {!isSignIn && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              {isSignIn ? "Sign in" : "Sign up"}
            </Button>
          </CardFooter>
          <div className="px-4 pb-4">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
              >
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center font-medium text-sm/6">
                <span className="px-6 text-gray-900 bg-white">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
              <a
                href="#"
                className="flex items-center justify-center w-full gap-3 px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
                  <path
                    fill="#1877F2"
                    d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.495V14.706H9.691v-3.62h3.129V8.413c0-3.1 1.893-4.788 4.657-4.788 1.324 0 2.463.099 2.794.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.763v2.315h3.59l-.467 3.62h-3.123V24h6.125c.732 0 1.325-.593 1.325-1.326V1.326C24 .593 23.407 0 22.675 0z"
                  />
                </svg>
                <span className="font-semibold text-sm/6">Facebook</span>
              </a>
              <a
                href="#"
                className="flex items-center justify-center w-full gap-3 px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
                  <path
                    d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                    fill="#EA4335"
                  />
                  <path
                    d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                    fill="#34A853"
                  />
                </svg>
                <span className="font-semibold text-sm/6">Google</span>
              </a>
            </div>
          </div>
        </Card>
      </form>
    </Form>
  );
};


export default AuthForm;
