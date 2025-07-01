import React from 'react';
import { Pie } from 'react-chartjs-2';

// Constants for pie charts - using indigo shades
const LANGUAGE_COLORS = {
  en: 'rgba(79, 70, 229, 1)',      // indigo-600
  es: 'rgba(99, 102, 241, 1)',      // indigo-500
  fr: 'rgba(129, 140, 248, 1)',     // indigo-400
  de: 'rgba(165, 180, 252, 1)',     // indigo-300
  zh: 'rgba(199, 210, 254, 1)',     // indigo-200
  ar: 'rgba(224, 231, 255, 1)',     // indigo-100
  other: 'rgba(67, 56, 202, 1)'     // indigo-700
};

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ar: 'Arabic',
  other: 'Other'
};

const LanguagePieChart = ({ meetings }) => {
  // Count meetings by language
  const languageCounts = {};
  
  // Process all languages from LANGUAGE_NAMES
  Object.keys(LANGUAGE_NAMES).forEach(lang => {
    languageCounts[lang] = 0;
  });
  
  // Count actual meetings by language
  if (meetings && Array.isArray(meetings)) {
    meetings.forEach(meeting => {
      let lang = 'other';
      if (meeting.language) {
        const langStr = typeof meeting.language === 'string' ? 
          meeting.language : 
          (meeting.language?.S || '');
        
        // Extract first two characters as language code
        lang = langStr.substring(0, 2).toLowerCase();
        
        // If not in our known languages, use 'other'
        if (!LANGUAGE_NAMES[lang]) {
          lang = 'other';
        }
      }
      
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
  }
  
  // Prepare chart data - include all languages even if zero
  const languageCodes = Object.keys(LANGUAGE_NAMES);
  const languageLabels = languageCodes.map(code => LANGUAGE_NAMES[code]);
  const languageColors = languageCodes.map(code => LANGUAGE_COLORS[code]);
  const languageData = languageCodes.map(code => languageCounts[code] || 0);
  
  const languageChartData = {
    labels: languageLabels,
    datasets: [{
      data: languageData,
      backgroundColor: languageColors,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderWidth: 2,
    }],
  };
  
  // Calculate total meetings
  const totalMeetings = languageData.reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center mb-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="p-2 bg-indigo-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">Meeting Languages Distribution</h3>
      </div>
      
      <div className="flex-grow flex p-4">
        {totalMeetings > 0 ? (
          <>
            {/* Chart takes 55% width */}
            <div className="w-[55%] h-full flex justify-start">
              <div className="w-[90%] h-full">
                <Pie
                  data={languageChartData}
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
                            // Return the label as the title with default bold styling
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
            
            {/* Legend takes 45% width */}
            <div className="w-[45%] h-full overflow-auto flex flex-col justify-center">
              <div className="space-y-2">
                {languageLabels.map((label, index) => (
                  <div key={label} className="flex items-center">
                    <div 
                      className="w-3 h-3 mr-2 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: languageColors[index] }}
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
              <p className="mt-2 text-gray-500">No language data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguagePieChart;
