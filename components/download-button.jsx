"use client";

import { useState } from "react";
import { Button } from "@/components/ui/card";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, ExternalLink, FileText, Calendar, CheckCircle, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function DownloadButton({ 
  signedPdfUrl, 
  fileName, 
  certificateId, 
  driveFileId, 
  driveDownloadUrl,
  documentInfo,
  metadata
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle download
  const handleDownload = async () => {
    // Check if we have the necessary data to download
    if (!signedPdfUrl && !certificateId && !driveFileId && !driveDownloadUrl) {
      toast.error("No document download information available");
      return;
    }

    setIsLoading(true);
    try {
      let downloadUrl;
      
      // Priority 1: Use our API endpoint which doesn't auto-download
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
      
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed");
    } finally {
      setIsLoading(false);
    }
  };

  // View document in new tab
  const viewDocument = () => {
    let viewUrl;
    
    if (driveFileId) {
      // Use view parameter instead of download
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
  };

  // Format file size if available
  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col space-y-4">
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
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className="bg-primary/5 text-primary">
                <CheckCircle className="h-3 w-3 mr-1" /> Signed
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="bg-secondary/40 p-1 rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Signed On</p>
                  <p className="font-medium">
                    {metadata?.signedAt ? new Date(metadata.signedAt).toLocaleString() : 'Unknown date'}
                  </p>
                </div>
              </div>
              
              {metadata?.userName && (
                <div className="flex items-center space-x-2">
                  <div className="bg-secondary/40 p-1 rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Signed By</p>
                    <p className="font-medium">{metadata.userName}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 mt-2">
              <p className="text-xs font-medium mb-2">Certificate Information</p>
              <div className="font-mono text-xs bg-card p-2 rounded border border-border overflow-x-auto whitespace-nowrap">
                {certificateId || 'No certificate ID available'}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-3 mt-2">
              <Button
                variant="outline"
                className="flex-1 bg-card hover:bg-card/80"
                onClick={viewDocument}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Document
              </Button>
              
              <Button 
                className="flex-1"
                disabled={isLoading}
                onClick={handleDownload}
              >
                {isLoading ? (
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
      
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          This document is securely stored and includes a QR code for verification
        </p>
      </div>
    </div>
  );
}