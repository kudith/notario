"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyDocumentByIdentifier } from "@/lib/document-service";
import { Loader2, FileCheck, XCircle, ArrowLeft, CalendarIcon, UserCircle, FileText, Tag, AlignLeft, Calendar, Clock, Hash, ExternalLink, Brain, Lightbulb, ListChecks, AlertCircle } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const certificateId = params.certificateId;

  useEffect(() => {
    async function verifyDocument() {
      if (!certificateId) return;
      
      try {
        setIsLoading(true);
        
        console.log(`Verifying document with certificateId: ${certificateId}`);
        const result = await verifyDocumentByIdentifier(certificateId);
        
        if (!result.verified) {
          console.error("Verification failed:", result);
          // Display more detailed error info
          if (result.diagnostic?.similarCertificateIds?.length > 0) {
            toast.error("Certificate ID not found", {
              description: "Similar IDs found. Check for typos in the certificate ID.",
            });
          }
        }
        
        setVerificationResult(result);
      } catch (error) {
        console.error("Verification error:", error);
        toast.error("Verification failed", {
          description: error.message || "Could not verify the document."
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    verifyDocument();
  }, [certificateId]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="content-container px-4 sm:px-6">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/verify')}
        className="mb-4 sm:mb-6 hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="hidden xs:inline">Back to Verification</span>
        <span className="xs:hidden">Back</span>
      </Button>
      
      <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
        <div className="feature-icon mb-3 sm:mb-4">
          <FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Certificate Verification</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Verifying certificate ID: <span className="font-mono font-medium">{certificateId}</span>
        </p>
      </div>
      
      {isLoading ? (
        <Card className="document-card flex flex-col items-center justify-center py-10 sm:py-12">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">Verifying document...</p>
        </Card>
      ) : verificationResult?.verified ? (
        <Card className="document-card border-primary/20 bg-primary/5">
          <CardHeader className="border-b border-border pb-5 sm:pb-6">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="feature-icon w-10 h-10 sm:w-12 sm:h-12 rounded-full">
                <FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
            <CardTitle className="text-center text-primary text-lg sm:text-xl">
              Document Verified
            </CardTitle>
            <CardDescription className="text-center text-sm">
              This document is authentic and has been signed using Notario.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {/* Tabs navigation - Responsively handled */}
            <Tabs defaultValue="basic">
              <div className="overflow-x-auto pb-2">
                <TabsList className="w-full min-w-max inline-flex whitespace-nowrap">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                  <TabsTrigger value="document" className="text-xs sm:text-sm">Document</TabsTrigger>
                  <TabsTrigger value="signer" className="text-xs sm:text-sm">Signer</TabsTrigger>
                  <TabsTrigger value="ai-analysis" className="text-xs sm:text-sm">AI Analysis</TabsTrigger>
                  <TabsTrigger value="metadata" className="text-xs sm:text-sm">Metadata</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="document-card p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg flex items-center mb-3 sm:mb-4">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                    Certificate Information
                  </h3>
                  {/* Responsive data grid */}
                  <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3">
                    <div className="text-sm font-medium">Certificate ID:</div>
                    <div className="font-mono text-xs sm:text-sm overflow-hidden text-ellipsis break-all">
                      {verificationResult.documentInfo.certificateId}
                    </div>
                    
                    <div className="text-sm font-medium">Document Name:</div>
                    <div className="text-sm truncate">
                      {verificationResult.documentInfo.fileName}
                    </div>
                    
                    <div className="text-sm font-medium">Signed Date:</div>
                    <div className="text-sm">
                      {formatDate(verificationResult.documentInfo.timestamp)}
                    </div>

                    <div className="text-sm font-medium">Signature Algorithm:</div>
                    <div className="text-sm">
                      {verificationResult.documentInfo.algorithm || "RSA"}
                    </div>

                    <div className="text-sm font-medium">Signature:</div>
                    <div className="font-mono text-xs overflow-hidden text-ellipsis break-all">
                      <div className="bg-secondary/30 p-2 rounded-md max-h-20 overflow-y-auto">
                        {verificationResult.documentInfo.signature}
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium">Hash Algorithm:</div>
                    <div className="text-sm">SHA-256</div>
                    
                    {verificationResult.documentInfo.fileHash && (
                      <>
                        <div className="text-sm font-medium">Document Hash:</div>
                        <div className="font-mono text-xs overflow-hidden text-ellipsis break-all">
                          <div className="bg-secondary/30 p-2 rounded-md max-h-20 overflow-y-auto">
                            {verificationResult.documentInfo.fileHash}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {verificationResult.documentInfo.metadata?.documentType && (
                  <div className="document-card p-3 sm:p-4">
                    <h3 className="font-medium text-base sm:text-lg flex items-center mb-3">
                      <Tag className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                      Document Type
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize text-md bg-secondary border-border">
                        {verificationResult.documentInfo.metadata.documentType}
                      </Badge>
                      
                      {verificationResult.documentInfo.metadata.documentSubject && (
                        <span className="text-muted-foreground text-sm">
                          {verificationResult.documentInfo.metadata.documentSubject}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {verificationResult.documentInfo.signedPdfUrl && (
                  <div className="flex justify-center mt-4">
                    <Button asChild className="btn-primary w-full sm:w-auto">
                      <a 
                        href={verificationResult.documentInfo.signedPdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Signed Document
                      </a>
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              {/* Document Details Tab */}
              <TabsContent value="document" className="space-y-4 mt-4">
                <div className="document-card p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg flex items-center mb-3 sm:mb-4">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                    Document Details
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3">
                    {verificationResult.documentInfo.metadata?.documentSubject && (
                      <>
                        <div className="text-sm font-medium">Subject:</div>
                        <div className="text-sm break-words">{verificationResult.documentInfo.metadata.documentSubject}</div>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.documentNumber && (
                      <>
                        <div className="text-sm font-medium">Document Number:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.documentNumber}
                        </div>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.issueDate && (
                      <>
                        <div className="text-sm font-medium">Issue Date:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.issueDate}
                        </div>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.expireDate && (
                      <>
                        <div className="text-sm font-medium">Expire Date:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.expireDate}
                        </div>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.pdfInfo && (
                      <>
                        <div className="text-sm font-medium">PDF Title:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.pdfInfo.title || "Not available"}
                        </div>
                        
                        {verificationResult.documentInfo.metadata.pdfInfo.author && (
                          <>
                            <div className="text-sm font-medium">PDF Author:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.metadata.pdfInfo.author}
                            </div>
                          </>
                        )}
                        
                        <div className="text-sm font-medium">Pages:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.pdfInfo.pageCount || "Unknown"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Signer Information Tab - Same grid responsive treatment */}
              <TabsContent value="signer" className="space-y-4 mt-4">
                <div className="document-card p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg flex items-center mb-3 sm:mb-4">
                    <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                    Signer Information
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3">
                    {verificationResult.documentInfo.metadata?.signer && (
                      <>
                        <div className="text-sm font-medium">Name:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.signer.name}
                        </div>
                        
                        <div className="text-sm font-medium">Email:</div>
                        <div className="text-sm">
                          {verificationResult.documentInfo.metadata.signer.email}
                        </div>
                        
                        <div className="text-sm font-medium">Signed on:</div>
                        <div className="text-sm">
                          {formatDate(verificationResult.documentInfo.metadata.signer.signedAt)}
                        </div>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.signer && (
                      <>
                        {!verificationResult.documentInfo.metadata?.signer && (
                          <>
                            <div className="text-sm font-medium">Name:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.signer.name}
                            </div>
                            
                            <div className="text-sm font-medium">Email:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.signer.email}
                            </div>
                          </>
                        )}
                        
                        {verificationResult.documentInfo.signer.institution && (
                          <>
                            <div className="text-sm font-medium">Institution:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.signer.institution}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="document-card p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg flex items-center mb-3 sm:mb-4">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                    Signing Details
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3">
                    <div className="text-sm font-medium">Signed on:</div>
                    <div className="text-sm">
                      {formatDate(verificationResult.documentInfo.timestamp)}
                    </div>
                    
                    <div className="text-sm font-medium">Certificate ID:</div>
                    <div className="font-mono text-xs sm:text-sm">
                      {verificationResult.documentInfo.certificateId}
                    </div>
                    
                    <div className="text-sm font-medium">PDF URL:</div>
                    <div className="break-all text-xs hash-code">
                      {verificationResult.documentInfo.signedPdfUrl}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* AI Analysis Tab */}
              <TabsContent value="ai-analysis" className="space-y-4 mt-4">
                {verificationResult.documentInfo.metadata?.aiAnalysis ? (
                  <>
                    <div className="document-card p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
                        <h3 className="font-medium text-base sm:text-lg flex items-center">
                          <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                          AI Document Analysis
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`${
                            verificationResult.documentInfo.metadata.aiAnalysis.enabled 
                              ? "status-verified" 
                              : "bg-accent/10 text-accent border border-accent/50"
                          } w-fit`}
                        >
                          {verificationResult.documentInfo.metadata.aiAnalysis.enabled 
                            ? "AI Analysis Enabled" 
                            : "Basic Analysis Only"}
                        </Badge>
                      </div>
                      
                      {/* Document Summary Section */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.summary && (
                        <div className="mb-5 sm:mb-6 pb-4 border-b border-border">
                          <h4 className="text-sm sm:text-md font-medium flex items-center mb-2">
                            <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Document Summary
                          </h4>
                          <p className="text-sm bg-secondary p-3 sm:p-4 rounded-md">
                            {verificationResult.documentInfo.metadata.aiAnalysis.summary}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Document Classification - Responsive on small screens */}
                        <div className="space-y-2 sm:space-y-3">
                          <h4 className="text-sm sm:text-md font-medium flex items-center">
                            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Document Classification
                          </h4>
                          
                          <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3 bg-secondary p-3 sm:p-4 rounded-md">
                            <div className="text-sm font-medium">Type:</div>
                            <div>
                              <Badge className="capitalize bg-primary/10 text-primary border-primary/20">
                                {verificationResult.documentInfo.metadata.aiAnalysis.documentType}
                              </Badge>
                            </div>
                            
                            <div className="text-sm font-medium">Subject:</div>
                            <div className="text-sm text-right max-w-[70%]">
                              {verificationResult.documentInfo.metadata.aiAnalysis.subject || "Not specified"}
                            </div>
                            
                            {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber && (
                              <>
                                <div className="text-sm font-medium">Document Number:</div>
                                <div className="font-mono text-xs sm:text-sm">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber}
                                </div>
                              </>
                            )}
                            
                            {verificationResult.documentInfo.metadata.aiAnalysis.qrCodePosition && (
                              <>
                                <div className="text-sm font-medium">QR Position:</div>
                                <div className="capitalize text-sm">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.qrCodePosition.replace(/-/g, ' ')}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Document Dates */}
                        <div className="space-y-2 sm:space-y-3">
                          <h4 className="text-sm sm:text-md font-medium flex items-center">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Document Dates
                          </h4>
                          
                          <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3 bg-secondary p-3 sm:p-4 rounded-md">
                            <div className="text-sm font-medium">Issue Date:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.metadata.aiAnalysis.issueDate || "Not specified"}
                            </div>
                            
                            <div className="text-sm font-medium">Expire Date:</div>
                            <div className="text-sm">
                              {verificationResult.documentInfo.metadata.aiAnalysis.expireDate || "Not applicable"}
                            </div>
                            
                            <div className="text-sm font-medium">Signed Date:</div>
                            <div className="text-sm">
                              {formatDate(verificationResult.documentInfo.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Important Metadata - Responsive grid for small screens */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata && 
                       verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.length > 0 && (
                        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border">
                          <h4 className="text-sm sm:text-md font-medium flex items-center mb-2 sm:mb-3">
                            <ListChecks className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Key Document Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-secondary p-3 sm:p-4 rounded-md">
                            {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">
                                  {i+1}
                                </span>
                                <span className="text-xs sm:text-sm">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Parties - FIXED: Using name and role instead of nama and peran */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.parties && 
                       verificationResult.documentInfo.metadata.aiAnalysis.parties.length > 0 && (
                        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border">
                          <h4 className="text-sm sm:text-md font-medium flex items-center mb-2 sm:mb-3">
                            <UserCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Document Parties
                          </h4>
                          <div className="bg-secondary p-3 sm:p-4 rounded-md space-y-2">
                            {verificationResult.documentInfo.metadata.aiAnalysis.parties.map((party, i) => (
                              <div key={i} className="flex flex-col p-3 border border-border rounded-md bg-card">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{party.name}</span>
                                  {party.role && (
                                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                      {party.role}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Keywords */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.keywords && 
                       verificationResult.documentInfo.metadata.aiAnalysis.keywords.length > 0 && (
                        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border space-y-3">
                          <h4 className="text-sm sm:text-md font-medium flex items-center">
                            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-primary" />
                            Document Keywords
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {verificationResult.documentInfo.metadata.aiAnalysis.keywords.map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="bg-secondary text-secondary-foreground">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="document-card p-6 sm:p-8 text-center">
                    <Brain className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                    <h3 className="text-base sm:text-lg font-medium mb-2">No AI Analysis Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">
                      This document does not have AI analysis data available. AI analysis may have been skipped during document signing.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              {/* Metadata Tab */}
              <TabsContent value="metadata" className="mt-4">
                <div className="document-card p-3 sm:p-4">
                  <h3 className="font-medium text-base sm:text-lg flex items-center mb-3 sm:mb-4">
                    <Hash className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                    Full Technical Details
                  </h3>
                  
                  <div className="hash-code p-3 sm:p-4 rounded-md overflow-x-auto max-h-[250px] sm:max-h-[500px] overflow-y-auto bg-secondary/30">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(verificationResult.documentInfo.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-4 sm:pt-6 px-3 sm:px-4">
            <p className="text-xs text-muted-foreground text-center max-w-md">
              This document has been cryptographically verified. The digital signature confirms 
              its authenticity and that it has not been tampered with since signing.
            </p>
          </CardFooter>
        </Card>
      ) : (
        <Card className="document-card border-destructive/30 bg-destructive/5">
          <CardHeader className="px-4 py-4 sm:py-6">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="rounded-full bg-destructive/10 p-2 sm:p-3">
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center text-destructive text-lg sm:text-xl">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-center">
              The certificate ID could not be verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-6">
            <p className="text-center text-sm">
              No document with certificate ID <span className="font-mono">{certificateId}</span> was found in our system.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-4 px-4">
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Please check that you have entered the correct certificate ID. If you believe this is an error,
              please contact support.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}