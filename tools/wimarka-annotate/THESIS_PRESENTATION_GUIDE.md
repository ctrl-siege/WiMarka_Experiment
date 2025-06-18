# WiMarka Annotation Tool: Backend & Database Pipeline Study Guide

## Executive Summary for Thesis Panel

**WiMarka** is a reference-free machine translation (MT) quality evaluation metric specifically designed for Philippine languages (Cebuano, Tagalog, Hiligaynon, Ilocano, Waray). This annotation tool serves as a validation platform to collect human annotations that compare against AI-generated quality assessments using DistilBERT, establishing ground truth data for MT evaluation research in low-resource Philippine languages.

---

## 1. System Architecture Overview

### High-Level Pipeline

```text
Source Text + MT → DistilBERT Evaluator → Quality Scores → Human Validation → Research Data
```

The system follows a **three-tier architecture**: **Frontend (React/TypeScript)** communicates with **Backend API (FastAPI/Python)** which manages **Database (SQLite)** and **AI Evaluation Engine (DistilBERT)**. This architecture enables real-time quality assessment while collecting comparative human judgments for validation research.

### Key Research Contribution

The tool addresses the critical gap in MT evaluation for Philippine languages by creating a dataset that compares human expert annotations with AI-generated quality assessments, enabling validation of the WiMarka metric's effectiveness across different Philippine language pairs.

---

## 2. Database Schema & Data Storage Strategy

### Core Data Models

**Users Table** - Manages authentication and role-based access with three distinct user types: administrators (system management), evaluators (human assessment), and annotators (legacy annotation support). Each user has language preferences stored in a separate `user_languages` relationship table, enabling multilingual expertise tracking.

**Sentences Table** - Stores the core evaluation data consisting of source text, machine translation, language pair metadata (source_language, target_language), and domain classification (general, technical, medical). Each sentence can be evaluated multiple times by different evaluators, creating a rich comparative dataset.

**MTQualityAssessment Table** - The central research data collection point storing both AI-generated and human-validated quality metrics including fluency scores (1-5), adequacy scores (1-5), overall quality scores (0-100), detailed error analysis stored as JSON arrays, AI confidence levels, processing time metrics, and optional human feedback corrections.

### Error Analysis Data Structure

```python
# Syntax Errors JSON Structure
{
  "error_type": "grammar|word_order|punctuation|capitalization",
  "severity": "minor|major|critical",
  "start_position": int,
  "end_position": int, 
  "text_span": "actual_text",
  "description": "detailed_explanation",
  "suggested_fix": "proposed_correction"
}

# Semantic Errors JSON Structure  
{
  "error_type": "mistranslation|omission|addition|wrong_sense",
  "severity": "minor|major|critical",
  "start_position": int,
  "end_position": int,
  "text_span": "actual_text", 
  "description": "semantic_issue_explanation",
  "suggested_fix": "proposed_semantic_fix"
}
```

---

## 3. AI Evaluation Pipeline (DistilBERT Implementation)

### Quality Assessment Process

The **DistilBERTMTEvaluator** class implements a comprehensive MT quality assessment pipeline that analyzes translation quality across multiple dimensions. The evaluator processes source text and machine translation pairs to generate fluency scores (grammatical correctness and naturalness), adequacy scores (meaning preservation from source), and overall quality percentages.

### Error Detection Methodology

The system implements sophisticated error detection algorithms that identify **syntax errors** (grammar violations, word order issues, punctuation problems) and **semantic errors** (mistranslations, omissions, additions, wrong word sense). Each error is mapped to specific text positions, classified by severity, and includes suggested corrections, enabling detailed linguistic analysis for research purposes.

### Performance Metrics Collection

Every AI evaluation captures processing time, model confidence levels, and detailed error categorization, creating a comprehensive dataset for analyzing AI performance across different Philippine language pairs and enabling statistical comparison with human evaluator agreement rates.

---

## 4. Human Validation Workflow

### Evaluator Interface Pipeline

Human evaluators receive AI-generated assessments and can **validate, modify, or override** the AI scores while providing additional feedback. The system tracks time spent on each evaluation, captures human corrections, and maintains evaluation status (pending, completed, reviewed) for workflow management.

### Comparative Data Collection

Each assessment creates parallel datasets: **AI-generated scores** with confidence metrics and **human-validated scores** with correction notes. This dual-track approach enables statistical analysis of human-AI agreement rates, identification of AI blind spots, and validation of the WiMarka metric across Philippine language pairs.

### Quality Control Mechanisms

The system implements guidelines tracking (ensuring evaluators see assessment criteria), role-based permissions (preventing unauthorized access), and evaluation status monitoring (tracking completion rates and quality metrics) to maintain data integrity for research purposes.

---

## 5. Database Migration & Evolution Strategy

### Schema Evolution Management

The database uses a **migration-based approach** with dedicated scripts for each feature addition: `migrate_mt_quality.py` (added MT assessment table), `migrate_user_languages.py` (implemented multi-language support), `migrate_evaluator.py` (added evaluator roles). This approach ensures backward compatibility and safe production deployments while maintaining research data integrity.

### Data Versioning Strategy

Each database change is tracked through migration scripts that preserve existing data while adding new functionality. This approach is crucial for longitudinal research studies where data consistency across different development phases must be maintained for valid statistical analysis.

---

## 6. Research Data Pipeline

### Statistical Analysis Support

The database design specifically supports research hypothesis testing through structured data collection. Admin endpoints provide aggregated statistics including total assessments, AI-human agreement percentages, processing time distributions, and language-specific performance metrics that enable comprehensive research analysis.

### Export Capabilities for Research

```python
# Research Data Extraction Example
@app.get("/api/admin/stats")
def get_admin_stats():
    return {
        "total_assessments": count,
        "ai_human_agreement": percentage,
        "avg_processing_time": milliseconds, 
        "language_distribution": breakdown,
        "error_detection_accuracy": precision_recall_metrics
    }
```

### Validation Metrics Collection

The system tracks crucial research metrics including **human-AI agreement rates** (percentage of times human evaluators agree with AI assessments), **error detection precision** (accuracy of AI error identification), **processing efficiency** (AI evaluation speed vs human evaluation time), and **language-specific performance** (comparative accuracy across Philippine languages).

---

## 7. Technical Implementation Highlights

### FastAPI Backend Architecture

The backend implements **RESTful API design** with automatic documentation generation, **Pydantic data validation** ensuring type safety and data integrity, **SQLAlchemy ORM** for database abstraction and relationship management, and **JWT-based authentication** with role-based access control for secure multi-user research environments.

### Database Optimization Strategy

Performance optimization includes strategic indexing on frequently queried fields (sentence_id, evaluator_id, evaluation_status), efficient relationship mapping using SQLAlchemy's lazy loading, and JSON storage for complex nested error data while maintaining queryability for research analysis.

### Scalability Considerations

The architecture supports horizontal scaling through stateless API design, database connection pooling for concurrent users, and modular component design enabling independent scaling of evaluation processing, user management, and data export functionality as research demands increase.

---

## 8. Key Research Contributions

### Ground Truth Dataset Creation

This tool creates the **first comprehensive human-annotated dataset** for MT quality evaluation in Philippine languages, providing essential ground truth data for validating automatic evaluation metrics like WiMarka against human expert judgments.

### Cross-Linguistic Validation

The multi-language support enables **comparative analysis across Philippine languages**, identifying language-specific challenges in MT evaluation and validating whether the WiMarka metric performs consistently across the diverse linguistic features of Philippine languages.

### AI-Human Comparative Analysis

The parallel collection of AI and human evaluations enables **statistical validation** of automatic MT evaluation approaches, measuring agreement rates, identifying systematic biases, and establishing confidence intervals for AI-based quality assessment in low-resource language contexts.

---

## 9. Presentation Strategy for Thesis Panel

### Technical Demonstration Flow

1. **Live Schema Walkthrough** - Show actual database tables using SQLite browser, highlighting relationship mappings and data types
2. **API Documentation Demo** - Use FastAPI's automatic `/docs` endpoint to demonstrate endpoint functionality and data flow
3. **Data Pipeline Visualization** - Walk through actual evaluation process from sentence input to final comparative analysis
4. **Research Metrics Dashboard** - Show admin statistics demonstrating data collection progress and preliminary findings

### Key Metrics to Highlight

- **Dataset Size**: Total sentences evaluated, number of evaluators, assessment completion rates
- **Agreement Analysis**: Preliminary human-AI agreement statistics across language pairs
- **Processing Efficiency**: AI evaluation speed vs human evaluation time comparisons
- **Error Detection Performance**: Precision and recall of AI error identification validated against human annotations

### Research Validation Points

- **Methodology Soundness**: Database design ensures unbiased data collection with proper controls
- **Statistical Validity**: Sufficient sample sizes across Philippine languages for meaningful analysis
- **Reproducibility**: All evaluations are timestamped, versioned, and exportable for independent verification
- **Scalability**: Architecture supports expansion to additional Philippine languages and evaluation metrics

---

## 10. Future Research Directions

### Dataset Expansion Capabilities

The flexible schema supports adding new Philippine languages, incorporating additional MT systems, extending error taxonomies, and integrating new evaluation metrics without requiring fundamental architectural changes.

### Advanced Analytics Integration

The structured data format enables integration with statistical analysis tools, machine learning validation frameworks, and linguistic analysis software, supporting comprehensive research publication and collaboration opportunities.

### Community Research Platform

The role-based system can accommodate multiple research institutions, enabling collaborative annotation projects, inter-annotator agreement studies, and distributed evaluation campaigns across Philippine linguistic communities.

---

## Study Points for Panel Questions

**Q: How does your database ensure data quality for research?**
A: Multi-layered validation through Pydantic schemas, foreign key constraints, role-based access control, evaluation status tracking, and migration-based schema evolution ensuring data integrity throughout the research process.

**Q: What makes this dataset unique for Philippine languages?**
A: First comprehensive MT quality dataset covering multiple Philippine languages with parallel AI-human annotations, structured error analysis, and language-specific performance metrics enabling cross-linguistic validation studies.

**Q: How do you handle scalability for larger research studies?**
A: Stateless API design, database connection pooling, modular architecture, efficient indexing, and JSON storage for complex data structures enable scaling to hundreds of evaluators and thousands of sentence pairs.

**Q: What statistical analyses does your data structure support?**
A: Agreement coefficient calculations, error detection precision/recall analysis, processing time distributions, language-specific performance comparisons, and longitudinal validation studies through timestamped evaluation tracking.

**Q: How do you ensure reproducibility of research findings?**
A: Complete audit trail through database timestamps, migration version control, exported data formats, documented API endpoints, and standardized evaluation protocols ensuring independent verification and replication studies.

This comprehensive guide provides the technical depth and research context needed for a successful thesis presentation while demonstrating both engineering competence and research methodology understanding.
