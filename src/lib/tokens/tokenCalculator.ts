const TOKEN_COSTS = {
  GENERATE_COPY: 50,
  GENERATE_BACKGROUND: 80,
  TEMPLATE_BETA: 20,
  PRODUCT_IA: 120,
  ANALYZE_REFERENCE: 40,
  GENERATE_SEQUENCE_COPY: 100,
  SCENE_GENERATION: 90,
  STANDARD: 0,
  UNKNOWN: 0,
}

export function calculateTokensForOperation(
  operation: string,
  payload: Record<string, any>
): number {
  const baseCost = TOKEN_COSTS[operation as keyof typeof TOKEN_COSTS] || 0

  // Multiplicadores según contexto
  const variantCount = payload.numberOfVariants || 1
  const templateCount = payload.selectedTemplates?.length || 1
  const isSequence = payload.creationMode === 'secuencia'

  let totalCost = baseCost

  // Multiplicar por cantidad de variantes/templates
  if (operation === 'GENERATE_COPY') {
    totalCost = baseCost * variantCount * templateCount
  }

  // Operaciones batch (paralelo)
  if (operation === 'GENERATE_BACKGROUND') {
    totalCost = baseCost * variantCount * templateCount
  }

  // Secuencia cuesta más
  if (isSequence) {
    totalCost = totalCost * 2.5 // 2.5x más consumidor
  }

  return totalCost
}