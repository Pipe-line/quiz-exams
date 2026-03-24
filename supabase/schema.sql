-- =============================================
-- EXAM TEST APP - SUPABASE SCHEMA
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. EXAM BLOCKS (Bloques de exámenes)
-- =============================================
CREATE TABLE exam_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- Categoría/tipo: "Data Cloud", "Sales Cloud", "Agentforce", etc.
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exam_blocks_user_id ON exam_blocks(user_id);
CREATE INDEX idx_exam_blocks_category ON exam_blocks(category);

-- =============================================
-- 2. QUESTIONS (Preguntas)
-- =============================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_block_id UUID NOT NULL REFERENCES exam_blocks(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- {"A": "...", "B": "...", "C": "..."}
  correct_answer TEXT NOT NULL, -- "A", "B,D", "A,B,C" (separado por comas)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_block_id, question_number)
);

CREATE INDEX idx_questions_exam_block_id ON questions(exam_block_id);

-- =============================================
-- 3. QUESTION CORRECTIONS (Correcciones de usuario)
-- =============================================
CREATE TABLE question_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corrected_answer TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

CREATE INDEX idx_question_corrections_question_id ON question_corrections(question_id);
CREATE INDEX idx_question_corrections_user_id ON question_corrections(user_id);

-- =============================================
-- 4. EXAM ATTEMPTS (Intentos de examen)
-- =============================================
CREATE TYPE attempt_status AS ENUM ('in_progress', 'paused', 'completed');

CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_block_id UUID NOT NULL REFERENCES exam_blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  total_questions INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam_block_id ON exam_attempts(exam_block_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);

-- =============================================
-- 5. USER ANSWERS (Respuestas de usuario)
-- =============================================
CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL, -- "A", "B,D", "A,B,C" (separado por comas)
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_answers_attempt_id ON user_answers(attempt_id);
CREATE INDEX idx_user_answers_question_id ON user_answers(question_id);

-- =============================================
-- 6. DAILY STATS (Estadísticas diarias)
-- =============================================
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_id_date ON daily_stats(user_id, date);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE exam_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- EXAM BLOCKS POLICIES
CREATE POLICY "Users can view their own exam blocks"
  ON exam_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam blocks"
  ON exam_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam blocks"
  ON exam_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam blocks"
  ON exam_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- QUESTIONS POLICIES
CREATE POLICY "Users can view questions from their exam blocks"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_blocks
      WHERE exam_blocks.id = questions.exam_block_id
      AND exam_blocks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create questions in their exam blocks"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_blocks
      WHERE exam_blocks.id = questions.exam_block_id
      AND exam_blocks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions in their exam blocks"
  ON questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exam_blocks
      WHERE exam_blocks.id = questions.exam_block_id
      AND exam_blocks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions in their exam blocks"
  ON questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM exam_blocks
      WHERE exam_blocks.id = questions.exam_block_id
      AND exam_blocks.user_id = auth.uid()
    )
  );

-- QUESTION CORRECTIONS POLICIES
CREATE POLICY "Users can view their own corrections"
  ON question_corrections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own corrections"
  ON question_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own corrections"
  ON question_corrections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own corrections"
  ON question_corrections FOR DELETE
  USING (auth.uid() = user_id);

-- EXAM ATTEMPTS POLICIES
CREATE POLICY "Users can view their own exam attempts"
  ON exam_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exam attempts"
  ON exam_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts"
  ON exam_attempts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam attempts"
  ON exam_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- USER ANSWERS POLICIES
CREATE POLICY "Users can view their own answers"
  ON user_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = user_answers.attempt_id
      AND exam_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own answers"
  ON user_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_attempts
      WHERE exam_attempts.id = user_answers.attempt_id
      AND exam_attempts.user_id = auth.uid()
    )
  );

-- DAILY STATS POLICIES
CREATE POLICY "Users can view their own daily stats"
  ON daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats"
  ON daily_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
  ON daily_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update exam_blocks.total_questions
CREATE OR REPLACE FUNCTION update_exam_block_total_questions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE exam_blocks
    SET total_questions = total_questions + 1,
        updated_at = NOW()
    WHERE id = NEW.exam_block_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE exam_blocks
    SET total_questions = total_questions - 1,
        updated_at = NOW()
    WHERE id = OLD.exam_block_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_block_total_questions
AFTER INSERT OR DELETE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_exam_block_total_questions();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exam_blocks_updated_at
BEFORE UPDATE ON exam_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_exam_attempts_updated_at
BEFORE UPDATE ON exam_attempts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_daily_stats_updated_at
BEFORE UPDATE ON daily_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
