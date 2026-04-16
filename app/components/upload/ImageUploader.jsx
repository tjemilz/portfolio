"use client";

import { useState, useRef, useCallback } from 'react';

/**
 * ImageUploader Component
 * 
 * Drag & drop upload with:
 * - Multiple file selection
 * - Image preview
 * - Progress tracking
 * - Error handling
 */
export default function ImageUploader({ 
  gallerySlug, 
  onUploadComplete, 
  onClose,
  maxFileSize = 20 * 1024 * 1024, // 20MB default
  allowedFormats = ['jpg', 'jpeg', 'png', 'webp']
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    const errors = [];
    
    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedFormats.includes(ext)) {
      errors.push(`Format non supporté (${ext}). Formats acceptés: ${allowedFormats.join(', ')}`);
    }
    
    // Check size
    if (file.size > maxFileSize) {
      errors.push(`Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max: ${maxFileSize / (1024 * 1024)}MB`);
    }
    
    return errors;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const newFiles = [];
    const newErrors = [];
    
    Array.from(selectedFiles).forEach(file => {
      const validationErrors = validateFile(file);
      
      if (validationErrors.length > 0) {
        newErrors.push({
          name: file.name,
          errors: validationErrors
        });
      } else {
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === file.name + file.size 
              ? { ...f, preview: e.target.result }
              : f
          ));
        };
        reader.readAsDataURL(file);
        
        newFiles.push({
          id: file.name + file.size,
          file: file,
          name: file.name,
          size: file.size,
          preview: null,
          status: 'pending' // pending, uploading, success, error
        });
      }
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    setErrors(prev => [...prev, ...newErrors]);
  }, [allowedFormats, maxFileSize]);

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50');
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  // Remove file from list
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear errors
  const clearErrors = () => {
    setErrors([]);
  };

  // Upload files
  const handleUpload = async () => {
    if (!gallerySlug || files.length === 0) return;
    
    setUploading(true);
    setResults(null);
    
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    
    files.forEach(f => {
      formData.append('images', f.file);
    });
    
    try {
      // Update all files to uploading status
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));
      
      const response = await fetch(`/api/galleries/${gallerySlug}/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults({
          success: true,
          uploaded: data.uploaded,
          errors: data.errors,
          images: data.images,
          errorDetails: data.error_details
        });
        
        // Update file statuses
        setFiles(prev => prev.map(f => ({ ...f, status: 'success' })));
        
        // Callback
        if (onUploadComplete) {
          onUploadComplete(data.images);
        }
      } else {
        setResults({
          success: false,
          error: data.error || 'Erreur lors de l\'upload'
        });
        setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
      }
    } catch (err) {
      console.error('Upload error:', err);
      setResults({
        success: false,
        error: 'Erreur de connexion au serveur'
      });
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-space-indigo">
            Ajouter des images
          </h3>
          <button
            onClick={onClose}
            className="text-slate-grey hover:text-slate-grey p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Results */}
          {results && (
            <div className={`mb-4 p-4 rounded-lg ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {results.success ? (
                <div className="text-green-700">
                  <p className="font-medium">✓ {results.uploaded} image(s) uploadée(s) avec succès</p>
                  {results.errors > 0 && (
                    <p className="text-sm mt-1">{results.errors} fichier(s) en erreur</p>
                  )}
                </div>
              ) : (
                <p className="text-red-700">{results.error}</p>
              )}
            </div>
          )}

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-red-700 mb-2">Fichiers ignorés :</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {errors.map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.name}:</strong> {err.errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={clearErrors} className="text-red-400 hover:text-red-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50"
          >
            <svg className="w-12 h-12 text-slate-grey mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-slate-grey mb-2">Glissez-déposez vos images ici</p>
            <p className="text-sm text-slate-grey mb-4">ou cliquez pour parcourir</p>
            <p className="text-xs text-slate-grey">
              Formats : {allowedFormats.join(', ').toUpperCase()} • Max {maxFileSize / (1024 * 1024)}MB par image
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedFormats.map(f => `.${f}`).join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-shadow-grey">
                  {files.length} fichier(s) sélectionné(s)
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Tout supprimer
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      file.status === 'success' ? 'bg-green-50 border-green-200' :
                      file.status === 'error' ? 'bg-red-50 border-red-200' :
                      file.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                      'bg-slate-grey/5 border-slate-grey/20'
                    }`}
                  >
                    {/* Preview */}
                    <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                      {file.preview ? (
                        <img src={file.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-space-indigo truncate">{file.name}</p>
                      <p className="text-xs text-slate-grey">{formatSize(file.size)}</p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {file.status === 'uploading' && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                      {file.status === 'success' && (
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {file.status === 'error' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {file.status === 'pending' && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-slate-grey hover:text-red-600"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-slate-grey/5">
          <p className="text-sm text-slate-grey">
            Galerie : <strong>{gallerySlug}</strong>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-shadow-grey bg-slate-grey/10 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {results?.success ? 'Fermer' : 'Annuler'}
            </button>
            {!results?.success && (
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Uploader {files.length} image(s)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
