import { useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipLoader } from "react-spinners";
import VerticalPost from "@/components/custom/VerticalPost";
import { useAuthStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { X, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import api from "@/lib/axiosinstance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Time picker utility functions
function getValidHour(value: string) {
  let numericValue = parseInt(value, 10);
  if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 23) {
    return numericValue.toString().padStart(2, "0");
  }
  return "00";
}

function getValidMinute(value: string) {
  let numericValue = parseInt(value, 10);
  if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 59) {
    return numericValue.toString().padStart(2, "0");
  }
  return "00";
}

// Time Picker Component
interface TimePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
}

function TimePicker({ date, setDate }: TimePickerProps) {
  const [hours, setHours] = useState(
    date ? date.getHours().toString().padStart(2, "0") : "00"
  );
  const [minutes, setMinutes] = useState(
    date ? date.getMinutes().toString().padStart(2, "0") : "00"
  );

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    const validHours = getValidHour(newHours);
    const validMinutes = getValidMinute(newMinutes);

    setHours(validHours);
    setMinutes(validMinutes);

    if (date) {
      const newDate = new Date(date);
      newDate.setHours(parseInt(validHours, 10));
      newDate.setMinutes(parseInt(validMinutes, 10));
      setDate(newDate);
      console.log("Time updated:", newDate);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Clock className="h-4 w-4" />
      <Input
        type="number"
        min="0"
        max="23"
        value={hours}
        onChange={(e) => handleTimeChange(e.target.value, minutes)}
        className="w-16 text-center"
        placeholder="HH"
      />
      <span>:</span>
      <Input
        type="number"
        min="0"
        max="59"
        value={minutes}
        onChange={(e) => handleTimeChange(hours, e.target.value)}
        className="w-16 text-center"
        placeholder="MM"
      />
    </div>
  );
}

// Update interface to match VerticalPost component props
interface PostProps {
  title: string;
  description: string;
  image: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
}

export default function AddPostData(): JSX.Element {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  // Scheduling states
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // Add state for controlling the confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  const navigate = useNavigate();

  // Define the mutation function
  const uploadPost = async (formData: FormData) => {
    const response = await api.post("/admin/addPost", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  };

  // Use the useMutation hook
  const mutation = useMutation({
    mutationFn: uploadPost,
    onSuccess: (data) => {
      console.log("Server response:", data);
      localStorage.removeItem("postData");
      toast.success(
        isScheduled
          ? "Post scheduled successfully!"
          : "Post uploaded successfully!"
      );
      navigate("/yourPosts");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      console.error("Error uploading post:", error);
      toast.error("Failed to upload post. Please try again.");
    },
  });

  useEffect(() => {
    const postData = localStorage.getItem("postData");
    if (!postData) {
      toast.error("Please create a post first");
      setShouldRedirect(true);
    }
  }, []);

  // Handle clicking outside calendar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCalendar) {
        const target = event.target as Element;
        if (!target.closest('.calendar-container') && !target.closest('[data-calendar-trigger]')) {
          setShowCalendar(false);
          console.log("Calendar closed by clicking outside");
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Handle drag-and-drop image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setBannerPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  // Handle adding tags
  const handleAddTag = (): void => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Handle tag input keydown (add tag on Enter)
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Handle removing a tag
  const removeTag = (tagToRemove: string): void => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle scheduling toggle
  const handleScheduleToggle = (checked: boolean): void => {
    setIsScheduled(checked);
    if (checked && !scheduledDate) {
      // Set default to tomorrow at current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow);
      console.log("Scheduling enabled. Default date set to:", tomorrow);
    } else if (!checked) {
      setScheduledDate(undefined);
      setShowCalendar(false);
      console.log("Scheduling disabled");
    }
  };

  // Handle date selection - FIXED VERSION
  const handleDateSelect = (date: Date | undefined): void => {
    console.log("Date selection triggered:", date);
    
    if (date) {
      // Preserve existing time if available, otherwise set to current time
      if (scheduledDate) {
        date.setHours(scheduledDate.getHours());
        date.setMinutes(scheduledDate.getMinutes());
      } else {
        const now = new Date();
        date.setHours(now.getHours());
        date.setMinutes(now.getMinutes());
      }
      
      setScheduledDate(date);
      console.log("Selected scheduled date and time:", date);
      console.log("Formatted:", format(date, "PPP 'at' HH:mm"));
    } else {
      setScheduledDate(undefined);
    }
    
    // Close the calendar
    setShowCalendar(false);
  };

  // Modified to open confirmation dialog instead of uploading directly
  const handleConfirmUpload = (): void => {
    if (!bannerFile) {
      toast.error("Please upload a banner image");
      return;
    }

    if (!title) {
      toast.error("Please enter a post title");
      return;
    }

    if (!description) {
      toast.error("Please enter a post description");
      return;
    }

    if (isScheduled && !scheduledDate) {
      toast.error("Please select a scheduled date and time");
      return;
    }

    if (isScheduled && scheduledDate && scheduledDate <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // Actual upload function that will be called after confirmation
  const handleUploadPost = (): void => {
    // Get content from localStorage
    const content = localStorage.getItem("postData") || "";

    // Create FormData object
    const formData = new FormData();

    // Append the image file if available
    if (bannerFile) {
      formData.append("image", bannerFile);
    }

    // Append other form data
    formData.append("title", title || "Untitled Post");
    formData.append("description", description || "");
    formData.append("content", content);
    formData.append("category", category || "Uncategorized");

    // Append tags as JSON string
    formData.append("tags", JSON.stringify(tags.length > 0 ? tags : []));

    // Append scheduling information
    if (isScheduled && scheduledDate) {
      formData.append("is_scheduled", "true");
      formData.append("scheduled_at", scheduledDate.toISOString());
    } else {
      formData.append("is_scheduled", "false");
      console.log("Post will be published immediately");
    }

    // Log the FormData entries for debugging
    console.log("Form data entries:");
    for (let [key, value] of formData.entries()) {
      console.log(
        `${key}: ${value instanceof File ? `File: ${value.name}` : value}`
      );
    }

    // Execute the mutation
    mutation.mutate(formData);
  };

  if (shouldRedirect) {
    return <Navigate to="/newPost" replace />;
  }

  // Updated preview post to match the VerticalPost component props
  const previewPost: PostProps = {
    image:
      bannerPreview ||
      "https://cdn-front.freepik.com/images/ai/image-generator/gallery/323233.webp",
    title: title || "Post title will appear here",
    description: description || "Post description will appear here",
    created_at: new Date().toISOString(),
    author_name: user?.name || "Unknown",
    author_avatar: user?.avatar || "https://i.pravatar.cc/100",
  };

  // Sample categories
  const categories: string[] = [
    "Technology",
    "Business",
    "Sports",
    "Entertainment",
    "Science",
    "Health",
    "Current Affairs",
  ];

  return (
    <div className="flex flex-col gap-8 p-8 w-full bg-white rounded-lg">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Input Section */}
        <div className="md:w-1/2 space-y-6">
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              {bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="Banner Preview"
                  className="mx-auto rounded-md h-32 object-cover mb-2"
                />
              ) : (
                <div>
                  <span className="text-gray-500">
                    Drag & drop an image here, or{" "}
                    <span className="text-blue-600 underline">
                      click to select
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              placeholder="Enter your post title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter a short description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
            />
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Input */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTagInput(e.target.value)
                }
                onKeyDown={handleTagKeyDown}
              />
              <Button type="button" onClick={handleAddTag} variant="secondary">
                Add
              </Button>
            </div>

            {/* Tags Display */}
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex cursor-pointer items-center gap-1"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Post Scheduling Section - FIXED VERSION WITH ABSOLUTE POSITIONING */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
              <Switch
                id="schedule-mode"
                checked={isScheduled}
                onCheckedChange={handleScheduleToggle}
              />
              <Label htmlFor="schedule-mode" className="font-medium">
                Schedule Post
              </Label>
            </div>

            {isScheduled && (
              <div className="space-y-3">
                <div className="relative">
                  <Label>Select Date</Label>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                    data-calendar-trigger
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Calendar button clicked, current state:", showCalendar);
                      setShowCalendar(!showCalendar);
                    }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                  
                  {/* Calendar positioned absolutely - This ensures visibility */}
                  {showCalendar && (
                    <div className="calendar-container absolute top-full left-0 mt-2 z-[9999] bg-white border rounded-md shadow-lg">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => {
                          console.log("Calendar onSelect triggered:", date);
                          handleDateSelect(date);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="rounded-md p-3"
                      />
                    </div>
                  )}
                </div>

                {scheduledDate && (
                  <div>
                    <Label>Select Time</Label>
                    <TimePicker
                      date={scheduledDate}
                      setDate={setScheduledDate}
                    />
                  </div>
                )}

                {scheduledDate && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Scheduled for:</strong>{" "}
                      {format(scheduledDate, "PPP 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="flex items-stretch">
          <div className="w-px bg-gray-200 h-full mx-4" />
        </div>

        {/* Preview Section */}
        <div className="w-1/2 flex flex-col justify-center">
          <div className="w-full max-w-md">
            <VerticalPost post={previewPost} />

            {/* Display category, tags, and scheduling info */}
            <div className="mt-4 space-y-2">
              <div>
                <span className="font-medium">Category: </span>
                <Badge variant="outline">{category || "Uncategorized"}</Badge>
              </div>
              <div>
                <span className="font-medium">Tags: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.length > 0 ? (
                    tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No tags</Badge>
                  )}
                </div>
              </div>
              {isScheduled && scheduledDate && (
                <div>
                  <span className="font-medium">Scheduled: </span>
                  <Badge variant="default" className="bg-blue-600">
                    {format(scheduledDate, "MMM dd, yyyy 'at' HH:mm")}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={handleConfirmUpload}
              disabled={mutation.isLoading}
              className="px-8 flex items-center gap-2"
            >
              {mutation.isLoading ? (
                <>
                  <ClipLoader size={16} color="#ffffff" />
                  <span>{isScheduled ? "Scheduling..." : "Uploading..."}</span>
                </>
              ) : (
                <span>{isScheduled ? "Schedule Post" : "Upload Post"}</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isScheduled ? "Confirm Post Scheduling" : "Confirm Post Upload"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isScheduled ? (
                <>
                  Are you sure you want to schedule this post for{" "}
                  <strong>
                    {scheduledDate && format(scheduledDate, "PPP 'at' HH:mm")}
                  </strong>
                  ? The post will be automatically published at the scheduled
                  time.
                </>
              ) : (
                "Are you sure you want to publish this post? This action will make your content visible to all users immediately."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUploadPost}>
              {mutation.isLoading ? (
                <div className="flex items-center gap-2">
                  <ClipLoader size={16} color="#ffffff" />
                  <span>{isScheduled ? "Scheduling..." : "Publishing..."}</span>
                </div>
              ) : (
                <span>{isScheduled ? "Schedule Post" : "Publish Post"}</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
