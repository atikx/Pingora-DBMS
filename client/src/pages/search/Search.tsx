import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/lib/axiosinstance";
import { useQuery } from "@tanstack/react-query";
import { ClipLoader } from "react-spinners";
import VerticalPost from "@/components/custom/VerticalPost";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function Search() {
  const { query } = useParams<{ query: string }>();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState("Latest");
  const POSTS_PER_PAGE = 8;

  const fetchSearchResults = async () => {
    const res = await api.get(`/general/searchPost`, {
      params: {
        search: query,
        page: currentPage,
        limit: POSTS_PER_PAGE,
        sort
      }
    });
    return res.data;
  };

  const {
    data: postsData = { posts: [], pagination: { totalPages: 0 } },
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ["searchResults", query, currentPage, sort],
    queryFn: fetchSearchResults,
    enabled: !!query,
    refetchOnWindowFocus: false,
  });

  const { posts = [], pagination = { totalPages: 1, currentPage: 1 } } = postsData;

  // Refetch when query changes
  useEffect(() => {
    if (query) {
      setCurrentPage(1);
      refetch();
    }
  }, [query, refetch]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Generate pagination items
  const generatePaginationItems = () => {
    const totalPages = pagination.totalPages;
    const items = [];
    
    if (totalPages <= 5) {
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
    <div className="container h-full w-full mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          <b className="text-primary">|</b> Search Results for "{query}"
        </h1>
        
        {/* Sort Selector */}
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">{sort}</SelectTrigger>
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
          Something went wrong while searching for posts.
        </p>
      )}

      {/* No Posts State */}
      {!isLoading && posts.length === 0 && (
        <p className="text-center text-gray-400 text-lg py-10">
          No posts found matching your search query.
        </p>
      )}

      {/* Posts Grid */}
      {!isLoading && posts.length > 0 && (
        <div className="flex justify-center flex-wrap gap-8">
          {posts.map((post, index) => (
            <VerticalPost key={post.id || index} post={post} />
          ))}
        </div>
      )}

      {/* Pagination Component */}
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
