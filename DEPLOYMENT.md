# KIPRIS Patent Analysis SaaS - Deployment Guide

## Overview
This guide covers deploying the KIPRIS Patent Analysis SaaS application to Vercel with proper environment configuration.

## Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm i -g vercel`)
- Supabase project set up
- KIPRIS API access
- Gemini AI API key

## Environment Variables

### Required Environment Variables for Production

Set these in your Vercel project settings:

```bash
# API Configuration
KIPRIS_API_KEY=your_kipris_api_key_here
KIPRIS_BASE_URL=http://plus.kipris.or.kr/kipo-api

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Production Settings
NODE_ENV=production
VITE_APP_ENV=production
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

### 4. Set Environment Variables
After deployment, set environment variables in Vercel dashboard:
1. Go to your project in Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add all required environment variables listed above

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

## Database Setup

The Supabase database should already be configured with all necessary tables:
- users
- search_history
- reports
- ai_analysis_reports
- patent_search_analytics
- user_activities
- llm_analysis_logs
- competitor_mentions
- billing_events
- system_metrics
- document_downloads

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to version control
2. **CORS**: API endpoints are configured with proper CORS headers
3. **Security Headers**: Added security headers in vercel.json
4. **RLS**: Supabase Row Level Security is enabled on all tables

## Performance Optimizations

1. **Code Splitting**: Implemented manual chunks for better loading
2. **Minification**: Terser minification enabled for production
3. **Bundle Analysis**: Optimized vendor chunks
4. **Static Assets**: Proper caching headers configured

## Post-Deployment Verification

1. Check that the application loads correctly
2. Verify authentication works
3. Test patent search functionality
4. Confirm AI analysis features work
5. Check admin dashboard access
6. Verify PDF generation works

## Troubleshooting

### Common Issues

1. **Build Failures**: Check TypeScript compilation errors
2. **API Errors**: Verify environment variables are set correctly
3. **Database Connection**: Ensure Supabase credentials are correct
4. **CORS Issues**: Check API endpoint configurations

### Logs
- Check Vercel function logs in the dashboard
- Monitor Supabase logs for database issues
- Use browser dev tools for frontend debugging

## Monitoring

Set up monitoring for:
- Application uptime
- API response times
- Error rates
- User activity
- Database performance

## Backup and Recovery

1. **Database**: Supabase provides automatic backups
2. **Code**: Version control with Git
3. **Environment**: Document all environment variables securely

## Support

For deployment issues:
1. Check Vercel documentation
2. Review Supabase documentation
3. Check application logs
4. Contact support if needed