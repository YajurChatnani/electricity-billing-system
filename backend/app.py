# app.py — FULLY WORKING WITH AIVEN MYSQL (COMPLETE CRUD)
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime
from sqlalchemy.exc import IntegrityError


load_dotenv()

app = Flask(__name__)

# ----------------------------------------
# ✅ CORS Setup (for React + Vite frontend)
# ----------------------------------------
CORS(
    app,
    origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
    supports_credentials=False
)

# ----------------------------------------
# ✅ Database Configuration (Aiven MySQL)
# ----------------------------------------
ca_path = os.getenv('DB_SSL_CA', './ca.pem')
if not os.path.exists(ca_path):
    raise FileNotFoundError(f"CA certificate not found: {ca_path}")

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://"
    f"{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'connect_args': {'ssl': {'ca': ca_path}, 'connect_timeout': 30}
}

db = SQLAlchemy(app)

# ----------------------------------------
# ✅ MODELS
# ----------------------------------------
class Customer(db.Model):
    __tablename__ = 'Customers'
    customer_id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    phone = db.Column(db.String(20))

    def to_dict(self):
        return {
            'customer_id': self.customer_id,
            'customer_name': self.customer_name,
            'address': self.address,
            'phone': self.phone
        }


class Meter(db.Model):
    __tablename__ = 'Meters'
    meter_id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    meter_number = db.Column(db.String(50), unique=True, nullable=False)
    installation_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='Active')

    customer = db.relationship('Customer', backref='meters')

    def to_dict(self):
        return {
            'meter_id': self.meter_id,
            'customer_id': self.customer_id,
            'meter_number': self.meter_number,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'status': self.status
        }


class Reading(db.Model):
    __tablename__ = 'Readings'
    reading_id = db.Column(db.Integer, primary_key=True)
    meter_id = db.Column(db.Integer, db.ForeignKey('Meters.meter_id'), nullable=False)
    reading_date = db.Column(db.Date, nullable=False)
    units_consumed = db.Column(db.Float, nullable=False)

    meter = db.relationship('Meter', backref='readings')

    def to_dict(self):
        return {
            'reading_id': self.reading_id,
            'meter_id': self.meter_id,
            'reading_date': self.reading_date.isoformat(),
            'units_consumed': self.units_consumed
        }


class Bill(db.Model):
    __tablename__ = 'Bills'
    bill_id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    billing_date = db.Column(db.Date, nullable=False)
    amount_due = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    reading_id = db.Column(db.Integer, db.ForeignKey('Readings.reading_id'))

    customer = db.relationship('Customer', backref='bills')
    reading = db.relationship('Reading')

    def to_dict(self):
        return {
            'bill_id': self.bill_id,
            'customer_id': self.customer_id,
            'billing_date': self.billing_date.isoformat(),
            'amount_due': self.amount_due,
            'status': self.status,
            'reading_id': self.reading_id
        }

# ----------------------------------------
# ✅ Initialize Database
# ----------------------------------------
with app.app_context():
    db.create_all()
    print("Database ready!")


# ----------------------------------------
# ✅ ROUTES
# ----------------------------------------

# ---- Customers ----
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = Customer.query.all()
    return jsonify([c.to_dict() for c in customers])


@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    print("📦 Received data:", data)  # <-- ADD THIS LINE

    c = Customer(
        customer_name=data['customer_name'],
        address=data.get('address'),
        phone=data.get('phone')
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.route('/api/customers/<int:customer_id>', methods=['GET', 'PUT'])
def customer_detail(customer_id):
    c = Customer.query.get_or_404(customer_id)

    if request.method == 'GET':
        return jsonify(c.to_dict())

    if request.method == 'PUT':
        data = request.get_json()
        c.customer_name = data.get('customer_name', c.customer_name)
        c.address = data.get('address', c.address)
        c.phone = data.get('phone', c.phone)
        db.session.commit()
        return jsonify(c.to_dict()), 200

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    try:
        c = Customer.query.get_or_404(customer_id)
        db.session.delete(c)
        db.session.commit()
        return jsonify({'message': 'Customer deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ---- Meters ----
@app.route('/api/meters', methods=['GET'])
def get_meters():
    try:
        meters = Meter.query.all()
        meter_list = []

        for m in meters:
            customer = Customer.query.get(m.customer_id)
            meter_list.append({
                "meter_id": m.meter_id,
                "meter_number": m.meter_number,
                "installation_date": (
                    m.installation_date.isoformat() if m.installation_date else None
                ),
                "status": m.status,
                "customer_id": m.customer_id,
                "customer_name": customer.customer_name if customer else "—"
            })

        print("✅ Sending meters:", meter_list)
        return jsonify(meter_list), 200
    except Exception as e:
        print("❌ Error fetching meters:", e)
        return jsonify({"error": str(e)}), 500

    
@app.route('/api/meters', methods=['POST'])
def add_meter():
    try:
        data = request.get_json()
        print("📩 Received meter data:", data)

        new_meter = Meter(
            customer_id=data.get('customer_id'),
            meter_number=data.get('meter_number'),
            installation_date=datetime.strptime(data['installation_date'], '%Y-%m-%d').date() if data.get('installation_date') else None,
            status=data.get('status', 'Active')
        )

        db.session.add(new_meter)
        db.session.commit()

        customer = Customer.query.get(new_meter.customer_id)

        response = {
            "meter_id": new_meter.meter_id,
            "meter_number": new_meter.meter_number,
            "installation_date": new_meter.installation_date.isoformat() if new_meter.installation_date else None,
            "status": new_meter.status,
            "customer_id": new_meter.customer_id,
            "customer_name": customer.customer_name if customer else "—"
        }

        print("✅ Added meter:", response)
        return jsonify(response), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Meter number already exists"}), 409
    except Exception as e:
        db.session.rollback()
        print("❌ Error saving meter:", e)
        return jsonify({"error": str(e)}), 400




@app.route('/api/meters/<int:id>', methods=['DELETE'])
def delete_meter(id):
    m = Meter.query.get_or_404(id)
    db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'Meter deleted'})

@app.route('/api/meters/<int:meter_id>', methods=['GET'])
def get_meter(meter_id):
    try:
        meter = Meter.query.get_or_404(meter_id)
        customer = Customer.query.get(meter.customer_id)
        return jsonify({
            "meter_id": meter.meter_id,
            "meter_number": meter.meter_number,
            "installation_date": (
                meter.installation_date.isoformat() if meter.installation_date else None
            ),
            "status": meter.status,
            "customer_id": meter.customer_id,
            "customer_name": customer.customer_name if customer else None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/meters/<int:meter_id>', methods=['PUT'])
def update_meter(meter_id):
    try:
        meter = Meter.query.get_or_404(meter_id)
        data = request.get_json()

        meter.meter_number = data.get('meter_number', meter.meter_number)
        meter.installation_date = data.get('installation_date', meter.installation_date)
        meter.status = data.get('status', meter.status)
        meter.customer_id = data.get('customer_id', meter.customer_id)

        db.session.commit()

        # Return updated meter + related customer name
        customer = Customer.query.get(meter.customer_id)
        return jsonify({
            'meter_id': meter.meter_id,
            'meter_number': meter.meter_number,
            'installation_date': meter.installation_date.isoformat() if hasattr(meter.installation_date, 'isoformat') else meter.installation_date,
            'status': meter.status,
            'customer_id': meter.customer_id,
            'customer_name': customer.customer_name if customer else None
        }), 200

    except Exception as e:
        db.session.rollback()
        print("❌ Error updating meter:", e)
        return jsonify({'error': str(e)}), 500




# ---- Readings ----
@app.route('/api/readings', methods=['GET'])
def get_readings():
    readings = Reading.query.all()
    return jsonify([r.to_dict() for r in readings])


@app.route('/api/readings', methods=['POST'])
def add_reading():
    try:
        data = request.get_json()

        new_reading = Reading(
            meter_id=data['meter_id'],
            reading_date=data['reading_date'],
            units_consumed=float(data['units_consumed'])
        )

        db.session.add(new_reading)
        db.session.commit()

        return jsonify(new_reading.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500




@app.route('/api/readings/<int:reading_id>', methods=['DELETE'])
def delete_reading(reading_id):
    reading = Reading.query.get_or_404(reading_id)
    db.session.delete(reading)
    db.session.commit()
    return jsonify({'message': 'Reading deleted successfully'}), 200



@app.route('/api/readings/<int:reading_id>', methods=['PUT'])
def update_reading(reading_id):
    try:
        reading = Reading.query.get_or_404(reading_id)
        data = request.get_json()

        reading.meter_id = data.get('meter_id', reading.meter_id)
        reading.reading_date = data.get('reading_date', reading.reading_date)
        reading.units_consumed = data.get('units_consumed', reading.units_consumed)

        db.session.commit()
        return jsonify(reading.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500




# ---- Bills ----
@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.query.all()
    return jsonify([b.to_dict() for b in bills])


@app.route('/api/bills', methods=['POST'])
def add_bill():
    try:
        data = request.get_json()

        new_bill = Bill(
            customer_id=data['customer_id'],
            billing_date=data['billing_date'],
            amount_due=float(data['amount_due']),
            status=data.get('status', 'Pending'),
            reading_id=data.get('reading_id')
        )

        db.session.add(new_bill)
        db.session.commit()
        return jsonify(new_bill.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/bills/<int:bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    bill = Bill.query.get_or_404(bill_id)
    db.session.delete(bill)
    db.session.commit()
    return jsonify({'message': 'Bill deleted successfully'}), 200



# ---- Health Check ----
@app.route('/api/ping')
def ping():
    return jsonify({"message": "Aiven + Flask = WORKING!", "time": datetime.now().isoformat()})


# ----------------------------------------
# ✅ Run Flask
# ----------------------------------------
if __name__ == '__main__':
    print("STARTING BACKEND...")
    app.run(host='0.0.0.0', port=5000, debug=True)
