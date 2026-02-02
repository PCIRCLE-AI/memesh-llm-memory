# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.5.x   | :white_check_mark: |
| 2.4.x   | :white_check_mark: |
| < 2.4   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Claude Code Buddy, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: kt.wildmind@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release

### Security Best Practices for Users

1. **Keep CCB Updated**: Always use the latest version
2. **Protect API Keys**: Never commit `.env` files or API keys
3. **Review MCP Config**: Ensure your MCP configuration doesn't expose sensitive data
4. **Memory Data**: Be aware that CCB stores project context in local SQLite databases

### Security Features

- SQL injection prevention with parameterized queries
- Input validation using Zod schemas
- No external network calls except to configured AI providers
- All data stored locally (no cloud sync)

## Scope

This security policy covers:
- The `@pcircle/memesh` npm package
- Official documentation and examples
- GitHub Actions workflows in this repository

Out of scope:
- Third-party integrations
- User-created configurations
- Claude Code client applications
