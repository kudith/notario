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
    <div className="content-container">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/verify')}
        className="mb-6 hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Verification
      </Button>
      
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="feature-icon mb-4">
          <FileCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Certificate Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verifying certificate ID: <span className="font-mono font-medium">{certificateId}</span>
        </p>
      </div>
      
      {isLoading ? (
        <Card className="document-card flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Verifying document...</p>
        </Card>
      ) : verificationResult?.verified ? (
        <Card className="document-card border-primary/20 bg-primary/5">
          <CardHeader className="border-b border-border pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="feature-icon w-12 h-12 rounded-full">
                <FileCheck className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-center text-primary">
              Document Verified
            </CardTitle>
            <CardDescription className="text-center">
              This document is authentic and has been signed using Notario.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="signer">Signer</TabsTrigger>
                <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="document-card">
                  <h3 className="font-medium text-lg flex items-center mb-4">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Certificate Information
                  </h3>
                  <div className="data-grid">
                    <dt>Certificate ID:</dt>
                    <dd className="font-mono">{verificationResult.documentInfo.certificateId}</dd>
                    
                    <dt>Document Name:</dt>
                    <dd>{verificationResult.documentInfo.fileName}</dd>
                    
                    <dt>Signed Date:</dt>
                    <dd>{formatDate(verificationResult.documentInfo.timestamp)}</dd>

                    <dt>Signature Algorithm:</dt>
                    <dd>{verificationResult.documentInfo.algorithm || "RSA"}</dd>

                    <dt>Signature:</dt>
                    <dd className="font-mono text-xs break-all hash-code">
                      {verificationResult.documentInfo.signature}
                    </dd>
                    
                    <dt>Hash Algorithm:</dt>
                    <dd>SHA-256</dd>
                    
                    {verificationResult.documentInfo.fileHash && (
                      <>
                        <dt>Document Hash:</dt>
                        <dd className="font-mono text-xs break-all hash-code">
                          {verificationResult.documentInfo.fileHash}
                        </dd>
                      </>
                    )}
                  </div>
                </div>
                
                {verificationResult.documentInfo.metadata?.documentType && (
                  <div className="document-card">
                    <h3 className="font-medium flex items-center mb-4">
                      <Tag className="h-5 w-5 mr-2 text-primary" />
                      Document Type
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize text-md bg-secondary border-border">
                        {verificationResult.documentInfo.metadata.documentType}
                      </Badge>
                      
                      {verificationResult.documentInfo.metadata.documentSubject && (
                        <span className="text-muted-foreground">{verificationResult.documentInfo.metadata.documentSubject}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {verificationResult.documentInfo.signedPdfUrl && (
                  <div className="flex justify-center">
                    <Button asChild className="btn-primary">
                      <a 
                        href={verificationResult.documentInfo.signedPdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
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
                <div className="document-card">
                  <h3 className="font-medium text-lg flex items-center mb-4">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Document Details
                  </h3>
                  
                  <div className="data-grid">
                    {verificationResult.documentInfo.metadata?.documentSubject && (
                      <>
                        <dt>Subject:</dt>
                        <dd>{verificationResult.documentInfo.metadata.documentSubject}</dd>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.documentNumber && (
                      <>
                        <dt>Document Number:</dt>
                        <dd>{verificationResult.documentInfo.metadata.documentNumber}</dd>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.issueDate && (
                      <>
                        <dt>Issue Date:</dt>
                        <dd>{verificationResult.documentInfo.metadata.issueDate}</dd>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.expireDate && (
                      <>
                        <dt>Expire Date:</dt>
                        <dd>{verificationResult.documentInfo.metadata.expireDate}</dd>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.pdfInfo && (
                      <>
                        <dt>PDF Title:</dt>
                        <dd>{verificationResult.documentInfo.metadata.pdfInfo.title || "Not available"}</dd>
                        
                        {verificationResult.documentInfo.metadata.pdfInfo.author && (
                          <>
                            <dt>PDF Author:</dt>
                            <dd>{verificationResult.documentInfo.metadata.pdfInfo.author}</dd>
                          </>
                        )}
                        
                        <dt>Pages:</dt>
                        <dd>{verificationResult.documentInfo.metadata.pdfInfo.pageCount || "Unknown"}</dd>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Signer Information Tab */}
              <TabsContent value="signer" className="space-y-4 mt-4">
                <div className="document-card">
                  <h3 className="font-medium text-lg flex items-center mb-4">
                    <UserCircle className="h-5 w-5 mr-2 text-primary" />
                    Signer Information
                  </h3>
                  
                  <div className="data-grid">
                    {verificationResult.documentInfo.metadata?.signer && (
                      <>
                        <dt>Name:</dt>
                        <dd>{verificationResult.documentInfo.metadata.signer.name}</dd>
                        
                        <dt>Email:</dt>
                        <dd>{verificationResult.documentInfo.metadata.signer.email}</dd>
                        
                        <dt>Signed on:</dt>
                        <dd>{formatDate(verificationResult.documentInfo.metadata.signer.signedAt)}</dd>
                      </>
                    )}
                    
                    {verificationResult.documentInfo.signer && (
                      <>
                        {!verificationResult.documentInfo.metadata?.signer && (
                          <>
                            <dt>Name:</dt>
                            <dd>{verificationResult.documentInfo.signer.name}</dd>
                            
                            <dt>Email:</dt>
                            <dd>{verificationResult.documentInfo.signer.email}</dd>
                          </>
                        )}
                        
                        {verificationResult.documentInfo.signer.institution && (
                          <>
                            <dt>Institution:</dt>
                            <dd>{verificationResult.documentInfo.signer.institution}</dd>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="document-card">
                  <h3 className="font-medium text-lg flex items-center mb-4">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    Signing Details
                  </h3>
                  
                  <div className="data-grid">
                    <dt>Signed on:</dt>
                    <dd>
                      {formatDate(verificationResult.documentInfo.timestamp)}
                    </dd>
                    
                    <dt>Certificate ID:</dt>
                    <dd className="font-mono">{verificationResult.documentInfo.certificateId}</dd>
                    
                    <dt>PDF URL:</dt>
                    <dd className="break-all text-xs hash-code">
                      {verificationResult.documentInfo.signedPdfUrl}
                    </dd>
                  </div>
                </div>
              </TabsContent>
              
              {/* AI Analysis Tab */}
              <TabsContent value="ai-analysis" className="space-y-4 mt-4">
                {verificationResult.documentInfo.metadata?.aiAnalysis ? (
                  <>
                    <div className="document-card">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-medium text-lg flex items-center">
                          <Brain className="h-5 w-5 mr-2 text-primary" />
                          AI Document Analysis
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`${
                            verificationResult.documentInfo.metadata.aiAnalysis.enabled 
                              ? "status-verified"
                              : "bg-accent/10 text-accent border border-accent/50"
                          }`}
                        >
                          {verificationResult.documentInfo.metadata.aiAnalysis.enabled 
                            ? "AI Analysis Enabled"
                            : "Basic Analysis Only"}
                        </Badge>
                      </div>
                      
                      {/* Document Summary Section */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.summary && (
                        <div className="mb-6 pb-4 border-b border-border">
                          <h4 className="text-md font-medium flex items-center mb-2">
                            <Lightbulb className="h-4 w-4 mr-2 text-primary" />
                            Document Summary
                          </h4>
                          <p className="text-sm bg-secondary p-4 rounded-md">
                            {verificationResult.documentInfo.metadata.aiAnalysis.summary}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Document Classification */}
                        <div className="space-y-3">
                          <h4 className="text-md font-medium flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-primary" />
                            Document Classification
                          </h4>
                          
                          <div className="data-grid bg-secondary p-4 rounded-md">
                            <dt>Type:</dt>
                            <dd>
                              <Badge className="capitalize bg-primary/10 text-primary border-primary/20">
                                {verificationResult.documentInfo.metadata.aiAnalysis.documentType}
                              </Badge>
                            </dd>
                            
                            <dt>Subject:</dt>
                            <dd className="text-right max-w-[70%]">
                              {verificationResult.documentInfo.metadata.aiAnalysis.subject || "Not specified"}
                            </dd>
                            
                            {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber && (
                              <>
                                <dt>Document Number:</dt>
                                <dd className="font-mono">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber}
                                </dd>
                              </>
                            )}
                            
                            {verificationResult.documentInfo.metadata.aiAnalysis.qrCodePosition && (
                              <>
                                <dt>QR Position:</dt>
                                <dd className="capitalize">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.qrCodePosition.replace(/-/g, ' ')}
                                </dd>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Document Dates */}
                        <div className="space-y-3">
                          <h4 className="text-md font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-primary" />
                            Document Dates
                          </h4>
                          
                          <div className="data-grid bg-secondary p-4 rounded-md">
                            <dt>Issue Date:</dt>
                            <dd>
                              {verificationResult.documentInfo.metadata.aiAnalysis.issueDate || "Not specified"}
                            </dd>
                            
                            <dt>Expire Date:</dt>
                            <dd>
                              {verificationResult.documentInfo.metadata.aiAnalysis.expireDate || "Not applicable"}
                            </dd>
                            
                            <dt>Signed Date:</dt>
                            <dd>
                              {formatDate(verificationResult.documentInfo.timestamp)}
                            </dd>
                          </div>
                        </div>
                      </div>
                      
                      {/* Important Metadata */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata && 
                       verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <h4 className="text-md font-medium flex items-center mb-3">
                            <ListChecks className="h-4 w-4 mr-2 text-primary" />
                            Key Document Information
                          </h4>
                          <div className="grid md:grid-cols-2 gap-3 bg-secondary p-4 rounded-md">
                            {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mt-0.5">
                                  {i+1}
                                </span>
                                <span className="text-sm">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Parties - FIXED: Using name and role instead of nama and peran */}
                      {verificationResult.documentInfo.metadata.aiAnalysis.parties && 
                       verificationResult.documentInfo.metadata.aiAnalysis.parties.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <h4 className="text-md font-medium flex items-center mb-3">
                            <UserCircle className="h-4 w-4 mr-2 text-primary" />
                            Document Parties
                          </h4>
                          <div className="bg-secondary p-4 rounded-md space-y-2">
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
                        <div className="mt-6 pt-6 border-t border-border space-y-3">
                          <h4 className="text-md font-medium flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-primary" />
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
                  <div className="document-card p-8 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No AI Analysis Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      This document does not have AI analysis data available. AI analysis may have been skipped during document signing.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              {/* Metadata Tab */}
              <TabsContent value="metadata" className="mt-4">
                <div className="document-card">
                  <h3 className="font-medium flex items-center mb-4">
                    <Hash className="h-5 w-5 mr-2 text-primary" />
                    Full Technical Details
                  </h3>
                  
                  <div className="hash-code p-4 rounded-md overflow-x-auto max-h-[500px] overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(verificationResult.documentInfo.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-xs text-muted-foreground text-center max-w-md">
              This document has been cryptographically verified. The digital signature confirms 
              its authenticity and that it has not been tampered with since signing.
            </p>
          </CardFooter>
        </Card>
      ) : (
        <Card className="document-card border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center text-destructive">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-center">
              The certificate ID could not be verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              No document with certificate ID <span className="font-mono">{certificateId}</span> was found in our system.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-4">
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Please check that you have entered the correct certificate ID. If you believe this is an error,
              please contact support.
            </p>
          </CardFooter>
        </Card>
      )}
      
      {/* <Toaster richColors position="bottom-right" /> */}
    </div>
  );
}