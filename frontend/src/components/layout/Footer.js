import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-primary-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Meeting Summary App. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => {}} className="text-gray-300 hover:text-white bg-transparent border-0">
              <span className="sr-only">Privacy Policy</span>
              Privacy Policy
            </button>
            <button onClick={() => {}} className="text-gray-300 hover:text-white bg-transparent border-0">
              <span className="sr-only">Terms of Service</span>
              Terms of Service
            </button>
            <button onClick={() => {}} className="text-gray-300 hover:text-white bg-transparent border-0">
              <span className="sr-only">Contact</span>
              Contact
            </button>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-400">
          Powered by AWS Bedrock, Amazon Transcribe, and AWS Step Functions
        </div>
      </div>
    </footer>
  );
};

export default Footer;
