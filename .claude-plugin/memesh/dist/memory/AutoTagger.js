export class AutoTagger {
    generateTags(content, existingTags, context) {
        const autoTags = [];
        const contentLower = content.toLowerCase();
        autoTags.push(...this.detectTechStack(contentLower));
        autoTags.push(...this.detectDomainAreas(contentLower));
        autoTags.push(...this.detectDesignPatterns(contentLower));
        const scopeTag = context?.projectPath ? 'scope:project' : 'scope:global';
        autoTags.push(scopeTag);
        const allTags = [...existingTags, ...autoTags];
        return Array.from(new Set(allTags));
    }
    detectTechStack(content) {
        const tags = [];
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
        const allTech = [...languages, ...frameworks, ...databases, ...tools];
        for (const tech of allTech) {
            let pattern;
            if (tech.includes('+') || tech.includes('#') || tech.includes('.')) {
                const escapedTech = tech
                    .replace(/\+/g, '\\+')
                    .replace(/#/g, '#')
                    .replace(/\./g, '\\.');
                pattern = `(?<!\\w)${escapedTech}(?!\\w)`;
            }
            else {
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
    detectDomainAreas(content) {
        const tags = [];
        const domains = {
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
            const matched = keywords.some((kw) => {
                if (kw.includes(' ')) {
                    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordBoundaryRegex = new RegExp(`\\b${escapedKw}\\b`, 'i');
                    return wordBoundaryRegex.test(content);
                }
                else {
                    return content.includes(kw);
                }
            });
            if (matched) {
                tags.push(tag);
            }
        }
        return tags;
    }
    detectDesignPatterns(content) {
        const tags = [];
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
            const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordBoundaryRegex = new RegExp(`\\b${escapedPattern}\\b`, 'i');
            if (wordBoundaryRegex.test(content)) {
                tags.push(`pattern:${pattern}`);
            }
        }
        return tags;
    }
}
//# sourceMappingURL=AutoTagger.js.map