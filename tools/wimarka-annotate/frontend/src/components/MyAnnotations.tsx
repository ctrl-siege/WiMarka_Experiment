import React, { useState, useEffect, useRef } from 'react';
import { annotationsAPI } from '../services/api';
import type { Annotation, TextHighlight, AnnotationUpdate } from '../types';
import { BarChart3, Calendar, Clock, Star, MessageCircle, Edit, AlertTriangle, Plus, Trash2, ChevronRight } from 'lucide-react';

interface TextSegment extends Omit<TextHighlight, 'id' | 'annotation_id' | 'created_at'> {
  id: string; // temporary local ID for UI
}

const MyAnnotations: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  
  // Edit mode states
  const [editingAnnotation, setEditingAnnotation] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    fluency_score?: number;
    adequacy_score?: number;
    overall_quality?: number;
    comments: string;
    final_form: string;
    highlights: TextSegment[];
  } | null>(null);
  
  // Modal states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingEditAnnotation, setPendingEditAnnotation] = useState<Annotation | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [tempErrorType, setTempErrorType] = useState<'MI_ST' | 'MI_SE' | 'MA_ST' | 'MA_SE'>('MI_ST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [annotationToDelete, setAnnotationToDelete] = useState<Annotation | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const textRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const handleEditClick = (annotation: Annotation) => {
    if (annotation.annotation_status === 'completed') {
      setPendingEditAnnotation(annotation);
      setShowWarningModal(true);
    } else {
      handleEditConfirm(annotation.id);
    }
  };

  const handleEditConfirm = (annotationId: number) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;

    setEditingAnnotation(annotationId);
    setEditForm({
      fluency_score: annotation.fluency_score,
      adequacy_score: annotation.adequacy_score,
      overall_quality: annotation.overall_quality,
      comments: annotation.comments || '',
      final_form: annotation.final_form || '',
      highlights: annotation.highlights.map(h => ({
        id: h.id?.toString() || Date.now().toString(),
        highlighted_text: h.highlighted_text,
        start_index: h.start_index,
        end_index: h.end_index,
        text_type: h.text_type,
        comment: h.comment,
        error_type: h.error_type || 'MI_ST',
      }))
    });
    setShowWarningModal(false);
    setPendingEditAnnotation(null);
  };

  const handleCancelEdit = () => {
    setEditingAnnotation(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingAnnotation) return;

    setIsSubmitting(true);
    try {
      const updateData: AnnotationUpdate = {
        fluency_score: editForm.fluency_score,
        adequacy_score: editForm.adequacy_score,
        overall_quality: editForm.overall_quality,
        comments: editForm.comments,
        final_form: editForm.final_form,
        annotation_status: 'completed', // Set to completed when saving changes
        highlights: editForm.highlights.map(h => ({
          highlighted_text: h.highlighted_text,
          start_index: h.start_index,
          end_index: h.end_index,
          text_type: h.text_type,
          comment: h.comment,
          error_type: h.error_type,
        }))
      };

      const updatedAnnotation = await annotationsAPI.updateAnnotation(editingAnnotation, updateData);
      
      setAnnotations(prev => prev.map(a => 
        a.id === editingAnnotation ? updatedAnnotation : a
      ));
      
      setEditingAnnotation(null);
      setEditForm(null);
      setMessage('Annotation updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating annotation:', error);
      setMessage('Error updating annotation. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextSelection = (sentenceId: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editingAnnotation) return;

    const range = selection.getRangeAt(0);
    const selectedTextValue = selection.toString().trim();
    
    if (selectedTextValue.length === 0) return;

    const refKey = `${sentenceId}-machine`;
    const container = textRefs.current.get(refKey);
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const annotation = annotations.find(a => a.id === editingAnnotation);
    if (!annotation) return;
    
    const originalText = annotation.sentence.machine_translation;
    if (!originalText) return;

    const startIndex = originalText.indexOf(selectedTextValue);
    if (startIndex === -1) return;

    const endIndex = startIndex + selectedTextValue.length;
    setSelectedText(selectedTextValue);
    setSelectedRange({ start: startIndex, end: endIndex });
    setShowCommentModal(true);
    
    selection.removeAllRanges();
  };

  const handleDeleteClick = (annotation: Annotation) => {
    setAnnotationToDelete(annotation);
    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAnnotationToDelete(null);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!annotationToDelete || deleteConfirmText !== 'confirm delete') return;

    setIsDeleting(true);
    try {
      await annotationsAPI.deleteAnnotation(annotationToDelete.id);
      
      setAnnotations(prev => prev.filter(a => a.id !== annotationToDelete.id));
      setShowDeleteModal(false);
      setAnnotationToDelete(null);
      setDeleteConfirmText('');
      setMessage('Annotation deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting annotation:', error);
      setMessage('Error deleting annotation. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const addHighlight = () => {
    if (!selectedRange || !tempComment.trim() || !editForm) return;

    const newHighlight: TextSegment = {
      id: Date.now().toString(),
      highlighted_text: selectedText,
      start_index: selectedRange.start,
      end_index: selectedRange.end,
      comment: tempComment.trim(),
      text_type: 'machine',
      error_type: tempErrorType,
    };

    setEditForm(prev => prev ? {
      ...prev,
      // Prevent duplicate highlights
      highlights: prev.highlights.some(h =>
        h.start_index === newHighlight.start_index &&
        h.end_index === newHighlight.end_index &&
        h.text_type === newHighlight.text_type &&
        h.comment === newHighlight.comment
      ) ? prev.highlights : [...prev.highlights, newHighlight]
    } : null);

    setShowCommentModal(false);
    setTempComment('');
    setTempErrorType('MI_ST');
    setSelectedText('');
    setSelectedRange(null);
  };

  const removeHighlight = (highlightId: string) => {
    if (!editForm) return;

    setEditForm(prev => prev ? {
      ...prev,
      highlights: prev.highlights.filter(h => h.id !== highlightId)
    } : null);
  };

  const handleRatingChange = (field: 'fluency_score' | 'adequacy_score' | 'overall_quality', value: number) => {
    if (!editForm) return;

    setEditForm(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const renderHighlightedText = (text: string, highlights: TextHighlight[] | TextSegment[], textType: 'machine' | 'reference', isEditing = false, sentenceId?: number) => {
    const relevantHighlights = highlights.filter(h => h.text_type === textType);

    if (relevantHighlights.length === 0) {
      if (isEditing && sentenceId) {
        return (
          <div
            ref={(el) => {
              if (el) textRefs.current.set(`${sentenceId}-machine`, el);
            }}
            className="cursor-text select-text"
            onMouseUp={() => handleTextSelection(sentenceId)}
          >
            {text}
          </div>
        );
      }
      return <span>{text}</span>;
    }

    const validHighlights = relevantHighlights
      .filter(h => h.start_index >= 0 && h.end_index <= text.length && h.start_index < h.end_index)
      .sort((a, b) => a.start_index - b.start_index);
    
    if (validHighlights.length === 0) {
      if (isEditing && sentenceId) {
        return (
          <div
            ref={(el) => {
              if (el) textRefs.current.set(`${sentenceId}-machine`, el);
            }}
            className="cursor-text select-text"
            onMouseUp={() => handleTextSelection(sentenceId)}
          >
            {text}
          </div>
        );
      }
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    validHighlights.forEach((highlight, index) => {
      const startIndex = Math.max(highlight.start_index, lastIndex);
      const endIndex = Math.min(highlight.end_index, text.length);
      
      if (startIndex >= endIndex) return;

      if (startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, startIndex)}
          </span>
        );
      }

      const highlightedText = text.slice(startIndex, endIndex);
      const errorType = highlight.error_type || 'MI_ST';
      
      // Define colors and tags for different error types
      const getErrorTypeStyle = (type: string) => {
        switch (type) {
          case 'MI_ST': return 'bg-yellow-200 border-b-2 border-yellow-400';
          case 'MI_SE': return 'bg-blue-200 border-b-2 border-blue-400';
          case 'MA_ST': return 'bg-red-200 border-b-2 border-red-400';
          case 'MA_SE': return 'bg-purple-200 border-b-2 border-purple-400';
          default: return 'bg-gray-200 border-b-2 border-gray-400';
        }
      };
      
      parts.push(
        <span
          key={`highlight-${highlight.id || index}`}
          className={`${getErrorTypeStyle(errorType)} px-1 rounded cursor-pointer relative group`}
          title={`[${errorType}] ${highlight.comment}`}
        >
          <span className="text-xs font-bold text-gray-600">[{errorType}]</span>
          <span className="mx-1">{highlightedText}</span>
          <span className="text-xs font-bold text-gray-600">[/{errorType}]</span>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
              <div className="font-bold">[{errorType}]</div>
              <div>{highlight.comment}</div>
            </div>
          </div>
        </span>
      );

      lastIndex = endIndex;
    });

    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    const content = <>{parts}</>;

    if (isEditing && sentenceId) {
      return (
        <div
          ref={(el) => {
            if (el) textRefs.current.set(`${sentenceId}-machine`, el);
          }}
          className="cursor-text select-text"
          onMouseUp={() => handleTextSelection(sentenceId)}
        >
          {content}
        </div>
      );
    }

    return content;
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

  const RatingButtons: React.FC<{ 
    value: number | undefined; 
    onChange: (value: number) => void; 
    label: string;
  }> = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-8 h-8 text-sm rounded ${
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
        
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.includes('Error') 
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <p>{message}</p>
          </div>
        )}
        
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
                onClick={() => setFilter(filterOption.key as 'all' | 'in_progress' | 'completed')}
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
            {filteredAnnotations.map((annotation) => {
              const isEditing = editingAnnotation === annotation.id;
              const currentForm = isEditing ? editForm : null;
              
              return (
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
                    
                    {/* Action Buttons */}
                    {!isEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(annotation)}
                          className="btn-secondary text-sm flex items-center space-x-2 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md group"
                        >
                          <Edit className="h-4 w-4 group-hover:animate-pulse" />
                          <span className="group-hover:translate-x-0.5 transition-transform duration-300">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(annotation)}
                          className="btn-secondary text-sm flex items-center space-x-2 transition-all duration-300 hover:bg-red-50 hover:text-red-600 hover:shadow-md group"
                        >
                          <Trash2 className="h-4 w-4 group-hover:animate-pulse" />
                          <span className="group-hover:translate-x-0.5 transition-transform duration-300">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-6">
                      {/* Edit Form */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Source Text</h4>
                          <p className="text-sm text-gray-900 bg-white rounded p-3 border">
                            {annotation.sentence.source_text}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Machine Translation
                            <span className="ml-2 text-xs text-gray-500">- Click and drag to highlight</span>
                          </h4>
                          <div className="text-sm text-gray-900 bg-white rounded p-3 border">
                            {renderHighlightedText(
                              annotation.sentence.machine_translation, 
                              currentForm?.highlights || [], 
                              'machine', 
                              true, 
                              annotation.sentence.id
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Highlights Summary */}
                      {currentForm?.highlights && currentForm.highlights.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Your Annotations ({currentForm.highlights.length})
                          </h4>
                          <div className="space-y-2">
                            {currentForm.highlights.map((highlight) => (
                              <div key={highlight.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                                <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-gray-700">
                                      "{highlight.highlighted_text}"
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">{highlight.comment}</p>
                                </div>
                                <button
                                  onClick={() => removeHighlight(highlight.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Final Form */}
                      {currentForm?.highlights && currentForm.highlights.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Final Form of the Sentence <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={currentForm.final_form}
                            onChange={(e) => setEditForm(prev => prev ? {...prev, final_form: e.target.value} : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={3}
                            placeholder="Please provide the corrected/final form of the sentence..."
                          />
                        </div>
                      )}

                      {/* Comments */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional General Comments (Optional)
                        </label>
                        <textarea
                          value={currentForm?.comments || ''}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, comments: e.target.value} : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          rows={2}
                          placeholder="Any additional general comments about this translation..."
                        />
                      </div>

                      {/* Rating Section */}
                      <div className="grid md:grid-cols-3 gap-6">
                        <RatingButtons
                          value={currentForm?.fluency_score}
                          onChange={(value) => handleRatingChange('fluency_score', value)}
                          label="Fluency Score"
                        />
                        <RatingButtons
                          value={currentForm?.adequacy_score}
                          onChange={(value) => handleRatingChange('adequacy_score', value)}
                          label="Adequacy Score"
                        />
                        <RatingButtons
                          value={currentForm?.overall_quality}
                          onChange={(value) => handleRatingChange('overall_quality', value)}
                          label="Overall Quality"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={handleCancelEdit}
                          className="btn-secondary"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
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
                              <span>Save Changes</span>
                              <ChevronRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode */}
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
                                <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-gray-700">
                                      "{highlight.highlighted_text}"
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({highlight.text_type === 'machine' ? 'Machine Translation' : 'Reference Text'})
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">{highlight.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Final Form */}
                      {annotation.final_form && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Final Form</h4>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-gray-900">{annotation.final_form}</p>
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
                              <h5 className="text-xs font-medium text-gray-700 mb-1">Additional Comments</h5>
                              <p className="text-sm text-gray-900">{annotation.comments}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning Modal */}
      {showWarningModal && pendingEditAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Re-edit Completed Annotation
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                This annotation has already been completed. Are you sure you want to edit it? 
                This action will change the status back to "in progress" and update the modification timestamp.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setPendingEditAnnotation(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditConfirm(pendingEditAnnotation.id)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Yes, Edit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                Error Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'MI_ST', label: 'Minor Syntactic', color: 'yellow' },
                  { value: 'MI_SE', label: 'Minor Semantic', color: 'blue' },
                  { value: 'MA_ST', label: 'Major Syntactic', color: 'red' },
                  { value: 'MA_SE', label: 'Major Semantic', color: 'purple' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTempErrorType(option.value)}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      tempErrorType === option.value
                        ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold">[{option.value}]</div>
                    <div className="text-xs">{option.label}</div>
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
                onClick={() => {
                  setShowCommentModal(false);
                  setTempComment('');
                  setTempErrorType('MI_ST');
                  setSelectedText('');
                  setSelectedRange(null);
                }}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && annotationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Are you sure you want to delete this annotation? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="text-sm text-gray-700">
                  <strong>Annotation ID:</strong> #{annotationToDelete.id}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <strong>Sentence:</strong> {annotationToDelete.sentence.source_text.substring(0, 100)}...
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(annotationToDelete.annotation_status)}`}>
                    {annotationToDelete.annotation_status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To confirm deletion, please type: <strong>confirm delete</strong>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Type 'confirm delete' to proceed"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting || deleteConfirmText !== 'confirm delete'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  deleteConfirmText === 'confirm delete' && !isDeleting
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Annotation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAnnotations;