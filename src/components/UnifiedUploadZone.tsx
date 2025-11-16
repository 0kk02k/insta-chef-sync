import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, ImageIcon, Globe, Copy, X, Loader2, Type, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/cookieAwareClient';
import { useIsMobile } from '@/hooks/use-mobile';

interface UploadedContent {
  type: 'text' | 'url' | 'pdf' | 'image' | 'screenshot';
  content?: string;
  file?: File;
  preview?: string;
  name: string;
  id?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  currentFile?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

interface UnifiedUploadZoneProps {
  onContentChange: (content: UploadedContent[] | null) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  batchProgress?: BatchProgress;
}

const UnifiedUploadZone = ({ onContentChange, disabled, isProcessing, batchProgress }: UnifiedUploadZoneProps) => {
  const [uploadedContent, setUploadedContent] = useState<UploadedContent[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressActivatedRef = useRef(false);
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

  const shortenUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname + urlObj.search;
      
      if (domain.length + path.length <= maxLength - 3) {
        return `${domain}${path}`;
      }
      
      if (domain.length <= maxLength - 6) {
        const availableLength = maxLength - domain.length - 6;
        return `${domain}${path.substring(0, availableLength)}...`;
      }
      
      return `${domain.substring(0, maxLength - 3)}...`;
    } catch {
      return url.substring(0, maxLength - 3) + '...';
    }
  };

  const handleContent = useCallback((content: UploadedContent) => {
    setUploadedContent((prev) => {
      const newContent = [...prev, { ...content, id: Date.now().toString() }];
      onContentChange(newContent);
      return newContent;
    });
  }, [onContentChange]);

  const clearContent = useCallback(() => {
    setUploadedContent([]);
    onContentChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onContentChange]);

  const removeContent = useCallback((id: string) => {
    const newContent = uploadedContent.filter(item => item.id !== id);
    setUploadedContent(newContent);
    onContentChange(newContent.length > 0 ? newContent : null);
  }, [uploadedContent, onContentChange]);

  const handleFileSelection = useCallback((files: File[]) => {
    // Validate total content limit
    if (uploadedContent.length + files.length > 10) {
      toast({
        title: "Zu viele Dateien",
        description: "Maximal 10 Dateien gleichzeitig möglich",
        variant: "destructive",
      });
      return;
    }

    files.forEach(file => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: `Datei zu groß: ${file.name}`,
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
    });
  }, [handleContent, toast, uploadedContent.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files);
    }

    // Handle URLs dropped from browser
    const urlData = e.dataTransfer.getData('text/uri-list');
    if (urlData && isValidUrl(urlData)) {
      handleContent({
        type: 'url',
        content: urlData,
        name: shortenUrl(urlData),
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
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelection(files);
    }
  }, [handleFileSelection]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const cd = e.clipboardData;
    const items = cd ? Array.from(cd.items) : [];
    const text = cd?.getData('text')?.trim() ?? '';
    const hasImage = items.some(i => i.type.startsWith('image/'));
    const hasUsefulData = !!text || hasImage;
    
    if (hasUsefulData) {
      e.preventDefault();
      
      // Handle text/URL paste
      if (text) {
        if (isValidUrl(text)) {
          handleContent({
            type: 'url',
            content: text,
            name: shortenUrl(text),
          });
        } else {
          handleContent({
            type: 'text',
            content: text,
            name: `Text (${text.substring(0, 30)}...)`,
          });
        }
        dropZoneRef.current?.blur();
        return;
      }

      // Handle image paste
      const imageItem = items.find(item => item.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          handleFileSelection([file]);
          dropZoneRef.current?.blur();
        }
      }
    } else {
      // iOS-Fallback: Default-Einfügen erlauben, dann DOM prüfen
      setTimeout(async () => {
        const el = dropZoneRef.current;
        if (!el) return;
        
        // 1) IMG-Knoten prüfen
        const imgs = Array.from(el.querySelectorAll('img'));
        if (imgs.length) {
          const files: File[] = [];
          for (const img of imgs) {
            try {
              const res = await fetch((img as HTMLImageElement).src);
              const blob = await res.blob();
              const file = new File([blob], 'clipboard-image.png', { type: blob.type || 'image/png' });
              files.push(file);
            } catch {}
          }
          if (files.length) handleFileSelection(files);
        }
        
        // 2) Text prüfen
        const pastedText = el.innerText.trim();
        if (pastedText) {
          if (isValidUrl(pastedText)) {
            handleContent({ type: 'url', content: pastedText, name: shortenUrl(pastedText) });
          } else {
            handleContent({ type: 'text', content: pastedText, name: `Text (${pastedText.substring(0, 30)}...)` });
          }
        }
        
        // Cleanup
        el.innerHTML = '';
        el.blur();
      }, 0);
    }
  }, [handleContent, handleFileSelection, isValidUrl, shortenUrl]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const setCaretToEnd = (el: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const triggerPaste = useCallback(() => {
    const el = dropZoneRef.current;
    if (!el) return;
    el.focus();
    setCaretToEnd(el);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled && uploadedContent.length === 0) {
      triggerPaste();
    }
  }, [disabled, uploadedContent.length, triggerPaste]);

  const handleTouchStart = useCallback(() => {
    if (!disabled && uploadedContent.length === 0) {
      longPressTimerRef.current = setTimeout(() => {
        longPressActivatedRef.current = true;
        triggerPaste();
      }, 500); // 500ms long press
    }
  }, [disabled, uploadedContent.length, triggerPaste]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Reset nach kurzer Zeit, damit Click nach Long-Press unterdrückt wird
    setTimeout(() => {
      longPressActivatedRef.current = false;
    }, 400);
  }, []);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'url':
        return <Globe className="w-8 h-8 text-blue-500" />;
      case 'screenshot':
      case 'image':
        return <ImageIcon className="w-8 h-8 text-green-500" />;
      case 'text':
        return <Copy className="w-8 h-8 text-purple-500" />;
      default:
        return <Upload className="w-8 h-8 text-muted-foreground" />;
    }
  };


  return (
    <div className="space-y-4">      
      <div
        ref={dropZoneRef}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 bg-background outline-none
          ${isDragOver ? 'border-primary bg-primary/5' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : isMobile ? 'cursor-text' : 'cursor-pointer'}
          ${uploadedContent.length > 0 ? 'bg-muted/30' : ''}
        `}
        style={{ 
          borderColor: isDragOver ? undefined : 'hsl(290 18% 28% / 0.8)'
        }}
        contentEditable={isMobile ? true : undefined}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Inhalte einfügen oder ablegen"
        aria-multiline="true"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (disabled) return;
          if (longPressActivatedRef.current) return;
          openFileDialog();
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) openFileDialog();
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
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        

        {uploadedContent.length > 0 ? (
          <div className="space-y-4">
            {/* Batch Progress */}
            {batchProgress && batchProgress.status === 'processing' && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Verarbeitet {batchProgress.completed} von {batchProgress.total} PDFs
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((batchProgress.completed / batchProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                  />
                </div>
                {batchProgress.currentFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Aktuell: {batchProgress.currentFile}
                  </p>
                )}
              </div>
            )}
            
            {/* File List */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedContent.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 bg-muted/30 rounded-lg p-3">
                  {getContentIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-foreground truncate ${item.type === 'url' ? 'opacity-70' : ''}`}>{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.type === 'screenshot' ? 'Screenshot für OCR' : item.type}
                      {item.type === 'url' && item.content && (
                        <span className="ml-1 text-xs text-muted-foreground/60">
                          • {new URL(item.content).hostname.replace('www.', '')}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeContent(item.id!);
                    }}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {uploadedContent.length} {uploadedContent.length === 1 ? 'Datei' : 'Dateien'} bereit
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearContent}
                disabled={disabled}
              >
                Alle entfernen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">            
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground max-w-md mx-auto">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <p>PDF</p>
              </div>
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4" />
                <p>JPG, PNG</p>
              </div>
              <div className="flex items-center space-x-2">
                <Link className="w-4 h-4" />
                <p>URL</p>
              </div>
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4" />
                <p>Text</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-2">
              💡 Langes Drücken zum Einfügen aus der Zwischenablage (mobil)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedUploadZone;