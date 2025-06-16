import React, { useState, useEffect } from 'react';
import { evaluationsAPI } from '../services/api';
import type { EvaluatorStats, Annotation, Evaluation } from '../types';
import { 
  FileText, 
  Clock, 
  Star, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  Eye,
  Target,
  Award,
  Users,
  Calendar
} from 'lucide-react';

const EvaluatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<EvaluatorStats | null>(null);
  const [pendingAnnotations, setPendingAnnotations] = useState<Annotation[]>([]);
  const [recentEvaluations, setRecentEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, pendingData, evaluationsData] = await Promise.all([
        evaluationsAPI.getEvaluatorStats(),
        evaluationsAPI.getPendingEvaluations(0, 5),
        evaluationsAPI.getMyEvaluations(0, 5)
      ]);

      setStats(statsData);
      setPendingAnnotations(pendingData);
      setRecentEvaluations(evaluationsData);
    } catch (error) {
      console.error('Error loading evaluator dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getCompletionRate = (): number => {
    if (!stats || stats.total_evaluations === 0) return 0;
    return Math.round((stats.completed_evaluations / stats.total_evaluations) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center">
        <div className="max-w-6xl w-full py-8 px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Evaluator Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Review and evaluate annotations from the annotation team
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Evaluations</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_evaluations || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.completed_evaluations || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pending_evaluations || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.average_time_per_evaluation ? formatTime(Math.round(stats.average_time_per_evaluation)) : '0m'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluation Progress</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-sm font-medium text-blue-600">{getCompletionRate()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${getCompletionRate()}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {stats?.completed_evaluations || 0} of {stats?.total_evaluations || 0} evaluations completed
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="text-sm font-medium text-gray-700">This Week</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {recentEvaluations.filter(e => {
                      const oneWeekAgo = new Date();
                      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                      return new Date(e.created_at) >= oneWeekAgo;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-500">evaluations completed</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-sm font-medium text-gray-700">Quality Score</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {recentEvaluations.length > 0 
                      ? (recentEvaluations.reduce((sum, e) => sum + (e.overall_evaluation_score || 0), 0) / recentEvaluations.length).toFixed(1)
                      : '0.0'
                    }
                  </p>
                  <p className="text-sm text-gray-500">average score</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/evaluate"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Start Evaluating</p>
                  <p className="text-sm text-gray-500">Review pending annotations</p>
                </div>
              </a>
              
              <a
                href="/my-evaluations"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">My Evaluations</p>
                  <p className="text-sm text-gray-500">View completed evaluations</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Pending Annotations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Pending Annotations</h2>
            <a 
              href="/evaluate" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </a>
          </div>
          
          {pendingAnnotations.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {pendingAnnotations.map((annotation) => (
                <div key={annotation.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mb-2">
                        {annotation.sentence.source_text}
                      </h3>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {annotation.annotator.first_name} {annotation.annotator.last_name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(annotation.created_at).toLocaleDateString()}
                        </span>
                        {annotation.overall_quality && (
                          <span className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 mr-1" />
                            {annotation.overall_quality}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/evaluate/${annotation.id}`}
                      className="ml-4 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      Evaluate
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending annotations to evaluate</p>
              <p className="text-sm text-gray-400 mt-1">Check back later for new annotations to review</p>
            </div>
          )}
        </div>

        {/* Recent Evaluations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Evaluations</h2>
            <a 
              href="/my-evaluations" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </a>
          </div>
          
          {recentEvaluations.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {recentEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {evaluation.annotation.sentence.source_text}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      evaluation.evaluation_status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {evaluation.evaluation_status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-xs text-gray-500">
                    <span>
                      Annotator: {evaluation.annotation.annotator.first_name} {evaluation.annotation.annotator.last_name}
                    </span>
                    <span>
                      Evaluated: {new Date(evaluation.created_at).toLocaleDateString()}
                    </span>
                    {evaluation.overall_evaluation_score && (
                      <span className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 mr-1" />
                        Score: {evaluation.overall_evaluation_score}/5
                      </span>
                    )}
                    {evaluation.time_spent_seconds && (
                      <span>
                        Time: {formatTime(evaluation.time_spent_seconds)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No evaluations completed yet</p>
              <p className="text-sm text-gray-400 mt-1">Start evaluating annotations to see your history here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluatorDashboard;
