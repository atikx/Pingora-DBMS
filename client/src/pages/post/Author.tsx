import  { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bell, BellRing, Crown, Heart } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { defineAbilityFor } from "@/lib/ability";
import { Can } from "@casl/react";
import { toast } from "sonner";
import api from "@/lib/axiosinstance";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface AuthorProps {
  author_id: string;
  post_id: string; // Optional post_id prop for like functionality
  name: string;
  avatar: string;
  email: string;
  date: string;
  tags?: string[];
}

export default function Author({
  author_id,
  post_id,
  name,
  email,
  avatar,
  date,
  tags = [],
}: AuthorProps) {
  const user = useAuthStore((state) => state.user);
  const ability = defineAbilityFor(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // State management
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isCheckingSubscription, setIsCheckingSubscription] =
    useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState<boolean>(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null
  );
  const [isLiked, setIsLiked] = useState<boolean>(false); // State for like button
  // Check subscription status on component mount
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      // Only check if user exists and is not the author
      if (!user?.id || user.id === author_id) {
        return;
      }

      setIsCheckingSubscription(true);
      setSubscriptionError(null);

      try {
        const res = await api.get(
          `/verifiedUser/checkSubscription/${author_id}`
        );
        setIsSubscribed(res.status === 200);
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [user?.id, author_id]);

  const handleDeletePost = async () => {
    try {
      const res = await api.put(`/admin/deletePost/${post_id}`);
      if (res.status === 200) {
        toast.success("Post deleted successfully!");
        setShowDeleteDialog(false);
        navigate("/yourPosts");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    }
  };

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id || !post_id) {
        return;
      }

      try {
        const res = await api.get(`/verifiedUser/checkLike/${post_id}`);
        setIsLiked(res.status === 200);
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };

    checkLikeStatus();
  }, [user?.id, post_id]);

  // Subscribe function
  const handleSubscribe = async (): Promise<void> => {
    setIsSubscribing(true);
    setSubscriptionError(null);

    try {
      const res = await api.post("/verifiedUser/addSubscription", {
        author_id,
      });

      if (res.status !== 200) {
        throw new Error("Failed to subscribe");
      }

      setIsSubscribed(true);
      toast.success("Subscribed successfully!");
    } catch (error) {
      console.error("Error subscribing to author:", error);
      toast.error("Failed to subscribe. Please try again.");
      setSubscriptionError("Failed to subscribe");
    } finally {
      setIsSubscribing(false);
    }
  };

  // Unsubscribe function
  const handleUnsubscribe = async (): Promise<void> => {
    setIsUnsubscribing(true);
    setSubscriptionError(null);

    try {
      const res = await api.post("/verifiedUser/deleteSubscription", {
        author_id,
      });

      if (res.status !== 200) {
        throw new Error("Failed to unsubscribe");
      }

      setIsSubscribed(false);
      toast.success("Unsubscribed successfully!");
    } catch (error) {
      console.error("Error unsubscribing from author:", error);
      toast.error("Failed to unsubscribe. Please try again.");
      setSubscriptionError("Failed to unsubscribe");
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.post("/verifiedUser/addLike", {
        post_id,
      });
      if (res.status === 200) {
        setIsLiked(true);
        queryClient.invalidateQueries({
          queryKey: ["likedPosts"],
        });
        toast.success("Post liked");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("Failed to like post. Please try again.");
      return;
    }
  };

  const handleUnlike = async () => {
    try {
      const res = await api.post("/verifiedUser/deleteLike", {
        post_id,
      });
      if (res.status === 200) {
        setIsLiked(false);
        queryClient.invalidateQueries({
          queryKey: ["likedPosts"],
        });
        toast.success("Post unliked");
      }
    } catch (error) {
      console.error("Error unliking post:", error);
      toast.error("Failed to unlike post. Please try again.");
      return;
    }
  };

  // Combined loading state
  const isLoading = isCheckingSubscription || isSubscribing || isUnsubscribing;

  // Don't render subscription button if user is not logged in or is the author
  const shouldShowSubscriptionButton = user?.id && user.id !== author_id;
  const shouldShowLikeButton = user?.id && user.id !== author_id; // Show like button if user is logged in and onLike is provided

  return (
    <div className="mr-6 mt-6 sticky top-6 space-y-6">
      <Card className="backdrop-blur-md w-72 bg-white/10 border border-white/20 rounded-2xl shadow-xl overflow-hidden transition duration-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-center">Author</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20 rounded-xl border-2 border-white/30">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>

            {/* Like Button */}
            {shouldShowLikeButton && (
              <Can I="like" a="post" ability={ability}>
                <div className="w-full">
                  <Button
                    onClick={isLiked ? handleUnlike : handleLike}
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    className={`w-full transition-all duration-300 ${
                      isLiked
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "hover:bg-red-50 hover:text-red-500 hover:border-red-500"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 mr-2 transition-all duration-200 ${
                        isLiked ? "fill-current" : ""
                      }`}
                    />
                    {isLiked ? "Liked" : "Like Post"}
                  </Button>
                </div>
              </Can>
            )}

            {/* Subscribe/Unsubscribe Button - only show if user is not the author */}
            {shouldShowSubscriptionButton && (
              <Can I="subscribe" a="author" ability={ability}>
                <div className="w-full">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-2">
                      <ClipLoader
                        color="#3b82f6"
                        loading={true}
                        size={20}
                        aria-label="Loading Spinner"
                      />
                      <span className="ml-2 text-sm">
                        {isCheckingSubscription
                          ? "Checking..."
                          : isSubscribing
                          ? "Subscribing..."
                          : "Unsubscribing..."}
                      </span>
                    </div>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={isSubscribed ? "default" : "outline"}
                          size="sm"
                          className={`w-full transition-all duration-300 ${
                            isSubscribed
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "hover:bg-primary hover:text-primary-foreground"
                          }`}
                          disabled={isLoading}
                        >
                          {isSubscribed ? (
                            <>
                              <BellRing className="w-4 animate-bounce h-4 mr-2" />
                              Subscribed
                            </>
                          ) : (
                            <>
                              <Bell className="w-4 animate-bounce h-4 mr-2" />
                              Subscribe
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {isSubscribed ? "Unsubscribe" : "Subscribe"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You {isSubscribed ? "will not" : "will"} be notified
                            when the author uploads a new post. Are you sure you
                            want to {isSubscribed ? "unsubscribe" : "subscribe"}
                            ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={
                              isSubscribed ? handleUnsubscribe : handleSubscribe
                            }
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <ClipLoader
                                color="#ffffff"
                                loading={true}
                                size={16}
                                aria-label="Loading"
                              />
                            ) : isSubscribed ? (
                              "Unsubscribe"
                            ) : (
                              "Subscribe"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Can>
            )}

            {/* Show "Your Post" section if user is the author */}
            {user?.id === author_id && (
              <div className="w-full flex flex-col gap-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 p-4 backdrop-blur-sm border border-white/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-orange-600/10 animate-pulse"></div>
                  <div className="relative flex items-center justify-center space-x-2">
                    <Crown className="w-5 h-5 animate-bounce" />
                    <span className="text-sm animate-bounce font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                      Your Post
                    </span>
                    <Crown
                      className="w-5 h-5 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
                <div>
                  <AlertDialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        Delete Post
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this post? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeletePost}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Error handling */}
            {subscriptionError && shouldShowSubscriptionButton && (
              <div className="text-red-500 text-sm text-center">
                {subscriptionError}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="w-full py-2 px-3 rounded-xl bg-[#f5f5f5] backdrop-blur-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-medium">Published on : </span>
              <span className="text-xs font-medium">
                {new Date(date).toLocaleDateString()}
              </span>
            </div>
          </div>
          {/* Tags section */}
          {tags && tags.length > 0 && (
            <div className="mt-4 w-full">
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
