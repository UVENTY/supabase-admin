-- Добавление столбца name в таблицу ai_prompts
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE ai_prompts 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Комментарий к столбцу
COMMENT ON COLUMN ai_prompts.name IS 'Название промта';

-- Создание индекса для быстрого поиска по названию
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
