import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import ClipLoader from "react-spinners/ClipLoader";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import api from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { shallow } from "zustand/shallow"; // ✅ Import shallow

const FormSchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

export function Otp() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pin: "",
    },
  });

  const navigate = useNavigate();

  // ✅ Use Zustand with shallow to avoid unnecessary rerenders
  const setUser = useAuthStore((state) => state.setUser, shallow);

  const { mutate, isLoading } = useMutation({
    mutationFn: async (data: z.infer<typeof FormSchema>) => {
      const res = await api.post("/user/verifyOtp", data);
      return res;
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success("Verified successfully");
        setUser(res.data.user); // ✅ Safe usage
        navigate("/");
      }
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.response?.data || "Verification failed");
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data.pin);
    mutate(data);
  }

  return (
    <div className="flex justify-center items-center px-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl"
        >
          <h2 className="text-4xl font-bold text-center text-primary">
            Verify OTP
          </h2>

          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl w-full flex justify-center text-center">
                  One-Time Password
                </FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    {...field}
                    className="justify-between gap-3"
                  >
                    <InputOTPGroup className="gap-3">
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="text-2xl w-12 h-14 border rounded-md"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormDescription className="text-base mt-2 text-gray-600">
                  Please enter the one-time password sent to your Email.
                </FormDescription>
                <FormMessage className="text-sm text-red-500" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full cursor-pointer text-lg py-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <ClipLoader size={20} color="#ffffff" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Submit"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
