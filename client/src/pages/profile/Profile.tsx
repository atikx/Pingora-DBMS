import { useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, ShieldCheck, User, UserCheck, Upload, X } from "lucide-react";
import api from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";

interface ProfileProps {
  defaultTab: string;
}

interface UserType {
  id: string;
  name: string;
  email: string;
  avatar: string;
  is_verified: boolean;
  isadmin: boolean;
  created_at: string;
}

export default function Profile({ defaultTab }: ProfileProps) {
  const { user, setUser } = useAuthStore((state: any) => state);
  const [newName, setNewName] = useState(user?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [openAdminDialog, setOpenAdminDialog] = useState(false);
  const [adminReason, setAdminReason] = useState("");

  // Avatar related states - removed URL-related states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || "");
  const [openAvatarDialog, setOpenAvatarDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return api.put("/user/updateProfile", {
        newName,
        newPassword,
      });
    },
    onSuccess: (res) => {
      setUser({
        ...user,
        name: newName,
      });

      toast.success(res.data.message);
      setOpenEditDialog(false);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response.data.message}`);
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async () => {
      setUploadStatus("Uploading...");
      console.log("Starting upload process");

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        // Log the form data contents
        console.log(
          "Form data created with file:",
          imageFile.name,
          "size:",
          imageFile.size,
          "type:",
          imageFile.type
        );

        // Log all entries in FormData for debugging
        for (let pair of formData.entries()) {
          console.log(pair[0] + ": " + pair[1]);
        }

        return api.post("/user/updateAvatar", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
    },
    onSuccess: (res) => {
      setUser({
        ...user,
        avatar: previewUrl,
      });

      setUploadStatus("Upload successful");
      console.log("Upload completed successfully:", res.data);
      toast.success("Profile picture updated successfully");
      setOpenAvatarDialog(false);
      setImageFile(null);
    },
    onError: (error: any) => {
      setUploadStatus("Upload failed");
      console.error("Upload error:", error);

      let errorMessage = "Failed to update avatar";
      if (error.response?.data?.message) {
        errorMessage = error.response.data;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`Error: ${errorMessage}`);
    },
  });

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate();
  };

  // Handle dropzone file change
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      console.log(
        "File dropped:",
        file.name,
        "size:",
        file.size,
        "type:",
        file.type
      );
      setImageFile(file);
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target && e.target.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 5242880, // 5MB
    multiple: false,
  });

  // Handle avatar update
  const handleAvatarUpdate = () => {
    if (!imageFile) {
      toast.error("Please select an image to upload");
      return;
    }

    updateAvatarMutation.mutate();
  };

  const handleBecomeAdmin = () => {
    setOpenAdminDialog(true);
  };

  const adminRequestMutation = useMutation({
    mutationFn: async () => {
      return api.post("/verifiedUser/createAdminRequest", {
        reason: adminReason,
      });
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      setOpenAdminDialog(false);
      setAdminReason("");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response.data}`);
    },
  });

  const handleAdminRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminRequestMutation.mutate();
  };

  const navigate = useNavigate();

  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      return api.post("/user/verifyEmail");
    },
    onSuccess: (res) => {
      toast.success(res.data.message);
      navigate("/auth/otp");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.response.data}`);
    },
  });

  const handleGetVerified = () => {
    verifyEmailMutation.mutate();
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-col items-center pb-2">
              <Avatar className="h-32 w-32 mb-4 ring-4 ring-primary/10 relative group">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-4xl bg-primary/10">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl font-bold">
                  {user.name}
                </CardTitle>
              </div>
              <CardDescription className="text-base text-muted-foreground">
                {user.email}
              </CardDescription>
              <div className="flex gap-2 mt-3">
                <Badge
                  variant={user.is_verified ? "default" : "destructive"}
                  className="px-3 py-1"
                >
                  {user.is_verified ? (
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  ) : (
                    "Not Verified"
                  )}
                </Badge>
                {user.isadmin ? (
                  <Badge variant="secondary" className="px-3 py-1">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Admin
                    </div>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="px-3 py-1">
                    Not an Admin
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex px-10 justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Account Status
                  </p>
                  <p className="font-medium">
                    {user.is_verified
                      ? "Email Verified"
                      : "Email Verification Pending"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Member Since
                  </p>
                  <p className="font-medium">{user.created_at.split("T")[0]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Profile Information</p>
                      <p className="text-sm text-muted-foreground">
                        Update your profile details
                      </p>
                    </div>
                  </div>
                  <Dialog
                    open={openEditDialog}
                    onOpenChange={setOpenEditDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update your profile information
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                          />
                        </div>
                        <Separator />

                        <div className="grid gap-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setOpenEditDialog(false);
                            setNewPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProfileUpdate}
                          disabled={
                            (!newName.trim() && !newPassword) ||
                            updateProfileMutation.isLoading
                          }
                        >
                          {updateProfileMutation.isLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                              Updating...
                            </div>
                          ) : (
                            "Update Profile"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Profile Picture</p>
                      <p className="text-sm text-muted-foreground">
                        Change your profile picture
                      </p>
                    </div>
                  </div>
                  <Dialog
                    open={openAvatarDialog}
                    onOpenChange={setOpenAvatarDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="h-4 w-4" /> Change Avatar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Profile Picture</DialogTitle>
                        <DialogDescription>
                          Upload a new image for your profile
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex justify-center py-4">
                          <Avatar className="h-32 w-32 ring-4 ring-primary/10">
                            <AvatarImage src={previewUrl} alt={user.name} />
                            <AvatarFallback className="text-4xl bg-primary/10">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div
                          {...getRootProps()}
                          className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center hover:bg-muted/50 transition cursor-pointer"
                        >
                          <input {...getInputProps()} />
                          {isDragActive ? (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-primary animate-pulse" />
                              <p>Drop the image here...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <p>
                                Drag & drop an image here, or click to select
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Supports JPG, PNG, GIF up to 5MB
                              </p>
                            </div>
                          )}
                        </div>

                        {imageFile && (
                          <div className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                            <div className="flex items-center gap-2 truncate">
                              <div className="h-10 w-10 shrink-0 rounded-md bg-background flex items-center justify-center">
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  className="h-8 w-8 object-cover rounded"
                                />
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="text-sm font-medium truncate">
                                  {imageFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {(imageFile.size / 1024 / 1024).toFixed(2)}MB
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageFile(null);
                                setPreviewUrl(user.avatar || "");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {uploadStatus && (
                          <div
                            className={`text-sm p-2 rounded ${
                              uploadStatus.includes("successful")
                                ? "bg-green-100 text-green-800"
                                : uploadStatus.includes("failed")
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {uploadStatus}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setOpenAvatarDialog(false);
                            setPreviewUrl(user.avatar);
                            setImageFile(null);
                            setUploadStatus("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAvatarUpdate}
                          disabled={
                            updateAvatarMutation.isLoading || !imageFile
                          }
                        >
                          {updateAvatarMutation.isLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                              Uploading...
                            </div>
                          ) : (
                            "Save Avatar"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {!user.is_verified && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Account Verification</p>
                          <p className="text-sm text-muted-foreground">
                            Get your account verified
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleGetVerified}
                        disabled={verifyEmailMutation.isLoading}
                      >
                        {verifyEmailMutation.isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                            Verifying...
                          </div>
                        ) : (
                          "Verify Now"
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {!user.isadmin && user.is_verified && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Admin Access</p>
                          <p className="text-sm text-muted-foreground">
                            Request admin privileges
                          </p>
                        </div>
                      </div>
                      <Dialog
                        open={openAdminDialog}
                        onOpenChange={setOpenAdminDialog}
                      >
                        <DialogTrigger asChild>
                          <Button variant="secondary">Request</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Request Admin Access</DialogTitle>
                            <DialogDescription>
                              Please explain why you want to become an admin
                              (max 500 characters)
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAdminRequestSubmit}>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="admin-reason">Reason</Label>
                                <Textarea
                                  id="admin-reason"
                                  value={adminReason}
                                  onChange={(e) =>
                                    setAdminReason(e.target.value)
                                  }
                                  placeholder="Explain why you should be an admin"
                                  required
                                  className="min-h-[120px] resize-y"
                                  maxLength={500}
                                />
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                  <span>Character limit: 500</span>
                                  <span
                                    className={
                                      adminReason.length > 450
                                        ? "text-orange-500"
                                        : ""
                                    }
                                  >
                                    {adminReason.length}/500
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  setOpenAdminDialog(false);
                                  setAdminReason("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={
                                  !adminReason.trim() ||
                                  adminRequestMutation.isLoading
                                }
                              >
                                {adminRequestMutation.isLoading ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                                    Submitting...
                                  </div>
                                ) : (
                                  "Submit Request"
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
