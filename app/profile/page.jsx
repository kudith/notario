"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  if (status === "loading") {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium leading-none">Name</h3>
              <p className="text-sm text-muted-foreground mt-1">{session?.user?.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium leading-none">Email</h3>
              <p className="text-sm text-muted-foreground mt-1">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 