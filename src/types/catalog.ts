export interface State {
  id: string;
  name: string;
  code: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export const MEXICO_STATES: State[] = [
  { id: "AGU", name: "Aguascalientes", code: "AGU" },
  { id: "BCN", name: "Baja California", code: "BCN" },
  { id: "BCS", name: "Baja California Sur", code: "BCS" },
  { id: "CAM", name: "Campeche", code: "CAM" },
  { id: "CHP", name: "Chiapas", code: "CHP" },
  { id: "CHH", name: "Chihuahua", code: "CHH" },
  { id: "CMX", name: "Ciudad de México", code: "CMX" },
  { id: "COA", name: "Coahuila", code: "COA" },
  { id: "COL", name: "Colima", code: "COL" },
  { id: "DUR", name: "Durango", code: "DUR" },
  { id: "GUA", name: "Guanajuato", code: "GUA" },
  { id: "GRO", name: "Guerrero", code: "GRO" },
  { id: "HID", name: "Hidalgo", code: "HID" },
  { id: "JAL", name: "Jalisco", code: "JAL" },
  { id: "MEX", name: "Estado de México", code: "MEX" },
  { id: "MIC", name: "Michoacán", code: "MIC" },
  { id: "MOR", name: "Morelos", code: "MOR" },
  { id: "NAY", name: "Nayarit", code: "NAY" },
  { id: "NLE", name: "Nuevo León", code: "NLE" },
  { id: "OAX", name: "Oaxaca", code: "OAX" },
  { id: "PUE", name: "Puebla", code: "PUE" },
  { id: "QUE", name: "Querétaro", code: "QUE" },
  { id: "ROO", name: "Quintana Roo", code: "ROO" },
  { id: "SLP", name: "San Luis Potosí", code: "SLP" },
  { id: "SIN", name: "Sinaloa", code: "SIN" },
  { id: "SON", name: "Sonora", code: "SON" },
  { id: "TAB", name: "Tabasco", code: "TAB" },
  { id: "TAM", name: "Tamaulipas", code: "TAM" },
  { id: "TLA", name: "Tlaxcala", code: "TLA" },
  { id: "VER", name: "Veracruz", code: "VER" },
  { id: "YUC", name: "Yucatán", code: "YUC" },
  { id: "ZAC", name: "Zacatecas", code: "ZAC" },
];

export const COURSE_CATEGORIES: Category[] = [
  { id: "programming", name: "Programación", icon: "💻" },
  { id: "design", name: "Diseño", icon: "🎨" },
  { id: "business", name: "Negocios", icon: "💼" },
  { id: "marketing", name: "Marketing", icon: "📈" },
  { id: "photography", name: "Fotografía", icon: "📷" },
  { id: "music", name: "Música", icon: "🎵" },
  { id: "health", name: "Salud y Bienestar", icon: "🏥" },
  { id: "language", name: "Idiomas", icon: "🌍" },
  { id: "science", name: "Ciencias", icon: "🔬" },
  { id: "other", name: "Otros", icon: "📚" },
];
