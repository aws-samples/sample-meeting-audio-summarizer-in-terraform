import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
// Remove unused Link import
// import { Link } from '@aws-amplify/ui-react';

const UploadAudio = ({ user }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(user || null);
  const [isDragging, setIsDragging] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const fileInputRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Supported file types
  const supportedFileTypes = [
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'video/mp4',
    'audio/flac',
    'audio/ogg',
    'audio/webm',
    'video/webm',
    'audio/amr',
    'audio/basic'
  ];
  
  // Clean up countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const supportedExtensions = ['.mp3', '.mp4', '.m4a', '.wav', '.flac', '.ogg', '.webm', '.amr'];

  // Get current user on component mount if not provided
  useEffect(() => {
    if (!user) {
      async function getUserInfo() {
        try {
          const currentUser = await getCurrentUser();
          const userAttributes = await fetchUserAttributes();
          setUserInfo({
            username: currentUser.username,
            ...userAttributes
          });
        } catch (err) {
          console.error('Error getting user info:', err);
          // Don't set error here to allow anonymous uploads if needed
        }
      }

      getUserInfo();
    }
  }, [user]);

  const isFileTypeSupported = (file) => {
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return supportedFileTypes.includes(file.type) || supportedExtensions.some(ext => fileExtension === ext);
  };
  
  // Function to validate file naming convention
  const isFileNameValid = (fileName) => {
    // Allow alphanumeric characters and hyphens only
    const validNamePattern = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/;
    return validNamePattern.test(fileName);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null);

    if (!selectedFile) {
      return;
    }

    // Check if file type is supported
    if (!isFileTypeSupported(selectedFile)) {
      setError('Please upload an audio file in one of the supported formats (MP3, MP4, M4A, WAV, FLAC, OGG, WebM, AMR).');
      return;
    }
    
    // Check file naming convention
    if (!isFileNameValid(selectedFile.name)) {
      setError('File name contains invalid characters. Please use only letters, numbers, and hyphens in your file name (no spaces or underscores).');
      return;
    }

    // Check file size (max 2GB)
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setError('File size exceeds 2GB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    // Check if file type is supported
    if (!isFileTypeSupported(droppedFile)) {
      setError('Please upload an audio file in one of the supported formats (MP3, MP4, M4A, WAV, FLAC, OGG, WebM, AMR).');
      return;
    }
    
    // Check file naming convention
    if (!isFileNameValid(droppedFile.name)) {
      setError('File name contains invalid characters. Please use only letters, numbers, and hyphens in your file name (no spaces or underscores).');
      return;
    }

    // Check file size (max 2GB)
    if (droppedFile.size > 2 * 1024 * 1024 * 1024) {
      setError('File size exceeds 2GB limit.');
      return;
    }

    setFile(droppedFile);
    setError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const username = userInfo?.username || user?.username || 'meetinguser';

      // Get bucket name directly from the global config
      const storageBucket = window.awsConfig?.aws_user_files_s3_bucket;
      const region = window.awsConfig?.aws_project_region || 'us-east-1';

      // Validate bucket name
      if (!storageBucket) {
        throw new Error('S3 bucket name is undefined. Check AWS configuration in aws-exports.js.');
      }

      // Step 1: Get credentials from Amplify Auth session
      const authSession = await fetchAuthSession();

      if (!authSession || !authSession.credentials) {
        console.error('No valid credentials in auth session:', authSession);
        throw new Error('Authentication required for uploads. Please sign in again.');
      }

      // Step 2: Import AWS SDK v3 S3 client and related functions
      const {
        S3Client,
        PutObjectCommand
      } = await import('@aws-sdk/client-s3');

      // Step 3: Create S3 client with credentials from auth session
      const s3Client = new S3Client({
        region: region,
        credentials: authSession.credentials,
        // Disable checksum calculations which can cause problems in browsers
        checksumAlgorithm: false
      });

      // Use the actual username in the file key instead of hardcoded 'meetinguser'
      const fileKey = `audio/${username}/${file.name}`;

      // Step 5: Read the file as a Blob rather than ArrayBuffer
      const fileContent = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsArrayBuffer(file);
      });

      // Step 6: Upload the file with content length explicitly set

      const uploadParams = {
        Bucket: storageBucket,
        Key: fileKey,
        Body: fileContent,
        ContentType: file.type,
        ContentLength: file.size
      };

      // Create a command to upload the file
      const uploadCommand = new PutObjectCommand(uploadParams);

      // Track progress manually
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          if (progress > 95) {
            clearInterval(interval);
          } else {
            setUploadProgress(progress);
          }
        }, 500);

        return interval;
      };

      const progressInterval = simulateProgress();

      try {
        // Upload the file
        const response = await s3Client.send(uploadCommand);

        // Clear progress interval
        clearInterval(progressInterval);
        setUploadProgress(100);
        setSuccess(true);
        
        // File uploaded successfully - progress bar will handle the rest
        
        // Start countdown for redirection
        setRedirectCountdown(5);
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              navigate('/summaries');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        countdownIntervalRef.current = countdownInterval;
      } catch (uploadError) {
        clearInterval(progressInterval);
        throw uploadError;
      }

    } catch (err) {
      console.error('Error uploading file:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Audio</h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Transform your meetings into actionable insights with our AI-powered summarization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Upload Area */}
        <div>
          <Card className="shadow-lg border-0 overflow-hidden h-full">
            {success ? (
              <div className="text-center py-8 px-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-3 text-xl font-medium text-gray-900">Upload Successful!</h3>
                <p className="mt-2 text-gray-500">
                  Your audio file has been uploaded and is being processed.
                </p>
                <p className="mt-1 text-sm text-blue-600">
                  Redirecting to Summaries in {redirectCountdown} seconds...
                </p>
                <div className="mt-4">
                  <Button onClick={() => navigate('/summaries')} size="lg">
                    View Summaries
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">Upload Your Audio File</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Supported formats: MP3, MP4, M4A, WAV, FLAC, OGG, WebM, AMR (up to 2GB)
                  </p>
                </div>

                <div className="p-4">
                  <div
                    className={`border-2 ${isDragging ? 'border-primary-500 bg-primary-50' : error ? 'border-red-300 bg-red-50' : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                      } rounded-lg p-6 text-center transition-all duration-200 ease-in-out`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".mp3,.mp4,.m4a,.wav,.flac,.ogg,.webm,.amr,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,video/mp4,audio/flac,audio/ogg,audio/webm,video/webm,audio/amr,audio/basic"
                      disabled={uploading}
                    />


                    {uploading ? (
                      <div className="text-center py-4">
                        <Loader size="md" message={`Uploading... ${uploadProgress}%`} />
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                          <div
                            className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">Please don't close this window</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center justify-center py-4">
                          {file ? (
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-3">
                              <svg className="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                              <svg className="w-6 h-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                          )}

                          {file ? (
                            <div>
                              <h3 className="text-base font-medium text-gray-900">{file.name}</h3>
                              <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-base font-medium text-gray-900">Drag and drop your audio file</h3>
                              <p className="text-xs text-gray-500 mt-1">or click to browse your files</p>
                            </div>
                          )}

                          <div className="mt-4">
                            {!file ? (
                              <Button
                                onClick={() => fileInputRef.current?.click()}
                                size="md"
                                className="px-4"
                                disabled={uploading}
                              >
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Select File
                              </Button>
                            ) : (
                              <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                              >
                                Change File
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>


                  {error && (
                    <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-2">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end space-x-3">
                    {file && (
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        disabled={uploading}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}

                    <Button
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      size="md"
                      className="px-6"
                    >
                      {uploading ? 'Uploading...' : 'Upload Audio'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* File Naming Requirements Card */}
            
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-amber-100 rounded-full p-1.5 mr-2">
                    <svg className="h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">File Naming Requirements</h3>
                </div>

                <div className="text-sm space-y-3">
                  <div>
                    <p className="text-gray-600 text-sm">
                    File names should only contain letters, numbers, and hyphens, followed by a file extension. <span className="font-bold underline">Spaces and underscores are not allowed</span>.
                    </p>
                  </div>
                </div>
              </div>
             
          </Card>
        </div>

          {/* Right Column - Processing Info */}
        <div className="space-y-4">
          <Card className="shadow-md border-0">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="bg-blue-100 rounded-full p-1.5 mr-2">
                  <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">Supported Formats</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  MP3 (Standard audio)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  MP4 (Video audio)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  M4A (Apple format)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  WAV (PCM 16-bit)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  FLAC (Lossless)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  OGG (Open source)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  WebM (Web format)
                </div>
                <div className="flex items-center">
                  <svg className="h-3.5 w-3.5 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AMR (Adaptive)
                </div>
              </div>
            </div>
          </Card>
          <Card className="shadow-md border-0">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="bg-purple-100 rounded-full p-1.5 mr-2">
                  <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">Best Practices</h3>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex items-start">
                  <svg className="h-3.5 w-3.5 text-purple-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z" clipRule="evenodd" />
                  </svg>
                  <span>Keep recordings under 3 hours for best results</span>
                </div>
                <div className="flex items-start">
                  <svg className="h-3.5 w-3.5 text-purple-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  <span>Use clear audio with minimal background noise</span>
                </div>
                <div className="flex items-start">
                  <svg className="h-3.5 w-3.5 text-purple-500 mr-1.5 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>Speaker identification works best with 2-10 participants</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-md border-0">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="bg-green-100 rounded-full p-1.5 mr-2">
                  <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900">Processing Information</h3>
              </div>
              <div className="text-sm space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800">Processing Time</h4>
                  <p className="text-gray-600 text-sm">
                    A 60-minute recording typically takes 5-10 minutes to process completely.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Language Support</h4>
                  <p className="text-gray-600 text-sm">
                    Our system supports English, Spanish, French, German, Italian, Portuguese, Japanese, and <a href="https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">many other languages</a>.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Privacy & Security</h4>
                  <p className="text-gray-600 text-sm">
                    All audio files and transcripts are encrypted at rest and in transit.
                  </p>
                </div>
              </div>
            </div>
          </Card>

        
        </div>
      </div>
    </div>
  );
}

export default UploadAudio;

