import Header from "@editorjs/header";
import List from "@editorjs/list";
import InlineCode from "@editorjs/inline-code";
import Embed from "@editorjs/embed";
import Marker from "@editorjs/marker";
import Image from "@editorjs/image";
import api from "./axiosinstance";

const uploadByUrl = async (url: string) => {
  return {
    success: 1,
    file: { url },
  };
};

const uploadByFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post("/admin/uploadImageForEditor", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const { imageUrl } = response.data;

    return {
      success: 1,
      file: {
        url: imageUrl,
      },
    };
  } catch (error: any) {
    console.error("Image upload failed:", error);
    return {
      success: 0,
      message: "Image upload failed",
    };
  }
};

export const EditorTools = {
  list: {
    class: List,
  },
  header: {
    class: Header,
  },
  inlineCode: InlineCode,
  embed: Embed,
  marker: Marker,
  image: {
    class: Image,
    config: {
      uploader: {
        uploadByUrl,
        uploadByFile,
      },
    },
  },
};
