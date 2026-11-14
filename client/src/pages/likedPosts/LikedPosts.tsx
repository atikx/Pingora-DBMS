import api from "@/lib/axiosinstance";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store";
import VerticalPost from "@/components/custom/VerticalPost";

type LikedPost = {
  id: string;
  title: string;
  description: string;
  image: string;
  views: number;
  tags: string[];
  category: string;
  created_at: string;
  author_name: string;
  author_email: string;
  author_avatar: string;
};

type LikedPostsResponse = {
  message: string;
  likedPosts: LikedPost[];
};

export default function LikedPosts() {
  const { user } = useAuthStore((state) => state);

  const {
    data: likedPostsData,
    isLoading,
    error,

    isError,
  } = useQuery<LikedPostsResponse>({
    queryKey: ["likedPosts", user?.id],
    queryFn: async () => {
      const res = await api.get("/verifiedUser/getLikedPosts");
      return res.data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-500 text-center">
          {error.status === 404 ? (
            <h3 className="text-lg font-semibold mb-2">No liked posts found</h3>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Error loading liked posts
              </h3>
              <p className="text-sm">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const likedPosts = likedPostsData?.likedPosts || [];

  if (likedPosts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-semibold mb-2">No liked posts yet</h3>
          <p className="text-sm">Start exploring and like some posts!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Liked Posts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {likedPosts.map((post) => (
          <VerticalPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
