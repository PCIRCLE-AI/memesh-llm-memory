/**
 * AutoTagger - Intelligent tag generation from memory content
 *
 * Automatically detects and generates tags based on content analysis:
 * - Tech stack: 50 technologies (12 languages, 15 frameworks, 9 databases, 14 tools)
 * - Domain areas: 8 categories (frontend, backend, database, auth, security, testing, performance, devops)
 * - Design patterns: 11 patterns (singleton, factory, repository, observer, etc.)
 * - Scope tags: project vs global
 *
 * Features:
 * - Case-insensitive matching
 * - Automatic deduplication
 * - Combines user-provided tags with auto-generated tags
 */

export class AutoTagger {
  /**
   * Generate tags from memory content and context
   *
   * @param content Memory content to analyze
   * @param existingTags User-provided tags
   * @param context Optional project context
   * @returns Combined tags (existing + auto-generated), deduplicated
   */
  public generateTags(
    content: string,
    existingTags: string[],
    context?: { projectPath?: string }
  ): string[] {
    const autoTags: string[] = [];
    const contentLower = content.toLowerCase();

    // 1. Detect tech stack
    autoTags.push(...this.detectTechStack(contentLower));

    // 2. Detect domain areas
    autoTags.push(...this.detectDomainAreas(contentLower));

    // 3. Detect design patterns
    autoTags.push(...this.detectDesignPatterns(contentLower));

    // 4. Add scope tag
    const scopeTag = context?.projectPath ? 'scope:project' : 'scope:global';
    autoTags.push(scopeTag);

    // Combine with existing tags and deduplicate
    const allTags = [...existingTags, ...autoTags];
    return Array.from(new Set(allTags));
  }

  /**
   * Detect tech stack from content
   *
   * Covers 50 technologies:
   * - Languages (12): TypeScript, JavaScript, Python, Java, Go, Rust, Kotlin, Swift, C++, C#, Ruby, PHP
   * - Frameworks (15): React, Vue, Angular, Svelte, Next.js, Nuxt, Express, Fastify, NestJS, Django, Flask, Spring, Laravel, Rails
   * - Databases (9): PostgreSQL, MySQL, MongoDB, Redis, SQLite, DynamoDB, Cassandra, Elasticsearch
   * - Tools (14): Docker, Kubernetes, AWS, Azure, GCP, Vercel, Netlify, Heroku, Git, GitHub, GitLab, Jenkins, Terraform, Ansible
   *
   * @param content Lowercase content
   * @returns Array of tech tags (prefixed with 'tech:')
   */
  private detectTechStack(content: string): string[] {
    const tags: string[] = [];

    // Languages
    const languages = [
      'typescript',
      'javascript',
      'python',
      'java',
      'go',
      'rust',
      'kotlin',
      'swift',
      'c++',
      'c#',
      'ruby',
      'php',
    ];

    // Frameworks & Libraries
    const frameworks = [
      'react',
      'vue',
      'angular',
      'svelte',
      'next.js',
      'nuxt',
      'express',
      'fastify',
      'nest.js',
      'nestjs',
      'django',
      'flask',
      'spring',
      'laravel',
      'rails',
    ];

    // Databases
    const databases = [
      'postgresql',
      'postgres',
      'mysql',
      'mongodb',
      'redis',
      'sqlite',
      'dynamodb',
      'cassandra',
      'elasticsearch',
    ];

    // Tools & Platforms
    const tools = [
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'vercel',
      'netlify',
      'heroku',
      'git',
      'github',
      'gitlab',
      'jenkins',
      'terraform',
      'ansible',
    ];

    // Combine all tech
    const allTech = [...languages, ...frameworks, ...databases, ...tools];

    for (const tech of allTech) {
      // Use word boundary regex to avoid false positives
      // E.g., "go" matches "go" but not "going", "logo", "good"
      // Special handling for tech names with special characters (C++, C#, Next.js)
      let pattern: string;
      if (tech.includes('+') || tech.includes('#') || tech.includes('.')) {
        // For special characters, escape them and use lookahead/lookbehind
        // to ensure they're not part of a larger word
        // Note: # is not a special regex character, but we keep consistent escaping
        const escapedTech = tech
          .replace(/\\/g, '\\\\') // Escape backslash first!
          .replace(/\+/g, '\\+')
          .replace(/#/g, '\\#')
          .replace(/\./g, '\\.');
        pattern = `(?<!\\w)${escapedTech}(?!\\w)`;
      } else {
        // For normal words, use word boundaries
        const escapedTech = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = `\\b${escapedTech}\\b`;
      }

      const regex = new RegExp(pattern, 'i');
      if (regex.test(content)) {
        tags.push(`tech:${tech}`);
      }
    }

    return tags;
  }

  /**
   * Detect domain areas from content
   *
   * Categories:
   * - Frontend: UI, component, CSS, HTML, DOM
   * - Backend: API, server, endpoint, route
   * - Database: query, schema, migration, table
   * - Auth: authentication, authorization, login, JWT, OAuth, session
   * - Security: vulnerability, XSS, CSRF, injection
   * - Testing: test, unit test, integration test, E2E
   * - Performance: optimization, caching, latency
   * - DevOps: deployment, CI/CD, pipeline, container, infrastructure
   *
   * @param content Lowercase content
   * @returns Array of domain tags (prefixed with 'domain:')
   */
  private detectDomainAreas(content: string): string[] {
    const tags: string[] = [];

    const domains: Record<string, string[]> = {
      'domain:frontend': ['ui', 'frontend', 'component', 'css', 'html', 'dom'],
      'domain:backend': ['api', 'backend', 'server', 'endpoint', 'route'],
      'domain:database': ['database', 'query', 'schema', 'migration', 'table'],
      'domain:auth': ['authentication', 'authorization', 'login', 'jwt', 'oauth', 'session'],
      'domain:security': ['security', 'vulnerability', 'xss', 'csrf', 'injection'],
      'domain:testing': ['test', 'testing', 'unit test', 'integration test', 'e2e'],
      'domain:performance': ['performance', 'optimization', 'caching', 'latency'],
      'domain:devops': ['deployment', 'ci/cd', 'pipeline', 'container', 'infrastructure'],
    };

    for (const [tag, keywords] of Object.entries(domains)) {
      // Use flexible matching: allow both exact matches and word parts
      // E.g., "test" matches both "test" and "testing"
      const matched = keywords.some((kw) => {
        // For single words, allow partial matches (e.g., "test" in "testing")
        // For multi-word phrases, require exact match
        if (kw.includes(' ')) {
          // Multi-word keyword - require exact phrase match
          const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const wordBoundaryRegex = new RegExp(`\\b${escapedKw}\\b`, 'i');
          return wordBoundaryRegex.test(content);
        } else {
          // Single word - allow partial match (word start or contains)
          return content.includes(kw);
        }
      });

      if (matched) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Detect design patterns from content
   *
   * Patterns:
   * - Creational: Singleton, Factory
   * - Structural: Decorator, Adapter, Facade, Proxy
   * - Behavioral: Observer, Strategy
   * - Data: Repository
   * - Architectural: MVC, MVVM
   *
   * @param content Lowercase content
   * @returns Array of pattern tags (prefixed with 'pattern:')
   */
  private detectDesignPatterns(content: string): string[] {
    const tags: string[] = [];

    const patterns = [
      'singleton',
      'factory',
      'repository',
      'observer',
      'strategy',
      'decorator',
      'adapter',
      'facade',
      'proxy',
      'mvc',
      'mvvm',
    ];

    for (const pattern of patterns) {
      // Use word boundary regex to avoid false positives
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundaryRegex = new RegExp(`\\b${escapedPattern}\\b`, 'i');

      if (wordBoundaryRegex.test(content)) {
        tags.push(`pattern:${pattern}`);
      }
    }

    return tags;
  }
}
