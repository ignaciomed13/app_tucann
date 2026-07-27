// Diccionario de la frase de recuperación: 256 palabras, una por byte, así que
// convertir bytes al azar en palabras es una tabla directa y no hay aritmética
// de bits que se pueda equivocar.
//
// Reglas del diccionario (las verifica tests/recovery.test.ts):
// - Exactamente 256 palabras, todas distintas.
// - Sin tildes y sin "ñ": la frase se anota a mano en un papel y se vuelve a
//   tipear meses después, muchas veces desde un teclado de celular.
// - Palabras comunes y cortas, nada que se preste a confusión al dictarla.
export const WORDLIST = [
  "abeja", "abrigo", "aceite", "acero", "agua", "ahorro", "aire", "ajo",
  "alambre", "alba", "aldea", "alfombra", "almeja", "altura", "amable", "amigo",
  "ancla", "anillo", "antena", "anuncio", "arbusto", "arcilla", "arena", "arroz",
  "baile", "balde", "ballena", "banco", "bandera", "barco", "barro", "batalla",
  "bebida", "bosque", "bota", "botella", "brazo", "brisa", "broche", "bronce",
  "buque", "burbuja", "buzo", "caballo", "cabra", "cadena", "caja", "calle",
  "carne", "carpa", "carta", "casa", "cascada", "castillo", "cebolla", "cedro",
  "ceniza", "cepillo", "cerca", "cereza", "cielo", "ciervo", "cinta", "ciruela",
  "ciudad", "clavo", "cobre", "cocina", "codo", "colina", "collar", "comida",
  "cuerda", "cueva", "dado", "dedo", "desierto", "diamante", "dibujo", "diente",
  "disco", "doble", "dorado", "duna", "durazno", "enero", "enigma", "ermita",
  "escalera", "escudo", "espejo", "espiga", "espuma", "estrella", "faro", "fecha",
  "galleta", "gancho", "ganso", "garra", "gaviota", "gemelo", "globo", "goma",
  "gorra", "grano", "granja", "grillo", "gruta", "guante", "guitarra", "gusano",
  "harina", "helecho", "hierba", "higo", "hilo", "hoja", "hongo", "horno",
  "jarra", "jaula", "jinete", "jugo", "laguna", "ladrillo", "lagarto", "lana",
  "lanza", "laurel", "leche", "lechuga", "libro", "liebre", "lima", "linterna",
  "lirio", "llave", "lluvia", "lobo", "loma", "loro", "luna", "lupa",
  "mirlo", "molino", "moneda", "mora", "mosca", "muela", "muelle", "muro",
  "musgo", "nabo", "naranja", "nariz", "nave", "neblina", "nido", "niebla",
  "nieve", "nube", "nudo", "nuez", "ola", "olivo", "olla", "oreja",
  "pantalla", "papel", "parra", "pasto", "pato", "pecera", "pera", "perla",
  "pescado", "pez", "pino", "pinza", "piedra", "pierna", "pileta", "pluma",
  "pollo", "polvo", "portal", "pozo", "pradera", "puente", "puerta", "pulpo",
  "reja", "reloj", "remo", "resina", "risa", "roble", "roca", "rombo",
  "ropa", "rosa", "rueda", "sabana", "sal", "salto", "sapo", "sauce",
  "selva", "semilla", "senda", "sierra", "silla", "sirena", "sol", "sombra",
  "sopa", "surco", "tabla", "tallo", "tambor", "tarde", "techo", "tejado",
  "tela", "templo", "tierra", "tigre", "tijera", "tinta", "tomate", "tormenta",
  "torre", "tortuga", "trigo", "trueno", "tubo", "tuna", "turbina", "uva",
  "vaca", "valle", "vapor", "vara", "vela", "vena", "venado", "vereda",
  "vidrio", "viento", "vino", "zanahoria", "zapato", "zorro", "zafiro", "zumo",
] as const;
