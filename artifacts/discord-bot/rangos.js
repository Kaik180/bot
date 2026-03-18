// Definición de Rangos, Precios y Beneficios
const RANGOS_DATA = [
    { id: 0, nombre: "Novato", precio: 0, descuento: 0 },
    { id: 1, nombre: "Mercader", precio: 15000, descuento: 0.05 },
    { id: 2, nombre: "Empresario", precio: 50000, descuento: 0.10 },
    { id: 3, nombre: "Magnate", precio: 150000, descuento: 0.20 },
    { id: 4, nombre: "Deidad del Server", precio: 500000, descuento: 0.30, inmunidad: true }
];

module.exports = { RANGOS_DATA };
