"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthTabs({ onVerificationRequired }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Check URL for tab parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "register") {
      setActiveTab("register");
    }
  }, [searchParams]);

  // Update URL when tab changes without full navigation
  const handleTabChange = (value) => {
    setActiveTab(value);

    // Update URL without navigation
    const url = new URL(window.location);
    if (value === "login") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", value);
    }
    window.history.pushState({}, "", url);
  };

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    institution: "",
  });

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: loginData.email,
        password: loginData.password,
      });

      if (result.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          // Notify parent component to show verification dialog
          onVerificationRequired(loginData.email);
        } else {
          toast.error(result.error);
        }
      } else {
        router.push("/sign");
        router.refresh();
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/sign" });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          institution: registerData.institution || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast.success(
        "Registration successful! Please check your email to verify your account."
      );
      
      setRegisterData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        institution: "",
      });
      
      setActiveTab("login");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login" className="text-base font-medium">
            Login
          </TabsTrigger>
          <TabsTrigger value="register" className="text-base font-medium">
            Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <motion.div
            key="login-content"
            initial="hidden"
            animate="visible"
            variants={tabContentVariants}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Login to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit}>
                  <div className="grid gap-6">
                    <div className="flex flex-col gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="mr-2 h-4 w-4"
                        >
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        Login with Google
                      </Button>
                    </div>
                    <div className="relative text-center text-sm before:absolute before:inset-0 before:top-1/2 before:z-0 before:flex before:items-center before:border-t before:border-muted">
                      <span className="bg-card text-muted-foreground relative z-10 px-2">
                        Or continue with
                      </span>
                    </div>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          value={loginData.email}
                          onChange={handleLoginChange}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Password</Label>
                          <a
                            href="#"
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                          >
                            Forgot password?
                          </a>
                        </div>
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          value={loginData.password}
                          onChange={handleLoginChange}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full mt-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="register">
          <motion.div
            key="register-content"
            initial="hidden"
            animate="visible"
            variants={tabContentVariants}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create account</CardTitle>
                <CardDescription>
                  Enter your information below to create your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={registerData.name}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="institution">
                        Institution (Optional)
                      </Label>
                      <Input
                        id="institution"
                        name="institution"
                        type="text"
                        placeholder="University or Organization"
                        value={registerData.institution}
                        onChange={handleRegisterChange}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        required
                        placeholder="Please enter a strong password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={handleRegisterChange}
                        required
                        placeholder="Please confirm your password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full mt-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center pb-6">
                <p className="text-center text-sm text-muted-foreground">
                  By clicking continue, you agree to our{" "}
                  <a href="#" className="underline underline-offset-4">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="underline underline-offset-4">
                    Privacy Policy
                  </a>
                  .
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}