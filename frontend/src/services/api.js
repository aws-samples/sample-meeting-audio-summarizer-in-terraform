import { generateClient } from 'aws-amplify/api';
import * as queries from '../graphql/queries';
import * as mutations from '../graphql/mutations';

// Create a GraphQL client
const client = generateClient();

// Upload audio file
export const uploadAudio = async (file, onProgress) => {
  try {
    
    // Add local timestamp
    const localTimestamp = new Date().toISOString();
    
    // Get pre-signed URL using GraphQL mutation
    const response = await client.graphql({
      query: mutations.getUploadUrl,
      variables: { 
        filename: file.name,
        contentType: file.type,
        localTimestamp: localTimestamp  // Add local timestamp
      }
    });
    
    const { uploadUrl, fileKey } = response.data.getUploadUrl;
    
    // Upload file to S3 using pre-signed URL
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    
    // Set up progress tracking
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }
    
    // Create a promise to handle the upload
    const uploadPromise = new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
    });
    
    // Start the upload
    xhr.send(file);
    await uploadPromise;
    
    return {
      success: true,
      fileKey: fileKey
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get list of summaries
export const getSummaries = async (limit = 20, nextToken = null) => {
  try {
    const response = await client.graphql({
      query: queries.getSummaries,
      variables: { limit, nextToken }
    });
    
    
    // Check if the response has the expected structure
    if (response?.data?.getSummaries) {
      return response.data.getSummaries;
    } else {
      console.warn('Unexpected response structure from getSummaries:', response);
      
      // Try to handle different response structures
      if (response?.data) {
        // If there's any data in the response, try to extract items
        const possibleData = Object.values(response.data).find(value => value && typeof value === 'object');
        if (possibleData && Array.isArray(possibleData.items)) {
          return possibleData;
        }
        
        // If there's an array directly in the data
        const arrayData = Object.values(response.data).find(value => Array.isArray(value));
        if (arrayData) {
          return { items: arrayData, nextToken: null };
        }
      }
      
      // Generate mock data with pagination support
      const mockData = [];
      
      // Create different mock data based on the nextToken to simulate pagination
      const pageNumber = nextToken ? parseInt(nextToken) : 0;
      
      // Only generate data for pages 0 and 1 (first and second page)
      if (pageNumber <= 1) {
        for (let i = 1; i <= 4; i++) {
          const itemNumber = pageNumber * 4 + i;
          mockData.push({
            id: `sample-${itemNumber}`,
            title: `Sample Meeting ${itemNumber}`,
            date: new Date().toISOString(),
            context: `This is sample meeting summary ${itemNumber}.`,
            keyPoints: [`Key point ${itemNumber}.1`, `Key point ${itemNumber}.2`, `Key point ${itemNumber}.3`],
            actionItems: [`Action item ${itemNumber}.1`, `Action item ${itemNumber}.2`],
            createdAt: new Date().toISOString()
          });
        }
      }
      
      // Only provide nextToken for the first page (page 0)
      const mockNextToken = pageNumber === 0 ? "1" : null;
      
      return { 
        items: mockData, 
        nextToken: mockNextToken
      };
    }
  } catch (error) {
    console.error('Error fetching summaries:', error);
    
    // Return empty data in case of error
    console.log("Returning empty data due to error");
    return { 
      items: [],
      nextToken: null
    };
  }
};

// Get a specific summary by ID
export const getSummaryById = async (summaryId) => {
  try {
    const response = await client.graphql({
      query: queries.getSummary,
      variables: { id: summaryId }
    });
    
    
    // Check if the response has the expected structure
    if (response?.data?.getSummary) {
      return response.data.getSummary;
    } else {
      console.warn('Unexpected response structure from getSummary:', response);
      
      // Try to handle different response structures
      if (response?.data) {
        // If there's any data in the response, try to extract the summary
        const possibleSummary = Object.values(response.data).find(value => value && typeof value === 'object' && value.id);
        if (possibleSummary) {
       return possibleSummary;
        }
      }
      
  
      return {
        id: summaryId,
        title: "Sample Meeting Detail",
        date: new Date().toISOString(),
        context: "This is a sample meeting detail to demonstrate the UI when the API fails.",
        objectives: ["Discuss project status", "Plan next steps"],
        keyPoints: ["Key point 1", "Key point 2", "Key point 3"],
        actionItems: ["Action item 1", "Action item 2"],
        questionsAnswers: ["Q: What is the timeline?\nA: We're aiming to complete by end of quarter."],
        createdAt: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error(`Error fetching summary ${summaryId}:`, error);
    
    // Fallback to mock data in case of error
    return {
      id: summaryId,
      title: "Sample Meeting Detail (Error Fallback)",
      date: new Date().toISOString(),
      context: "This is a fallback sample due to an error fetching real data.",
      objectives: ["Demonstrate error handling", "Show fallback UI"],
      keyPoints: ["API error occurred", "Using fallback data"],
      actionItems: ["Check API configuration", "Verify authentication"],
      questionsAnswers: ["Q: Why am I seeing this?\nA: There was an error fetching the real meeting data."],
      createdAt: new Date().toISOString()
    };
  }
};

// Search summaries
export const searchSummaries = async (query) => {
  try {
    const response = await client.graphql({
      query: queries.searchSummaries,
      variables: { query }
    });
    
    
    // Check if the response has the expected structure
    if (response?.data?.searchSummaries) {
      return response.data.searchSummaries;
    } else {
      console.warn('Unexpected response structure from searchSummaries:', response);
      
      // Try to handle different response structures
      if (response?.data) {
        // If there's any data in the response, try to extract items
        const possibleData = Object.values(response.data).find(value => Array.isArray(value));
        if (possibleData) {
          return possibleData;
        }
      }
      
      // Create a comprehensive list of all mock data across all pages
      const allMockData = [];
      
      // Generate mock data for all pages (0, 1, 2)
      for (let pageNumber = 0; pageNumber <= 2; pageNumber++) {
        for (let i = 1; i <= 4; i++) {
          const itemNumber = pageNumber * 4 + i;
          allMockData.push({
            id: `sample-${itemNumber}`,
            title: `Sample Meeting ${itemNumber}`,
            date: new Date().toISOString(),
            context: `This is sample meeting summary ${itemNumber}.`,
            keyPoints: [`Key point ${itemNumber}.1`, `Key point ${itemNumber}.2`, `Key point ${itemNumber}.3`],
            actionItems: [`Action item ${itemNumber}.1`, `Action item ${itemNumber}.2`],
            createdAt: new Date().toISOString()
          });
        }
      }
      
      // Filter the mock data based on the search query
      const lowercaseQuery = query.toLowerCase();
      const searchResults = allMockData.filter(item => 
        (item.title && item.title.toLowerCase().includes(lowercaseQuery)) ||
        (item.context && item.context.toLowerCase().includes(lowercaseQuery)) ||
        (item.keyPoints && item.keyPoints.some(point => point.toLowerCase().includes(lowercaseQuery))) ||
        (item.actionItems && item.actionItems.some(action => action.toLowerCase().includes(lowercaseQuery)))
      );
      
      return searchResults;
    }
  } catch (error) {
    console.error('Error searching summaries:', error);
    return []; // Return empty array on error
  }
};

// Get statistics
export const getStatistics = async () => {
  try {
    const response = await client.graphql({
      query: queries.getStatistics
    });
    
    // Check if the response has the expected structure
    if (response?.data?.getStatistics) {
      const data = response.data.getStatistics;
      
      // Parse meetingsByDay if it's a string
      if (data.meetingsByDay && typeof data.meetingsByDay === 'string') {
        try {
          data.meetingsByDay = JSON.parse(data.meetingsByDay);
        } catch (e) {
          console.error('Error parsing meetingsByDay:', e);
          data.meetingsByDay = {
            "Monday": 0, "Tuesday": 0, "Wednesday": 0, 
            "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
          };
        }
      } else if (!data.meetingsByDay) {
        data.meetingsByDay = {
          "Monday": 0, "Tuesday": 0, "Wednesday": 0, 
          "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
        };
      }
      
      // Ensure meetingsByMonth is an array
      if (!Array.isArray(data.meetingsByMonth)) {
        if (typeof data.meetingsByMonth === 'string') {
          try {
            data.meetingsByMonth = JSON.parse(data.meetingsByMonth);
          } catch (e) {
            console.error('Error parsing meetingsByMonth:', e);
            data.meetingsByMonth = [];
          }
        } else {
          data.meetingsByMonth = [];
        }
      }
      
      // Ensure meetings is an array
      if (!Array.isArray(data.meetings)) {
        if (typeof data.meetings === 'string') {
          try {
            data.meetings = JSON.parse(data.meetings);
          } catch (e) {
            console.error('Error parsing meetings:', e);
            data.meetings = [];
          }
        } else {
          data.meetings = [];
        }
      }
      
      // Ensure meetings is an array
      if (!Array.isArray(data.meetings)) {
        if (typeof data.meetings === 'string') {
          try {
            data.meetings = JSON.parse(data.meetings);
          } catch (e) {
            console.error('Error parsing meetings:', e);
            data.meetings = [];
          }
        } else {
          data.meetings = [];
        }
      }
      
      // Process meetings data to ensure language and meetingType are accessible
      if (Array.isArray(data.meetings)) {
        data.meetings = data.meetings.map(meeting => {
          const processedMeeting = { ...meeting };
          
          // Process language field if it's in DynamoDB format
          if (meeting.language && typeof meeting.language === 'object' && meeting.language.S) {
            processedMeeting.language = meeting.language.S;
          }
          
          // Process meetingType field if it's in DynamoDB format
          if (meeting.meetingType && typeof meeting.meetingType === 'object' && meeting.meetingType.S) {
            processedMeeting.meetingType = meeting.meetingType.S;
          } else if (!meeting.meetingType) {
            processedMeeting.meetingType = 'Other';
          }
          
          return processedMeeting;
        });
      }
      
      return data;
    } else {
      console.warn('Unexpected response structure from getStatistics:', response);
      // Return default values instead of throwing an error
      return {
        totalMeetings: 0,
        totalDuration: "0 min",
        averageDuration: "0 min",
        longestMeeting: "0 min",
        topKeywords: [],
        meetingsByMonth: [],
        meetingsByDay: {
          "Monday": 0, "Tuesday": 0, "Wednesday": 0, 
          "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
        },
        meetings: []
      };
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
    // Return default values on error instead of throwing
    return {
      totalMeetings: 0,
      totalDuration: "0 min",
      averageDuration: "0 min",
      longestMeeting: "0 min",
      topKeywords: [],
      meetingsByMonth: [],
      meetingsByDay: {
        "Monday": 0, "Tuesday": 0, "Wednesday": 0, 
        "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
      },
      meetings: []
    };
  }
};
// Delete summaries
export const deleteSummary = async (summaryId) => {
  try {
    
    // Direct API call to delete the summary
    const response = await fetch(`/api/summaries/${summaryId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting summary:', error);
    throw error;
  }
};
