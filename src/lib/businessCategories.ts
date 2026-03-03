export interface BusinessCategory {
  id: string;
  label: string;
  emoji: string;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'moda-indumentaria',       label: 'Moda e Indumentaria',       emoji: '👗' },
  { id: 'belleza-cosmetica',       label: 'Belleza y Cosmética',       emoji: '💄' },
  { id: 'salud-bienestar',         label: 'Salud y Bienestar',         emoji: '🌿' },
  { id: 'fitness-deporte',         label: 'Fitness y Deporte',         emoji: '💪' },
  { id: 'alimentos-bebidas',       label: 'Alimentos y Bebidas',       emoji: '🍔' },
  { id: 'hogar-deco',              label: 'Hogar y Decoración',        emoji: '🏠' },
  { id: 'tecnologia',              label: 'Tecnología y Gadgets',      emoji: '💻' },
  { id: 'mascotas',                label: 'Mascotas',                  emoji: '🐾' },
  { id: 'infantil-bebes',          label: 'Infantil y Bebés',          emoji: '👶' },
  { id: 'joyeria-accesorios',      label: 'Joyería y Accesorios',      emoji: '💍' },
  { id: 'servicios-profesionales', label: 'Servicios Profesionales',   emoji: '🏢' },
  { id: 'educacion-cursos',        label: 'Educación y Cursos',        emoji: '🎓' },
  { id: 'bienes-raices',           label: 'Bienes Raíces',             emoji: '🏡' },
  { id: 'automotriz',              label: 'Automotriz',                emoji: '🚗' },
  { id: 'turismo-viajes',          label: 'Turismo y Viajes',          emoji: '✈️' },
  { id: 'gastronomia',             label: 'Gastronomía',               emoji: '🍽️' },
  { id: 'salud-estetica-clinica',  label: 'Salud Estética y Clínicas', emoji: '🏥' },
  { id: 'otro',                    label: 'Otro / General',            emoji: '⚙️' },
];
