# WiMarka - Annotation Tool

A comprehensive system for linguists and native speakers to annotate machine translated sentences. Built with FastAPI, SQLite, React, and TailwindCSS.

## Features

### For Annotators
- **Interactive Annotation Interface**: Rate translations on fluency, adequacy, and overall quality (1-5 scale)
- **Detailed Feedback**: Add error descriptions, suggested corrections, and comments
- **Time Tracking**: Automatic tracking of annotation time
- **Progress Tracking**: View your annotation history and statistics
- **Multi-domain Support**: Handle translations from different domains (medical, legal, technical, etc.)

### For Administrators
- **Admin Dashboard**: Overview of system statistics and user activity
- **User Management**: View all registered users and their roles
- **Content Management**: Add new sentences for annotation
- **Analytics**: Track completion rates and user performance

### Technical Features
- **Secure Authentication**: JWT-based authentication with role-based access control
- **RESTful API**: Clean FastAPI backend with automatic documentation
- **Modern UI**: Responsive design with TailwindCSS
- **Real-time Updates**: Immediate feedback and progress tracking

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **SQLite**: Lightweight database
- **JWT Authentication**: Secure token-based authentication
- **Pydantic**: Data validation and serialization

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

**Users Table:**
- User authentication and profile information
- Role-based access control (admin/user)
- Activity tracking

**Sentences Table:**
- Source text and machine translations
- Reference translations (optional)
- Language pairs and domain classification

**Annotations Table:**
- Quality ratings (fluency, adequacy, overall)
- Detailed feedback and suggestions
- Time tracking and status management

### API Endpoints

**Authentication:**
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

**Sentences:**
- `GET /api/sentences` - List all sentences
- `GET /api/sentences/next` - Get next sentence for annotation
- `POST /api/sentences` - Create new sentence (admin only)

**Annotations:**
- `POST /api/annotations` - Create new annotation
- `GET /api/annotations` - Get user's annotations
- `PUT /api/annotations/{id}` - Update annotation

**Admin:**
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/annotations` - List all annotations

## Usage Guide

### For Annotators

1. **Register/Login**: Create an account or log in with existing credentials
2. **Start Annotating**: Navigate to the annotation interface
3. **Rate Translations**: Use the 1-5 scale rating buttons for each quality dimension
4. **Provide Feedback**: Add detailed comments, error descriptions, and suggestions
5. **Submit**: Save your annotation and move to the next sentence
6. **Track Progress**: View your annotation history in "My Annotations"

### For Administrators

1. **Access Admin Panel**: Navigate to the admin dashboard (admin users only)
2. **Monitor Statistics**: View system overview and user activity
3. **Manage Content**: Add new sentences for annotation
4. **Review Users**: Monitor user registrations and activity

## Quality Metrics

The system uses standard MT evaluation criteria:

- **Fluency (1-5)**: How natural and grammatically correct is the translation?
- **Adequacy (1-5)**: How well does the translation convey the source meaning?
- **Overall Quality (1-5)**: General assessment of translation quality

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