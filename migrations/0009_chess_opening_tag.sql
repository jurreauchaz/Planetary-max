-- Add the opening metadata used by chess record submissions.
ALTER TABLE chess_games ADD COLUMN opening_tag TEXT NOT NULL DEFAULT '';
