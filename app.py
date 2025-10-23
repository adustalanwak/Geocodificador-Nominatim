from flask import Flask, render_template, send_from_directory, jsonify, request
import db_utils
import os
import logging
import requests

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/geojson/<filename>')
def geojson(filename):
    geojson_dir = os.path.join(app.root_path, 'geojson')
    return send_from_directory(geojson_dir, filename)

@app.route('/api/tipos')
def api_tipos():
    with db_utils.get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT cat_descripcion FROM Cat_Padron WHERE cat_estatus = 1')
        tipos = [row[0] for row in cursor.fetchall() if row[0] is not None]
    logging.info(f"Tipos loaded: {tipos[:5]}...")  # Log first 5
    return jsonify(tipos)

@app.route('/api/ejercicios')
def api_ejercicios():
    with db_utils.get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT IDEJERCICIO FROM Pagos1')
        ejercicios = [row[0] for row in cursor.fetchall() if row[0] is not None]
    # CORRECCIÓN: Devolver los valores como están en la BD (últimos 2 dígitos)
    # El frontend se encarga de mostrar el año completo
    return jsonify(ejercicios)

# Endpoint para obtener datos de Padron y Cat_Padron
@app.route('/api/padron')
def api_padron():
    data = db_utils.get_padron_data()
    return jsonify(data)

# Endpoint para obtener los periodos únicos (meses)
@app.route('/api/periodos')
def api_periodos():
    with db_utils.get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT IDPERIODO FROM Pagos1 ORDER BY IDPERIODO')
        periodos = [row[0] for row in cursor.fetchall() if row[0] is not None]
    return jsonify(periodos)

# Endpoints para autocompletar filtros
@app.route('/api/colonias')
def api_colonias():
    colonias = db_utils.get_unique_padron_field('pa_colonia')
    return jsonify(colonias)

@app.route('/api/codigos_postales')
def api_codigos_postales():
    cps = db_utils.get_unique_padron_field('pa_cp')
    return jsonify(cps)

@app.route('/api/municipios')
def api_municipios():
    municipios = db_utils.get_unique_padron_field('pa_municipio')
    return jsonify(municipios)

# Endpoint para búsqueda por nombre/RFC y filtros
@app.route('/api/buscar_padron')
def api_buscar_padron():
    try:
        logging.info("API buscar_padron called")
        from flask import request
        nombre_rfc = request.args.get('q')
        periodos = request.args.getlist('idperiodo')
        cps = request.args.getlist('cp')
        municipios = request.args.getlist('municipio')
        tipos = request.args.getlist('tipo')
        ejercicios = request.args.getlist('idejercicio')

        # Usar el primer valor para mantener compatibilidad con funciones existentes
        # TODO: Modificar funciones de DB para manejar múltiples valores
        idperiodo = periodos[0] if periodos else None
        cp = cps[0] if cps else None
        municipio = municipios[0] if municipios else None
        tipo = tipos[0] if tipos else None
        idejeercicio = ejercicios[0] if ejercicios else None
        if tipo or idejeercicio or idperiodo:
            resultados = db_utils.search_pagos_padron(tipo=tipo, nombre_rfc=nombre_rfc, idperiodo=idperiodo, cp=cp, municipio=municipio, idejeercicio=idejeercicio)
        else:
            resultados = db_utils.search_padron(nombre_rfc=nombre_rfc, cp=cp, municipio=municipio)
        logging.info(f"Found {len(resultados)} results for buscar_padron")
        if resultados:
            logging.info(f"Keys in first result: {list(resultados[0].keys())}")
        return jsonify(resultados)
    except Exception as e:
        logging.error(f"Error in api_buscar_padron: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/payments_by_municipio')
def api_payments_by_municipio():
    try:
        logging.info("API payments_by_municipio called")
        data = db_utils.get_payments_by_municipio()
        logging.info(f"Returned {len(data)} municipio payments")
        return jsonify(data)
    except Exception as e:
        logging.error(f"Error in api_payments_by_municipio: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/payments_by_cp')
def api_payments_by_cp():
    data = db_utils.get_payments_by_cp()
    return jsonify(data)

@app.route('/api/payments_by_cp_in_municipio')
def api_payments_by_cp_in_municipio():
    municipio = request.args.get('municipio')
    if not municipio:
        return jsonify({'error': 'Municipio required'}), 400
    data = db_utils.get_payments_by_cp_in_municipio(municipio)
    return jsonify(data)

# Endpoint para pagos por municipio con filtros
@app.route('/api/payments_by_municipio_filtered')
def api_payments_by_municipio_filtered():
    tipos = request.args.getlist('tipo')
    ejercicios = request.args.getlist('idejercicio')
    periodos = request.args.getlist('idperiodo')

    # Convertir listas vacías a None para compatibilidad con la función existente
    tipo = tipos if tipos else None
    idejercicio = ejercicios if ejercicios else None
    idperiodo = periodos if periodos else None

    data = db_utils.get_payments_by_municipio_filtered(tipo=tipo, idejercicio=idejercicio, idperiodo=idperiodo)
    return jsonify(data)

# Endpoint para geocodificación usando servidor Nominatim local
@app.route('/api/geocode')
def api_geocode():
    """
    Geocodifica direcciones usando el servidor Nominatim local
    Parámetros esperados:
    - address: Dirección a geocodificar
    - limit: Número máximo de resultados (default: 5)
    """
    try:
        address = request.args.get('address')
        limit = request.args.get('limit', 5, type=int)

        if not address:
            return jsonify({'error': 'Dirección requerida'}), 400

        if not address.strip():
            return jsonify({'error': 'Dirección vacía'}), 400

        logging.info(f"Geocodificando dirección: {address}")

        # Configuración del servidor Nominatim
        nominatim_servers = [
            "http://localhost/search",  # Servidor principal
            "http://localhost/search",        # Sin puerto específico
            "http://localhost:8080/search"        # Fallback local (por si acaso)
        ]

        # Parámetros para la consulta
        params = {
            'q': address.strip(),
            'format': 'json',
            'limit': limit,  # Sin límite máximo - devolver todos los resultados
            'countrycodes': 'mx',  # Limitar a México
            'addressdetails': 1,   # Incluir detalles de dirección
            'dedupe': 0,           # No eliminar duplicados - mostrar todos
            'polygon_geojson': 0   # Sin geometría compleja
        }

        # Headers para simular navegador
        headers = {
            'User-Agent': 'FlaskApp/1.0 (Geocoding Service)',
            'Accept-Language': 'es-MX,es,en-US,en',
            'Referer': 'http://localhost:5000'
        }

        # Intentar conectar con diferentes servidores
        last_error = None
        for nominatim_url in nominatim_servers:
            try:
                logging.info(f"Intentando conectar con: {nominatim_url}")

                # Realizar consulta al servidor Nominatim
                response = requests.get(
                    nominatim_url,
                    params=params,
                    headers=headers,
                    timeout=15  # Timeout aumentado a 15 segundos
                )

                # Si llegamos aquí, la conexión fue exitosa
                response.raise_for_status()
                break

            except requests.exceptions.ConnectionError as e:
                last_error = f"Error de conexión con {nominatim_url}: {e}"
                logging.warning(last_error)
                continue

            except requests.exceptions.Timeout as e:
                last_error = f"Timeout conectando con {nominatim_url}: {e}"
                logging.warning(last_error)
                continue

            except requests.exceptions.HTTPError as e:
                last_error = f"Error HTTP con {nominatim_url}: {e}"
                logging.warning(last_error)
                continue

        else:
            # Si ningún servidor funcionó, lanzar el último error
            logging.error(f"Todos los servidores Nominatim fallaron. Último error: {last_error}")
            return jsonify({
                'error': 'Servidor de geocodificación no disponible',
                'details': last_error
            }), 503

        # Verificar si la respuesta fue exitosa
        response.raise_for_status()

        # Parsear resultados
        results = response.json()

        if not results:
            logging.warning(f"No se encontraron resultados para: {address}")
            return jsonify({'error': 'Dirección no encontrada', 'address': address}), 404

        # Formatear resultados para el frontend
        formatted_results = []
        for result in results[:limit]:
            formatted_result = {
                'lat': float(result['lat']),
                'lon': float(result['lon']),
                'display_name': result.get('display_name', ''),
                'importance': float(result.get('importance', 0)),
                'class': result.get('class', ''),
                'type': result.get('type', ''),
                'address': result.get('address', {})
            }
            formatted_results.append(formatted_result)

        logging.info(f"Geocodificación exitosa: {len(formatted_results)} resultados para '{address}'")

        return jsonify({
            'query': address,
            'results': formatted_results,
            'total': len(formatted_results)
        })

    except requests.exceptions.Timeout:
        logging.error(f"Timeout geocodificando: {address}")
        return jsonify({'error': 'Timeout en geocodificación'}), 504

    except requests.exceptions.ConnectionError:
        logging.error(f"Error de conexión con servidor Nominatim: {address}")
        return jsonify({'error': 'Error de conexión con servidor de geocodificación'}), 503

    except requests.exceptions.HTTPError as e:
        logging.error(f"Error HTTP geocodificando {address}: {e}")
        return jsonify({'error': 'Error del servidor de geocodificación'}), 502

    except Exception as e:
        logging.error(f"Error inesperado geocodificando {address}: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# Endpoint para geocodificar múltiples direcciones
@app.route('/api/geocode_batch')
def api_geocode_batch():
    """
    Geocodifica múltiples direcciones en una sola consulta
    Parámetros esperados:
    - addresses: Lista de direcciones separadas por '|'
    - limit: Número máximo de resultados por dirección (default: 1)
    """
    try:
        addresses_param = request.args.get('addresses')
        limit = request.args.get('limit', 1, type=int)

        if not addresses_param:
            return jsonify({'error': 'Lista de direcciones requerida'}), 400

        addresses = [addr.strip() for addr in addresses_param.split('|') if addr.strip()]

        if not addresses:
            return jsonify({'error': 'Lista de direcciones vacía'}), 400

        results = {}

        for address in addresses:
            try:
                # Usar el endpoint individual para cada dirección
                geocode_response = requests.get(
                    f"http://localhost:{request.environ.get('SERVER_PORT', 5000)}/api/geocode",
                    params={'address': address, 'limit': limit},
                    timeout=15
                )

                if geocode_response.status_code == 200:
                    results[address] = geocode_response.json()
                else:
                    results[address] = {
                        'error': f"Error geocodificando: {geocode_response.status_code}",
                        'results': []
                    }

            except Exception as e:
                results[address] = {
                    'error': f"Excepción: {str(e)}",
                    'results': []
                }

        return jsonify({
            'batch_size': len(addresses),
            'results': results
        })

    except Exception as e:
        logging.error(f"Error en geocodificación por lotes: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)