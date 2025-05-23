import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { PDFDocument, rgb } from 'pdf-lib';
import { uploadPdfToDrive } from '@/lib/google-drive';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be signed in to process documents' }, 
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // Ensure required fields are present
    if (!data.documentId || !data.pdfUrl || !data.qrCodeDataUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the document belongs to the user
    const document = await prisma.document.findUnique({
      where: { id: data.documentId }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only modify your own documents' },
        { status: 403 }
      );
    }
    
    console.log("Fetching PDF from URL:", data.pdfUrl);
    
    // Fetch the PDF from the URL
    const pdfResponse = await fetch(data.pdfUrl);
    if (!pdfResponse.ok) {
      console.error("Failed to fetch PDF:", pdfResponse.status, pdfResponse.statusText);
      return NextResponse.json(
        { error: `Failed to fetch the PDF: ${pdfResponse.status} ${pdfResponse.statusText}` },
        { status: 500 }
      );
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log("PDF buffer size:", pdfBuffer.byteLength, "bytes");
    
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      console.error("Received empty PDF buffer");
      return NextResponse.json(
        { error: 'Received empty PDF buffer' },
        { status: 500 }
      );
    }
    
    // Load the PDF
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer);
      console.log("PDF loaded successfully");
    } catch (pdfError) {
      console.error("PDF loading error:", pdfError);
      return NextResponse.json(
        { error: `Failed to parse PDF: ${pdfError.message}` },
        { status: 500 }
      );
    }
    
    // Get the pages
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      console.error("PDF has no pages");
      return NextResponse.json(
        { error: 'PDF has no pages' },
        { status: 400 }
      );
    }
    
    // Use the last page for the QR code
    const lastPage = pages[pages.length - 1];
    console.log(`Got last page (page ${pages.length}) of PDF for QR code placement`);
    
    try {
      // Format the current date and time
      const formattedDate = new Date().toLocaleString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Create direct verification URL using file hash (not certificate ID)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verifyUrl = `${baseUrl}/verify/${document.certificateId}`;
      
      // Replace JSON metadata with direct URL for the QR code
      // This ensures that when scanned, it opens the verify page directly
      const qrCodeBase64 = data.qrCodeDataUrl.split(',')[1];
      const qrBuffer = Buffer.from(qrCodeBase64, 'base64');
      
      // Or generate a new QR code with the direct URL (if you want to replace existing QR code):
      // const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      //   errorCorrectionLevel: 'M',
      //   scale: 4,
      //   margin: 2
      // });
      
      // Embed the QR code image
      const qrCodeImage = await pdfDoc.embedPng(qrBuffer);
      
      // Calculate dimensions
      const { width, height } = lastPage.getSize();
      const qrCodeDim = 100;  // Slightly larger QR code since it contains more data
      
      // Create a semi-transparent box as background for the QR code
      lastPage.drawRectangle({
        x: width - qrCodeDim - 60,
        y: 30,
        width: qrCodeDim + 40,
        height: qrCodeDim + 40,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
        opacity: 0.9,
      });
      
      // Draw the QR code at the bottom of the last page
      lastPage.drawImage(qrCodeImage, {
        x: width - qrCodeDim - 50,
        y: 40,
        width: qrCodeDim,
        height: qrCodeDim,
      });
      
      // Add minimal label above QR code
      lastPage.drawText("Digitally Signed", {
        x: width - qrCodeDim - 30,
        y: qrCodeDim + 60,
        size: 10,
        color: rgb(0.1, 0.1, 0.3),
        font: await pdfDoc.embedFont('Helvetica-Bold'),
      });
      
      // Add small verification instruction below QR code
      lastPage.drawText(`Scan to verify`, {
        x: width - qrCodeDim - 20,
        y: 25,
        size: 8,
        color: rgb(0.3, 0.3, 0.5),
      });
      
      console.log("Added QR code to last page of PDF");
      
      // Save the PDF
      const modifiedPdfBytes = await pdfDoc.save();
      console.log("PDF saved, size:", modifiedPdfBytes.byteLength, "bytes");
      
      // Upload the modified PDF to Google Drive
      console.log("Uploading modified PDF to Google Drive");
      console.log("User email for sharing:", session.user.email);
      
      const fileName = `signed-${document.certificateId}.pdf`;
      
      let uploadResult;
      try {
        uploadResult = await uploadPdfToDrive(
          Buffer.from(modifiedPdfBytes),
          fileName,
          {
            // Add metadata for better organization
            certificateId: document.certificateId,
            userId: session.user.id,
            userEmail: session.user.email,
            documentHash: document.fileHash,
            signedAt: new Date().toISOString()
          },
          session.user.email // Pass the user's email for direct sharing
        );
        console.log("Modified PDF uploaded to Google Drive:", uploadResult.viewUrl);
      } catch (driveError) {
        console.error("Google Drive upload error:", driveError);
        return NextResponse.json(
          { error: `Error uploading to Google Drive: ${driveError.message}` },
          { status: 500 }
        );
      }
      
      // Update the document in the database with the Google Drive information
      await prisma.document.update({
        where: { id: data.documentId },
        data: {
          driveFileId: uploadResult.fileId,
          driveViewUrl: uploadResult.viewUrl,
          driveDownloadUrl: uploadResult.downloadUrl
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log("Document updated in database with Google Drive information");
      
      return NextResponse.json({
        success: true,
        viewUrl: uploadResult.viewUrl,
        downloadUrl: uploadResult.downloadUrl,
        fileId: uploadResult.fileId
      }, { status: 200 });
    } catch (error) {
      console.error("Error processing PDF:", error);
      return NextResponse.json(
        { error: `Error processing PDF: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error adding QR code to PDF:", error);
    return NextResponse.json(
      { error: 'Failed to add QR code to PDF', details: error.message },
      { status: 500 }
    );
  }
}