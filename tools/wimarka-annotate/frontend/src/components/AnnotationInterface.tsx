import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { sentencesAPI, annotationsAPI } from '../services/api';
import type { Sentence, AnnotationCreate, AnnotationUpdate, TextHighlight } from '../types';
import { ChevronRight, Check, AlertCircle, Clock, MessageCircle, Trash2, Plus, Highlighter } from 'lucide-react';

interface TextSegment extends Omit<TextHighlight, 'id' | 'annotation_id' | 'created_at'> {
  id: string; // temporary local ID for UI
}

interface SentenceAnnotation {
  sentence_id: number;
  fluency_score?: number;
  adequacy_score?: number;
  overall_quality?: number;
  comments: string;
  final_form: string;
  time_spent_seconds: number;
  highlights: TextSegment[];
  isExpanded?: boolean;
  startTime?: Date;
  annotation_id?: number; // For existing annotations
  annotation_status?: 'in_progress' | 'completed' | 'reviewed';
  created_at?: string;
  updated_at?: string;
}

const AnnotationInterface: React.FC = () => {
  const { sentenceId } = useParams<{ sentenceId?: string }>();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [annotations, setAnnotations] = useState<Map<number, SentenceAnnotation>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [tempErrorType, setTempErrorType] = useState<'MI_ST' | 'MI_SE' | 'MA_ST' | 'MA_SE'>('MI_SE');
  const [activeTextType, setActiveTextType] = useState<'machine'>('machine');
  const [activeSentenceId, setActiveSentenceId] = useState<number | null>(null);
  const [isCommentModalClosing, setIsCommentModalClosing] = useState(false);
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set());
  const [submittingIds, setSubmittingIds] = useState<Set<number>>(new Set());
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isErrorModalClosing, setIsErrorModalClosing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitModalClosing, setIsSubmitModalClosing] = useState(false);
  const [pendingSubmitSentenceId, setPendingSubmitSentenceId] = useState<number | null>(null);
  
  const textRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const loadSentences = async () => {
      setIsLoading(true);
      setMessage('');
      try {
        let loadedSentences: Sentence[] = [];
        
        if (sentenceId) {
          // Load specific sentence if ID is provided
          try {
            const specificSentence = await sentencesAPI.getSentence(parseInt(sentenceId, 10));
            loadedSentences = [specificSentence];
            
            // Check if user already has an annotation for this sentence
            const userAnnotations = await annotationsAPI.getMyAnnotations();
            const existingAnnotation = userAnnotations.find(a => a.sentence_id === parseInt(sentenceId, 10));
            
            if (existingAnnotation) {
              // Convert TextHighlight[] to TextSegment[]
              const convertedHighlights = (existingAnnotation.highlights || []).map(highlight => ({
                id: highlight.id?.toString() || `highlight-${Date.now()}`,
                highlighted_text: highlight.highlighted_text,
                start_index: highlight.start_index,
                end_index: highlight.end_index,
                text_type: highlight.text_type,
                error_type: highlight.error_type,
                comment: highlight.comment,
              }));
              
              // Load existing annotation data
              const initialAnnotations = new Map<number, SentenceAnnotation>();
              initialAnnotations.set(specificSentence.id, {
                sentence_id: specificSentence.id,
                fluency_score: existingAnnotation.fluency_score,
                adequacy_score: existingAnnotation.adequacy_score,
                overall_quality: existingAnnotation.overall_quality,
                comments: existingAnnotation.comments || '',
                final_form: existingAnnotation.final_form || '',
                time_spent_seconds: existingAnnotation.time_spent_seconds || 0,
                highlights: convertedHighlights,
                isExpanded: true, // Expand the sentence when coming from a direct link
                startTime: new Date(),
                annotation_id: existingAnnotation.id,
                annotation_status: existingAnnotation.annotation_status,
                created_at: existingAnnotation.created_at,
                updated_at: existingAnnotation.updated_at,
              });
              setAnnotations(initialAnnotations);
              setExpandedSentences(new Set([specificSentence.id]));
            } else {
              // Initialize new annotation for the specific sentence
              const initialAnnotations = new Map<number, SentenceAnnotation>();
              initialAnnotations.set(specificSentence.id, {
                sentence_id: specificSentence.id,
                fluency_score: undefined,
                adequacy_score: undefined,
                overall_quality: undefined,
                comments: '',
                final_form: '',
                time_spent_seconds: 0,
                highlights: [],
                isExpanded: true, // Expand the sentence when coming from a direct link
                startTime: new Date(),
              });
              setAnnotations(initialAnnotations);
              setExpandedSentences(new Set([specificSentence.id]));
            }
          } catch (error) {
            console.error('Error loading specific sentence:', error);
            setMessage('Error loading the requested sentence. Loading available sentences instead.');
            // Fall back to loading unannotated sentences
            loadedSentences = await sentencesAPI.getUnannotatedSentences(0, 50);
          }
        } else {
          // Load unannotated sentences for new annotations
          loadedSentences = await sentencesAPI.getUnannotatedSentences(0, 50);
        }
        
        setSentences(loadedSentences);
        
        // Initialize annotations for all sentences (if not already done for specific sentence)
        if (!sentenceId || loadedSentences.length > 1) {
          const initialAnnotations = new Map<number, SentenceAnnotation>();
          loadedSentences.forEach(sentence => {
            initialAnnotations.set(sentence.id, {
              sentence_id: sentence.id,
              fluency_score: undefined,
              adequacy_score: undefined,
              overall_quality: undefined,
              comments: '',
              final_form: '',
              time_spent_seconds: 0,
              highlights: [],
              isExpanded: false,
              startTime: new Date(),
            });
          });
          setAnnotations(initialAnnotations);
        }
        
        if (loadedSentences.length === 0) {
          setMessage('Great! You have completed all available sentences. More will be added soon.');
        }
      } catch (error) {
        console.error('Error loading sentences:', error);
        setMessage('Error loading sentences. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSentences();
  }, [sentenceId]); // Add sentenceId as dependency so it reloads when the parameter changes

  const handleTextSelection = (sentenceId: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (selectedText.length === 0) return;

    const refKey = `${sentenceId}-machine`;
    const container = textRefs.current.get(refKey);
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Get the original sentence text (not the DOM textContent which includes highlights)
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;
    
    const originalText = sentence.machine_translation;
    if (!originalText) return;

    // Find the start index by searching for the selected text in the original text
    const startIndex = originalText.indexOf(selectedText);
    if (startIndex === -1) {
      // If exact match not found, try to find a reasonable position
      // This handles cases where selection might have extra whitespace
      const trimmedSelection = selectedText.replace(/\s+/g, ' ');
      const normalizedText = originalText.replace(/\s+/g, ' ');
      const altStartIndex = normalizedText.indexOf(trimmedSelection);
      if (altStartIndex === -1) return;
      
      // Find the actual position in the original text
      let actualStartIndex = 0;
      let normalizedIndex = 0;
      for (let i = 0; i < originalText.length; i++) {
        if (normalizedIndex === altStartIndex) {
          actualStartIndex = i;
          break;
        }
        if (originalText[i] !== ' ' || normalizedText[normalizedIndex] === ' ') {
          normalizedIndex++;
        }
      }
      setSelectedText(selectedText);
      setSelectedRange({ start: actualStartIndex, end: actualStartIndex + trimmedSelection.length });
    } else {
      // Calculate end index
      const endIndex = startIndex + selectedText.length;
      setSelectedText(selectedText);
      setSelectedRange({ start: startIndex, end: endIndex });
    }

    setActiveTextType('machine');
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
      text_type: activeTextType,
      error_type: tempErrorType,
    };

    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(activeSentenceId);
      if (annotation) {
        // Prevent duplicate highlights
        const isDuplicate = annotation.highlights.some(h =>
          h.start_index === newHighlight.start_index &&
          h.end_index === newHighlight.end_index &&
          h.text_type === newHighlight.text_type &&
          h.comment === newHighlight.comment
        );
        if (!isDuplicate) {
          annotation.highlights = [...annotation.highlights, newHighlight];
          updated.set(activeSentenceId, annotation);
        }
      }
      return updated;
    });

    // Reset modal state
    setShowCommentModal(false);
    setTempComment('');
    setTempErrorType('MI_SE');
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

  const closeCommentModal = () => {
    setIsCommentModalClosing(true);
    setTimeout(() => {
      setShowCommentModal(false);
      setTempComment('');
      setTempErrorType('MI_SE');
      setSelectedText('');
      setSelectedRange(null);
      setActiveSentenceId(null);
      setIsCommentModalClosing(false);
    }, 200);
  };

  const closeErrorModal = () => {
    setIsErrorModalClosing(true);
    setTimeout(() => {
      setShowErrorModal(false);
      setErrorMessage('');
      setIsErrorModalClosing(false);
    }, 200);
  };

  const closeSubmitModal = () => {
    setIsSubmitModalClosing(true);
    setTimeout(() => {
      setShowSubmitModal(false);
      setPendingSubmitSentenceId(null);
      setIsSubmitModalClosing(false);
    }, 200);
  };

  const renderHighlightedText = (text: string, highlights: TextSegment[]) => {
    // Only show machine translation highlights
    const relevantHighlights = highlights.filter(h => h.text_type === 'machine');

    if (relevantHighlights.length === 0) {
      return <span>{text}</span>;
    }

    // Sort highlights by start position and filter out invalid ones
    const validHighlights = relevantHighlights
      .filter(h => h.start_index >= 0 && h.end_index <= text.length && h.start_index < h.end_index)
      .sort((a, b) => a.start_index - b.start_index);
    
    if (validHighlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    validHighlights.forEach((highlight, index) => {
      // Ensure we don't have overlapping highlights by adjusting start position
      const startIndex = Math.max(highlight.start_index, lastIndex);
      const endIndex = Math.min(highlight.end_index, text.length);
      
      // Skip if this highlight would be empty after adjustments
      if (startIndex >= endIndex) return;

      // Add text before highlight
      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, startIndex)}
          </span>
        );
      }

      // Add highlighted text with color based on error type
      const highlightedText = text.slice(startIndex, endIndex);
      
      // Get error type styling
      const getErrorTypeClass = (errorType: string) => {
        switch (errorType) {
          case 'MI_ST': return 'bg-orange-100 border-b-2 border-orange-400 text-orange-800';
          case 'MI_SE': return 'bg-blue-100 border-b-2 border-blue-400 text-blue-800';
          case 'MA_ST': return 'bg-red-100 border-b-2 border-red-500 text-red-800';
          case 'MA_SE': return 'bg-purple-100 border-b-2 border-purple-500 text-purple-800';
          default: return 'bg-gray-100 border-b-2 border-gray-400 text-gray-800';
        }
      };
      
      const getErrorTypeLabel = (errorType: string) => {
        switch (errorType) {
          case 'MI_ST': return 'Minor Syntactic Error';
          case 'MI_SE': return 'Minor Semantic Error';
          case 'MA_ST': return 'Major Syntactic Error';
          case 'MA_SE': return 'Major Semantic Error';
          default: return 'Unknown Error Type';
        }
      };
      
      const errorTypeClass = getErrorTypeClass(highlight.error_type || 'MI_SE');
      const errorTypeLabel = getErrorTypeLabel(highlight.error_type || 'MI_SE');
      
      parts.push(
        <span
          key={`highlight-${highlight.id}`}
          className={`${errorTypeClass} px-1 rounded cursor-pointer relative group`}
          title={`${errorTypeLabel}: ${highlight.comment}`}
        >
          <span className="mx-1">{highlightedText}</span>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
              <div className="font-medium text-yellow-300 mb-1">
                {errorTypeLabel}
              </div>
              {highlight.comment}
            </div>
          </div>
        </span>
      );

      lastIndex = endIndex;
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

  const handleFinalFormChange = (sentenceId: number, finalForm: string) => {
    setAnnotations(prev => {
      const updated = new Map(prev);
      const annotation = updated.get(sentenceId);
      if (annotation) {
        annotation.final_form = finalForm;
        updated.set(sentenceId, annotation);
      }
      return updated;
    });
  };

  const calculateTimeSpent = (startTime: Date): number => {
    return Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
  };

  const validateAnnotation = (annotation: SentenceAnnotation) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if any scores are provided
    if (!annotation.fluency_score && !annotation.adequacy_score && !annotation.overall_quality) {
      errors.push('Please rate the translation quality by clicking on the number buttons (1-5) in at least one category below.');
    }

    // Check if highlights require final form
    if (annotation.highlights.length > 0 && !annotation.final_form.trim()) {
      errors.push('Since you marked some errors, please write the corrected sentence in the "Final Form" box.');
    }

    // Warning for no annotations/highlights
    if (annotation.highlights.length === 0 && !annotation.final_form.trim()) {
      warnings.push('You haven\'t marked any errors or made corrections. This means you\'re saying the translation is perfect!');
    }

    return { errors, warnings };
  };

  const handleSubmit = async (sentenceId: number) => {
    const annotation = annotations.get(sentenceId);
    if (!annotation) return;

    const { errors } = validateAnnotation(annotation);

    // Show errors immediately
    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      setShowErrorModal(true);
      return;
    }

    // Show submit modal for confirmation
    setPendingSubmitSentenceId(sentenceId);
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    if (!pendingSubmitSentenceId) return;
    
    const annotation = annotations.get(pendingSubmitSentenceId);
    if (!annotation) return;

    const timeSpent = calculateTimeSpent(annotation.startTime || new Date());
    
    // Convert TextSegment to TextHighlight format for backend
    const highlights: TextHighlight[] = annotation.highlights.map(segment => ({
      highlighted_text: segment.highlighted_text,
      start_index: segment.start_index,
      end_index: segment.end_index,
      text_type: segment.text_type,
      comment: segment.comment,
      error_type: segment.error_type,
    }));

    // Close modal first
    closeSubmitModal();

    setSubmittingIds(prev => new Set(prev).add(pendingSubmitSentenceId));
    try {
      if (annotation.annotation_id) {
        // Update existing annotation
        const updateData: AnnotationUpdate = {
          fluency_score: annotation.fluency_score,
          adequacy_score: annotation.adequacy_score,
          overall_quality: annotation.overall_quality,
          comments: annotation.comments,
          final_form: annotation.final_form,
          time_spent_seconds: timeSpent,
          annotation_status: 'completed',
          highlights: highlights,
        };
        
        await annotationsAPI.updateAnnotation(annotation.annotation_id, updateData);
        setMessage('Annotation updated successfully!');
      } else {
        // Create new annotation
        const annotationData: AnnotationCreate = {
          sentence_id: annotation.sentence_id,
          fluency_score: annotation.fluency_score,
          adequacy_score: annotation.adequacy_score,
          overall_quality: annotation.overall_quality,
          comments: annotation.comments,
          final_form: annotation.final_form,
          time_spent_seconds: timeSpent,
          highlights: highlights,
        };

        await annotationsAPI.createAnnotation(annotationData);
        setMessage('Annotation saved successfully!');
      }
      
      // Remove the sentence from the list after successful submission
      setSentences(prev => prev.filter(s => s.id !== pendingSubmitSentenceId));
      setAnnotations(prev => {
        const updated = new Map(prev);
        updated.delete(pendingSubmitSentenceId);
        return updated;
      });
      setExpandedSentences(prev => {
        const updated = new Set(prev);
        updated.delete(pendingSubmitSentenceId);
        return updated;
      });
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Error saving annotation. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSubmittingIds(prev => {
        const updated = new Set(prev);
        updated.delete(pendingSubmitSentenceId);
        return updated;
      });
    }
  };

  const toggleExpanded = (sentenceId: number) => {
    const annotation = annotations.get(sentenceId);
    if (!annotation) return;

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
    showRequired?: boolean;
  }> = ({ value, onChange, label, compact = false, showRequired = false }) => (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <label className={`block text-xs font-medium ${
        value ? 'text-gray-700' : showRequired ? 'text-red-600' : 'text-amber-600'
      } ${compact ? 'text-center' : ''}`}>
        {label} {!value && showRequired && <span className="text-red-500">*</span>}
        {!value && !showRequired && <span className="text-amber-500">*</span>}
      </label>
      <div className={`flex ${compact ? 'justify-center space-x-1' : 'space-x-2'}`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded transition-all duration-200 ${
              value === rating
                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                : `bg-white text-gray-700 ${
                    !value && showRequired 
                      ? 'border-red-300 hover:border-red-400 hover:bg-red-50' 
                      : !value 
                        ? 'border-amber-300 hover:border-amber-400 hover:bg-amber-50' 
                        : 'border-gray-300 hover:bg-gray-50'
                  } hover:transform hover:scale-105`
            } border`}
          >
            {rating}
          </button>
        ))}
      </div>
      {!value && showRequired && (
        <p className="text-xs text-red-600 mt-1 font-medium">Please click a number to rate</p>
      )}
      {!value && !showRequired && (
        <p className="text-xs text-amber-600 mt-1">Click a number to rate (1=poor, 5=excellent)</p>
      )}
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
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Highlighter className="h-4 w-4" />
              <span>Select text to highlight and annotate</span>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 How to annotate:</h3>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</div>
              <div>
                <p className="font-medium">Highlight Problems (if any)</p>
                <p className="text-blue-700">Click and drag to select text that has errors, then describe the issue</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</div>
              <div>
                <p className="font-medium">Rate the Quality</p>
                <p className="text-blue-700">Click a number from 1 (poor) to 5 (excellent) for at least one category</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</div>
              <div>
                <p className="font-medium">Submit Your Review</p>
                <p className="text-blue-700">If you found errors, write the corrected sentence first</p>
              </div>
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
                    
                    <div className="col-span-5">
                      <div className="text-xs text-gray-500 mb-1">Source Text ({sentence.source_language.toUpperCase()})</div>
                      <div className="text-sm text-gray-900 truncate" title={sentence.source_text}>
                        {sentence.source_text}
                      </div>
                    </div>
                    
                    <div className="col-span-4">
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
                    <div className="grid lg:grid-cols-1 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Source Text ({sentence.source_language.toUpperCase()})
                        </label>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-gray-900 leading-relaxed">{sentence.source_text}</p>
                        </div>
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
                            onMouseUp={() => handleTextSelection(sentence.id)}
                          >
                            {renderHighlightedText(
                              sentence.machine_translation,
                              annotation.highlights
                            )}
                          </div>
                        </div>
                        {sentence.domain && (
                          <p className="text-sm text-gray-500 mt-2">Domain: {sentence.domain}</p>
                        )}
                      </div>
                    </div>

                    {/* Highlights Summary */}
                    {annotation.highlights.length > 0 ? (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Your Annotations ({annotation.highlights.length})
                        </h4>
                        <div className="space-y-2">
                          {annotation.highlights.map((highlight) => {
                            const getHighlightColor = (errorType: string) => {
                              switch (errorType) {
                                case 'MI_ST': return { bg: 'bg-orange-400', badge: 'bg-orange-500' };
                                case 'MI_SE': return { bg: 'bg-blue-400', badge: 'bg-blue-500' };
                                case 'MA_ST': return { bg: 'bg-red-400', badge: 'bg-red-600' };
                                case 'MA_SE': return { bg: 'bg-purple-400', badge: 'bg-purple-600' };
                                default: return { bg: 'bg-gray-400', badge: 'bg-gray-500' };
                              }
                            };
                            
                            const getErrorTypeLabel = (errorType: string) => {
                              switch (errorType) {
                                case 'MI_ST': return 'Minor Syntactic';
                                case 'MI_SE': return 'Minor Semantic';
                                case 'MA_ST': return 'Major Syntactic';
                                case 'MA_SE': return 'Major Semantic';
                                default: return 'Unknown Type';
                              }
                            };
                            
                            const colors = getHighlightColor(highlight.error_type || 'MI_SE');
                            const errorTypeLabel = getErrorTypeLabel(highlight.error_type || 'MI_SE');
                            
                            return (
                              <div key={highlight.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${colors.bg}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-gray-700">
                                      "{highlight.highlighted_text}"
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${colors.badge}`}>
                                      {errorTypeLabel}
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
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <Check className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium text-emerald-800">Translation looks good!</h4>
                              <p className="text-xs text-emerald-700 mt-1">
                                You haven't highlighted any issues. If you think this translation is accurate and well-written, just add your scores below and submit.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Final Form */}
                    {annotation.highlights.length > 0 && (
                      <div className="mb-4">
                        {(() => {
                          const { errors } = validateAnnotation(annotation);
                          const hasFinalFormError = errors.some(error => error.includes('Final form'));
                          
                          return (
                            <>
                              <label className={`block text-sm font-medium mb-2 ${
                                hasFinalFormError ? 'text-red-700' : 'text-gray-700'
                              }`}>
                                Final Form of the Sentence <span className="text-red-500">*</span>
                                {hasFinalFormError && (
                                  <span className="text-red-600 text-xs ml-2">- Please write the corrected sentence here</span>
                                )}
                              </label>
                              <textarea
                                value={annotation.final_form}
                                onChange={(e) => handleFinalFormChange(sentence.id, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                                  hasFinalFormError 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                                }`}
                                rows={3}
                                placeholder="Please provide the corrected/final form of the sentence..."
                              />
                              {hasFinalFormError && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                  Since you highlighted errors above, please write how the sentence should be corrected
                                </p>
                              )}
                            </>
                          );
                        })()}
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
                      {(() => {
                        const { errors } = validateAnnotation(annotation);
                        const hasScoreError = errors.some(error => error.includes('score'));
                        
                        return (
                          <>
                            <RatingButtons
                              value={annotation.fluency_score}
                              onChange={(value) => handleRatingChange(sentence.id, 'fluency_score', value)}
                              label="Fluency Score"
                              showRequired={hasScoreError}
                            />
                            <RatingButtons
                              value={annotation.adequacy_score}
                              onChange={(value) => handleRatingChange(sentence.id, 'adequacy_score', value)}
                              label="Adequacy Score"
                              showRequired={hasScoreError}
                            />
                            <RatingButtons
                              value={annotation.overall_quality}
                              onChange={(value) => handleRatingChange(sentence.id, 'overall_quality', value)}
                              label="Overall Quality"
                              showRequired={hasScoreError}
                            />
                          </>
                        );
                      })()}
                    </div>

                    {/* Submit Button */}
                    <div className="space-y-3">
                      {(() => {
                        const { errors, warnings } = validateAnnotation(annotation);
                        const hasErrors = errors.length > 0;
                        const hasWarnings = warnings.length > 0;
                        
                        return (
                          <>
                            {/* Validation Messages */}
                            {hasErrors && (
                              <div className="flex items-start space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Please complete these steps:</p>
                                  <ul className="mt-1 list-disc list-inside space-y-1">
                                    {errors.map((error, index) => (
                                      <li key={index} className="text-xs">{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            
                            {hasWarnings && !hasErrors && (
                              <div className="flex items-start space-x-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Just double-checking:</p>
                                  <ul className="mt-1 list-disc list-inside space-y-1">
                                    {warnings.map((warning, index) => (
                                      <li key={index} className="text-xs">{warning}</li>
                                    ))}
                                  </ul>
                                  <p className="text-xs mt-2 italic">We'll ask you to confirm before submitting.</p>
                                </div>
                              </div>
                            )}
                            
                            {!hasErrors && !hasWarnings && (
                              <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                                <Check className="h-4 w-4" />
                                <span className="font-medium">Ready to submit!</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      
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
                          disabled={isSubmitting || (() => {
                            const { errors } = validateAnnotation(annotation);
                            return errors.length > 0;
                          })()}
                          className={`flex items-center space-x-2 transition-all duration-200 ${
                            (() => {
                              const { errors } = validateAnnotation(annotation);
                              if (errors.length > 0) {
                                return 'bg-gray-300 text-gray-500 cursor-not-allowed py-2 px-4 rounded-lg';
                              }
                              return 'btn-primary hover:bg-blue-700 focus:ring-4 focus:ring-blue-200';
                            })()
                          }`}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                Error Type & Severity
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Minor Errors</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setTempErrorType('MI_ST')}
                      className={`w-full px-3 py-2 text-xs rounded border-2 transition-all ${
                        tempErrorType === 'MI_ST' 
                          ? 'border-orange-500 bg-orange-50 text-orange-700' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Minor Syntactic
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempErrorType('MI_SE')}
                      className={`w-full px-3 py-2 text-xs rounded border-2 transition-all ${
                        tempErrorType === 'MI_SE' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Minor Semantic
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Major Errors</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setTempErrorType('MA_ST')}
                      className={`w-full px-3 py-2 text-xs rounded border-2 transition-all ${
                        tempErrorType === 'MA_ST' 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Major Syntactic
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempErrorType('MA_SE')}
                      className={`w-full px-3 py-2 text-xs rounded border-2 transition-all ${
                        tempErrorType === 'MA_SE' 
                          ? 'border-purple-500 bg-purple-50 text-purple-700' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Major Semantic
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <p><strong>Syntactic:</strong> Grammar, word order, inflection errors</p>
                <p><strong>Semantic:</strong> Meaning, context, word choice errors</p>
                <p><strong>Minor:</strong> Small errors that don't affect overall understanding</p>
                <p><strong>Major:</strong> Significant errors that impact comprehension</p>
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

      {/* Error Modal */}
      {showErrorModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isErrorModalClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}>
          <div className={`bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl ${
            isErrorModalClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Almost there! Just a couple more steps
                </h3>
                <p className="text-sm text-gray-600">Please complete the highlighted items below:</p>
              </div>
            </div>
            
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Quick reminder:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Click on a number (1-5) to rate the translation quality</li>
                <li>• If you highlighted errors, write the corrected sentence</li>
                <li>• If the translation is perfect, just rate it and submit!</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={closeErrorModal}
                className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-200"
              >
                OK, I'll fix that
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && pendingSubmitSentenceId && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
          isSubmitModalClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}>
          <div className={`bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl ${
            isSubmitModalClosing ? 'animate-scale-out' : 'animate-scale-in'
          }`}>
            {(() => {
              const annotation = annotations.get(pendingSubmitSentenceId);
              if (!annotation) return null;
              
              const { warnings } = validateAnnotation(annotation);
              const hasWarnings = warnings.length > 0;
              const isSubmitting = submittingIds.has(pendingSubmitSentenceId);
              
              return (
                <>
                  <div className="flex items-center mb-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      hasWarnings ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      {hasWarnings ? (
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      ) : (
                        <Check className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {hasWarnings ? 'Ready to submit?' : 'Submit your annotation'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {hasWarnings ? 'Please confirm your submission' : 'Your annotation is ready to be submitted'}
                      </p>
                    </div>
                  </div>

                  {/* Warning message for perfect translations */}
                  {hasWarnings && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-amber-800 text-sm font-medium mb-1">Just double-checking:</p>
                          <p className="text-amber-700 text-sm">{warnings[0]}</p>
                          <p className="text-amber-600 text-xs mt-2">
                            Are you confident this translation needs no improvements?
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Annotation Summary:</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-600">Ratings given:</p>
                        <ul className="mt-1 space-y-1 text-gray-800">
                          {annotation.fluency_score && <li>• Fluency: {annotation.fluency_score}/5</li>}
                          {annotation.adequacy_score && <li>• Adequacy: {annotation.adequacy_score}/5</li>}
                          {annotation.overall_quality && <li>• Overall: {annotation.overall_quality}/5</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-gray-600">Annotations:</p>
                        <ul className="mt-1 space-y-1 text-gray-800">
                          <li>• {annotation.highlights.length} error(s) highlighted</li>
                          {annotation.final_form.trim() && <li>• Corrected sentence provided</li>}
                          {annotation.comments.trim() && <li>• Additional comments added</li>}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeSubmitModal}
                      className="btn-secondary"
                      disabled={isSubmitting}
                    >
                      Review More
                    </button>
                    <button
                      onClick={confirmSubmit}
                      disabled={isSubmitting}
                      className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-200 flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Yes, Submit</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}


    </div>
  );
};

export default AnnotationInterface;