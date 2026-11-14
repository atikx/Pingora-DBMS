import { useNavigate } from "react-router-dom";

type PostProps = {
  id?: string;
  title: string;
  description: string;
  image: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
  views?: number;
  is_scheduled?: boolean;
  scheduled_at?: string;
};

const VerticalPost = ({ post }: { post: PostProps }) => {
  const navigate = useNavigate();
  return (
    <div
      className="backdrop-blur-md p-2 cursor-pointer hover:scale-105 transition duration-500 bg-white/10 border border-white/20 rounded-2xl shadow-xl w-80 overflow-hidden"
      onClick={() => {
        if (post.id) navigate(`/post/${post.id}`);
      }}
    >
      <div className="rounded-sm h-full overflow-hidden">
        <img
          src={post.image}
          alt="Post cover"
          className="w-full rounded-sm h-48 object-cover"
        />
        <div className="pt-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
            <p className="text-sm h-12 overflow-x-clip mb-4">
              {post.description}
            </p>
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-sm bg-[#f5f5f5] backdrop-blur-lg">
            <div className="flex items-center gap-2">
              <img
                src={post.author_avatar}
                alt={post.author_name}
                className="w-8 h-8 rounded-sm"
              />
              <div>
                <p className="text-sm font-medium">{post.author_name}</p>
                <p className="text-xs">
                  {new Date(post.created_at).toDateString()}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              {post.views >= 0 && `${post.views} views`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerticalPost;
