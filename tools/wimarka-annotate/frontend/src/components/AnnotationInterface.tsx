import React, { useState, useEffect, useRef } from 'react';
import { sentencesAPI, annotationsAPI } from '../services/api';
import type { Sentence, AnnotationCreate, TextHighlight } from '../types';
import { ChevronRight, Check, AlertCircle, Clock, MessageCircle, Trash2, Plus, Highlighter, X, Save, Eye, EyeOff } from 'lucide-react';

interface TextSegment extends Omit<TextHighlight, 'id' | 'annotation_id' | 'created_at'> {
  id: string; // temporary local ID for UI
}

interface SentenceAnnotation {
  sentence_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  comments: string;
  time_spent_seconds: number;
  highlights: TextSegment[];
  isExpanded?: boolean;
  startTime?: Date;
}

const AnnotationInterface: React.FC = () => {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [annotations, setAnnotations] = useState<Map<number, SentenceAnnotation>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [commentType, setCommentType] = useState<'error' | 'suggestion' | 'note'>('note');
  const [tempComment, setTempComment] = useState('');
  const [activeTextType, setActiveTextType] = useState<'machine' | 'reference'>('machine');
  const [activeSentenceId, setActiveSentenceId] = useState<number | null>(null);
  const [isGuidelinesModalClosing, setIsGuidelinesModalClosing] = useState(false);
  const [isCommentModalClosing, setIsCommentModalClosing] = useState(false);
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<number>>(new Set());
  
  const textRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadSentences();
  }, []);

  const loadSentences = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const loadedSentences = await sentencesAPI.getUnannotatedSentences(0, 50);
      setSentences(loadedSentences);
      
      // Initialize annotations for all sentences
      const initialAnnotations = new Map<number, SentenceAnnotation>();
      loadedSentences.forEach(sentence => {
        initialAnnotations.set(sentence.id, {
          sentence_id: sentence.id,
          fluency_score: undefined,
          adequacy_score: undefined,
          overall_quality: undefined,
          comments: '',
          time_spent_seconds: 0,
          highlights: [],
          isExpanded: false,
          startTime: new Date(),
        });
      });
      setAnnotations(initialAnnotations);
      
      if (loadedSentences.length === 0) {
        setMessage('Great! You have completed all available sentences. More will be added soon.');
      }
    } catch (error) {
      setMessage('Error loading sentences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSelection = (sentenceId: number, textType: 'machine' | 'reference') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) return;

    const refKey = `${sentenceId}-${textType}`;
    const container = textRefs.current.get(refKey);
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Get the full text content
    const fullText = container.textContent || '';
    
    // Create a temporary range to calculate the start index
    const tempRange = document.createRange();
    tempRange.selectNodeContents(container);
    tempRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = tempRange.toString().length;
    
    // Calculate end index
    const endIndex = startIndex + selectedText.length;

    setSelectedText(selectedText);
    setSelectedRange({ start: startIndex, end: endIndex });
    setActiveTextType(textType);
    setActiveSentenceId(sentenceId);
    setShowCommentModal(true);
    
    // Clear selection
    selection.removeAllRanges();
  };

  const addHighlight = () => {
    if (!selectedRange || !tempComment.trim() || !activeSentenceId) return;

    const newHighlight: TextSegment = {
      id: Date.now().toString(),
      highlighted_text: selectedText,
      start_index: selectedRange.start,
      end_index: selectedRange.end,
      comment: tempComment.trim(),
      highlight_type: commentType,
      text_type: activeTextType,
    };

    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(activeSentenceId);
      if (annotation) {
        annotation.highlights = [...annotation.highlights, newHighlight];
        updated.set(activeSentenceId, annotation);
      }
      return updated;
    });

    // Reset modal state
    setShowCommentModal(false);
    setTempComment('');
    setSelectedText('');
    setSelectedRange(null);
    setActiveSentenceId(null);
  };

  const removeHighlight = (sentenceId: number, highlightId: string) => {
    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(sentenceId);
      if (annotation) {
        annotation.highlights = annotation.highlights.filter(h => h.id !== highlightId);
        updated.set(sentenceId, annotation);
      }
      return updated;
    });
  };

  const closeGuidelinesModal = () => {
    setIsGuidelinesModalClosing(true);
    setTimeout(() => {
      setShowGuidelinesModal(false);
      setIsGuidelinesModalClosing(false);
    }, 200);
  };

  const closeCommentModal = () => {
    setIsCommentModalClosing(true);
    setTimeout(() => {
      setShowCommentModal(false);
      setTempComment('');
      setSelectedText('');
      setSelectedRange(null);
      setActiveSentenceId(null);
      setIsCommentModalClosing(false);
    }, 200);
  };

  const renderHighlightedText = (text: string, highlights: TextSegment[], textType: 'machine' | 'reference') => {
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

  const handleRatingChange = (sentenceId: number, field: 'fluency_score' | 'adequacy_score' | 'overall_quality', value: number) => {
    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(sentenceId);
      if (annotation) {
        annotation[field] = value;
        updated.set(sentenceId, annotation);
      }
      return updated;
    });
  };

  const handleCommentsChange = (sentenceId: number, comments: string) => {
    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(sentenceId);
      if (annotation) {
        annotation.comments = comments;
        updated.set(sentenceId, annotation);
      }
      return updated;
    });
  };

  const calculateTimeSpent = (startTime: Date): number => {
    return Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
  };

  const handleSubmit = async (sentenceId: number) => {
    const annotation = annotations.get(sentenceId);
    if (!annotation) return;

    const timeSpent = calculateTimeSpent(annotation.startTime || new Date());
    
    // Convert TextSegment to TextHighlight format for backend
    const highlights: TextHighlight[] = annotation.highlights.map(segment => ({
      highlighted_text: segment.highlighted_text,
      start_index: segment.start_index,
      end_index: segment.end_index,
      text_type: segment.text_type,
      highlight_type: segment.highlight_type,
      comment: segment.comment,
    }));

    const annotationData: AnnotationCreate = {
      sentence_id: annotation.sentence_id,
      fluency_score: annotation.fluency_score,
      adequacy_score: annotation.adequacy_score,
      overall_quality: annotation.overall_quality,
      comments: annotation.comments,
      time_spent_seconds: timeSpent,
      highlights: highlights,
    };

    setSubmittingIds(prev => new Set(prev).add(sentenceId));
    try {
      await annotationsAPI.createAnnotation(annotationData);
      
      // Remove the sentence from the list after successful submission
      setSentences(prev => prev.filter(s => s.id !== sentenceId));
      setAnnotations(prev => {
        const updated = new Map(prev);
        updated.delete(sentenceId);
        return updated;
      });
      setExpandedSentences(prev => {
        const updated = new Set(prev);
        updated.delete(sentenceId);
        return updated;
      });
      
      setMessage('Annotation saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error saving annotation. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSubmittingIds(prev => {
        const updated = new Set(prev);
        updated.delete(sentenceId);
        return updated;
      });
    }
  };

  const toggleExpanded = (sentenceId: number) => {
    setExpandedSentences(prev => {
      const updated = new Set(prev);
      if (updated.has(sentenceId)) {
        updated.delete(sentenceId);
      } else {
        updated.add(sentenceId);
      }
      return updated;
    });
  };

  const RatingButtons: React.FC<{ 
    value: number | undefined; 
    onChange: (value: number) => void; 
    label: string;
    compact?: boolean;
  }> = ({ value, onChange, label, compact = false }) => (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <label className={`block text-xs font-medium text-gray-700 ${compact ? 'text-center' : ''}`}>
        {label}
      </label>
      <div className={`flex ${compact ? 'justify-center space-x-1' : 'space-x-2'}`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded ${
              value === rating
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } border transition-colors`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto animate-spin" />
          <p className="mt-4 text-gray-600">Loading sentences...</p>
        </div>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="text-center py-12">
        <Check className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">All Done!</h2>
        <p className="mt-2 text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sentence Annotators</h1>
          <div className="flex items-center space-x-4"> 
            <button
              onClick={() => setShowGuidelinesModal(true)}
              className="btn-secondary text-sm"
            >
              View Guidelines
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Highlighter className="h-4 w-4" />
              <span>Select text to highlight and annotate</span>
            </div>
          </div>
        </div>
        
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.includes('Error') 
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <div className="flex">
              {message.includes('Error') ? (
                <AlertCircle className="h-5 w-5 mt-0.5 mr-2" />
              ) : (
                <Check className="h-5 w-5 mt-0.5 mr-2" />
              )}
              <p>{message}</p>
            </div>
          </div>
        )}

        {/* Sentences Table */}
        <div className="space-y-4">
          {sentences.map((sentence) => {
            const annotation = annotations.get(sentence.id);
            const isExpanded = expandedSentences.has(sentence.id);
            const isSubmitting = submittingIds.has(sentence.id);
            
            if (!annotation) return null;

            return (
              <div key={sentence.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Collapsed View */}
                <div className="bg-gray-50 p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 text-sm font-medium text-gray-500">
                      #{sentence.id}
                    </div>
                    
                    <div className="col-span-4">
                      <div className="text-xs text-gray-500 mb-1">Source ({sentence.source_language.toUpperCase()})</div>
                      <div className="text-sm text-gray-900 truncate" title={sentence.source_text}>
                        {sentence.source_text}
                      </div>
                    </div>
                    
                    <div className="col-span-5">
                      <div className="text-xs text-gray-500 mb-1">Machine Translation ({sentence.target_language.toUpperCase()})</div>
                      <div className="text-sm text-gray-900 truncate" title={sentence.machine_translation}>
                        {sentence.machine_translation}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end">
                      <button
                        onClick={() => toggleExpanded(sentence.id)}
                        className="btn-primary text-sm px-4 py-2 flex items-center space-x-2"
                        title="Edit annotation"
                      >
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded View */}
                {isExpanded && (
                  <div className="bg-white p-6 border-t border-gray-200">
                    {/* Full Text Display */}
                    <div className="grid lg:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Source Text ({sentence.source_language.toUpperCase()})
                          </label>
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-gray-900 leading-relaxed">{sentence.source_text}</p>
                          </div>
                        </div>
                        
                        {sentence.reference_translation && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reference Translation ({sentence.target_language.toUpperCase()})
                              <span className="ml-2 text-xs text-gray-500">- Click and drag to highlight</span>
                            </label>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div
                                ref={(el) => {
                                  if (el) textRefs.current.set(`${sentence.id}-reference`, el);
                                }}
                                className="text-gray-900 leading-relaxed cursor-text select-text"
                                onMouseUp={() => handleTextSelection(sentence.id, 'reference')}
                              >
                                {renderHighlightedText(
                                  sentence.reference_translation,
                                  annotation.highlights,
                                  'reference'
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Machine Translation ({sentence.target_language.toUpperCase()})
                          <span className="ml-2 text-xs text-gray-500">- Click and drag to highlight</span>
                        </label>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div
                            ref={(el) => {
                              if (el) textRefs.current.set(`${sentence.id}-machine`, el);
                            }}
                            className="text-gray-900 leading-relaxed cursor-text select-text"
                            onMouseUp={() => handleTextSelection(sentence.id, 'machine')}
                          >
                            {renderHighlightedText(
                              sentence.machine_translation,
                              annotation.highlights,
                              'machine'
                            )}
                          </div>
                        </div>
                        {sentence.domain && (
                          <p className="text-sm text-gray-500 mt-2">Domain: {sentence.domain}</p>
                        )}
                      </div>
                    </div>

                    {/* Highlights Summary */}
                    {annotation.highlights.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Your Annotations ({annotation.highlights.length})
                        </h4>
                        <div className="space-y-2">
                          {annotation.highlights.map((highlight) => (
                            <div key={highlight.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
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
                                </div>
                                <p className="text-xs text-gray-600">{highlight.comment}</p>
                              </div>
                              <button
                                onClick={() => removeHighlight(sentence.id, highlight.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Comments */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional General Comments (Optional)
                      </label>
                      <textarea
                        value={annotation.comments}
                        onChange={(e) => handleCommentsChange(sentence.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                        placeholder="Any additional general comments about this translation..."
                      />
                    </div>

                    {/* Rating Section */}
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      <RatingButtons
                        value={annotation.fluency_score}
                        onChange={(value) => handleRatingChange(sentence.id, 'fluency_score', value)}
                        label="Fluency Score"
                      />
                      <RatingButtons
                        value={annotation.adequacy_score}
                        onChange={(value) => handleRatingChange(sentence.id, 'adequacy_score', value)}
                        label="Adequacy Score"
                      />
                      <RatingButtons
                        value={annotation.overall_quality}
                        onChange={(value) => handleRatingChange(sentence.id, 'overall_quality', value)}
                        label="Overall Quality"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={() => toggleExpanded(sentence.id)}
                        className="btn-secondary"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmit(sentence.id)}
                        disabled={isSubmitting}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Annotation</span>
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guidelines Modal */}
      {showGuidelinesModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isGuidelinesModalClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}>
          <div className={`bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
            isGuidelinesModalClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Annotation Guidelines</h2>
              <button
                onClick={closeGuidelinesModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Overview */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Overview</h4>
                <p className="text-gray-600 mb-4">
                  You will be evaluating machine-translated sentences by comparing them with reference translations. 
                  Your task is to assess the quality of the translation and provide detailed feedback.
                </p>
              </div>

              {/* Rating Scales */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Rating Scales (1-5)</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Fluency Score</h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>5:</strong> Perfect fluency, natural language</p>
                      <p><strong>4:</strong> Good fluency, minor awkwardness</p>
                      <p><strong>3:</strong> Moderate fluency, some unnatural phrasing</p>
                      <p><strong>2:</strong> Poor fluency, difficult to read</p>
                      <p><strong>1:</strong> Very poor fluency, incomprehensible</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-2">Adequacy Score</h5>
                    <div className="text-sm text-green-800 space-y-1">
                      <p><strong>5:</strong> Perfect meaning preservation</p>
                      <p><strong>4:</strong> Good, minor meaning differences</p>
                      <p><strong>3:</strong> Moderate, some meaning lost</p>
                      <p><strong>2:</strong> Poor, significant meaning differences</p>
                      <p><strong>1:</strong> Very poor, completely different meaning</p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h5 className="font-medium text-purple-900 mb-2">Overall Quality</h5>
                    <div className="text-sm text-purple-800 space-y-1">
                      <p><strong>5:</strong> Excellent translation</p>
                      <p><strong>4:</strong> Good translation, minor issues</p>
                      <p><strong>3:</strong> Acceptable translation</p>
                      <p><strong>2:</strong> Poor translation, needs improvement</p>
                      <p><strong>1:</strong> Very poor translation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Highlighting */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Text Highlighting & Annotations</h4>
                <div className="space-y-3">
                  <p className="text-gray-600">
                    Select specific text portions to highlight and annotate problematic areas:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                      <span className="text-sm"><strong>Error:</strong> Incorrect translations, grammar mistakes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                      <span className="text-sm"><strong>Suggestion:</strong> Alternative translations, improvements</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
                      <span className="text-sm"><strong>Note:</strong> General observations, context information</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Best Practices</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">✅ Do:</h5>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Read both sentences completely before rating</li>
                      <li>Consider context and domain-specific terminology</li>
                      <li>Highlight specific problematic words/phrases</li>
                      <li>Provide clear, constructive comments</li>
                      <li>Be consistent in your evaluation criteria</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">❌ Don't:</h5>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Rush through annotations</li>
                      <li>Let personal preferences affect scores</li>
                      <li>Ignore minor but important details</li>
                      <li>Give inconsistent ratings for similar issues</li>
                      <li>Leave vague or unhelpful comments</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Example Evaluation</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Source:</span>
                      <p className="text-sm italic">"The doctor prescribed medicine for the patient's condition."</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Machine Translation:</span>
                      <p className="text-sm">"The doctor <span className="bg-red-200 px-1 rounded">prescripted</span> medicine for the patient's <span className="bg-yellow-200 px-1 rounded">state</span>."</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Reference:</span>
                      <p className="text-sm">"The doctor prescribed medication for the patient's condition."</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Issues:</strong> Grammar error ("prescripted"), suboptimal word choice ("state" vs "condition")</p>
                      <p><strong>Scores:</strong> Fluency: 3, Adequacy: 4, Overall: 3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={closeGuidelinesModal}
                className="btn-primary"
              >
                Got it, let's start!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isCommentModalClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}>
          <div className={`bg-white rounded-lg p-6 w-full max-w-md ${
            isCommentModalClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add Annotation
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Selected text:</p>
              <div className="p-2 bg-gray-100 rounded text-sm font-medium">
                "{selectedText}"
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annotation Type
              </label>
              <div className="flex space-x-2">
                {[
                  { value: 'error', label: 'Error', color: 'red' },
                  { value: 'suggestion', label: 'Suggestion', color: 'blue' },
                  { value: 'note', label: 'Note', color: 'yellow' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setCommentType(type.value as any)}
                    className={`px-3 py-2 text-xs rounded ${
                      commentType === type.value
                        ? `bg-${type.color}-200 text-${type.color}-800 border-${type.color}-400`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } border transition-colors`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <textarea
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Explain the issue, suggestion, or note..."
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeCommentModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={addHighlight}
                disabled={!tempComment.trim()}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Annotation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationInterface; 