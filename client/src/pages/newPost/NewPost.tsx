import {  useEffect, useRef, useState } from "react";
import EditorJS from "@editorjs/editorjs";
import { EditorTools } from "../../lib/EditorTools";
import "./editorStyles.css";
import { Button } from "@/components/ui/button";
import { MoveRight, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Filter } from "bad-words";

const filter = new Filter();

export default function NewPost() {
  const editorRef = useRef<EditorJS | null>(null);
  const [showWarning, setShowWarning] = useState(true); // Always show by default

  const saved = localStorage.getItem("postData");
  const sampleData = saved
    ? JSON.parse(saved)
    : {
        time: Date.now(),
        blocks: [],
        version: "2.31.0-rc.7",
      };

  useEffect(() => {
    const editor = new EditorJS({
      holder: "editorjs",
      data: sampleData,
      tools: EditorTools,
      placeholder: "Start writing your post...",
      onChange: async () => {
        try {
          const outputData = await editor.save();

          // Filter the text in all blocks before saving
          const filteredBlocks = outputData.blocks.map((block) => {
            if (block.type === "paragraph" && block.data && block.data.text) {
              const originalText = block.data.text;
              const cleanedText = filter.clean(originalText);

              return {
                ...block,
                data: {
                  ...block.data,
                  text: cleanedText,
                },
              };
            }
            return block;
          });

          localStorage.setItem(
            "postData",
            JSON.stringify({
              ...outputData,
              blocks: filteredBlocks,
            })
          );
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      },
    });

    editorRef.current = editor;

    return () => {
      editor.isReady
        .then(() => editor.destroy())
        .catch((e) => console.error("Editor cleanup error", e));
    };
  }, []);

  const navigate = useNavigate();

  const dismissWarning = () => {
    setShowWarning(false);
  };

  return (
    <div className="w-full pb-20 text-center h-full">
      {/* Permanent Warning Section - Always Displayed */}
      {showWarning && (
        <div className="w-full bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-amber-800">
                  Content Moderation Notice
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  This editor automatically filters inappropriate language to maintain a respectful environment. 
                  Any offensive content will be automatically removed from your post.
                </p>
              </div>
            </div>
            <button
              onClick={dismissWarning}
              className="text-amber-500 hover:text-amber-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div id="editorjs" className="w-full editorjs"></div>
      
      <Button
        variant="default"
        className="cursor-pointer"
        onClick={() => {
          navigate("/addPostData");
        }}
      >
        Continue to Next page <MoveRight />
      </Button>
    </div>
  );
}
