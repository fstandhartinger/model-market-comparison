-- Umami v3.4.0 PostgreSQL schema. Keep analytics event and session data for 13 months.
SET lock_timeout = '5s';
SET statement_timeout = '5min';
BEGIN;

DELETE FROM event_data AS ed
USING website_event AS we
WHERE ed.website_event_id = we.event_id
  AND we.created_at < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM revenue AS r
USING website_event AS we
WHERE r.event_id = we.event_id
  AND we.created_at < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM website_event
WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM session_replay_saved AS saved
WHERE COALESCE(saved.created_at, CURRENT_TIMESTAMP) < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM session_replay
WHERE COALESCE(created_at, ended_at) < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM heatmap_event
WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM session_data AS sd
WHERE COALESCE(sd.created_at, CURRENT_TIMESTAMP) < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM session_link AS sl
WHERE COALESCE(sl.created_at, CURRENT_TIMESTAMP) < (CURRENT_TIMESTAMP - INTERVAL '13 months');

DELETE FROM session AS s
WHERE COALESCE(s.created_at, CURRENT_TIMESTAMP) < (CURRENT_TIMESTAMP - INTERVAL '13 months')
  AND NOT EXISTS (SELECT 1 FROM website_event AS we WHERE we.session_id = s.session_id)
  AND NOT EXISTS (SELECT 1 FROM revenue AS r WHERE r.session_id = s.session_id)
  AND NOT EXISTS (SELECT 1 FROM session_replay AS replay WHERE replay.session_id = s.session_id)
  AND NOT EXISTS (SELECT 1 FROM heatmap_event AS heat WHERE heat.session_id = s.session_id)
  AND NOT EXISTS (SELECT 1 FROM session_data AS sd WHERE sd.session_id = s.session_id)
  AND NOT EXISTS (SELECT 1 FROM session_link AS sl WHERE sl.session_id = s.session_id);

COMMIT;
