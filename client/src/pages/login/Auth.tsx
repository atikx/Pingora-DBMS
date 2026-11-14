import { useState } from "react";
import { GalleryVerticalEnd } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ClipLoader from "react-spinners/ClipLoader";

import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  type UserCredential,
  type Auth,
  type AuthProvider,
} from "firebase/auth";
import api from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { useMutation } from "@tanstack/react-query";

export default function Auth({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [waitingForOtp, setWaitingForOtp] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const loginMutation = useMutation({
    mutationFn: async () => {
      // For debugging, you can add a delay to see the loading state more clearly
      // await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await api.post("/user/auth", { email, password });
      return res;
    },
    onMutate: () => {
      // This runs before the mutation function
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(res.data.message, {
          description: "Welcome",
        });
        setUser(res.data.user);
        navigate("/");
      } else if (res.status === 201) {
        toast.success("Please verify your email");
        setUser(res.data.user);
        navigate("/auth/otp");
      } else if (res.status === 404) {
        toast.error(res.data);
      }
    },
    onError: (error: any) => {
      console.error("Login mutation failed", error);
      toast.error(` ${error.response.data}`);
    },
    onSettled: () => {
      // This runs when the mutation is either successful or fails
    }
  });



  const googleMutation = useMutation({
    mutationFn: async () => {
      const result: UserCredential = await signInWithPopup(
        auth as Auth,
        googleProvider as AuthProvider
      );
      const user = result.user;
      const token = await user.getIdToken();
      const res = await api.post("/user/auth", {
        token,
      });
      return res;
    },
    onMutate: () => {
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(res.data.message, {
          description: "Welcome",
        });
        setUser(res.data.user);
        navigate("/");
      }
    },
    onError: (error: any) => {
      console.error("Google login mutation failed", error);
      toast.error(`Login Failed ${error.message}`);
    },
    onSettled: () => {
    }
  });

  // Monitor mutation state changes for debugging


  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  const handleGoogleLogin = () => {
    googleMutation.mutate();
  };

  return (
    <div
      className={cn("flex flex-col gap-6 h-full justify-center", className)}
      {...props}
    >
      <form onSubmit={handleFormSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to PINGORA</h1>
            <div className="text-center text-sm">
              Login or create an account to continue
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isLoading  || waitingForOtp}
            >
              {loginMutation.isLoading  ? (
                <div className="flex items-center justify-center gap-2">
                  <ClipLoader size={20} color="#ffffff" />
                  <span>Loading...</span>
                </div>
              ) : (
                "Login / SignUp"
              )}
            </Button>
          </div>
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-1">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              type="button"
              disabled={googleMutation.isLoading }
            >
              {googleMutation.isLoading  ? (
                <div className="flex items-center justify-center gap-2">
                  <ClipLoader size={20} color="#000000" />
                  <span>Loading...</span>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
