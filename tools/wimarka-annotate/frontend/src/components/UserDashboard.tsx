import React, { useState, useEffect } from 'react';
import { annotationsAPI, sentencesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Annotation } from '../types';
import { 
  Home, 
  FileText, 
  BarChart3, 
  Clock, 
  Star, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Trophy
} from 'lucide-react';

interface UserStats {
  totalAnnotations: number;
  completedAnnotations: number;
  inProgressAnnotations: number;
  averageQualityScore: number;
  totalTimeSpent: number;
  annotationsThisWeek: number;
  streak: number;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'annotate' | 'history'>('home');
  const [availableSentences, setAvailableSentences] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [annotationsData, sentencesData] = await Promise.all([
        annotationsAPI.getMyAnnotations(),
        sentencesAPI.getUnannotatedSentences(0, 1) // Just to get count
      ]);
      
      setAnnotations(annotationsData);
      
      // Calculate statistics
      const totalAnnotations = annotationsData.length;
      const completedAnnotations = annotationsData.filter(a => a.annotation_status === 'completed').length;
      const inProgressAnnotations = annotationsData.filter(a => a.annotation_status === 'in_progress').length;
      
      const scoresWithValues = annotationsData.filter(a => a.overall_quality);
      const averageQualityScore = scoresWithValues.length > 0 
        ? scoresWithValues.reduce((acc, a) => acc + (a.overall_quality || 0), 0) / scoresWithValues.length
        : 0;
      
      const totalTimeSpent = annotationsData.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);
      
      // Calculate this week's annotations
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const annotationsThisWeek = annotationsData.filter(a => 
        new Date(a.created_at) >= oneWeekAgo
      ).length;
      
      // Calculate streak (simplified - consecutive days with annotations)
      const streak = calculateStreak(annotationsData);
      
      setStats({
        totalAnnotations,
        completedAnnotations,
        inProgressAnnotations,
        averageQualityScore,
        totalTimeSpent,
        annotationsThisWeek,
        streak
      });
      
      // Get available sentences count
      try {
        const allSentences = await sentencesAPI.getUnannotatedSentences(0, 1000);
        setAvailableSentences(allSentences.length);
      } catch (error) {
        setAvailableSentences(0);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = (annotations: Annotation[]): number => {
    if (annotations.length === 0) return 0;
    
    // Group annotations by date
    const annotationsByDate = new Map<string, number>();
    annotations.forEach(annotation => {
      const date = new Date(annotation.created_at).toDateString();
      annotationsByDate.set(date, (annotationsByDate.get(date) || 0) + 1);
    });
    
    // Calculate current streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toDateString();
      
      if (annotationsByDate.has(dateString)) {
        streak++;
      } else if (i > 0) { // Allow for today to be empty
        break;
      }
    }
    
    return streak;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgressPercentage = (): number => {
    if (!stats || stats.totalAnnotations === 0) return 0;
    return Math.round((stats.completedAnnotations / stats.totalAnnotations) * 100);
  };

  const getRecentAnnotations = (): Annotation[] => {
    return annotations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.first_name}!</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'home', label: 'Home', icon: Home },
              { key: 'annotate', label: 'Start Annotating', icon: FileText },
              { key: 'history', label: 'My History', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && stats && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">Ready to make a difference?</h2>
              <p className="text-blue-100 text-lg mb-4">
                Help improve machine translation quality by providing your expert annotations.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-300" />
                  <span className="text-sm">{stats.streak} day streak!</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-300" />
                  <span className="text-sm">Avg. Quality: {stats.averageQualityScore.toFixed(1)}/5</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Annotations</p>
                    <p className="text-xl font-bold text-blue-900">{stats.totalAnnotations}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Completed</p>
                    <p className="text-xl font-bold text-green-900">{stats.completedAnnotations}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Time Invested</p>
                    <p className="text-xl font-bold text-purple-900">{formatTime(stats.totalTimeSpent)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-200 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">This Week</p>
                    <p className="text-xl font-bold text-orange-900">{stats.annotationsThisWeek}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                    <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.completedAnnotations} of {stats.totalAnnotations} annotations completed
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Available Sentences</span>
                    <span className="text-sm text-gray-500">{availableSentences} left</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {availableSentences > 0 ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Ready to continue</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">All caught up!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('annotate')}
                  disabled={availableSentences === 0}
                  className={`flex items-center p-4 border-2 border-dashed rounded-lg transition-colors ${
                    availableSentences > 0 
                      ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50' 
                      : 'border-gray-200 cursor-not-allowed opacity-50'
                  }`}
                >
                  <FileText className={`h-8 w-8 mr-3 ${availableSentences > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`font-medium ${availableSentences > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                      {availableSentences > 0 ? 'Continue Annotating' : 'No New Sentences'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {availableSentences > 0 
                        ? `${availableSentences} sentences waiting` 
                        : 'Check back later for new content'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('history')}
                  className="flex items-center p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <BarChart3 className="h-8 w-8 text-green-500 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Review Your Work</p>
                    <p className="text-sm text-gray-500">View annotation history and stats</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            {getRecentAnnotations().length > 0 && (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {getRecentAnnotations().map((annotation) => (
                    <div key={annotation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          annotation.annotation_status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Sentence #{annotation.sentence_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {annotation.sentence.source_language.toUpperCase()} → {annotation.sentence.target_language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(annotation.created_at).toLocaleDateString()}
                        </p>
                        {annotation.overall_quality && (
                          <p className="text-xs font-medium text-gray-700">
                            Quality: {annotation.overall_quality}/5
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === 'annotate' && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Annotating</h3>
            <p className="text-gray-500 mb-4">
              This tab would redirect to the main annotation interface.
            </p>
            <button 
              onClick={() => window.location.href = '/annotate'}
              className="btn-primary"
            >
              Go to Annotation Interface
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Annotation History</h3>
            <p className="text-gray-500 mb-4">
              This tab would redirect to your annotation history.
            </p>
            <button 
              onClick={() => window.location.href = '/my-annotations'}
              className="btn-primary"
            >
              View My Annotations
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard; 