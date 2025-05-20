import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

// Helper function to extract PDF metadata - reused from sign endpoint
async function extractPdfMetadata(buffer) {
  try {
    const PDFDocument = (await import('pdf-lib')).PDFDocument;
    const pdfDoc = await PDFDocument.load(buffer);

    // Get standard PDF metadata
    const title = pdfDoc.getTitle() || "";
    const author = pdfDoc.getAuthor() || "";
    const subject = pdfDoc.getSubject() || "";
    const keywords = pdfDoc.getKeywords() || "";
    const creator = pdfDoc.getCreator() || "";
    const producer = pdfDoc.getProducer() || "";
    const creationDate = pdfDoc.getCreationDate();
    const modificationDate = pdfDoc.getModificationDate();

    // Get page count
    const pageCount = pdfDoc.getPageCount();

    return {
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      creationDate: creationDate ? creationDate.toString() : null,
      modificationDate: modificationDate ? modificationDate.toString() : null,
      pageCount,
    };
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    return {};
  }
}

// Extract meaningful information from PDF title
function extractInfoFromTitle(title) {
  if (!title) return {};
  
  // Try to identify document type
  let documentType = "unknown";
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("surat") || lowerTitle.includes("letter")) {
    documentType = "surat";
  } else if (lowerTitle.includes("kontrak") || lowerTitle.includes("contract")) {
    documentType = "kontrak";
  } else if (lowerTitle.includes("laporan") || lowerTitle.includes("report")) {
    documentType = "laporan";
  } else if (lowerTitle.includes("faktur") || lowerTitle.includes("invoice")) {
    documentType = "faktur";
  } else if (lowerTitle.includes("formulir") || lowerTitle.includes("form")) {
    documentType = "formulir";
  } else if (lowerTitle.includes("sertifikat") || lowerTitle.includes("certificate")) {
    documentType = "sertifikat";
  } else if (lowerTitle.includes("ktp") || lowerTitle.includes("identitas")) {
    documentType = "kartu identitas";
  } else if (lowerTitle.includes("ijazah")) {
    documentType = "ijazah";
  } else if (lowerTitle.includes("keterangan")) {
    documentType = "surat keterangan";
  }
  
  // Try to identify names or parties
  const nameParts = title.split(/[-_\s]/);  // Split by common separators
  const possibleNames = nameParts.filter(p => 
    p.length > 3 && 
    !/\d{4}/.test(p) &&   // Exclude parts that look like years
    !/^\d+$/.test(p)      // Exclude numeric-only parts
  );
  
  // Try to extract document number
  const numberMatch = title.match(/(?:no|nomor|number)[^\w\d]*([a-z0-9\-\.\/]+)/i) || 
                     title.match(/([A-Z0-9\-\.\/]+\/[A-Z0-9\-\.\/]+)/);
  const documentNumber = numberMatch ? numberMatch[1] : null;
  
  return {
    documentType,
    possibleNames,
    documentNumber,
    subject: title
  };
}

// Determine document type from filename as fallback
function determineDocumentTypeFromName(fileName, pdfMetadata = {}) {
  // First try to get document type from PDF title if available
  if (pdfMetadata.title) {
    const titleInfo = extractInfoFromTitle(pdfMetadata.title);
    if (titleInfo.documentType !== "unknown") {
      return titleInfo.documentType;
    }
  }

  // Otherwise determine from filename
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes("surat") || lowerName.includes("letter")) {
    if (lowerName.includes("keterangan") || lowerName.includes("pernyataan")) {
      return "surat keterangan";
    }
    return "surat";
  } else if (lowerName.includes("kontrak") || lowerName.includes("contract") || lowerName.includes("perjanjian")) {
    return "kontrak";
  } else if (lowerName.includes("laporan") || lowerName.includes("report")) {
    return "laporan";
  } else if (lowerName.includes("faktur") || lowerName.includes("invoice") || lowerName.includes("tagihan")) {
    return "faktur";
  } else if (lowerName.includes("formulir") || lowerName.includes("form")) {
    return "formulir";
  } else if (lowerName.includes("sertifikat") || lowerName.includes("certificate")) {
    return "sertifikat";
  } else if (lowerName.includes("ktp") || lowerName.includes("identitas")) {
    return "kartu identitas";
  } else if (lowerName.includes("ijazah") || lowerName.includes("diploma")) {
    return "ijazah";
  } else if (lowerName.includes("keterangan") || lowerName.includes("pernyataan")) {
    return "surat keterangan";
  }
  return "dokumen";
}

// Clean markdown artifacts from response
function cleanJsonResponse(response) {
  // Remove markdown code block markers, backticks, and any formatting
  return response.replace(/```(json)?|```|`/g, '').trim();
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    return dateString;
  }
}

// Function to analyze document with AI using Google's Gemini API
async function analyzeDocumentWithAI(fileBuffer, fileName, pdfMetadata = {}) {
  try {
    // Check file size to determine approach
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
    
    // Extract useful information from PDF metadata
    const pdfTitle = pdfMetadata.title || "";
    const pdfAuthor = pdfMetadata.author || "";
    const pdfSubject = pdfMetadata.subject || "";
    const pdfKeywords = pdfMetadata.keywords || "";
    const titleInfo = extractInfoFromTitle(pdfTitle);
    
    // Set fallback values based on PDF metadata first, then filename
    const fallbackDocumentType = titleInfo.documentType !== "unknown" 
      ? titleInfo.documentType 
      : determineDocumentTypeFromName(fileName);
      
    const fallbackSubject = pdfTitle || pdfSubject || fileName.replace(/\.[^/.]+$/, "");
    
    // Try to extract possible parties from PDF metadata
    const possibleParties = [];
    if (pdfAuthor && pdfAuthor.length > 1) {
      possibleParties.push({
        name: pdfAuthor,
        role: "Penulis/Pengarang"
      });
    }
    
    if (titleInfo.possibleNames && titleInfo.possibleNames.length > 0) {
      titleInfo.possibleNames.forEach(name => {
        if (name !== pdfAuthor) {
          possibleParties.push({
            name: name,
            role: "Terkait"
          });
        }
      });
    }

    // Skip AI analysis if API key is not configured
    if (!process.env.GEMINI_API_KEY) {
      console.log("Gemini API key not configured, using fallback analysis");
      return {
        documentType: fallbackDocumentType,
        qrCodePosition: "bottom-right",
        importantMetadata: [],
        parties: possibleParties,
        subject: fallbackSubject,
        issueDate: null,
        expireDate: null,
        documentNumber: titleInfo.documentNumber,
        summary: `${fallbackDocumentType.charAt(0).toUpperCase() + fallbackDocumentType.slice(1)}: ${fallbackSubject}`,
        keywords: pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : []
      };
    }

    // Initialize the Google Gemini AI client according to documentation
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
      console.log(`Analyzing document: ${fileName} with Gemini AI`);
      console.log(`PDF metadata: Title="${pdfTitle}", Subject="${pdfSubject}", Author="${pdfAuthor}"`);
      
      // Enhanced prompt including PDF metadata for better context
      const enhancedPrompt = `Analisis dokumen ini secara menyeluruh dan kembalikan objek JSON dengan informasi berikut:
1. documentType: Jenis dokumen (kontrak, surat, faktur, laporan, formulir, dll.)
2. qrCodePosition: Posisi terbaik untuk tanda tangan kode QR (top-right, bottom-right, bottom-left, atau bottom-center)
3. importantMetadata: Array minimal 5 informasi penting dari dokumen
4. subject: Perihal atau topik utama dokumen
5. parties: Array pihak-pihak yang terlibat dalam dokumen (nama dan peran/jabatan)
6. issueDate: Tanggal penerbitan dokumen dalam format YYYY-MM-DD (null jika tidak ditemukan)
7. expireDate: Tanggal kedaluwarsa dokumen dalam format YYYY-MM-DD (null jika tidak ditemukan atau tidak berlaku)
8. documentNumber: Nomor referensi dokumen (null jika tidak ada)
9. summary: Ringkasan isi dokumen (3-5 kalimat)
10. keywords: Array kata kunci penting dalam dokumen (maksimal 10)

Informasi tambahan dari metadata PDF:
- Judul PDF: "${pdfTitle || 'Tidak ada'}"
- Subjek PDF: "${pdfSubject || 'Tidak ada'}"
- Penulis PDF: "${pdfAuthor || 'Tidak ada'}"
- Kata kunci PDF: "${pdfKeywords || 'Tidak ada'}"
- Nama file: "${fileName || 'Tidak ada'}"

PENTING: Kembalikan HANYA objek JSON mentah tanpa kode markdown, tanpa backtick (\`\`\`), dan tanpa penjelasan tambahan apapun.`;
      
      // For files below 10MB, use inline data method to avoid potential issues with larger files
      if (fileSizeMB < 10) {
        // Convert buffer to base64
        const base64File = Buffer.from(fileBuffer).toString("base64");
        
        // Create contents array exactly as shown in the documentation
        const contents = [
          { text: enhancedPrompt },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64File
            }
          }
        ];
        
        // Generate content using the exact format from the documentation
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",  // Using a model that supports PDFs
          contents: contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1500,
            responseFormat: "JSON"
          }
        });
        
        // Check and extract the response
        if (!response || !response.text) {
          console.error("Invalid response structure from Gemini");
          throw new Error("Invalid response from Gemini API");
        }
        
        // Extract the response text and clean any markdown artifacts
        const rawResponse = response.text;
        console.log("AI analysis received:", rawResponse);
        
        // Clean up the response by removing any markdown code block markers
        const cleanedResponse = cleanJsonResponse(rawResponse);
        
        try {
          const analysisResult = JSON.parse(cleanedResponse);
          
          // Validate and enhance all required fields
          if (!analysisResult.documentType) 
            analysisResult.documentType = fallbackDocumentType;
          if (!analysisResult.qrCodePosition)
            analysisResult.qrCodePosition = "bottom-right";
          if (!Array.isArray(analysisResult.importantMetadata))
            analysisResult.importantMetadata = [];
          if (!analysisResult.subject)
            analysisResult.subject = fallbackSubject;
          if (!Array.isArray(analysisResult.parties)) {
            analysisResult.parties = possibleParties;
          } else if (analysisResult.parties.length === 0 && possibleParties.length > 0) {
            analysisResult.parties = possibleParties;
          }
          if (!analysisResult.issueDate)
            analysisResult.issueDate = null;
          if (!analysisResult.expireDate)
            analysisResult.expireDate = null;
          if (!analysisResult.documentNumber)
            analysisResult.documentNumber = titleInfo.documentNumber;
          if (!analysisResult.summary)
            analysisResult.summary = `${fallbackDocumentType.charAt(0).toUpperCase() + fallbackDocumentType.slice(1)}: ${fallbackSubject}`;
          if (!Array.isArray(analysisResult.keywords))
            analysisResult.keywords = pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : [];
          
          // Format dates consistently
          if (analysisResult.issueDate) 
            analysisResult.issueDate = formatDate(analysisResult.issueDate);
          if (analysisResult.expireDate) 
            analysisResult.expireDate = formatDate(analysisResult.expireDate);
            
          return analysisResult;
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          console.log("Raw AI response content:", rawResponse);
          console.log("Cleaned AI response:", cleanedResponse);
          
          // Try to extract JSON from the response if possible
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extractedJson = JSON.parse(jsonMatch[0]);
              console.log("Extracted JSON from response");
              
              // Validate fields
              if (!extractedJson.documentType) 
                extractedJson.documentType = fallbackDocumentType;
              if (!extractedJson.qrCodePosition)
                extractedJson.qrCodePosition = "bottom-right";
              if (!Array.isArray(extractedJson.importantMetadata))
                extractedJson.importantMetadata = [];
              if (!extractedJson.subject)
                extractedJson.subject = fallbackSubject;
              if (!Array.isArray(extractedJson.parties)) {
                extractedJson.parties = possibleParties;
              } else if (extractedJson.parties.length === 0 && possibleParties.length > 0) {
                extractedJson.parties = possibleParties;
              }
              if (!extractedJson.issueDate)
                extractedJson.issueDate = null;
              if (!extractedJson.expireDate)
                extractedJson.expireDate = null;
              if (!extractedJson.documentNumber)
                extractedJson.documentNumber = titleInfo.documentNumber;
              if (!extractedJson.summary)
                extractedJson.summary = `${fallbackDocumentType.charAt(0).toUpperCase() + fallbackDocumentType.slice(1)}: ${fallbackSubject}`;
              if (!Array.isArray(extractedJson.keywords))
                extractedJson.keywords = pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : [];
              
              // Format dates consistently
              if (extractedJson.issueDate) 
                extractedJson.issueDate = formatDate(extractedJson.issueDate);
              if (extractedJson.expireDate) 
                extractedJson.expireDate = formatDate(extractedJson.expireDate);
                
              return extractedJson;
            } catch (e) {
              console.error("Failed to extract valid JSON:", e);
            }
          }
          
          // Return fallback if JSON extraction fails
          return {
            documentType: fallbackDocumentType,
            qrCodePosition: "bottom-right",
            importantMetadata: [],
            parties: possibleParties,
            subject: fallbackSubject,
            issueDate: null,
            expireDate: null,
            documentNumber: titleInfo.documentNumber,
            summary: `${fallbackDocumentType.charAt(0).toUpperCase() + fallbackDocumentType.slice(1)}: ${fallbackSubject}`,
            keywords: pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : []
          };
        }
      } 
      // For larger files (>10MB), use metadata-based approach
      else {
        console.log(`File is larger than 10MB (${fileSizeMB.toFixed(2)}MB), using metadata-based approach without AI`);
        
        return {
          documentType: fallbackDocumentType,
          qrCodePosition: "bottom-right",
          importantMetadata: [],
          parties: possibleParties,
          subject: fallbackSubject,
          issueDate: null,
          expireDate: null,
          documentNumber: titleInfo.documentNumber,
          summary: `Dokumen besar (${fileSizeMB.toFixed(2)}MB): ${fallbackSubject}`,
          keywords: pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : []
        };
      }
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);
      
      // Fallback to document type from metadata/filename
      return {
        documentType: fallbackDocumentType,
        qrCodePosition: "bottom-right",
        importantMetadata: [],
        parties: possibleParties,
        subject: fallbackSubject,
        issueDate: null,
        expireDate: null,
        documentNumber: titleInfo.documentNumber,
        summary: `${fallbackDocumentType.charAt(0).toUpperCase() + fallbackDocumentType.slice(1)}: ${fallbackSubject}`,
        keywords: pdfKeywords ? pdfKeywords.split(',').map(k => k.trim()) : []
      };
    }
  } catch (error) {
    console.error("Error in analyzeDocumentWithAI:", error);
    // Default fallbacks
    return {
      documentType: "dokumen",
      qrCodePosition: "bottom-right",
      importantMetadata: [],
      parties: [],
      subject: fileName.replace(/\.[^/.]+$/, ""),
      issueDate: null,
      expireDate: null,
      documentNumber: null,
      summary: `Dokumen: ${fileName.replace(/\.[^/.]+$/, "")}`,
      keywords: []
    };
  }
}

// Calculate file hash
async function calculateFileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be signed in to analyze documents" },
        { status: 401 }
      );
    }

    // Get form data with file
    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Calculate hash
    const fileHash = await calculateFileHash(fileBuffer);
    
    // Extract PDF metadata
    const pdfMetadata = await extractPdfMetadata(fileBuffer);
    console.log("PDF metadata extracted:", pdfMetadata.title);
    
    // Process with AI
    console.log("Starting AI analysis for document:", file.name);
    const documentAnalysis = await analyzeDocumentWithAI(fileBuffer, file.name, pdfMetadata);
    console.log("AI analysis complete:", documentAnalysis.documentType);

    // Return both the analysis and file hash
    return NextResponse.json({
      success: true,
      fileHash,
      analysis: documentAnalysis,
      pdfMetadata,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error analyzing document:", error);
    return NextResponse.json(
      { error: "Failed to analyze document", details: error.message },
      { status: 500 }
    );
  }
}