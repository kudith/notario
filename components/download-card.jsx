"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Download, Loader2, ExternalLink, FileText, Calendar, 
  CheckCircle, User, Clock, FileCheck, Clipboard
} from "lucide-react";

export default function DownloadCard({ 
  signedPdfUrl, 
  fileName, 
  certificateId, 
  driveFileId, 
  driveDownloadUrl,
  driveViewUrl,
  metadata
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [copiedCertId, setCopiedCertId] = useState(false);
  
  // Format file size if available
  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  // Format date nicely 
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle document download
  const handleDownload = async () => {
    if (!signedPdfUrl && !certificateId && !driveFileId && !driveDownloadUrl) {
      toast.error("No document download information available");
      return;
    }

    setIsDownloading(true);
    try {
      // Create a blob URL for downloading
      let downloadUrl;
      
      if (driveFileId) {
        downloadUrl = `/api/documents/download?fileId=${driveFileId}&download=true&fileName=${encodeURIComponent(fileName || 'document.pdf')}`;
      } else if (certificateId) {
        downloadUrl = `/api/documents/download?certificateId=${certificateId}&download=true&fileName=${encodeURIComponent(fileName || 'document.pdf')}`;
      } else if (driveDownloadUrl) {
        downloadUrl = driveDownloadUrl;
      } else if (signedPdfUrl) {
        downloadUrl = signedPdfUrl;
      }
      
      // Create invisible anchor and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || `signed-document-${certificateId || 'notario'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download started", {
        description: `${fileName || 'Document'} is being downloaded`
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed", {
        description: error.message || "Could not download the document"
      });
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    }
  };

  // View document in new tab (without downloading)
  const viewDocument = () => {
    setIsViewLoading(true);
    
    try {
      let viewUrl;
      
      if (driveViewUrl) {
        viewUrl = driveViewUrl;
      } else if (driveFileId) {
        viewUrl = `/api/documents/download?fileId=${driveFileId}&view=true`;
      } else if (certificateId) {
        viewUrl = `/api/documents/download?certificateId=${certificateId}&view=true`;
      } else if (signedPdfUrl) {
        viewUrl = signedPdfUrl;
      } else {
        toast.error("No document view URL available");
        return;
      }
      
      window.open(viewUrl, "_blank");
    } catch (error) {
      toast.error("Failed to open document", {
        description: error.message || "Could not open the document viewer"
      });
    } finally {
      setTimeout(() => {
        setIsViewLoading(false);
      }, 1000);
    }
  };

  // Copy certificate ID to clipboard
  const copyCertificateId = async () => {
    try {
      await navigator.clipboard.writeText(certificateId);
      setCopiedCertId(true);
      toast.success("Certificate ID copied to clipboard");
      
      setTimeout(() => {
        setCopiedCertId(false);
      }, 2000);
    } catch (err) {
      toast.error("Failed to copy certificate ID");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col space-y-4">
            {/* Document info header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2.5 rounded-full mr-3">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {fileName || 'Signed Document.pdf'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(metadata?.fileSize) || 'PDF Document'}
                    {metadata?.documentType && ` • ${metadata.documentType}`}
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className="bg-primary/5 text-primary">
                <CheckCircle className="h-3 w-3 mr-1" /> Signed
              </Badge>
            </div>
            
            <Separator />
            
            {/* Document metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="bg-secondary/40 p-1 rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Signed On</p>
                  <p className="font-medium">
                    {formatDate(metadata?.signedAt)}
                  </p>
                </div>
              </div>
              
              {metadata?.signedBy && (
                <div className="flex items-center space-x-2">
                  <div className="bg-secondary/40 p-1 rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Signed By</p>
                    <p className="font-medium">{metadata.signedBy}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Certificate Info */}
            <div className="bg-muted/30 rounded-lg p-3 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Certificate Information</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs" 
                        onClick={copyCertificateId}
                      >
                        {copiedCertId ? 'Copied!' : 'Copy ID'}
                        <Clipboard className="h-3 w-3 ml-1" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Copy certificate ID to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="font-mono text-xs bg-card p-2 rounded border border-border overflow-x-auto whitespace-nowrap">
                {certificateId || 'No certificate ID available'}
              </div>
              
              {metadata?.folderPath && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Storage Location</p>
                  <p className="text-xs font-medium bg-card p-2 rounded border border-border">
                    {metadata.folderPath}
                  </p>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 mt-2">
              <Button
                variant="outline"
                className="flex-1 bg-card hover:bg-card/80"
                onClick={viewDocument}
                disabled={isViewLoading}
              >
                {isViewLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                View Document
              </Button>
              
              <Button 
                className="flex-1"
                disabled={isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Digital certificate information */}
      <Card className="bg-secondary/10 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Verification Information</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            This document includes a QR code for easy verification. Anyone can scan the QR code to verify that 
            the document has not been tampered with and was signed by the authorized party. No special software is required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}