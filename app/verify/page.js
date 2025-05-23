"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DocumentVerifier from "@/components/document-verifier";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyDocumentByIdentifier } from "@/lib/document-service";
import {
  Loader2,
  Search,
  FileCheck,
  FileText,
  Calendar,
  UserCircle,
  ExternalLink,
  AlignLeft,
  AlertCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// Component yang menggunakan useSearchParams dibungkus dalam komponen terpisah
function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for hash parameter from QR code scan
    const hash = searchParams.get("hash");
    const certificateId = searchParams.get("id");

    if (certificateId) {
      // Redirect to the dedicated certificate page for a cleaner experience
      router.push(`/verify/${certificateId}`);
      return;
    }

    if (hash) {
      setIsLoading(true);

      // Auto-verify document using the hash
      verifyDocumentByIdentifier(null, hash)
        .then((result) => {
          setSearchResult(result);

          if (result.verified) {
            toast.success("Document verified successfully", {
              description:
                "This document has been properly signed and is authentic.",
            });

            // Optionally redirect to certificate page for a more detailed view
            if (result.documentInfo?.certificateId) {
              router.push(`/verify/${result.documentInfo.certificateId}`);
            }
          } else {
            toast.error("Document verification failed", {
              description: "This document could not be found in our records.",
            });
          }
        })
        .catch((error) => {
          console.error("Error verifying document by hash:", error);
          toast.error("Verification failed", {
            description:
              error.message || "There was a problem verifying this document.",
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [searchParams, router]);

  const handleCertificateSearch = async () => {
    if (!certificateId.trim()) {
      toast.error("Please enter a certificate ID");
      return;
    }

    setIsSearching(true);
    try {
      const result = await verifyDocumentByIdentifier(certificateId);
      setSearchResult(result);

      if (!result.verified) {
        toast.error("Certificate not found", {
          description:
            "No document with this certificate ID was found in our system.",
        });
      }
    } catch (error) {
      console.error("Certificate search error:", error);
      toast.error("Search failed", {
        description: error.message || "Could not search for the certificate.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Show loading indicator if we're processing a QR code scan
  if (isLoading) {
    return (
      <div className="content-container flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">
          Verifying document from QR code...
        </p>
      </div>
    );
  }

  return (
    <div className="content-container px-4 sm:px-6">
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="feature-icon mb-4">
          <FileCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Document Verification
        </h1>
        <p className="text-muted-foreground max-w-2xl mt-2 text-sm sm:text-base">
          Verify the authenticity of documents signed with Notario. Upload a
          document, scan a QR code, or enter a certificate ID.
        </p>
      </div>

      {/* Display verification results from QR code scan or certificate ID search */}
      {searchResult && (
        <Card className="document-card mb-8 border border-primary/20">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              {searchResult.verified ? (
                <>
                  <FileCheck className="h-5 w-5 text-primary" />
                  Document Verified Successfully
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Verification Failed
                </>
              )}
            </CardTitle>
            <CardDescription>
              {searchResult.verified
                ? "This document has been authenticated and is valid"
                : "This document could not be verified"}
            </CardDescription>
          </CardHeader>

          {searchResult.verified && searchResult.documentInfo && (
            <CardContent className="px-4 sm:px-6">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                  <TabsTrigger value="document" className="text-xs sm:text-sm">Document</TabsTrigger>
                  <TabsTrigger value="signer" className="text-xs sm:text-sm">Signer</TabsTrigger>
                </TabsList>

                {/* Basic Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="bg-card border border-primary/20 p-3 sm:p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="feature-icon w-7 sm:w-8 h-7 sm:h-8 mb-0">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-medium text-primary">
                        Document Verified
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4 text-sm">
                      This document is authentic and has been signed using
                      Notario.
                    </p>

                    <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3 mt-4">
                      <div className="text-sm font-medium">Certificate ID:</div>
                      <div className="font-mono text-xs sm:text-sm overflow-hidden text-ellipsis">
                        {searchResult.documentInfo.certificateId}
                      </div>

                      <div className="text-sm font-medium">Document Name:</div>
                      <div className="text-sm truncate">
                        {searchResult.documentInfo.fileName}
                      </div>

                      <div className="text-sm font-medium">Signed Date:</div>
                      <div className="text-sm">
                        {formatDate(searchResult.documentInfo.timestamp)}
                      </div>

                      {searchResult.documentInfo.metadata?.documentType && (
                        <>
                          <div className="text-sm font-medium">Document Type:</div>
                          <div className="text-sm capitalize">
                            {searchResult.documentInfo.metadata.documentType}
                            {searchResult.documentInfo.metadata.documentSubject
                              ? ` - ${searchResult.documentInfo.metadata.documentSubject}`
                              : ""}
                          </div>
                        </>
                      )}

                      <div className="text-sm font-medium">Hash Algorithm:</div>
                      <div className="font-mono text-xs break-all hash-code">
                        SHA-256
                      </div>

                      <div className="text-sm font-medium">Signature:</div>
                      <div className="font-mono text-xs break-all hash-code">
                        {searchResult.documentInfo.algorithm}
                      </div>
                    </div>

                    {searchResult.documentInfo.signedPdfUrl && (
                      <div className="mt-6">
                        <Button
                          asChild
                          variant="outline"
                          className="btn-outline w-full sm:max-w-xs mx-auto block"
                        >
                          <a
                            href={searchResult.documentInfo.signedPdfUrl}
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

                    <div className="mt-4 text-center">
                      <Button
                        variant="link"
                        onClick={() =>
                          (window.location.href = `/verify/${searchResult.documentInfo.certificateId}`)
                        }
                        className="text-primary text-sm"
                      >
                        View Full Verification Details
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Document Tab */}
                <TabsContent value="document" className="space-y-4 mt-4">
                  <div className="document-card p-3 sm:p-4 border border-border rounded-md">
                    <h3 className="font-medium text-base sm:text-lg flex items-center mb-4">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                      Document Details
                    </h3>

                    <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_2fr] sm:gap-y-3">
                      {searchResult.documentInfo.metadata?.documentSubject && (
                        <>
                          <dt>Subject:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.documentSubject}
                          </dd>
                        </>
                      )}

                      {searchResult.documentInfo.metadata?.documentNumber && (
                        <>
                          <dt>Document Number:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.documentNumber}
                          </dd>
                        </>
                      )}

                      {searchResult.documentInfo.metadata?.issueDate && (
                        <>
                          <dt>Issue Date:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.issueDate}
                          </dd>
                        </>
                      )}

                      {searchResult.documentInfo.metadata?.pdfInfo && (
                        <>
                          <dt>Pages:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.pdfInfo
                              .pageCount || "Unknown"}
                          </dd>

                          {searchResult.documentInfo.metadata.pdfInfo.title && (
                            <>
                              <dt>Title:</dt>
                              <dd>
                                {
                                  searchResult.documentInfo.metadata.pdfInfo
                                    .title
                                }
                              </dd>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Analysis Summary with responsive changes */}
                  {searchResult.documentInfo.metadata?.aiAnalysis && (
                    <div className="document-card border border-border rounded-md">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="ai-summary" className="border-none">
                          <AccordionTrigger className="flex items-center gap-2 px-3 sm:px-4 py-3">
                            <span className="flex items-center">
                              <AlignLeft className="h-4 w-4 mr-2 text-primary" />
                              <span className="text-sm">AI Document Analysis</span>
                            </span>
                            {searchResult.documentInfo.metadata.aiAnalysis
                              .enabled && (
                              <Badge
                                variant="outline"
                                className="status-verified ml-1 sm:ml-2 text-xs"
                              >
                                AI Analyzed
                              </Badge>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2 px-3 sm:px-4 pb-4">
                            {/* Summary */}
                            {searchResult.documentInfo.metadata.aiAnalysis
                              .summary && (
                              <div className="space-y-1 pb-3 border-b border-border">
                                <h4 className="text-sm font-medium">
                                  Document Summary
                                </h4>
                                <p className="text-sm">
                                  {
                                    searchResult.documentInfo.metadata
                                      .aiAnalysis.summary
                                  }
                                </p>
                              </div>
                            )}

                            {/* Important Metadata */}
                            {searchResult.documentInfo.metadata.aiAnalysis
                              .importantMetadata &&
                              searchResult.documentInfo.metadata.aiAnalysis
                                .importantMetadata.length > 0 && (
                                <div className="space-y-1 pb-3 border-b border-border">
                                  <h4 className="text-sm font-medium">
                                    Key Information
                                  </h4>
                                  <ul className="list-disc pl-5 text-sm space-y-1">
                                    {searchResult.documentInfo.metadata.aiAnalysis.importantMetadata.map(
                                      (item, i) => (
                                        <li key={i}>{item}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Parties Information */}
                            {searchResult.documentInfo.metadata.aiAnalysis
                              .parties &&
                              searchResult.documentInfo.metadata.aiAnalysis
                                .parties.length > 0 && (
                                <div className="space-y-1 pb-3 border-b border-border">
                                  <h4 className="text-sm font-medium">
                                    Document Parties
                                  </h4>
                                  <div className="bg-secondary p-3 rounded-md">
                                    <ul className="list-disc pl-5 text-sm space-y-1">
                                      {searchResult.documentInfo.metadata.aiAnalysis.parties.map(
                                        (party, i) => (
                                          <li key={i}>
                                            <strong>{party.name}</strong>
                                            {party.role && ` - ${party.role}`}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              )}

                            {/* Date Information */}
                            <div className="space-y-1 pb-3 border-b border-border">
                              <h4 className="text-sm font-medium">
                                Document Dates
                              </h4>
                              <div className="data-grid">
                                <dt>Issue Date:</dt>
                                <dd>
                                  {searchResult.documentInfo.metadata.aiAnalysis
                                    .issueDate || "Not specified"}
                                </dd>

                                <dt>Expiry Date:</dt>
                                <dd>
                                  {searchResult.documentInfo.metadata.aiAnalysis
                                    .expireDate || "Not applicable"}
                                </dd>
                              </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium">Keywords</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {searchResult.documentInfo.metadata.aiAnalysis
                                  .keywords &&
                                searchResult.documentInfo.metadata.aiAnalysis
                                  .keywords.length > 0 ? (
                                  searchResult.documentInfo.metadata.aiAnalysis.keywords.map(
                                    (keyword, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className="text-xs bg-secondary text-secondary-foreground"
                                      >
                                        {keyword}
                                      </Badge>
                                    )
                                  )
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    No keywords extracted
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* View Full Details Button */}
                            <div className="pt-2 mt-2 border-t border-border text-center">
                              <Button
                                variant="outline"
                                className="btn-outline"
                                onClick={() =>
                                  (window.location.href = `/verify/${searchResult.documentInfo.certificateId}`)
                                }
                              >
                                View Full Document Details
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </TabsContent>

                {/* Signer Tab with responsive changes */}
                <TabsContent value="signer" className="space-y-4 mt-4">
                  <div className="document-card">
                    <h3 className="font-medium text-lg flex items-center mb-4">
                      <UserCircle className="h-5 w-5 mr-2 text-primary" />
                      Signer Information
                    </h3>

                    <div className="data-grid">
                      {/* Get signer information from metadata.signer or from documentInfo.signer */}
                      {searchResult.documentInfo.metadata?.signer ? (
                        <>
                          <dt>Name:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.signer.name}
                          </dd>

                          <dt>Email:</dt>
                          <dd>
                            {searchResult.documentInfo.metadata.signer.email}
                          </dd>

                          <dt>Signed on:</dt>
                          <dd>
                            {formatDate(
                              searchResult.documentInfo.metadata.signer.signedAt
                            )}
                          </dd>
                        </>
                      ) : searchResult.documentInfo.signer ? (
                        <>
                          <dt>Name:</dt>
                          <dd>{searchResult.documentInfo.signer.name}</dd>

                          <dt>Email:</dt>
                          <dd>{searchResult.documentInfo.signer.email}</dd>

                          {searchResult.documentInfo.signer.institution && (
                            <>
                              <dt>Institution:</dt>
                              <dd>
                                {searchResult.documentInfo.signer.institution}
                              </dd>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground col-span-2">
                          No signer information available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Document Parties from AI Analysis */}
                  {searchResult.documentInfo.metadata?.aiAnalysis?.parties &&
                    searchResult.documentInfo.metadata.aiAnalysis.parties
                      .length > 0 && (
                      <div className="document-card">
                        <Accordion type="single" collapsible>
                          <AccordionItem value="parties">
                            <AccordionTrigger>
                              Document Parties
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="list-disc pl-5 text-sm space-y-1">
                                {searchResult.documentInfo.metadata.aiAnalysis.parties.map(
                                  (party, i) => (
                                    <li key={i}>
                                      <strong>{party.name}</strong>
                                      {party.role && ` - ${party.role}`}
                                    </li>
                                  )
                                )}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    )}

                  <div className="text-center">
                    <Button
                      variant="outline"
                      className="btn-outline"
                      onClick={() =>
                        (window.location.href = `/verify/${searchResult.documentInfo.certificateId}`)
                      }
                    >
                      View Full Certificate Details
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Button to start new verification */}
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => setSearchResult(null)} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Verify Another Document
                </Button>
              </div>
            </CardContent>
          )}

          {/* Show error card if verification failed */}
          {searchResult && !searchResult.verified && (
            <CardContent className="px-4 sm:px-6">
              <div className="bg-destructive/5 p-3 sm:p-4 rounded-md border border-destructive/30">
                <h3 className="font-medium text-destructive mb-2">
                  Verification Failed
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {searchResult.message ||
                    "The document could not be verified. It may not exist in our system."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => setSearchResult(null)}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Only show the verification options if there's no result yet */}
      {!searchResult && (
        <Card className="document-card mb-8">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Verify Document</CardTitle>
            <CardDescription>
              Choose how you want to verify your document
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Document</TabsTrigger>
                <TabsTrigger value="certificate">Certificate ID</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 pt-4">
                <DocumentVerifier />
              </TabsContent>

              <TabsContent value="certificate" className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Enter certificate ID"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    className="form-input flex-1"
                  />
                  <Button
                    onClick={handleCertificateSearch}
                    disabled={isSearching}
                    className="btn-primary mt-2 sm:mt-0 w-full sm:w-auto"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Verify
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 text-xs sm:text-sm text-muted-foreground px-4 sm:px-6">
            <p>
              Notario uses advanced cryptographic techniques to ensure document
              authenticity and integrity.
            </p>
          </CardFooter>
        </Card>
      )}

      <Card className="document-card">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>How Verification Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 sm:p-4 border border-border rounded-md bg-card">
              <div className="feature-icon">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-medium mb-2">1. Document Hash</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Each document is processed with a secure SHA-256 algorithm to
                generate a unique cryptographic fingerprint.
              </p>
            </div>

            <div className="p-3 sm:p-4 border border-border rounded-md bg-card">
              <div className="feature-icon">
                <UserCircle className="h-5 w-5" />
              </div>
              <h3 className="font-medium mb-2">2. Digital Signature</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                The document is cryptographically signed using RSA
                public/private key pairs to ensure authenticity.
              </p>
            </div>

            <div className="p-3 sm:p-4 border border-border rounded-md bg-card">
              <div className="feature-icon">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-medium mb-2">3. Secure Database</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Document signatures and metadata are securely stored in our
                database for future verification and validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback untuk Suspense
function LoadingFallback() {
  return (
    <div className="content-container flex flex-col items-center justify-center py-20">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">Loading verification page...</p>
    </div>
  );
}

// Main component yang membungkus dengan Suspense
export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyPageContent />
    </Suspense>
  );
}
