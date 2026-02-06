const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || ''

const GEMINI_API_BASE_V1 = 'https://generativelanguage.googleapis.com/v1'
const GEMINI_API_BASE_V1BETA = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_API_VERSIONS = ['v1', 'v1beta']
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite'
]
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || ''

const REVE_API_BASE = 'https://api.reve.com'
const REVE_API_URL_V1 = `${REVE_API_BASE}/v1/chat/completions`
const REVE_API_URL_OPENAI = `${REVE_API_BASE}/openai/v1/chat/completions`
const REVE_API_KEY = process.env.REACT_APP_REVE_API_KEY || ''

function isPromptSafe(message) {
  if (!message || typeof message !== 'string') {
    return false
  }

  const dangerousPatterns = [
    /SELECT\s+.*\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+.*\s+SET/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
    /CREATE\s+TABLE/i,
    /ALTER\s+TABLE/i,
    /EXEC\s*\(/i,
    /EXECUTE\s*\(/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /\.query\s*\(/i,
    /\.execute\s*\(/i,
    /supabase\./i,
    /database\./i,
    /db\./i,
    /process\.env/i,
    /require\s*\(/i,
    /import\s+/i,
    /<script/i,
    /javascript:/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(message)) {
      return false
    }
  }

  return true
}

async function getAvailableGeminiModels() {
  if (!GEMINI_API_KEY) {
    throw new Error('API ключ Gemini не настроен')
  }

  for (const version of GEMINI_API_VERSIONS) {
    try {
      const apiBase = version === 'v1' ? GEMINI_API_BASE_V1 : GEMINI_API_BASE_V1BETA
      const response = await fetch(
        `${apiBase}/models?key=${GEMINI_API_KEY}`
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const models = data.models || []
      return { models, version }
    } catch (error) {
      continue
    }
  }
  
  throw new Error('Не удалось получить список моделей ни для одной версии API')
}

async function sendMessageToGemini(message, conversationHistory = [], context = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('API ключ Gemini не настроен. Получите бесплатный ключ на https://aistudio.google.com/app/apikey и добавьте его в переменные окружения REACT_APP_GEMINI_API_KEY')
  }

  let availableModels = []
  let apiVersion = 'v1beta'
  let apiBase = GEMINI_API_BASE_V1BETA
  
  try {
    const result = await getAvailableGeminiModels()
    const models = result.models || []
    apiVersion = result.version || 'v1beta'
    apiBase = apiVersion === 'v1' ? GEMINI_API_BASE_V1 : GEMINI_API_BASE_V1BETA
    
    availableModels = models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => {
        const name = m.name || ''
        return name.replace(/^models\//, '')
      })
      .filter(Boolean)
  } catch (error) {
    console.warn('Не удалось получить список моделей, используем стандартный список:', error)
    availableModels = GEMINI_MODELS
  }
  
  if (availableModels.length === 0) {
    availableModels = GEMINI_MODELS
  }

  let systemInstruction = 'Ты полезный AI-ассистент для системы управления билетами. Отвечай на русском языке, будь вежливым и информативным. Ты не имеешь доступа к базе данных и можешь только отвечать на вопросы текстом. Не пытайся выполнять SQL запросы или другой код.'
  
  if (context && context.events) {
    systemInstruction += '\n\nУ тебя есть доступ к следующей информации о событиях:\n\n'
    systemInstruction += JSON.stringify(context.events, null, 2)
    systemInstruction += '\n\nИспользуй эту информацию для ответа на вопросы пользователя о событиях, ценах на билеты и других аспектах системы.'
  }

  const contents = []
  
  conversationHistory.forEach(({ role, content }) => {
    if (isPromptSafe(content)) {
      const geminiRole = role === 'assistant' ? 'model' : 'user'
      contents.push({
        role: geminiRole,
        parts: [{ text: content }]
      })
    }
  })
  
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  })

  let finalContents = contents
  
  if (systemInstruction && apiVersion === 'v1') {
    finalContents = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      {
        role: 'model',
        parts: [{ text: 'Понял, готов помочь.' }]
      },
      ...contents
    ]
  }
  
  const requestBody = {
    contents: finalContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  }
  
  if (systemInstruction && apiVersion === 'v1beta') {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    }
  }

  let lastError = null
  for (const model of availableModels) {
    try {
      const response = await fetch(
        `${apiBase}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        lastError = new Error(`Gemini API error: ${response.status} - ${errorText}`)
        continue
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (text) {
        return text
      } else {
        throw new Error('Пустой ответ от Gemini API')
      }
    } catch (error) {
      lastError = error
      continue
    }
  }

  throw lastError || new Error('Не удалось получить ответ от Gemini API')
}

async function sendMessageToReve(message, conversationHistory = [], context = null) {
  const cleanHistory = conversationHistory.map(({ role, content }) => {
    if (!isPromptSafe(content)) {
      return { role, content: '[Сообщение удалено по соображениям безопасности]' }
    }
    return { role, content }
  })

  try {
    const { supabase } = await import('../supabase/client')
    
    const { data, error } = await supabase.functions.invoke('reve-ai-proxy', {
      body: {
        message,
        conversationHistory: cleanHistory,
        context
      }
    })

    if (error) {
      throw new Error(error.message || 'Ошибка вызова Edge Function')
    }

    if (!data) {
      throw new Error('Не удалось получить ответ от Reve API')
    }

    if (data.success === false || data.error) {
      throw new Error(data.error || 'Ошибка Reve API')
    }

    if (data.type === 'image' && (data.imageUrl || data.imageBase64)) {
      return {
        type: 'image',
        imageUrl: data.imageUrl,
        imageBase64: data.imageBase64,
        content: data.content || 'Изображение успешно сгенерировано'
      }
    }

    if (data.content) {
      return data.content
    }

    throw new Error(data?.error || 'Не удалось получить ответ от Reve API')
  } catch (error) {
    console.error('Ошибка при запросе к Reve API через Edge Function:', error)
    throw error
  }
}

async function sendMessageToGroq(message, conversationHistory = [], context = null) {
  if (!GROQ_API_KEY) {
    throw new Error('API ключ не настроен. Получите бесплатный ключ на https://console.groq.com/ и добавьте его в переменные окружения REACT_APP_GROQ_API_KEY')
  }

  const cleanHistory = conversationHistory.map(({ role, content }) => {
    if (!isPromptSafe(content)) {
      return { role, content: '[Сообщение удалено по соображениям безопасности]' }
    }
    return { role, content }
  })

  let systemContent = 'Ты полезный AI-ассистент для системы управления билетами. Отвечай на русском языке, будь вежливым и информативным. Ты не имеешь доступа к базе данных и можешь только отвечать на вопросы текстом. Не пытайся выполнять SQL запросы или другой код.'
  
  if (context && context.events) {
    systemContent += '\n\nУ тебя есть доступ к следующей информации о событиях:\n\n'
    systemContent += JSON.stringify(context.events, null, 2)
    systemContent += '\n\nИспользуй эту информацию для ответа на вопросы пользователя о событиях, ценах на билеты и других аспектах системы.'
  }

  const messages = [
    {
      role: 'system',
      content: systemContent
    },
    ...cleanHistory,
    {
      role: 'user',
      content: message
    }
  ]

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Ошибка API: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'Не удалось получить ответ от AI'
  } catch (error) {
    console.error('Ошибка при запросе к Groq AI:', error)
    throw error
  }
}

async function sendMessageToHuggingFace(message, conversationHistory = [], context = null) {
  let englishPrompt = 'concert event poster, professional design, vibrant colors'
  
  if (context && context.events && context.events.length > 0) {
    const event = context.events[0]
    const parts = []
    
    parts.push('professional concert poster design')
    
    if (event.artist) parts.push(`featuring artist "${event.artist}"`)
    if (event.stadium) parts.push(`at venue "${event.stadium}"`)
    if (event.city) parts.push(`in ${event.city}`)
    if (event.country) parts.push(`${event.country}`)
    if (event.date) {
      const date = new Date(event.date)
      const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      parts.push(`on ${dateStr}`)
    }
    
    parts.push('vibrant colors, modern design, high quality, detailed')
    
    englishPrompt = parts.join(', ')
  }

  try {
    const { supabase } = await import('../supabase/client')
    
    const { data, error } = await supabase.functions.invoke('huggingface-image', {
      body: { prompt: englishPrompt }
    })

    if (error) {
      throw new Error(error.message || 'Ошибка вызова Edge Function')
    }

    if (!data || !data.imageBase64) {
      throw new Error(data?.error || 'Не удалось получить изображение')
    }

    return {
      type: 'image',
      imageBase64: data.imageBase64,
    }
  } catch (error) {
    console.error('Ошибка при запросе к Hugging Face:', error)
    throw new Error(`Ошибка Hugging Face: ${error.message}`)
  }
}

export async function sendMessageToAI(message, conversationHistory = [], context = null, aiProvider = 'groq') {
  if (!isPromptSafe(message)) {
    throw new Error('Промт содержит недопустимые команды. Доступ к базе данных и выполнение кода запрещены.')
  }

  if (aiProvider === 'gemini') {
    return await sendMessageToGemini(message, conversationHistory, context)
  } else if (aiProvider === 'reve') {
    return await sendMessageToReve(message, conversationHistory, context)
  } else if (aiProvider === 'huggingface') {
    return await sendMessageToHuggingFace(message, conversationHistory, context)
  } else {
    return await sendMessageToGroq(message, conversationHistory, context)
  }
}
