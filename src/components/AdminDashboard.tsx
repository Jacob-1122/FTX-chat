import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileService } from '../services/fileService';
import { ArrowUpTrayIcon, DocumentTextIcon, XCircleIcon } from '@heroicons/react/24/outline';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const AdminDashboard: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

    // Split into sentences first
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Group sentences into meaningful chunks
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length < 10) continue; // Skip very short sentences
      
      // Skip if it's mostly addresses or boilerplate
      if (trimmedSentence.match(/^\d+ [A-Z\s]+(STREET|AVENUE|BOULEVARD|LANE|ROAD)/i)) continue;
      if (trimmedSentence.match(/^[A-Z\s]+LLP|ATTN:|C\/O|P\.O\.\sBOX/i)) continue;
      
      if (currentChunk.length + trimmedSentence.length > 1500) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 100); // Only keep substantial chunks
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const data = await pdf(arrayBuffer);
        const chunks = createBetterChunks(data.text);

        await fileService.uploadDocumentChunks(file.name, chunks, (progress) => {
          const overallProgress = ((i + progress) / files.length) * 100;
          setUploadProgress(overallProgress);
        });
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
