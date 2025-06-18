#!/usr/bin/env python3
"""
DistilBERT-based Machine Translation Quality Evaluator

This module implements a lean MVP for machine translation quality assessment
using DistilBERT as the base model. For demo purposes, it uses simulated 
scoring rather than actual model inference due to computational limitations.

The evaluator:
1. Analyzes syntax and semantic errors in translations
2. Estimates fluency and adequacy scores
3. Provides an overall quality score
4. Generates explanations for errors
5. Suggests corrections

Based on the paper's methodology with DistilBERT as baseline.
"""

import random
import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import re


@dataclass
class SyntaxError:
    """Represents a syntax error in the translation"""
    error_type: str  # 'grammar', 'word_order', 'punctuation', 'capitalization'
    severity: str   # 'minor', 'major', 'critical'
    start_position: int
    end_position: int
    text_span: str
    description: str
    suggested_fix: Optional[str] = None


@dataclass
class SemanticError:
    """Represents a semantic error in the translation"""
    error_type: str  # 'mistranslation', 'omission', 'addition', 'wrong_sense'
    severity: str   # 'minor', 'major', 'critical'
    start_position: int
    end_position: int
    text_span: str
    description: str
    suggested_fix: Optional[str] = None


@dataclass
class MTQualityScore:
    """Machine Translation Quality Assessment Result"""
    fluency_score: float        # 1-5 scale
    adequacy_score: float       # 1-5 scale
    overall_quality: float      # 1-5 scale
    syntax_errors: List[SyntaxError]
    semantic_errors: List[SemanticError]
    quality_explanation: str
    correction_suggestions: List[str]
    model_confidence: float     # 0-1 scale
    processing_time_ms: int


class DistilBERTMTEvaluator:
    """
    DistilBERT-based Machine Translation Quality Evaluator
    
    This is a simulated implementation for demo purposes.
    In production, this would use actual DistilBERT model inference.
    """
    
    def __init__(self):
        """Initialize the evaluator with simulated model weights"""
        self.model_name = "distilbert-base-multilingual-cased"
        self.confidence_threshold = 0.7
        
        # Common error patterns for simulation
        self.syntax_patterns = {
            'grammar': [
                (r'\b(a|an)\s+(vowel_word)', 'Article agreement error'),
                (r'\b(is|are)\s+(singular|plural)', 'Subject-verb disagreement'),
                (r'(he|she)\s+(are)', 'Pronoun-verb disagreement')
            ],
            'word_order': [
                (r'\badj\s+noun\s+adj\b', 'Inconsistent adjective placement'),
                (r'\bverb.*object.*subject\b', 'Unusual word order')
            ],
            'punctuation': [
                (r'[.!?]\s*[a-z]', 'Missing capitalization after punctuation'),
                (r'\s+[.!?]', 'Space before punctuation')
            ]
        }
        
        self.semantic_patterns = {
            'mistranslation': ['completely different meaning', 'wrong interpretation'],
            'omission': ['missing information', 'incomplete translation'],
            'addition': ['extra information not in source', 'unnecessary addition'],
            'wrong_sense': ['wrong word sense', 'incorrect context usage']
        }

    def evaluate_translation(
        self, 
        source_text: str, 
        target_text: str, 
        source_language: str = "en",
        target_language: str = "es"
    ) -> MTQualityScore:
        """
        Evaluate machine translation quality using simulated DistilBERT analysis
        
        Args:
            source_text: Original text
            target_text: Machine translation
            source_language: Source language code
            target_language: Target language code
            
        Returns:
            MTQualityScore with detailed assessment
        """
        start_time = time.time()
        
        # Simulate model processing time
        processing_delay = random.uniform(0.1, 0.3)
        time.sleep(processing_delay)
        
        # Analyze syntax errors
        syntax_errors = self._detect_syntax_errors(target_text)
        
        # Analyze semantic errors  
        semantic_errors = self._detect_semantic_errors(source_text, target_text)
        
        # Calculate quality scores based on errors
        fluency_score = self._calculate_fluency_score(target_text, syntax_errors)
        adequacy_score = self._calculate_adequacy_score(source_text, target_text, semantic_errors)
        overall_quality = self._calculate_overall_quality(fluency_score, adequacy_score, syntax_errors, semantic_errors)
        
        # Generate explanations and suggestions
        quality_explanation = self._generate_quality_explanation(fluency_score, adequacy_score, syntax_errors, semantic_errors)
        correction_suggestions = self._generate_correction_suggestions(syntax_errors, semantic_errors)
        
        # Calculate model confidence (simulated)
        model_confidence = self._calculate_confidence(fluency_score, adequacy_score, len(syntax_errors), len(semantic_errors))
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return MTQualityScore(
            fluency_score=fluency_score,
            adequacy_score=adequacy_score,
            overall_quality=overall_quality,
            syntax_errors=syntax_errors,
            semantic_errors=semantic_errors,
            quality_explanation=quality_explanation,
            correction_suggestions=correction_suggestions,
            model_confidence=model_confidence,
            processing_time_ms=processing_time_ms
        )

    def _detect_syntax_errors(self, text: str) -> List[SyntaxError]:
        """Simulate syntax error detection using pattern matching"""
        errors = []
        
        # Simulate grammar errors
        if random.random() < 0.3:  # 30% chance of grammar error
            # Find a random word to mark as error
            words = text.split()
            if words:
                error_word_idx = random.randint(0, len(words) - 1)
                start_pos = sum(len(words[i]) + 1 for i in range(error_word_idx))
                end_pos = start_pos + len(words[error_word_idx])
                
                errors.append(SyntaxError(
                    error_type='grammar',
                    severity=random.choice(['minor', 'major']),
                    start_position=start_pos,
                    end_position=end_pos,
                    text_span=words[error_word_idx],
                    description=f"Potential grammar issue with '{words[error_word_idx]}'",
                    suggested_fix=f"Consider revising '{words[error_word_idx]}'"
                ))
        
        # Simulate punctuation errors
        if random.random() < 0.2:  # 20% chance of punctuation error
            if '.' in text:
                pos = text.find('.')
                errors.append(SyntaxError(
                    error_type='punctuation',
                    severity='minor',
                    start_position=pos,
                    end_position=pos + 1,
                    text_span='.',
                    description="Check punctuation usage",
                    suggested_fix="Verify punctuation placement"
                ))
        
        return errors

    def _detect_semantic_errors(self, source_text: str, target_text: str) -> List[SemanticError]:
        """Simulate semantic error detection"""
        errors = []
        
        # Simulate semantic errors based on text length and complexity
        if random.random() < 0.25:  # 25% chance of semantic error
            # Find a random phrase to mark as error
            words = target_text.split()
            if len(words) >= 2:
                start_idx = random.randint(0, len(words) - 2)
                end_idx = start_idx + random.randint(1, min(3, len(words) - start_idx))
                
                error_span = ' '.join(words[start_idx:end_idx])
                start_pos = sum(len(words[i]) + 1 for i in range(start_idx))
                end_pos = start_pos + len(error_span)
                
                error_types = ['mistranslation', 'wrong_sense', 'addition']
                error_type = random.choice(error_types)
                
                errors.append(SemanticError(
                    error_type=error_type,
                    severity=random.choice(['minor', 'major', 'critical']),
                    start_position=start_pos,
                    end_position=end_pos,
                    text_span=error_span,
                    description=f"Potential {error_type} in '{error_span}'",
                    suggested_fix=f"Review meaning of '{error_span}' against source"
                ))
        
        return errors

    def _calculate_fluency_score(self, text: str, syntax_errors: List[SyntaxError]) -> float:
        """Calculate fluency score based on syntax errors and text characteristics"""
        base_score = 4.0  # Start with good score
        
        # Deduct points for syntax errors
        for error in syntax_errors:
            if error.severity == 'critical':
                base_score -= 1.0
            elif error.severity == 'major':
                base_score -= 0.5
            else:  # minor
                base_score -= 0.2
        
        # Consider text length and complexity (simulated)
        words = text.split()
        if len(words) < 5:
            base_score -= 0.2  # Very short texts might lack fluency
        elif len(words) > 50:
            base_score += 0.1  # Longer texts that are error-free show good fluency
        
        # Add some randomness for realistic simulation
        base_score += random.uniform(-0.3, 0.3)
        
        return max(1.0, min(5.0, base_score))

    def _calculate_adequacy_score(self, source_text: str, target_text: str, semantic_errors: List[SemanticError]) -> float:
        """Calculate adequacy score based on semantic errors and meaning preservation"""
        base_score = 4.0  # Start with good score
        
        # Deduct points for semantic errors
        for error in semantic_errors:
            if error.severity == 'critical':
                base_score -= 1.5
            elif error.severity == 'major':
                base_score -= 0.8
            else:  # minor
                base_score -= 0.3
        
        # Consider length ratio (very different lengths might indicate issues)
        source_words = len(source_text.split())
        target_words = len(target_text.split())
        
        if source_words > 0:
            length_ratio = target_words / source_words
            if length_ratio < 0.5 or length_ratio > 2.0:
                base_score -= 0.5  # Significant length mismatch
        
        # Add some randomness for realistic simulation
        base_score += random.uniform(-0.3, 0.3)
        
        return max(1.0, min(5.0, base_score))

    def _calculate_overall_quality(
        self, 
        fluency: float, 
        adequacy: float, 
        syntax_errors: List[SyntaxError], 
        semantic_errors: List[SemanticError]
    ) -> float:
        """Calculate overall quality score considering all factors"""
        # Weighted average of fluency and adequacy
        base_score = (fluency * 0.4 + adequacy * 0.6)
        
        # Additional penalty for having both types of errors
        if syntax_errors and semantic_errors:
            base_score -= 0.2
        
        # Critical errors have additional impact on overall score
        critical_errors = sum(1 for error in syntax_errors + semantic_errors if error.severity == 'critical')
        base_score -= critical_errors * 0.3
        
        return max(1.0, min(5.0, base_score))

    def _generate_quality_explanation(
        self,
        fluency: float,
        adequacy: float, 
        syntax_errors: List[SyntaxError],
        semantic_errors: List[SemanticError]
    ) -> str:
        """Generate human-readable explanation of the quality assessment"""
        explanations = []
        
        # Overall assessment
        if fluency >= 4.0 and adequacy >= 4.0:
            explanations.append("This is a high-quality translation with good fluency and adequacy.")
        elif fluency >= 3.0 and adequacy >= 3.0:
            explanations.append("This is an acceptable translation with moderate quality.")
        else:
            explanations.append("This translation has significant quality issues that need attention.")
        
        # Fluency assessment
        if fluency < 3.0:
            explanations.append(f"Fluency is low ({fluency:.1f}/5.0) due to grammatical and structural issues.")
        elif fluency >= 4.0:
            explanations.append(f"The translation reads naturally with good fluency ({fluency:.1f}/5.0).")
        
        # Adequacy assessment  
        if adequacy < 3.0:
            explanations.append(f"Adequacy is poor ({adequacy:.1f}/5.0) with meaning preservation issues.")
        elif adequacy >= 4.0:
            explanations.append(f"The translation adequately conveys the source meaning ({adequacy:.1f}/5.0).")
        
        # Error analysis
        if syntax_errors:
            explanations.append(f"Found {len(syntax_errors)} syntax error(s) affecting readability.")
        
        if semantic_errors:
            explanations.append(f"Detected {len(semantic_errors)} semantic error(s) affecting meaning accuracy.")
        
        return " ".join(explanations)

    def _generate_correction_suggestions(
        self, 
        syntax_errors: List[SyntaxError], 
        semantic_errors: List[SemanticError]
    ) -> List[str]:
        """Generate actionable correction suggestions"""
        suggestions = []
        
        # Syntax suggestions
        for error in syntax_errors:
            if error.suggested_fix:
                suggestions.append(f"Syntax: {error.suggested_fix}")
        
        # Semantic suggestions
        for error in semantic_errors:
            if error.suggested_fix:
                suggestions.append(f"Meaning: {error.suggested_fix}")
        
        # General suggestions based on error patterns
        if syntax_errors:
            suggestions.append("Review grammar and sentence structure for better readability.")
        
        if semantic_errors:
            suggestions.append("Cross-check meaning preservation against the source text.")
        
        if not syntax_errors and not semantic_errors:
            suggestions.append("The translation appears to be of good quality.")
        
        return suggestions[:5]  # Limit to 5 suggestions

    def _calculate_confidence(
        self, 
        fluency: float, 
        adequacy: float, 
        syntax_error_count: int, 
        semantic_error_count: int
    ) -> float:
        """Calculate model confidence in the assessment"""
        # Base confidence on score consistency and error detection
        base_confidence = 0.8
        
        # Higher confidence for consistent scores
        score_variance = abs(fluency - adequacy)
        if score_variance < 0.5:
            base_confidence += 0.1
        elif score_variance > 1.5:
            base_confidence -= 0.2
        
        # Adjust for error detection confidence
        total_errors = syntax_error_count + semantic_error_count
        if total_errors == 0:
            base_confidence += 0.1  # Confident in clean text
        elif total_errors > 5:
            base_confidence -= 0.1  # Less confident with many errors
        
        # Add some randomness
        base_confidence += random.uniform(-0.1, 0.1)
        
        return max(0.1, min(1.0, base_confidence))


# Convenience function for quick evaluation
def evaluate_mt_quality(
    source_text: str,
    target_text: str, 
    source_language: str = "en",
    target_language: str = "es"
) -> MTQualityScore:
    """
    Quick evaluation function for machine translation quality
    
    Args:
        source_text: Original text
        target_text: Machine translation
        source_language: Source language code  
        target_language: Target language code
        
    Returns:
        MTQualityScore with detailed assessment
    """
    evaluator = DistilBERTMTEvaluator()
    return evaluator.evaluate_translation(source_text, target_text, source_language, target_language)


# Example usage for testing
if __name__ == "__main__":
    # Test the evaluator
    source = "Hello, how are you today?"
    target = "Hola, ¿cómo estás hoy?"
    
    result = evaluate_mt_quality(source, target, "en", "es")
    
    print(f"Fluency: {result.fluency_score:.1f}/5.0")
    print(f"Adequacy: {result.adequacy_score:.1f}/5.0") 
    print(f"Overall Quality: {result.overall_quality:.1f}/5.0")
    print(f"Model Confidence: {result.model_confidence:.2f}")
    print(f"Processing Time: {result.processing_time_ms}ms")
    print(f"\nExplanation: {result.quality_explanation}")
    print(f"\nSuggestions: {result.correction_suggestions}")
