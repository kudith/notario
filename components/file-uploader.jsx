"use client";

import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FileIcon, 
  XIcon, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  FileText,
  Loader2,
  Sparkles,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { analyzeDocument } from "@/lib/document-service";

export default function FileUploader({ onFileUploaded, initialFile = null, readOnly = false, enableAnalysis = true }) {
  const [filePreview, setFilePreview] = useState(initialFile);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pdfKey, setPdfKey] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const fileInputRef = useRef(null);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize PDF URL from initialFile if provided
  useEffect(() => {
    if (initialFile && !pdfUrl) {
      try {
        const fileUrl = URL.createObjectURL(initialFile);
        setPdfUrl(fileUrl);
        setFilePreview(initialFile);
      } catch (error) {
        console.error("Error creating object URL:", error);
      }
    }
  }, [initialFile, pdfUrl]);

  useEffect(() => {
      // Clean up URL objects when component unmounts or when file changes
    return () => {
      if (pdfUrl) {
        try {
          URL.revokeObjectURL(pdfUrl);
        } catch (error) {
          console.error("Error revoking object URL:", error);
        }
      }
    };
  }, [pdfUrl]);

  // Function to manually trigger analysis
  const handleManualAnalysis = async () => {
    if (!filePreview || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      // Use the document service to analyze the document
      const result = await analyzeDocument(filePreview);
      
      if (result && result.fileHash) {
        setDocumentAnalysis(result);
        
        // Update the parent with the analysis data
        onFileUploaded(filePreview, result.fileHash, result);
        
        toast.success("Document analyzed", {
          description: `Type: ${result.analysis?.documentType || "Document"}`
        });
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      toast.error("Analysis failed", {
        description: "Could not complete analysis"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Effect to refresh iframe when zoom or rotation changes
  useEffect(() => {
    if (pdfUrl && iframeLoaded) {
      // Increment key to force iframe refresh
      setPdfKey(prevKey => prevKey + 1);
    }
  }, [zoomLevel, rotation, iframeLoaded]);

  // Set up visibility observer to detect when component is hidden/shown
  useEffect(() => {
    if (!containerRef.current) return;

    // Create an intersection observer to detect visibility
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          
          // If becoming visible again and we have a PDF, refresh it
          if (entry.isIntersecting && pdfUrl && iframeLoaded) {
            setPdfKey(prevKey => prevKey + 1);
          }
        });
      },
      { threshold: 0.1 } // Trigger when at least 10% is visible
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [pdfUrl, iframeLoaded]);

  // Monitor visibility changes using the Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pdfUrl && iframeLoaded) {
        // When tab becomes visible again, refresh the PDF
        setTimeout(() => {
          setPdfKey(prevKey => prevKey + 1);
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pdfUrl, iframeLoaded]);
  
  // Function to handle file upload and preview (removed automatic analysis)
  const handleFileProcess = async (file) => {
    if (!file) return;
    
    // Create URL for PDF preview
    const fileUrl = URL.createObjectURL(file);
    setPdfUrl(fileUrl);
    setFilePreview(file);
    
    // Reset view settings
    setCurrentPage(1);
    setZoomLevel(100);
    setRotation(0);
    setPdfKey(0);
    setIframeLoaded(false);
    
    // Pass file to parent without analysis data
    onFileUploaded(file);
  };

  const onDrop = (acceptedFiles) => {
    if (readOnly || isAnalyzing) return;
    
    // Only accept PDF files
    const file = acceptedFiles[0];
    if (file && file.type === "application/pdf") {
      handleFileProcess(file);
    } else {
      toast.error("Invalid file format", {
        description: "Please upload a PDF document"
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false,
    noClick: true, // Disable the built-in click handling
    disabled: readOnly || isAnalyzing
  });

  // Handle file selection manually
  const handleFileSelect = (event) => {
    if (readOnly || isAnalyzing) return;
    
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      handleFileProcess(file);
    } else if (file) {
      toast.error("Invalid file format", {
        description: "Please upload a PDF document"
      });
      event.target.value = "";
    }
  };

  // Trigger file input click
  const openFileDialog = () => {
    if (readOnly || isAnalyzing) return;
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFile = (e) => {
    if (readOnly || isAnalyzing) return;
    
    e.stopPropagation();
    
    // Clean up URL object
    if (pdfUrl) {
      try {
        URL.revokeObjectURL(pdfUrl);
      } catch (error) {
        console.error("Error revoking object URL:", error);
      }
      setPdfUrl(null);
    }
    
    setFilePreview(null);
    setDocumentAnalysis(null);
    onFileUploaded(null);
    setIframeLoaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // PDF navigation functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setPdfKey(prevKey => prevKey + 1); // Force refresh
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setPdfKey(prevKey => prevKey + 1); // Force refresh
    }
  };

  const zoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(zoomLevel + 25);
    }
  };

  const zoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(zoomLevel - 25);
    }
  };

  const rotateDocument = () => {
    setRotation((rotation + 90) % 360);
  };

  // Handle iframe load to get total pages
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    
    try {
      if (iframeRef.current) {
        // Wait a moment for the PDF to load
        setTimeout(() => {
          try {
            // Try to access the PDF document in the iframe
            const iframe = iframeRef.current;
            if (!iframe) return;
            
            const iframeWindow = iframe.contentWindow;
            if (!iframeWindow) return;
            
            // This will only work if the PDF viewer in the iframe exposes this API
            if (iframeWindow.PDFViewerApplication) {
              const pdfViewer = iframeWindow.PDFViewerApplication;
              if (pdfViewer && pdfViewer.pagesCount) {
                setTotalPages(pdfViewer.pagesCount);
              }
            }
          } catch (error) {
            console.error("Error accessing PDF information:", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error in iframe load handler:", error);
    }
  };

  // Generate the PDF URL with parameters
  const getPdfViewerUrl = () => {
    if (!pdfUrl) return '';
    return `${pdfUrl}#page=${currentPage}&zoom=${zoomLevel}&view=FitH`;
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Hidden file input for click handling */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        disabled={readOnly || isAnalyzing}
      />

      {!filePreview ? (
        <div
          {...getRootProps()}
          className={`document-card border-2 border-dashed rounded-md p-10 text-center transition-all duration-200 ${
            isDragActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/40 hover:bg-card/80'
          } ${readOnly || isAnalyzing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={openFileDialog} // Use our custom click handler
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {isAnalyzing ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <FileText className="h-8 w-8 text-primary" />
              )}
            </div>
            
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-medium">
                {isAnalyzing 
                  ? 'Analyzing document...' 
                  : isDragActive 
                    ? 'Drop your PDF here' 
                    : readOnly 
                      ? 'Document Upload Disabled'
                      : 'Upload Document'
                }
              </h3>
              {!readOnly && !isAnalyzing && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a PDF file here, or click to select from your device
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      PDF documents only
                    </span>
                  </div>
                </>
              )}
              {isAnalyzing && (
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Our AI is analyzing your document to identify its type and structure...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden border border-border shadow-sm document-card">
          <CardContent className="p-0">
            {/* Document Information Header */}
            <div className="bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-md flex items-center justify-center">
                  <FileIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium line-clamp-1">{filePreview.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(filePreview.size)} • PDF Document
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Show analysis status or analyze button */}
                {isAnalyzing ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing
                  </Badge>
                ) : documentAnalysis ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          {documentAnalysis.analysis?.documentType || "Document"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Document type identified by AI</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : enableAnalysis && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleManualAnalysis}
                          disabled={isAnalyzing}
                          className="h-8 flex items-center gap-1 text-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                          Analyze with AI
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Analyze document with AI</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {!readOnly && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearFile}
                          disabled={isAnalyzing}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            
            {/* PDF Viewer with Controls */}
            {pdfUrl && (
              <div className="relative">
                {/* PDF Controls Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border">
                  {/* Page Navigation */}
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={prevPage}
                            disabled={currentPage <= 1}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Previous page</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <span className="text-xs px-2 py-1 bg-card rounded-md">
                      Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                    </span>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={nextPage}
                            disabled={currentPage >= totalPages}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Next page</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* View Controls */}
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={zoomOut} 
                            disabled={zoomLevel <= 75} 
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom out</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <span className="text-xs px-2 py-1 bg-card rounded-md">
                      {zoomLevel}%
                    </span>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={zoomIn} 
                            disabled={zoomLevel >= 150} 
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Zoom in</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={rotateDocument} 
                            className="h-7 w-7 p-0 rounded-full ml-2"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rotate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                {/* PDF Viewer */}
                <div className="pdf-viewer-container bg-background">
                  <iframe 
                    key={pdfKey}
                    ref={iframeRef}
                    src={getPdfViewerUrl()}
                    className="w-full h-[450px]"
                    title="PDF Preview"
                    onLoad={handleIframeLoad}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </div>
                
                {/* Show AI analysis results if available */}
                {documentAnalysis && documentAnalysis.analysis && (
                  <div className="border-t border-border px-4 py-2 bg-muted/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">AI Document Analysis</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {documentAnalysis.analysis.documentType && (
                        <Badge variant="outline" className="text-xs bg-primary/5">
                          Type: {documentAnalysis.analysis.documentType}
                        </Badge>
                      )}
                      
                      {documentAnalysis.analysis.subject && (
                        <Badge variant="outline" className="text-xs">
                          Subject: {documentAnalysis.analysis.subject.length > 20 
                          ? documentAnalysis.analysis.subject.substring(0, 20) + '...' 
                          : documentAnalysis.analysis.subject}
                        </Badge>
                      )}
                      
                      {documentAnalysis.analysis.documentNumber && (
                        <Badge variant="outline" className="text-xs">
                          No: {documentAnalysis.analysis.documentNumber}
                        </Badge>
                      )}
                      
                      {documentAnalysis.analysis.qrCodePosition && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs flex items-center">
                                <Info className="h-3 w-3 mr-1" />
                                QR: {documentAnalysis.analysis.qrCodePosition}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Recommended QR code position</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}