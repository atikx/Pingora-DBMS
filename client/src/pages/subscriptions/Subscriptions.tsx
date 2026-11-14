import { useAuthStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axiosinstance";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserMinus, Calendar, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Subscription {
  id: string;
  name: string;
  avatar: string;
  created_at: string;
  member_since: string;
}

interface SubscriptionsResponse {
  message: string;
  subscriptions: Subscription[];
}

interface SelectedSubscription {
  id: string;
  name: string;
}

export default function Subscriptions() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedSubscription, setSelectedSubscription] =
    useState<SelectedSubscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Fetch subscriptions using TanStack Query
  const {
    data: subscriptionsData,
    isLoading,
    error,
  } = useQuery<SubscriptionsResponse>({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const response = await api.get("/verifiedUser/getSubscriptions");
      return response.data;
    },
    enabled: !!user,
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await api.put(`/verifiedUser/deleteSubscription/`, {
        author_id: subscriptionId,
      });
      return response.data;
    },
    onSuccess: (data, subscriptionId) => {
      console.log("Unsubscribed user ID:", subscriptionId);
      toast.success("Successfully unsubscribed!");
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setSelectedSubscription(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to unsubscribe. Please try again.");
    },
  });

  const handleUnsubscribe = () => {
    if (selectedSubscription) {
      unsubscribeMutation.mutate(selectedSubscription.id);
    }
  };

  const openUnsubscribeDialog = (subscription: Subscription) => {
    setSelectedSubscription({
      id: subscription.id,
      name: subscription.name,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedSubscription(null);
    setIsDialogOpen(false);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="rounded-full bg-muted p-6 mx-auto w-fit">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Authentication Required
            </h3>
            <p className="text-muted-foreground">
              Please log in to view your subscriptions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-6 mx-auto w-fit">
            <UserMinus className="h-12 w-12 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-destructive">
              Error Loading Subscriptions
            </h3>
            <p className="text-muted-foreground">
              Something went wrong. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const subscriptions = subscriptionsData?.subscriptions || [];
  

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              My Subscriptions
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your subscriptions and stay updated with your favorite
              creators
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {subscriptions.length}{" "}
            {subscriptions.length === 1 ? "Subscription" : "Subscriptions"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="rounded-full bg-muted p-8 mb-6">
            <UserMinus className="h-16 w-16 text-muted-foreground" />
          </div>
          <div className="space-y-4 max-w-md">
            <h3 className="text-2xl font-semibold">No subscriptions yet</h3>
            <p className="text-muted-foreground text-lg">
              You haven't subscribed to anyone yet. Start exploring to find
              interesting creators and stay updated with their latest content!
            </p>
            <Button className="mt-4">Explore Creators</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-0 shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-2 ring-background shadow-lg">
                      <AvatarImage
                        src={subscription.avatar}
                        alt={subscription.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                        {getInitials(subscription.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>

                  <div className="space-y-3 w-full">
                    <h3 className="font-semibold text-xl leading-tight line-clamp-2">
                      {subscription.name}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          Member since {formatDate(subscription.member_since)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          Subscribed {formatDate(subscription.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 pb-6 px-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 transition-colors"
                  onClick={() => openUnsubscribeDialog(subscription)}
                  disabled={unsubscribeMutation.isPending}
                >
                  {unsubscribeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unsubscribing...
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Unsubscribe
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Confirm Unsubscribe
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to unsubscribe from{" "}
              <span className="font-semibold text-foreground">
                {selectedSubscription?.name}
              </span>
              ? You will no longer receive updates from this creator and will
              need to resubscribe to see their content again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={closeDialog} className="flex-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribe}
              className="bg-primary text-white hover:bg-destructive/90 flex-1"
              disabled={unsubscribeMutation.isPending}
            >
              {unsubscribeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unsubscribing...
                </>
              ) : (
                "Unsubscribe"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
