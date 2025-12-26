# Telemetry Backend Architecture

## Overview

Privacy-first telemetry system for Smart Agents with local-first approach and optional cloud sync.

## Architecture Options

### Option 1: PostHog (Recommended - Self-Hosted or Cloud)

**Why PostHog?**
- ✅ Open source (can self-host)
- ✅ Built for product analytics
- ✅ Privacy-friendly (GDPR compliant)
- ✅ Powerful analytics dashboard
- ✅ Event-based architecture (matches our design)
- ✅ Generous free tier (1M events/month)
- ✅ Can run entirely self-hosted (full data control)

**Architecture**:
```
Smart Agents (Local)
  ↓ HTTPS (batched)
  ↓ Anonymous UUID only
  ↓
PostHog (Self-Hosted or Cloud)
  ↓
  ↓ Analytics Dashboard
  ↓ Event Explorer
  ↓ Insights & Trends
```

**Implementation**:
```typescript
// src/telemetry/senders/PostHogSender.ts
import { PostHog } from 'posthog-node';

export class PostHogSender implements TelemetrySender {
  private client: PostHog;

  constructor(config: {
    apiKey: string;
    host?: string; // Optional: self-hosted instance
  }) {
    this.client = new PostHog(config.apiKey, {
      host: config.host || 'https://app.posthog.com'
    });
  }

  async sendEvents(events: TelemetryEvent[]): Promise<void> {
    for (const event of events) {
      this.client.capture({
        distinctId: event.anonymous_id,
        event: event.event,
        properties: {
          ...event,
          // PostHog automatically adds: timestamp, $ip (can disable), etc.
        }
      });
    }

    await this.client.shutdown(); // Flush batch
  }
}
```

**Pros**:
- Full-featured analytics out of the box
- Can self-host for complete data control
- Active community and good documentation
- Built-in privacy controls (IP anonymization, etc.)

**Cons**:
- Requires PostHog account (or self-hosting infrastructure)
- Slightly overkill if you only need simple event counts

---

### Option 2: Custom Backend (Full Control)

**Why Custom?**
- ✅ Complete control over data
- ✅ Can implement custom analytics
- ✅ No third-party dependencies
- ✅ Can optimize for our specific use case

**Architecture**:
```
Smart Agents (Local)
  ↓ HTTPS POST /api/telemetry/batch
  ↓ { events: [...], anonymous_id: "..." }
  ↓
API Gateway (Rate Limiting, Auth)
  ↓
Backend Service (Express/Fastify)
  ↓
PostgreSQL (TimescaleDB for time-series)
  ↓
Analytics Service
  ↓ Aggregations, Dashboards
```

**Backend Stack**:
```
- Runtime: Node.js (TypeScript)
- Framework: Express or Fastify
- Database: PostgreSQL with TimescaleDB extension
- Cache: Redis (for rate limiting)
- Queue: BullMQ (for async processing)
- Monitoring: Grafana + Prometheus
```

**API Endpoints**:
```typescript
// Backend API
POST   /api/v1/telemetry/batch          // Send events (batched)
GET    /api/v1/telemetry/stats          // Get aggregated stats
GET    /api/v1/telemetry/health         // Health check

// Analytics API (internal)
GET    /api/v1/analytics/agents         // Agent usage stats
GET    /api/v1/analytics/errors         // Error trends
GET    /api/v1/analytics/performance    // Performance metrics
```

**Database Schema**:
```sql
-- TimescaleDB hypertable (optimized for time-series)
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY,
  anonymous_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  sdk_version VARCHAR(20),
  node_version VARCHAR(20),
  os_platform VARCHAR(20),
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('telemetry_events', 'timestamp');

-- Indexes
CREATE INDEX idx_anonymous_id ON telemetry_events (anonymous_id);
CREATE INDEX idx_event_type ON telemetry_events (event_type);
CREATE INDEX idx_timestamp ON telemetry_events (timestamp DESC);

-- Aggregated stats (materialized view)
CREATE MATERIALIZED VIEW daily_stats AS
SELECT
  DATE_TRUNC('day', timestamp) as day,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT anonymous_id) as unique_users
FROM telemetry_events
GROUP BY 1, 2;

-- Refresh every hour
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
END;
$$ LANGUAGE plpgsql;
```

**Pros**:
- Complete data ownership
- Can customize everything
- No vendor lock-in
- Can run entirely on-premise

**Cons**:
- Need to build analytics dashboard
- More infrastructure to maintain
- More development time

---

### Option 3: Hybrid (Local Analytics + Optional Cloud Sync)

**Why Hybrid?**
- ✅ Privacy-first (works offline)
- ✅ Users control when/if data is sent
- ✅ Can analyze locally without sending
- ✅ Optional cloud for aggregated insights

**Architecture**:
```
Smart Agents (Local)
  ↓
  ↓ Local SQLite (always)
  ↓ Local Analytics Dashboard (HTML)
  ↓
  ↓ [User Opts In]
  ↓
  ↓ HTTPS (batched, encrypted)
  ↓
Cloud Backend (Optional)
  ↓ Aggregated Analytics
  ↓ Cross-User Insights
```

**Features**:
- Local dashboard shows YOUR data
- Cloud dashboard shows COMMUNITY trends
- Users can export data anytime (JSON/CSV)
- Users can delete cloud data anytime

**Pros**:
- Maximum privacy and transparency
- Works offline
- Users feel in control
- Best for open-source projects

**Cons**:
- More complex architecture
- Need to maintain two analytics systems

---

## Recommended Implementation Plan

### Phase 1: Local Analytics (No Backend)

**Goal**: Users can analyze their own data locally

**Deliverables**:
1. Static HTML dashboard (no server needed)
2. Query local SQLite database
3. Generate charts (Chart.js or D3.js)
4. Export to JSON/CSV

**Example**:
```bash
npm run telemetry:dashboard
# Opens http://localhost:3000/telemetry-dashboard.html
# Shows: Agent usage, error rates, performance trends
```

---

### Phase 2: Sending Mechanism (Generic Interface)

**Goal**: Make it easy to swap backends

**Implementation**:
```typescript
// src/telemetry/senders/TelemetrySender.ts
export interface TelemetrySender {
  sendEvents(events: TelemetryEvent[]): Promise<void>;
  sendBatch(events: TelemetryEvent[]): Promise<void>;
}

// src/telemetry/senders/PostHogSender.ts
export class PostHogSender implements TelemetrySender { ... }

// src/telemetry/senders/CustomBackendSender.ts
export class CustomBackendSender implements TelemetrySender { ... }

// src/telemetry/senders/ConsoleSender.ts (for testing)
export class ConsoleSender implements TelemetrySender { ... }

// Configuration
const telemetryConfig = {
  sender: 'posthog', // or 'custom' or 'none'
  sendInterval: '1h',
  batchSize: 100,

  // PostHog config
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
    host: process.env.POSTHOG_HOST // Optional: self-hosted
  },

  // Custom backend config
  custom: {
    endpoint: process.env.TELEMETRY_ENDPOINT,
    apiKey: process.env.TELEMETRY_API_KEY
  }
};
```

---

### Phase 3: Backend Deployment

**Option 3a: PostHog Cloud** (Fastest)
```bash
# 1. Sign up at https://posthog.com
# 2. Get API key
# 3. Configure in .env
POSTHOG_API_KEY=phc_xxxxxxxxxxxxx
```

**Option 3b: Self-Hosted PostHog** (Most Privacy)
```bash
# Using Docker Compose
git clone https://github.com/PostHog/posthog.git
cd posthog
docker-compose up -d

# PostHog runs on http://localhost:8000
# Configure Smart Agents to use local instance
POSTHOG_HOST=http://localhost:8000
POSTHOG_API_KEY=your_project_key
```

**Option 3c: Custom Backend** (Most Control)
```bash
# Deploy to your own infrastructure
# Recommended: Railway, Fly.io, or AWS

# Stack:
- Database: PostgreSQL with TimescaleDB (managed: Timescale Cloud)
- Backend: Node.js (Express) on Railway/Fly.io
- Analytics: Grafana Cloud (free tier)
```

---

## Privacy & Security Best Practices

### 1. Transport Security
```typescript
// HTTPS only
const TELEMETRY_ENDPOINT = 'https://telemetry.smart-agents.dev/api/v1/batch';

// Certificate pinning (optional, advanced)
const httpsAgent = new https.Agent({
  ca: fs.readFileSync('telemetry-server-ca.pem')
});
```

### 2. Rate Limiting (Client Side)
```typescript
// Prevent abuse/accidental spam
class TelemetryCollector {
  private rateLimiter = {
    maxEventsPerMinute: 60,
    maxEventsPerHour: 1000,
    // Track locally to avoid overwhelming backend
  };
}
```

### 3. User Controls
```typescript
// Users must be able to:
// 1. See what data is collected (telemetry preview)
// 2. Enable/disable at any time
// 3. Clear local data
// 4. Export data
// 5. Request deletion from backend

// CLI commands:
npm run telemetry:status    // Show current status
npm run telemetry:enable    // Opt in
npm run telemetry:disable   // Opt out
npm run telemetry:preview   // Show what would be sent
npm run telemetry:clear     // Delete local data
npm run telemetry:export    // Export to JSON
```

### 4. Backend Privacy Controls
```typescript
// Backend must:
// 1. Never log raw events (only aggregated stats)
// 2. Implement data retention policy (e.g., 90 days)
// 3. Provide deletion API
// 4. Anonymize IP addresses
// 5. No third-party analytics on the analytics server itself

// Data retention
DELETE FROM telemetry_events
WHERE timestamp < NOW() - INTERVAL '90 days';

// IP anonymization (if you log IPs at all)
// Don't log IPs, but if you do:
SELECT anonymize_ip(client_ip) FROM requests;
```

---

## Recommended Approach for Smart Agents

**I recommend: Hybrid with PostHog Self-Hosted**

**Why?**
1. ✅ Start with local analytics (Phase 1) - works offline, max privacy
2. ✅ Add PostHog self-hosted (Phase 2) - you control the data
3. ✅ Users opt-in explicitly - transparent and ethical
4. ✅ Can migrate to PostHog Cloud later if needed
5. ✅ Or migrate to custom backend later (interface is abstracted)

**Timeline**:
- Week 1: Local analytics dashboard (Tasks 13)
- Week 2: Sending mechanism + PostHog integration (Task 10)
- Week 3: Self-hosted PostHog deployment (if desired)

**Cost**:
- Local analytics: $0
- PostHog Cloud (free tier): $0 (1M events/month)
- PostHog Self-Hosted: ~$20-50/month (VPS + PostgreSQL)
- Custom Backend: ~$30-100/month (depending on scale)

---

## Next Steps

Should I implement:

1. **Local Analytics Dashboard First** (Task 13 - Static HTML Reports)
   - No backend needed
   - Users can see their own data
   - Privacy-first approach

2. **Sending Mechanism** (Task 10 - Telemetry API)
   - Generic sender interface
   - PostHog sender implementation
   - Custom backend sender (optional)

3. **Both** (recommended for complete solution)

Which direction would you like to take?
