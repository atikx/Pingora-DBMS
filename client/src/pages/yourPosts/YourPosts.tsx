import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/axiosinstance";
import VerticalPost from "@/components/custom/VerticalPost";

type Post = {
  id: string;
  title: string;
  description: string;
  image: string;
  views: number;
  tags: string[];
  category: string;
  created_at: string;
  is_scheduled: boolean;
  scheduled_at: string | null;
  author_name: string;
  author_email: string;
  author_avatar: string;
};

function YourPosts() {
  const { user } = useAuthStore((state) => state);

  const getYourPosts = async (): Promise<Post[]> => {
    const res = await api.get("/admin/getYourPosts");
    return res.data;
  };

  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["yourPosts", user?.id],
    queryFn: getYourPosts,
    enabled: !!user?.id,
  });

  // Separate posts into scheduled and uploaded
  const scheduledPosts = posts.filter((post) => post.is_scheduled);
  const uploadedPosts = posts.filter((post) => !post.is_scheduled);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading your posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-red-500">Error loading posts. Please try again.</div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-500">Please log in to view your posts.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Posts</h1>
      
      {/* Scheduled Posts Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Scheduled Posts</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            {scheduledPosts.length} posts
          </span>
        </div>
        
        {scheduledPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {scheduledPosts.map((post) => (
              <div key={post.id} className="relative">
                <VerticalPost post={post} />
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                  Scheduled
                </div>
                {post.scheduled_at && (
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    Scheduled for: {new Date(post.scheduled_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No scheduled posts found.</p>
          </div>
        )}
      </section>

      {/* Uploaded Posts Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Published Posts</h2>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            {uploadedPosts.length} posts
          </span>
        </div>
        
        {uploadedPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {uploadedPosts.map((post) => (
              <div key={post.id} className="relative">
                <VerticalPost post={post} />
                <div className="mt-2 text-xs text-gray-600 text-center">
                    Created on: {new Date(post.created_at).toLocaleString()}
                  </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                  Published
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No published posts found.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default YourPosts;
