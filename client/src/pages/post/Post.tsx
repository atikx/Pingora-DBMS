import  { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SamplePostData } from "@/lib/samplePostData";
import { Separator } from "@/components/ui/separator";

import Author from "./Author";
import Comments from "./Comments";
import api from "@/lib/axiosinstance";
import { useQuery } from "@tanstack/react-query";
import ErrorBoundary from "@/components/custom/ErrorBoundary";

export default function Post() {
  const { id } = useParams<{ id: string }>();

  const {
    data: postData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const res = await api.get(`/general/getPost/${id}`);
      console.log(res.data);
      return res.data;
    },
    refetchOnWindowFocus: false,
    enabled: !!id,
  });

  // Get blocks from the content field or use sample data if not available
  const postBlocks = postData?.content?.blocks ?? SamplePostData;

  // State to track checklist items by block id for interactivity
  const [checklistState, setChecklistState] = useState<Record<string, any[]>>(
    {}
  );

  // Initialize checklist state from postBlocks on load or when postBlocks changes
  useEffect(() => {
    if (postBlocks) {
      const initialState: Record<string, any[]> = {};
      postBlocks.forEach((block: any) => {
        if (block.type === "list" && block.data.style === "checklist") {
          initialState[block.id] = block.data.items;
        }
      });
      setChecklistState(initialState);
    }
  }, [postBlocks]);

  // Toggle a checklist item checked status
  const toggleChecklistItem = (blockId: string, index: number) => {
    setChecklistState((prev) => {
      const updatedItems = [...(prev[blockId] || [])];
      updatedItems[index] = {
        ...updatedItems[index],
        meta: {
          ...updatedItems[index].meta,
          checked: !updatedItems[index].meta?.checked,
        },
      };
      return { ...prev, [blockId]: updatedItems };
    });
  };

  const renderBlock = (block: any) => {
    switch (block.type) {
      case "header": {
        const Tag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
        return <Tag key={block.id}>{block.data.text}</Tag>;
      }

      case "paragraph":
        return (
          <p
            className="text-black text-start text-lg leading-relaxed mb-4"
            key={block.id}
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );

      case "embed":
        return (
          <div key={block.id} className="my-4 w-full px-10 flex flex-col mb-6">
            <iframe
              width={block.data.width}
              height={block.data.height}
              className="h-[200px] md:h-[550px] rounded-lg w-full"
              src={block.data.embed}
              title={block.data.caption || "Embedded content"}
              frameBorder="0"
              allowFullScreen
            />
            {block.data.caption && (
              <p className="text-center border">{block.data.caption}</p>
            )}
          </div>
        );

      case "list":
        if (block.data.style === "unordered") {
          return (
            <ul key={block.id} className="list-disc pl-6">
              {block.data.items.map((item: any, index: number) => (
                <li key={index}>{item.content}</li>
              ))}
            </ul>
          );
        } else if (block.data.style === "ordered") {
          return (
            <ol key={block.id} className="list-decimal pl-6">
              {block.data.items.map((item: any, index: number) => (
                <li key={index}>{item.content}</li>
              ))}
            </ol>
          );
        } else if (block.data.style === "checklist") {
          const items = checklistState[block.id] || block.data.items;
          return (
            <ul key={block.id} className="pl-6 space-y-2">
              {items.map((item: any, index: number) => (
                <li key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={item.meta?.checked || false}
                    onChange={() => toggleChecklistItem(block.id, index)}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span
                    className={`text-base ${
                      item.meta?.checked ? "line-through text-gray-500" : ""
                    }`}
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </li>
              ))}
            </ul>
          );
        }
        return null;

      case "image":
        return (
          <img
            key={block.id}
            src={block.data.file.url}
            alt={block.data.caption || "Image"}
            className="rounded-md my-4 max-w-full"
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) return <div className="p-4">Loading post...</div>;
  if (isError || !postBlocks) return <div className="p-4">Post not found.</div>;

  return (
    <div className="flex-col flex lg:flex-row w-full">
      {/* Render the post content */}
      <div
        id="editorjs"
        className="p-4 box-border w-full space-y-4 editorjs flex-grow"
      >
        <ErrorBoundary>
          {postBlocks.map((block: any) => renderBlock(block))}
        </ErrorBoundary>
        <ErrorBoundary>
          <Comments post_id={postData.id} />
        </ErrorBoundary>
      </div>

      {/* Vertical Separator */}
      <div className="mx-4 hidden md:flex items-center">
        <Separator
          orientation="vertical"
          className="h-[calc(100vh-4rem)] bg-gradient-to-b from-transparent via-gray-300 to-transparent opacity-50"
        />
      </div>

      {/* Render the author area with tags */}
      <ErrorBoundary>
        <div className="md:w-1/4 flex justify-center items-center md:block">
          {postData && (
            <Author
              author_id={postData.author_id}
              post_id={postData.id}
              name={postData.author_name}
              avatar={postData.author_avatar}
              email={postData.author_email}
              date={postData.created_at}
              tags={postData.tags}
            />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
