# Recipe App

A modern recipe management application built with React and Supabase.

## Features

- Create, edit, and manage recipes
- Upload recipe images and PDFs with automatic text extraction
- Process Instagram recipe links to extract recipe data
- Screenshot-to-recipe conversion using AI
- Generate recipe images using AI
- Search and filter recipes
- Rate and comment on recipes
- User authentication
- Responsive design

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

## AI Processing Features

This app includes several AI-powered features through Supabase Edge Functions:

- **PDF Processing**: Extracts text from uploaded recipe PDFs
- **Instagram Integration**: Scrapes recipe data from Instagram posts
- **Screenshot Processing**: Converts recipe screenshots to structured data using AI
- **Image Generation**: Creates recipe images using AI models

## Deployment

Build the project for production:

```sh
npm run build
```

The build artifacts will be stored in the `dist/` directory, ready for deployment to any static hosting service.
