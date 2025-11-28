// Mapeo de estados a códigos de archivo
export const stateCodeMap: Record<string, string> = {
  "Aguascalientes": "AGSC",
  "Baja California": "BCAL",
  "Baja California Sur": "BCSU",
  "Campeche": "CAMP",
  "Chiapas": "CHIS",
  "Chihuahua": "CHIH",
  "Ciudad de México": "CDMX",
  "Coahuila": "COAH",
  "Colima": "COLI",
  "Durango": "DURA",
  "Guanajuato": "GUAN",
  "Guerrero": "GUER",
  "Hidalgo": "HIDA",
  "Jalisco": "JALI",
  "Estado de México": "EMEX",
  "Michoacán": "MICH",
  "Morelos": "MORE",
  "Nayarit": "NAYA",
  "Nuevo León": "NLEON",
  "Oaxaca": "OAXA",
  "Puebla": "PUEB",
  "Querétaro": "QUER",
  "Quintana Roo": "QROO",
  "San Luis Potosí": "SLPO",
  "Sinaloa": "SINA",
  "Sonora": "SONO",
  "Tabasco": "TABA",
  "Tamaulipas": "TAMA",
  "Tlaxcala": "TLAX",
  "Veracruz": "VERA",
  "Yucatán": "YUCA",
  "Zacatecas": "ZACA"
};

interface MunicipalityData {
  state: string;
  code: string;
  municipalities: string[];
}

// Función para cargar municipios de un estado
export async function loadMunicipalities(stateName: string): Promise<string[]> {
  const stateCode = stateCodeMap[stateName];
  
  if (!stateCode) {
    console.warn(`No se encontró código para el estado: ${stateName}`);
    return [];
  }

  try {
    const module = await import(`./${stateCode}.json`);
    const data: MunicipalityData = module.default || module;
    return data.municipalities || [];
  } catch (error) {
    console.error(`Error cargando municipios para ${stateName}:`, error);
    return [];
  }
}

// Función para filtrar municipios
export function filterMunicipalities(municipalities: string[], searchTerm: string): string[] {
  if (!searchTerm) return municipalities;
  
  const term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  return municipalities.filter(municipality => {
    const normalized = municipality.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized.includes(term);
  });
}
