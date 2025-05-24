# Notario - AI-Powered Digital Document Signing Platform

A secure digital signature platform developed as part of an Information Security course project. Notario enables users to cryptographically sign documents, automatically analyze document content with AI, add verification QR codes, and verify document authenticity.

![Notario Banner](https://via.placeholder.com/800x200?text=Notario+Digital+Signatures)

## 🔒 Secure Document Signing with AI Analysis

Notario is a Next.js-based application that provides end-to-end document signing solutions with a focus on security, AI-powered document analysis, and verification. The platform enables users to:

- Digitally sign PDF documents using cryptographic signatures
- Automatically analyze document content using Google's Gemini AI
- Extract key information like document type, parties involved, and important dates
- Identify optimal QR code placement locations
- Verify document authenticity through QR codes
- Manage signed documents with secure storage
- Track document history and verification status

## 🎓 Academic Project Context

This repository was developed as part of an Information Security course project to demonstrate practical implementation of:

- Digital signature cryptography
- Document integrity verification
- Certificate-based authentication
- Secure document workflows
- AI-powered document analysis

## 📊 System Architecture

```mermaid
graph LR
    User([User])
    Auth[Authentication]
    AI[Gemini AI Analysis]
    Signing[Signature Engine]
    QR[FastAPI QR Service]
    Storage[(Document Storage)]
    Verify[Verification System]
    
    User --> Auth
    Auth --> AI
    AI --> Signing
    Signing --> QR
    QR --> Storage
    Storage --> Verify
    Verify --> User
```

## 🧠 AI-Powered Document Analysis

Notario leverages Google's Gemini AI to automatically analyze documents and extract key information:

- **Document Type Classification**: Automatically identifies if a document is a contract, invoice, certificate, letter, etc.
- **Key Information Extraction**: Detects document numbers, issue dates, expiration dates, and important metadata
- **Party Identification**: Recognizes parties involved in the document and their roles
- **Summary Generation**: Creates concise document summaries for quick understanding
- **QR Placement Optimization**: Determines the best location for QR code placement
- **Keyword Extraction**: Identifies and tags important keywords for document categorization

The AI analysis enhances the signing process by providing context and ensuring verification elements are placed appropriately.

## 🔐 Security Features

- **RSA & ECDSA Signatures**: Support for industry-standard digital signature algorithms
- **Hash Verification**: SHA-256 document hashing to ensure integrity
- **Tamper Detection**: Ability to detect modifications to signed documents
- **Certificate Management**: Digital certificate issuance and validation
- **Secure Storage**: Encrypted document storage with access controls
- **Verification QR Codes**: Quick verification of document authenticity

## ✨ Key Features

### Document Analysis
- Upload PDF documents for AI-powered analysis
- Extract document type, parties, dates, and important metadata
- Generate document summaries and keywords
- Identify optimal QR code placement positions
- Support for multiple languages including English and Indonesian

### Document Signing
- Upload PDF documents for signing
- Choose between RSA and ECDSA signing algorithms
- Apply digital signatures with timestamps
- Add verification QR codes through integration with [FastAPI QR Service](https://github.com/kudith/fastapi_qr)

### Document Management
- Organize signed documents in a secure dashboard
- Track document history and signature information
- Search and filter documents by various properties
- Download signed documents with embedded verification

### Verification
- Verify document authenticity through QR code scanning
- Check signature validity and document integrity
- View signature details and timestamp information
- Verify signer identity and certificate information

## 🚀 Technical Implementation

```mermaid
classDiagram
    class User {
        +email
        +name
        +publicKey
        +privateKey
        +algorithm
    }
    
    class Document {
        +fileName
        +fileHash
        +signature
        +certificateId
        +timestamp
        +analysis
        +metadata
        +verifyDocument()
    }
    
    class AIAnalysisService {
        +analyzeDocument()
        +extractMetadata()
        +determineDocumentType()
        +identifyParties()
        +suggestQRPosition()
    }
    
    class SignatureService {
        +createSignature()
        +verifySignature()
        +generateCertificateId()
    }
    
    class QRService {
        +sendToPythonForQRPlacement()
        +detectSignatureArea()
    }
    
    User "1" -- "*" Document: signs
    Document -- SignatureService: uses
    Document -- AIAnalysisService: analyzed by
    Document -- QRService: uses
```

## 🔄 Document Signing Workflow

```mermaid
sequenceDiagram
    actor User
    participant Auth as Authentication
    participant AI as Gemini AI Analysis
    participant Sign as Signing Service
    participant QR as QR Service
    participant DB as Database
    
    User->>Auth: Login
    Auth->>User: Authentication Token
    User->>AI: Upload Document
    AI->>AI: Analyze Document Content
    AI->>AI: Extract Key Information
    AI->>AI: Determine Document Type
    AI->>Sign: Send analyzed document
    Sign->>Sign: Generate Hash
    Sign->>Sign: Create Digital Signature
    Sign->>QR: Send document with analysis
    QR->>QR: Place QR at optimal position
    QR->>Sign: Return enhanced document
    Sign->>DB: Store document & metadata
    Sign->>User: Return signed document
```

## 📱 Screenshots

| Document Analysis | Signing Process | Verification |
|:-------------------------:|:-------------------------:|:-------------------------:|
| ![Analysis](https://via.placeholder.com/300x200?text=AI+Analysis) | ![Signing](https://via.placeholder.com/300x200?text=Signing+Process) | ![Verification](https://via.placeholder.com/300x200?text=Verification) |

## 🛠️ Technologies Used

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API routes, Prisma ORM
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL
- **Storage**: Cloudflare R2
- **Cryptography**: Node.js crypto library
- **PDF Processing**: pdf-lib, QRCode.js
- **AI Analysis**: Google Gemini API
- **QR Placement**: Integration with [FastAPI QR Service](https://github.com/kudith/fastapi_qr)

## 📋 Prerequisites

- Node.js 16.x or later
- PostgreSQL database
- Cloudflare R2 account (or alternative storage)
- Google Gemini API key
- Python FastAPI QR service running (for QR placement)

## 🧠 Document Analysis with Gemini AI

Notario uses Google's Gemini AI to analyze document content and extract meaningful information:

```javascript
// Example from analyze/route.js
async function analyzeDocumentWithAI(fileBuffer, fileName, pdfMetadata = {}) {
  // Initialize the Google Gemini AI client
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Enhanced prompt for document analysis
  const enhancedPrompt = `Analisis dokumen ini secara menyeluruh dan kembalikan objek JSON dengan informasi berikut:
    1. documentType: Jenis dokumen (kontrak, surat, faktur, laporan, dll.)
    2. qrCodePosition: Posisi terbaik untuk tanda tangan kode QR
    3. importantMetadata: Array informasi penting dari dokumen
    4. subject: Perihal atau topik utama dokumen
    5. parties: Array pihak-pihak yang terlibat (nama dan peran)
    6. issueDate: Tanggal penerbitan dokumen
    7. expireDate: Tanggal kedaluwarsa dokumen
    8. documentNumber: Nomor referensi dokumen
    9. summary: Ringkasan isi dokumen
    10. keywords: Array kata kunci penting dalam dokumen`;
    
  // Convert buffer to base64 and analyze with Gemini
  const base64File = Buffer.from(fileBuffer).toString("base64");
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      { text: enhancedPrompt },
      { inlineData: { mimeType: 'application/pdf', data: base64File } }
    ],
    generationConfig: { temperature: 0.1, responseFormat: "JSON" }
  });
  
  // Process and return analysis results
  return JSON.parse(response.text);
}
```

The AI analysis enhances document signing by providing context and ensuring proper QR code placement.

## 🔧 Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kudith/notario.git
   cd notario
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Make sure the FastAPI QR service is running and configured in your environment variables.

## ⚙️ Configuration

Create a `.env.local` file with the following variables:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/notario"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secret_here"
GOOGLE_CLIENT_ID="your_client_id"
GOOGLE_CLIENT_SECRET="your_client_secret"

# Storage
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY="your_access_key"
R2_SECRET_KEY="your_secret_key"
R2_BUCKET_NAME="your_bucket_name"

# AI Analysis
GEMINI_API_KEY="your_gemini_api_key"

# QR Service
PYTHON_QR_SERVICE="http://localhost:8000"
```

## 🚀 Deployment

Notario can be deployed to various platforms:

### Vercel Deployment

```bash
npm install -g vercel
vercel
```

### Docker Deployment

```bash
docker build -t notario .
docker run -p 3000:3000 notario
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/[...nextauth]` - Authentication endpoints

### Documents

- `POST /api/documents/upload` - Upload a document
- `POST /api/documents/analyze` - Analyze a document with AI
- `POST /api/documents/sign` - Sign a document
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document details
- `GET /api/verify/:certificateId` - Verify document authenticity

## 🔗 Integration with External Services

### Gemini AI Integration

Notario integrates with Google's Gemini AI to provide intelligent document analysis:

```javascript
// Integration with Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: "gemini-1.5-flash",
  contents: [
    { text: prompt },
    { inlineData: { mimeType: 'application/pdf', data: base64File } }
  ]
});
```

### FastAPI QR Service Integration

After document analysis and digital signing, Notario sends the document to the [FastAPI QR Service](https://github.com/kudith/fastapi_qr) for QR code placement:

```javascript
// Integration with FastAPI QR Service
async function sendToPythonForQRPlacement(pdfBuffer, certificateId, verifyUrl) {
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf');
  formData.append('marker', '[[SIGN_HERE]]');
  formData.append('qr_data', verifyUrl);
  formData.append('certificate_id', certificateId);
  
  const pythonServiceUrl = process.env.PYTHON_QR_SERVICE || 'http://localhost:8000';
  const response = await fetch(`${pythonServiceUrl}/detect-and-add-qr`, {
    method: 'POST',
    body: formData,
  });
  
  return Buffer.from(await response.arrayBuffer());
}
```

## 📝 Course Information

- **Course**: Information Security
- **Project**: AI-Enhanced Digital Document Signing System
- **Components**:
  1. Notario - Main document signing application with AI analysis (this repository)
  2. [FastAPI QR Service](https://github.com/kudith/fastapi_qr) - Companion service for QR placement

## 🔍 Security Considerations

- Private keys are generated client-side and never transmitted to the server
- Documents are hashed using SHA-256 before signing
- Digital signatures use industry-standard RSA and ECDSA algorithms
- Document verification uses hash comparisons to detect tampering
- QR codes provide a user-friendly verification mechanism
- Document analysis is performed securely using Google's Gemini API

## 📄 License

[MIT License](LICENSE)

## 👥 Contributing

This repository is part of an academic project for an Information Security course. Contributions are welcome, particularly in the areas of:

- Enhanced security features
- Improved document analysis capabilities
- UI/UX improvements
- Performance optimizations
- Additional signature algorithms
- Testing and documentation

Please open an issue or submit a pull request with your contributions.
