# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.8.x   | :white_check_mark: |
| 2.7.x   | :white_check_mark: |
| < 2.7   | :x:                |

We recommend always using the latest version of MeMesh for the best security and features.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

If you discover a security vulnerability, please use one of these methods:

1. **GitHub Security Advisories** (Preferred): https://github.com/PCIRCLE-AI/claude-code-buddy/security/advisories/new
2. **Email**: security@memesh.ai (or support@memesh.ai with subject "SECURITY:")

Please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 3-7 days
  - Medium: 7-14 days
  - Low: Next scheduled release

We will keep you informed of our progress throughout the process.

### Security Update Process

When a security issue is confirmed:

1. **Private Fix**: We develop and test the fix privately
2. **Security Advisory**: We create a GitHub Security Advisory
3. **Coordinated Release**: We release the fix with a new version
4. **Public Disclosure**: We publish details after users have time to update (typically 7-14 days)

## Security Features in MeMesh

MeMesh is designed with security and privacy as core principles:

### Local-First Architecture

- **All data stored locally** in `~/.memesh/` directory on your machine
- **No external servers** or cloud storage
- **No telemetry or analytics** collection
- **Complete data ownership** - you control all your memories

### Input Validation

- All user inputs validated using **Zod schemas**
- Type-safe validation at runtime
- Prevents malformed data from entering the system

### SQL Injection Prevention

- **Parameterized queries only** - no string concatenation
- Better-sqlite3 prepared statements
- Input sanitization for all database operations

### Path Traversal Protection

- File paths validated and sanitized
- Restricted to authorized directories
- No access to system files outside project scope

### Secure Dependencies

- **Automated scanning** with Dependabot
- **Regular updates** for security patches
- **CodeQL analysis** on every commit
- Zero tolerance for high/critical vulnerabilities

### Secure Defaults

- Restrictive file permissions (0600 for sensitive files)
- Secure temporary file handling
- No hardcoded credentials or secrets
- Environment variable validation

## Known Security Considerations

### Local File Access

MeMesh has access to files in your project directory as required for its functionality. This is:

- **By design**: Necessary for tracking project context and memories
- **User-controlled**: Only accesses projects you explicitly work on
- **Transparent**: All file access is logged (if logging enabled)

### AI Provider Communication

MeMesh communicates with AI providers (e.g., Anthropic API) for:

- Generating embeddings for semantic search
- Processing natural language queries

**Important**:
- Only configured providers are contacted
- Communication uses HTTPS/TLS encryption
- API keys stored in environment variables only
- No user data sent without explicit commands

### Data Retention

By default, MeMesh retains:

- **Architecture decisions**: 90 days
- **Session context**: 30 days
- **Project memories**: Until manually deleted

You can:
- Manually delete memories anytime
- Export your data for backup
- Clear all data with `rm -rf ~/.memesh/`

## Best Practices for Users

### 1. Keep MeMesh Updated

```bash
# Check for updates regularly
npm outdated -g @pcircle/memesh

# Update to latest version
npm install -g @pcircle/memesh@latest
```

### 2. Protect Your API Keys

```bash
# Store in environment variables, never commit to git
export ANTHROPIC_API_KEY="your-key-here"

# Or use .env file (already in .gitignore)
echo "ANTHROPIC_API_KEY=your-key-here" > .env
```

### 3. Review Memory Storage

```bash
# Check what's stored
buddy-remember "all memories"

# Backup your memories
cp -r ~/.memesh/ ~/memesh-backup-$(date +%Y%m%d)
```

### 4. Review MCP Configuration

Ensure your `~/.claude/mcp_settings.json` doesn't expose sensitive data.

## Security Audit History

| Date       | Type                  | Findings | Resolution |
|------------|-----------------------|----------|------------|
| 2026-02-12 | GitHub CodeQL         | 18 alerts| All resolved (v2.8.7) |
| 2026-02-12 | Secret Scanning       | 2 alerts | Dismissed (test data) |
| 2026-02-14 | Dependency Audit      | qs DoS   | Updated to 6.14.2 (v2.8.10) |

We continuously monitor for security issues and respond promptly.

## Responsible Disclosure

We appreciate responsible disclosure of security vulnerabilities. We commit to:

- Acknowledge your report promptly
- Keep you informed of our progress
- Credit you in security advisories (if desired)
- Work with you to ensure vulnerabilities are addressed

Thank you for helping keep MeMesh and its users safe!

## Scope

This security policy covers:
- The `@pcircle/memesh` npm package
- Official documentation and examples
- GitHub Actions workflows in this repository
- MCP server implementation

Out of scope:
- Third-party integrations
- User-created configurations
- Claude Code client applications
- Custom MCP server modifications

## Security-Related Resources

- **GitHub Security Advisories**: https://github.com/PCIRCLE-AI/claude-code-buddy/security/advisories
- **Dependency Updates**: Automated via Dependabot
- **Code Scanning**: CodeQL analysis on all commits
- **Security Policy**: This document

## Contact

- **Security Issues**: security@memesh.ai or support@memesh.ai
- **General Support**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
- **Discussions**: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions

---

**Last Updated**: 2026-02-15
**Version**: 2.0
