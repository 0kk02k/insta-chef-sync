# Recipe App

A modern recipe management application built with React and Supabase.

## Key Features

### 🍳 Smart Recipe Management
- **Recipe Creation & Editing**: Intuitive interface for creating and managing recipes
- **AI-Powered Image Generation**: Automatically generate beautiful recipe images
- **Portion Scaling**: Dynamic portion adjustment with automatic ingredient scaling
- **Rich Recipe Details**: Add descriptions, cooking times, difficulty levels, and ratings

### 📱 Multi-Input Recipe Processing
- **PDF Recipe Extraction**: Upload recipe PDFs with automatic text extraction and structuring
- **Instagram Integration**: Extract recipes directly from Instagram post links
- **Screenshot-to-Recipe AI**: Convert recipe screenshots into structured recipe data
- **Manual Entry**: Traditional text-based recipe input with intelligent parsing

### 🛒 Intelligent Shopping Lists
- **Smart Categorization**: Automatic ingredient categorization (dairy, meat, vegetables, etc.)
- **Quantity Consolidation**: Intelligent merging of duplicate ingredients across recipes
- **Manual Item Addition**: Add custom items with automatic categorization
- **Multi-Recipe Lists**: Combine ingredients from multiple recipes into unified shopping lists

### 👥 Social Features
- **Recipe Rating System**: 5-star rating system with visual feedback
- **Community Comments**: User comments and recipe discussions
- **Recipe Sharing**: Share recipes with other users

### 🔐 User Experience
- **Secure Authentication**: Email-based authentication with Supabase
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Updates**: Live synchronization across all user devices
- **Privacy Controls**: GDPR-compliant with cookie consent management

### 🤖 AI-Powered Intelligence
- **Advanced OCR**: Extract text from recipe images and PDFs
- **Content Understanding**: AI-powered recipe structure recognition
- **Smart Parsing**: Automatic ingredient and instruction formatting
- **Image Generation**: Create appealing recipe visuals automatically

## Getting Started

### Prerequisites

- Node.js (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
```

2. Navigate to the project directory:
```sh
cd <YOUR_PROJECT_NAME>
```

3. Install dependencies:
```sh
npm install
```

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`.

## Technology Stack

This project is built with:

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **File Storage**: Supabase Storage
- **Hosting**: Netlify
- **AI Services**: 
  - OpenAI (GPT models for text processing and image generation)
  - DeepSeek (Recipe parsing and content analysis)
  - Together AI (FLUX models for image generation)

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Application pages
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── integrations/       # External service integrations
└── main.tsx           # Application entry point

supabase/
├── functions/          # Edge Functions for AI processing
│   ├── pdf-processor/          # PDF text extraction
│   ├── process-instagram-recipe/   # Instagram recipe scraping
│   ├── process-screenshot-recipe/  # Screenshot-to-recipe AI
│   └── generate-recipe-image/      # AI image generation
└── config.toml        # Supabase configuration
```

## Architecture & AI Processing

### Backend Architecture
- **Supabase Edge Functions**: Serverless functions for AI processing and external API integrations
- **Row Level Security (RLS)**: Secure data access with user-based permissions
- **Real-time Subscriptions**: Live updates across all user sessions
- **Automatic Backups**: Managed PostgreSQL with point-in-time recovery

### AI Integration Layer
This app includes several AI-powered features through Supabase Edge Functions:

- **PDF Processing**: Uses DeepSeek AI to extract and structure recipe data from PDFs
- **Instagram Integration**: Scrapes and processes Instagram recipe content with AI parsing
- **Screenshot Processing**: Converts recipe screenshots to structured data using OpenAI GPT models
- **Image Generation**: Creates recipe images using Together AI's FLUX.1-schnell model
- **Content Understanding**: AI-powered ingredient categorization and recipe parsing

### Deployment & Hosting
- **Frontend Hosting**: Netlify with automatic deployments
- **Backend Services**: Supabase cloud infrastructure
- **CDN**: Global content delivery through Netlify Edge
- **SSL/TLS**: Automatic HTTPS with security headers
- **Environment**: Production-ready with proper error handling and monitoring

## Deployment

Build the project for production:

```sh
npm run build
```

The build artifacts will be stored in the `dist/` directory, ready for deployment to any static hosting service.
