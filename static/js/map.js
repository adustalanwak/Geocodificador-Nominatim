// Inicializa el mapa centrado en México
// Inicializa el mapa centrado en el Estado de México
var map = L.map('map').setView([19.3574, -99.6671], 9);

// Capa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Variables para capas GeoJSON
let geojsonLayers = {};
let paymentsByMunicipio = {};
let paymentsByCp = {};
let currentZoomLevel = 'state'; // 'state' or 'municipio'
let selectedMunicipio = null;
let currentLegend = null;
let loadingCount = 0;
let leafletGeojsonLayer = null;

window.showLoading = function() {
    window.loadingCount = (window.loadingCount || 0) + 1;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'flex';
};

window.hideLoading = function() {
    window.loadingCount = (window.loadingCount || 0) - 1;
    if (window.loadingCount <= 0) {
        window.loadingCount = 0;
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
};

// Función para cargar GeoJSON y guardarlo en memoria
function cargarGeoJSONMemoria(nombre, url) {
    return fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Error loading ${nombre}: ${res.statusText}`);
            }
            return res.json();
        })
        .then(data => {
            geojsonLayers[nombre] = data;
        })
        .catch(error => {
            console.error(`Failed to load ${nombre}:`, error);
        });
}

// Cargar todos los GeoJSON al inicio y datos de pagos
showLoading();
Promise.all([
    cargarGeoJSONMemoria('municipios', '/geojson/Municipios_oid_str_fixed.geojson'),
    cargarGeoJSONMemoria('delegaciones', '/geojson/Delegaciones.geojson'),
    cargarGeoJSONMemoria('codigospost', '/geojson/CodigosPost.geojson'),
    fetch('/api/payments_by_municipio').then(res => res.json()).then(data => {
        paymentsByMunicipio = {};
        data.forEach(item => {
            paymentsByMunicipio[item.municipio] = item.total;
        });
    }).catch(err => console.error('Error loading payments by municipio:', err)),
    fetch('/api/payments_by_cp').then(res => res.json()).then(data => {
        paymentsByCp = {};
        data.forEach(item => {
            paymentsByCp[item.cp] = item.total;
        });
    }).catch(err => console.error('Error loading payments by cp:', err))
]).then(() => {
    hideLoading();
    console.log('✅ Datos iniciales cargados correctamente');
}).catch(err => {
    console.error('Error loading initial data:', err);
    hideLoading();
});


// Función para mostrar heatmap del estado (municipios) - disponible globalmente
window.mostrarHeatmapEstado = function() {
    if (!geojsonLayers['municipios']) return;
    currentZoomLevel = 'state';
    selectedMunicipio = null;
    if (leafletGeojsonLayer) {
        map.removeLayer(leafletGeojsonLayer);
    }
    if (currentLegend) {
        map.removeControl(currentLegend);
    }
    // Calcular cuantiles para colores dinámicos
    let totals = Object.values(paymentsByMunicipio).filter(t => t > 0).sort((a, b) => a - b);
    if (totals.length === 0) {
        return;
    }
    let breaks = [0];
    for (let i = 1; i < 5; i++) {
        breaks.push(totals[Math.floor(totals.length * i / 5)]);
    }
    breaks.push(Math.max(...totals));
    // ✅ Colores invertidos completamente: rojo para menos valor, verde para más valor
    let colors = ['#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#228B22']; // rojo, naranja, amarillo, verde, verde oscuro

    function getDynamicColor(total) {
        if (total <= breaks[1]) return colors[0]; // 🔴 Menos valor = rojo
        if (total <= breaks[2]) return colors[1]; // naranja
        if (total <= breaks[3]) return colors[2]; // amarillo
        if (total <= breaks[4]) return colors[3]; // verde
        return colors[4]; // 🟢 Más valor = verde oscuro
    }

    leafletGeojsonLayer = L.geoJSON(geojsonLayers['municipios'], {
        style: function(feature) {
            let municipio = feature.properties.NOMBRE;
            let total = paymentsByMunicipio[municipio] || 0;
            return {
                fillColor: getDynamicColor(total),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            let municipio = feature.properties.NOMBRE;
            let total = paymentsByMunicipio[municipio] || 0;
            layer.bindPopup(`<b>${municipio}</b><br>Total Pagos: $${total.toLocaleString()}`);
        }
    }).addTo(map);
    map.fitBounds(leafletGeojsonLayer.getBounds());
    // ✅ Leyenda simplificada sin texto explicativo
    currentLegend = L.control({position: 'bottomright'});
    currentLegend.onAdd = function(map) {
        let div = L.DomUtil.create('div', 'info legend');
        let labels = ['<strong>Total Pagos ($)</strong>'];
        for (let i = 0; i < breaks.length - 1; i++) {
            let from = breaks[i];
            let to = breaks[i + 1];
            labels.push(
                '<i style="background:' + colors[i] + '"></i> ' +
                from.toLocaleString() + ' - ' + to.toLocaleString());
        }
        div.innerHTML = labels.join('<br>');
        return div;
    };
    currentLegend.addTo(map);
}

// Función para zoom a municipio y mostrar cps
function zoomToMunicipio(municipio) {
    selectedMunicipio = municipio;
    currentZoomLevel = 'municipio';
    // Fetch payments by cp in municipio
    fetch(`/api/payments_by_cp_in_municipio?municipio=${encodeURIComponent(municipio)}`)
        .then(res => res.json())
        .then(data => {
            let cpPayments = {};
            data.forEach(item => {
                cpPayments[item.cp] = item.total;
            });
            mostrarHeatmapCpEnMunicipio(municipio, cpPayments);
        })
        .catch(err => console.error('Error loading cp payments:', err));
}

function mostrarHeatmapCpEnMunicipio(municipio, cpPayments) {
    if (!geojsonLayers['codigospost']) return;
    if (leafletGeojsonLayer) {
        map.removeLayer(leafletGeojsonLayer);
    }
    if (currentLegend) {
        map.removeControl(currentLegend);
    }
    // Filter to only cps with payments > 0
    let filteredFeatures = geojsonLayers['codigospost'].features.filter(f => {
        let cp = f.properties.d_codigo;
        return cpPayments[cp] > 0;
    });
    if (filteredFeatures.length === 0) {
        alert(`No hay datos de pagos para códigos postales en ${municipio}. Volviendo a vista general.`);
        mostrarHeatmapEstado();
        return;
    }
    // Calcular cuantiles para colores dinámicos
    let totals = Object.values(cpPayments).filter(t => t > 0).sort((a, b) => a - b);
    let breaks = [0];
    for (let i = 1; i < 5; i++) {
        breaks.push(totals[Math.floor(totals.length * i / 5)]);
    }
    breaks.push(Math.max(...totals));
    // ✅ Colores invertidos completamente: rojo para menos valor, verde para más valor
    let colors = ['#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#228B22']; // rojo, naranja, amarillo, verde, verde oscuro

    function getDynamicColor(total) {
        if (total <= breaks[1]) return colors[0]; // 🔴 Menos valor = rojo
        if (total <= breaks[2]) return colors[1]; // naranja
        if (total <= breaks[3]) return colors[2]; // amarillo
        if (total <= breaks[4]) return colors[3]; // verde
        return colors[4]; // 🟢 Más valor = verde oscuro
    }

    leafletGeojsonLayer = L.geoJSON({type: 'FeatureCollection', features: filteredFeatures}, {
        style: function(feature) {
            let cp = feature.properties.d_codigo;
            let total = cpPayments[cp] || 0;
            return {
                fillColor: getDynamicColor(total),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            let cp = feature.properties.d_codigo;
            let total = cpPayments[cp] || 0;
            layer.bindPopup(`<b>CP: ${cp}</b><br>Total Pagos: $${total.toLocaleString()}`);
        }
    }).addTo(map);
    // Find municipio bounds to zoom
    if (geojsonLayers['municipios']) {
        let munFeature = geojsonLayers['municipios'].features.find(f => f.properties.NOMBRE === municipio);
        if (munFeature) {
            map.fitBounds(L.geoJSON(munFeature).getBounds());
        }
    }
    // ✅ Leyenda simplificada sin texto explicativo
    currentLegend = L.control({position: 'bottomright'});
    currentLegend.onAdd = function(map) {
        let div = L.DomUtil.create('div', 'info legend');
        let labels = ['<strong>Total Pagos ($)</strong>'];
        for (let i = 0; i < breaks.length - 1; i++) {
            let from = breaks[i];
            let to = breaks[i + 1];
            labels.push(
                '<i style="background:' + colors[i] + '"></i> ' +
                from.toLocaleString() + ' - ' + to.toLocaleString());
        }
        div.innerHTML = labels.join('<br>');
        return div;
    };
    currentLegend.addTo(map);
}

// Función para mostrar mapa de calor solo cuando sea necesario (disponible globalmente)
window.mostrarMapaConDatos = function(datos) {
    if (datos && datos.length > 0) {
        mostrarHeatmapEstado();
        return true;
    }
    return false;
};

// Función para limpiar mapa cuando no hay datos relevantes
window.limpiarMapa = function() {
    if (leafletGeojsonLayer) {
        map.removeLayer(leafletGeojsonLayer);
        leafletGeojsonLayer = null;
    }
    if (currentLegend) {
        map.removeControl(currentLegend);
        currentLegend = null;
    }
};

// Función para mostrar polígonos filtrados (disponible globalmente)
window.mostrarPoligonos = function(filtros) {
    // Elimina capa anterior
    if (leafletGeojsonLayer) {
        map.removeLayer(leafletGeojsonLayer);
    }
    if (currentLegend) {
        map.removeControl(currentLegend);
    }
    let features = [];
    let style = {};
    let polygonType = '';

    // Si hay múltiples municipios
    if (filtros.municipios && filtros.municipios.length > 0 && geojsonLayers['municipios']) {
        polygonType = 'municipios';
        filtros.municipios.forEach(municipio => {
            const munFeatures = geojsonLayers['municipios'].features.filter(f => {
                return String(f.properties.OID) === String(municipio) ||
                       String(f.properties.NOMBRE).toLowerCase() === String(municipio).toLowerCase();
            });
            features = features.concat(munFeatures);
        });
        style = {
            color: '#2ECC40',
            weight: 3,
            fillOpacity: 0.35,
            fillColor: '#B2F7EF'
        };
    }
    // Si hay múltiples códigos postales
    else if (filtros.cps && filtros.cps.length > 0 && geojsonLayers['codigospost']) {
        polygonType = 'codigospostales';
        filtros.cps.forEach(cp => {
            const cpFeatures = geojsonLayers['codigospost'].features.filter(f => {
                return f.properties.d_codigo == cp;
            });
            features = features.concat(cpFeatures);
        });
        style = {
            color: '#0074D9',
            weight: 3,
            fillOpacity: 0.35,
            fillColor: '#B2D9F7'
        };
    }
    // Si hay filtro de municipio individual
    else if (filtros.municipio && geojsonLayers['municipios']) {
        polygonType = 'municipio';
        features = geojsonLayers['municipios'].features.filter(f => {
            return String(f.properties.OID) === String(filtros.municipio) ||
                   String(f.properties.NOMBRE).toLowerCase() === String(filtros.municipio).toLowerCase();
        });
        style = {
            color: '#2ECC40',
            weight: 3,
            fillOpacity: 0.35,
            fillColor: '#B2F7EF'
        };
    }
    // Si hay filtro de código postal individual
    else if (filtros.cp && geojsonLayers['codigospost']) {
        polygonType = 'codigopostal';
        features = geojsonLayers['codigospost'].features.filter(f => {
            return f.properties.d_codigo == filtros.cp;
        });
        style = {
            color: '#0074D9',
            weight: 3,
            fillOpacity: 0.35,
            fillColor: '#B2D9F7'
        };
    }
    // Si hay filtro de colonia, buscar en municipios si la propiedad existe
    else if (filtros.colonia && geojsonLayers['municipios']) {
        polygonType = 'colonia';
        features = geojsonLayers['municipios'].features.filter(f => {
            return f.properties.colonia === filtros.colonia;
        });
        style = {
            color: '#FF4136',
            weight: 3,
            fillOpacity: 0.35,
            fillColor: '#FFD9D9'
        };
    }

    // Si hay resultados, los muestra
    if (features.length > 0) {
        leafletGeojsonLayer = L.geoJSON({type: 'FeatureCollection', features: features}, {
            style: style
        }).addTo(map);

        // Ajustar el zoom según el tipo y cantidad de features
        if (polygonType === 'municipios' || polygonType === 'municipio') {
            map.fitBounds(leafletGeojsonLayer.getBounds());
        } else if (polygonType === 'codigospostales' || polygonType === 'codigopostal') {
            map.fitBounds(leafletGeojsonLayer.getBounds());
        }
    }
}
