import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, ImageIcon, Globe, Copy, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UploadedContent {
  type: 'text' | 'url' | 'pdf' | 'image' | 'screenshot';
  content?: string;
  file?: File;
  preview?: string;
  name: string;
}

interface UnifiedUploadZoneProps {
  onContentChange: (content: UploadedContent | null) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

const UnifiedUploadZone = ({ onContentChange, disabled, isProcessing }: UnifiedUploadZoneProps) => {
  const [uploadedContent, setUploadedContent] = useState<UploadedContent | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const detectContentType = (file: File): 'pdf' | 'image' | 'screenshot' => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'screenshot'; // Assume screenshots for now
    return 'image';
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleContent = useCallback((content: UploadedContent) => {
    setUploadedContent(content);
    onContentChange(content);
  }, [onContentChange]);

  const clearContent = useCallback(() => {
    setUploadedContent(null);
    onContentChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onContentChange]);

  const handleFileSelection = useCallback((file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Maximale Dateigröße: 10MB",
        variant: "destructive",
      });
      return;
    }

    const contentType = detectContentType(file);
    
    if (contentType === 'pdf') {
      handleContent({
        type: 'pdf',
        file,
        name: file.name,
      });
    } else if (contentType === 'screenshot' || contentType === 'image') {
      // Create preview for images
      const reader = new FileReader();
      reader.onload = (e) => {
        handleContent({
          type: 'screenshot',
          file,
          name: file.name,
          preview: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
      
    }
  }, [handleContent, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }

    // Handle URLs dropped from browser
    const urlData = e.dataTransfer.getData('text/uri-list');
    if (urlData && isValidUrl(urlData)) {
      handleContent({
        type: 'url',
        content: urlData,
        name: `URL: ${urlData}`,
      });
    }
  }, [handleFileSelection, handleContent]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  }, [handleFileSelection]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Handle text/URL paste
    const text = e.clipboardData.getData('text');
    if (text.trim()) {
      if (isValidUrl(text)) {
        handleContent({
          type: 'url',
          content: text,
          name: `URL: ${text}`,
        });
      } else {
        handleContent({
          type: 'text',
          content: text,
          name: `Text (${text.substring(0, 30)}...)`,
        });
      }
      return;
    }

    // Handle image paste
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleFileSelection(file);
      }
    }
  }, [handleContent, handleFileSelection]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getContentIcon = () => {
    if (!uploadedContent) return <Upload className="w-12 h-12 text-muted-foreground" />;
    
    switch (uploadedContent.type) {
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-500" />;
      case 'url':
        return <Globe className="w-12 h-12 text-blue-500" />;
      case 'screenshot':
      case 'image':
        return <ImageIcon className="w-12 h-12 text-green-500" />;
      case 'text':
        return <Copy className="w-12 h-12 text-purple-500" />;
      default:
        return <Upload className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getContentPreview = () => {
    if (!uploadedContent) return null;

    if (uploadedContent.preview) {
      return (
        <img 
          src={uploadedContent.preview} 
          alt="Vorschau" 
          className="w-32 h-32 object-cover rounded-lg mt-4"
        />
      );
    }

    if (uploadedContent.type === 'text' && uploadedContent.content) {
      return (
        <div className="mt-4 p-3 bg-muted rounded-lg max-w-md">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {uploadedContent.content}
          </p>
        </div>
      );
    }

    if (uploadedContent.type === 'url' && uploadedContent.content) {
      return (
        <div className="mt-4 p-3 bg-muted rounded-lg max-w-md">
          <p className="text-sm text-blue-600 break-all">
            {uploadedContent.content}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <Label>Rezept hinzufügen - Alle Formate unterstützt</Label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'}
          ${uploadedContent ? 'bg-muted/30' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onClick={!disabled && !uploadedContent ? openFileDialog : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled && !uploadedContent) openFileDialog();
          }
        }}
      >
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">KI analysiert Inhalt...</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {uploadedContent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              {getContentIcon()}
              <div className="text-left">
                <p className="font-medium text-foreground">{uploadedContent.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {uploadedContent.type === 'screenshot' ? 'Screenshot für OCR' : uploadedContent.type}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearContent();
                }}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {getContentPreview()}
            
            <p className="text-xs text-muted-foreground">
              Bereit für KI-Verarbeitung. Klicken Sie auf "Rezept hinzufügen" um fortzufahren.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getContentIcon()}
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">
                Rezept hinzufügen
              </h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Dateien ablegen</span>, 
                <span className="font-medium text-primary"> klicken</span> oder 
                <span className="font-medium text-primary"> einfügen (Ctrl+V)</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground max-w-md mx-auto">
              <div className="space-y-1">
                <p className="font-medium">📄 Dokumente</p>
                <p>PDF-Dateien</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">🖼️ Bilder</p>
                <p>Screenshots, JPG, PNG</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">🌐 URLs</p>
                <p>Website-Links</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">📝 Text</p>
                <p>Copy & Paste</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Maximale Dateigröße: 10MB | Automatische Erkennung mit GPT-5 Nano
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedUploadZone;