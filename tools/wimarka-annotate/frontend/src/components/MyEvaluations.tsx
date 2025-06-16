import React, { useState, useEffect } from 'react';
import { evaluationsAPI } from '../services/api';
import type { Evaluation } from '../types';
import { Star, Calendar, FileText, Search } from 'lucide-react';

const MyEvaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const data = await evaluationsAPI.getMyEvaluations();
      setEvaluations(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      setError('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = evaluation.annotation.sentence.source_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         evaluation.annotation.sentence.target_language?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === null || evaluation.overall_evaluation_score === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchEvaluations}
          className="mt-2 text-red-600 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Evaluations</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage your completed evaluations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search evaluations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div className="sm:w-48">
            <select
              value={ratingFilter || ''}
              onChange={(e) => setRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evaluations List */}
      {filteredEvaluations.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || ratingFilter ? 'Try adjusting your filters' : 'You haven\'t completed any evaluations yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {evaluation.annotation.sentence.target_language}
                    </span>
                    <span className="text-sm text-gray-500">
                      by {evaluation.annotation.annotator.first_name} {evaluation.annotation.annotator.last_name}
                    </span>
                  </div>
                  <p className="text-gray-900 text-sm leading-relaxed">
                    "{evaluation.annotation.sentence.source_text}"
                  </p>
                  {evaluation.annotation.sentence.machine_translation && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Translation: </span>
                      <span className="bg-yellow-100 px-1 rounded">
                        {evaluation.annotation.sentence.machine_translation}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(evaluation.overall_evaluation_score || 0)}
                    <span className="text-sm text-gray-600 ml-2">
                      {evaluation.overall_evaluation_score || 0}/5
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(evaluation.created_at)}
                  </div>
                </div>
              </div>

              {evaluation.feedback && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Feedback: </span>
                    {evaluation.feedback}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {evaluations.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {evaluations.length}
              </div>
              <div className="text-sm text-gray-600">Total Evaluations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(evaluations.reduce((sum, e) => sum + (e.overall_evaluation_score || 0), 0) / evaluations.length).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {evaluations.filter(e => e.feedback && e.feedback.trim()).length}
              </div>
              <div className="text-sm text-gray-600">With Feedback</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvaluations;
