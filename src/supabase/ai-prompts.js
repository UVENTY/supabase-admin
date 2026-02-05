import { supabase } from './client'

export async function getAIPrompts() {
  try {
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Get AI prompts error:', error)
      throw error
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Get AI prompts error:', error)
    return { data: null, error }
  }
}

export async function createAIPrompt(name, prompt) {
  try {
    if (!prompt || !prompt.trim()) {
      throw new Error('Промт не может быть пустым')
    }

    const { data, error } = await supabase
      .from('ai_prompts')
      .insert({
        name: name?.trim() || null,
        prompt: prompt.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Create AI prompt error:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Create AI prompt error:', error)
    return { data: null, error }
  }
}

export async function updateAIPrompt(id, name, prompt) {
  try {
    if (!prompt || !prompt.trim()) {
      throw new Error('Промт не может быть пустым')
    }

    const { data, error } = await supabase
      .from('ai_prompts')
      .update({
        name: name?.trim() || null,
        prompt: prompt.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update AI prompt error:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Update AI prompt error:', error)
    return { data: null, error }
  }
}

export async function getAIPromptById(id) {
  try {
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Get AI prompt by id error:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Get AI prompt by id error:', error)
    return { data: null, error }
  }
}

export async function deleteAIPrompt(id) {
  try {
    const { data, error } = await supabase
      .from('ai_prompts')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Delete AI prompt error:', error)
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Delete AI prompt error:', error)
    return { data: null, error }
  }
}
