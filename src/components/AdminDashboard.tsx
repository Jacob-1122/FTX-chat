import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileService } from '../services/fileService';
import { ArrowUpTrayIcon, DocumentTextIcon, XCircleIcon } from '@heroicons/react/24/outline';

// Import PDF.js for browser use
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure PDF.js worker using the legacy build with fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
} catch (error) {
  // Fallback to CDN with matching version
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.54/legacy/build/pdf.worker.mjs';
}

const AdminDashboard: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Function to extract text from PDF using PDF.js
  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        // Disable font errors and warnings for complex legal documents
        disableFontFace: true,
        isEvalSupported: false,
        // Suppress warnings in console
        verbosity: 0
      });
      
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      console.log(`Extracting text from ${pdf.numPages} pages...`);
      
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent({
            // Normalize whitespace and handle special characters
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          
          // Better text extraction with proper spacing
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim().length > 0)
            .map((item: any, index: number, array: any[]) => {
              let text = item.str;
              
              // Add space if needed between items
              const nextItem = array[index + 1];
              if (nextItem && !text.endsWith(' ') && !nextItem.str.startsWith(' ')) {
                // Check if items are on same line by comparing transform values
                const currentY = item.transform[5];
                const nextY = nextItem.transform[5];
                
                if (Math.abs(currentY - nextY) < 2) {
                  text += ' ';
                } else {
                  text += '\n';
                }
              }
              
              return text;
            })
            .join('');
            
          fullText += pageText + '\n\n';
          
          // Clean up page resources
          page.cleanup();
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
          fullText += `[Page ${i} - Text extraction error]\n\n`;
        }
      }
      
      // Clean up PDF resources
      loadingTask.destroy();
      
      console.log(`Extracted ${fullText.length} characters from PDF`);
      return fullText.trim();
      
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  });

  const createBetterChunks = (text: string): string[] => {
    // Remove common header/footer patterns
    const cleanedText = text
      .replace(/UNITED STATES DEPARTMENT OF JUSTICE.*?WILMINGTON, DE \d{5}/g, '')
      .replace(/ATTN:.*?NEW YORK, NY \d{5}/g, '')
      .replace(/P\.O\.\sBOX\s\d+.*?WASHINGTON,\sDC\s\d{5}/g, '')
      .replace(/CASE NO\.:.*?\n/g, '')
      .replace(/FILED:.*?\n/g, '')
      .replace(/Page \d+ of \d+/g, '')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim();

    // Split by paragraphs first for better semantic boundaries
    const paragraphs = cleanedText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    const chunks: string[] = [];
    let currentChunk = '';
    const TARGET_CHUNK_SIZE = 3500; // Increased from 1500 to provide more context
    const OVERLAP_SIZE = 700; // 20% overlap to preserve context across boundaries
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // Skip if it's mostly addresses or boilerplate
      if (trimmedParagraph.match(/^\d+ [A-Z\s]+(STREET|AVENUE|BOULEVARD|LANE|ROAD)/i)) continue;
      if (trimmedParagraph.match(/^[A-Z\s]+LLP|ATTN:|C\/O|P\.O\.\sBOX/i)) continue;
      if (trimmedParagraph.length < 30) continue; // Skip very short paragraphs
      
      // If adding this paragraph would exceed target size, finalize current chunk
      if (currentChunk.length + trimmedParagraph.length > TARGET_CHUNK_SIZE && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        
        // Create overlap by keeping the last portion of the current chunk
        const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const overlapSentences = [];
        let overlapLength = 0;
        
        // Take sentences from the end until we reach overlap size
        for (let i = sentences.length - 1; i >= 0 && overlapLength < OVERLAP_SIZE; i--) {
          const sentence = sentences[i].trim();
          if (overlapLength + sentence.length <= OVERLAP_SIZE) {
            overlapSentences.unshift(sentence);
            overlapLength += sentence.length;
          } else {
            break;
          }
        }
        
        currentChunk = overlapSentences.join(' ') + (overlapSentences.length > 0 ? ' ' : '') + trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    // Add the final chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    // Filter out chunks that are too small or mostly boilerplate
    return chunks.filter(chunk => {
      if (chunk.length < 200) return false;
      
      // Check if chunk is mostly boilerplate/addresses
      const boilerplateRatio = (chunk.match(/(ATTN:|P\.O\.|LLC|LLP|STREET|AVENUE|BOULEVARD)/gi) || []).length / chunk.split(' ').length;
      return boilerplateRatio < 0.1; // Less than 10% boilerplate words
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        // Update progress for PDF processing
        setUploadProgress((i / files.length) * 50); // First 50% for PDF processing
        
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        
        if (!text || text.length < 100) {
          throw new Error(`Failed to extract meaningful text from ${file.name}. File may be corrupted or image-based.`);
        }
        
        const chunks = createBetterChunks(text);
        console.log(`Created ${chunks.length} chunks from ${file.name} (avg size: ${Math.round(text.length / chunks.length)} chars)`);
        
        if (chunks.length === 0) {
          throw new Error(`No valid chunks created from ${file.name}. The document may be mostly boilerplate.`);
        }

        // Update progress for upload
        setUploadProgress(((i / files.length) * 50) + 25); // Next 25% for upload prep
        
        await fileService.uploadDocumentChunks(file.name, chunks, (progress) => {
          const fileProgress = ((i / files.length) * 75) + ((progress / 100) * (75 / files.length));
          setUploadProgress(fileProgress);
        });
        
        console.log(`✅ Successfully processed and uploaded ${file.name}`);
      }
      setFiles([]); // Clear files after successful upload
    } catch (error: any) {
      setError(error.message || 'An unknown error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Upload Documents</h2>
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}
        >
          <input {...getInputProps()} />
          <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-400">
            {isDragActive ? "Drop files here..." : "Drag & drop PDF files"}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-gray-200 mb-2">Files to Upload:</h3>
          <ul className="space-y-2">
            {files.map((file, i) => (
              <li key={i} className="flex items-center gap-3 p-2 bg-gray-700 border border-gray-600 rounded-md">
                <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                <span className="flex-1 text-sm truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3 text-sm text-red-300 bg-red-900 border border-red-700 rounded-md">
          <XCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {uploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload Files'}
        </button>
        {uploading && (
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
