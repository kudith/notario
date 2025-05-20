"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, FileText, Calendar, Download } from "lucide-react";
import { toast } from "sonner";

export default function UserDocuments() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch user documents
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/documents');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents", {
        description: error.message || "Could not retrieve your documents."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh document relationships
  const refreshDocumentRelationships = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/user/documents/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh document relationships');
      }
      
      const result = await response.json();
      
      toast.success("Documents refreshed", {
        description: `Successfully refreshed ${result.documentCount} documents.`
      });
      
      // Fetch updated documents
      fetchDocuments();
    } catch (error) {
      console.error("Error refreshing documents:", error);
      toast.error("Failed to refresh documents", {
        description: error.message || "Could not refresh your document relationships."
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Load documents on component mount
  useEffect(() => {
    if (session?.user) {
      fetchDocuments();
    }
  }, [session]);
  
  if (!session?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Sign in to view your documents</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            {documents.length === 0 && !isLoading
              ? "You haven't signed any documents yet"
              : `You have ${documents.length} document${documents.length !== 1 ? 's' : ''}`
            }
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDocumentRelationships}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No documents found</p>
            <p className="text-sm mt-1">Sign a document to see it here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="border rounded-md p-4 flex flex-col space-y-2 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <h3 className="font-medium">{doc.fileName}</h3>
                      <p className="text-xs text-muted-foreground">ID: {doc.certificateId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.driveViewUrl && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={doc.driveViewUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                    {doc.driveDownloadUrl && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={doc.driveDownloadUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>Signed: {formatDate(doc.timestamp)}</span>
                </div>
                
                {doc.metadata?.folderPath && (
                  <div className="text-xs text-muted-foreground">
                    <span>Storage path: {doc.metadata.folderPath}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        Documents are securely stored and can be verified using the certificate ID
      </CardFooter>
    </Card>
  );
} 