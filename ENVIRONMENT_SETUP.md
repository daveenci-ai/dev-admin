# Environment Variables Setup

This document outlines all the environment variables required for the Avatar Generation System.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/dev_admin"
```

### NextAuth Configuration
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

### Replicate AI Configuration
```bash
REPLICATE_API_TOKEN="r_your_replicate_api_token_here"
REPLICATE_MODEL_VERSION="black-forest-labs/flux-dev-lora"
```

### Google Gemini AI Configuration ⭐ NEW
```bash
GEMINI_API_KEY="your_gemini_api_key_here"
```
**Required for prompt optimization feature. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)**

### GitHub Storage Configuration
```bash
GITHUB_TOKEN="ghp_your_github_personal_access_token"
GITHUB_REPO="username/repository-name"
```

## Setup Instructions

### 1. Database Setup
- Install PostgreSQL
- Create database: `createdb dev_admin`
- Run migrations: `npx prisma migrate dev`

### 2. Replicate API Setup
- Sign up at [Replicate.com](https://replicate.com)
- Get your API token from account settings
- Ensure you have access to FLUX-dev-lora model

### 3. Gemini AI Setup ⭐ NEW
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key
- Add it to your environment variables

### 4. GitHub Storage Setup
- Create a GitHub repository for image storage
- Generate a Personal Access Token with repository permissions
- Update GITHUB_REPO with your repository path

## Avatar Generation Workflow

With the new Gemini integration, the generation flow is:

1. **User Input** → Avatar selected + 10+ character prompt
2. **Gemini Optimization** → Prompt enhanced with trigger word, description, photorealism
3. **Replicate Generation** → Multiple images generated based on parameters
4. **PENDING_REVIEW** → Images await user approval
5. **GitHub Upload** → Approved images stored in GitHub repository
6. **Database Storage** → Final URLs saved in `avatars_generated` table

## Troubleshooting

### Common Issues:
- **Gemini API Error**: Check GEMINI_API_KEY is valid and has quota
- **Replicate Timeout**: Check REPLICATE_API_TOKEN and model access
- **GitHub Upload Failure**: Verify GITHUB_TOKEN permissions and repository exists
- **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct 