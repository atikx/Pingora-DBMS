import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  getFilteredRowModel,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Check, X, RefreshCw, Eye } from "lucide-react";
import api from "@/lib/axiosinstance";
import { toast } from "sonner";

interface AdminRequest {
  request_id: string;
  reason: string;
  request_created_at: string;
  request_updated_at: string;
  user_id: string;
  name: string;
  email: string;
  avatar: string;
  user_created_at: string;
}

interface AdminRequestsTableProps {
  onHandleRequest: (params: {
    requestId: string;
    action: "approve" | "reject";
  }) => void;
  isProcessing: boolean;
}

// Data fetching function
const fetchAdminRequests = async (): Promise<AdminRequest[]> => {
  const response = await api.get("/admin/getAdminRequests");
  return response.data;
};

export default function AdminRequests({
  isProcessing,
}: AdminRequestsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // TanStack Query to fetch data
  const {
    data = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminRequests"],
    queryFn: fetchAdminRequests,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Enhanced onHandleRequest to refetch data after action
  const handleRequestWithRefetch = async (params: {
    requestId: string;
    action: "approve" | "reject";
  }) => {
    try {
      console.log(`/admin/${params.action}AdminRequest`, {});
      const res = await api.put(`/admin/${params.action}AdminRequest`, {
        id: params.requestId,
      });
      if (res.status === 200) {
        toast.success(res.data);
      }
      refetch();
    } catch (error: any) {
      toast.error(error.response.message);
    }
  };

  // Component for displaying reason with expand functionality
  const ReasonCell = ({ reason, userName }: { reason: string; userName: string }) => {
    const isLong = reason.length > 50;
    const truncatedReason = isLong ? reason.substring(0, 50) + "..." : reason;

    if (!isLong) {
      return (
        <div className="max-w-[150px] md:max-w-[300px]">
          <p className="text-xs md:text-sm">{reason}</p>
        </div>
      );
    }

    return (
      <div className="max-w-[150px] md:max-w-[300px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <p className="text-xs md:text-sm truncate flex-1">
                  {truncatedReason}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Admin Request Reason</DialogTitle>
                      <DialogDescription>
                        Request from {userName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {reason}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{reason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const columns: ColumnDef<AdminRequest>[] = [
    {
      accessorKey: "name",
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback className="text-xs md:text-sm">
              {row.original.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm md:text-base truncate">
              {row.original.name}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground truncate">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
      filterFn: (row, id, value) => {
        const name = row.original.name.toLowerCase();
        const email = row.original.email.toLowerCase();
        const searchValue = value.toLowerCase();
        return name.includes(searchValue) || email.includes(searchValue);
      },
    },
    {
      accessorKey: "reason",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-xs md:text-sm"
        >
          Reason
          <ArrowUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ReasonCell reason={row.original.reason} userName={row.original.name} />
      ),
    },
    {
      accessorKey: "request_created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-xs md:text-sm hidden sm:flex"
        >
          Request Date
          <ArrowUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs md:text-sm hidden sm:block">
          {formatDate(row.original.request_created_at)}
        </div>
      ),
    },
    {
      accessorKey: "user_created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-xs md:text-sm hidden lg:flex"
        >
          User Since
          <ArrowUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs md:text-sm hidden lg:block">
          {formatDate(row.original.user_created_at)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-1 md:space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50 text-xs md:text-sm px-2 md:px-3"
                disabled={isProcessing || isPending}
              >
                <Check className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Approve</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-4 max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base md:text-lg">
                  Approve Admin Request
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Are you sure you want to Approve the admin request from{" "}
                  <strong>{row.original.name}</strong>? This will grant them
                  administrative privileges.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    handleRequestWithRefetch({
                      requestId: row.original.request_id,
                      action: "approve",
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  Approve Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50 text-xs md:text-sm px-2 md:px-3"
                disabled={isProcessing || isPending}
              >
                <X className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                <span className="hidden md:inline">Reject</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-4 max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base md:text-lg">
                  Reject Admin Request
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Are you sure you want to reject the admin request from{" "}
                  <strong>{row.original.name}</strong>? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    handleRequestWithRefetch({
                      requestId: row.original.request_id,
                      action: "reject",
                    });
                  }}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                >
                  Reject Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  // Enhanced Mobile Card Component with better reason display
  const MobileRequestCard = ({ request }: { request: AdminRequest }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={request.avatar} alt={request.name} />
            <AvatarFallback>
              {request.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{request.name}</CardTitle>
            <CardDescription className="text-sm truncate">
              {request.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-muted-foreground">Reason</p>
              {request.reason.length > 100 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="text-xs">View Full</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle>Admin Request Reason</DialogTitle>
                      <DialogDescription>
                        Request from {request.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {request.reason}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-sm leading-relaxed">
              {request.reason.length > 100 
                ? `${request.reason.substring(0, 100)}...` 
                : request.reason
              }
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-muted-foreground">Request Date</p>
              <p>{formatDate(request.request_created_at)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">User Since</p>
              <p>{formatDate(request.user_created_at)}</p>
            </div>
          </div>
          <div className="flex space-x-2 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                  disabled={isProcessing || isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve Admin Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to approve the admin request from{" "}
                    <strong>{request.name}</strong>? This will grant them
                    administrative privileges.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2">
                  <AlertDialogCancel className="w-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      handleRequestWithRefetch({
                        requestId: request.request_id,
                        action: "approve",
                      });
                    }}
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    Approve Request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  disabled={isProcessing || isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Admin Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reject the admin request from{" "}
                    <strong>{request.name}</strong>? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2">
                  <AlertDialogCancel className="w-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      handleRequestWithRefetch({
                        requestId: request.request_id,
                        action: "reject",
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700 w-full"
                  >
                    Reject Request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isPending) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-10 w-full sm:w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="rounded-md border">
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Loading admin requests...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-center">
            <p className="text-red-800 font-medium">
              Failed to load admin requests
            </p>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = table.getRowModel().rows.map((row) => row.original);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Input
          placeholder="Filter by name or email..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center justify-between sm:justify-end space-x-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isPending}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Badge variant="secondary" className="text-xs">
            {data.length} request{data.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden">
        {filteredData.length > 0 ? (
          <div className="space-y-4">
            {filteredData.map((request) => (
              <MobileRequestCard key={request.request_id} request={request} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No admin requests found.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No admin requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
