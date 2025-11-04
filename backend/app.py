from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ✅ Aiven MySQL Database connection


db = SQLAlchemy(app)

# ============================
# 📦 MODELS
# ============================

class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    address = db.Column(db.String(200))

class Meter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    meter_number = db.Column(db.String(50))
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'))
    customer = db.relationship('Customer', backref=db.backref('meters', lazy=True))

class Reading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    meter_id = db.Column(db.Integer, db.ForeignKey('meter.id'))
    units_consumed = db.Column(db.Float)
    date = db.Column(db.String(50))
    meter = db.relationship('Meter', backref=db.backref('readings', lazy=True))

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reading_id = db.Column(db.Integer, db.ForeignKey('reading.id'))
    amount = db.Column(db.Float)
    status = db.Column(db.String(50))
    reading = db.relationship('Reading', backref=db.backref('bill', uselist=False))

# ============================
# 🔧 ROUTES (CRUD)
# ============================

# ---- Customers ----
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = Customer.query.all()
    return jsonify([{'id': c.id, 'name': c.name, 'address': c.address} for c in customers])

@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    new_customer = Customer(name=data['name'], address=data['address'])
    db.session.add(new_customer)
    db.session.commit()
    return jsonify({'message': 'Customer added successfully'}), 201

# ---- Meters ----
@app.route('/api/meters', methods=['GET'])
def get_meters():
    meters = Meter.query.all()
    return jsonify([{
        'id': m.id,
        'meter_number': m.meter_number,
        'customer_id': m.customer_id,
        'customer_name': m.customer.name if m.customer else None
    } for m in meters])

@app.route('/api/meters', methods=['POST'])
def add_meter():
    data = request.get_json()
    new_meter = Meter(meter_number=data['meter_number'], customer_id=data['customer_id'])
    db.session.add(new_meter)
    db.session.commit()
    return jsonify({'message': 'Meter added successfully'}), 201

# ---- Readings ----
@app.route('/api/readings', methods=['GET'])
def get_readings():
    readings = Reading.query.all()
    return jsonify([{
        'id': r.id,
        'meter_id': r.meter_id,
        'units_consumed': r.units_consumed,
        'date': r.date
    } for r in readings])

@app.route('/api/readings', methods=['POST'])
def add_reading():
    data = request.get_json()
    new_reading = Reading(
        meter_id=data['meter_id'],
        units_consumed=data['units_consumed'],
        date=data['date']
    )
    db.session.add(new_reading)
    db.session.commit()
    return jsonify({'message': 'Reading added successfully'}), 201

# ---- Bills ----
@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.query.all()
    return jsonify([{
        'id': b.id,
        'reading_id': b.reading_id,
        'amount': b.amount,
        'status': b.status
    } for b in bills])

@app.route('/api/bills', methods=['POST'])
def add_bill():
    data = request.get_json()
    new_bill = Bill(
        reading_id=data['reading_id'],
        amount=data['amount'],
        status=data['status']
    )
    db.session.add(new_bill)
    db.session.commit()
    return jsonify({'message': 'Bill added successfully'}), 201

# ============================
# 🚀 MAIN
# ============================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if they don’t exist
    app.run(debug=True)
