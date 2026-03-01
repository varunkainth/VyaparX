# VyaparX Deployment Guide

Complete guide for deploying VyaparX using Docker and various hosting platforms.

---

## 🐳 Docker Deployment

### Prerequisites
- Docker installed (v20.10+)
- Docker Compose installed (v2.0+)

### Quick Start

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd VyaparX
```

2. **Create environment file**
```bash
cp .env.docker.example .env
```

3. **Edit `.env` file with your configuration**
```bash
nano .env  # or use your preferred editor
```

4. **Build and start services**
```bash
docker-compose up -d
```

5. **Run database migrations**
```bash
docker-compose exec backend bun run migrate
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

---

## ☁️ Hosting Recommendations

### 1. **Vercel (Frontend) + Railway/Render (Backend)** ⭐ RECOMMENDED

**Best for:** Quick deployment, automatic scaling, great DX

#### Frontend on Vercel
- **Cost:** Free tier available, $20/month Pro
- **Features:** 
  - Automatic deployments from Git
  - Global CDN
  - Serverless functions
  - Custom domains
  - SSL certificates

**Setup:**
1. Push code to GitHub
2. Import project on Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
4. Deploy!

#### Backend on Railway
- **Cost:** $5/month minimum, pay-as-you-go
- **Features:**
  - PostgreSQL included
  - Automatic deployments
  - Environment variables
  - Custom domains

**Setup:**
1. Create new project on Railway
2. Add PostgreSQL database
3. Deploy from GitHub
4. Set environment variables
5. Run migrations

---

### 2. **AWS (Full Stack)** 💪 PRODUCTION GRADE

**Best for:** Enterprise, full control, scalability

#### Architecture:
- **Frontend:** S3 + CloudFront
- **Backend:** ECS Fargate or EC2
- **Database:** RDS PostgreSQL
- **Email:** SES
- **Storage:** S3

**Estimated Cost:** $50-200/month

**Services:**
- ECS Fargate: $30-100/month
- RDS PostgreSQL: $15-50/month
- CloudFront: $5-20/month
- S3: $1-5/month
- Route 53: $1/month

---

### 3. **DigitalOcean (Full Stack)** 🌊 BALANCED

**Best for:** Mid-size apps, good balance of cost and features

#### Options:

**A. App Platform (Managed)**
- **Cost:** $12-24/month
- Frontend + Backend + Database
- Automatic deployments
- SSL certificates
- Easy scaling

**B. Droplets (VPS)**
- **Cost:** $6-48/month
- Full control
- Docker deployment
- Manual setup required

**Setup (App Platform):**
1. Create new app
2. Connect GitHub repo
3. Configure services:
   - Frontend (Next.js)
   - Backend (Bun)
   - PostgreSQL database
4. Set environment variables
5. Deploy

---

### 4. **Heroku (Full Stack)** 🚀 SIMPLE

**Best for:** Prototypes, MVPs, simple deployment

**Cost:** $7-25/month per dyno

**Setup:**
```bash
# Install Heroku CLI
heroku login

# Create apps
heroku create vyaparx-backend
heroku create vyaparx-frontend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini -a vyaparx-backend

# Deploy backend
cd server
git push heroku main

# Deploy frontend
cd ../frontend
git push heroku main
```

---

### 5. **Self-Hosted (VPS)** 🖥️ FULL CONTROL

**Best for:** Cost-conscious, full control, learning

**Providers:**
- Hetzner: €4-20/month (Best value)
- Linode: $5-20/month
- Vultr: $6-24/month
- Contabo: €5-15/month

**Setup:**
1. Create VPS (Ubuntu 22.04 LTS)
2. Install Docker & Docker Compose
3. Clone repository
4. Configure environment
5. Run docker-compose
6. Setup Nginx reverse proxy
7. Configure SSL with Let's Encrypt

---

## 📊 Hosting Comparison

| Platform | Frontend | Backend | Database | Cost/Month | Difficulty | Best For |
|----------|----------|---------|----------|------------|------------|----------|
| Vercel + Railway | ✅ | ✅ | ✅ | $25-50 | Easy | Startups |
| AWS | ✅ | ✅ | ✅ | $50-200 | Hard | Enterprise |
| DigitalOcean | ✅ | ✅ | ✅ | $12-48 | Medium | Growing apps |
| Heroku | ✅ | ✅ | ✅ | $14-50 | Easy | MVPs |
| Self-Hosted | ✅ | ✅ | ✅ | $5-20 | Hard | Cost-conscious |

---

## 🔧 Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Set up backup strategy

### Performance
- [ ] Enable CDN for frontend
- [ ] Configure database connection pooling
- [ ] Set up caching (Redis optional)
- [ ] Optimize images
- [ ] Enable compression
- [ ] Monitor performance

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Database backups
- [ ] Health checks

### Email
- [ ] Configure production email service
- [ ] Set up SPF/DKIM records
- [ ] Test email delivery
- [ ] Monitor email sending

---

## 🚀 Recommended Setup for Different Scales

### Small Business / Startup ($25-50/month)
```
Frontend: Vercel (Free tier)
Backend: Railway ($5-20/month)
Database: Railway PostgreSQL (included)
Email: Gmail SMTP (Free)
Domain: Namecheap ($10/year)
```

### Growing Business ($50-100/month)
```
Frontend: Vercel Pro ($20/month)
Backend: DigitalOcean App Platform ($12-24/month)
Database: DigitalOcean Managed PostgreSQL ($15/month)
Email: SendGrid ($15/month for 40k emails)
CDN: Cloudflare (Free)
Monitoring: Sentry (Free tier)
```

### Enterprise ($200+/month)
```
Frontend: AWS S3 + CloudFront
Backend: AWS ECS Fargate
Database: AWS RDS PostgreSQL (Multi-AZ)
Email: AWS SES
Cache: AWS ElastiCache Redis
Monitoring: AWS CloudWatch + Datadog
Backups: AWS Backup
```

---

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=4000
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=vyaparx
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check if database is accessible
docker-compose exec backend bun run -e "console.log('Testing DB connection')"

# View database logs
docker-compose logs postgres
```

### Email Not Sending
```bash
# Test email configuration
curl -X POST http://localhost:4000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -d '{"test_email": "your@email.com"}'
```

### Frontend Not Connecting to Backend
- Check CORS configuration
- Verify API URL in frontend env
- Check network connectivity
- Review backend logs

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Bun Documentation](https://bun.sh/docs)

---

**Last Updated:** March 1, 2026  
**Version:** 1.0.0
