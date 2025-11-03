from flask import Flask, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Dummy data (can later come from DB)
customers = [
    {"id": 1, "name": "Rudransh", "address": "123 Main St, City", "phone": "555-0101", "type": "Residential", "email": "john@email.com"},
]

meters = [
    {"id": 1, "customerId": 1, "meterNumber": "MTR-2024-001", "installDate": "2024-01-15", "status": "Active"},
]
readings = [
    {"id": 1, "meterId": 1, "date": "2024-10-01", "current": 5420, "previous": 5120, "consumed": 300},
]

bills = [
    {"id": 1, "customerId": 1, "billDate": "2024-10-05", "dueDate": "2024-10-20", "units": 300, "rate": 0.12, "amount": 36.00, "status": "Paid"},
]

@app.route("/api/customers", methods=["GET"])
def get_customers():
    return jsonify(customers)

@app.route("/api/meters", methods=["GET"])
def get_meters():
    return jsonify(meters)

@app.route("/api/readings", methods=["GET"])
def get_readings():
    return jsonify(readings)

@app.route("/api/bills", methods=["GET"])
def get_bills():
    return jsonify(bills)

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"message": "Backend working fine!"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
