/**
 * Utilidades para validar CURP contra datos del usuario
 */

// Mapeo de estados a códigos de CURP (2 dígitos)
export const STATE_CURP_CODES: Record<string, string> = {
  "Aguascalientes": "AS",
  "Baja California": "BC",
  "Baja California Sur": "BS",
  "Campeche": "CC",
  "Chiapas": "CS",
  "Chihuahua": "CH",
  "Ciudad de México": "DF",
  "Coahuila": "CL",
  "Colima": "CM",
  "Durango": "DG",
  "Estado de México": "MC",
  "Guanajuato": "GT",
  "Guerrero": "GR",
  "Hidalgo": "HG",
  "Jalisco": "JC",
  "Michoacán": "MN",
  "Morelos": "MS",
  "Nayarit": "NT",
  "Nuevo León": "NL",
  "Oaxaca": "OC",
  "Puebla": "PL",
  "Querétaro": "QT",
  "Quintana Roo": "QR",
  "San Luis Potosí": "SP",
  "Sinaloa": "SL",
  "Sonora": "SR",
  "Tabasco": "TC",
  "Tamaulipas": "TS",
  "Tlaxcala": "TL",
  "Veracruz": "VZ",
  "Yucatán": "YN",
  "Zacatecas": "ZS",
};

/**
 * Obtiene la primera letra de un nombre, manejando casos especiales
 */
function getFirstLetter(text: string): string {
  if (!text || text.trim().length === 0) return "";
  
  // Remover acentos y convertir a mayúsculas
  const normalized = text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Obtener primera letra válida (A-Z)
  const match = normalized.match(/[A-Z]/);
  return match ? match[0] : "";
}

/**
 * Normaliza texto removiendo acentos y caracteres especiales
 */
function normalize(text: string): string {
  return text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/Ñ/g, "X") // Ñ se convierte en X
    .replace(/Ü/g, "U") // Ü se convierte en U
    .replace(/[^A-Z]/g, ""); // Solo letras
}

/**
 * Encuentra la primera vocal interna (después de la primera letra)
 */
function findFirstInternalVowel(text: string): string {
  if (text.length < 2) return "X";
  const vowels = "AEIOU";
  for (let i = 1; i < text.length; i++) {
    if (vowels.includes(text[i])) {
      return text[i];
    }
  }
  return "X"; // Si no hay vocal interna, usar X
}

/**
 * Encuentra la primera consonante interna (después de la primera letra)
 */
function findFirstInternalConsonant(text: string): string {
  if (text.length < 2) return "X";
  const vowels = "AEIOU";
  for (let i = 1; i < text.length; i++) {
    if (!vowels.includes(text[i])) {
      return text[i];
    }
  }
  return "X"; // Si no hay consonante interna, usar X
}

/**
 * Obtiene las iniciales para la CURP (posiciones 1-4)
 * Reglas:
 * 1: Primera letra del primer apellido
 * 2: Primera vocal interna del primer apellido (no la inicial)
 * 3: Primera letra del segundo apellido (X si no existe)
 * 4: Primera letra del primer nombre (o segundo nombre si el primero es JOSE/MARIA)
 */
function getCURPInitials(
  lastName: string,
  secondLastName: string,
  firstName: string
): string {
  const normalizedLastName = normalize(lastName);
  const normalizedSecondLastName = normalize(secondLastName);
  
  // Obtener nombres
  const firstNameParts = firstName.trim().split(/\s+/).filter(p => p.length > 0);
  const firstGivenName = firstNameParts[0] || "";
  const secondGivenName = firstNameParts[1] || "";
  const normalizedFirstName = normalize(firstGivenName);
  const normalizedSecondName = normalize(secondGivenName);

  // Validar que el apellido paterno tenga al menos una letra
  if (normalizedLastName.length === 0) {
    console.error("[getCURPInitials] Apellido paterno vacío después de normalizar");
    return "XXXX";
  }

  // Posición 1: Primera letra del primer apellido
  const pos1 = normalizedLastName[0] || "X";

  // Posición 2: Primera vocal interna del primer apellido
  const pos2 = findFirstInternalVowel(normalizedLastName);

  // Posición 3: Primera letra del segundo apellido (X si no existe)
  const pos3 = normalizedSecondLastName[0] || "X";

  // Posición 4: Primera letra del nombre
  // Condicional: Si el primer nombre es JOSE o MARIA y hay segundo nombre, usar el segundo
  let pos4 = normalizedFirstName[0] || "X";
  if ((normalizedFirstName === "JOSE" || normalizedFirstName === "MARIA") && normalizedSecondName.length > 0) {
    pos4 = normalizedSecondName[0] || "X";
  }

  const result = (pos1 + pos2 + pos3 + pos4).substring(0, 4);
  
  console.log("[getCURPInitials Result]", {
    lastName,
    normalizedLastName,
    secondLastName,
    normalizedSecondLastName,
    firstName,
    firstGivenName,
    secondGivenName,
    normalizedFirstName,
    normalizedSecondName,
    pos1,
    pos2,
    pos3,
    pos4,
    result,
  });

  return result;
}

/**
 * Obtiene las consonantes internas para la CURP (posiciones 14-16)
 * 14: Primera consonante interna del primer apellido
 * 15: Primera consonante interna del segundo apellido
 * 16: Primera consonante interna del nombre
 */
function getCURPInternalConsonants(
  lastName: string,
  secondLastName: string,
  firstName: string
): string {
  const normalizedLastName = normalize(lastName);
  const normalizedSecondLastName = normalize(secondLastName);
  
  // Obtener nombres
  const firstNameParts = firstName.trim().split(/\s+/).filter(p => p.length > 0);
  const firstGivenName = firstNameParts[0] || "";
  const secondGivenName = firstNameParts[1] || "";
  const normalizedFirstName = normalize(firstGivenName);
  const normalizedSecondName = normalize(secondGivenName);

  // Determinar qué nombre usar (si el primero es JOSE/MARIA y hay segundo, usar el segundo)
  let nameToUse = normalizedFirstName;
  if ((normalizedFirstName === "JOSE" || normalizedFirstName === "MARIA") && normalizedSecondName.length > 0) {
    nameToUse = normalizedSecondName;
  }

  // Posición 14: Primera consonante interna del primer apellido
  const pos14 = findFirstInternalConsonant(normalizedLastName);

  // Posición 15: Primera consonante interna del segundo apellido
  const pos15 = normalizedSecondLastName.length > 0 
    ? findFirstInternalConsonant(normalizedSecondLastName)
    : "X";

  // Posición 16: Primera consonante interna del nombre
  const pos16 = nameToUse.length > 0
    ? findFirstInternalConsonant(nameToUse)
    : "X";

  const result = (pos14 + pos15 + pos16).substring(0, 3);
  
  console.log("[getCURPInternalConsonants Result]", {
    lastName: normalizedLastName,
    secondLastName: normalizedSecondLastName,
    nameToUse,
    pos14,
    pos15,
    pos16,
    result,
  });

  return result;
}

/**
 * Formatea la fecha para CURP (YYMMDD)
 * Acepta formatos: YYYY-MM-DD, DD/MM/YYYY, o Date object
 */
function formatDateForCURP(dateString: string): string {
  try {
    let year: number;
    let month: number;
    let day: number;
    
    // Intentar parsear diferentes formatos
    if (dateString.includes("/")) {
      // Formato DD/MM/YYYY
      const parts = dateString.split("/");
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
        year = parseInt(parts[2], 10);
      } else {
        // Si no tiene el formato esperado, intentar con Date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return "";
        }
        year = date.getFullYear();
        month = date.getMonth();
        day = date.getDate();
      }
    } else if (dateString.includes("-")) {
      // Formato YYYY-MM-DD - parsear directamente para evitar problemas de zona horaria
      const parts = dateString.split("-");
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
        day = parseInt(parts[2], 10);
      } else {
        // Si no tiene el formato esperado, intentar con Date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return "";
        }
        year = date.getFullYear();
        month = date.getMonth();
        day = date.getDate();
      }
    } else {
      // Otro formato, intentar con Date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "";
      }
      year = date.getFullYear();
      month = date.getMonth();
      day = date.getDate();
    }

    // Validar que los valores sean válidos
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return "";
    }

    // Validar rango de valores
    if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
      return "";
    }

    const yearStr = year.toString().slice(-2);
    const monthStr = (month + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    
    return yearStr + monthStr + dayStr;
  } catch {
    return "";
  }
}

/**
 * Obtiene el código de género para CURP
 */
function getGenderCode(gender: string): string {
  if (gender === "male") return "H";
  if (gender === "female") return "M";
  return "";
}

/**
 * Valida que la CURP coincida con los datos del usuario
 */
export function validateCURPAgainstData(
  curp: string,
  data: {
    name: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    state: string;
  }
): { isValid: boolean; error?: string } {
  const normalizedCURP = curp.trim().toUpperCase();

  console.log("[CURP Validation Start]", {
    curp: normalizedCURP,
    name: data.name,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    state: data.state,
  });

  // Validar longitud
  if (normalizedCURP.length !== 18) {
    return {
      isValid: false,
      error: "El CURP debe tener exactamente 18 caracteres",
    };
  }

  // Validar formato básico
  // El verificador son 2 caracteres (dígitos o letras)
  if (!/^[A-Z]{4}\d{6}[HM][A-Z]{2}[0-9A-Z]{3}[0-9A-Z]{2}$/.test(normalizedCURP)) {
    return {
      isValid: false,
      error: "El formato del CURP no es válido",
    };
  }

  // Separar apellidos (asumimos que lastName puede contener ambos apellidos)
  // IMPORTANTE: El primer apellido es el PATERNO, el segundo es el MATERNO
  const lastNameParts = data.lastName.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (lastNameParts.length === 0) {
    return {
      isValid: false,
      error: "Debes ingresar al menos un apellido",
    };
  }

  const firstLastName = lastNameParts[0] || "";
  const secondLastName = lastNameParts[1] || "X"; // Si no hay segundo apellido, usar X

  // Validar que el apellido paterno tenga al menos 2 letras
  const normalizedFirstLast = firstLastName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
  if (normalizedFirstLast.length < 1) {
    return {
      isValid: false,
      error: "El apellido paterno debe tener al menos una letra",
    };
  }

  // Debug: Log para depuración (siempre activo para debugging)
  console.log("[CURP Validation Debug]", {
    fullLastName: data.lastName,
    lastNameParts,
    firstLastName: normalizedFirstLast,
    secondLastName,
    fullName: data.name,
    curp: normalizedCURP,
  });

  // Validar iniciales (posiciones 1-4)
  const expectedInitials = getCURPInitials(
    firstLastName,
    secondLastName,
    data.name
  );
  const curpInitials = normalizedCURP.substring(0, 4);

  console.log("[CURP Initials Debug]", {
    expectedInitials,
    curpInitials,
    match: curpInitials === expectedInitials,
    willReject: curpInitials !== expectedInitials,
  });

  if (curpInitials !== expectedInitials) {
    // Construir mensaje descriptivo
    const firstNamePart = data.name.trim().split(/\s+/)[0] || "";
    const message = `Las iniciales del CURP (${curpInitials}) no coinciden con tus datos. ` +
      `Con nombre "${data.name}", apellido paterno "${firstLastName}" y apellido materno "${secondLastName}", ` +
      `las iniciales deberían ser: ${expectedInitials}`;
    
    return {
      isValid: false,
      error: message,
    };
  }

  // Validar consonantes internas (posiciones 14-16)
  const expectedConsonants = getCURPInternalConsonants(
    firstLastName,
    secondLastName,
    data.name
  );
  const curpConsonants = normalizedCURP.substring(13, 16);

  console.log("[CURP Consonants Debug]", {
    expectedConsonants,
    curpConsonants,
    match: curpConsonants === expectedConsonants,
    willReject: curpConsonants !== expectedConsonants,
  });

  if (curpConsonants !== expectedConsonants) {
    const firstNamePart = data.name.trim().split(/\s+/)[0] || "";
    const message = `Las consonantes internas del CURP (${curpConsonants}) no coinciden con tus datos. ` +
      `Con nombre "${data.name}", apellido paterno "${firstLastName}" y apellido materno "${secondLastName}", ` +
      `las consonantes deberían ser: ${expectedConsonants}`;
    
    return {
      isValid: false,
      error: message,
    };
  }

  // Validar fecha (caracteres 5-10: YYMMDD)
  const expectedDate = formatDateForCURP(data.dateOfBirth);
  const curpDate = normalizedCURP.substring(4, 10);

  console.log("[CURP Date Validation]", {
    dateOfBirth: data.dateOfBirth,
    expectedDate,
    curpDate,
    match: curpDate === expectedDate,
  });

  if (!expectedDate) {
    return {
      isValid: false,
      error: "No se pudo procesar la fecha de nacimiento",
    };
  }

  if (curpDate !== expectedDate) {
    return {
      isValid: false,
      error: `La fecha en el CURP (${curpDate}) no coincide con tu fecha de nacimiento (${expectedDate})`,
    };
  }

  // Validar género (carácter 11: H o M)
  const expectedGender = getGenderCode(data.gender);
  const curpGender = normalizedCURP.substring(10, 11);

  console.log("[CURP Gender Validation]", {
    gender: data.gender,
    expectedGender,
    curpGender,
    match: curpGender === expectedGender,
  });

  if (!expectedGender) {
    return {
      isValid: false,
      error: "Debes seleccionar un género válido (Masculino o Femenino)",
    };
  }

  if (curpGender !== expectedGender) {
    return {
      isValid: false,
      error: `El género en el CURP (${curpGender}) no coincide con el seleccionado (${expectedGender === "H" ? "Masculino" : "Femenino"})`,
    };
  }

  // Validar estado (caracteres 12-13)
  const stateCode = STATE_CURP_CODES[data.state];
  const curpState = normalizedCURP.substring(11, 13);

  console.log("[CURP State Validation]", {
    state: data.state,
    stateCode,
    curpState,
    match: curpState === stateCode,
    availableStates: Object.keys(STATE_CURP_CODES),
  });

  if (!stateCode) {
    return {
      isValid: false,
      error: `Estado no válido o no encontrado. Estado recibido: "${data.state}". Estados disponibles: ${Object.keys(STATE_CURP_CODES).join(", ")}`,
    };
  }

  if (curpState !== stateCode) {
    return {
      isValid: false,
      error: `El código de estado en el CURP (${curpState}) no coincide con el estado seleccionado (${data.state} - ${stateCode})`,
    };
  }

  return { isValid: true };
}
