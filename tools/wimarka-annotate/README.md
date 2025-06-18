# WiMarka - MT Quality Assessment Tool

A comprehensive system for evaluating Machine Translation (MT) quality using DistilBERT-based assessment and human-in-the-loop evaluation. Built with FastAPI, SQLite, React, and TailwindCSS.

## Features

### MT Quality Assessment
- **Automated MT Evaluation**: DistilBERT-based quality scoring (0-100) with confidence levels
- **Error Detection & Classification**: Automatic detection of syntax and semantic errors
- **Detailed Explanations**: AI-generated explanations for quality scores and detected errors
- **Improvement Suggestions**: Automated suggestions for translation improvements
- **Human Feedback Integration**: Evaluators can confirm, reject, or modify AI assessments

### For Evaluators
- **Interactive Assessment Interface**: Review AI-generated quality scores and error analyses
- **Error Management**: Confirm, reject, or add new errors to AI findings
- **Feedback System**: Provide human judgment on AI assessments with detailed comments
- **Progress Tracking**: View assessment history and statistics
- **Quality Metrics**: Track agreement rates with AI and assessment accuracy

### For Administrators
- **Admin Dashboard**: Overview of system statistics and evaluation activity
- **User Management**: View all registered users and their roles (evaluators, admins)
- **Content Management**: Add new sentences for MT quality assessment
- **Analytics**: Track evaluation completion rates and AI vs human agreement

### Technical Features
- **AI-Powered Assessment**: Simulated DistilBERT model for MT quality evaluation
- **Secure Authentication**: JWT-based authentication with role-based access control
- **RESTful API**: Clean FastAPI backend with automatic documentation
- **Modern UI**: Responsive design with TailwindCSS focused on MT evaluation workflows
- **Real-time Processing**: Immediate AI assessment with human validation capability

## Tech Stack

### Backend

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **SQLite**: Lightweight database
- **JWT Authentication**: Secure token-based authentication
- **Pydantic**: Data validation and serialization
- **DistilBERT Integration**: (Simulated) AI model for MT quality assessment

### Frontend

- **React**: Modern JavaScript library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **Lucide React**: Beautiful icons

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database:**
   ```bash
   python init_db.py
   ```

5. **Start the FastAPI server:**
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`
   API documentation will be available at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## Default Credentials

After running the database initialization script, you can log in with:

- **Email**: admin@example.com
- **Password**: admin123
- **Role**: Administrator

## System Architecture

### Database Schema

### Database Schema

**Users Table:**
- User authentication and profile information
- Role-based access control (admin/evaluator)
- Activity tracking and evaluation statistics

**Sentences Table:**
- Source text and machine translations
- Reference translations (optional)
- Language pairs and domain classification

**MTQualityAssessment Table:**
- AI-generated quality scores (0-100) with confidence levels
- Detected errors with types (syntax/semantic) and descriptions
- AI explanations and improvement suggestions
- Human feedback and validation status
- Error confirmation/rejection by evaluators

### API Endpoints

**Authentication:**
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

**Sentences:**
- `GET /api/sentences` - List all sentences
- `GET /api/sentences/next` - Get next sentence for evaluation
- `POST /api/sentences` - Create new sentence (admin only)

**MT Quality Assessment:**
- `POST /api/mt-quality` - Create new MT quality assessment
- `GET /api/mt-quality` - Get user's assessments
- `PUT /api/mt-quality/{id}` - Update assessment with human feedback
- `GET /api/mt-quality/stats` - Get assessment statistics
- `POST /api/mt-quality/batch` - Batch process multiple assessments

**Admin:**
- `GET /api/admin/stats` - System statistics including MT quality metrics
- `GET /api/admin/users` - List all users
- `GET /api/admin/mt-quality` - List all MT quality assessments

## Usage Guide

### For Evaluators

1. **Register/Login**: Create an account or log in with existing credentials
2. **Start MT Assessment**: Navigate to the MT Quality Assessment interface
3. **Review AI Analysis**: Examine the AI-generated quality score, detected errors, and explanations
4. **Provide Human Feedback**: Confirm, reject, or modify AI findings with detailed comments
5. **Validate Errors**: Mark detected errors as correct or incorrect based on your expertise
6. **Submit Assessment**: Save your evaluation and move to the next sentence
7. **Track Progress**: View your assessment history and statistics in "My Evaluations"

### For Administrators

1. **Access Admin Panel**: Navigate to the admin dashboard (admin users only)
2. **Monitor MT Quality**: View system overview and evaluation statistics
3. **Manage Content**: Add new sentences for MT quality assessment
4. **Review Evaluators**: Monitor user registrations and evaluation activity
5. **Analyze Performance**: Track AI vs human agreement rates and assessment quality

## Quality Metrics

The system uses AI-powered MT evaluation with the following components:

- **Overall Quality Score (0-100)**: AI-generated assessment of translation quality
- **Confidence Level (0-1)**: AI confidence in the quality assessment
- **Error Detection**: Automatic identification of syntax and semantic errors
- **Error Types**: Classification of errors into categories (grammar, meaning, style, etc.)
- **Explanations**: AI-generated explanations for quality scores and detected issues
- **Human Validation**: Evaluator confirmation or correction of AI assessments

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `main.py`, define schemas in `schemas.py`
2. **Frontend**: Create new components in `src/components/`, add routes to `App.tsx`
3. **Database**: Modify models in `database.py`, run migrations if needed

### Configuration

- **Database URL**: Configure in `backend/database.py`
- **JWT Secret**: Update `SECRET_KEY` in `backend/auth.py`
- **CORS Settings**: Modify allowed origins in `backend/main.py`
- **API Base URL**: Update in `frontend/src/services/api.ts`

## Production Deployment

### Backend
- Use a production WSGI server like Gunicorn or Uvicorn
- Configure environment variables for sensitive data
- Use a production database (PostgreSQL recommended)
- Set up proper logging and monitoring

### Frontend
- Build the production bundle: `npm run build`
- Serve static files with a web server (Nginx recommended)
- Configure proper caching headers
- Set up HTTPS and security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review the database schema in `database.py`
3. Check browser console for frontend errors
4. Review server logs for backend issues 