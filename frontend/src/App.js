import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import UploadAudio from './pages/UploadAudio';
import SummaryList from './pages/SummaryList';
import SummaryDetail from './pages/SummaryDetail';
import Statistics from './pages/Statistics';
import NotFound from './pages/NotFound';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ProcessingDetail from './pages/ProcessingDetail';

import ProcessingProgressBar from './components/ui/ProcessingProgressBar';
import NotificationSystem from './components/ui/NotificationSystem';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ProcessingProvider } from './contexts/ProcessingContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/signin" />;
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();


        // Extract username from email if available
        let username = currentUser.username;
        if (currentUser.attributes && currentUser.attributes.email) {
          // Split the email and get the part before @
          username = currentUser.attributes.email.split('@')[0];
        }



        // Set the user with the extracted username
        setUser({
          ...currentUser,
          displayName: username
        });
      } catch (error) {
        setUser(null);
      }
    };

    checkUser();
  }, []);


  const handleSignOut = async () => {
    try {
      await signOut({ global: true });
      setUser(null);
      // Force a full page reload to the signin page
      window.location.replace('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ErrorBoundary>
      <ProcessingProvider>
        <Router>
          <ProcessingProgressBar />
          <NotificationSystem />
          <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <Dashboard />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/upload" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <UploadAudio user={user} />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/summaries" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <SummaryList user={user} />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/summaries/:id" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <SummaryDetail user={user} />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/processing/:fileId" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <ProcessingDetail user={user} />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="/statistics" element={
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <Header user={user} signOut={handleSignOut} />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16">
                <Statistics user={user} />
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />

        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
      </ProcessingProvider>
    </ErrorBoundary>
  );
}

export default App;
