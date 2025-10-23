// Cargar opciones únicas para TIPO y IDEJERCICIO
function cargarOpcionesPeriodo() {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    fetch('/api/periodos')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('idperiodo');
            if (select) {
                select.innerHTML = '<option value="">-- Mes --</option>';
                // Ordenar por número
                data.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                data.forEach(num => {
                    let idx = parseInt(num, 10);
                    let nombre = (idx >= 1 && idx <= 12) ? meses[idx-1] : num;
                    select.innerHTML += `<option value="${num}">${nombre}</option>`;
                });
            }
        })
        .catch(err => console.error('Error loading periodos:', err));
}
function cargarOpcionesTipo() {
    fetch('/api/tipos')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('tipo');
            if (select) {
                select.innerHTML = '<option value="">-- Tipo --</option>';
                data.forEach(op => {
                    select.innerHTML += `<option value="${op}">${op}</option>`;
                });
            }
        })
        .catch(err => console.error('Error loading tipos:', err));
}

function cargarOpcionesEjercicio() {
    fetch('/api/ejercicios')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('idejercicio');
            if (select) {
                select.innerHTML = '<option value="">-- Año --</option>';
                data.forEach(op => {
                    // CORRECCIÓN: El backend devuelve valores truncados (22, 23)
                    // Pero mostramos el año completo (2022, 2023)
                    const displayText = `20${op}`;
                    const valueToSend = op; // Ya está en formato correcto para la BD
                    select.innerHTML += `<option value="${valueToSend}">${displayText}</option>`;
                });
            }
        })
        .catch(err => console.error('Error loading ejercicios:', err));
}

// Función para seleccionar/deseleccionar todas las opciones de un select múltiple
function toggleSelectAll(selectId) {
    const select = document.getElementById(selectId);
    const selectAllCheckbox = document.getElementById('selectAll' + selectId.charAt(0).toUpperCase() + selectId.slice(1));

    if (selectAllCheckbox.checked) {
        // Seleccionar todas las opciones excepto la primera (placeholder)
        for (let i = 1; i < select.options.length; i++) {
            select.options[i].selected = true;
        }
    } else {
        // Deseleccionar todas las opciones
        for (let i = 0; i < select.options.length; i++) {
            select.options[i].selected = false;
        }
    }
}

// Función para obtener valores seleccionados de un select múltiple
function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    return Array.from(select.selectedOptions).map(option => option.value);
}

// Función para verificar si algún filtro está aplicado
function hasAnyFilter() {
    const q = document.getElementById('busqueda').value.trim();
    const periodos = getSelectedValues('idperiodo');
    const cps = getSelectedValues('cp');
    const municipios = getSelectedValues('municipio');
    const tipos = getSelectedValues('tipo');
    const ejercicios = getSelectedValues('idejercicio');

    return q || periodos.length > 0 || cps.length > 0 || municipios.length > 0 || tipos.length > 0 || ejercicios.length > 0;
}

// Objeto para rastrear selecciones actuales
let currentSelections = {
    municipio: new Set(),
    cp: new Set(),
    tipo: new Set(),
    idejercicio: new Set(),
    idperiodo: new Set()
};

// Función para crear un chip
function createChip(text, type, value, selectId) {
    const chip = document.createElement('div');
    chip.className = `chip ${type} remove`;
    chip.textContent = text;
    chip.title = `Click para quitar filtro: ${text}`;
    chip.setAttribute('data-chip', `${selectId}-${value}`);

    chip.addEventListener('click', function() {
        removeChip(selectId, value, chip);
    });

    return chip;
}

// Función para agregar un chip
function addChip(selectId, value, text, type = 'data') {
    if (!currentSelections[selectId].has(value)) {
        currentSelections[selectId].add(value);

        const chipsContainer = document.getElementById('chipsContainer');
        if (chipsContainer) {
            const chip = createChip(text, type, value, selectId);
            chipsContainer.appendChild(chip);
        }

        // Mostrar área de selecciones si estaba oculta
        const activeSelections = document.getElementById('activeSelections');
        if (activeSelections) {
            activeSelections.style.display = 'block';
        }
    }
}

// Función para quitar un chip
function removeChip(selectId, value, chipElement) {
    if (currentSelections[selectId]) {
        currentSelections[selectId].delete(value);
    }

    // Remover el elemento visual
    if (chipElement && chipElement.remove) {
        chipElement.remove();
    }

    // Ocultar área de selecciones si no hay chips
    const chipsContainer = document.getElementById('chipsContainer');
    if (chipsContainer && chipsContainer.children.length === 0) {
        const activeSelections = document.getElementById('activeSelections');
        if (activeSelections) {
            activeSelections.style.display = 'none';
        }
    }
}

// Función para limpiar todos los chips
function clearAllChips() {
    currentSelections = {
        municipio: new Set(),
        cp: new Set(),
        tipo: new Set(),
        idejercicio: new Set(),
        idperiodo: new Set()
    };

    const chipsContainer = document.getElementById('chipsContainer');
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
    }

    const activeSelections = document.getElementById('activeSelections');
    if (activeSelections) {
        activeSelections.style.display = 'none';
    }

    // Limpiar todas las selecciones en los selectores (si existen)
    ['municipio', 'cp', 'tipo', 'idejercicio', 'idperiodo'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select && select.options) {
            for (let option of select.options) {
                option.selected = false;
            }
        }
    });

    // 🗑️ NUEVA FUNCIONALIDAD: Limpiar resultados de geocodificación
    clearGeocodingResults();

    // 🗑️ Limpiar resultados de geocodificación por CP también
    clearCPAreaResults();

    // Limpiar indicador de geocodificación si existe
    const geocodingIndicator = document.getElementById('geocoding-indicator');
    if (geocodingIndicator) {
        geocodingIndicator.remove();
    }

    // Limpiar campo de búsqueda
    const busquedaInput = document.getElementById('busqueda');
    if (busquedaInput) {
        busquedaInput.value = '';
    }

    // Ocultar tabla de resultados
    const resultadosDiv = document.getElementById('resultados');
    if (resultadosDiv) {
        resultadosDiv.style.display = 'none';
    }

    console.log('🧹 Limpieza completa: chips, geocodificación y resultados');
}

// Función para mostrar/ocultar sección de búsqueda por dirección (ya no se usa)
function toggleAddressSearch() {
    console.log('ℹ️ Función toggleAddressSearch ya no es necesaria - la sección está siempre visible');
}

// Función para inicializar la aplicación correctamente
function inicializarAplicacion() {
    console.log('🚀 Aplicación inicializada correctamente');
    console.log('💡 Usa los filtros dropdown para buscar datos');
    console.log('🗺️ El mapa se mostrará automáticamente cuando haya datos para visualizar');
}

// Funciones de geocodificación usando servidor Nominatim local
window.geocodeResults = {};
window.cpGeocodeResults = {}; // Para resultados de geocodificación por CP (ya no se usa)

// Hacer funciones disponibles globalmente desde el inicio
window.searchNearbyAddresses = function() {
    const addressInput = document.getElementById('address-search');
    const radiusInput = document.getElementById('radius-search');

    if (!addressInput) {
        console.error('❌ No se encontró el campo de búsqueda de direcciones');
        alert('Error: No se pudo encontrar el campo de búsqueda de direcciones');
        return;
    }

    const searchAddress = addressInput.value.trim();
    if (!searchAddress) {
        alert('Por favor ingresa una dirección para buscar');
        return;
    }

    const radiusKm = radiusInput && radiusInput.value ? parseFloat(radiusInput.value) : 5;

    console.log(`🔍 Iniciando búsqueda de direcciones cercanas a: ${searchAddress}`);
    console.log(`📏 Radio de búsqueda: ${radiusKm} km`);

    // Mostrar indicador de carga
    showGeocodingIndicator();

    // Ejecutar búsqueda
    geocodeNearbyAddresses(searchAddress, radiusKm)
        .then(results => {
            if (results && results.length > 0) {
                showNearbyAddressesStats(results);
                console.log('✅ Búsqueda completada exitosamente');
            } else {
                console.log('ℹ️ No se encontraron direcciones cercanas');
                alert('No se encontraron direcciones cercanas a la ubicación especificada');
            }
        })
        .catch(error => {
            console.error('❌ Error en búsqueda de direcciones cercanas:', error);
            alert('Error al buscar direcciones cercanas. Verifica que el servidor esté funcionando.');
        })
        .finally(() => {
            // Ocultar indicador de carga después de 2 segundos
            setTimeout(() => {
                const indicator = document.getElementById('geocoding-indicator');
                if (indicator) indicator.remove();
            }, 2000);
        });
};

function geocodeAddress(address) {
    console.log(`🌐 Geocodificando dirección: ${address}`);

    return fetch(`/api/geocode?address=${encodeURIComponent(address)}&limit=50`)
        .then(res => {
            console.log(`📡 Respuesta del servidor: HTTP ${res.status} - ${res.statusText}`);

            if (!res.ok) {
                return res.json().then(data => {
                    console.error(`❌ Error HTTP ${res.status}:`, data.error);
                    throw new Error(`HTTP ${res.status}: ${data.error}`);
                });
            }

            return res.json();
        })
        .then(data => {
            if (data.error) {
                console.warn(`⚠️ Error geocodificando ${address}:`, data.error);
                return null;
            }

            if (!data.results || data.results.length === 0) {
                console.warn(`⚠️ No se encontraron resultados para: ${address}`);
                return null;
            }

            console.log(`✅ Geocodificación exitosa para ${address}:`, data.results[0]);
            return data.results[0];
        })
        .catch(err => {
            if (err.message && err.message.includes('404')) {
                console.error(`❌ Error 404 - Dirección no encontrada en servidor: ${address}`);
                console.log('💡 Posibles causas:');
                console.log('   - El servidor Nominatim no tiene datos de esa ubicación');
                console.log('   - La dirección está mal formada o incompleta');
                console.log('   - El servidor necesita datos específicos del Estado de México');
            } else {
                console.error(`❌ Error en geocodificación de ${address}:`, err.message || err);
            }
            return null;
        });
}

function geocodeRecordAddress(record) {
    console.log(`🏠 Procesando registro ID: ${record.id}`);

    // Verificar campos disponibles
    const availableFields = {
        colonia: record.pa_colonia,
        calle: record.pa_calle,
        numero_exterior: record.pa_numero_exterior,
        numero_interior: record.pa_numero_interior,
        cp: record.pa_cp,
        municipio: record.pa_municipio
    };

    console.log('📋 Campos disponibles:', Object.fromEntries(
        Object.entries(availableFields).filter(([k, v]) => v)
    ));

    // Intentar geocodificar usando diferentes campos de dirección
    const addressFields = [
        record.pa_colonia,
        record.pa_calle,
        record.pa_numero_exterior,
        record.pa_numero_interior,
        record.pa_cp,
        record.pa_municipio
    ].filter(field => field && (typeof field === 'string' ? field.trim() : String(field).trim()));

    if (addressFields.length === 0) {
        console.warn(`⚠️ No hay campos de dirección válidos para el registro ${record.id}`);
        return null;
    }

    // Crear dirección completa
    const fullAddress = addressFields.join(', ');
    console.log(`🔍 Dirección completa para geocodificar: "${fullAddress}"`);

    return geocodeAddress(fullAddress);
}

async function processGeocodingForRecords(records) {
    if (!records || records.length === 0) return;

    console.log(`🔄 Procesando geocodificación para ${records.length} registros...`);

    // Crear un mapa para evitar geocodificaciones duplicadas
    const addressCache = new Map();
    const geocodingPromises = [];
    let processedCount = 0;
    let successfulCount = 0;

    for (const record of records) {
        // Crear clave única para el registro basada en dirección
        const addressKey = [
            record.pa_colonia,
            record.pa_calle,
            record.pa_numero_exterior,
            record.pa_cp,
            record.pa_municipio
        ].filter(field => field && (typeof field === 'string' ? field.trim() : String(field).trim())).join('|');

        if (addressCache.has(addressKey)) {
            // Usar resultado cacheado
            const cachedResult = addressCache.get(addressKey);
            if (cachedResult) {
                // Guardar tanto el resultado de geocodificación como los datos del registro
                window.geocodeResults[record.id] = {
                    ...cachedResult,
                    personData: record // Agregar datos personales
                };
                successfulCount++;
            }
            processedCount++;
            continue;
        }

        // Crear promesa para geocodificar
        const geocodingPromise = geocodeRecordAddress(record)
            .then(result => {
                addressCache.set(addressKey, result);
                if (result) {
                    // Guardar tanto el resultado de geocodificación como los datos del registro
                    window.geocodeResults[record.id] = {
                        ...result,
                        personData: record // Agregar datos personales
                    };
                    successfulCount++;
                }
                processedCount++;
                console.log(`📈 Progreso: ${processedCount}/${records.length} procesados, ${successfulCount} exitosos`);
                return result;
            })
            .catch(err => {
                processedCount++;
                console.error(`❌ Error procesando registro ${record.id}:`, err);
                return null;
            });

        geocodingPromises.push(geocodingPromise);
    }

    try {
        console.log('⏳ Esperando resultados de geocodificación...');
        await Promise.allSettled(geocodingPromises);

        console.log(`✅ Geocodificación completada:`);
        console.log(`   - Total procesados: ${processedCount}`);
        console.log(`   - Exitosos: ${successfulCount}`);
        console.log(`   - Fallidos: ${processedCount - successfulCount}`);
        console.log(`   - Tasa de éxito: ${Math.round((successfulCount/processedCount) * 100)}%`);

        if (successfulCount > 0) {
            displayGeocodingResults();
        } else {
            console.warn('⚠️ No se pudo geocodificar ninguna dirección. Posibles causas:');
            console.warn('   - Servidor Nominatim sin datos del Estado de México');
            console.warn('   - Problemas de conectividad con el servidor');
            console.warn('   - Direcciones mal formateadas en la base de datos');
        }
    } catch (error) {
        console.error('❌ Error general procesando geocodificación:', error);
    }
}

function displayGeocodingResults() {
    if (Object.keys(window.geocodeResults).length === 0) {
        console.log('No hay resultados de geocodificación para mostrar');
        return;
    }

    console.log(`Mostrando ${Object.keys(window.geocodeResults).length} resultados de geocodificación`);

    // Crear capa para marcadores de geocodificación si no existe
    if (window.map && typeof window.map !== 'undefined') {
        // Remover marcadores anteriores de geocodificación
        if (window.geocodeMarkersLayer) {
            try {
                window.map.removeLayer(window.geocodeMarkersLayer);
            } catch (e) {
                console.warn('Error removiendo capa anterior:', e);
            }
        }

        window.geocodeMarkersLayer = L.layerGroup();

        let markersAdded = 0;
        const bounds = [];

        Object.entries(window.geocodeResults).forEach(([recordId, geocodeResult]) => {
            if (geocodeResult && geocodeResult.lat && geocodeResult.lon && geocodeResult.personData) {
                try {
                    // Validar coordenadas
                    const lat = parseFloat(geocodeResult.lat);
                    const lon = parseFloat(geocodeResult.lon);
                    const personData = geocodeResult.personData;

                    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                        console.warn(`Coordenadas inválidas para ${recordId}: ${lat}, ${lon}`);
                        return;
                    }

                    // Crear contenido del popup con información personal + geocodificación
                    const popupContent = createPersonGeocodePopup(personData, geocodeResult, lat, lon);

                    const marker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            html: `
                                <div style="
                                    width: 20px;
                                    height: 20px;
                                    background-color: #0074D9;
                                    border: 3px solid white;
                                    border-radius: 50%;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                "></div>
                            `,
                            className: 'simple-geocode-marker',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                            popupAnchor: [0, -10]
                        })
                    })
                    .bindPopup(popupContent)
                    .addTo(window.geocodeMarkersLayer);

                    bounds.push([lat, lon]);
                    markersAdded++;
                    console.log(`✅ Marcador agregado para ${personData.nombre || 'Persona'} en ${geocodeResult.display_name.substring(0, 50)}...`);

                } catch (error) {
                    console.error(`❌ Error creando marcador para ${recordId}:`, error);
                }
            } else {
                console.warn(`⚠️ Datos de geocodificación o personales incompletos para ${recordId}:`, geocodeResult);
            }
        });

        // Agregar capa al mapa solo si tiene marcadores
        if (markersAdded > 0) {
            window.geocodeMarkersLayer.addTo(window.map);
            console.log(`✅ ${markersAdded} marcadores de geocodificación agregados al mapa`);
        }

        // Ajustar vista del mapa para mostrar todos los marcadores si hay varios
        if (bounds.length > 1) {
            try {
                window.map.fitBounds(bounds, {
                    padding: [20, 20],
                    maxZoom: 15
                });
                console.log(`🗺️ Vista ajustada para mostrar ${bounds.length} ubicaciones`);
            } catch (e) {
                console.warn('Error ajustando vista del mapa:', e);
            }
        } else if (bounds.length === 1) {
            // Si solo hay un marcador, centrar en él
            try {
                window.map.setView(bounds[0], 15);
                console.log('🗺️ Mapa centrado en ubicación geocodificada');
            } catch (e) {
                console.warn('Error centrando mapa:', e);
            }
        }

        // Mostrar resumen en consola
        console.log(`📊 Resumen de geocodificación:`);
        console.log(`   - Total de resultados: ${Object.keys(window.geocodeResults).length}`);
        console.log(`   - Marcadores válidos: ${markersAdded}`);
        console.log(`   - Coordenadas mostradas: ${bounds.length}`);

    } else {
        console.warn('Mapa no disponible para mostrar resultados de geocodificación');
    }
}

// Función para limpiar resultados de geocodificación
function clearGeocodingResults() {
    window.geocodeResults = {};

    if (window.geocodeMarkersLayer && window.map) {
        try {
            window.map.removeLayer(window.geocodeMarkersLayer);
            window.geocodeMarkersLayer = null;
            console.log('🗑️ Resultados de geocodificación limpiados');
        } catch (e) {
            console.warn('Error limpiando capa de geocodificación:', e);
        }
    }

    // También limpiar áreas de CP
    clearCPAreaResults();

    // También limpiar direcciones cercanas
    clearNearbyAddressesResults();
}

// Función para crear popup con información personal + geocodificación
function createPersonGeocodePopup(personData, geocodeResult, lat, lon) {
    // Información personal disponible en el registro
    const personInfo = {
        nombre: personData.nombre || personData.pa_nombre || 'No disponible',
        rfc: personData.rfc || personData.pa_rfc || 'No disponible',
        cp: personData.pa_cp || 'No disponible',
        municipio: personData.pa_municipio || 'No disponible',
        colonia: personData.pa_colonia || 'No disponible',
        calle: personData.pa_calle || 'No disponible',
        numero_exterior: personData.pa_numero_exterior || 'No disponible',
        numero_interior: personData.pa_numero_interior || 'No disponible',
        telefono: personData.telefono || personData.pa_telefono || 'No disponible',
        email: personData.email || personData.pa_email || 'No disponible'
    };

    // Crear contenido del popup con información completa
    let popupHtml = `
        <div style="min-width: 320px; max-width: 420px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background: linear-gradient(135deg, #0074D9, #0056b3); color: white; padding: 16px; border-radius: 10px 10px 0 0; margin: -12px -12px 16px -12px;">
                <h4 style="margin: 0; font-size: 18px; font-weight: 600;">👤 Información Personal</h4>
            </div>

            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #0074D9;">
    `;

    // Agregar información personal organizada
    const personalInfo = [];

    if (personInfo.nombre !== 'No disponible') {
        personalInfo.push(`<div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">🏷️</span>
            <div>
                <strong style="color: #2c3e50; font-size: 12px;">NOMBRE</strong><br>
                <span style="color: #34495e; font-size: 14px;">${personInfo.nombre}</span>
            </div>
        </div>`);
    }

    if (personInfo.rfc !== 'No disponible') {
        personalInfo.push(`<div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">🆔</span>
            <div>
                <strong style="color: #2c3e50; font-size: 12px;">RFC</strong><br>
                <span style="color: #34495e; font-size: 14px; font-family: monospace;">${personInfo.rfc}</span>
            </div>
        </div>`);
    }

    if (personInfo.telefono !== 'No disponible') {
        personalInfo.push(`<div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 8px;">📞</span>
            <div>
                <strong style="color: #2c3e50; font-size: 12px;">TELÉFONO</strong><br>
                <span style="color: #34495e; font-size: 14px; font-family: monospace;">${personInfo.telefono}</span>
            </div>
        </div>`);
    }

    popupHtml += personalInfo.join('');

    // Información de ubicación
    popupHtml += `<div style="background: rgba(0,116,217,0.05); padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid #0074D9;">
        <div style="margin-bottom: 8px;">
            <span style="font-size: 14px;">🏛️</span>
            <strong style="color: #2c3e50; font-size: 12px; margin-left: 6px;">UBICACIÓN</strong>
        </div>
        <div style="font-size: 13px; color: #34495e; line-height: 1.4;">
            <div><strong>Municipio:</strong> ${personInfo.municipio}</div>
            <div><strong>Colonia:</strong> ${personInfo.colonia}</div>
            <div><strong>Código Postal:</strong> ${personInfo.cp}</div>
    `;

    if (personInfo.calle !== 'No disponible' || personInfo.numero_exterior !== 'No disponible') {
        const direccion = [personInfo.calle, personInfo.numero_exterior, personInfo.numero_interior].filter(d => d !== 'No disponible').join(' ');
        popupHtml += `<div><strong>Dirección:</strong> ${direccion}</div>`;
    }

    popupHtml += `</div></div>`;

    popupHtml += `
            </div>

            <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 12px; border-radius: 8px; margin: 16px 0;">
                <h5 style="margin: 0 0 8px 0; font-size: 16px;">📍 Información de Geocodificación</h5>
                <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px;">
                    <strong>Dirección encontrada:</strong><br>
                    <span style="font-size: 13px;">${geocodeResult.display_name || 'No disponible'}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; border-left: 3px solid #0074D9;">
                    <strong style="color: #0074D9; font-size: 12px;">LATITUD</strong><br>
                    <span style="font-family: monospace; color: #2c3e50; font-size: 14px;">${lat.toFixed(6)}</span>
                </div>
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center; border-left: 3px solid #0074D9;">
                    <strong style="color: #0074D9; font-size: 12px;">LONGITUD</strong><br>
                    <span style="font-family: monospace; color: #2c3e50; font-size: 14px;">${lon.toFixed(6)}</span>
                </div>
            </div>

            <div style="background: #2c3e50; color: white; padding: 8px 12px; border-radius: 6px; text-align: center; font-size: 11px;">
                🔗 Fuente: Nominatim Local | Sistema de Geocodificación Automática
            </div>
        </div>
    `;

    return popupHtml;
}

// Función para geocodificar direcciones cercanas a una búsqueda
async function geocodeNearbyAddresses(searchAddress, radiusKm = 5) {
    console.log(`🔍 Buscando direcciones cercanas a: ${searchAddress}`);

    try {
        // 1. Geocodificar la dirección de búsqueda
        const searchLocation = await geocodeAddress(searchAddress);
        if (!searchLocation) {
            console.error('❌ No se pudo geocodificar la dirección de búsqueda');
            return [];
        }

        console.log(`📍 Ubicación de búsqueda geocodificada:`, searchLocation);

        // 2. Buscar registros en la base de datos
        const response = await fetch('/api/buscar_padron');
        const allRecords = await response.json();

        if (!allRecords || allRecords.length === 0) {
            console.log('ℹ️ No se encontraron registros en la base de datos');
            return [];
        }

        console.log(`📊 Encontrados ${allRecords.length} registros en base de datos`);

        // 3. Filtrar registros con direcciones válidas
        const recordsWithAddresses = allRecords.filter(record =>
            record.pa_colonia || record.pa_calle || record.pa_municipio
        );

        console.log(`🏠 ${recordsWithAddresses.length} registros con direcciones válidas`);

        // 4. Geocodificar direcciones individuales
        const geocodingPromises = recordsWithAddresses.map(async (record) => {
            const fullAddress = [
                record.pa_colonia,
                record.pa_calle,
                record.pa_numero_exterior,
                record.pa_municipio,
                'Estado de México'
            ].filter(field => field && field.trim()).join(', ');

            const geocodedLocation = await geocodeAddress(fullAddress);
            if (geocodedLocation) {
                // Calcular distancia desde la ubicación de búsqueda
                const distance = calculateDistance(
                    searchLocation.lat, searchLocation.lon,
                    geocodedLocation.lat, geocodedLocation.lon
                );

                if (distance <= radiusKm) {
                    return {
                        record,
                        geocodedLocation,
                        distance: Math.round(distance * 100) / 100 // Redondear a 2 decimales
                    };
                }
            }
            return null;
        });

        // 5. Esperar resultados y filtrar válidos
        const results = await Promise.allSettled(geocodingPromises);
        const validResults = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value)
            .sort((a, b) => a.distance - b.distance); // Ordenar por distancia

        console.log(`✅ Encontradas ${validResults.length} direcciones dentro de ${radiusKm}km`);

        if (validResults.length > 0) {
            displayNearbyAddressesResults(validResults, searchLocation);
        }

        return validResults;

    } catch (error) {
        console.error('❌ Error en búsqueda de direcciones cercanas:', error);
        return [];
    }
}

// Hacer función disponible globalmente
window.geocodeNearbyAddresses = geocodeNearbyAddresses;

// Función para calcular distancia entre dos puntos (Fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
}

// Función para mostrar resultados de direcciones cercanas
function displayNearbyAddressesResults(nearbyResults, searchLocation) {
    if (!nearbyResults || nearbyResults.length === 0) return;

    console.log(`🗺️ Mostrando ${nearbyResults.length} direcciones cercanas encontradas`);

    if (window.map && typeof window.map !== 'undefined') {
        // Crear capa específica para direcciones cercanas
        if (window.nearbyAddressesLayer) {
            try {
                window.map.removeLayer(window.nearbyAddressesLayer);
            } catch (e) {
                console.warn('Error removiendo capa anterior de direcciones cercanas:', e);
            }
        }

        window.nearbyAddressesLayer = L.layerGroup();
        let addressesAdded = 0;

        // Agregar marcador para la ubicación de búsqueda
        const searchMarker = L.marker([searchLocation.lat, searchLocation.lon], {
            icon: L.divIcon({
                html: `
                    <div style="
                        width: 24px;
                        height: 24px;
                        background-color: #FF6B35;
                        border: 4px solid white;
                        border-radius: 50%;
                        box-shadow: 0 3px 12px rgba(0,0,0,0.4);
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 8px;
                            height: 8px;
                            background-color: white;
                            border-radius: 50%;
                        "></div>
                    </div>
                `,
                className: 'simple-search-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            })
        })
        .bindPopup(`
            <div style="min-width: 280px; max-width: 350px;">
                <div style="background: linear-gradient(135deg, #FF6B35, #f0932b); color: white; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 16px;">🔍 Punto de Búsqueda</h4>
                </div>
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                    <strong style="color: #2c3e50;">📍 Dirección:</strong><br>
                    <span style="color: #34495e;">${searchLocation.display_name}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div style="background: #eaf6fb; padding: 8px; border-radius: 4px; text-align: center;">
                        <strong style="color: #0074D9; font-size: 12px;">LATITUD</strong><br>
                        <span style="font-family: monospace; color: #2c3e50;">${searchLocation.lat}</span>
                    </div>
                    <div style="background: #eaf6fb; padding: 8px; border-radius: 4px; text-align: center;">
                        <strong style="color: #0074D9; font-size: 12px;">LONGITUD</strong><br>
                        <span style="font-family: monospace; color: #2c3e50;">${searchLocation.lon}</span>
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #7f8c8d; font-style: italic; text-align: center;">
                    Punto de referencia para búsqueda de direcciones cercanas
                </div>
            </div>
        `)
        .addTo(window.nearbyAddressesLayer);

        // Agregar marcadores para direcciones cercanas encontradas
        nearbyResults.forEach((result, index) => {
            const { record, geocodedLocation, distance } = result;

            try {
                const popupContent = createPersonGeocodePopup(record, geocodedLocation, geocodedLocation.lat, geocodedLocation.lon);

                // Agregar distancia al popup
                const distanceHtml = `<div style="border-top: 1px solid #ddd; margin: 10px 0; padding-top: 10px;">
                    <strong>📏 Distancia:</strong> ${distance} km desde ubicación de búsqueda<br>
                    <small style="color: #666;">Ubicación encontrada automáticamente</small>
                </div>`;

                const marker = L.marker([geocodedLocation.lat, geocodedLocation.lon], {
                    icon: L.divIcon({
                        html: `
                            <div style="
                                width: 18px;
                                height: 18px;
                                background-color: #28a745;
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                            "></div>
                        `,
                        className: 'simple-nearby-marker',
                        iconSize: [18, 18],
                        iconAnchor: [9, 9],
                        popupAnchor: [0, -9]
                    })
                })
                .bindPopup(popupContent + distanceHtml)
                .addTo(window.nearbyAddressesLayer);

                addressesAdded++;
                console.log(`✅ Dirección cercana agregada #${index + 1}: ${distance}km`);

            } catch (error) {
                console.error(`❌ Error creando marcador para dirección cercana:`, error);
            }
        });

        // Agregar capa al mapa
        if (addressesAdded > 0) {
            window.nearbyAddressesLayer.addTo(window.map);
            console.log(`✅ ${addressesAdded} direcciones cercanas agregadas al mapa`);

            // Ajustar vista para mostrar todas las ubicaciones
            if (addressesAdded > 1) {
                const bounds = [
                    [searchLocation.lat, searchLocation.lon],
                    ...nearbyResults.map(r => [r.geocodedLocation.lat, r.geocodedLocation.lon])
                ];

                try {
                    window.map.fitBounds(bounds, { padding: [30, 30] });
                    console.log('🗺️ Vista ajustada para mostrar ubicación de búsqueda y direcciones cercanas');
                } catch (e) {
                    console.warn('Error ajustando vista del mapa:', e);
                }
            }
        }
    }
}

// Función para limpiar resultados de direcciones cercanas
function clearNearbyAddressesResults() {
    if (window.nearbyAddressesLayer && window.map) {
        try {
            window.map.removeLayer(window.nearbyAddressesLayer);
            window.nearbyAddressesLayer = null;
            console.log('🗑️ Direcciones cercanas limpiadas');
        } catch (e) {
            console.warn('Error limpiando capa de direcciones cercanas:', e);
        }
    }
}

// Función para mostrar estadísticas de direcciones cercanas
function showNearbyAddressesStats(nearbyResults) {
    if (!nearbyResults || nearbyResults.length === 0) {
        console.log('ℹ️ No hay estadísticas de direcciones cercanas disponibles');
        return;
    }

    const total = nearbyResults.length;
    const avgDistance = nearbyResults.reduce((sum, r) => sum + r.distance, 0) / total;
    const maxDistance = Math.max(...nearbyResults.map(r => r.distance));
    const minDistance = Math.min(...nearbyResults.map(r => r.distance));

    console.log(`📊 Estadísticas de Direcciones Cercanas:`);
    console.log(`   - Direcciones encontradas: ${total}`);
    console.log(`   - Distancia promedio: ${Math.round(avgDistance * 100) / 100} km`);
    console.log(`   - Distancia mínima: ${Math.round(minDistance * 100) / 100} km`);
    console.log(`   - Distancia máxima: ${Math.round(maxDistance * 100) / 100} km`);

    console.log('🏠 Direcciones más cercanas:');
    nearbyResults.slice(0, 5).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.distance}km - ${result.record.pa_municipio || 'Sin municipio'}`);
    });
}

// Función para mostrar estadísticas de geocodificación
function showGeocodingStats() {
    const total = Object.keys(window.geocodeResults).length;
    const successful = Object.values(window.geocodeResults).filter(r => r && r.lat && r.lon).length;

    console.log(`📊 Estadísticas de Geocodificación:`);
    console.log(`   - Total procesados: ${total}`);
    console.log(`   - Exitosos: ${successful}`);
    console.log(`   - Tasa de éxito: ${total > 0 ? Math.round((successful/total) * 100) : 0}%`);

    if (total > 0 && successful < total) {
        console.warn(`⚠️ ${total - successful} direcciones no pudieron ser geocodificadas`);

        // Análisis de direcciones fallidas
        console.log('🔍 Análisis de direcciones problemáticas:');
        Object.entries(window.geocodeResults).forEach(([recordId, result]) => {
            if (!result || !result.lat || !result.lon) {
                // Encontrar el registro original para mostrar detalles
                console.log(`   - Registro ${recordId}: Sin coordenadas válidas`);
            }
        });
    }

    if (successful > 0) {
        console.log('✅ Ubicaciones geocodificadas exitosamente:');
        Object.entries(window.geocodeResults).forEach(([recordId, result]) => {
            if (result && result.lat && result.lon && result.personData) {
                const personName = result.personData.nombre || result.personData.pa_nombre || 'Sin nombre';
                console.log(`   - ${personName}: ${result.display_name.substring(0, 50)}...`);
            }
        });
    }

    // Mostrar también estadísticas de áreas de CP
    if (Object.keys(window.cpGeocodeResults).length > 0) {
        console.log('');
        showCPAreaStats();
    }
}

// Función de diagnóstico para verificar errores
function diagnosticarErrores() {
    console.log('🔍 Diagnóstico de aplicación:');
    console.log('- Elementos DOM principales:', {
        mapa: !!document.getElementById('map'),
        resultados: !!document.getElementById('resultados'),
        filtros: !!document.getElementById('filtros'),
        chipsContainer: !!document.getElementById('chipsContainer')
    });

    console.log('- Funciones globales:', {
        mostrarResultados: typeof window.mostrarResultados,
        mostrarPoligonos: typeof window.mostrarPoligonos,
        renderTabla: typeof window.renderTabla,
        cambiarPagina: typeof window.cambiarPagina,
        mostrarMapaConDatos: typeof window.mostrarMapaConDatos,
        limpiarMapa: typeof window.limpiarMapa
    });

    console.log('- Variables globales:', {
        datosGlobales: window.datosGlobales,
        paginaActual: window.paginaActual,
        currentSelections: currentSelections
    });
}

// Función de prueba para verificar conexión con servidor Nominatim
function testNominatimConnection() {
    console.log('🔍 Probando conexión con servidor Nominatim local...');
    console.log('📡 Servidores a probar:');
    console.log('   1. http://10.65.117.238:8080/ (principal)');
    console.log('   2. http://10.65.117.238/ (alternativo)');
    console.log('   3. http://localhost:8080/ (fallback)');

    fetch('/api/geocode?address=Palacio Municipal, Toluca, Estado de México&limit=1')
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error('❌ Error conectando con Nominatim:', data.error);
                if (data.details) {
                    console.error('🔍 Detalles técnicos:', data.details);
                }
                console.log('💡 Diagnóstico sugerido:');
                console.log('   🔧 Verifica que el servidor Nominatim esté corriendo');
                console.log('   🌐 Prueba conexión manual: curl "http://10.65.117.238:8080/search?q=test&format=json"');
                console.log('   ⚙️ Revisa configuración de red y firewall');
                console.log('   📊 Consulta logs del servidor Nominatim');

                // Sugerir pruebas alternativas
                console.log('🔄 Probando servidores individuales...');
                testIndividualServers();
            } else {
                console.log('✅ Conexión con Nominatim exitosa');
                console.log('📍 Ejemplo de resultado:', data.results[0]);
                console.log('🎯 La geocodificación debería funcionar correctamente');
            }
        })
        .catch(err => {
            console.error('❌ Error de conexión general:', err);
            console.log('🔧 Posibles causas:');
            console.log('   - Servidor Flask no puede acceder a la red');
            console.log('   - Problemas de DNS o routing');
            console.log('   - Firewall bloqueando conexiones');
        });
}

// Función para probar servidores individuales (desde el servidor, no navegador)
function testIndividualServers() {
    console.log('🔍 Probando servidores individuales desde el NAVEGADOR...');
    console.log('⚠️ Nota: Estas pruebas pueden fallar por CORS desde el navegador');

    const servers = [
        {url: 'http://10.65.117.238:8080/search?q=test&format=json', name: 'Puerto 8080'},
        {url: 'http://10.65.117.238/search?q=test&format=json', name: 'Puerto default'},
    ];

    servers.forEach((server, index) => {
        setTimeout(() => {
            // Intentar con modo no-CORS para diagnóstico
            fetch(server.url, { mode: 'no-cors' })
                .then(res => {
                    console.log(`✅ ${server.name}: Servidor accesible (CORS bypassed)`);
                })
                .catch(err => {
                    if (err.message.includes('CORS')) {
                        console.log(`⚠️ ${server.name}: Bloqueado por CORS (normal desde navegador)`);
                    } else {
                        console.log(`❌ ${server.name}: Error real - ${err.message}`);
                    }
                });
        }, index * 1000);
    });

    console.log('💡 Para pruebas reales, usa curl desde terminal:');
    console.log('   curl "http://10.65.117.238:8080/search?q=test&format=json"');
}

// Función para mostrar información de geocodificación en la interfaz
function showGeocodingInfo() {
    const totalRecords = Object.keys(window.geocodeResults).length;
    const successfulRecords = Object.values(window.geocodeResults).filter(r => r && r.lat && r.lon).length;

    if (totalRecords === 0) {
        console.log('ℹ️ No hay información de geocodificación disponible');
        return;
    }

    console.log(`📊 Información de Geocodificación:`);
    console.log(`   - Registros procesados: ${totalRecords}`);
    console.log(`   - Ubicaciones encontradas: ${successfulRecords}`);
    console.log(`   - Tasa de éxito: ${Math.round((successfulRecords/totalRecords) * 100)}%`);

    if (successfulRecords > 0) {
        console.log('🗺️ Ubicaciones encontradas:');
        Object.entries(window.geocodeResults).forEach(([recordId, result]) => {
            if (result && result.lat && result.lon) {
                console.log(`   - Registro ${recordId}: ${result.display_name.substring(0, 50)}...`);
            }
        });
    }
}

// JS para cargar filtros y manejar búsqueda
document.addEventListener('DOMContentLoaded', function() {
    // Ejecutar diagnóstico después de cargar
    setTimeout(diagnosticarErrores, 2000);

    // Probar conexión con servidor Nominatim y diagnóstico
    setTimeout(() => {
        testNominatimConnection();
        console.log('💡 Funciones de diagnóstico disponibles:');
        console.log('   - diagnosticarNominatimCompleto()');
        console.log('   - diagnosticarCORSvsServidor()');
        console.log('   - mostrarEjemplosEdomex()');
        console.log('   - showGeocodingStats()');
        console.log('   - geocodeNearbyAddresses()');
        console.log('   - showCPGeocodingStats()');
        console.log('   - geocodeNearbyAddresses()');
        console.log('   - showNearbyAddressesStats()');
    }, 3000);

    // Cargar opciones para filtros básicos
    cargarOpcionesTipo();
    cargarOpcionesEjercicio();
    cargarOpcionesPeriodo();

    // Cargar opciones para filtros geográficos
    cargarOpciones('cp', '/api/codigos_postales');
    cargarOpciones('municipio', '/api/municipios');
    // Ya no se carga colonia

    // Función para manejar doble click en opciones de selectores
    function handleSelectDoubleClick(selectId) {
        const select = document.getElementById(selectId);

        // Agregar evento de doble click a cada opción
        select.addEventListener('dblclick', function(e) {
            if (e.target.tagName === 'OPTION' && e.target.value) {
                const option = e.target;
                const value = option.value;
                const text = option.textContent;

                // Determinar el tipo (espacial o datos)
                const type = (selectId === 'municipio' || selectId === 'cp') ? 'spatial' : 'data';

                if (currentSelections[selectId].has(value)) {
                    // Si ya está seleccionado, quitarlo
                    removeChip(selectId, value);
                } else {
                    // Si no está seleccionado, agregarlo
                    addChip(selectId, value, text, type);
                }

                // Trigger manual del evento change para actualizar visuales
                const event = new Event('change', { bubbles: true });
                select.dispatchEvent(event);
            }
        });
    }

    // Función para crear dropdowns personalizados
    function createCustomDropdown(filterId) {
        const dropdownButton = document.querySelector(`[data-filter="${filterId}"]`);
        const dropdownMenu = document.getElementById(`${filterId}-dropdown`);
        const dropdownOptions = document.getElementById(`${filterId}-options`);
        const dropdownText = dropdownButton?.querySelector('.dropdown-text');
        const dropdownContainer = dropdownButton?.parentElement;
    
        // Verificar que todos los elementos existen
        if (!dropdownButton || !dropdownMenu || !dropdownOptions || !dropdownText) {
            console.error(`No se pudieron encontrar todos los elementos para el dropdown ${filterId}`);
            return null;
        }
    
        let isOpen = false;
    
        // Función para actualizar el texto del botón
        function updateButtonText() {
            if (!dropdownText) return;

            const selectedCount = currentSelections[filterId] ? currentSelections[filterId].size : 0;
            if (selectedCount === 0) {
                dropdownText.textContent = getOriginalText(filterId);
            } else {
                dropdownText.textContent = `${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`;
            }
        }
    
        // Función para obtener el texto original del filtro
        function getOriginalText(filterId) {
            const texts = {
                municipio: '🏛️ Municipio',
                cp: '📮 Código Postal',
                idperiodo: '📅 Período',
                idejercicio: '📆 Año',
                tipo: '🏷️ Tipo'
            };
            return texts[filterId] || filterId;
        }
    
        // Función para crear opción de dropdown
        function createDropdownOption(value, text) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-option';
            optionDiv.innerHTML = `
                <input type="checkbox" value="${value}" id="opt-${filterId}-${value}">
                <label for="opt-${filterId}-${value}">${text}</label>
            `;
    
            const checkbox = optionDiv.querySelector('input');
            const label = optionDiv.querySelector('label');
    
            // Verificar si ya está seleccionado
            if (currentSelections[filterId].has(value)) {
                checkbox.checked = true;
                optionDiv.classList.add('selected');
            }
    
            // Evento de cambio
            checkbox.addEventListener('change', function() {
                const type = (filterId === 'municipio' || filterId === 'cp') ? 'spatial' : 'data';

                if (this.checked) {
                    addChip(filterId, value, text, type);
                } else {
                    const chipElement = document.querySelector(`[data-chip="${filterId}-${value}"]`);
                    if (chipElement) {
                        removeChip(filterId, value, chipElement);
                    } else {
                        // Si no encuentra el chip visual, solo remover de la selección
                        if (currentSelections[filterId]) {
                            currentSelections[filterId].delete(value);
                        }
                    }
                }
            });
    
            return optionDiv;
        }
    
        // Cargar opciones según el filtro
        function loadDropdownOptions() {
            if (filterId === 'municipio') {
                fetch('/api/municipios')
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(municipio => {
                            dropdownOptions.appendChild(createDropdownOption(municipio, municipio));
                        });
                    });
            } else if (filterId === 'cp') {
                fetch('/api/codigos_postales')
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(cp => {
                            dropdownOptions.appendChild(createDropdownOption(cp, cp));
                        });
                    });
            } else if (filterId === 'tipo') {
                fetch('/api/tipos')
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(tipo => {
                            dropdownOptions.appendChild(createDropdownOption(tipo, tipo));
                        });
                    });
            } else if (filterId === 'idejercicio') {
                fetch('/api/ejercicios')
                    .then(res => res.json())
                    .then(data => {
                        data.forEach(ejercicio => {
                            // CORRECCIÓN: El backend ahora devuelve valores truncados (22, 23)
                            // Pero debemos mostrar el año completo (2022, 2023)
                            const displayText = `20${ejercicio}`;
                            const valueToSend = ejercicio; // Ya está truncado
                            dropdownOptions.appendChild(createDropdownOption(valueToSend, displayText));
                        });
                    });
            } else if (filterId === 'idperiodo') {
                fetch('/api/periodos')
                    .then(res => res.json())
                    .then(data => {
                        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                        data.sort((a, b) => parseInt(a) - parseInt(b));
                        data.forEach(periodo => {
                            const mesNombre = meses[parseInt(periodo) - 1] || periodo;
                            dropdownOptions.appendChild(createDropdownOption(periodo, mesNombre));
                        });
                    });
            }
        }
    
        // Eventos del dropdown
        dropdownButton.addEventListener('click', function(e) {
            e.stopPropagation();
    
            // Cerrar otros dropdowns abiertos
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.classList.remove('show');
                    const otherButton = menu.previousElementSibling;
                    if (otherButton) {
                        otherButton.classList.remove('active');
                    }
                }
            });
    
            // Toggle del dropdown actual
            isOpen = !isOpen;
            dropdownMenu.classList.toggle('show');
            dropdownButton.classList.toggle('active');
    
            // Cargar opciones si es la primera vez que se abre
            if (isOpen && dropdownOptions.children.length === 0) {
                loadDropdownOptions();
            }
        });
    
        // Cerrar dropdown cuando se hace click fuera
        document.addEventListener('click', function(e) {
            if (dropdownContainer && !dropdownContainer.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                dropdownButton.classList.remove('active');
                isOpen = false;
            }
        });
    
        // Búsqueda en dropdowns con campo de búsqueda
        const searchInput = dropdownMenu.querySelector('.dropdown-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const options = dropdownOptions.querySelectorAll('.dropdown-option');
    
                options.forEach(option => {
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(searchTerm) ? 'block' : 'none';
                });
            });
        }
    
        return {
            updateButtonText,
            createDropdownOption
        };
    }
    
    // Función para mejorar la interacción con selectores múltiples
    function enhanceMultiSelect(selector) {
        // Agregar evento de doble click
        handleSelectDoubleClick(selector.id);
    
        // Agregar tooltips informativos
        selector.title = `Doble click para seleccionar/deseleccionar rápidamente • Ctrl+Click para selección múltiple`;
    
        // Efecto visual al hacer hover en opciones
        selector.addEventListener('focus', function() {
            this.style.borderColor = '#0074D9';
            this.style.boxShadow = '0 0 0 3px rgba(0, 116, 217, 0.1)';
        });
    
        selector.addEventListener('blur', function() {
            this.style.borderColor = '#e1e8ed';
            this.style.boxShadow = 'none';
        });
    }

    // Inicializar dropdowns personalizados ultra compactos
    setTimeout(() => {
        createCustomDropdown('municipio');
        createCustomDropdown('cp');
        createCustomDropdown('tipo');
        createCustomDropdown('idejercicio');
        createCustomDropdown('idperiodo');

        // Ocultar los selectores originales ya que usamos dropdowns personalizados
        ['municipio', 'cp', 'tipo', 'idejercicio', 'idperiodo'].forEach(filterId => {
            const originalSelect = document.getElementById(filterId);
            if (originalSelect) {
                originalSelect.style.display = 'none';
            }
        });
    }, 1000); // Delay para asegurar que los elementos estén cargados

    document.getElementById('filtros').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validarFiltros()) {
            window.showLoading();

            // Usar las selecciones actuales de los chips
            const municipios = Array.from(currentSelections.municipio);
            const cps = Array.from(currentSelections.cp);
            const tipos = Array.from(currentSelections.tipo);
            const ejercicios = Array.from(currentSelections.idejercicio);
            const periodos = Array.from(currentSelections.idperiodo);
            const q = document.getElementById('busqueda').value.trim();

            // Para mantener compatibilidad con el mapa, usar el primer valor seleccionado si hay múltiples
            const municipio = municipios.length > 0 ? municipios[0] : '';
            const cp = cps.length > 0 ? cps[0] : '';
            if (municipios.length === 0 && cps.length === 0) {
                if (q) {
                    // Búsqueda por RFC/nombre: mostrar resultados específicos, no heatmap
                    buscarPadron();
                    document.getElementById('resultados').style.display = 'block';
                } else {
                    // Heatmap general filtrado con múltiples criterios
                    const params = new URLSearchParams();
                    tipos.forEach(tipo => params.append('tipo', tipo));
                    ejercicios.forEach(ejercicio => params.append('idejercicio', ejercicio));
                    periodos.forEach(periodo => params.append('idperiodo', periodo));
                    fetch('/api/payments_by_municipio_filtered?' + params.toString())
                        .then(res => res.json())
                        .then(data => {
                            paymentsByMunicipio = {};
                            data.forEach(item => {
                                paymentsByMunicipio[item.municipio] = item.total;
                            });
                            window.mostrarMapaConDatos(data);
                            window.hideLoading();
                        })
                        .catch(err => {
                            console.error('Error loading payments:', err);
                            window.hideLoading();
                        });
                    // También mostrar el listado filtrado
                    buscarPadron();
                    document.getElementById('resultados').style.display = 'block';
                }
            } else {
                buscarPadron();
                document.getElementById('resultados').style.display = 'block';
            }
        }
    });
});

function validarFiltros() {
    // Verificar usando las selecciones actuales de chips
    const hasSelections = Object.values(currentSelections).some(set => set.size > 0);
    const q = document.getElementById('busqueda').value.trim();

    if (!q && !hasSelections) {
        alert('Debe aplicar al menos un filtro para la búsqueda.');
        return false;
    }
    return true;
}

function cargarOpciones(id, url) {
    fetch(url)
        .then(res => res.json())
        .then(opciones => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">-- ' + id.charAt(0).toUpperCase() + id.slice(1) + ' --</option>';
                opciones.forEach(op => {
                    select.innerHTML += `<option value="${op}">${op}</option>`;
                });
            }
        })
        .catch(err => console.error(`Error loading ${id}:`, err));
}

function buscarPadron() {
    const q = document.getElementById('busqueda').value;

    // Usar las selecciones actuales de los chips
    const periodos = Array.from(currentSelections.idperiodo);
    const cps = Array.from(currentSelections.cp);
    const municipios = Array.from(currentSelections.municipio);
    const tipos = Array.from(currentSelections.tipo);
    const ejercicios = Array.from(currentSelections.idejercicio);

    const params = new URLSearchParams();
    if(q) params.append('q', q);

    // Agregar múltiples valores para cada filtro
    periodos.forEach(periodo => params.append('idperiodo', periodo));
    cps.forEach(cp => params.append('cp', cp));
    municipios.forEach(municipio => params.append('municipio', municipio));
    tipos.forEach(tipo => params.append('tipo', tipo));
    ejercicios.forEach(ejercicio => params.append('idejercicio', ejercicio));

    fetch('/api/buscar_padron?' + params.toString())
        .then(res => res.json())
        .then(data => {
            if (q && data.length === 0) {
                window.hideLoading();
                alert('No se encontró información del RFC proporcionado');
                return;
            }

            window.mostrarResultados(data);

            // Mostrar tabla de resultados
            document.getElementById('resultados').style.display = 'block';

            // Vincular con geojson y mostrar polígonos
            let mostrarPol = false;
            let filtrosPol = {};

            // Usar múltiples municipios y códigos postales
            if (municipios.length > 0) {
                filtrosPol.municipios = municipios;
                mostrarPol = true;
            }
            if (cps.length > 0) {
                filtrosPol.cps = cps;
                mostrarPol = true;
            }

            // Si no hay filtros geográficos pero hay búsqueda por RFC, mostrar el CP del primer resultado
            if (!mostrarPol && q && data.length > 0 && data[0].pa_cp) {
                filtrosPol.cp = data[0].pa_cp;
                mostrarPol = true;
            }

            if (mostrarPol) {
                window.mostrarPoligonos(filtrosPol);
            }

            // 🚀 NUEVA FUNCIONALIDAD: GEOCODIFICACIÓN AUTOMÁTICA
            // Si hay búsqueda por nombre/RFC y tenemos resultados con direcciones, geocodificar automáticamente
            if (q && data.length > 0 && (data[0].pa_colonia || data[0].pa_calle || data[0].pa_municipio)) {
                console.log('🔍 Iniciando geocodificación automática para búsqueda por nombre/RFC...');
                console.log(`📊 Procesando ${data.length} registros para geocodificación`);

                // Agregar IDs únicos a los registros para rastreo
                const recordsWithId = data.map((record, index) => ({
                    ...record,
                    id: `record_${index}_${Date.now()}`
                }));

                // Procesar geocodificación en segundo plano
                processGeocodingForRecords(recordsWithId);

                // Mostrar indicador de geocodificación en proceso
                showGeocodingIndicator();
            } else if (q) {
                console.log('ℹ️ Búsqueda por nombre/RFC realizada pero sin direcciones válidas para geocodificar');
            }

            // 🆕 NUEVA FUNCIONALIDAD: GEOCODIFICACIÓN INDIVIDUAL POR UBICACIÓN
            // Si tenemos filtros de código postal, geocodificar CADA dirección individualmente
            if (cps.length > 0 && data.length > 0) {
                console.log('🏘️ Detectados filtros de código postal, iniciando geocodificación INDIVIDUAL de direcciones...');
                console.log(`📍 Procesando ${data.length} direcciones individuales en códigos postales: ${cps.join(', ')}`);

                // Filtrar solo los registros que tienen direcciones válidas para geocodificar
                const recordsWithAddresses = data.filter(record =>
                    record.pa_colonia || record.pa_calle || record.pa_municipio
                );

                if (recordsWithAddresses.length > 0) {
                    console.log(`🔍 ${recordsWithAddresses.length} registros con direcciones válidas para geocodificar`);

                    // Agregar IDs únicos a los registros para rastreo
                    const recordsWithId = recordsWithAddresses.map((record, index) => ({
                        ...record,
                        id: `cp_record_${record.pa_cp}_${index}_${Date.now()}`
                    }));

                    // Procesar geocodificación individual para cada dirección
                    processGeocodingForRecords(recordsWithId);

                    // También mostrar indicador para el área general del CP
                    showGeocodingIndicator();
                } else {
                    console.log('ℹ️ No hay direcciones válidas para geocodificar en los registros encontrados');
                }
            }


            window.hideLoading();
        })
        .catch(err => {
            console.error('Error in buscarPadron:', err);
            window.hideLoading();
        });
}

// Función para mostrar indicador de geocodificación en proceso
function showGeocodingIndicator() {
    // Crear o actualizar indicador visual
    let indicator = document.getElementById('geocoding-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'geocoding-indicator';
        indicator.className = 'geocoding-indicator';
        indicator.innerHTML = `
            <div class="geocoding-spinner"></div>
            <span>🔍 Geocodificando direcciones...</span>
        `;
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #0074D9 0%, #0056b3 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 6px 24px rgba(0, 116, 217, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
        `;

        // Spinner animation
        const spinner = indicator.querySelector('.geocoding-spinner');
        if (spinner) {
            spinner.style.cssText = `
                width: 18px;
                height: 18px;
                border: 2px solid #ffffff33;
                border-top: 2px solid #ffffff;
                border-right: 2px solid #ffffff66;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
        }

        // Add spinner animation keyframes if not exists
        if (!document.querySelector('#geocoding-keyframes')) {
            const style = document.createElement('style');
            style.id = 'geocoding-keyframes';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(indicator);

        // Auto-remover después de 10 segundos máximo
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        }, 10000);
    }
}

window.paginaActual = 1;
window.datosGlobales = [];
const resultadosPorPagina = 200;

window.mostrarResultados = function(data) {
    window.datosGlobales = data;
    window.paginaActual = 1;
    renderTabla();
};

window.renderTabla = function() {
    const cont = document.getElementById('resultados');
    if (!cont) return;

    if (!window.datosGlobales || window.datosGlobales.length === 0) {
        cont.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    const inicio = (window.paginaActual - 1) * resultadosPorPagina;
    const fin = Math.min(inicio + resultadosPorPagina, window.datosGlobales.length);
    let html = '<table>';
    html += '<tr>' + Object.keys(window.datosGlobales[0]).map(k => `<th>${k}</th>`).join('') + '</tr>';
    for(let i = inicio; i < fin; i++) {
        const row = window.datosGlobales[i];
        html += '<tr>' + Object.values(row).map(v => `<td>${v}</td>`).join('') + '</tr>';
    }
    html += renderPaginacion();
    cont.innerHTML = html;
};

window.renderPaginacion = function() {
    const totalPaginas = Math.ceil(window.datosGlobales.length / resultadosPorPagina);
    if(totalPaginas <= 1) return '';
    let html = '<div class="paginacion">';
    html += `<button onclick="window.cambiarPagina(${window.paginaActual-1})" ${window.paginaActual===1?'disabled':''}>Anterior</button>`;
    html += `<span>Página ${window.paginaActual} de ${totalPaginas}</span>`;
    html += `<button onclick="window.cambiarPagina(${window.paginaActual+1})" ${window.paginaActual===totalPaginas?'disabled':''}>Siguiente</button>`;
    html += '</div>';
    return html;
};

window.cambiarPagina = function(nuevaPag) {
    const totalPaginas = Math.ceil(window.datosGlobales.length / resultadosPorPagina);
    if(nuevaPag < 1 || nuevaPag > totalPaginas) return;
    window.paginaActual = nuevaPag;
    window.renderTabla();
};

// Función avanzada de diagnóstico de Nominatim
function diagnosticarNominatimCompleto() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE NOMINATIM ===');

    // 1. Verificar configuración de servidores
    console.log('📋 1. Configuración de servidores:');
    console.log('   - Servidor principal: http://10.65.117.238:8080/');
    console.log('   - Servidor alternativo: http://10.65.117.238/');
    console.log('   - Timeout: 15 segundos');

    // 2. Probar conectividad básica
    console.log('🌐 2. Probando conectividad básica...');
    const servers = [
        'http://10.65.117.238:8080/search?q=test&format=json',
        'http://10.65.117.238/search?q=test&format=json',
        'http://localhost:8080/search?q=test&format=json'
    ];

    let completedTests = 0;
    servers.forEach((url, index) => {
        fetch(url)
            .then(res => {
                completedTests++;
                if (res.ok) {
                    console.log(`   ✅ Servidor ${index + 1}: HTTP ${res.status} - OK`);
                } else {
                    console.log(`   ❌ Servidor ${index + 1}: HTTP ${res.status} - Error`);
                }

                if (completedTests === servers.length) {
                    console.log('🔧 3. Recomendaciones:');
                    console.log('   - Si todos los servidores fallan, verifica que Nominatim esté corriendo');
                    console.log('   - Comando típico: nominatim serve --port 8080');
                    console.log('   - Verifica permisos de red y firewall');
                    console.log('   - Consulta logs del servidor Nominatim');
                }
            })
            .catch(err => {
                completedTests++;
                console.log(`   ❌ Servidor ${index + 1}: ${err.message}`);

                if (completedTests === servers.length) {
                    console.log('🚨 3. Problemas detectados:');
                    console.log('   - No se puede conectar con ningún servidor');
                    console.log('   - Verifica que el servidor esté iniciado');
                    console.log('   - Revisa configuración de red');
                }
            });
    });

    // 3. Probar desde la aplicación
    console.log('🔗 4. Probando integración con aplicación...');
    fetch('/api/geocode?address=test&limit=1')
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.log('   ❌ API Error:', data.error);
            } else {
                console.log('   ✅ API funcionando correctamente');
            }
        })
        .catch(err => {
            console.log('   ❌ Error de API:', err.message);
        });

    console.log('⏱️ 5. El diagnóstico puede tardar unos segundos...');
    console.log('=======================================');
}

// Función para mostrar ejemplos de ubicaciones del Estado de México
function mostrarEjemplosEdomex() {
    console.log('🏛️ === EJEMPLOS DE UBICACIONES DEL ESTADO DE MÉXICO ===');
    console.log('');
    console.log('📍 UBICACIONES PRINCIPALES:');
    console.log('   • Toluca (Capital del Estado de México)');
    console.log('   • Ecatepec de Morelos');
    console.log('   • Nezahualcóyotl');
    console.log('   • Naucalpan de Juárez');
    console.log('   • Tlalnepantla de Baz');
    console.log('   • Chimalhuacán');
    console.log('   • Tultitlán');
    console.log('   • Cuautitlán Izcalli');
    console.log('   • Atizapán de Zaragoza');
    console.log('   • Ixtapaluca');
    console.log('');
    console.log('💡 EJEMPLOS PARA PROBAR:');
    console.log('   • "Palacio Municipal, Toluca"');
    console.log('   • "Centro, Ecatepec"');
    console.log('   • "Plaza principal, Nezahualcóyotl"');
    console.log('   • "Ayuntamiento, Naucalpan"');
    console.log('   • "Jardín principal, Tlalnepantla"');
    console.log('');
    console.log('🔧 COMANDOS DE PRUEBA:');
    console.log('   curl "http://10.65.117.238:8080/search?q=Toluca&format=json&countrycodes=mx"');
    console.log('   curl "http://10.65.117.238:8080/search?q=Ecatepec&format=json&countrycodes=mx"');
    console.log('   curl "http://10.65.117.238:8080/search?q=Nezahualcóyotl&format=json&countrycodes=mx"');
    console.log('');
    console.log('🏠 DIRECCIONES ESPECÍFICAS DE PRUEBA:');
    console.log('   • "Valle de Aragón 3ra Sección, Ecatepec"');
    console.log('   • "Santa Cruz Acatlán, Naucalpan"');
    console.log('   • "Centro Urbano, Toluca"');
    console.log('');
    console.log('=======================================');
}

// Función específica para diagnosticar el problema CORS vs servidor
function diagnosticarCORSvsServidor() {
    console.log('🔍 === DIAGNÓSTICO: CORS vs SERVIDOR ===');
    console.log('');
    console.log('❓ PREGUNTA: ¿El problema es CORS o el servidor no funciona?');
    console.log('');
    console.log('📋 ANÁLISIS ACTUAL:');
    console.log('   ❌ Error 404: Dirección no encontrada');
    console.log('   ❌ Error 503: Servicio no disponible');
    console.log('   ✅ Comunicación Flask-Nominatim funcionando');
    console.log('');
    console.log('🎯 RESPUESTA:');
    console.log('   - El problema NO es CORS (eso sería diferente)');
    console.log('   - El problema ES que el servidor Nominatim:');
    console.log('     * No tiene los datos específicos del Estado de México');
    console.log('     * O las direcciones están mal formateadas');
    console.log('     * O necesita datos más específicos');
    console.log('');
    console.log('💡 PRUEBA DEFINITIVA:');
    console.log('   Desde tu servidor, ejecuta:');
    console.log('   curl "http://10.65.117.238:8080/search?q=Ecatepec&format=json&countrycodes=mx"');
    console.log('   curl "http://10.65.117.238:8080/search?q=Toluca&format=json&countrycodes=mx"');
    console.log('   curl "http://10.65.117.238:8080/search?q=Nezahualcóyotl&format=json&countrycodes=mx"');
    console.log('   ');
    console.log('   Si funciona → Servidor OK, datos faltantes');
    console.log('   Si no funciona → Servidor no está corriendo');
    console.log('');
    console.log('🔧 SOLUCIONES POSIBLES:');
    console.log('   1. Cargar datos específicos del Estado de México en Nominatim');
    console.log('   2. Simplificar direcciones para geocodificación');
    console.log('   3. Usar coordenadas conocidas como fallback');
    console.log('=======================================');
}
