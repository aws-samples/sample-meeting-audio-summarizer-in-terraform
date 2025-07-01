import React from 'react';
import { Pie } from 'react-chartjs-2';

// Constants for meeting type colors - using indigo shades
const MEETING_TYPE_COLORS = {
  'Client Meeting': 'rgba(79, 70, 229, 1)',         // indigo-600
  'Team Meeting': 'rgba(99, 102, 241, 1)',          // indigo-500
  'Technical Meeting': 'rgba(129, 140, 248, 1)',    // indigo-400
  'Training Session': 'rgba(165, 180, 252, 1)',     // indigo-300
  'Status Update': 'rgba(199, 210, 254, 1)',        // indigo-200
  'Brainstorming Session': 'rgba(224, 231, 255, 1)', // indigo-100
  'Review Meeting': 'rgba(67, 56, 202, 1)',         // indigo-700
  'External Stakeholder Meeting': 'rgba(55, 48, 163, 1)', // indigo-800
  'Decision Making Meeting': 'rgba(49, 46, 129, 1)', // indigo-900
  'Problem Solving Meeting': 'rgba(79, 70, 229, 0.7)', // indigo-600 with opacity
  'Other': 'rgba(79, 70, 229, 0.4)'                 // indigo-600 with more opacity
};

const MeetingTypePieChart = ({ meetings }) => {
  // Count meetings by type
  const typeCounts = {};
  
  // Process all meeting types from MEETING_TYPE_COLORS
  Object.keys(MEETING_TYPE_COLORS).forEach(type => {
    typeCounts[type] = 0;
  });
  
  // Enhanced function to get meeting type with better matching
  const getMeetingType = (meeting) => {
    if (!meeting.meetingType) {
      return 'Other';
    }
    
    // Handle both string and object formats - DynamoDB returns objects with S property
    let rawType;
    if (typeof meeting.meetingType === 'string') {
      rawType = meeting.meetingType;
    } else if (meeting.meetingType.S) {
      rawType = meeting.meetingType.S;
    } else {
      rawType = 'Other';
    }
    
    // Check for exact matches first
    if (MEETING_TYPE_COLORS[rawType]) {
      return rawType;
    }
    
    // Try case-insensitive matching
    const typeKeys = Object.keys(MEETING_TYPE_COLORS);
    const matchedKey = typeKeys.find(key => 
      key.toLowerCase() === rawType.toLowerCase()
    );
    
    if (matchedKey) {
      return matchedKey;
    }
    
    // Check if it contains any of our known types
    const partialMatch = typeKeys.find(key => 
      rawType.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(rawType.toLowerCase())
    );
    
    if (partialMatch) {
      return partialMatch;
    }
    
    // Default to Other if no match found
    return 'Other';
  };
  
  // Count actual meetings by type
  if (meetings && Array.isArray(meetings)) {
    meetings.forEach(meeting => {
      const type = getMeetingType(meeting);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
  }
  
  // Prepare data for pie chart - include all types even if zero
  const typeLabels = Object.keys(MEETING_TYPE_COLORS);
  const typeColors = typeLabels.map(type => MEETING_TYPE_COLORS[type]);
  const typeData = typeLabels.map(type => typeCounts[type] || 0);
  
  const typeChartData = {
    labels: typeLabels,
    datasets: [{
      data: typeData,
      backgroundColor: typeColors,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
    }],
  };
  
  // Calculate total meetings
  const totalMeetings = typeData.reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center mb-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="p-2 bg-indigo-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">Meeting Types Distribution</h3>
      </div>
      
      <div className="flex-grow flex p-4">
        {totalMeetings > 0 ? (
          <>
            {/* Chart takes 50% width instead of 55% */}
            <div className="w-[50%] h-full flex justify-center">
              <div className="w-[90%] h-full">
                <Pie
                  data={typeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#111827',
                        bodyColor: '#4B5563',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        titleFont: {
                          family: "'Inter', sans-serif",
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          family: "'Inter', sans-serif",
                          size: 13
                        },
                        callbacks: {
                          title: function(context) {
                            return context[0].label;
                          },
                          label: function(context) {
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                  }}
                />
              </div>
            </div>
            
            {/* Legend takes 50% width instead of 45% and adds padding to move it more to the right */}
            <div className="w-[50%] h-full overflow-auto flex flex-col justify-center pl-6">
              <div className="space-y-2">
                {typeLabels.map((label, index) => (
                  <div key={label} className="flex items-center">
                    <div 
                      className="w-3 h-3 mr-2 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: typeColors[index] }}
                    ></div>
                    <span className="text-xs text-gray-700">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mt-2 text-gray-500">No meeting type data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingTypePieChart;
