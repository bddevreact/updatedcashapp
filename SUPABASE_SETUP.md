# Supabase Setup Guide

## 1. Create New Supabase Project
- Go to [supabase.com](https://supabase.com)
- Click "New Project"
- Choose your organization
- Enter project name (e.g., "TRD Network")
- Set database password
- Choose region
- Click "Create new project"

## 2. Get Project Credentials
- In your project dashboard, go to Settings > API
- Copy the "Project URL" (this is your `VITE_SUPABASE_URL`)
- Copy the "anon public" key (this is your `VITE_SUPABASE_ANON_KEY`)

## 3. Set Environment Variables
- Create a `.env` file in your project root
- Add your credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Database Schema
Your project already has the database schema defined in `supabase/migrations/`. 
You can run these migrations in your new Supabase project.

## 5. Test Connection
Run `npm run dev` to test if the connection works. 