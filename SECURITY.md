# Security Policy

## Supported Versions

We actively support the latest version of ArrQueueCleaner with security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in ArrQueueCleaner, please report it responsibly:

### How to Report
- **GitHub Security Advisories**: Use the "Security" tab in this repository to report privately
- **Email**: Contact the maintainer directly through GitHub
- **Do NOT** create public issues for security vulnerabilities

### What to Include
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)

### Response Timeline
- **Initial Response**: Within 48 hours
- **Status Updates**: Weekly until resolved
- **Fix Timeline**: Critical issues within 7 days, others within 30 days

### What to Expect
- **Accepted**: We'll work on a fix and coordinate disclosure
- **Declined**: We'll explain why it's not considered a security issue
- **Credit**: Security researchers will be credited in release notes (unless anonymity is requested)

## Security Best Practices

When using ArrQueueCleaner:
- Keep your Sonarr API keys secure and rotate them regularly
- Use environment variables for sensitive configuration
- Run the container with minimal privileges
- Keep the Docker image updated to the latest version
- Monitor logs for unusual activity
