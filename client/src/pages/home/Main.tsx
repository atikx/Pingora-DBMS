import VerticalPost from "@/components/custom/VerticalPost";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import api from "@/lib/axiosinstance";

import { ClipLoader } from "react-spinners";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const fetchPosts = async ({ filter = "Latest", page = 1 }) => {
  const response = await api.get("/general/getAllPosts", {
    params: { filter, page, limit: 8 },
  });
  return response.data;
};

export default function Main() {
  const [filter, setFilter] = useState("Latest");
  const [currentPage, setCurrentPage] = useState(1);


  const {
    data: postsData = { posts: [], pagination: { totalPages: 0 } },
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["posts", filter, currentPage],
    queryFn: () => fetchPosts({ filter, page: currentPage }),
    refetchOnWindowFocus: false,
  });

  // Destructure the updated API response structure
  const { posts = [], pagination = { totalPages: 1, currentPage: 1 } } =
    postsData;

  const handleFilterChange = (value : any) => {
    setFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page : any) => {
    setCurrentPage(page);
  };

  // Generate section title based on filter
  const getSectionTitle = () => {
    switch (filter) {
      case "Latest":
        return "Latest Posts";
      case "Oldest":
        return "Oldest Posts";
      case "Most Popular":
        return "Most Popular Posts";
      default:
        return "Posts";
    }
  };

  // Generate pagination items
  const generatePaginationItems = () => {
    const totalPages = pagination.totalPages;
    const items = [];
    
    // Logic for showing page numbers with ellipsis
    if (totalPages <= 4) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink 
            isActive={currentPage === 1}
            onClick={() => handlePageChange(1)}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is more than 3
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show current page and adjacent pages
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink 
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is less than totalPages - 2
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink 
            isActive={currentPage === totalPages}
            onClick={() => handlePageChange(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          <b className="text-primary">|</b> {getSectionTitle()}
        </h1>

        {/* Filter Component */}
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[180px]">{filter}</SelectTrigger>
          <SelectContent>
            <SelectItem value="Latest">Latest</SelectItem>
            <SelectItem value="Oldest">Oldest</SelectItem>
            <SelectItem value="Most Popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <ClipLoader color="#4F46E5" size={40} />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <p className="text-center text-red-500 text-lg">
          Something went wrong while fetching posts.
        </p>
      )}

      {/* No Posts State */}
      {!isLoading && posts.length === 0 && (
        <p className="text-center text-gray-400 text-lg">No posts available.</p>
      )}

      {/* Posts Grid */}
      {!isLoading && posts.length > 0 && (
        <div className="flex-wrap flex justify-center gap-8">
          {posts.map((post : any, index : any) => (
            <VerticalPost key={post.id || index} post={post} />
          ))}
        </div>
      )}

      {/* Shadcn Pagination Component */}
      {!isLoading && pagination.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {generatePaginationItems()}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < pagination.totalPages && handlePageChange(currentPage + 1)}
                className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      
    </div>
  );
}
