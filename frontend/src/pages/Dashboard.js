import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { getSummaries, getStatistics } from '../services/api';
import { Pie } from 'react-chartjs-2';
import MeetingTypePieChart from './pie-charts/MeetingTypePieChart';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { fetchUserAttributes } from 'aws-amplify/auth';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summariesData, statsData] = await Promise.all([
          getSummaries(),
          getStatistics()
        ]);

        // Process summaries and enhance with duration data from statistics
        let processedSummaries = [];
        if (summariesData && summariesData.items && Array.isArray(summariesData.items)) {
          processedSummaries = summariesData.items.slice(0, 5);
        } else if (Array.isArray(summariesData)) {
          processedSummaries = summariesData.slice(0, 5);
        } else {
          console.warn('Unexpected summaries data format:', summariesData);
          processedSummaries = [];
        }

        // If we have meetings data from statistics, enhance summaries with actual durations
        if (statsData && statsData.meetings && Array.isArray(statsData.meetings)) {
          // Create a map of meeting IDs and titles to durations for quick lookup
          const meetingDurations = {};
          const meetingTitleToDuration = {};
          
          statsData.meetings.forEach(meeting => {
            if (meeting.meetingId) {
              meetingDurations[meeting.meetingId] = meeting.duration;
            }
            
            if (meeting.title) {
              meetingTitleToDuration[meeting.title] = meeting.duration;
            }
          });
          
          // Enhance summaries with actual durations from meetings data
          processedSummaries = processedSummaries.map(summary => {
            // Try to find a matching meeting ID first
            if (summary.id && meetingDurations[summary.id] !== undefined) {
              return {
                ...summary,
                duration: meetingDurations[summary.id]
              };
            }
            
            // If no ID match, try to match by title
            if (summary.title && meetingTitleToDuration[summary.title] !== undefined) {
              return {
                ...summary,
                duration: meetingTitleToDuration[summary.title]
              };
            }
            
            return summary;
          });
        }

        setSummaries(processedSummaries);
        setStats(statsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchUserEmail = async () => {
      let attributes = await fetchUserAttributes()
      try {
        if (attributes.email) {
          const userEmail = attributes.email.split("@")[0]
          setUser(userEmail)
        }
      } catch (error) {
        console.log("Error fetching user's attributes", error)
      }
    }
    fetchUserEmail()
  }, [])

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

  // We don't need this fake data anymore as we'll use real data from DynamoDB
  // const meetingTypeData = {
  //   labels: ['Team Meetings', 'Client Meetings', 'Planning Sessions', 'Other'],
  //   datasets: [
  //     {
  //       data: [stats?.teamMeetings || 3, stats?.clientMeetings || 1, stats?.planningSessions || 1, stats?.otherMeetings || 0],
  //       backgroundColor: [
  //         'rgba(79, 70, 229, 1)',
  //         'rgba(79, 70, 229, 0.8)',
  //         'rgba(79, 70, 229, 0.6)',
  //         'rgba(79, 70, 229, 0.4)'
  //       ],
  //       borderColor: [
  //         'rgba(79, 70, 229, 1)',
  //         'rgba(79, 70, 229, 0.8)',
  //         'rgba(79, 70, 229, 0.6)',
  //         'rgba(79, 70, 229, 0.4)'
  //       ],
  //       borderWidth: 1,
  //     },
  //   ],
  // };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center">
          <Loader size="lg" message={"Loading dashboard..."} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6 rounded-lg">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full mr-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome, {user || 'User'}!</h1>
                <p className="text-gray-600 mt-1">
                  Upload audio recordings and get AI-powered summaries using Amazon Bedrock and Amazon Transcribe.
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Link to="/upload">
                <Button variant="primary" className="flex items-center bg-indigo-600 hover:bg-indigo-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  Upload New Audio
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Upload Audio</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-gray-600">Upload MP3 files for transcription and AI-powered summarization.</p>
              <div className="mt-6">
                <Link to="/upload">
                  <Button variant="outline" className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                    Upload Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">View Summaries</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-gray-600">Browse and search through all your meeting summaries.</p>
              <div className="mt-6">
                <Link to="/summaries">
                  <Button variant="outline" className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
            <div className="p-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Statistics</h3>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-gray-600">View analytics and insights from your meeting data.</p>
              <div className="mt-6">
                <Link to="/statistics">
                  <Button variant="outline" className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                    View Stats
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Recent Summaries
              </h2>
            </div>
            <div className="p-6">
              {summaries.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {summaries.map((summary) => (
                    <div key={summary.id} className="py-4 first:pt-0 last:pb-0">
                      <h4 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                        <Link to={`/summaries/${summary.id}`}>
                          {summary.title || 'Untitled Meeting'}
                        </Link>
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center">
                          <svg className="h-3 w-3 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          {formatDate(summary.date || summary.createdAt)}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full flex items-center">
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {formatDuration(summary.duration)}
                        </span>
                        {summary.actionItems && summary.actionItems.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            {summary.actionItems.length} Action Items
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link to={`/summaries/${summary.id}`}>
                          <Button variant="outline" size="sm" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                            View Summary
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="mt-2 text-gray-500">No summaries available yet.</p>
                  <Link to="/upload">
                    <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">Upload Your First Audio</Button>
                  </Link>
                </div>
              )}
              {summaries.length > 0 && (
                <div className="mt-6 text-center">
                  <Link to="/summaries">
                    <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                      View All Summaries
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden flex flex-col" style={{ minheight: '800px' }}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Meeting Statistics
              </h2>
            </div>
            <div className="p-6 flex-grow">
              {stats ? (
                <div className="flex flex-col h-full justify-between">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-300">
                      <p className="text-sm text-gray-500">Total Meetings</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMeetings || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-300">
                      <p className="text-sm text-gray-500">Total Duration</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(stats.totalDuration ? parseInt(stats.totalDuration) : 0)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-300">
                      <p className="text-sm text-gray-500">Avg. Meeting Length</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(stats.averageDuration ? parseInt(stats.averageDuration) : 0)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-300">
                      <p className="text-sm text-gray-500">Longest Meeting</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(stats.longestMeeting ? parseInt(stats.longestMeeting) : 0)}</p>
                    </div>
                    </div>
                  </div>

                  <div className="h-[400px] p-4 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                    <MeetingTypePieChart meetings={stats.meetings || []} />
                  </div>

                  <div className="text-center mt-auto pt-6">
                    <Link to="/statistics">
                      <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                        View Detailed Statistics
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <p className="mt-2 text-gray-500">No statistics available yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Upload audio files to generate statistics</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default Dashboard;
