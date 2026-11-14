import React, { useState } from "react";
import { format } from "date-fns";
import {  MessageCircle, Reply, Send, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Can } from "@casl/react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useAuthStore } from "@/lib/store";
import { defineAbilityFor } from "@/lib/ability";
import { toast } from "sonner";
import api from "@/lib/axiosinstance";

type CommentType = {
  id: string;
  user_id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar: string;
  children?: CommentType[];
};

function buildCommentTree(comments: CommentType[]) {
  const map = new Map<string, CommentType>();
  const roots: CommentType[] = [];

  comments.forEach((comment) => {
    comment.children = [];
    map.set(comment.id, comment);
  });

  comments.forEach((comment) => {
    if (comment.parent_id) {
      const parent = map.get(comment.parent_id);
      if (parent) {
        parent.children!.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

const CommentForm = ({
  onSubmit,
  onCancel,
  placeholder = "Write a comment...",
  isReply = false,
  user,
  ability,
}: {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  isReply?: boolean;
  user: any;
  ability: any;
}) => {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await onSubmit(content.trim());
    setContent("");
    if (onCancel) onCancel();
  };

  return (
    <Card className={`${isReply ? "ml-6 mt-3" : "mt-6"} border shadow-sm`}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
              <AvatarImage
                src={user?.avatar || "https://api.dicebear.com/6.x/initials/svg?seed=CU"}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "CU"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-foreground text-sm">
                  {user?.name || "Current User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(), "MMM d, h:mm a")}
                </span>
              </div>

              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="min-h-[80px] resize-none border-muted-foreground/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1">
                <X className="h-3 w-3" />
                Cancel
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!content.trim()} className="gap-1">
              <Send className="h-3 w-3" />
              {isReply ? "Reply" : "Comment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const CommentCard = ({
  comment,
  depth = 0,
  onReply,
  user,
  ability,
}: {
  comment: CommentType;
  depth?: number;
  onReply: (parentId: string, content: string) => void;
  user: any;
  ability: any;
}) => {
  const isNested = depth > 0;
  const maxDepth = 3;
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = (content: string) => {
    onReply(comment.id, content);
    setShowReplyForm(false);
  };

  const userName = comment.user_name || "Anonymous User";
  const userAvatar = comment.user_avatar || "https://api.dicebear.com/6.x/initials/svg?seed=AU";

  return (
    <div className={`${isNested ? "ml-6 mt-3" : "mt-6"} relative`}>
      {isNested && (
        <div className="absolute -left-6 top-0 w-px h-full bg-gradient-to-b from-border via-border/50 to-transparent" />
      )}

      <Card className={`transition-all duration-200 hover:shadow-md border-0 ${
        isNested
          ? "bg-gradient-to-r from-muted/30 to-background shadow-sm"
          : "bg-background shadow-sm hover:shadow-lg"
      }`}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className={`${isNested ? "h-8 w-8" : "h-10 w-10"} ring-2 ring-background shadow-sm`}>
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground truncate">{userName}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "MMM d, h:mm a")}
                </span>
              </div>

              <div className="text-sm text-foreground/90 leading-relaxed mb-3">
                {comment.content}
              </div>

              <Can I="create" a="comment" ability={ability}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </Button>
              </Can>
            </div>
          </div>
        </CardContent>
      </Card>

      {showReplyForm && (
        <CommentForm
          onSubmit={handleReply}
          onCancel={() => setShowReplyForm(false)}
          placeholder={`Reply to ${userName}...`}
          isReply={true}
          user={user}
          ability={ability}
        />
      )}

      {comment.children && comment.children.length > 0 && depth < maxDepth && (
        <div className="space-y-0">
          {comment.children.map((child) => (
            <CommentCard
              key={child.id}
              comment={child}
              depth={depth + 1}
              onReply={onReply}
              user={user}
              ability={ability}
            />
          ))}
        </div>
      )}

      {comment.children && comment.children.length > 0 && depth >= maxDepth && (
        <div className="ml-6 mt-3">
          <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">
            View {comment.children.length} more {comment.children.length === 1 ? "reply" : "replies"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default function Comments({ post_id }: { post_id: string }) {
  const [showAddComment, setShowAddComment] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore((state) => state);
  const ability = defineAbilityFor(user);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', post_id],
    queryFn: async () => {
      const res = await api.get(`/general/getComments/${post_id}`);
      return res.data || [];
    },
    refetchOnWindowFocus: false,
    enabled: !!post_id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parent_id }: { content: string; parent_id?: string | null }) => {
      const res = await api.post("/verifiedUser/addComment", {
        post_id,
        content,
        parent_id,
      });
      return res.data.comment || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', post_id] });
      toast.success("Comment added successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response.data || "Failed to add comment");
    },
  });

  const nestedComments = buildCommentTree(comments);
  const totalComments = comments.length;

  const handleAddComment = async (content: string) => {
    await addCommentMutation.mutateAsync({ content, parent_id: null });
    setShowAddComment(false);
  };

  const handleReply = async (parentId: string, content: string) => {
    await addCommentMutation.mutateAsync({ content, parent_id: parentId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Comments</h2>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Comments</h2>
            <Badge variant="outline" className="text-xs">{totalComments}</Badge>
          </div>

          <Can I="create" a="comment" ability={ability}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowAddComment(!showAddComment)}
            >
              <MessageCircle className="h-4 w-4" />
              Add Comment
            </Button>
          </Can>
        </div>
      </div>

      {showAddComment && (
        <CommentForm
          onSubmit={handleAddComment}
          onCancel={() => setShowAddComment(false)}
          placeholder="Share your thoughts..."
          user={user}
          ability={ability}
        />
      )}

      <div className="space-y-0">
        {nestedComments.length > 0 ? (
          nestedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              user={user}
              ability={ability}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No comments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Be the first to share your thoughts!</p>
            <Can I="create" a="comment" ability={ability}>
              <Button className="gap-2" onClick={() => setShowAddComment(true)}>
                <MessageCircle className="h-4 w-4" />
                Start the conversation
              </Button>
            </Can>
          </div>
        )}
      </div>
    </div>
  );
}
