-- Создание таблицы для хранения AI промтов
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_prompts (
  id BIGSERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индекса для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ai_prompts_created_at ON ai_prompts(created_at DESC);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE ai_prompts IS 'Таблица для хранения промтов AI ассистента';
COMMENT ON COLUMN ai_prompts.id IS 'Уникальный идентификатор промта';
COMMENT ON COLUMN ai_prompts.prompt IS 'Текст промта';
COMMENT ON COLUMN ai_prompts.created_at IS 'Дата и время создания промта';
COMMENT ON COLUMN ai_prompts.updated_at IS 'Дата и время последнего обновления промта';

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ai_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_update_ai_prompts_updated_at
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_prompts_updated_at();

-- Настройка RLS (Row Level Security) - если нужно ограничить доступ
-- ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Users can view all prompts" ON ai_prompts
--   FOR SELECT USING (true);
-- 
-- CREATE POLICY "Users can insert prompts" ON ai_prompts
--   FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Users can update their prompts" ON ai_prompts
--   FOR UPDATE USING (true);
-- 
-- CREATE POLICY "Users can delete their prompts" ON ai_prompts
--   FOR DELETE USING (true);
