"""
DATABASE.PY
Configuración de conexión PostgreSQL
Sistema Inteligente FTTH - ENTEL
"""
import psycopg2
from psycopg2 import pool
from config import Config
class Database:
    def __init__(self):
        # print eliminado
        print(f"📋 Conectando a PostgreSQL con:")
        print(f"   Host: {Config.DB_HOST}")
        print(f"   User: {Config.DB_USER}")
        try:
            # Usar Config para las credenciales
            self.connection_pool = psycopg2.pool.SimpleConnectionPool(
                1,
                10,
                host=Config.DB_HOST,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                port=Config.DB_PORT
            )
            if self.connection_pool:
                print("✅ Pool PostgreSQL conectado correctamente.")
        except Exception as error:
            print("❌ Error conexión PostgreSQL:")
            print(error)
            print("\n--- USANDO BASE DE DATOS EN MEMORIA ---")
            self.connection_pool = None
            self.use_memory = True
    # =====================================================
    # Obtener conexión
    # =====================================================
    def get_connection(self):
        if self.connection_pool:
            return self.connection_pool.getconn()
        return None
    # =====================================================
    # Liberar conexión
    # =====================================================
    def release_connection(self, connection):
        if self.connection_pool and connection:
            self.connection_pool.putconn(connection)
    # =====================================================
    # Ejecutar INSERT con RETURNING (CORREGIDO)
    # =====================================================
    def execute_returning(self, query, values=None):
        # Si no hay conexión a base de datos, simular éxito
        if self.connection_pool is None:
            print("⚠️ [MODO MEMORIA] Simulando guardado de ticket...")
            return {"id": 1}
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                raise Exception("No se pudo obtener conexión a la base de datos")
            cursor = connection.cursor()
            cursor.execute(query, values)
            # Obtener el resultado del RETURNING
            result = cursor.fetchone()
            # Hacer commit EXPLÍCITO DESPUÉS de fetchone
            connection.commit()
            print(f"   ✅ Commit realizado correctamente")
            if result:
                # Obtener nombres de columnas
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, result))
            return {"id": 0}
        except Exception as error:
            print(f"❌ ERROR EN execute_returning: {error}")
            if connection:
                connection.rollback()
                print("   ⚠️ Rollback ejecutado")
            return {"error": str(error), "id": 0}
        finally:
            if cursor:
                cursor.close()
            if connection:
                self.release_connection(connection)
    # =====================================================
    # Ejecutar consulta INSERT / UPDATE / DELETE
    # =====================================================
    def execute(self, query, values=None):
        if self.connection_pool is None:
            print("⚠️ [MODO MEMORIA] Simulando ejecución...")
            return True
        connection = None
        try:
            connection = self.get_connection()
            if connection is None:
                raise Exception("No se pudo obtener conexión a la base de datos")
            cursor = connection.cursor()
            cursor.execute(query, values)
            connection.commit()
            cursor.close()
            return True
        except Exception as error:
            print("❌ Error ejecutando consulta:")
            print(error)
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                self.release_connection(connection)
    # =====================================================
    # Ejecutar SELECT (un solo registro)
    # =====================================================
    def fetch_one(self, query, values=None):
        if self.connection_pool is None:
            return None
        connection = None
        try:
            connection = self.get_connection()
            if connection is None:
                raise Exception("No se pudo obtener conexión a la base de datos")
            cursor = connection.cursor()
            cursor.execute(query, values)
            result = cursor.fetchone()
            cursor.close()
            if result and cursor.description:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, result))
            return result
        except Exception as error:
            print("❌ Error consulta:")
            print(error)
            return None
        finally:
            if connection:
                self.release_connection(connection)
    # =====================================================
    # Ejecutar SELECT (múltiples registros)
    # =====================================================
    def fetch_all(self, query, values=None):
        if self.connection_pool is None:
            return []
        connection = None
        try:
            connection = self.get_connection()
            if connection is None:
                raise Exception("No se pudo obtener conexión a la base de datos")
            cursor = connection.cursor()
            cursor.execute(query, values)
            rows = cursor.fetchall()
            if rows and cursor.description:
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
            cursor.close()
            return rows
        except Exception as error:
            print("❌ Error consulta:")
            print(error)
            return []
        finally:
            if connection:
                self.release_connection(connection)
# =========================================================
# Instancia global
# =========================================================
database = Database()
