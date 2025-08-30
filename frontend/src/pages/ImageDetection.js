import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, detectionService } from '../services/api';
import axios from 'axios';

const ImageDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

 
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

   
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Validate file type
    if (file && !file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      setSelectedFile(null);
      return;
    }
    
    setError(null);
    setResult(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Call the detection API
      const response = await detectionService.detectImage(selectedFile);
      
      // Process the response
      const detectionResult = {
        detections: response.detections || [],
        resultPath: response.result_path
      };
      
      // Set the result data
      setResult(detectionResult);
      
      
      if (response.result_path) {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        setResultImage(`${apiUrl}${response.result_path}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setResultImage(null);
    setError(null);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900">Weapon Detection - Image Analysis</h1>
          <p className="mt-3 text-lg text-gray-500">
            Upload an image to detect weapons and dangerous objects.
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Image
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                          <span>Upload a file</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Original Image Preview */}
                {preview && !resultImage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-w-full h-auto max-h-96 mx-auto"
                      />
                    </div>
                  </div>
                )}
                
                {/* Annotated Image Result */}
                {resultImage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detection Result
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <img 
                        src={resultImage} 
                        alt="Detection Result" 
                        className="max-w-full h-auto max-h-96 mx-auto"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || isProcessing}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Detect Weapons'}
                  </button>
                </div>
              </div>
            </form>

            {/* Results Section */}
            {result && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Detection Results</h3>
                
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-500">Detected Objects:</h4>
                  
                  <ul className="mt-2 divide-y divide-gray-200">
                    {result.detections.map((detection, index) => (
                      <li key={index} className="py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                              {detection.class}
                            </span>
                            <span className="text-sm text-gray-500">
                              Confidence: {Math.round(detection.confidence * 100)}%
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            Position: {detection.bbox.join(', ')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {result.detections.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No weapons detected in this image.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDetection;
