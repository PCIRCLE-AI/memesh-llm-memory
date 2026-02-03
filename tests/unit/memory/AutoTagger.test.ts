/**
 * AutoTagger Tests
 *
 * Comprehensive test suite for the intelligent auto-tagging system.
 * Tests cover tech stack detection, domain area detection, design pattern
 * detection, scope tags, deduplication, and edge cases.
 */

import { describe, test, expect } from 'vitest';
import { AutoTagger } from '../../../src/memory/AutoTagger.js';

describe('AutoTagger', () => {
  const tagger = new AutoTagger();

  describe('Tech Stack Detection - Languages', () => {
    test('should detect programming languages', () => {
      const content = 'Using TypeScript and Python for this project';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:typescript');
      expect(tags).toContain('tech:python');
    });

    test('should detect multiple languages from code snippets', () => {
      const content = `
        const x: number = 42; // TypeScript
        public class Main { } // Java
        fn main() { } // Rust
      `;
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:typescript');
      expect(tags).toContain('tech:java');
      expect(tags).toContain('tech:rust');
    });

    test('should handle C++ and C# variations', () => {
      const content = 'We use C++ for performance and C# for .NET apps';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:c++');
      expect(tags).toContain('tech:c#');
    });
  });

  describe('Tech Stack Detection - Frameworks', () => {
    test('should detect frontend frameworks', () => {
      const content = 'Built with React and Vue.js';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:react');
      expect(tags).toContain('tech:vue');
    });

    test('should detect backend frameworks', () => {
      const content = 'API server using Express.js and Django REST framework';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:express');
      expect(tags).toContain('tech:django');
    });

    test('should detect Next.js and Nuxt variations', () => {
      const content = 'SSR with Next.js for React and Nuxt for Vue';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:next.js');
      expect(tags).toContain('tech:nuxt');
    });
  });

  describe('Tech Stack Detection - Databases', () => {
    test('should detect SQL databases', () => {
      const content = 'Data stored in PostgreSQL and MySQL';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:postgresql');
      expect(tags).toContain('tech:mysql');
    });

    test('should detect NoSQL databases', () => {
      const content = 'Using MongoDB for documents and Redis for caching';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:mongodb');
      expect(tags).toContain('tech:redis');
    });

    test('should handle Postgres vs PostgreSQL variations', () => {
      const content = 'Migrated from Postgres to MySQL';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:postgres');
      expect(tags).toContain('tech:mysql');
    });
  });

  describe('Tech Stack Detection - Tools & Platforms', () => {
    test('should detect DevOps tools', () => {
      const content = 'Deployed with Docker on Kubernetes';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:docker');
      expect(tags).toContain('tech:kubernetes');
    });

    test('should detect cloud platforms', () => {
      const content = 'Hosting on AWS, Azure, and GCP';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:aws');
      expect(tags).toContain('tech:azure');
      expect(tags).toContain('tech:gcp');
    });

    test('should detect version control and CI/CD', () => {
      const content = 'Using Git with GitHub Actions for CI/CD';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:git');
      expect(tags).toContain('tech:github');
    });
  });

  describe('Domain Area Detection - Frontend', () => {
    test('should detect frontend domain from UI keywords', () => {
      const content = 'Implemented a new UI component with CSS animations';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:frontend');
    });

    test('should detect frontend from HTML/DOM keywords', () => {
      const content = 'Fixed DOM manipulation issue in the frontend';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:frontend');
    });
  });

  describe('Domain Area Detection - Backend', () => {
    test('should detect backend domain from API keywords', () => {
      const content = 'Created REST API endpoint for user data';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:backend');
    });

    test('should detect backend from server keywords', () => {
      const content = 'Optimized server route handlers';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:backend');
    });
  });

  describe('Domain Area Detection - Database', () => {
    test('should detect database domain from query keywords', () => {
      const content = 'Optimized database query performance';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:database');
    });

    test('should detect database from schema keywords', () => {
      const content = 'Created new migration for table schema changes';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:database');
    });
  });

  describe('Domain Area Detection - Authentication', () => {
    test('should detect auth domain from authentication keywords', () => {
      const content = 'Implemented JWT authentication for the API';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:auth');
    });

    test('should detect auth from login/session keywords', () => {
      const content = 'Fixed session management in login flow';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:auth');
    });

    test('should detect auth from OAuth keywords', () => {
      const content = 'Added OAuth authorization with Google';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:auth');
    });
  });

  describe('Domain Area Detection - Security', () => {
    test('should detect security domain from vulnerability keywords', () => {
      const content = 'Fixed XSS vulnerability in user input';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:security');
    });

    test('should detect security from attack keywords', () => {
      const content = 'Prevented CSRF and SQL injection attacks';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:security');
    });
  });

  describe('Domain Area Detection - Testing', () => {
    test('should detect testing domain from test keywords', () => {
      const content = 'Added unit tests for authentication module';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:testing');
    });

    test('should detect testing from integration/e2e keywords', () => {
      const content = 'Created E2E tests for checkout flow';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:testing');
    });
  });

  describe('Domain Area Detection - Performance', () => {
    test('should detect performance domain from optimization keywords', () => {
      const content = 'Performance optimization reduced latency by 50%';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:performance');
    });

    test('should detect performance from caching keywords', () => {
      const content = 'Implemented caching to improve performance';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:performance');
    });
  });

  describe('Domain Area Detection - DevOps', () => {
    test('should detect devops domain from deployment keywords', () => {
      const content = 'Automated deployment with CI/CD pipeline';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:devops');
    });

    test('should detect devops from infrastructure keywords', () => {
      const content = 'Configured container infrastructure';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('domain:devops');
    });
  });

  describe('Design Pattern Detection', () => {
    test('should detect common design patterns', () => {
      const content = 'Implemented singleton pattern and factory method';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('pattern:singleton');
      expect(tags).toContain('pattern:factory');
    });

    test('should detect repository and observer patterns', () => {
      const content = 'Used repository pattern with observer notifications';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('pattern:repository');
      expect(tags).toContain('pattern:observer');
    });

    test('should detect architectural patterns', () => {
      const content = 'Refactored to MVC architecture with MVVM for views';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('pattern:mvc');
      expect(tags).toContain('pattern:mvvm');
    });

    test('should detect structural patterns', () => {
      const content = 'Applied decorator and adapter patterns for flexibility';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('pattern:decorator');
      expect(tags).toContain('pattern:adapter');
    });
  });

  describe('Scope Tag Generation', () => {
    test('should add scope:project tag when projectPath is provided', () => {
      const content = 'Some project-specific knowledge';
      const tags = tagger.generateTags(content, [], { projectPath: '/path/to/project' });

      expect(tags).toContain('scope:project');
      expect(tags).not.toContain('scope:global');
    });

    test('should add scope:global tag when no projectPath is provided', () => {
      const content = 'Some global knowledge';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('scope:global');
      expect(tags).not.toContain('scope:project');
    });

    test('should add scope:global tag when context is undefined', () => {
      const content = 'Some global knowledge';
      const tags = tagger.generateTags(content, []);

      expect(tags).toContain('scope:global');
    });
  });

  describe('Tag Combination and Deduplication', () => {
    test('should combine existing tags with auto-generated tags', () => {
      const content = 'Using React for the frontend';
      const existingTags = ['important', 'reviewed'];
      const tags = tagger.generateTags(content, existingTags, {});

      expect(tags).toContain('important');
      expect(tags).toContain('reviewed');
      expect(tags).toContain('tech:react');
      expect(tags).toContain('domain:frontend');
      expect(tags).toContain('scope:global');
    });

    test('should deduplicate tags', () => {
      const content = 'React component with React hooks';
      const existingTags = ['tech:react'];
      const tags = tagger.generateTags(content, existingTags, {});

      // Count occurrences of 'tech:react'
      const reactTagCount = tags.filter((t) => t === 'tech:react').length;
      expect(reactTagCount).toBe(1);
    });

    test('should preserve all unique tags after deduplication', () => {
      const content = 'Using PostgreSQL database with Postgres extensions';
      const existingTags = ['database', 'production'];
      const tags = tagger.generateTags(content, existingTags, {});

      expect(tags).toContain('database');
      expect(tags).toContain('production');
      expect(tags).toContain('tech:postgresql');
      expect(tags).toContain('tech:postgres');
      expect(tags).toContain('domain:database');

      // Verify no duplicates
      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content gracefully', () => {
      const content = '';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('scope:global');
      expect(tags.length).toBeGreaterThanOrEqual(1); // At least scope tag
    });

    test('should handle content with no detectable tech stack', () => {
      const content = 'This is a general note about project planning';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('scope:global');
      // Should only have scope tag
      expect(tags.length).toBe(1);
    });

    test('should be case insensitive for detection', () => {
      const content = 'Using REACT and TYPESCRIPT with POSTGRESQL';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:react');
      expect(tags).toContain('tech:typescript');
      expect(tags).toContain('tech:postgresql');
    });

    test('should handle special characters and punctuation', () => {
      const content = 'Tech stack: Next.js, Node.js (Express), PostgreSQL!';
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:next.js');
      expect(tags).toContain('tech:express');
      expect(tags).toContain('tech:postgresql');
    });

    test('should handle multiline content', () => {
      const content = `
        Frontend: React with TypeScript
        Backend: Express API
        Database: PostgreSQL
        Testing: Jest unit tests
      `;
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:react');
      expect(tags).toContain('tech:typescript');
      expect(tags).toContain('tech:express');
      expect(tags).toContain('tech:postgresql');
      expect(tags).toContain('domain:frontend');
      expect(tags).toContain('domain:backend');
      expect(tags).toContain('domain:database');
      expect(tags).toContain('domain:testing');
    });
  });

  describe('Complex Real-World Scenarios', () => {
    test('should handle comprehensive tech stack description', () => {
      const content = `
        Built a full-stack application:
        - Frontend: React with TypeScript, styled with CSS
        - Backend: Express.js API with JWT authentication
        - Database: PostgreSQL with Redis caching
        - Testing: Unit tests with Jest, E2E with Cypress
        - DevOps: Docker containers deployed on AWS
        - Security: Implemented OAuth, prevented XSS attacks
        - Patterns: Used repository pattern with singleton services
      `;
      const tags = tagger.generateTags(content, ['production'], {});

      // Tech stack
      expect(tags).toContain('tech:react');
      expect(tags).toContain('tech:typescript');
      expect(tags).toContain('tech:express');
      expect(tags).toContain('tech:postgresql');
      expect(tags).toContain('tech:redis');
      expect(tags).toContain('tech:docker');
      expect(tags).toContain('tech:aws');

      // Domains
      expect(tags).toContain('domain:frontend');
      expect(tags).toContain('domain:backend');
      expect(tags).toContain('domain:database');
      expect(tags).toContain('domain:auth');
      expect(tags).toContain('domain:security');
      expect(tags).toContain('domain:testing');
      expect(tags).toContain('domain:devops');

      // Patterns
      expect(tags).toContain('pattern:repository');
      expect(tags).toContain('pattern:singleton');

      // Existing and scope
      expect(tags).toContain('production');
      expect(tags).toContain('scope:global');

      // No duplicates
      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });

    test('should handle mistake recording scenario', () => {
      const content = `
        MISTAKE: Forgot to sanitize user input in the API endpoint.
        This caused an SQL injection vulnerability.
        Fixed by using parameterized queries in PostgreSQL.
        Added unit tests to prevent regression.
      `;
      const tags = tagger.generateTags(content, ['critical', 'security-incident'], {
        projectPath: '/projects/ecommerce',
      });

      expect(tags).toContain('critical');
      expect(tags).toContain('security-incident');
      expect(tags).toContain('tech:postgresql');
      expect(tags).toContain('domain:backend');
      expect(tags).toContain('domain:security');
      expect(tags).toContain('domain:testing');
      expect(tags).toContain('scope:project');
    });

    test('should handle performance optimization scenario', () => {
      const content = `
        Optimized database queries to reduce latency from 2s to 200ms.
        Implemented Redis caching for frequently accessed data.
        Added database indexes and optimized the query execution plan.
      `;
      const tags = tagger.generateTags(content, [], {});

      expect(tags).toContain('tech:redis');
      expect(tags).toContain('domain:database');
      expect(tags).toContain('domain:performance');
      expect(tags).toContain('scope:global');
    });
  });
});
