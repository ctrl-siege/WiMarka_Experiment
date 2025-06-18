import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationsAPI } from '../services/api';
import type { Annotation, EvaluationCreate, TextHighlight } from '../types';
import { 
  ChevronLeft, 
  Clock, 
  Save,
  User,
  FileText
} from 'lucide-react';

interface RatingButtonsProps {
  value?: number;
  onChange: (value: number) => void;
  label: string;
}

const RatingButtons: React.FC<RatingButtonsProps> = ({ value, onChange, label }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-10 h-10 rounded-full border-2 font-medium text-sm transition-all ${
              value === rating
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
};

const EvaluationInterface: React.FC = () => {
  const { annotationId } = useParams<{ annotationId: string }>();
  const navigate = useNavigate();
  
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationCreate>({
    annotation_id: 0,
    annotation_quality_score: undefined,
    accuracy_score: undefined,
    completeness_score: undefined,
    overall_evaluation_score: undefined,
    feedback: '',
    evaluation_notes: '',
    time_spent_seconds: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime] = useState(new Date());

  const loadAnnotation = useCallback(async () => {
    if (!annotationId) return;
    
    setIsLoading(true);
    try {
      // For this implementation, we'll need to get annotations via the admin API
      // since there's no direct endpoint to get a specific annotation by ID for evaluators
      const annotations = await evaluationsAPI.getPendingEvaluations(0, 100);
      const targetAnnotation = annotations.find(a => a.id === parseInt(annotationId));
      
      if (targetAnnotation) {
        setAnnotation(targetAnnotation);
        setEvaluation(prev => ({ ...prev, annotation_id: targetAnnotation.id }));
      } else {
        setMessage('Annotation not found or already evaluated');
        navigate('/evaluator');
      }
    } catch (error) {
      console.error('Error loading annotation:', error);
      setMessage('Error loading annotation');
    } finally {
      setIsLoading(false);
    }
  }, [annotationId, navigate]);

  const loadNextAnnotation = useCallback(async () => {
    setIsLoading(true);
    try {
      const pendingAnnotations = await evaluationsAPI.getPendingEvaluations(0, 1);
      if (pendingAnnotations.length > 0) {
        const nextAnnotation = pendingAnnotations[0];
        setAnnotation(nextAnnotation);
        setEvaluation(prev => ({ ...prev, annotation_id: nextAnnotation.id }));
      } else {
        setMessage('No pending annotations to evaluate');
        navigate('/evaluator');
      }
    } catch (error) {
      console.error('Error loading next annotation:', error);
      setMessage('Error loading annotation');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (annotationId) {
      loadAnnotation();
    } else {
      // Load next pending annotation
      loadNextAnnotation();
    }
  }, [annotationId, loadAnnotation, loadNextAnnotation]);

  const handleRatingChange = (field: keyof EvaluationCreate, value: number) => {
    setEvaluation(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (field: keyof EvaluationCreate, value: string) => {
    setEvaluation(prev => ({ ...prev, [field]: value }));
  };

  const calculateTimeSpent = (): number => {
    return Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
  };

  const handleSubmit = async () => {
    if (!annotation) return;

    // Validation
    if (!evaluation.annotation_quality_score || !evaluation.accuracy_score || 
        !evaluation.completeness_score || !evaluation.overall_evaluation_score) {
      setMessage('Please provide all required scores before submitting');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setIsSubmitting(true);
    try {
      const timeSpent = calculateTimeSpent();
      const submissionData = {
        ...evaluation,
        time_spent_seconds: timeSpent
      };

      await evaluationsAPI.createEvaluation(submissionData);
      setMessage('Evaluation submitted successfully!');
      
      // Navigate to next annotation or back to dashboard after delay
      setTimeout(() => {
        navigate('/evaluator');
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setMessage('Error submitting evaluation. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHighlightedText = (text: string, highlights: TextHighlight[], textType: string) => {
    if (!highlights || highlights.length === 0) {
      return <span>{text}</span>;
    }

    const relevantHighlights = highlights.filter(h => h.text_type === textType);
    if (relevantHighlights.length === 0) {
      return <span>{text}</span>;
    }

    // Sort highlights by start index
    const sortedHighlights = [...relevantHighlights].sort((a, b) => a.start_index - b.start_index);
    
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start_index > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, highlight.start_index)}
          </span>
        );
      }

      // Add highlighted text
      const errorType = highlight.error_type || 'MI_ST';
      
      // Define colors for different error types
      const getErrorTypeStyle = (type: string) => {
        switch (type) {
          case 'MI_ST': return 'bg-yellow-200 border-b-2 border-yellow-400';
          case 'MI_SE': return 'bg-blue-200 border-b-2 border-blue-400';
          case 'MA_ST': return 'bg-red-200 border-b-2 border-red-400';
          case 'MA_SE': return 'bg-purple-200 border-b-2 border-purple-400';
          default: return 'bg-gray-200 border-b-2 border-gray-400';
        }
      };
      
      elements.push(
        <span
          key={`highlight-${index}`}
          className={`${getErrorTypeStyle(errorType)} px-1 rounded relative group cursor-help`}
          title={`[${errorType}] ${highlight.comment}`}
        >
          <span className="text-xs font-bold text-gray-600">[{errorType}]</span>
          <span className="mx-1">{highlight.highlighted_text}</span>
          <span className="text-xs font-bold text-gray-600">[/{errorType}]</span>
        </span>
      );

      lastIndex = highlight.end_index;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{elements}</>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto animate-pulse mb-4" />
          <p className="text-gray-600">Loading annotation...</p>
        </div>
      </div>
    );
  }

  if (!annotation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No annotation to evaluate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/evaluator')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Evaluate Annotation</h1>
          <p className="mt-2 text-gray-600">
            Review and evaluate the quality of this annotation
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') || message.includes('Please') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Annotation Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Annotation Details</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {annotation.annotator.first_name} {annotation.annotator.last_name}
                </span>
                <span>
                  {new Date(annotation.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Source Text */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Source Text</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900">{annotation.sentence.source_text}</p>
              </div>
            </div>

            {/* Machine Translation with Highlights */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Machine Translation</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-gray-900 leading-relaxed">
                  {renderHighlightedText(
                    annotation.sentence.machine_translation, 
                    annotation.highlights || [], 
                    'machine'
                  )}
                </p>
              </div>
            </div>

            {/* Annotation Scores */}
            {(annotation.fluency_score || annotation.adequacy_score || annotation.overall_quality) && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Annotator's Scores</h3>
                <div className="grid grid-cols-3 gap-4">
                  {annotation.fluency_score && (
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">Fluency</div>
                      <div className="text-lg font-bold text-blue-600">{annotation.fluency_score}/5</div>
                    </div>
                  )}
                  {annotation.adequacy_score && (
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Adequacy</div>
                      <div className="text-lg font-bold text-green-600">{annotation.adequacy_score}/5</div>
                    </div>
                  )}
                  {annotation.overall_quality && (
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Overall</div>
                      <div className="text-lg font-bold text-purple-600">{annotation.overall_quality}/5</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments and Final Form */}
            {(annotation.comments || annotation.final_form) && (
              <div className="space-y-4">
                {annotation.comments && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Annotator's Comments</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-900">{annotation.comments}</p>
                    </div>
                  </div>
                )}
                
                {annotation.final_form && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Final Corrected Form</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-900">{annotation.final_form}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Highlights Details */}
            {annotation.highlights && annotation.highlights.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Annotations ({annotation.highlights.length})</h3>
                <div className="space-y-3">
                  {annotation.highlights.map((highlight, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-800">
                          "{highlight.highlighted_text}"
                        </span>
                        <span className="text-xs text-yellow-600">
                          Position: {highlight.start_index}-{highlight.end_index}
                        </span>
                      </div>
                      {highlight.comment && (
                        <p className="text-sm text-yellow-700">{highlight.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Evaluation</h2>

            {/* Rating Scores */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <RatingButtons
                value={evaluation.annotation_quality_score}
                onChange={(value) => handleRatingChange('annotation_quality_score', value)}
                label="Annotation Quality Score"
              />
              <RatingButtons
                value={evaluation.accuracy_score}
                onChange={(value) => handleRatingChange('accuracy_score', value)}
                label="Accuracy Score"
              />
              <RatingButtons
                value={evaluation.completeness_score}
                onChange={(value) => handleRatingChange('completeness_score', value)}
                label="Completeness Score"
              />
              <RatingButtons
                value={evaluation.overall_evaluation_score}
                onChange={(value) => handleRatingChange('overall_evaluation_score', value)}
                label="Overall Evaluation Score"
              />
            </div>

            {/* Feedback */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback for Annotator
              </label>
              <textarea
                value={evaluation.feedback || ''}
                onChange={(e) => handleTextChange('feedback', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Provide constructive feedback about the annotation quality..."
              />
            </div>

            {/* Evaluation Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Notes (Internal)
              </label>
              <textarea
                value={evaluation.evaluation_notes || ''}
                onChange={(e) => handleTextChange('evaluation_notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Internal notes about your evaluation process..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit Evaluation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationInterface;
