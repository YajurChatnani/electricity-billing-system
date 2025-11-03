import React, { useState, useEffect } from "react";
import { Zap, Users, Activity, FileText, Plus, Search, Edit, Trash2, Eye, DollarSign } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');


  const [customers, setCustomers] = useState([]);
  const [meters, setMeters] = useState([]);
  const [readings, setReadings] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cRes, mRes, rRes, bRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/api/customers"),
          fetch("http://127.0.0.1:5000/api/meters"),
          fetch("http://127.0.0.1:5000/api/readings"),
          fetch("http://127.0.0.1:5000/api/bills"),
        ]);

        const [customers, meters, readings, bills] = await Promise.all([
          cRes.json(),
          mRes.json(),
          rRes.json(),
          bRes.json(),
        ]);

        setCustomers(customers);
        setMeters(meters);
        setReadings(readings);
        setBills(bills);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchAll();
  }, []);
  
  // Sample data
  // const [customers] = useState([
  //   { id: 1, name: 'John Smith', address: '123 Main St, City', phone: '555-0101', type: 'Residential', email: 'john@email.com' },
  //   { id: 2, name: 'Sarah Johnson', address: '456 Oak Ave, Town', phone: '555-0102', type: 'Commercial', email: 'sarah@email.com' },
  //   { id: 3, name: 'Mike Brown', address: '789 Pine Rd, Village', phone: '555-0103', type: 'Residential', email: 'mike@email.com' },
  // ]);

  // const [meters] = useState([
  //   { id: 1, customerId: 1, meterNumber: 'MTR-2024-001', installDate: '2024-01-15', status: 'Active' },
  //   { id: 2, customerId: 2, meterNumber: 'MTR-2024-002', installDate: '2024-02-20', status: 'Active' },
  //   { id: 3, customerId: 3, meterNumber: 'MTR-2024-003', installDate: '2024-03-10', status: 'Active' },
  // ]);

  // const [readings] = useState([
  //   { id: 1, meterId: 1, date: '2024-10-01', current: 5420, previous: 5120, consumed: 300 },
  //   { id: 2, meterId: 2, date: '2024-10-01', current: 8950, previous: 8450, consumed: 500 },
  //   { id: 3, meterId: 3, date: '2024-10-01', current: 3280, previous: 3030, consumed: 250 },
  // ]);

  // const [bills] = useState([
  //   { id: 1, customerId: 1, billDate: '2024-10-05', dueDate: '2024-10-20', units: 300, rate: 0.12, amount: 36.00, status: 'Paid' },
  //   { id: 2, customerId: 2, billDate: '2024-10-05', dueDate: '2024-10-20', units: 500, rate: 0.15, amount: 75.00, status: 'Pending' },
  //   { id: 3, customerId: 3, billDate: '2024-10-05', dueDate: '2024-10-20', units: 250, rate: 0.12, amount: 30.00, status: 'Overdue' },
  // ]);

  const stats = [
    { title: 'Total Customers', value: customers.length, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { title: 'Active Meters', value: meters.filter(m => m.status === 'Active').length, icon: Zap, color: 'from-purple-500 to-pink-500' },
    { title: 'Monthly Revenue', value: `$${bills.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { title: 'Pending Bills', value: bills.filter(b => b.status === 'Pending').length, icon: FileText, color: 'from-orange-500 to-red-500' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">{stat.title}</p>
                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Recent Readings
          </h3>
          <div className="space-y-3">
            {readings.slice(0, 3).map(reading => (
              <div key={reading.id} className="bg-gray-900 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Meter #{reading.meterId}</p>
                    <p className="text-gray-400 text-sm">{reading.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-bold">{reading.consumed} kWh</p>
                    <p className="text-gray-500 text-sm">Consumed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" />
            Recent Bills
          </h3>
          <div className="space-y-3">
            {bills.slice(0, 3).map(bill => (
              <div key={bill.id} className="bg-gray-900 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Bill #{bill.id}</p>
                    <p className="text-gray-400 text-sm">{bill.billDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">${bill.amount.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      bill.status === 'Paid' ? 'bg-green-500/20 text-green-400' :
                      bill.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-cyan-400" />
          Customers
        </h2>
        <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50">
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Address</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Phone</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Type</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="py-4 px-4 text-white">{customer.id}</td>
                <td className="py-4 px-4 text-white font-medium">{customer.name}</td>
                <td className="py-4 px-4 text-gray-300">{customer.address}</td>
                <td className="py-4 px-4 text-gray-300">{customer.phone}</td>
                <td className="py-4 px-4">
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                    {customer.type}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMeters = () => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-7 h-7 text-purple-400" />
          Meters
        </h2>
        <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50">
          <Plus className="w-5 h-5" />
          Add Meter
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Meter ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Meter Number</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Customer</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Install Date</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meters.map(meter => {
              const customer = customers.find(c => c.id === meter.customerId);
              return (
                <tr key={meter.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="py-4 px-4 text-white">{meter.id}</td>
                  <td className="py-4 px-4 text-white font-medium">{meter.meterNumber}</td>
                  <td className="py-4 px-4 text-gray-300">{customer?.name}</td>
                  <td className="py-4 px-4 text-gray-300">{meter.installDate}</td>
                  <td className="py-4 px-4">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                      {meter.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReadings = () => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-7 h-7 text-cyan-400" />
          Meter Readings
        </h2>
        <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50">
          <Plus className="w-5 h-5" />
          Add Reading
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Reading ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Meter</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Previous</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Current</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Consumed</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {readings.map(reading => (
              <tr key={reading.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="py-4 px-4 text-white">{reading.id}</td>
                <td className="py-4 px-4 text-white font-medium">MTR-{reading.meterId}</td>
                <td className="py-4 px-4 text-gray-300">{reading.date}</td>
                <td className="py-4 px-4 text-gray-300">{reading.previous} kWh</td>
                <td className="py-4 px-4 text-gray-300">{reading.current} kWh</td>
                <td className="py-4 px-4">
                  <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-bold">
                    {reading.consumed} kWh
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBills = () => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-green-400" />
          Bills
        </h2>
        <button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50">
          <Plus className="w-5 h-5" />
          Generate Bill
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Bill ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Customer</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Bill Date</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Due Date</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Units</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Amount</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => {
              const customer = customers.find(c => c.id === bill.customerId);
              return (
                <tr key={bill.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="py-4 px-4 text-white">{bill.id}</td>
                  <td className="py-4 px-4 text-white font-medium">{customer?.name}</td>
                  <td className="py-4 px-4 text-gray-300">{bill.billDate}</td>
                  <td className="py-4 px-4 text-gray-300">{bill.dueDate}</td>
                  <td className="py-4 px-4 text-gray-300">{bill.units} kWh</td>
                  <td className="py-4 px-4 text-green-400 font-bold">${bill.amount.toFixed(2)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bill.status === 'Paid' ? 'bg-green-500/20 text-green-400' :
                      bill.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 rounded-xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">PowerFlow</h1>
                <p className="text-gray-400 text-sm">Electricity Billing System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-64"
                />
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800/30 backdrop-blur-lg border-b border-gray-700">
        <div className="container mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'meters', label: 'Meters', icon: Zap },
              { id: 'readings', label: 'Readings', icon: Activity },
              { id: 'bills', label: 'Bills', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'meters' && renderMeters()}
        {activeTab === 'readings' && renderReadings()}
        {activeTab === 'bills' && renderBills()}
      </main>
    </div>
  );
}