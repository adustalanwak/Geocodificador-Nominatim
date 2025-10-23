import pyodbc
import logging

logging.basicConfig(level=logging.INFO)

cache = {}

def get_db_connection():
    conn_str = (
        'DRIVER={ODBC Driver 18 for SQL Server};'
        'SERVER=SERVERIP;'
        'DATABASE=NAME;'
        'UID=;'
        'PWD=PASSWORD;'
        'TrustServerCertificate=yes;'
    )
    return pyodbc.connect(conn_str)

def search_pagos_padron(tipo=None, nombre_rfc=None, idperiodo=None, cp=None, municipio=None, idejeercicio=None):
    query = '''
        SELECT p.*, c.cat_descripcion AS tipo, pg.*
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        INNER JOIN Pagos1 pg ON p.pa_rfc = pg.RFC
        WHERE c.cat_estatus = 1
    '''
    params = []
    # Manejar múltiples tipos
    if tipo:
        if isinstance(tipo, list):
            placeholders = ','.join(['?' for _ in tipo])
            query += f" AND c.cat_descripcion IN ({placeholders})"
            params.extend(tipo)
        else:
            query += " AND c.cat_descripcion = ?"
            params.append(tipo)
    if nombre_rfc:
        query += " AND (p.pa_nombre LIKE ? OR p.pa_rfc LIKE ?)"
        like_value = f"%{nombre_rfc}%"
        params.extend([like_value, like_value])
    if idperiodo:
        query += " AND pg.IDPERIODO = ?"
        params.append(idperiodo)
    if cp:
        query += " AND p.pa_cp = ?"
        params.append(cp)
    if municipio:
        query += " AND p.pa_municipio = ?"
        params.append(municipio)
    if idejeercicio:
        query += " AND pg.IDEJERCICIO = ?"
        params.append(idejeercicio)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return results

def get_payments_by_municipio():
    key = "payments_by_municipio"
    if key in cache:
        logging.info("Returning cached payments by municipio")
        return cache[key]
    query = '''
        SELECT p.pa_municipio, SUM(CAST(pg.TOTALPAGO AS FLOAT)) as total
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        INNER JOIN Pagos1 pg ON p.pa_rfc = pg.RFC
        WHERE c.cat_estatus = 1 AND p.pa_municipio IS NOT NULL AND p.pa_municipio <> ''
        GROUP BY p.pa_municipio
    '''
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            results = [{'municipio': row[0], 'total': row[1]} for row in cursor.fetchall()]
        cache[key] = results
        logging.info(f"Cached {len(results)} payments by municipio")
        return results
    except Exception as e:
        logging.error(f"Error in get_payments_by_municipio: {e}")
        return []

def get_payments_by_cp():
    key = "payments_by_cp"
    if key in cache:
        logging.info("Returning cached payments by cp")
        return cache[key]
    query = '''
        SELECT p.pa_cp, SUM(CAST(pg.TOTALPAGO AS FLOAT)) as total_payments
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        INNER JOIN Pagos1 pg ON p.pa_rfc = pg.REC
        WHERE c.cat_estatus = 1 AND p.pa_cp IS NOT NULL AND p.pa_cp <> ''
        GROUP BY p.pa_cp
    '''
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            results = [{'cp': row[0], 'total': row[1]} for row in cursor.fetchall()]
        cache[key] = results
        logging.info(f"Cached {len(results)} payments by cp")
        return results
    except Exception as e:
        logging.error(f"Error in get_payments_by_cp: {e}")
        return []

def get_payments_by_cp_in_municipio(municipio):
    query = '''
        SELECT p.pa_cp, SUM(CAST(pg.TOTALPAGO AS FLOAT)) as total_payments
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        INNER JOIN Pagos1 pg ON p.pa_rfc = pg.RFC
        WHERE c.cat_estatus = 1 AND p.pa_cp IS NOT NULL AND p.pa_cp <> '' AND p.pa_municipio = ?
        GROUP BY p.pa_cp
    '''
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, municipio)
        results = [{'cp': row[0], 'total': row[1]} for row in cursor.fetchall()]
    return results

def get_padron_data():
    query = '''
        SELECT p.*, c.cat_descripcion AS tipo
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        WHERE c.cat_estatus = 1
    '''
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return results

def get_unique_padron_field(field):
    query = f"""
        SELECT DISTINCT {field}
        FROM Padron
        WHERE {field} IS NOT NULL AND {field} <> ''
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query)
        results = [row[0] for row in cursor.fetchall()]
    return results

def search_padron(nombre_rfc=None, colonia=None, cp=None, municipio=None):
    query = '''
        SELECT p.*, c.cat_descripcion AS tipo
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        WHERE c.cat_estatus = 1
    '''
    params = []

    if nombre_rfc:
        query += " AND (p.pa_nombre LIKE ? OR p.pa_rfc LIKE ?)"
        like_value = f"%{nombre_rfc}%"
        params.extend([like_value, like_value])

    if colonia:
        query += " AND p.pa_colonia = ?"
        params.append(colonia)

    # Manejar múltiples códigos postales
    if cp:
        if isinstance(cp, list) and len(cp) > 0:
            placeholders = ','.join(['?' for _ in cp])
            query += f" AND p.pa_cp IN ({placeholders})"
            params.extend(cp)
        elif cp:
            query += " AND p.pa_cp = ?"
            params.append(cp)

    # Manejar múltiples municipios
    if municipio:
        if isinstance(municipio, list) and len(municipio) > 0:
            placeholders = ','.join(['?' for _ in municipio])
            query += f" AND p.pa_municipio IN ({placeholders})"
            params.extend(municipio)
        elif municipio:
            query += " AND p.pa_municipio = ?"
            params.append(municipio)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return results

def get_payments_by_municipio_filtered(tipo=None, idejercicio=None, idperiodo=None):
    # Crear clave de caché considerando listas vs valores individuales
    tipo_str = str(tipo) if tipo else 'None'
    idejercicio_str = str(idejercicio) if idejercicio else 'None'
    idperiodo_str = str(idperiodo) if idperiodo else 'None'
    key = f"payments_municipio_filtered_{tipo_str}_{idejercicio_str}_{idperiodo_str}"

    if key in cache:
        logging.info(f"Returning cached payments by municipio filtered: {key}")
        return cache[key]

    query = '''
        SELECT p.pa_municipio, SUM(CAST(pg.TOTALPAGO AS FLOAT)) as total
        FROM Padron p
        INNER JOIN Cat_Padron c ON p.cat_idpadron = c.cat_idpadron
        INNER JOIN Pagos1 pg ON p.pa_rfc = pg.RFC
        WHERE c.cat_estatus = 1 AND p.pa_municipio IS NOT NULL AND p.pa_municipio <> ''
    '''
    params = []

    # Manejar múltiples tipos
    if tipo:
        if isinstance(tipo, list) and len(tipo) > 0:
            placeholders = ','.join(['?' for _ in tipo])
            query += f" AND c.cat_descripcion IN ({placeholders})"
            params.extend(tipo)
        elif tipo:
            query += " AND c.cat_descripcion = ?"
            params.append(tipo)

    # Manejar múltiples ejercicios
    if idejercicio:
        if isinstance(idejercicio, list) and len(idejercicio) > 0:
            placeholders = ','.join(['?' for _ in idejercicio])
            query += f" AND pg.IDEJERCICIO IN ({placeholders})"
            params.extend(idejercicio)
        elif idejercicio:
            query += " AND pg.IDEJERCICIO = ?"
            params.append(idejercicio)

    # Manejar múltiples periodos
    if idperiodo:
        if isinstance(idperiodo, list) and len(idperiodo) > 0:
            placeholders = ','.join(['?' for _ in idperiodo])
            query += f" AND pg.IDPERIODO IN ({placeholders})"
            params.extend(idperiodo)
        elif idperiodo:
            query += " AND pg.IDPERIODO = ?"
            params.append(idperiodo)
    query += " GROUP BY p.pa_municipio"
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            results = [{'municipio': row[0], 'total': row[1]} for row in cursor.fetchall()]
        cache[key] = results
        logging.info(f"Cached {len(results)} payments by municipio filtered: {key}")
        return results
    except Exception as e:
        logging.error(f"Error in get_payments_by_municipio_filtered: {e}")
        return []
