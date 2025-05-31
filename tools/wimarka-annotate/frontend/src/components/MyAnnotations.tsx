import React, { useState, useEffect } from 'react';
import { annotationsAPI } from '../services/api';
import type { Annotation, TextHighlight } from '../types';
import { BarChart3, Calendar, Clock, Star, MessageCircle } from 'lucide-react';

const MyAnnotations: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadAnnotations();
  }, []);

  const loadAnnotations = async () => {
    setIsLoading(true);
    try {
      const data = await annotationsAPI.getMyAnnotations();
      setAnnotations(data);
    } catch (error) {
      console.error('Error loading annotations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderHighlightedText = (text: string, highlights: TextHighlight[], textType: 'machine' | 'reference') => {
    const relevantHighlights = highlights.filter(h => h.text_type === textType);

    if (relevantHighlights.length === 0) {
      return <span>{text}</span>;
    }

    // Sort highlights by start position
    const sortedHighlights = [...relevantHighlights].sort((a, b) => a.start_index - b.start_index);
    
    const parts = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start_index > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, highlight.start_index)}
          </span>
        );
      }

      // Add highlighted text
      const highlightClass = {
        error: 'bg-red-200 border-b-2 border-red-400',
        suggestion: 'bg-blue-200 border-b-2 border-blue-400',
        note: 'bg-yellow-200 border-b-2 border-yellow-400',
      }[highlight.highlight_type];

      parts.push(
        <span
          key={`highlight-${highlight.id}`}
          className={`${highlightClass} px-1 rounded cursor-pointer relative group`}
          title={highlight.comment}
        >
          {highlight.highlighted_text}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
              {highlight.comment}
            </div>
          </div>
        </span>
      );

      lastIndex = highlight.end_index;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  const filteredAnnotations = annotations.filter(annotation => {
    if (filter === 'all') return true;
    return annotation.annotation_status === filter;
  });

  const calculateAverageScore = (annotations: Annotation[]) => {
    const scoresWithValues = annotations.filter(a => a.overall_quality);
    if (scoresWithValues.length === 0) return 0;
    const sum = scoresWithValues.reduce((acc, a) => acc + (a.overall_quality || 0), 0);
    return (sum / scoresWithValues.length).toFixed(1);
  };

  const calculateTotalTime = (annotations: Annotation[]) => {
    const totalSeconds = annotations.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading your annotations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Annotations</h1>
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Annotations</p>
                <p className="text-2xl font-bold text-blue-900">{annotations.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Avg. Quality Score</p>
                <p className="text-2xl font-bold text-green-900">{calculateAverageScore(annotations)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Total Time</p>
                <p className="text-2xl font-bold text-purple-900">{calculateTotalTime(annotations)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">Completed</p>
                <p className="text-2xl font-bold text-orange-900">
                  {annotations.filter(a => a.annotation_status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Annotations' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  filter === filterOption.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Annotations List */}
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No annotations found</h3>
            <p className="mt-2 text-gray-500">
              {filter === 'all' 
                ? "You haven't created any annotations yet."
                : `No annotations with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnotations.map((annotation) => (
              <div key={annotation.id} className="bg-gray-50 rounded-lg border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(annotation.annotation_status)}`}>
                        {annotation.annotation_status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {annotation.sentence.domain && (
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mr-2">
                            {annotation.sentence.domain}
                          </span>
                        )}
                        {annotation.sentence.source_language.toUpperCase()} → {annotation.sentence.target_language.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Annotated on {new Date(annotation.created_at).toLocaleDateString()}
                      {annotation.time_spent_seconds && (
                        <span className="ml-2">
                          • Time spent: {Math.floor(annotation.time_spent_seconds / 60)}m {annotation.time_spent_seconds % 60}s
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Source Text</h4>
                    <p className="text-sm text-gray-900 bg-white rounded p-3 border">
                      {annotation.sentence.source_text}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Machine Translation</h4>
                    <div className="text-sm text-gray-900 bg-white rounded p-3 border">
                      {renderHighlightedText(annotation.sentence.machine_translation, annotation.highlights, 'machine')}
                    </div>
                  </div>
                </div>

                {/* Reference Translation if exists */}
                {annotation.sentence.reference_translation && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Reference Translation</h4>
                    <div className="text-sm text-gray-900 bg-white rounded p-3 border">
                      {renderHighlightedText(annotation.sentence.reference_translation, annotation.highlights, 'reference')}
                    </div>
                  </div>
                )}

                {/* Scores */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Fluency</p>
                    <p className={`text-lg font-semibold ${getScoreColor(annotation.fluency_score)}`}>
                      {annotation.fluency_score || '—'}/5
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Adequacy</p>
                    <p className={`text-lg font-semibold ${getScoreColor(annotation.adequacy_score)}`}>
                      {annotation.adequacy_score || '—'}/5
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Overall Quality</p>
                    <p className={`text-lg font-semibold ${getScoreColor(annotation.overall_quality)}`}>
                      {annotation.overall_quality || '—'}/5
                    </p>
                  </div>
                </div>

                {/* Highlights Summary */}
                {annotation.highlights && annotation.highlights.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Text Annotations ({annotation.highlights.length})
                    </h4>
                    <div className="space-y-2">
                      {annotation.highlights.map((highlight) => (
                        <div key={highlight.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            highlight.highlight_type === 'error' ? 'bg-red-400' :
                            highlight.highlight_type === 'suggestion' ? 'bg-blue-400' : 'bg-yellow-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                "{highlight.highlighted_text}"
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                highlight.highlight_type === 'error' ? 'bg-red-100 text-red-700' :
                                highlight.highlight_type === 'suggestion' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {highlight.highlight_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({highlight.text_type === 'machine' ? 'Machine Translation' : 'Reference'})
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{highlight.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments and Corrections */}
                {(annotation.errors_found || annotation.suggested_correction || annotation.comments) && (
                  <div className="border-t pt-4 space-y-3">
                    {annotation.errors_found && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Errors Found</h5>
                        <p className="text-sm text-gray-900">{annotation.errors_found}</p>
                      </div>
                    )}
                    {annotation.suggested_correction && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Suggested Correction</h5>
                        <p className="text-sm text-gray-900">{annotation.suggested_correction}</p>
                      </div>
                    )}
                    {annotation.comments && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Comments</h5>
                        <p className="text-sm text-gray-900">{annotation.comments}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAnnotations; 