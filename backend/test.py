import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT')),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        ssl={'ca': os.getenv('DB_SSL_CA'), 'check_hostname': False},
        connect_timeout=60
    )
    print("CONNECTED TO AIVEN MYSQL!")
    cursor = conn.cursor()
    cursor.execute("SELECT NOW(), VERSION()")
    print("Result:", cursor.fetchone())
    conn.close()
except Exception as e:
    print("Failed:", str(e))