import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { getSummaryById } from '../services/api';

const SummaryDetail = () => {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSummaryById(id);
        setSummary(data);
      } catch (err) {
        console.error(`Error fetching summary ${id}:`, err);
        setError('Failed to load summary. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [id]);

  // Format date string to a more readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Render a section with bullet points
  const renderBulletPointSection = (title, items) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
        <ul className="list-disc pl-5 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-gray-700">{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Helper function to clean question text
  const cleanQuestionText = (text) => {
    // Remove any numbering, redundant Q: prefixes, and ** characters
    return text.replace(/^\d+\.\s*Q:\s*/, '')
              .replace(/^Q:\s*/, '')
              .replace(/\*\*/g, '')
              .trim();
  };

  // Helper function to parse Q&A items with different formats
  const parseQA = (item) => {
    // Check if the item contains multiple questions with ** format
    if (item.includes('?**') && item.split('?**').length > 2) {
      // This is a multi-question format
      const questions = [];
      const parts = item.split('?**');
      
      // Process each part except the last one (which doesn't have a question mark)
      for (let i = 0; i < parts.length - 1; i++) {
        const questionText = parts[i].trim();
        const answerText = i < parts.length - 2 
          ? parts[i + 1].substring(0, parts[i + 1].lastIndexOf('What')).trim()
          : parts[i + 1].trim();
        
        questions.push({
          question: cleanQuestionText(questionText + '?'),
          answer: cleanAnswerText(answerText)
        });
      }
      
      // Return the first question-answer pair
      // The rest will be handled separately when we split the items
      return questions[0];
    }
    
    // Check for the standard format: "Q: question\nA: answer"
    if (item.includes('\nA:')) {
      const parts = item.split('\nA:');
      const question = cleanQuestionText(parts[0]);
      const answer = parts.length > 1 ? cleanAnswerText(parts[1].trim()) : '';
      return { question, answer };
    }
    
    // Check for format with ** separator: "Q: question** answer"
    if (item.includes('**')) {
      const parts = item.split('**');
      const question = cleanQuestionText(parts[0]);
      let answer = parts.length > 1 ? cleanAnswerText(parts[1].trim()) : '';
      
      return { question, answer };
    }
    
    // Default case - just return the whole thing as a question
    return { 
      question: cleanQuestionText(item),
      answer: ''
    };
  };
  
  // Helper function to clean answer text
  const cleanAnswerText = (text) => {
    // Remove ** characters and ensure it starts with "A: " but not "A: Answer:"
    let cleanedText = text.replace(/\*\*/g, '');
    
    // Remove redundant "Answer:" prefix after "A:"
    cleanedText = cleanedText.replace(/^A:\s*Answer:\s*/i, 'A: ');
    
    // Replace standalone "Answer:" with "A:"
    cleanedText = cleanedText.replace(/^Answer:\s*/i, 'A: ');
    
    // Ensure it starts with "A:" if it doesn't already
    if (!cleanedText.startsWith('A:')) {
      cleanedText = `A: ${cleanedText}`;
    }
    
    return cleanedText;
  };
  
  // Function to split multi-question items into separate Q&A pairs
  const splitMultiQuestionItems = (items) => {
    if (!items || items.length === 0) return [];
    
    const result = [];
    
    items.forEach(item => {
      // Check if this is a multi-question item
      if (item.includes('?**') && item.split('?**').length > 2) {
        const parts = item.split('?**');
        
        // Process each part except the last one
        for (let i = 0; i < parts.length - 1; i++) {
          const questionText = parts[i].trim();
          
          // For the answer, take text until the next question or the end
          let answerText;
          if (i < parts.length - 2) {
            // Find the position of the next question
            const nextQuestionPos = parts[i + 1].lastIndexOf('What');
            if (nextQuestionPos !== -1) {
              answerText = parts[i + 1].substring(0, nextQuestionPos).trim();
            } else {
              answerText = parts[i + 1].trim();
            }
          } else {
            answerText = parts[i + 1].trim();
          }
          
          // Add this Q&A pair to the result
          result.push({
            question: cleanQuestionText(questionText + '?'),
            answer: cleanAnswerText(answerText)
          });
        }
      } else {
        // This is a regular item, just parse it normally
        result.push(parseQA(item));
      }
    });
    
    return result;
  };

  // Render Q&A section
  const renderQASection = (items) => {
    if (!items || items.length === 0) return null;

    // Process all Q&A items to handle multi-question items
    const qaItems = splitMultiQuestionItems(items);

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Questions & Answers</h3>
        <div className="flex flex-col space-y-4 w-full">
          {qaItems.map((item, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg w-full block">
                <p className="text-gray-900">Q: {item.question}</p>
                {item.answer && <p className="mt-2 text-gray-700">{item.answer}</p>}
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Check if a section has content
  const hasContent = (section) => {
    return section && section.length > 0;
  };

  // Render empty state message
  const renderEmptyState = (message) => {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No information available</h3>
        <p className="mt-1 text-sm text-gray-500">
          {message}
        </p>
      </div>
    );
  };

  // Render key points with special formatting for headers and subpoints
  const renderKeyPoints = (items) => {
    if (!items || items.length === 0) return null;

    // Group key points by their main headers
    const groupedPoints = {};
    let currentHeader = null;
    let currentPoints = [];

    items.forEach(item => {
      // Check if this is a header (ends with a colon or is a numbered point)
      if (item.endsWith(':') || /^\d+\./.test(item)) {
        // If we already have a header, save the current group
        if (currentHeader) {
          groupedPoints[currentHeader] = currentPoints;
        }

        // Start a new group with this header
        currentHeader = item;
        currentPoints = [];
      } else {
        // This is a bullet point for the current header
        if (currentHeader) {
          currentPoints.push(item);
        } else {
          // If no header yet, create a default group
          if (!groupedPoints['General']) {
            groupedPoints['General'] = [];
          }
          groupedPoints['General'].push(item);
        }
      }
    });

    // Add the last group if there is one
    if (currentHeader && currentPoints.length > 0) {
      groupedPoints[currentHeader] = currentPoints;
    }

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Key Points Discussed</h3>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(groupedPoints).map(([header, points], index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
              <h4 className="font-medium text-gray-900 mb-2">
                {header === 'General' ? 'General Points' : header}
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {points.map((point, pointIndex) => {
                  // Check if this point contains a colon (but not at the end)
                  const colonIndex = point.indexOf(':');
                  if (colonIndex > 0 && colonIndex < point.length - 1) {
                    // Split into subheader and content
                    const subheader = point.substring(0, colonIndex + 1).trim();
                    const content = point.substring(colonIndex + 1).trim();
                    return (
                      <li key={pointIndex} className="text-gray-700 mb-2">
                        <span className="font-bold block mb-1">{subheader}</span>
                        <span className="pl-4 block">{content}</span>
                      </li>
                    );
                  } else {
                    // Regular point
                    return <li key={pointIndex} className="text-gray-700">{point}</li>;
                  }
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" message="Loading summary..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <div className="mt-4">
              <Link to="/summaries">
                <Button variant="secondary">Back to Summaries</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Summary not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The summary you're looking for doesn't exist or has been deleted.
        </p>
        <div className="mt-6">
          <Link to="/summaries">
            <Button>Back to Summaries</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/summaries" className="text-primary-600 hover:text-primary-800 flex items-center mb-2">
            <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Summaries
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{summary.title || 'Untitled Meeting'}</h1>
          <p className="text-gray-600 mt-1">{formatDate(summary.date || summary.createdAt)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('key-points')}
            className={`${activeTab === 'key-points'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Key Points
            {hasContent(summary.keyPoints) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.keyPoints.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('action-items')}
            className={`${activeTab === 'action-items'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Action Items
            {hasContent(summary.actionItems) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.actionItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`${activeTab === 'qa'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Q&A
            {hasContent(summary.questionsAnswers) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.questionsAnswers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stakeholders')}
            className={`${activeTab === 'stakeholders'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Stakeholders
            {hasContent(summary.stakeholders) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.stakeholders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`${activeTab === 'technical'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Technical
            {hasContent(summary.technicalRequirements) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.technicalRequirements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('blockers')}
            className={`${activeTab === 'blockers'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Blockers
            {hasContent(summary.blockers) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.blockers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('agreements')}
            className={`${activeTab === 'agreements'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Agreements
            {hasContent(summary.agreements) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.agreements.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`${activeTab === 'planning'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Planning
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`${activeTab === 'notes'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Additional Notes
            {hasContent(summary.additionalNotes) && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {summary.additionalNotes.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4">
            {summary.context ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Context</h3>
                <p className="text-gray-700">{summary.context}</p>
              </div>
            ) : null}

            {hasContent(summary.objectives) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Meeting Objectives</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.objectives.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasContent(summary.conversationDetails) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Conversation Details</h3>
                <div className="space-y-3">
                  {summary.conversationDetails.map((item, index) => {
                    // Check if the item ends with a colon
                    if (item.trim().endsWith(':')) {
                      return (
                        <div key={index} className="mt-4">
                          <h4 className="font-bold text-gray-800">{item}</h4>
                        </div>
                      );
                    } else {
                      // Check if the previous item was a header (ended with colon)
                      const prevItem = index > 0 ? summary.conversationDetails[index - 1] : null;
                      const isPrevItemHeader = prevItem && prevItem.trim().endsWith(':');
                      
                      if (isPrevItemHeader) {
                        return (
                          <div key={index} className="flex">
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="flex">
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        );
                      }
                    }
                  })}
                </div>
              </div>
            ) : null}

            {!hasContent(summary.objectives) && !hasContent(summary.conversationDetails) && !summary.context ?
              renderEmptyState("No overview information is available for this meeting.") : null}
          </div>
        )}

        {activeTab === 'key-points' && (
          <div>
            {hasContent(summary.keyPoints) ? (
              renderKeyPoints(summary.keyPoints)
            ) : (
              renderEmptyState("No key points were identified in this meeting summary.")
            )}
          </div>
        )}

        {activeTab === 'action-items' && (
          <div className="grid grid-cols-1 gap-4">
            {hasContent(summary.actionItems) ? (
              (() => {
                // Group action items by headers
                const groupedItems = {};
                let currentHeader = null;
                let currentItems = [];

                summary.actionItems.forEach(item => {
                  // Check if this is a header (e.g., "What the Customer Needs to Do:")
                  if (item.endsWith(':') || item.endsWith('Do') || item.includes('Customer') || item.includes('Company')) {
                    // If we already have a header, save the current group
                    if (currentHeader) {
                      groupedItems[currentHeader] = currentItems;
                    }

                    // Start a new group with this header
                    currentHeader = item;
                    currentItems = [];
                  } else {
                    // This is an action item for the current header
                    if (currentHeader) {
                      currentItems.push(item);
                    } else {
                      // If no header yet, create a default group
                      if (!groupedItems['General Action Items']) {
                        groupedItems['General Action Items'] = [];
                      }
                      groupedItems['General Action Items'].push(item);
                    }
                  }
                });

                // Add the last group if there is one
                if (currentHeader && currentItems.length > 0) {
                  groupedItems[currentHeader] = currentItems;
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(groupedItems).map(([header, items], index) => (
                      <div key={index} className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <h4 className="font-medium text-gray-900 mb-2">{header}</h4>
                        <ul className="space-y-3">
                          {items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start">
                              <span className="flex-shrink-0 h-5 w-5 text-green-500 mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : renderEmptyState("No action items were identified in this meeting summary.")}
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="grid grid-cols-1 gap-4">
            {hasContent(summary.questionsAnswers) ? (
              (() => {
                // Process all Q&A items to handle multi-question items
                const qaItems = splitMultiQuestionItems(summary.questionsAnswers);
                
                return qaItems.map((item, index) => (
                  <div key={index} className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow w-full">
                    <p className="text-gray-900">Q: {item.question}</p>
                    {item.answer && (
                      <p className="mt-2 text-gray-700">{item.answer}</p>
                    )}
                  </div>
                ));
              })()
            ) : renderEmptyState("No questions and answers were identified in this meeting summary.")}
          </div>
        )}

        {activeTab === 'stakeholders' && (
          <div>
            {hasContent(summary.stakeholders) ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Stakeholders</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.stakeholders.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : renderEmptyState("No stakeholder information is available for this meeting.")}
          </div>
        )}

        {activeTab === 'technical' && (
          <div>
            {hasContent(summary.technicalRequirements) ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Requirements</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.technicalRequirements.map((item, index) => {
                    // Check if this item contains a colon (but not at the end)
                    const colonIndex = item.indexOf(':');
                    if (colonIndex > 0 && colonIndex < item.length - 1) {
                      // Split into subheader and content
                      const subheader = item.substring(0, colonIndex + 1).trim();
                      const content = item.substring(colonIndex + 1).trim();
                      return (
                        <li key={index} className="text-gray-700 mb-2">
                          <span className="font-bold block mb-1">{subheader}</span>
                          <span className="pl-4 block">{content}</span>
                        </li>
                      );
                    } else {
                      // Regular item
                      return <li key={index} className="text-gray-700">{item}</li>;
                    }
                  })}
                </ul>
              </div>
            ) : renderEmptyState("No technical requirements were identified in this meeting summary.")}
          </div>
        )}

        {activeTab === 'blockers' && (
          <div>
            {hasContent(summary.blockers) ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Blockers & Challenges</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.blockers.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : renderEmptyState("No blockers or challenges were identified in this meeting summary.")}
          </div>
        )}

        {activeTab === 'agreements' && (
          <div>
            {hasContent(summary.agreements) ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Agreements & Commitments</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.agreements.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : renderEmptyState("No agreements or commitments were identified in this meeting summary.")}
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="grid grid-cols-1 gap-4">
            {hasContent(summary.timeline) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Timeline & Milestones</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.timeline.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasContent(summary.budget) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Budget Considerations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.budget.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasContent(summary.followUp) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Follow-up Requirements</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.followUp.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasContent(summary.communicationPlan) ? (
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Communication Plan</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.communicationPlan.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!hasContent(summary.timeline) && !hasContent(summary.budget) &&
              !hasContent(summary.followUp) && !hasContent(summary.communicationPlan) ?
              renderEmptyState("No planning information is available for this meeting.") : null}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            {hasContent(summary.additionalNotes) ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Notes</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {summary.additionalNotes.map((item, index) => (
                    <li key={index} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            ) : renderEmptyState("No additional notes were identified in this meeting summary.")}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SummaryDetail;
