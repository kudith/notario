"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, FileText, Calendar, UserCircle, Tag, AlignLeft, Hash } from "lucide-react";
import { verifyDocument } from "@/lib/document-service";
import FileUploader from "@/components/file-uploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function DocumentVerifier() {
  const [file, setFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
    setVerificationResult(null);
  };

  const handleVerify = async () => {
    if (!file) return;
    
    setIsVerifying(true);
    try {
      const result = await verifyDocument(file);
      setVerificationResult(result);
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Verification</CardTitle>
        <CardDescription>
          Upload a document to verify if it has been previously signed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUploader 
          onFileUploaded={handleFileUpload} 
          initialFile={file} 
        />
        
        {file && (
          <Button 
            onClick={handleVerify} 
            className="w-full"
            disabled={isVerifying}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Document
          </Button>
        )}
        
        {verificationResult && (
          <Alert variant={verificationResult.verified ? "success" : "destructive"}>
            {verificationResult.verified ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {verificationResult.verified 
                ? "Document Verified" 
                : "Document Not Verified"}
            </AlertTitle>
            <AlertDescription>
              {verificationResult.message}
            </AlertDescription>
          </Alert>
        )}
        
        {verificationResult && (
          <Tabs defaultValue="document">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="document">Document Info</TabsTrigger>
              <TabsTrigger value="signer">Signer</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            
            <TabsContent value="document" className="space-y-4 mt-4">
              {verificationResult.verified && verificationResult.documentInfo ? (
                <div className="space-y-3">
                  {/* Basic Document Info */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-2">
                    <h3 className="font-medium flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      Document Details
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <span className="font-medium">Certificate ID:</span> 
                      <span className="col-span-2 font-mono">{verificationResult.documentInfo.certificateId}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <span className="font-medium">Document Name:</span> 
                      <span className="col-span-2">{verificationResult.documentInfo.fileName}</span>
                    </div>
                    
                    {verificationResult.documentInfo.metadata?.documentType && (
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="font-medium">Document Type:</span> 
                        <span className="col-span-2 capitalize">
                          {verificationResult.documentInfo.metadata.documentType}
                        </span>
                      </div>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.documentSubject && (
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="font-medium">Subject:</span> 
                        <span className="col-span-2">{verificationResult.documentInfo.metadata.documentSubject}</span>
                      </div>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.documentNumber && (
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="font-medium">Document Number:</span> 
                        <span className="col-span-2">{verificationResult.documentInfo.metadata.documentNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Dates */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-2">
                    <h3 className="font-medium flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                      Dates
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      <span className="font-medium">Signed:</span> 
                      <span className="col-span-2">{formatDate(verificationResult.documentInfo.timestamp)}</span>
                    </div>
                    
                    {verificationResult.documentInfo.metadata?.issueDate && (
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="font-medium">Issue Date:</span> 
                        <span className="col-span-2">{verificationResult.documentInfo.metadata.issueDate}</span>
                      </div>
                    )}
                    
                    {verificationResult.documentInfo.metadata?.expireDate && (
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="font-medium">Expire Date:</span> 
                        <span className="col-span-2">{verificationResult.documentInfo.metadata.expireDate}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Analysis if available */}
                  {verificationResult.documentInfo.metadata?.aiAnalysis && (
                    <Accordion type="single" collapsible className="bg-white dark:bg-slate-900 rounded-lg">
                      <AccordionItem value="ai-analysis">
                        <AccordionTrigger className="px-3 py-2">
                          <span className="font-medium flex items-center text-sm">
                            <AlignLeft className="h-4 w-4 mr-2 text-primary" />
                            AI Analysis
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3 space-y-3">
                          {/* Summary */}
                          {verificationResult.documentInfo.metadata.aiAnalysis.summary && (
                            <div className="space-y-1 text-sm border-b pb-2">
                              <span className="font-medium">Summary:</span>
                              <p className="text-xs">
                                {verificationResult.documentInfo.metadata.aiAnalysis.summary}
                              </p>
                            </div>
                          )}
                          
                          {/* Document Type & Classification */}
                          <div className="space-y-1 text-sm border-b pb-2">
                            <span className="font-medium">Document Classification:</span>
                            <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                              <span className="font-medium">Type:</span>
                              <span className="col-span-2 capitalize">
                                {verificationResult.documentInfo.metadata.aiAnalysis.documentType || "Unknown"}
                              </span>
                            </div>
                            {verificationResult.documentInfo.metadata.aiAnalysis.subject && (
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <span className="font-medium">Subject:</span>
                                <span className="col-span-2">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.subject}
                                </span>
                              </div>
                            )}
                            {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber && (
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <span className="font-medium">Document #:</span>
                                <span className="col-span-2">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.documentNumber}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Important Metadata */}
                          {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata && 
                          verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.length > 0 && (
                            <div className="space-y-1 text-sm border-b pb-2">
                              <span className="font-medium">Key Information:</span>
                              <ul className="list-disc pl-5 text-xs">
                                {verificationResult.documentInfo.metadata.aiAnalysis.importantMetadata.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Dates Section */}
                          <div className="space-y-1 text-sm border-b pb-2">
                            <span className="font-medium">Document Dates:</span>
                            <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                              <span className="font-medium">Issue Date:</span>
                              <span className="col-span-2">
                                {verificationResult.documentInfo.metadata.aiAnalysis.issueDate || "Not specified"}
                              </span>
                            </div>
                            {verificationResult.documentInfo.metadata.aiAnalysis.expireDate && (
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <span className="font-medium">Expires:</span>
                                <span className="col-span-2">
                                  {verificationResult.documentInfo.metadata.aiAnalysis.expireDate}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Keywords */}
                          {verificationResult.documentInfo.metadata.aiAnalysis.keywords && 
                           verificationResult.documentInfo.metadata.aiAnalysis.keywords.length > 0 && (
                            <div className="space-y-1 text-sm">
                              <span className="font-medium">Keywords:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {verificationResult.documentInfo.metadata.aiAnalysis.keywords.map((keyword, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* AI Analysis Status */}
                          <div className="mt-2 pt-1 text-xs flex items-center text-muted-foreground border-t">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${verificationResult.documentInfo.metadata.aiAnalysis.enabled ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                            {verificationResult.documentInfo.metadata.aiAnalysis.enabled 
                              ? "AI-analyzed document"
                              : "AI analysis was not performed"}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  
                  {verificationResult.documentInfo.signedPdfUrl && (
                    <div className="mt-4">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <a 
                          href={verificationResult.documentInfo.signedPdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View Signed Document
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {verificationResult.uploadedPdfInfo ? (
                    <div className="space-y-2">
                      <p>The uploaded document was not found in our records, but we extracted the following information:</p>
                      
                      {verificationResult.uploadedPdfInfo.title && (
                        <div><span className="font-semibold">Title:</span> {verificationResult.uploadedPdfInfo.title}</div>
                      )}
                      
                      {verificationResult.uploadedPdfInfo.author && (
                        <div><span className="font-semibold">Author:</span> {verificationResult.uploadedPdfInfo.author}</div>
                      )}
                      
                      <div><span className="font-semibold">Pages:</span> {verificationResult.uploadedPdfInfo.pageCount || 'Unknown'}</div>
                      
                      {verificationResult.uploadedPdfInfo.creationDate && (
                        <div><span className="font-semibold">Created:</span> {formatDate(verificationResult.uploadedPdfInfo.creationDate)}</div>
                      )}
                    </div>
                  ) : (
                    <p>No additional information available for this document.</p>
                  )}
                </div>
              )}
            </TabsContent>
            
            {/* Signer Information Tab */}
            <TabsContent value="signer" className="mt-4">
              {verificationResult.verified && verificationResult.documentInfo ? (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-2">
                    <h3 className="font-medium flex items-center text-sm">
                      <UserCircle className="h-4 w-4 mr-2 text-primary" />
                      Signer Details
                    </h3>
                    
                    {/* Get signer from metadata.signer or from documentInfo.signer */}
                    {verificationResult.documentInfo.metadata?.signer ? (
                      <>
                        <div className="grid grid-cols-3 gap-1 text-sm">
                          <span className="font-medium">Name:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.signer.name}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 text-sm">
                          <span className="font-medium">Email:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.signer.email}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 text-sm">
                          <span className="font-medium">Signed on:</span>
                          <span className="col-span-2">{formatDate(verificationResult.documentInfo.metadata.signer.signedAt)}</span>
                        </div>
                      </>
                    ) : verificationResult.documentInfo.signer ? (
                      <>
                        <div className="grid grid-cols-3 gap-1 text-sm">
                          <span className="font-medium">Name:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.signer.name}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1 text-sm">
                          <span className="font-medium">Email:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.signer.email}</span>
                        </div>
                        
                        {verificationResult.documentInfo.signer.institution && (
                          <div className="grid grid-cols-3 gap-1 text-sm">
                            <span className="font-medium">Institution:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.signer.institution}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No signer information available</p>
                    )}
                  </div>
                  
                  {/* Document Parties, if available in AI Analysis */}
                  {verificationResult.documentInfo.metadata?.aiAnalysis?.parties && 
                   verificationResult.documentInfo.metadata.aiAnalysis.parties.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-2">
                      <h3 className="font-medium flex items-center text-sm">
                        <Tag className="h-4 w-4 mr-2 text-primary" />
                        Document Parties
                      </h3>
                      <ul className="list-disc pl-5 text-sm">
                        {verificationResult.documentInfo.metadata.aiAnalysis.parties.map((party, i) => (
                          <li key={i}>
                            <strong>{party.nama}</strong>
                            {party.peran && ` - ${party.peran}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No signer information available</p>
              )}
            </TabsContent>
            
            <TabsContent value="metadata" className="mt-4">
              {verificationResult.verified && verificationResult.documentInfo?.metadata ? (
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center text-sm">
                    <Hash className="h-4 w-4 mr-2 text-primary" />
                    Complete Document Metadata
                  </h3>
                  
                  <Accordion type="multiple" className="w-full space-y-2">
                    {/* Document Information */}
                    <AccordionItem value="document-info" className="bg-white dark:bg-slate-900 rounded-lg px-3">
                      <AccordionTrigger className="py-2">
                        <span className="text-sm font-medium">Document Information</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 text-xs pb-3">
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Original Filename:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.originalFileName}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">File Size:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.fileSize} bytes</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">MIME Type:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.mimeType}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Uploaded At:</span>
                          <span className="col-span-2">{formatDate(verificationResult.documentInfo.metadata.uploadedAt)}</span>
                        </div>
                        
                        {verificationResult.documentInfo.metadata.folderPath && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Storage Path:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.folderPath}</span>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* PDF Information */}
                    <AccordionItem value="pdf-info" className="bg-white dark:bg-slate-900 rounded-lg px-3">
                      <AccordionTrigger className="py-2">
                        <span className="text-sm font-medium">PDF Information</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 text-xs pb-3">
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Title:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfTitle || "Not available"}</span>
                        </div>
                        
                        {verificationResult.documentInfo.metadata.pdfAuthor && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Author:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfAuthor}</span>
                          </div>
                        )}
                        
                        {verificationResult.documentInfo.metadata.pdfSubject && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Subject:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfSubject}</span>
                          </div>
                        )}
                        
                        {verificationResult.documentInfo.metadata.pdfInfo?.pageCount && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Pages:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfInfo.pageCount}</span>
                          </div>
                        )}
                        
                        {verificationResult.documentInfo.metadata.pdfInfo?.creator && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Creator:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfInfo.creator}</span>
                          </div>
                        )}
                        
                        {verificationResult.documentInfo.metadata.pdfInfo?.producer && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">Producer:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfInfo.producer}</span>
                          </div>
                        )}
                        
                        {verificationResult.documentInfo.metadata.pdfInfo?.creationDate && (
                          <div className="grid grid-cols-3 gap-1">
                            <span className="font-medium">PDF Created:</span>
                            <span className="col-span-2">{verificationResult.documentInfo.metadata.pdfInfo.creationDate}</span>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Certificate Information */}
                    <AccordionItem value="certificate-info" className="bg-white dark:bg-slate-900 rounded-lg px-3">
                      <AccordionTrigger className="py-2">
                        <span className="text-sm font-medium">Certificate Details</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 text-xs pb-3">
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Certificate ID:</span>
                          <span className="col-span-2 font-mono">{verificationResult.documentInfo.metadata.certificate?.id || verificationResult.documentInfo.certificateId}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Algorithm:</span>
                          <span className="col-span-2">{verificationResult.documentInfo.metadata.certificate?.algorithm || verificationResult.documentInfo.algorithm}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-medium">Verification URL:</span>
                          <span className="col-span-2 break-all">{verificationResult.documentInfo.metadata.certificate?.verificationUrl || verificationResult.documentInfo.qrCodeUrl}</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {/* Raw JSON Data */}
                    <AccordionItem value="raw-data" className="bg-white dark:bg-slate-900 rounded-lg px-3">
                      <AccordionTrigger className="py-2">
                        <span className="text-sm font-medium">Raw JSON Data</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 text-xs pb-3">
                        <div className="bg-muted p-2 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(verificationResult.documentInfo.metadata, null, 2)}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : verificationResult.uploadedPdfInfo ? (
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium">Extracted PDF Metadata</h4>
                  
                  <div className="bg-muted p-3 rounded-md overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(verificationResult.uploadedPdfInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No metadata available for this document.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Documents are verified by checking their cryptographic hash against our secure database
      </CardFooter>
    </Card>
  );
} 