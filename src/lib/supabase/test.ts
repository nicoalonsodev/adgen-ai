import { supabase } from './client'

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .limit(1)

    if (error) throw error
    
    console.log('✅ Conexión exitosa:', data)
    return true
  } catch (error) {
    console.error('❌ Error de conexión:', error)
    return false
  }
}