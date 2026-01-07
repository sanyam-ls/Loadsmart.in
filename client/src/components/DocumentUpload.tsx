import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileCheck, Loader2, X, FileText } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { useTranslation } from "react-i18next";

interface DocumentUploadProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

export function DocumentUpload({
  value,
  onChange,
  placeholder,
  disabled = false,
  testId,
}: DocumentUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  const { uploadFile, isUploading, error } = useUpload({
    onSuccess: (response) => {
      onChange(response.objectPath);
    },
    onError: (err) => {
      console.error("Upload error:", err);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    onChange("");
    setFileName("");
  };

  const hasUploadedFile = !!value;
  const displayName = fileName || (value ? value.split("/").pop() : "");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {hasUploadedFile ? (
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border rounded-md bg-muted/30">
            <FileCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-sm truncate flex-1" title={displayName}>
              {displayName}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleClear}
              disabled={disabled || isUploading}
              data-testid={testId ? `${testId}-clear` : undefined}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border rounded-md text-muted-foreground">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">
              {placeholder || t("onboarding.noFileSelected")}
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
          data-testid={testId ? `${testId}-input` : undefined}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          data-testid={testId ? `${testId}-button` : undefined}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  );
}
