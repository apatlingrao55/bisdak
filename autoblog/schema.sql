PRAGMA foreign_keys = ON;

-- Local SQLite metadata DB for bisdak-autoblog state.
-- The published blog posts themselves live in bisdak's Postgres `posts` table;
-- this DB tracks pipeline state (topics, keywords, runs, failures) only.

CREATE TABLE IF NOT EXISTS topics (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    source              TEXT NOT NULL
        CHECK (source IN (
            'keyword_gap', 'competitor', 'regulatory', 'community_news',
            'jobs_news', 'gov_announcement', 'embassy', 'google_news',
            'gdelt', 'seed_brainstorm'
        )),
    source_url          TEXT,
    primary_keyword     TEXT,
    secondary_keywords  TEXT,  -- JSON array
    score               REAL NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'discovered'
        CHECK (status IN (
            'discovered', 'queued', 'writing', 'review',
            'published', 'rejected', 'quarantined'
        )),
    rejection_reason    TEXT,
    retry_count         INTEGER NOT NULL DEFAULT 0,
    last_error          TEXT,
    created_at          TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        CHECK (datetime(created_at) IS NOT NULL),
    published_at        TEXT
        CHECK (published_at IS NULL OR datetime(published_at) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id        INTEGER NOT NULL
        REFERENCES topics(id) ON DELETE CASCADE,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    word_count      INTEGER NOT NULL DEFAULT 0,
    review_passes   INTEGER NOT NULL DEFAULT 0,
    review_score    TEXT
        CHECK (review_score IS NULL OR review_score IN ('pass', 'rejected')),
    bisdak_post_id  TEXT,        -- UUID of the row in bisdak's Postgres `posts` table
    created_at      TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        CHECK (datetime(created_at) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS keywords (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword         TEXT NOT NULL UNIQUE,
    estimated_volume TEXT
        CHECK (estimated_volume IS NULL OR estimated_volume IN ('high', 'medium', 'low')),
    covered         INTEGER NOT NULL DEFAULT 0
        CHECK (covered IN (0, 1)),
    last_refreshed  TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        CHECK (datetime(last_refreshed) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS failures (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id        INTEGER
        REFERENCES topics(id) ON DELETE SET NULL,
    stage           TEXT NOT NULL
        CHECK (stage IN ('discovery', 'writing', 'review', 'publish', 'health', 'keywords')),
    error           TEXT NOT NULL,
    notified        INTEGER NOT NULL DEFAULT 0
        CHECK (notified IN (0, 1)),
    created_at      TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        CHECK (datetime(created_at) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS run_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    command     TEXT NOT NULL
        CHECK (command IN ('discover', 'publish', 'keywords', 'health', 'purge-drafts')),
    started_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ended_at    TEXT,
    status      TEXT CHECK (status IN ('ok', 'partial', 'failed')),
    details     TEXT,
    error_msg   TEXT
);

-- Per-day LLM call accounting for the budget cap.
CREATE TABLE IF NOT EXISTS llm_calls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    day         TEXT NOT NULL,            -- YYYY-MM-DD, UTC
    model       TEXT NOT NULL,
    success     INTEGER NOT NULL DEFAULT 1 CHECK (success IN (0, 1)),
    duration_ms INTEGER,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_score ON topics(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_topic_id ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_failures_topic_id ON failures(topic_id);
CREATE INDEX IF NOT EXISTS idx_failures_notified ON failures(notified) WHERE notified = 0;
CREATE INDEX IF NOT EXISTS idx_llm_calls_day ON llm_calls(day);
