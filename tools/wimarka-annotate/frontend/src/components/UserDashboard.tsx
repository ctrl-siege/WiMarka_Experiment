import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { annotationsAPI, sentencesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Annotation } from '../types';
import { 
  FileText, 
  Clock, 
  Star, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  ArrowRight,
  BookOpen,
  User,
  PlusCircle,
  ChevronRight,
  RefreshCcw
} from 'lucide-react';

interface UserStats {
  totalAnnotations: number;
  completedAnnotations: number;
  inProgressAnnotations: number;
  averageQualityScore: number;
  totalTimeSpent: number;
  annotationsThisWeek: number;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  buttonText: string;
  buttonLink: string;
  completed: boolean;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSentences, setAvailableSentences] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User onboarding journey steps
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    {
      id: 'read_guidelines',
      title: 'Read Guidelines',
      description: 'Understand the annotation guidelines before starting your work',
      icon: BookOpen,
      buttonText: 'View Guidelines',
      buttonLink: '#',
      completed: user?.guidelines_seen || false
    },
    {
      id: 'first_annotation',
      title: 'Complete First Annotation',
      description: 'Start your first annotation task to get familiar with the process',
      icon: PlusCircle,
      buttonText: 'Start Annotating',
      buttonLink: '/annotate',
      completed: stats?.completedAnnotations ? stats.completedAnnotations > 0 : false
    },
    {
      id: 'profile_setup',
      title: 'Complete Your Profile',
      description: 'Add your language preferences and expertise details',
      icon: User,
      buttonText: 'Update Profile',
      buttonLink: '/profile',
      completed: false
    }
  ]);

  useEffect(() => {
    loadDashboardData();
    
    // Close welcome message after 5 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Update onboarding step completion status when stats change
    if (stats) {
      setOnboardingSteps(currentSteps => 
        currentSteps.map(step => {
          if (step.id === 'first_annotation') {
            return {...step, completed: stats.completedAnnotations > 0};
          }
          return step;
        })
      );
    }
  }, [stats]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const annotationsData = await annotationsAPI.getMyAnnotations();
      
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
      
      setStats({
        totalAnnotations,
        completedAnnotations,
        inProgressAnnotations,
        averageQualityScore,
        totalTimeSpent,
        annotationsThisWeek
      });
      
      // Get available sentences count
      try {
        const allSentences = await sentencesAPI.getUnannotatedSentences(0, 1000);
        setAvailableSentences(allSentences.length);
      } catch {
        setAvailableSentences(0);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setTimeout(() => setRefreshing(false), 500);
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
    return [...annotations]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3);
  };

  // Determine user level based on completed annotations
  const getUserLevel = (): { level: string; title: string; nextMilestone: number } => {
    const completed = stats?.completedAnnotations || 0;
    
    if (completed < 10) {
      return { level: 'Beginner', title: 'Novice Annotator', nextMilestone: 10 };
    } else if (completed < 50) {
      return { level: 'Intermediate', title: 'Skilled Annotator', nextMilestone: 50 };
    } else if (completed < 100) {
      return { level: 'Advanced', title: 'Expert Annotator', nextMilestone: 100 };
    } else {
      return { level: 'Master', title: 'Master Annotator', nextMilestone: 500 };
    }
  };
  
  // Calculate progress to next level
  const getProgressToNextLevel = (): number => {
    const completed = stats?.completedAnnotations || 0;
    const { nextMilestone } = getUserLevel();
    
    let previousMilestone = 0;
    if (completed >= 10) previousMilestone = 10;
    if (completed >= 50) previousMilestone = 50;
    if (completed >= 100) previousMilestone = 100;
    
    const total = nextMilestone - previousMilestone;
    const current = completed - previousMilestone;
    return Math.round((current / total) * 100);
  };

  const userLevel = getUserLevel();
  const progressToNextLevel = getProgressToNextLevel();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center">
        <div className="max-w-6xl w-full py-8 px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 rounded-lg w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Welcome message that disappears after a few seconds */}
      {showWelcome && (
        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 fixed top-20 right-4 z-10 max-w-md shadow-lg rounded-lg animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-primary-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm leading-5 font-medium text-primary-800">
                Welcome back, {user?.first_name}! 👋
              </p>
              <p className="mt-1 text-sm leading-5 text-primary-700">
                You have {availableSentences} new {availableSentences === 1 ? 'sentence' : 'sentences'} to annotate.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header with refresh button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your progress and manage your annotation work
            </p>
          </div>
          <button 
            onClick={handleRefresh} 
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* User Progress Overview */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-primary-500" />
                    <h2 className="text-lg font-semibold text-gray-800">{user?.first_name} {user?.last_name}</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-1 rounded-full">
                      {userLevel.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      Level: {userLevel.level}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">Progress to next level</span>
                      <span className="text-xs font-medium text-primary-600">{progressToNextLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressToNextLevel}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {stats?.completedAnnotations || 0} / {userLevel.nextMilestone} annotations completed
                    </p>
                  </div>
                </div>
                
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h3 className="text-sm font-medium text-gray-700">Total Annotations</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalAnnotations || 0}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <h3 className="text-sm font-medium text-gray-700">Completed</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.completedAnnotations || 0}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        <h3 className="text-sm font-medium text-gray-700">Time Spent</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatTime(stats?.totalTimeSpent || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-5 w-5 text-purple-500" />
                        <h3 className="text-sm font-medium text-gray-700">This Week</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats?.annotationsThisWeek || 0}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <h3 className="text-sm font-medium text-gray-700">Avg. Quality</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.averageQualityScore ? stats.averageQualityScore.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-sm font-medium text-gray-700">Available</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{availableSentences}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">
                    {getProgressPercentage()}% of your annotations are completed
                  </span>
                </div>
                <div>
                  <Link 
                    to="/annotate" 
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                  >
                    Start Annotating
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* User onboarding journey */}
        {onboardingSteps.some(step => !step.completed) && (
          <div className="mb-8 animate-fadeIn">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Get Started with Annotation</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
              <div className="space-y-4">
                {onboardingSteps.map((step, index) => (
                  <div key={step.id} className={`
                    ${step.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'} 
                    border p-4 rounded-lg transition-all duration-300
                  `}>
                    <div className="flex items-center">
                      <div className={`
                        ${step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'} 
                        flex-shrink-0 rounded-full p-2
                      `}>
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`
                            text-sm font-medium 
                            ${step.completed ? 'text-green-800' : 'text-gray-900'}
                          `}>
                            {index + 1}. {step.title}
                            {step.completed && ' ✓'}
                          </h3>
                          {!step.completed && (
                            <Link 
                              to={step.buttonLink} 
                              className="inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-500"
                            >
                              {step.buttonText}
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        <p className={`
                          mt-1 text-xs 
                          ${step.completed ? 'text-green-600' : 'text-gray-500'}
                        `}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
            <Link 
              to="/my-annotations" 
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          {getRecentAnnotations().length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {getRecentAnnotations().map((annotation) => {
                return (
                  <div key={annotation.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                          {annotation.sentence.source_text}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4">
                          <span className={`
                            text-xs font-medium rounded-full px-2 py-0.5
                            ${annotation.annotation_status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'}
                          `}>
                            {annotation.annotation_status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(annotation.time_spent_seconds || 0)} spent
                          </span>
                          {annotation.overall_quality && (
                            <span className="flex items-center text-xs text-gray-500">
                              <Star className="h-3 w-3 text-yellow-400 mr-1" />
                              {annotation.overall_quality.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link 
                        to={`/annotate/${annotation.sentence_id}`} 
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No recent annotations found</p>
              <Link 
                to="/annotate" 
                className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                Start Annotating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;