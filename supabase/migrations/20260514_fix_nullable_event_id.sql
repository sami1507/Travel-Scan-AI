-- Fix ai_feedback_signals to allow nullable event_id
-- This enables metadata-only signals for travel intelligence features

-- Make event_id nullable to support metadata-only signals
ALTER TABLE public.ai_feedback_signals
ALTER COLUMN event_id DROP NOT NULL;

-- Update the foreign key constraint to handle NULL values properly
-- The existing constraint will still work, but now allows NULL
COMMENT ON COLUMN public.ai_feedback_signals.event_id IS 
  'Optional reference to recommendation event. NULL for metadata-only signals (e.g., travel intelligence interactions).';
