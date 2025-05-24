"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FileUploader from "@/components/file-uploader";
import HashDisplay from "@/components/hash-display";
import SignaturePanel from "@/components/signature-panel";
import DownloadCard from "@/components/download-card";
import { 
  Loader2, CheckCircle, Copy, Info, AlertTriangle, ArrowRight, 
  FileSignature, Shield, Clock, Calendar, File, Key, ServerIcon, 
  Database, FileCheck, Fingerprint, Lock, AlertCircle, Brain,
  FileSearch, BookOpen, ExternalLink, FileType, BarChart, SquareAsterisk,
  Sparkles, User
} from "lucide-react";
import { signDocument, analyzeDocument } from "@/lib/document-service";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

export default function SignPage() {
  // File and processing states
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const [signature, setSignature] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Document analysis and metadata
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const [documentCategory, setDocumentCategory] = useState(null);
  const [documentSubject, setDocumentSubject] = useState("");
  const [documentParties, setDocumentParties] = useState([]);
  const [documentKeywords, setDocumentKeywords] = useState([]);

  // Result states
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [driveFileId, setDriveFileId] = useState(null);
  const [driveViewUrl, setDriveViewUrl] = useState(null);
  const [driveDownloadUrl, setDriveDownloadUrl] = useState(null);
  const [certificateId, setCertificateId] = useState(null);
  const [alreadySignedInfo, setAlreadySignedInfo] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState("upload");
  const [hashCopied, setHashCopied] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signingProgress, setSigningProgress] = useState(0);
  const [signingStage, setSigningStage] = useState('');
  const [signingDetails, setSigningDetails] = useState([]);
  const [signatureTimestamp, setSignatureTimestamp] = useState(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [processingStage, setProcessingStage] = useState('upload'); // upload, analyze, hash, sign

  // Session and router
  const { data: session } = useSession();
  const router = useRouter();

  // Handle signing animation and steps
  useEffect(() => {
    let progressInterval;
    if (isSignDialogOpen && isProcessing) {
      const steps = [
        { progress: 10, stage: 'Analyzing document structure', detail: 'Parsing document content and metadata' },
        { progress: 20, stage: 'Calculating document hash', detail: 'Generating SHA-256 cryptographic fingerprint' },
        { progress: 30, stage: 'Preparing signature data', detail: 'Formatting document hash with timestamp' },
        { progress: 45, stage: 'Applying digital signature', detail: `Creating ${session?.user?.security?.algorithm || "RSA"} signature with your private key` },
        { progress: 60, stage: 'Embedding verification QR code', detail: 'Adding verification information to document' },
        { progress: 70, stage: 'Generating certificate', detail: 'Creating unique certificate identifier' },
        { progress: 80, stage: 'Securing document', detail: 'Finalizing signed PDF with tamper protection' },
        { progress: 90, stage: 'Uploading to secure storage', detail: 'Saving document to encrypted cloud storage' },
        { progress: 95, stage: 'Registering document', detail: 'Recording signature in secure registry' }
      ];
      
      let currentStep = 0;
      
      // Start with the first step immediately
      setSigningProgress(steps[0].progress);
      setSigningStage(steps[0].stage);
      setSigningDetails(prev => [...prev, {
        stage: steps[0].stage,
        detail: steps[0].detail,
        timestamp: new Date().toISOString()
      }]);
      
      progressInterval = setInterval(() => {
        currentStep++;
        
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          setSigningProgress(step.progress);
          setSigningStage(step.stage);
          setSigningDetails(prev => [...prev, {
            stage: step.stage,
            detail: step.detail,
            timestamp: new Date().toISOString()
          }]);
        } else {
          // Don't clear interval - let the actual process set 100%
          // We'll just stop adding new steps
        }
      }, 1500); // Slower timing to make progress more realistic
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isSignDialogOpen, isProcessing, session?.user?.security?.algorithm]);

  // Handle file upload with AI analysis
  const handleFileUpload = async (uploadedFile, providedHash = null, analysisData = null) => {
    // Reset states
    setFile(uploadedFile);
    setSignature(null);
    setDocumentId(null);
    setSignedPdfUrl(null);
    setDriveFileId(null);
    setDriveViewUrl(null);
    setDriveDownloadUrl(null);
    setCertificateId(null);
    setAlreadySignedInfo(null);
    setSigningDetails([]);
    setSignatureTimestamp(null);
    setProcessingStage('upload');
    
    // If file was removed, clear everything
    if (!uploadedFile) {
      setFileHash(null);
      setDocumentAnalysis(null);
      setDocumentCategory(null);
      setDocumentSubject("");
      setDocumentParties([]);
      setDocumentKeywords([]);
      return;
    }

    // If we received analysis data from the file uploader
    if (providedHash && analysisData) {
      setFileHash(providedHash);
      handleAnalysisResults(analysisData);
      setProcessingStage('hash'); // Skip to hash stage since we already have analysis
    }
  };

  // Process analysis results
  const handleAnalysisResults = (analysisData) => {
    if (!analysisData || !analysisData.analysis) return;
    
    setDocumentAnalysis(analysisData);
    setDocumentCategory(analysisData.analysis.documentType || null);
    setDocumentSubject(analysisData.analysis.subject || "");
    
    // Extract parties if available
    if (analysisData.analysis.parties && Array.isArray(analysisData.analysis.parties) && analysisData.analysis.parties.length > 0) {
      setDocumentParties(analysisData.analysis.parties);
    }
    
    // Extract keywords if available
    if (analysisData.analysis.keywords && Array.isArray(analysisData.analysis.keywords) && analysisData.analysis.keywords.length > 0) {
      setDocumentKeywords(analysisData.analysis.keywords.slice(0, 5)); // Take first 5 keywords
    }
  };

  // When hash is generated in HashDisplay component
  const handleHashGenerated = async (hash) => {
    setFileHash(hash);
    setProcessingStage('hash');
    
    // Check if document with this hash already exists
    try {
      const response = await fetch(`/api/documents/check?fileHash=${hash}`);
      const result = await response.json();
      
      if (response.ok && result.exists) {
        // Document already exists, handle accordingly
        setAlreadySignedInfo(result.documentInfo);
        setSignedPdfUrl(result.documentInfo.signedPdfUrl);
        setCertificateId(result.documentInfo.certificateId);
        if (result.documentInfo.driveFileId) {
          setDriveFileId(result.documentInfo.driveFileId);
        }
        if (result.documentInfo.driveViewUrl) {
          setDriveViewUrl(result.documentInfo.driveViewUrl);
        }
        if (result.documentInfo.driveDownloadUrl) {
          setDriveDownloadUrl(result.documentInfo.driveDownloadUrl);
        }
        
        // Show notification
        toast.warning("Document already signed", {
          description: "This document has already been signed in our system. You'll be redirected to the download tab.",
        });
        
        // Switch to download tab
        setTimeout(() => {
          setActiveTab("download");
        }, 1500);
      }
      // Remove the automatic analysis that was here previously
    } catch (error) {
      console.error("Error checking document:", error);
      toast.error("Error checking document status", {
        description: "Could not verify if this document has been signed before."
      });
    }
  };

  // Handler for manual document analysis
  const handleManualAnalysis = async () => {
    if (!file || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setProcessingStage('analyze');
    
    try {
      const analysisResult = await analyzeDocument(file);
      if (analysisResult) {
        handleAnalysisResults(analysisResult);
        toast.success("Document analyzed successfully", {
          description: `Type: ${analysisResult.analysis?.documentType || "Document"}`
        });
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      toast.error("Failed to analyze document", {
        description: "Will continue with basic information only"
      });
    } finally {
      setIsAnalyzing(false);
      setProcessingStage('hash');
    }
  };

  // When signature is generated in SignaturePanel
  const handleSignatureGenerated = (sig, pubKey, timestamp) => {
    setSignature(sig);
    setPublicKey(pubKey);
    setSignatureTimestamp(timestamp);  // Save the timestamp
    setProcessingStage('sign');
    
    console.log("Signature generated with timestamp:", timestamp);
  };

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  // Copy hash to clipboard
  const copyHashToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fileHash);
      setHashCopied(true);
      toast.success("Hash copied to clipboard");
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setHashCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy hash");
    }
  };

  // Navigate to next tab
  const goToNextTab = () => {
    if (activeTab === "upload" && file && fileHash) {
      setActiveTab("sign");
    } else if (activeTab === "sign" && signature) {
      openSignDialog();
    }
  };

  // Open signing dialog
  const openSignDialog = () => {
    if (!file || !fileHash || !signature || !publicKey) {
      toast.error("Missing information", {
        description: "Please upload a file and generate a signature before proceeding."
      });
      return;
    }

    // If document is already signed, prevent re-signing
    if (alreadySignedInfo) {
      toast.warning("Document already signed", {
        description: "This document has already been signed. Redirecting to the download tab.",
      });
      setActiveTab("download");
      return;
    }

    if (!session?.user) {
      toast.error("Authentication required", {
        description: "Please sign in to save documents."
      });
      return;
    }
    
    setSigningProgress(0);
    setSigningStage('Initializing signature process');
    setSigningDetails([]);
    setIsSignDialogOpen(true);
    
    // Short delay before starting processing to show the dialog animation
    setTimeout(() => {
      processDocument();
    }, 300);
  };

  // Handle dialog close attempt
  const handleDialogOpenChange = (open) => {
    // If trying to close while processing, prevent it
    if (!open && isProcessing) {
      return;
    }
    setIsSignDialogOpen(open);
  };

  // Process document
  const processDocument = async () => {
    setIsProcessing(true);
    
    try {
      console.log("Signing document with timestamp:", signatureTimestamp);
      
      // Use our signDocument function to handle everything in one step
      const result = await signDocument(
        file,
        fileHash,
        signature,
        publicKey,
        {
          analysisData: documentAnalysis,
          timestamp: signatureTimestamp  // Make sure this is passed
        }
      );
      
      // Check if document was already signed
      if (result.alreadySigned) {
        console.log("Document was already signed:", result.documentInfo);
        setAlreadySignedInfo(result.documentInfo);
        setSignedPdfUrl(result.documentInfo.signedPdfUrl);
        if (result.documentInfo.driveFileId) {
          setDriveFileId(result.documentInfo.driveFileId);
        }
        if (result.documentInfo.driveViewUrl) {
          setDriveViewUrl(result.documentInfo.driveViewUrl);
        }
        if (result.documentInfo.driveDownloadUrl) {
          setDriveDownloadUrl(result.documentInfo.driveDownloadUrl);
        }
        if (result.documentInfo.certificateId) {
          setCertificateId(result.documentInfo.certificateId);
        }
        
        toast.warning("Document already signed", {
          description: `This document was signed on ${new Date(result.documentInfo.signedAt).toLocaleString()}. Certificate ID: ${result.documentInfo.certificateId}`,
        });
        
        setSigningProgress(100);
        setSigningStage('Document previously signed');
        setSigningDetails(prev => [...prev, {
          stage: 'Document previously signed',
          detail: `This document was already signed on ${new Date(result.documentInfo.signedAt).toLocaleString()}`,
          timestamp: new Date().toISOString()
        }]);
        
        // Add a longer delay before closing dialog
        setTimeout(() => {
          setIsProcessing(false);
          
          setTimeout(() => {
            setIsSignDialogOpen(false);
            setActiveTab("download");
          }, 2000);
        }, 1500);
        
        return;
      }
      
      console.log("Document signed successfully:", result?.savedDoc?.id || "Unknown ID");
      
      // Add null checks before accessing properties
      if (result && result.savedDoc) {
        // Set state with the results
        setDocumentId(result.savedDoc.id || null);
        setSignedPdfUrl(result.pdfUrl || null);
        setDriveFileId(result.driveFileId || null);
        setDriveViewUrl(result.driveViewUrl || null);
        setDriveDownloadUrl(result.driveDownloadUrl || null);
        setCertificateId(result.certificateId || null);
        setUploadResult(result);
        
        // Record final signature step
        setSigningProgress(100);
        setSigningStage('Signature complete!');
        setSigningDetails(prev => [...prev, {
          stage: 'Signature complete',
          detail: `Document signed with certificate ID: ${result.certificateId || result.savedDoc.id || "Generated"}`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        console.error("Invalid response structure:", result);
        throw new Error("Server returned an invalid response");
      }
      
      // First stop processing to show success state
      setTimeout(() => {
        setIsProcessing(false);
        
        // Wait additional time before closing dialog and switching tab
        setTimeout(() => {
          setIsSignDialogOpen(false);
          setActiveTab("download");
          
          toast.success("Document signed successfully", {
            description: `Certificate ID: ${result.certificateId || result.savedDoc.id}`
          });
        }, 3000); // Increased time to show success state clearly
      }, 1000);
      
    } catch (error) {
      console.error("Error processing document:", error);
      toast.error("Error signing document", {
        description: error.message || "There was a problem signing your document. Please try again."
      });
      
      setSigningProgress(0);
      setSigningStage('Error occurred');
      setSigningDetails(prev => [...prev, {
        stage: 'Error occurred',
        detail: error.message || "There was a problem signing your document",
        timestamp: new Date().toISOString()
      }]);
      
      // Wait before allowing dialog to be closed
      setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
    }
  };

  // Get folder path for display
  const getDisplayableFolderPath = (documentInfo) => {
    if (documentInfo?.metadata?.folderPath) {
      return documentInfo.metadata.folderPath;
    } else if (documentInfo?.folderPath) {
      return documentInfo.folderPath;
    }
    return null;
  };

  // Get document metadata for display
  const getDocumentMetadata = () => {
    // From existing document or newly signed one
    const info = alreadySignedInfo || uploadResult;
    
    if (!info) return {};
    
    return {
      certificateId: info.certificateId || certificateId,
      fileName: file?.name || 'Document.pdf',
      fileSize: file?.size || info.metadata?.fileSize,
      mimeType: 'application/pdf',
      signedAt: info.signedAt || info.timestamp || info.createdAt || signatureTimestamp || new Date().toISOString(),
      signedBy: session?.user?.name || info.userName || info.metadata?.userName || 'Unknown User',
      userEmail: session?.user?.email || info.userEmail || info.metadata?.userEmail,
      documentType: info.documentType || documentCategory || info.metadata?.documentType || 'PDF Document',
      subject: documentSubject || info.metadata?.subject || null,
      folderPath: getDisplayableFolderPath(info) || '/NotarioDocuments/'
    };
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: "upload", label: "Upload", icon: <File className="h-4 w-4 mr-1" /> },
      { key: "sign", label: "Sign", icon: <Fingerprint className="h-4 w-4 mr-1" /> },
      { key: "download", label: "Download", icon: <FileCheck className="h-4 w-4 mr-1" /> }
    ];
    
    return (
      <div className="flex flex-wrap items-center justify-center mb-8 px-2 gap-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <motion.div 
              className={`flex items-center justify-center w-10 h-10 rounded-full border ${
                activeTab === step.key 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-secondary/40 text-muted-foreground border-border"
              } ${activeTab !== step.key && index < steps.findIndex(s => s.key === activeTab) ? "bg-primary/20 border-primary/30" : ""}`}
              animate={{
                backgroundColor: activeTab === step.key ? 'var(--primary)' : index < steps.findIndex(s => s.key === activeTab) ? 'rgba(var(--primary-rgb), 0.2)' : 'var(--secondary)',
                color: activeTab === step.key ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                borderColor: activeTab === step.key ? 'var(--primary)' : index < steps.findIndex(s => s.key === activeTab) ? 'rgba(var(--primary-rgb), 0.3)' : 'var(--border)',
                y: activeTab === step.key ? [0, -5, 0] : 0,
              }}
              transition={{ duration: 0.4 }}
            >
              {index + 1}
            </motion.div>
            <span className={`mx-2 text-sm ${activeTab === step.key ? "font-medium text-foreground" : "text-muted-foreground"} hidden sm:flex items-center`}>
              {step.icon}
              {step.label}
            </span>
            {/* Tampilkan hanya label pada mobile tanpa icon */}
            <span className={`mx-2 text-xs ${activeTab === step.key ? "font-medium text-foreground" : "text-muted-foreground"} sm:hidden`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <motion.div 
                className="w-6 sm:w-12 h-px mx-1"
                animate={{
                  backgroundColor: index < steps.findIndex(s => s.key === activeTab) 
                    ? 'rgba(var(--primary-rgb), 0.4)' 
                    : 'var(--border)'
                }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render document info
  const renderDocumentInfo = () => {
    if (!documentAnalysis || !documentAnalysis.analysis) return null;
    
    const analysis = documentAnalysis.analysis;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-4"
      >
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-md flex items-center">
                <FileSearch className="h-4 w-4 mr-2 text-primary" />
                Document Analysis
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
              >
                {showAnalysisDetails ? 'Show Less' : 'Show Details'}
              </Button>
            </div>
            <CardDescription>
              AI-detected document attributes
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium flex items-center">
                  <FileType className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Document Type
                </div>
                <div className="text-sm pl-5 flex items-center space-x-2">
                  <Badge variant="secondary" className="capitalize">
                    {analysis.documentType || "Unknown"}
                  </Badge>
                  {analysis.qrCodePosition && (
                    <Badge variant="outline" className="text-xs">
                      QR: {analysis.qrCodePosition}
                    </Badge>
                  )}
                </div>
              </div>

              {analysis.subject && (
                <div className="space-y-1">
                  <div className="text-sm font-medium flex items-center">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Subject
                  </div>
                  <div className="text-sm pl-5 text-muted-foreground">
                    {analysis.subject.length > 50 
                      ? analysis.subject.substring(0, 50) + "..." 
                      : analysis.subject}
                  </div>
                </div>
              )}
            </div>
            
            {showAnalysisDetails && (
              <motion.div 
                className="mt-4 space-y-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <Separator />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {analysis.parties && analysis.parties.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Related Parties
                      </div>
                      <div className="pl-5">
                        <ul className="text-sm space-y-1.5 list-disc list-inside">
                          {analysis.parties.slice(0, 3).map((party, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              <span className="font-medium">{party.nama || party.name}</span>
                              {(party.peran || party.role) && (
                                <span className="text-xs"> ({party.peran || party.role})</span>
                              )}
                            </li>
                          ))}
                          {analysis.parties.length > 3 && (
                            <li className="text-xs text-muted-foreground">+ {analysis.parties.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {documentKeywords.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center">
                        <SquareAsterisk className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Keywords
                      </div>
                      <div className="pl-5 flex flex-wrap gap-1.5">
                        {documentKeywords.map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {(analysis.issueDate || analysis.expireDate || analysis.documentNumber) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    {analysis.issueDate && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Issue Date</div>
                        <div className="text-sm">{analysis.issueDate}</div>
                      </div>
                    )}
                    
                    {analysis.expireDate && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Expiry Date</div>
                        <div className="text-sm">{analysis.expireDate}</div>
                      </div>
                    )}
                    
                    {analysis.documentNumber && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Document Number</div>
                        <div className="text-sm font-mono">{analysis.documentNumber}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-muted/40 p-3 rounded-md mt-3">
                  <div className="flex items-center mb-1.5">
                    <Brain className="h-4 w-4 mr-1.5 text-primary" />
                    <span className="text-xs font-medium">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.summary || "No summary available"}
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Animation for hover effects
  const buttonHoverClass = "transition-colors duration-300 hover:bg-primary/90";
  
  // Get document metadata for the download tab
  const documentMetadata = getDocumentMetadata();

  return (
    <motion.div 
      className="container max-w-4xl py-10 mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-card border-b border-border pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold">Document Signing</CardTitle>
              <CardDescription>Secure your document with a digital signature</CardDescription>
            </div>
            
            {session?.user && (
              <Badge variant="secondary" className="flex items-center">
                <Key className="h-3 w-3 mr-1" />
                <span className="text-xs">
                  Signed in as {session.user.name}
                  {session.user?.security?.algorithm && (
                    <span> ({session.user.security.algorithm})</span>
                  )}
                </span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {renderStepIndicator()}
          
          {/* Processing Stage Indicator */}
          {file && processingStage && !alreadySignedInfo && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  <span>Processing Stage</span>
                </div>
                <span className="text-xs font-medium">
                  {processingStage === 'upload' && 'Upload Complete'}
                  {processingStage === 'analyze' && 'Analyzing Document'}
                  {processingStage === 'hash' && 'Hash Generated'}
                  {processingStage === 'sign' && 'Ready to Sign'}
                </span>
              </div>
              <Progress 
                value={
                  processingStage === 'upload' ? 25 : 
                  processingStage === 'analyze' ? 50 : 
                  processingStage === 'hash' ? 75 : 
                  processingStage === 'sign' ? 100 : 25
                } 
                className="h-1.5"
              />
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsContent value="upload" className="space-y-6 mt-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <FileUploader 
                  onFileUploaded={handleFileUpload} 
                  initialFile={file} 
                  enableAnalysis={false} // Disable automatic analysis
                />
              </motion.div>
              
              {file && alreadySignedInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Alert className="bg-accent/20 border-accent text-accent-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Document Already Signed</AlertTitle>
                    <AlertDescription>
                      This document has already been signed on {new Date(alreadySignedInfo.signedAt).toLocaleString()}.
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setActiveTab("download")}
                          className="border-accent text-accent-foreground hover:bg-accent/10"
                        >
                          View Signed Document
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              {file && !alreadySignedInfo && (
                <>
                  {isAnalyzing ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="p-6 flex flex-col items-center justify-center"
                    >
                      <div className="flex items-center mb-4">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin text-primary" />
                        <span className="text-lg font-medium">Analyzing Document...</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                        Our AI is analyzing your document to extract important information
                        and determine the optimal signature placement.
                      </p>
                      <Progress value={65} className="w-64 h-2" />
                    </motion.div>
                  ) : (
                    <>
                      {/* Document Analysis Section - show if available */}
                      {documentAnalysis && renderDocumentInfo()}
                      
                      {/* Add manual analysis button if no analysis exists */}
                      {!documentAnalysis && !isAnalyzing && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="mb-6"
                        >
                          <Card className="border-border bg-secondary/10">
                            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-start sm:items-center">
                                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                                  <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-medium mb-1">AI Document Analysis</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Analyze your document to detect document type, content, and optimal signature placement
                                  </p>
                                </div>
                              </div>
                              <Button 
                                onClick={handleManualAnalysis}
                                disabled={isAnalyzing}
                                className="w-full sm:w-auto flex items-center gap-1.5"
                              >
                                <Brain className="h-4 w-4" />
                                Analyze Document
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                  
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: documentAnalysis ? 0.4 : 0.3 }}
                      >
                        <HashDisplay 
                          file={file} 
                          onHashGenerated={handleHashGenerated}
                        />
                      </motion.div>
                      
                      <motion.div 
                        className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full sm:w-auto">
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto flex items-center justify-center"
                                  as="a" 
                                  href="https://notar.io/docs/document-signing" 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Info className="h-4 w-4 mr-1.5" />
                                  <span className="hidden xs:inline">Learn about digital signatures</span>
                                  <span className="xs:hidden">Learn more</span>
                                  <ExternalLink className="h-3 w-3 ml-1.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Opens documentation in a new tab</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <Button 
                          onClick={goToNextTab} 
                          disabled={!fileHash}
                          className={`w-full sm:w-auto px-5 py-2 h-auto ${buttonHoverClass}`}
                        >
                          Next Step <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    </>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="sign" className="space-y-6 mt-2">
              {file && fileHash && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Alert className="mb-6 bg-secondary/70 border-secondary">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <AlertTitle className="flex items-center justify-between font-semibold">
                        <span>Document hash generated</span>
                        <button 
                          onClick={copyHashToClipboard}
                          className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
                          title="Copy hash to clipboard"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {hashCopied ? "Copied!" : "Copy"}
                        </button>
                      </AlertTitle>
                      <AlertDescription>
                        <p className="text-sm text-muted-foreground mb-2">
                          This unique hash serves as a digital fingerprint for your document. 
                          It will change if even a single byte of the document is modified.
                        </p>
                        <div className="relative mt-3">
                          <pre className="hash-code text-xs overflow-x-auto p-3 bg-card border border-border text-muted-foreground rounded-md whitespace-pre-wrap break-all leading-relaxed tracking-wide">
                            {fileHash}
                          </pre>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                  
                  {/* Document Summary for the Sign tab */}
                  {documentCategory && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="mb-6"
                    >
                      <div className="bg-muted/30 p-3 rounded-lg border border-border">
                        <div className="flex items-center mb-2">
                          <BarChart className="h-4 w-4 mr-2 text-primary" />
                          <h3 className="text-sm font-medium">Document Summary</h3>
                        </div>
                        <div className="flex flex-col space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Document Type:</span>
                            <span className="font-medium capitalize">{documentCategory}</span>
                          </div>
                          {documentAnalysis?.analysis?.subject && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subject:</span>
                              <span className="font-medium max-w-[70%] text-right truncate">
                                {documentAnalysis.analysis.subject}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Name:</span>
                            <span className="font-medium max-w-[70%] text-right truncate">{file.name}</span>
                          </div>
                          {documentAnalysis?.analysis?.parties && documentAnalysis.analysis.parties.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Related Parties:</span>
                              <span className="font-medium">{documentAnalysis.analysis.parties.length} identified</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <SignaturePanel 
                      fileHash={fileHash}
                      onSignatureGenerated={handleSignatureGenerated}
                      userPublicKey={session?.user?.publicKey}
                    />
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-8"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("upload")}
                      className="w-full sm:w-auto px-5 py-2 h-auto"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={openSignDialog} 
                      disabled={!signature}
                      className={`w-full sm:w-auto px-5 py-2 h-auto ${buttonHoverClass}`}
                    >
                      Sign Document <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="download" className="space-y-6 mt-2">
              {alreadySignedInfo || (documentId && signedPdfUrl) ? (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Alert 
                    className={alreadySignedInfo 
                      ? "bg-accent/10 border-accent text-accent-foreground" 
                      : "bg-primary/10 border-primary text-foreground"
                    }
                  >
                    {alreadySignedInfo 
                      ? <Info className="h-5 w-5" /> 
                      : <CheckCircle className="h-5 w-5 text-primary" />
                    }
                    <AlertTitle className="font-semibold">
                      {alreadySignedInfo 
                        ? "Document Previously Signed" 
                        : "Document Signed Successfully!"
                      }
                    </AlertTitle>
                    <AlertDescription>
                      {alreadySignedInfo 
                        ? (
                          <div>
                            <p className="mb-2">This document was previously signed and is ready for download.</p>
                            <p className="text-sm text-muted-foreground">Signed on: {new Date(alreadySignedInfo.signedAt).toLocaleString()}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="mb-2">Your document has been secured with a digital signature and is ready for download.</p>
                            <p className="text-sm text-muted-foreground">The signature is embedded into the document with a QR code for verification.</p>
                          </div>
                        )
                      }
                    </AlertDescription>
                  </Alert>
                  
                  <DownloadCard
                    signedPdfUrl={signedPdfUrl} 
                    fileName={file?.name || documentMetadata.fileName}
                    certificateId={certificateId || documentMetadata.certificateId}
                    driveFileId={driveFileId}
                    driveDownloadUrl={driveDownloadUrl}
                    driveViewUrl={driveViewUrl}
                    metadata={{
                      ...documentMetadata,
                      documentType: documentCategory || documentMetadata.documentType,
                      subject: documentSubject || documentMetadata.subject
                    }}
                  />
                  
                  <Card className="bg-secondary/20 border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-primary" />
                        <CardTitle className="text-base">Document Security Information</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Your document includes a digital signature that guarantees authenticity and tamper-proof protection. 
                        The QR code embedded in the document allows anyone to verify its authenticity without requiring special software.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                          <h4 className="font-medium mb-1 flex items-center">
                            <Fingerprint className="h-4 w-4 mr-1.5 text-primary" />
                            Digital Signature
                          </h4>
                          <p className="text-muted-foreground text-xs">
                            Uses cryptographic algorithms to verify the document has not been altered since signing.
                          </p>
                        </div>
                        
                        <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                          <h4 className="font-medium mb-1 flex items-center">
                            <Key className="h-4 w-4 mr-1.5 text-primary" />
                            Certificate ID
                          </h4>
                          <p className="text-muted-foreground text-xs">
                            Unique identifier that links to the secure registry record of this document&apos;s signature.
                          </p>
                        </div>
                        
                        <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                          <h4 className="font-medium mb-1 flex items-center">
                            <FileCheck className="h-4 w-4 mr-1.5 text-primary" />
                            Verification
                          </h4>
                          <p className="text-muted-foreground text-xs">
                            Anyone can verify this document by scanning the QR code or visiting our verification portal.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-start mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setActiveTab("upload");
                        // Reset all states for a fresh start
                        setFileHash(null);
                        setSignature(null);
                        setDocumentId(null);
                        setSignedPdfUrl(null);
                        setDriveFileId(null);
                        setDriveViewUrl(null);
                        setDriveDownloadUrl(null);
                        setCertificateId(null);
                        setAlreadySignedInfo(null);
                        setSigningDetails([]);
                        setSignatureTimestamp(null);
                        setDocumentAnalysis(null);
                        setDocumentCategory(null);
                        setDocumentSubject("");
                        setDocumentParties([]);
                        setDocumentKeywords([]);
                        setProcessingStage('upload');
                      }}
                      className="px-5 py-2 h-auto"
                    >
                      Sign New Document
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-secondary/30 rounded-full p-4 mb-4">
                    <FileSignature className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Signed Document</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    You haven&apos;t signed a document yet. Please upload a document and complete the signing process.
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    Upload Document
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground border-t border-border py-4 bg-card">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center">
              <Brain className="h-3 w-3 mr-1 text-primary/70" />
              <span>AI-powered document analysis</span>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Enhanced Non-dismissible Signing Dialog */}
      <Dialog 
        open={isSignDialogOpen} 
        onOpenChange={handleDialogOpenChange} 
        modal={true}
      >
        <DialogContent 
          className="sm:max-w-md" 
          onInteractOutside={(e) => {
            // Prevent closing by clicking outside when processing
            if (isProcessing) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key when processing
            if (isProcessing) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              <span>
                {isProcessing ? 'Signing Document' : 
                 signingProgress >= 100 ? 'Document Signed' : 'Signing Document'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isProcessing ? 
                "Please wait while we securely sign your document" : 
                signingProgress >= 100 ? 
                "Your document has been successfully signed" :
                "Preparing document for signing"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="relative mb-4">
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${signingProgress}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
              <div className="mt-4 flex flex-col items-center justify-center">
                {isProcessing && signingProgress < 100 ? (
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                      transition={{ 
                        rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity }
                      }}
                      className="mb-2"
                    >
                      <Loader2 className="h-8 w-8 text-primary" />
                    </motion.div>
                    <span className="text-sm font-medium text-center">
                      {signingStage || 'Preparing'}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({Math.round(signingProgress)}%)
                      </span>
                    </span>
                  </div>
                ) : signingProgress >= 100 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="bg-primary/10 p-3 rounded-full mb-2">
                      <CheckCircle className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-1">Signature Successful!</h3>
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Document has been securely signed with {session?.user?.security?.algorithm || "RSA"} encryption
                    </p>
                    {certificateId && (
                      <div className="bg-secondary/20 px-3 py-2 rounded-md text-xs flex items-center mt-1">
                        <Key className="h-3 w-3 mr-1.5 text-primary" />
                        Certificate ID: <span className="font-mono ml-1 text-primary">{certificateId}</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-sm text-center text-muted-foreground">
                    Preparing signature process...
                  </div>
                )}
              </div>
            </div>
            
            {/* Show document info in dialog */}
            {documentCategory && signingProgress < 100 && (
              <div className="bg-muted/30 p-3 rounded-md mb-3 text-xs flex justify-between items-center">
                <div className="flex items-center">
                  <FileType className="h-3 w-3 mr-1.5 text-primary" />
                  <span className="font-medium">Document Type:</span>
                  <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                    {documentCategory}
                  </Badge>
                </div>
                {documentAnalysis?.analysis?.qrCodePosition && (
                  <div className="flex items-center">
                    <span className="font-medium">QR Position:</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {documentAnalysis.analysis.qrCodePosition}
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            {/* Show detailed signing steps */}
            {signingDetails.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto bg-muted/20 rounded-md p-2 mt-2">
                <div className="text-xs space-y-2">
                  {signingDetails.map((detail, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-start space-x-2 p-1.5 rounded-sm bg-background/50"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <div className="mt-0.5">
                        {index === signingDetails.length - 1 && signingProgress >= 100 ? (
                          <CheckCircle className="h-3 w-3 text-primary" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{detail.stage}</p>
                        <p className="text-muted-foreground leading-tight">{detail.detail}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center">
              <ServerIcon className="h-3 w-3 mr-1" />
              <span>Cryptographic Processing</span>
            </div>
            <div className="flex items-center">
              <Brain className="h-3 w-3 mr-1 text-primary/70" />
              <span>AI Enhanced</span>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {signingProgress >= 100 && !isProcessing && (
              <Button
                onClick={() => {
                  // Close the dialog
                  setIsSignDialogOpen(false);
                  
                  // Open document URL in a new tab
                  const documentUrl = driveViewUrl || signedPdfUrl;
                  if (documentUrl) {
                    window.open(documentUrl, '_blank', 'noopener,noreferrer');
                  } else if (certificateId) {
                    // Fallback if direct URL not available but we have certificate ID
                    window.open(`/api/documents/view?certificateId=${certificateId}`, '_blank', 'noopener,noreferrer');
                  }
                  
                  // Switch to download tab 
                  setActiveTab("download");
                }}
                className="w-full sm:w-auto"
              >
                View Document
              </Button>
            )}
            
            {isProcessing && (
              <Button
                disabled
                className="w-full sm:w-auto opacity-50 cursor-not-allowed"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster richColors position="bottom-right" />
    </motion.div>
  );
}