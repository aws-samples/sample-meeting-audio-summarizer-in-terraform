import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import { getSummaries, searchSummaries } from '../services/api';
import { deleteSummaries, deleteSummary } from '../graphql/mutations';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';


// Initialize the API client
const client = generateClient();

const SummaryList = () => {
  const [summaries, setSummaries] = useState([]);
  const [filteredSummaries, setFilteredSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedSummaries, setSelectedSummaries] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [viewedSummaries, setViewedSummaries] = useState({});

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [hasActionItems, setHasActionItems] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Ref for detecting clicks outside filter dropdown
  const filterDropdownRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [nextToken, setNextToken] = useState(null);
  const [prevTokens, setPrevTokens] = useState([null]);
  const summariesPerPage = 4;

  // Ref for printing
  const printFrameRef = useRef(null);

  // Count selected summaries
  const selectedCount = Object.values(selectedSummaries).filter(Boolean).length;

  // State to track total number of summaries
  const [totalSummaries, setTotalSummaries] = useState(0);
  // State to show the AWS console alert
  const [showConsoleAlert, setShowConsoleAlert] = useState(true);

  // Function to get current page summaries
  const getCurrentPageSummaries = () => {
    const startIndex = (currentPage - 1) * summariesPerPage;
    const endIndex = startIndex + summariesPerPage;
    return filteredSummaries.slice(startIndex, endIndex);
  };

  useEffect(() => {
    // Call the fetchSummaries function directly
    fetchSummaries();
    // Get total count of summaries - do this separately to ensure we get the full count
    setTimeout(() => {
      fetchTotalSummaryCount();
    }, 1000); // Slight delay to ensure initial fetch completes first

    // Load viewed summaries from localStorage
    const storedViewedSummaries = localStorage.getItem('viewedSummaries');
    if (storedViewedSummaries) {
      setViewedSummaries(JSON.parse(storedViewedSummaries));
    }
  }, []);

  // Function to fetch the total count of summaries
  const fetchTotalSummaryCount = async () => {
    try {
      // This is a simplified approach - in a real app, you'd have an API endpoint
      // that returns the total count without fetching all summaries

      // For now, we'll use a recursive function to fetch all pages
      let allSummaries = [];
      let currentToken = null;
      let hasMore = true;

      while (hasMore) {
        const data = await getSummaries(100, currentToken); // Fetch 100 at a time

        if (data && data.items) {
          allSummaries = [...allSummaries, ...data.items];
        }

        if (data && data.nextToken) {
          currentToken = data.nextToken;
        } else {
          hasMore = false;
        }
      }

      // Only update if we actually got summaries
      if (allSummaries.length > 0) {
        setTotalSummaries(allSummaries.length);
      } else if (summaries.length > 0) {
        // Fallback to current summaries length if we have them
        setTotalSummaries(summaries.length);
      }
    } catch (err) {
      console.error('Error fetching total summary count:', err);
      // If there's an error, we'll just use the current summaries length if available
      if (summaries.length > 0) {
        setTotalSummaries(summaries.length);
      }
    }
  };

  // Apply filters to summaries
  const applyFilters = (summariesToFilter = summaries) => {
    if (!summariesToFilter || summariesToFilter.length === 0) {
      return [];
    }

    let filtered = [...summariesToFilter];

    // Apply date filter
    if (dateFilter) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      filtered = filtered.filter(summary => {
        const summaryDate = new Date(summary.date || summary.createdAt);

        switch (dateFilter) {
          case 'today':
            return summaryDate.toDateString() === today.toDateString();
          case 'yesterday':
            return summaryDate.toDateString() === yesterday.toDateString();
          case 'week':
            return summaryDate >= lastWeek;
          case 'month':
            return summaryDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    // Apply action items filter
    if (hasActionItems) {
      filtered = filtered.filter(summary =>
        summary.actionItems &&
        summary.actionItems.length > 0 &&
        summary.actionItems.some(item => item && item.trim())
      );
    }

    // Sort based on selected criteria
    filtered.sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case 'date':
          valueA = new Date(a.date || a.createdAt).getTime();
          valueB = new Date(b.date || b.createdAt).getTime();
          break;
        case 'title':
          valueA = (a.title || '').toLowerCase();
          valueB = (b.title || '').toLowerCase();
          break;
        case 'actionItems':
          valueA = a.actionItems ? a.actionItems.filter(item => item && item.trim()).length : 0;
          valueB = b.actionItems ? b.actionItems.filter(item => item && item.trim()).length : 0;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });

    return filtered;
  };

  // Effect for handling clicks outside the filter dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }

    // Add event listener when dropdown is shown
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Effect to filter summaries when search query changes
  useEffect(() => {
    if (!loading && summaries.length > 0) {
      filterSummaries();
    }
  }, [searchQuery, dateFilter, hasActionItems, summaries, loading, sortBy, sortOrder]);

  // Listen for refresh events from ProcessingProgressBar when processing completes
  useEffect(() => {
    const processedRefreshes = new Set();
    
    const handleRefreshSummaries = (event) => {
      const eventKey = `${event.detail?.reason}-${event.detail?.timestamp}`;
      
      // Prevent duplicate refreshes using timestamp-based deduplication
      if (processedRefreshes.has(eventKey)) {
        console.log('🔄 Skipping duplicate refresh request:', event.detail);
        return;
      }
      
      console.log('🔄 Processing refresh request from ProcessingProgressBar:', event.detail);
      processedRefreshes.add(eventKey);
      
      // Use the same refresh logic as the Refresh button
      fetchSummaries(null);
      fetchTotalSummaryCount();
      
      // Clear the processed flag after 30 seconds to allow future refreshes
      setTimeout(() => {
        processedRefreshes.delete(eventKey);
      }, 30000);
    };

    window.addEventListener('refreshSummariesPage', handleRefreshSummaries);
    
    return () => {
      window.removeEventListener('refreshSummariesPage', handleRefreshSummaries);
    };
  }, []);

  // Filter summaries based on search query and filters
  const filterSummaries = () => {
    let results = [...summaries];

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(summary =>
        (summary.title && summary.title.toLowerCase().includes(query)) ||
        (summary.context && summary.context.toLowerCase().includes(query))
      );
    }

    // Apply date filter
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      results = results.filter(summary => {
        const summaryDate = new Date(summary.date || summary.createdAt);

        if (dateFilter === 'today') {
          return summaryDate >= today;
        } else if (dateFilter === 'week') {
          return summaryDate >= weekStart;
        } else if (dateFilter === 'month') {
          return summaryDate >= monthStart;
        }
        return true;
      });
    }

    // Apply action items filter
    if (hasActionItems) {
      results = results.filter(summary =>
        summary.actionItems && summary.actionItems.length > 0 &&
        summary.actionItems.some(item => item && item.trim())
      );
    }

    // Apply sorting
    results.sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case 'date':
          valueA = new Date(a.date || a.createdAt).getTime();
          valueB = new Date(b.date || b.createdAt).getTime();
          break;
        case 'title':
          valueA = (a.title || '').toLowerCase();
          valueB = (b.title || '').toLowerCase();
          return sortOrder === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case 'actionItems':
          valueA = a.actionItems ? a.actionItems.filter(item => item && item.trim()).length : 0;
          valueB = b.actionItems ? b.actionItems.filter(item => item && item.trim()).length : 0;
          break;
        default:
          valueA = new Date(a.date || a.createdAt).getTime();
          valueB = new Date(b.date || b.createdAt).getTime();
      }

      if (sortBy !== 'title') {
        return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
      }
    });

    setFilteredSummaries(results);
    // Reset to first page when filters change
    setCurrentPage(1);
  };


  // Function to fetch summaries with proper error handling
  const fetchSummaries = async (token = null) => {
    try {
      setLoading(true);
      setError(null);

      const data = await getSummaries(summariesPerPage, token);

      if (data && data.items) {

        // Sort summaries in chronological order (oldest to newest)
        const sortedItems = [...data.items].sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt);
          const dateB = new Date(b.date || b.createdAt);
          return dateA - dateB;
        });

        setSummaries(sortedItems);

        // Apply any active filters to the new data
        const filtered = applyFilters(sortedItems);
        setFilteredSummaries(filtered);

        setNextToken(data.nextToken || null);

        // Update the total count when we fetch summaries
        fetchTotalSummaryCount();
      } else {
        setSummaries([]);
        setFilteredSummaries([]);
        // Don't reset total summaries to 0 here, as it might be a pagination issue
        // Only set to 0 if we're sure there are no summaries at all
        if (!token) {
          setTotalSummaries(0);
        }
      }
    } catch (err) {
      console.error('Error fetching summaries:', err);
      setError('Failed to load summaries. Please try again later.');
      setSummaries([]);
      setFilteredSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!searchQuery.trim()) {
      fetchSummaries();
      return;
    }

    try {
      setSearching(true);
      setError(null);

      // Use the searchSummaries API function to search across all pages
      const searchResults = await searchSummaries(searchQuery);

      if (searchResults && searchResults.length > 0) {
        setSummaries(searchResults);
        setFilteredSummaries(searchResults);
        setTotalSummaries(searchResults.length);
      } else {
        setSummaries([]);
        setFilteredSummaries([]);
        setTotalSummaries(0);
      }

      // Reset pagination since we're now showing search results
      setCurrentPage(1);
      setNextToken(null);
      setPrevTokens([null]);
    } catch (err) {
      console.error('Error searching summaries:', err);
      setError('Failed to search summaries. Please try again later.');
      setSummaries([]);
      setFilteredSummaries([]);
      setTotalSummaries(0);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDateFilter('');
    setHasActionItems(false);
    setCurrentPage(1);
    setPrevTokens([null]);
    fetchSummaries(); // Immediately fetch summaries when clearing search
  };

  const handleCheckboxChange = (summaryId) => {
    setSelectedSummaries(prev => ({
      ...prev,
      [summaryId]: !prev[summaryId]
    }));
  };

  const handleDeleteClick = () => {
    if (selectedCount > 0) {
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteInProgress(true);

      // Get IDs of selected summaries
      const summaryIds = Object.keys(selectedSummaries).filter(id => selectedSummaries[id]);


      // Get names of selected summaries for the success message
      const selectedNames = summaries
        .filter(summary => selectedSummaries[summary.id])
        .map(summary => summary.title || 'Untitled Meeting');

      let deleteSuccess = false;
      let deleteMessage = '';

      // Delete summaries
      if (summaryIds.length === 1) {
        // Delete a single summary
        try {
          const response = await client.graphql({
            query: deleteSummary,
            variables: { id: summaryIds[0] }
          });

          if (response.data?.deleteSummary?.success) {
            deleteSuccess = true;
            deleteMessage = response.data.deleteSummary.message || 'Summary deleted successfully';
          } else {
            throw new Error(response.data?.deleteSummary?.message || 'Failed to delete summary');
          }
        } catch (err) {
          console.error('Error deleting single summary:', err);
          // Try with the deleteSummaries mutation as a fallback
          const response = await client.graphql({
            query: deleteSummaries,
            variables: { ids: summaryIds }
          });

          if (response.data?.deleteSummaries?.success) {
            deleteSuccess = true;
            deleteMessage = response.data.deleteSummaries.message || 'Summary deleted successfully';
          } else {
            throw new Error(response.data?.deleteSummaries?.message || 'Failed to delete summary');
          }
        }
      } else {
        // Delete multiple summaries
        const response = await client.graphql({
          query: deleteSummaries,
          variables: { ids: summaryIds }
        });

        if (response.data?.deleteSummaries?.success) {
          deleteSuccess = true;
          deleteMessage = response.data.deleteSummaries.message || 'Summaries deleted successfully';
        } else {
          throw new Error(response.data?.deleteSummaries?.message || 'Failed to delete summaries');
        }
      }

      // Show success message with the names of deleted summaries
      if (selectedNames.length === 1) {
        setSuccessMessage(`Successfully deleted summary: "${selectedNames[0]}"`);
      } else {
        setSuccessMessage(`Successfully deleted ${summaryIds.length} summaries`);
      }

      // Clear selected summaries
      setSelectedSummaries({});

      // Refresh the list and update total count
      fetchSummaries();
      fetchTotalSummaryCount();

    } catch (err) {
      console.error('Error deleting summaries:', err);
      setError(`Failed to delete summaries: ${err.message}`);
    } finally {
      setDeleteInProgress(false);
      setShowDeleteModal(false);
    }
  };

  const handleNextPage = () => {
    if (nextToken) {
      setPrevTokens([...prevTokens, nextToken]);
      setCurrentPage(currentPage + 1);
      fetchSummaries(nextToken);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      // Remove the last token from prevTokens
      const newPrevTokens = [...prevTokens];
      newPrevTokens.pop();
      setPrevTokens(newPrevTokens);

      // Get the token for the previous page
      const prevToken = newPrevTokens[newPrevTokens.length - 1];
      setCurrentPage(currentPage - 1);
      fetchSummaries(prevToken);
    }
  };

  // Handle print summary
  const handlePrintSummary = (summary) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert("Please allow pop-ups to print the summary.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${summary.title || 'Meeting Summary'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 5px; }
            h2 { color: #555; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            h3 { color: #555; margin-top: 15px; font-weight: bold; }
            .date { color: #777; margin-bottom: 20px; }
            .section { margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
            .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .indent { margin-left: 20px; }
            .qa-question { font-weight: bold; }
            .qa-answer { margin-left: 20px; border-left: 3px solid #ddd; padding-left: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${summary.title || 'Untitled Meeting'}</h1>
            <div class="date">${formatDate(summary.date || summary.createdAt)}</div>
          </div>
          
          ${summary.context ? `
            <div class="section">
              <h2>Context</h2>
              <p>${summary.context}</p>
            </div>
          ` : ''}
          
          ${summary.objectives && summary.objectives.length > 0 ? `
            <div class="section">
              <h2>Objectives</h2>
              <ul>
                ${summary.objectives.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.keyPoints && summary.keyPoints.length > 0 ? `
            <div class="section">
              <h2>Key Points</h2>
              ${(() => {
          let html = '';
          let inSubsection = false;

          summary.keyPoints.forEach(item => {
            if (item.endsWith(':')) {
              if (inSubsection) {
                html += '</ul>';
              }
              html += `<h3>${item}</h3><ul class="indent">`;
              inSubsection = true;
            } else {
              if (!inSubsection) {
                if (!html.includes('<ul>')) {
                  html += '<ul>';
                }
              }
              html += `<li>${item}</li>`;
            }
          });

          if (inSubsection) {
            html += '</ul>';
          } else if (html.includes('<ul>')) {
            html += '</ul>';
          }

          return html;
        })()}
            </div>
          ` : ''}
          
          ${summary.actionItems && summary.actionItems.length > 0 ? `
            <div class="section">
              <h2>Action Items</h2>
              ${(() => {
          // Group action items by headers
          const groupedItems = {};
          let currentHeader = null;
          let currentItems = [];

          summary.actionItems.forEach(item => {
            if (item.endsWith(':') || item.endsWith('Do') || item.includes('Customer') || item.includes('Company')) {
              if (currentHeader) {
                groupedItems[currentHeader] = currentItems;
              }
              currentHeader = item;
              currentItems = [];
            } else {
              if (currentHeader) {
                currentItems.push(item);
              } else {
                if (!groupedItems['General Action Items']) {
                  groupedItems['General Action Items'] = [];
                }
                groupedItems['General Action Items'].push(item);
              }
            }
          });

          if (currentHeader && currentItems.length > 0) {
            groupedItems[currentHeader] = currentItems;
          }

          let html = '';
          Object.entries(groupedItems).forEach(([header, items]) => {
            html += `<h3>${header}</h3><ul class="indent">`;
            items.forEach(item => {
              html += `<li>${item}</li>`;
            });
            html += '</ul>';
          });

          return html;
        })()}
            </div>
          ` : ''}
          
          ${summary.stakeholders && summary.stakeholders.length > 0 ? `
            <div class="section">
              <h2>Stakeholders</h2>
              <ul>
                ${summary.stakeholders.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.technicalRequirements && summary.technicalRequirements.length > 0 ? `
            <div class="section">
              <h2>Technical Requirements</h2>
              <ul>
                ${summary.technicalRequirements.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.blockers && summary.blockers.length > 0 ? `
            <div class="section">
              <h2>Blockers & Challenges</h2>
              <ul>
                ${summary.blockers.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.agreements && summary.agreements.length > 0 ? `
            <div class="section">
              <h2>Agreements & Commitments</h2>
              <ul>
                ${summary.agreements.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.timeline && summary.timeline.length > 0 ? `
            <div class="section">
              <h2>Timeline & Milestones</h2>
              <ul>
                ${summary.timeline.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${summary.questionsAnswers && summary.questionsAnswers.length > 0 ? `
            <div class="section">
              <h2>Questions & Answers</h2>
              ${summary.questionsAnswers.map(item => {
          const parts = item.split('\nA:');
          const question = parts[0].replace(/^Q:\s*/, '').replace(/^\d+\.\s*Q:\s*/, '').trim();
          const answer = parts.length > 1 ? parts[1].trim() : '';
          return `
                  <div style="margin-bottom: 15px;">
                    <p class="qa-question">Q: ${question}</p>
                    ${answer ? `<p class="qa-answer">A: ${answer}</p>` : ''}
                  </div>
                `;
        }).join('')}
            </div>
          ` : ''}
          
          ${summary.additionalNotes && summary.additionalNotes.length > 0 ? `
            <div class="section">
              <h2>Additional Notes</h2>
              <ul>
                ${summary.additionalNotes.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      // Close the window after printing (or if print is cancelled)
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 250);
  };

  // Handle download summary as PDF
  const handleDownloadSummary = (summary) => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text(summary.title || 'Untitled Meeting', 20, 20);

    // Add date
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(formatDate(summary.date || summary.createdAt), 20, 30);

    let yPos = 40;

    // Helper function to add a section with bullet points
    const addSection = (title, items, processSubheaders = false) => {
      if (!items || items.length === 0) return;

      // Add new page if needed
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(title, 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(50);

      if (processSubheaders) {
        let currentSubheader = null;

        items.forEach(item => {
          if (item.endsWith(':') || item.endsWith('Do') || item.includes('Customer') || item.includes('Company')) {
            // This is a subheader
            currentSubheader = item;
            doc.setFontSize(14);
            doc.setTextColor(0);

            const lines = doc.splitTextToSize(item, 170);
            doc.text(lines, 20, yPos);
            yPos += lines.length * 7 + 5;

            doc.setFontSize(12);
            doc.setTextColor(50);
          } else {
            // This is a regular item
            const indent = currentSubheader ? 30 : 20;
            const lines = doc.splitTextToSize(`• ${item}`, 160);
            doc.text(lines, indent, yPos);
            yPos += lines.length * 7 + 5;
          }

          // Add new page if needed
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });
      } else {
        items.forEach(item => {
          const lines = doc.splitTextToSize(`• ${item}`, 170);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 7 + 5;

          // Add new page if needed
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });
      }

      yPos += 5;
    };

    // Add context
    if (summary.context) {
      // Add new page if needed
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Context', 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(50);

      const contextLines = doc.splitTextToSize(summary.context, 170);
      doc.text(contextLines, 20, yPos);
      yPos += contextLines.length * 7 + 10;
    }

    // Add all sections in the same order as the modal
    addSection('Objectives', summary.objectives);
    addSection('Key Points', summary.keyPoints, true);
    addSection('Action Items', summary.actionItems, true);
    addSection('Stakeholders', summary.stakeholders);
    addSection('Technical Requirements', summary.technicalRequirements);
    addSection('Blockers & Challenges', summary.blockers);
    addSection('Agreements & Commitments', summary.agreements);
    addSection('Timeline & Milestones', summary.timeline);

    // Add Q&A section
    if (summary.questionsAnswers && summary.questionsAnswers.length > 0) {
      // Add new page if needed
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Questions & Answers', 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(50);

      summary.questionsAnswers.forEach(item => {
        const parts = item.split('\nA:');
        const question = parts[0].replace(/^Q:\s*/, '').replace(/^\d+\.\s*Q:\s*/, '').trim();
        const answer = parts.length > 1 ? parts[1].trim() : '';

        // Add question
        doc.setFontSize(12);
        doc.setTextColor(0);
        const questionLines = doc.splitTextToSize(`Q: ${question}`, 170);
        doc.text(questionLines, 20, yPos);
        yPos += questionLines.length * 7 + 3;

        // Add answer if available
        if (answer) {
          doc.setFontSize(12);
          doc.setTextColor(50);
          const answerLines = doc.splitTextToSize(`A: ${answer}`, 160);
          doc.text(answerLines, 30, yPos);
          yPos += answerLines.length * 7 + 7;
        } else {
          yPos += 7;
        }

        // Add new page if needed
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Add additional notes
    addSection('Additional Notes', summary.additionalNotes);

    // Save the PDF
    doc.save(`${summary.title || 'meeting-summary'}.pdf`);
  };

  // Function to mark a summary as viewed
  const markSummaryAsViewed = (summaryId) => {
    const updatedViewedSummaries = {
      ...viewedSummaries,
      [summaryId]: true
    };
    
    setViewedSummaries(updatedViewedSummaries);
    localStorage.setItem('viewedSummaries', JSON.stringify(updatedViewedSummaries));
  };

  // Handle open summary in modal
  const handleOpenSummary = (summary) => {
    // Mark the summary as viewed
    markSummaryAsViewed(summary.id);
    
    // Set the selected summary and show the modal
    setSelectedSummary(summary);
    setShowSummaryModal(true);
  };

  const renderPagination = () => {
    // Only show pagination if we have summaries
    if (filteredSummaries.length === 0) {
      return null;
    }

    // Calculate total pages based on filtered summaries
    const totalPages = Math.ceil(filteredSummaries.length / summariesPerPage);

    // Create an array of page numbers to display
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6 mb-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="secondary"
            size="sm"
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="secondary"
            size="sm"
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {/* Previous button */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Page numbers */}
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pageNumber === currentPage
                    ? 'bg-primary-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus:z-20 focus:outline-offset-0'
                    }`}
                >
                  {pageNumber}
                </button>
              ))}

              {/* Next button */}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Meeting Summaries</h1>
          {!loading && (
            <p className="text-gray-800">
              {filteredSummaries.length > 0 ? filteredSummaries.length : (summaries.length > 0 ? summaries.length : totalSummaries)} {(filteredSummaries.length === 1 || (filteredSummaries.length === 0 && summaries.length === 1) || (filteredSummaries.length === 0 && summaries.length === 0 && totalSummaries === 1)) ? 'summary' : 'summaries'}
            </p>
          )}
        </div>
      </div>

      {/* AWS Console Alert */}
      {showConsoleAlert && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-md text-blue-700">
                 If the <strong>Processing Audio Files</strong> progress bar doesn't appear in the bottom right corner, please refresh the page.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setShowConsoleAlert(false)}
                  className="inline-flex rounded-md p-1.5 text-blue-500 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center w-full max-w-md">
            <div className="relative flex items-center flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Only clear results if the field is empty
                  if (e.target.value === '') {
                    fetchSummaries();
                  }
                }}
                placeholder="Search summaries..."
                className="w-full rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 h-10 px-4"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    clearSearch();
                    fetchSummaries(); // Immediately fetch summaries when clearing search
                  }}
                  className="absolute right-2 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              className="rounded-l-none h-10"
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Search
            </Button>
          </form>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <Button
              variant="secondary"
              className="h-10 flex items-center"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filter
            </Button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Filter by</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      >
                        <option value="">All dates</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Has action items</label>
                      <input
                        type="checkbox"
                        checked={hasActionItems}
                        onChange={(e) => setHasActionItems(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        filterSummaries();
                        setShowFilters(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Refresh Button - Moved next to Delete */}
          <Button
            variant="primary"
            onClick={() => {
              // Reset search and filters
              setSearchQuery('');
              setDateFilter('');
              setHasActionItems(false);
              setCurrentPage(1);
              setPrevTokens([null]);
              setNextToken(null);
              // Fetch fresh data
              fetchSummaries(null);
            }}
            title="Refresh summaries"
            className="flex items-center h-10"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </Button>

          <Button
            variant="danger"
            onClick={handleDeleteClick}
            disabled={selectedCount === 0}
            className="h-10"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
          className="mb-6"
          autoHideDuration={5000}
        />
      )}

      {/* Error Message */}
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
          className="mb-6"
          autoHideDuration={5000}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center">
            <Loader size="lg" message={searching ? "Searching..." : "Loading summaries..."} />
            <p className="mt-4 text-gray-600 font-medium">Fetching the latest summary data...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && summaries.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No summaries found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? `No results found for "${searchQuery}".` : "Get started by uploading an audio file."}
          </p>
          {searchQuery && (
            <div className="mt-6">
              <Button onClick={clearSearch} variant="secondary">Clear Search</Button>
            </div>
          )}
          {!searchQuery && (
            <div className="mt-6">
              <Link to="/upload">
                <Button>Upload Audio</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Pagination - Moved to top of summaries list */}
      {!loading && filteredSummaries.length > 0 && renderPagination()}

      {/* Summaries List */}
      {!loading && filteredSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getCurrentPageSummaries().map(summary => (
            <Card key={summary.id} className={`relative ${!viewedSummaries[summary.id] ? 'shadow-lg shadow-indigo-100 transform transition-all duration-300 hover:scale-[1.02]' : ''}`}>
              <div className="absolute top-4 left-4">
                <input
                  type="checkbox"
                  checked={!!selectedSummaries[summary.id]}
                  onChange={() => handleCheckboxChange(summary.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              
              {/* New badge - enhanced version with indigo border */}
              {!viewedSummaries[summary.id] && (
                <>
                  {/* Indigo border overlay */}
                  <div className="absolute inset-0 rounded-lg border-2 border-indigo-500 pointer-events-none"></div>
                  
                  {/* Enhanced new badge */}
                  <div className="absolute -top-3 -right-2 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 text-white shadow-md transform rotate-3">
                      <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      NEW
                    </span>
                  </div>
                </>
              )}

              {/* Card content */}
              <div className="pl-8">
                <Link 
                  to={`/summaries/${summary.id}`} 
                  className="block hover:no-underline"
                  onClick={() => markSummaryAsViewed(summary.id)}
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                    {summary.title || 'Untitled Meeting'}
                  </h2>
                </Link>
                <p className="text-sm text-gray-500 mb-4">
                  {summary.date ? formatDate(summary.date) : formatDate(summary.createdAt)}
                </p>

                {summary.context && (
                  <p className="text-gray-700 mb-4 line-clamp-2">{summary.context}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {summary.keyPoints && summary.keyPoints.length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {summary.keyPoints.length} Key Points
                    </span>
                  )}
                  {summary.actionItems && summary.actionItems.length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {summary.actionItems.length} Action Items
                    </span>
                  )}
                  {summary.questionsAnswers && summary.questionsAnswers.length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {summary.questionsAnswers.length} Q&A
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <Link 
                    to={`/summaries/${summary.id}`} 
                    className="text-primary-600 hover:text-primary-800 font-medium"
                    onClick={() => markSummaryAsViewed(summary.id)}
                  >
                    View Details →
                  </Link>

                  {/* Action buttons in bottom right */}
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handlePrintSummary(summary);
                      }}
                      className="text-gray-500 hover:text-gray-700 group relative"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                      </svg>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Print summary
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadSummary(summary);
                      }}
                      className="text-gray-500 hover:text-gray-700 group relative"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Download as PDF
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenSummary(summary);
                      }}
                      className="text-gray-500 hover:text-gray-700 group relative"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Open in modal
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination - Removed from bottom */}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        size="default"
      >
        <div className="flex flex-col items-center p-6 w-full">
          <div className="bg-red-100 p-5 rounded-full mb-8">
            <svg className="h-16 w-16 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <p className="text-xl font-medium text-gray-800 mb-8 text-center">
            {selectedCount === 1
              ? "Are you sure that you want to delete this summary?"
              : "Are you sure that you want to delete these summaries?"}
          </p>

          <div className="bg-yellow-50 p-5 mb-8 text-center w-full">
            <p className="text-lg text-yellow-700">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-center space-x-8 w-full">
            <Button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteInProgress}
              className="px-10 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-1/3"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={deleteInProgress}
              className="px-10 py-3 text-lg w-1/3"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Summary Modal */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title=""
        size="xl"
        titleClassName=""
        headerContent={
          <div className="flex justify-between items-center w-full">
            <h2 className="text-3xl font-bold text-gray-900">
              {selectedSummary?.title || 'Meeting Summary'}
              {selectedSummary && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedSummary.date || selectedSummary.createdAt)}
                </p>
              )}
            </h2>
            <div className="flex space-x-2">
              <Button
                onClick={() => selectedSummary && handlePrintSummary(selectedSummary)}
                size="md"
                variant="primary"
                className="w-36 flex items-center justify-center text-base"
              >
                <svg className="h-4 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                Print
              </Button>
              <Button
                onClick={() => selectedSummary && handleDownloadSummary(selectedSummary)}
                size="md"
                variant="primary"
                className="w-36 flex items-center justify-center text-base"
              >
                <svg className="h-4 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download
              </Button>
              <Button
                variant="dark"
                onClick={() => setShowSummaryModal(false)}
                size="md"
                className="w-36 flex items-center justify-center text-base"
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedSummary && (
          <div className="max-h-[80vh] overflow-y-auto w-full max-w-6xl mx-auto">
            {/* Context */}
            {selectedSummary.context && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Context</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <p className="text-gray-700 leading-relaxed">{selectedSummary.context}</p>
                </div>
              </div>
            )}

            {/* Objectives */}
            {selectedSummary.objectives && selectedSummary.objectives.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Objectives</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.objectives.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Key Points */}
            {selectedSummary.keyPoints && selectedSummary.keyPoints.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Key Points</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  {selectedSummary.keyPoints.map((item, index) => {
                    if (item.endsWith(':')) {
                      return (
                        <div key={index} className="mt-4 mb-2">
                          <h4 className="font-bold text-gray-800">{item}</h4>
                        </div>
                      );
                    } else {
                      const prevItem = index > 0 ? selectedSummary.keyPoints[index - 1] : null;
                      const isPrevItemHeader = prevItem && prevItem.endsWith(':');

                      if (isPrevItemHeader) {
                        return (
                          <div key={index} className="pl-8 flex items-start mb-2">
                            <span className="text-gray-800 mr-2 mt-1 flex-shrink-0">•</span>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="flex items-start mb-2">
                            <span className="text-gray-800 mr-2 mt-1 flex-shrink-0">•</span>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        );
                      }
                    }
                  })}
                </div>
              </div>
            )}

            {/* Action Items */}
            {selectedSummary.actionItems && selectedSummary.actionItems.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Action Items</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  {(() => {
                    // Group action items by headers
                    const groupedItems = {};
                    let currentHeader = null;
                    let currentItems = [];

                    selectedSummary.actionItems.forEach(item => {
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
                      <div className="space-y-4">
                        {Object.entries(groupedItems).map(([header, items], index) => (
                          <div key={index}>
                            <h4 className="font-bold text-gray-800 mb-2">{header}</h4>
                            <ul className="space-y-2">
                              {items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start pl-8">
                                  <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Stakeholders */}
            {selectedSummary.stakeholders && selectedSummary.stakeholders.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Stakeholders</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.stakeholders.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Technical Requirements */}
            {selectedSummary.technicalRequirements && selectedSummary.technicalRequirements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Technical Requirements</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.technicalRequirements.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Blockers */}
            {selectedSummary.blockers && selectedSummary.blockers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Blockers & Challenges</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.blockers.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Agreements */}
            {selectedSummary.agreements && selectedSummary.agreements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Agreements & Commitments</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.agreements.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Timeline */}
            {selectedSummary.timeline && selectedSummary.timeline.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Timeline & Milestones</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.timeline.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}


            {/* Questions & Answers */}
            {selectedSummary.questionsAnswers && selectedSummary.questionsAnswers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Questions & Answers</h3>
                <div className="space-y-4">
                  {selectedSummary.questionsAnswers.map((item, index) => {
                    const parts = item.split('\nA:');
                    const question = parts[0].replace(/^Q:\s*/, '').replace(/^\d+\.\s*Q:\s*/, '').trim();
                    const answer = parts.length > 1 ? parts[1].trim() : '';

                    return (
                      <div key={index} className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex items-start">
                          <span className="text-gray-800 font-bold mr-2">Q:</span>
                          <p className="font-medium text-gray-900">{question}</p>
                        </div>
                        {answer && (
                          <div className="mt-3 ml-6 pl-4 border-l-4 border-gray-200 py-2">
                            <div className="flex items-start">
                              <span className="text-gray-800 font-bold mr-2">A:</span>
                              <p className="text-gray-700">{answer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {selectedSummary.additionalNotes && selectedSummary.additionalNotes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Additional Notes</h3>
                <div className="bg-gray-100 rounded-lg shadow-sm border border-gray-200 p-5">
                  <ul className="space-y-2">
                    {selectedSummary.additionalNotes.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-800 mr-2 flex-shrink-0">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
          </div>
        )}
      </Modal>

    </div>
  )
}
// Helper function to format dates
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

export default SummaryList;
// Filter summaries based on search query and filters
