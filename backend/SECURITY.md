# Security Setup Guide

## Environment Variables

This application uses environment variables to manage sensitive configuration. Follow these steps to set up your environment securely:

### 1. Create Environment File

Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Generate Secure Secrets

**Important**: Never use the default values in production!

Generate secure secrets using Node.js:
```javascript
// Run this in Node.js console
const crypto = require('crypto');

// Generate JWT Secret (64 characters)
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));

// Generate Session Secret (64 characters)  
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
```

Or use online tools like:
- https://generate-secret.vercel.app/
- OpenSSL: `openssl rand -hex 32`

### 3. Required Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for JWT token signing | `abc123...` (64 chars) | Yes |
| `NODE_ENV` | Environment mode | `production` | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://yourdomain.com` | Yes |
| `SMTP_HOST` | Email server host | `smtp.sendgrid.net` | No* |
| `SMTP_USER` | Email username | `apikey` | No* |
| `SMTP_PASS` | Email password/API key | `SG.abc123...` | No* |
| `ADMIN_NOTIFY_EMAILS` | Admin email addresses | `admin@company.com` | No |

*Required if email notifications are enabled

### 4. Production Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique `JWT_SECRET` (minimum 32 characters)
- [ ] Configure `ALLOWED_ORIGINS` with your actual domain(s)
- [ ] Remove any localhost origins from `ALLOWED_ORIGINS`
- [ ] Set up proper SMTP credentials if using email
- [ ] Ensure `.env` file is in `.gitignore`
- [ ] Use HTTPS in production
- [ ] Configure reverse proxy (nginx) for additional security
- [ ] Set up log rotation for application logs
- [ ] Monitor logs for security events

### 5. Security Features

This application includes:

- **Helmet.js**: Security headers protection
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: Protection against brute force attacks
- **Request Logging**: Detailed request tracking with IDs
- **Error Sanitization**: Production errors don't expose internals
- **Input Validation**: Comprehensive request validation
- **JWT Authentication**: Secure token-based auth
- **SQL Injection Protection**: Parameterized queries

### 6. Monitoring

Logs are written to:
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/access.log` - HTTP request logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

Monitor these files for security events and performance issues.

### 7. Database Security

- Database file permissions should be restricted
- Consider encrypting the database file in production
- Regular backups with encryption
- Monitor for unusual query patterns

### 8. Additional Security Recommendations

- Use a reverse proxy (nginx/Apache)
- Implement IP whitelisting if applicable
- Set up SSL/TLS certificates
- Regular security updates
- Database encryption at rest
- Network firewalls
- Regular security audits
- Backup encryption

## Emergency Procedures

If you suspect a security breach:

1. Immediately rotate JWT_SECRET
2. Invalidate all active sessions
3. Check logs for suspicious activity
4. Review database for unauthorized changes
5. Notify administrators
6. Consider temporary service shutdown if necessary