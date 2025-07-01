import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import Alert from '../components/ui/Alert';
import { getStatistics } from '../services/api';
import { Bar } from 'react-chartjs-2';
import LanguagePieChart from './pie-charts/LanguagePieChart';
import MeetingTypePieChart from './pie-charts/MeetingTypePieChart';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshing(true);

      const data = await getStatistics();

      // Parse meetingsByDay if it's a string
      if (data && data.meetingsByDay && typeof data.meetingsByDay === 'string') {
        try {
          data.meetingsByDay = JSON.parse(data.meetingsByDay);
        } catch (e) {
          console.error('Error parsing meetingsByDay:', e);
          data.meetingsByDay = {
            "Monday": 0,
            "Tuesday": 0,
            "Wednesday": 0,
            "Thursday": 0,
            "Friday": 0,
            "Saturday": 0,
            "Sunday": 0
          };
        }
      }

      // Ensure meetingsByMonth is an array
      if (data && !Array.isArray(data.meetingsByMonth)) {
        data.meetingsByMonth = [];
      }

      // Ensure topKeywords is an array
      if (data && !Array.isArray(data.topKeywords)) {
        data.topKeywords = [];
      }

      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load statistics. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const handleRefresh = () => {
    fetchStatistics();
  };

  // Format duration to show hours if > 60 minutes
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '30 min';
    
    const mins = parseInt(minutes);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours} hr${hours > 1 ? 's' : ''}${remainingMins > 0 ? ` ${remainingMins} min` : ''}`;
    } else {
      return `${mins} min`;
    }
  };
  const formatLastUpdated = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" message="Loading statistics..." />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Alert
        type="error"
        message={error}
        className="mb-6"
      />
    );
  }

  // Instead of showing "No statistics available", we'll use default values
  if (!stats) {
    // Create default stats object with zero values
    const defaultStats = {
      totalMeetings: 0,
      totalDuration: "0 min",
      averageDuration: "0 min",
      longestMeeting: "0 min",
      topKeywords: [],
      meetingsByMonth: [],
      meetingsByDay: {
        "Monday": 0, "Tuesday": 0, "Wednesday": 0,
        "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0
      }
    };

    // Use these default stats instead of showing the "No statistics available" message
    setStats(defaultStats);

    // Show a loading indicator while we're setting the default stats
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" message="Preparing statistics..." />
      </div>
    );
  }

  // Prepare data for charts
  const meetingsByMonthData = {
    labels: stats.meetingsByMonth ? stats.meetingsByMonth.map(item => item.month) : [],
    datasets: [
      {
        label: 'Meetings',
        data: stats.meetingsByMonth ? stats.meetingsByMonth.map(item => item.count) : [],
        backgroundColor: 'rgba(79, 70, 229, 1)', // Updated to solid indigo-600
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for day of week chart - ensure correct order of days
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayValues = daysOfWeek.map(day => (stats.meetingsByDay && stats.meetingsByDay[day]) || 0);

  const meetingsByDayData = {
    labels: daysOfWeek,
    datasets: [
      {
        label: 'Meetings',
        data: dayValues,
        backgroundColor: 'rgba(79, 70, 229, 1)', // Updated to indigo-600
        borderColor: 'rgba(79, 70, 229, 1)',     // Updated to indigo-600
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#6B7280',
          font: {
            family: "'Inter', sans-serif",
          }
        },
        grid: {
          color: 'rgba(243, 244, 246, 1)',
          borderDash: [5, 5],
        }
      },
      x: {
        ticks: {
          color: '#6B7280',
          font: {
            family: "'Inter', sans-serif",
          }
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            family: "'Inter', sans-serif",
            size: 12
          }
        }
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
        displayColors: false
      }
    },
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6 rounded-lg">
      {refreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center">
            <Loader size="lg" message="Refreshing statistics..." />
            <p className="mt-4 text-gray-600 font-medium">Fetching the latest meeting data...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <svg className="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Meeting Analytics
            </h1>
            <p className="text-gray-600 ml-11">
              Insights and trends from your meeting summaries
            </p>
          </div>
          <div className="flex flex-col items-end mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center px-4 py-2 rounded-lg text-white font-medium transition-all ${refreshing
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh Analytics
            </button>
            {lastUpdated && (
              <span className="text-sm text-gray-500 mt-1">
                Last updated: {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Total Meetings</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-4">{stats.totalMeetings}</p>
              <p className="text-sm text-gray-500 mt-1">Total meetings processed</p>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Total Duration</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-4">{formatDuration(stats.totalDuration ? parseInt(stats.totalDuration) : 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Cumulative meeting time</p>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Average Duration</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-4">{formatDuration(stats.averageDuration ? parseInt(stats.averageDuration) : 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Average meeting length</p>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Longest Meeting</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-4">{formatDuration(stats.longestMeeting ? parseInt(stats.longestMeeting) : 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Duration of longest meeting</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Meetings by Month
              </h2>
            </div>
            <div className="p-6">
              <div className="h-80">
                {stats.meetingsByMonth && stats.meetingsByMonth.length > 0 && stats.meetingsByMonth.some(item => item.count > 0) ? (
                  <Bar data={meetingsByMonthData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p className="mt-2 text-gray-500">No monthly data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Meetings by Day of Week
              </h2>
            </div>
            <div className="p-6">
              <div className="h-80">
                {stats.meetingsByDay && Object.values(stats.meetingsByDay).some(val => val > 0) ? (
                  <Bar data={meetingsByDayData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p className="mt-2 text-gray-500">No daily data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Add pie charts for language and meeting type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-0">
            <div className="h-96">
              <LanguagePieChart meetings={stats.meetings || []} />
            </div>
          </Card>
          
          <Card className="p-0">
            <div className="h-96">
              <MeetingTypePieChart meetings={stats.meetings || []} />
            </div>
          </Card>
        </div>
{/*         
        Total Meetings Card
        <div className="mb-8">
          <Card>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-700">
                Total Meetings: {stats.totalMeetings || 0}
              </div>
            </div>
          </Card>
        </div> */}

        <div className="text-center mb-8">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`inline-flex items-center px-6 py-3 rounded-lg text-white font-medium text-lg transition-all ${refreshing
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Update Analytics with Latest Meeting Data
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Click to refresh statistics and include newly processed meetings
          </p>
        </div>
      </div>
    </div>
  );
 };

export default Statistics;