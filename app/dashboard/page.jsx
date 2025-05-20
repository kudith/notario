"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import UserDocuments from "@/components/user-documents";
import { toast } from "sonner";
import { 
  FileLock, 
  KeyRound, 
  Shield, 
  Info, 
  Check, 
  Loader2, 
  RefreshCcw, 
  FileCheck, 
  User, 
  Building,
  Calendar,
  AlertTriangle,
  FileDigit,
  ChevronRight,
  Clock
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingAlgorithm, setChangingAlgorithm] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
  const [privateKeyStored, setPrivateKeyStored] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userHasPendingChanges, setUserHasPendingChanges] = useState(false);
  
  // Use refs to track states that shouldn't trigger re-renders
  const isChangingAlgorithm = useRef(false);
  const forcedSelectedAlgorithm = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserData(true, false);
    }
  }, [status]);

  // Check if private key exists in session storage and initialize algorithm
  useEffect(() => {
    if (userData?.id) {
      const hasPrivateKey = !!sessionStorage.getItem(`pk_${userData.id}`);
      setPrivateKeyStored(hasPrivateKey);
      
      // Get saved algorithm preference if we have one
      const savedAlgorithm = localStorage.getItem(`algorithm_${userData.id}`);
      
      // Only set algorithm from userData if we don't have pending changes
      // and we're not currently in the middle of changing the algorithm
      if (!userHasPendingChanges && !isChangingAlgorithm.current) {
        if (forcedSelectedAlgorithm.current) {
          console.log(`[useEffect] Using forced algorithm: ${forcedSelectedAlgorithm.current}`);
          setSelectedAlgorithm(forcedSelectedAlgorithm.current);
        }
        else if (savedAlgorithm && savedAlgorithm !== userData.algorithm) {
          console.log(`[useEffect] Using saved algorithm from localStorage: ${savedAlgorithm}`);
          setSelectedAlgorithm(savedAlgorithm);
        }
        else if (userData.algorithm) {
          console.log("[useEffect] Setting algorithm from userData:", userData.algorithm);
          setSelectedAlgorithm(userData.algorithm);
        }
      }
    }
  }, [userData, userHasPendingChanges]);

  // Clear forced algorithm after a short delay
  useEffect(() => {
    if (forcedSelectedAlgorithm.current) {
      const timeout = setTimeout(() => {
        forcedSelectedAlgorithm.current = null;
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, []);

  const fetchUserData = async (showLoading = true, updateAlgorithm = true) => {
    try {
      if (showLoading) setLoading(true);
      if (!showLoading) setRefreshing(true);
      
      // Add cache busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/user/me?includeDocuments=false&t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const data = await response.json();
      console.log("[fetchUserData] Received user data:", { 
        algorithm: data.security?.algorithm,
        userId: data.id,
        updateAlgorithm
      });
      
      setUserData(data);
      
      // Only update the selected algorithm if explicitly requested
      // and if we're not in the middle of an algorithm change
      if (updateAlgorithm && !userHasPendingChanges && !isChangingAlgorithm.current) {
        if (data?.security?.algorithm) {
          console.log(`[fetchUserData] Setting algorithm to: ${data.security.algorithm}`);
          setSelectedAlgorithm(data.security.algorithm);
        }
      } else {
        console.log("[fetchUserData] Not updating algorithm selection");
      }
      
      // Always update the last updated timestamp
      setLastUpdated(new Date().toLocaleString());
      
      if (!showLoading && data) {
        toast.success("Profile information updated");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load your data", {
        description: error.message || "Please try again later"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    
    try {
      return format(new Date(dateString), "PPP");
    } catch (error) {
      return "Unknown date";
    }
  };

  const handleRefresh = () => {
    // Clear any pending changes when manually refreshing
    setUserHasPendingChanges(false);
    fetchUserData(false, !isChangingAlgorithm.current);
  };

  // This function is called when the user changes algorithm selection
  const handleAlgorithmSelectionChange = (value) => {
    console.log(`[handleAlgorithmSelectionChange] User selected: ${value}`);
    setSelectedAlgorithm(value);
    
    // If this selection differs from the server value, mark as having pending changes
    if (value !== userData?.algorithm) {
      console.log("Setting pending changes flag: true");
      setUserHasPendingChanges(true);
    } else {
      setUserHasPendingChanges(false);
    }
  };
  
  const handleChangeAlgorithm = async () => {
    // Don't do anything if selection matches server or none selected
    if (!selectedAlgorithm || selectedAlgorithm === userData?.algorithm) {
      return;
    }

    try {
      setChangingAlgorithm(true);
      isChangingAlgorithm.current = true;
      
      console.log(`[handleChangeAlgorithm] Requesting algorithm change to: ${selectedAlgorithm}`);
      
      // Save the selected algorithm to local storage immediately
      if (userData?.id) {
        localStorage.setItem(`algorithm_${userData.id}`, selectedAlgorithm);
        localStorage.setItem(`algorithm_${userData.id}_timestamp`, Date.now().toString());
      }
      
      const response = await fetch("/api/user/change-algorithm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm: selectedAlgorithm,
        }),
      });

      const data = await response.json();
      console.log("[handleChangeAlgorithm] API Response:", data);

      // After API call completes, we no longer have pending changes
      setUserHasPendingChanges(false);

      // Special handling for "already using" message
      if (data.message && data.message.includes("already using the")) {
        // Extract algorithm from message like "You are already using the ECDSA algorithm"
        const algorithmMatch = data.message.match(/already using the (\w+) algorithm/i);
        const currentAlgorithm = algorithmMatch ? algorithmMatch[1] : 
                               data.algorithm || data.user?.algorithm || userData?.algorithm;
        
        console.log(`[handleChangeAlgorithm] Already using ${currentAlgorithm} algorithm, updating UI`);
        
        // Force the selected algorithm for the next render cycle
        forcedSelectedAlgorithm.current = currentAlgorithm;
        
        // Update UI to match what the server says
        setUserData(prev => ({
          ...prev,
          algorithm: currentAlgorithm
        }));
        
        // Ensure selectedAlgorithm state is also updated
        setSelectedAlgorithm(currentAlgorithm);
        
        // Update localStorage to match server
        if (userData?.id) {
          localStorage.setItem(`algorithm_${userData.id}`, currentAlgorithm);
        }
        
        toast.info("Algorithm Selection", {
          description: `You are already using ${currentAlgorithm} algorithm.`
        });
        
        setTimeout(() => {
          isChangingAlgorithm.current = false;
        }, 500);
        
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to change algorithm");
      }

      // Get the user ID from either data.user.id or userData.id as fallback
      const userId = (data.user?.id || userData?.id || session?.user?.id);
      
      if (!userId) {
        throw new Error("Could not determine user ID for key storage");
      }
      
      // Store private key securely in session storage if provided
      if (data.privateKey) {
        sessionStorage.setItem(`pk_${userId}`, data.privateKey);
        setPrivateKeyStored(true);
      }
      
      // Make sure we use the algorithm value from the server response - multiple fallbacks
      const updatedAlgorithm = data.algorithm || data.user?.algorithm || selectedAlgorithm;
      console.log(`[handleChangeAlgorithm] Algorithm updated to: ${updatedAlgorithm}`);
      
      // Force the selected algorithm for the next render cycle
      forcedSelectedAlgorithm.current = updatedAlgorithm;
      
      // Update user data with new algorithm info
      setUserData(prev => ({
        ...prev,
        algorithm: updatedAlgorithm
      }));
      
      // Make sure the selected algorithm in the UI matches what was saved
      setSelectedAlgorithm(updatedAlgorithm);
      
      // Update localStorage to match the new algorithm
      localStorage.setItem(`algorithm_${userId}`, updatedAlgorithm);
      localStorage.setItem(`algorithm_${userId}_timestamp`, data.timestamp || Date.now().toString());
      
      toast.success("Signature algorithm changed successfully", {
        description: `Your signature algorithm is now ${updatedAlgorithm}`
      });
      
      // Refresh user data after a delay, but don't update algorithm
      setTimeout(() => {
        fetchUserData(false, false);
        
        // Reset the changing algorithm flag after everything is done
        setTimeout(() => {
          isChangingAlgorithm.current = false;
        }, 1000);
      }, 1000); 
      
    } catch (error) {
      console.error("Error changing algorithm:", error);
      toast.error("Failed to change signature algorithm", {
        description: error.message
      });
      
      // Reset user preferences on error
      setUserHasPendingChanges(false);
      
      // Revert UI to match current user data if there was an error
      if (userData?.algorithm) {
        setSelectedAlgorithm(userData.algorithm);
        // Save the correct algorithm back to localStorage
        if (userData.id) {
          localStorage.setItem(`algorithm_${userData.id}`, userData.algorithm);
        }
      }
      
      // Refresh user data to ensure UI is in sync with server
      setTimeout(() => {
        isChangingAlgorithm.current = false;
        fetchUserData(false, true);
      }, 1000);
    } finally {
      setChangingAlgorithm(false);
      // Note: isChangingAlgorithm.current is reset after a delay in the success/error handlers
    }
  };

  const getKeyStrength = (algorithm) => {
    return algorithm === "RSA" ? "2048-bit" : "P-256 curve";
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
        <div className="animate-pulse flex items-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
        <Progress value={40} className="w-[60%] max-w-md" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="flex items-center mt-2 sm:mt-0 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          <span>Last updated: {lastUpdated || "Just now"}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2 h-8" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue="documents" 
        className="space-y-6"
        onValueChange={(value) => {
          // Reset pending changes when switching tabs
          if (value !== "security" && userHasPendingChanges) {
            console.log("Tab changed with pending changes, resetting to server value");
            setSelectedAlgorithm(userData?.algorithm || "RSA");
            setUserHasPendingChanges(false);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center">
            <FileCheck className="mr-2 h-4 w-4" />
            <span>My Documents</span>
            {userData?.statistics?.totalDocuments > 0 && (
              <Badge variant="secondary" className="ml-2">
                {userData.statistics.totalDocuments}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <UserDocuments />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <KeyRound className="mr-2 h-5 w-5 text-primary" />
                    Digital Signature Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your signature encryption algorithm and keys
                  </CardDescription>
                </div>
                <Badge variant={privateKeyStored ? "outline" : "secondary"} className="ml-2">
                  {privateKeyStored ? "Key Available" : "No Key in Session"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium leading-none">Current Algorithm</h3>
                    <Badge variant="secondary" className="font-mono">
                      {userData?.algorithm || "Unknown"}
                    </Badge>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm">
                        <FileLock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {userData?.algorithm === "RSA" 
                            ? "Using RSA 2048-bit asymmetric encryption" 
                            : userData?.algorithm === "ECDSA" 
                              ? "Using ECDSA P-256 curve encryption" 
                              : "Algorithm information not available"}
                        </span>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {userData?.security?.keySecurity || (userData?.algorithm === "RSA" ? "Standard" : "Enhanced")}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>About Digital Signature Algorithms</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Your documents are signed using cryptographic algorithms to ensure their authenticity and integrity.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="font-bold">RSA (2048-bit)</span>: Industry standard, widely compatible</li>
                      <li><span className="font-bold">ECDSA (P-256)</span>: Faster, with smaller keys and signatures</li>
                    </ul>
                    <p className="mt-2 text-xs">Changing your algorithm will not affect previously signed documents.</p>
                  </AlertDescription>
                </Alert>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Change Signature Algorithm</h3>
                  <RadioGroup 
                    value={selectedAlgorithm || userData?.algorithm || "RSA"}
                    onValueChange={handleAlgorithmSelectionChange} // Use our custom handler
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent/10 transition-colors">
                      <RadioGroupItem value="RSA" id="rsa" />
                      <Label htmlFor="rsa" className="flex flex-col cursor-pointer">
                        <span className="font-medium">RSA Signature</span>
                        <span className="text-sm text-muted-foreground">
                          Standard {getKeyStrength("RSA")} encryption, good for compatibility
                        </span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent/10 transition-colors">
                      <RadioGroupItem value="ECDSA" id="ecdsa" />
                      <Label htmlFor="ecdsa" className="flex flex-col cursor-pointer">
                        <span className="font-medium">ECDSA Signature</span>
                        <span className="text-sm text-muted-foreground">
                          Elliptic Curve {getKeyStrength("ECDSA")} encryption, faster with smaller signatures
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Show notification when user has pending changes */}
                  {userHasPendingChanges && (
                    <div className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center">
                      <Info className="h-4 w-4 mr-1" />
                      <span>Click "Apply Changes" to save your algorithm selection</span>
                    </div>
                  )}
                  
                  {isChangingAlgorithm.current && (
                    <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center">
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      <span>Updating algorithm settings...</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Key fingerprint: {userData?.security?.keyFingerprint || "Unknown"}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>This is a unique identifier for your current public key</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button 
                onClick={handleChangeAlgorithm} 
                disabled={changingAlgorithm || selectedAlgorithm === userData?.algorithm}
                className="flex items-center"
                variant={userHasPendingChanges ? "default" : "outline"} // Highlight button when changes are pending
              >
                {changingAlgorithm ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                {changingAlgorithm ? "Changing..." : "Apply Changes"}
              </Button>
            </CardFooter>
          </Card>
          
          {!privateKeyStored && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Private Key Not Available</AlertTitle>
              <AlertDescription>
                <p className="mb-2">Your private signing key is not available in this browser session.</p>
                <p className="mb-2">You'll need to generate a new key pair before signing documents. This happens automatically when you try to sign a document.</p>
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Document Security Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-secondary/20 p-3 rounded-md flex flex-col">
                  <span className="text-muted-foreground text-xs">Total Documents</span>
                  <span className="font-semibold text-lg flex items-center">
                    <FileDigit className="h-4 w-4 mr-1 text-primary" />
                    {userData?.statistics?.totalDocuments || 0}
                  </span>
                </div>
                
                <div className="bg-secondary/20 p-3 rounded-md flex flex-col">
                  <span className="text-muted-foreground text-xs">Last Activity</span>
                  <span className="font-medium">
                    {userData?.statistics?.recentActivity 
                      ? format(new Date(userData.statistics.recentActivity), "MMM d, yyyy") 
                      : "No activity"}
                  </span>
                </div>
                
                <div className="bg-secondary/20 p-3 rounded-md flex flex-col">
                  <span className="text-muted-foreground text-xs">Security Level</span>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1 text-primary" />
                    <span className="font-medium">
                      {userData?.security?.keySecurity || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          {/* Profile content unchanged */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center">
                  {userData?.avatarUrl && (
                    <div className="mr-4 h-20 w-20 rounded-full overflow-hidden border-2 border-border">
                      <img 
                        src={userData.avatarUrl}
                        alt={userData.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div>
                    <h2 className="text-xl font-semibold">{userData?.name || session?.user?.name}</h2>
                    <p className="text-muted-foreground text-sm">{userData?.email || session?.user?.email}</p>
                    <div className="flex items-center mt-1">
                      <Badge variant={userData?.verified ? "default" : "secondary"}>
                        {userData?.verified ? 'Verified Account' : 'Unverified Account'}
                      </Badge>
                      
                      {userData?.role && userData.role !== "user" && (
                        <Badge variant="outline" className="ml-2">
                          {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profile fields unchanged */}
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="text-sm font-medium leading-none">Name</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {userData?.name || session?.user?.name}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="text-sm font-medium leading-none">Verification Status</h3>
                    </div>
                    <p className="text-sm pl-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${userData?.verified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {userData?.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="text-sm font-medium leading-none">Email</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {userData?.email || session?.user?.email}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <h3 className="text-sm font-medium leading-none">Account Created</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {userData?.account?.createdAt ? formatDate(userData.account.createdAt) : 'Unknown'}
                    </p>
                  </div>
                  
                  {userData?.institution && (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <h3 className="text-sm font-medium leading-none">Institution</h3>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {userData.institution}
                      </p>
                    </div>
                  )}
                  
                  {userData?.algorithm && (
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        <h3 className="text-sm font-medium leading-none">Digital Signature</h3>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6 flex items-center">
                        {userData.algorithm} Algorithm
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 ml-2" 
                          onClick={() => document.querySelector('[value="security"]').click()}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}