import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchUserAttributes} from 'aws-amplify/auth';

const Header = ({ user, signOut }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();

  useEffect(() => {
    const getUserAttributes = async () => {
      if (user) {
        try {
          const attributes = await fetchUserAttributes();
          if (attributes.email) {
            // Use the full email address
            setUserEmail(attributes.email);
          } else {
            setUserEmail(user.username);
          }
        } catch (error) {
          console.error('Error fetching user attributes:', error);
          setUserEmail(user.username);
        }
      }
    };
    
    getUserAttributes();
  }, [user]);


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'bg-primary-700 text-white' : 'text-gray-300 hover:bg-primary-600 hover:text-white';
  };

  return (
    <header className="bg-primary-800 shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="ml-2 text-white font-semibold text-lg">Meeting Summary</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}>
                  Dashboard
                </Link>
                <Link to="/upload" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/upload')}`}>
                  Upload Audio
                </Link>
                <Link to="/summaries" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/summaries')}`}>
                  Summaries
                </Link>
                <Link to="/statistics" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/statistics')}`}>
                  Statistics
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="text-white mr-4">{userEmail}</div>
              <button
                onClick={signOut}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={toggleMenu}
              className="bg-primary-700 inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-primary-600 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/')}`}>
              Dashboard
            </Link>
            <Link to="/upload" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/upload')}`}>
              Upload Audio
            </Link>
            <Link to="/summaries" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/summaries')}`}>
              Summaries
            </Link>
            <Link to="/statistics" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/statistics')}`}>
              Statistics
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-primary-700">
            <div className="flex items-center px-5">
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{userEmail}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={signOut}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
