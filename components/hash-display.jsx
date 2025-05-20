"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

export default function HashDisplay({ file, onHashGenerated }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [hash, setHash] = useState("");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) return;
    
    async function generateHash() {
      try {
        setIsGenerating(true);
        setError(null);
        
        // Read the file as an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Generate SHA-256 hash using the crypto module
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        
        // Convert the hash to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        
        setHash(hashHex);
        onHashGenerated(hashHex);
      } catch (err) {
        console.error("Error generating hash:", err);
        setError("Failed to generate document hash. Please try again.");
        toast.error("Hash generation failed");
      } finally {
        setIsGenerating(false);
      }
    }

    generateHash();
  }, [file, onHashGenerated]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success("Hash copied to clipboard");
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy hash");
    }
  };

  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader className="pb-3 bg-card border-b border-border">
        <CardTitle className="text-base flex items-center">
          <FileText className="h-4 w-4 text-primary mr-2" />
          Document Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-card/50">
        <div className="space-y-3">
          <div className="grid grid-cols-3 text-sm p-2 rounded-md hover:bg-card transition-colors">
            <span className="text-muted-foreground">File name:</span>
            <span className="col-span-2 font-medium truncate">{file.name}</span>
          </div>
          <div className="grid grid-cols-3 text-sm p-2 rounded-md hover:bg-card transition-colors">
            <span className="text-muted-foreground">Size:</span>
            <span className="col-span-2 font-medium">{(file.size / 1024).toFixed(2)} KB</span>
          </div>
          <div className="grid grid-cols-3 text-sm p-2 rounded-md hover:bg-card transition-colors">
            <span className="text-muted-foreground">SHA-256 Hash:</span>
            <div className="col-span-2">
              {isGenerating ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : error ? (
                <div className="flex items-center text-destructive p-2 border border-destructive/20 rounded-md bg-destructive/5">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-xs">{error}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-primary mr-2" />
                      <span className="text-xs font-medium">Hash generated successfully</span>
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className={`flex items-center text-xs rounded-full px-2 py-1 transition-colors ${
                        copied 
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-primary"
                      }`}
                      title="Copy hash to clipboard"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="text-xs overflow-x-auto p-2 bg-secondary border border-border rounded-md whitespace-pre-wrap break-all leading-relaxed font-mono text-muted-foreground">
                      {hash}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}