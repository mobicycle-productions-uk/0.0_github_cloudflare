-- Beat Sheets Database Schema
-- Table structure for storing screenplay beats (1 scene = 1 beat)

CREATE TABLE IF NOT EXISTS beats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    act_id INTEGER NOT NULL,
    beat_number INTEGER NOT NULL,
    scene_number INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    conflict TEXT,
    emotion TEXT,
    location TEXT,
    time_of_day TEXT,
    characters TEXT,
    purpose TEXT,
    stakes TEXT,
    tension_level INTEGER DEFAULT 1 CHECK (tension_level BETWEEN 1 AND 10),
    page_count REAL,
    estimated_minutes REAL,
    notes TEXT,
    tags TEXT, -- JSON array of tags
    version INTEGER DEFAULT 1,
    is_current INTEGER DEFAULT 1 CHECK (is_current IN (0, 1)),
    is_deleted INTEGER DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    
    -- Foreign key constraint (assuming acts table exists)
    FOREIGN KEY (act_id) REFERENCES acts(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate beat numbers within an act
    UNIQUE(act_id, beat_number, is_current) 
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_beats_act_beat ON beats(act_id, beat_number);
CREATE INDEX IF NOT EXISTS idx_beats_current ON beats(is_current);
CREATE INDEX IF NOT EXISTS idx_beats_scene ON beats(scene_number);
CREATE INDEX IF NOT EXISTS idx_beats_updated ON beats(updated_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_beats_timestamp 
    AFTER UPDATE ON beats
    FOR EACH ROW
BEGIN
    UPDATE beats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Sample data for testing (optional)
-- INSERT INTO beats (act_id, beat_number, scene_number, title, description, conflict, emotion, location, time_of_day, characters) VALUES
-- (1, 1, 1, 'Opening Scene', 'Ally discovers the first signs of corruption', 'Internal vs. conscience', 'Curiosity mixed with unease', 'City Hall Office', 'Morning', 'Ally, Secretary');

-- Beat Sheets Report Views
CREATE VIEW IF NOT EXISTS beats_with_acts AS
SELECT 
    b.*,
    a.act_no,
    a.title as act_title
FROM beats b
JOIN acts a ON b.act_id = a.id
WHERE b.is_current = 1 AND b.is_deleted = 0;

-- Beat statistics view
CREATE VIEW IF NOT EXISTS beat_statistics AS
SELECT 
    a.act_no,
    a.title as act_title,
    COUNT(b.id) as total_beats,
    AVG(b.tension_level) as avg_tension,
    SUM(b.page_count) as total_pages,
    SUM(b.estimated_minutes) as total_minutes
FROM acts a
LEFT JOIN beats b ON a.id = b.act_id AND b.is_current = 1 AND b.is_deleted = 0
GROUP BY a.id, a.act_no, a.title
ORDER BY a.act_no;