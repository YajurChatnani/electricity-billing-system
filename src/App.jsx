import React, { useState, useEffect, useRef } from "react";
import { Zap, Users, Activity, FileText, Plus, Search, Edit, Trash2, Eye, DollarSign } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Main application component for the PowerFlow UI
// - Handles state for customers, meters, readings and bills
// - Contains modal flows (add/edit/view) and CRUD handlers that call the Flask backend
// - Keep this file focused on UI; backend logic lives in backend/app.py (do not modify)

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');


  const [customers, setCustomers] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
    phone: "",
    type: "Residential",
  });
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

const handleDeleteCustomer = async (customerId) => {
  if (!window.confirm("Are you sure you want to delete this customer?")) return;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/customers/${customerId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // show friendly message when customer has linked meters
      if (res.status === 400 && err.error) {
        alert(err.error);
        return;
      }
      throw new Error(err.error || "Failed to delete customer");
    }

    // remove from local state
    setCustomers(prev => prev.filter(c => c.customer_id !== customerId));
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    alert("Failed to delete customer. See console for details.");
  }
};



  const [meters, setMeters] = useState([]);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [newMeter, setNewMeter] = useState({
    meter_number: "",
    customer_id: "",
    installation_date: "",
    status: "Active",
  });
  const [showEditMeter, setShowEditMeter] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);

  // Use this instead of the old handleDeleteMeter
const handleDeleteMeter = async (meterId) => {
  if (!window.confirm("Are you sure you want to delete this meter?")) return;

  try {
    const res = await fetch(`http://127.0.0.1:5000/api/meters/${meterId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // show friendly message when meter has linked readings
      if (res.status === 400 && err.error) {
        alert(err.error);
        return;
      }
      throw new Error(err.error || 'Failed to delete meter on server');
    }

    // remove from local state by backend key
    setMeters(prev => prev.filter(m => m.meter_id !== meterId));
  } catch (e) {
    console.error('Error deleting meter:', e);
    alert('Failed to delete meter. See console for details.');
  }
};


  const [readings, setReadings] = useState([]);
  const [showAddReading, setShowAddReading] = useState(false);
  const [showEditReading, setShowEditReading] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [newReading, setNewReading] = useState({
    meter_id: "",
    date: "",
    current: "",
    previous: "",
  });

  const handleDeleteReading = (id) => {
    // Deletes a reading by id with a confirmation prompt.
    // The backend will return HTTP 400 if the reading is referenced by any bills;
    // we surface that message to the user instead of silently failing.
    if (!window.confirm("Are you sure you want to delete this reading?")) return;

    (async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/readings/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          // show friendly message when reading is linked to bills
          if (res.status === 400 && err.error) {
            alert(err.error);
            return;
          }
          throw new Error(err.error || 'Failed to delete reading');
        }

        // remove from local state (handle both sample keys and backend keys)
        setReadings(prev => prev.filter(r => (r.reading_id ?? r.id) !== id && String(r.reading_id ?? r.id) !== String(id)));
      } catch (e) {
        console.error('❌ Error deleting reading:', e);
        alert('Failed to delete reading. See console for details.');
      }
    })();
  };

  const [bills, setBills] = useState([]);
  const [showGenerateBill, setShowGenerateBill] = useState(false);
  const [showEditBill, setShowEditBill] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  // view modal state for Eye buttons (read-only)
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPayload, setViewPayload] = useState({ type: null, item: null });
  const [newBill, setNewBill] = useState({
    customer_id: "",
    reading_id: "", // optional: pick a reading to base bill date on
    billing_date: "",
    due_date: "", // allow user to enter due date
    units: "",
    rate: "",
    status: "Pending"
  });


  // Normalize bill objects from backend or local samples so frontend uses
  // consistent keys: bill_id, customer_id, billing_date, due_date, units, amount_due, status
  const normalizeBill = (b) => {
    if (!b) return b;
    return {
      bill_id: b?.bill_id ?? b?.id ?? null,
      customer_id: b?.customer_id ?? b?.customerId ?? b?.customer ?? null,
      billing_date: b?.billing_date ?? b?.billDate ?? b?.billingDate ?? null,
      due_date: b?.due_date ?? b?.dueDate ?? null,
      units: b?.units ?? b?.units_consumed ?? b?.units_consumed ?? 0,
      amount_due: (b?.amount_due ?? b?.amount ?? 0),
      status: b?.status ?? 'Pending',
    };
  };

  const handleDeleteBill = async (id) => {
  if (!window.confirm("Are you sure you want to delete this bill?")) return;

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/bills/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to delete bill");
    }

    setBills((prev) => prev.filter((b) => b.bill_id !== id));
  } catch (err) {
    console.error("❌ Error deleting bill:", err);
    alert("Failed to delete bill.");
  }
};


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
        setBills(bills.map(normalizeBill));
      } catch (err) {
        console.error("Error fetching data:", err);
        // Backend unavailable — populate lightweight sample data that matches current schema
        setSampleData();
      }
    };

    fetchAll();
  }, []);
  
  // Helper to populate local fallback/sample data when the backend is unreachable
  const setSampleData = () => {
    const sampleCustomers = [
      { id: 1, customer_id: 1, customer_name: 'Rudransh Pratap Singh', name: 'Rudransh Pratap Singh', address: 'Block A, City', phone: '999-0001', type: 'Residential', email: 'rudransh@example.com' },
      { id: 2, customer_id: 2, customer_name: 'Yajur Chatnani', name: 'Yajur Chatnani', address: 'Block B, City', phone: '999-0002', type: 'Residential', email: 'yajur@example.com' },
      { id: 3, customer_id: 3, customer_name: 'Shreyanshi', name: 'Shreyanshi', address: 'Block C, City', phone: '999-0003', type: 'Commercial', email: 'shreyanshi@example.com' },
      { id: 4, customer_id: 4, customer_name: 'Anik', name: 'Anik', address: 'Block D, City', phone: '999-0004', type: 'Residential', email: 'anik@example.com' },
    ];

    const sampleMeters = [
      { id: 1, meter_id: 1, customer_id: 1, meter_number: 'MTR-1001', installation_date: '2024-01-15', status: 'Active', customer_name: 'Rudransh Pratap Singh' },
      { id: 2, meter_id: 2, customer_id: 2, meter_number: 'MTR-1002', installation_date: '2024-02-20', status: 'Active', customer_name: 'Yajur Chatnani' },
      { id: 3, meter_id: 3, customer_id: 3, meter_number: 'MTR-1003', installation_date: '2024-03-10', status: 'Active', customer_name: 'Shreyanshi' },
      { id: 4, meter_id: 4, customer_id: 4, meter_number: 'MTR-1004', installation_date: '2024-04-05', status: 'Active', customer_name: 'Anik' },
    ];

    const sampleReadings = [
      { id: 1, reading_id: 1, meter_id: 1, reading_date: '2024-10-01', units_consumed: 300 },
      { id: 2, reading_id: 2, meter_id: 2, reading_date: '2024-10-01', units_consumed: 450 },
      { id: 3, reading_id: 3, meter_id: 3, reading_date: '2024-10-01', units_consumed: 250 },
      { id: 4, reading_id: 4, meter_id: 4, reading_date: '2024-10-01', units_consumed: 350 },
    ];

    const generateYearlyBills = () => {
      const bills = [];
      const currentDate = new Date();
      let id = 1;

      for (let i = 11; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);

        sampleCustomers.forEach(customer => {
          const units = Math.floor(Math.random() * 400) + 200;
          const rate = customer.type === 'Commercial' ? 0.15 : 0.12;
          const amount = units * rate;
          const statusRandom = Math.random();
          let status;
          if (i < 2) {
            status = statusRandom < 0.6 ? 'Pending' : 'Paid';
          } else if (i < 4) {
            status = statusRandom < 0.8 ? 'Paid' : statusRandom < 0.9 ? 'Pending' : 'Overdue';
          } else {
            status = statusRandom < 0.95 ? 'Paid' : 'Overdue';
          }

          bills.push({
            id: id++,
            customer_id: customer.id,
            billDate: month.toISOString().split('T')[0],
            dueDate: new Date(month.getFullYear(), month.getMonth(), 15).toISOString().split('T')[0],
            units,
            rate,
            amount,
            status,
          });
        });
      }
      return bills;
    };

    setCustomers(sampleCustomers);
    setMeters(sampleMeters);
    setReadings(sampleReadings);
    setBills(generateYearlyBills().map(normalizeBill));
  };

  const stats = [
    { title: 'Total Customers', value: customers.length, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { title: 'Active Meters', value: meters.filter(m => m.status === 'Active').length, icon: Zap, color: 'from-purple-500 to-pink-500' },
    { title: 'Monthly Revenue', value: `$${(bills.reduce((sum, b) => sum + (b.amount_due ?? 0), 0)).toFixed(2)}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { title: 'Pending Bills', value: bills.filter(b => b.status === 'Pending').length, icon: FileText, color: 'from-orange-500 to-red-500' },
  ];

  // Navigation tabs declaration with per-tab accent colors (used for rendering and indicator)
  const navTabs = [
    // Dashboard should render white accent in navigation
    { id: 'dashboard', label: 'Dashboard', icon: Activity, color: '#ffffff' }, // white
    { id: 'customers', label: 'Customers', icon: Users, color: '#06b6d4' }, // cyan
    { id: 'meters', label: 'Meters', icon: Zap, color: '#a78bfa' }, // purple
    { id: 'readings', label: 'Readings', icon: Activity, color: '#34d399' }, // green
    { id: 'bills', label: 'Bills', icon: FileText, color: '#fb923c' }, // orange
  ];

  // Refs and state for advanced animated indicator (spring-like) under the nav
  const navRef = useRef(null);
  const btnRefs = useRef({});

  // indicator holds the currently rendered position/size/color
  const [indicator, setIndicator] = useState({ left: 0, width: 0, color: navTabs[0].color, glow: 0.9 });
  // target is the destination the spring will animate towards
  const targetRef = useRef({ left: 0, width: 0, color: navTabs[0].color, glow: 0.9 });
  const animRef = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;

  // hold a ref to the currently rendered indicator so RAF loop doesn't close over stale state
  const indicatorRef = useRef({ left: 0, width: 0, color: navTabs[0].color, glow: 0.9 });

  const findButtonElement = (tabId) => {
    const refEl = btnRefs.current[tabId];
    if (refEl) return refEl;
    const navEl = navRef.current;
    if (!navEl) return null;
    return navEl.querySelector(`[data-tab="${tabId}"]`);
  };

  const updateIndicator = (tabId) => {
    const btn = findButtonElement(tabId);
    const navEl = navRef.current;
    if (btn && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const left = btnRect.left - navRect.left + navEl.scrollLeft + 6; // small inset for futuristic padding
      const width = Math.max(36, btnRect.width - 12);
      const tab = navTabs.find(t => t.id === tabId) || navTabs[0];
      targetRef.current = { left, width, color: tab.color, glow: 0.95 };
    }
  };

  useEffect(() => {
    // Start a single RAF loop that eases the visible indicator toward the target (spring/lerp)
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;

      const cur = indicatorRef.current;
      const tgt = targetRef.current;
      const t = 1 - Math.pow(0.001, dt * 60);

      const nextLeft = lerp(cur.left || 0, tgt.left || 0, t);
      const nextWidth = lerp(cur.width || 0, tgt.width || 0, t);
      const nextGlow = lerp((cur.glow ?? 0.9), (tgt.glow ?? 0.9), t);
      const nextColor = tgt.color !== cur.color ? tgt.color : cur.color;

      if (Math.abs(nextLeft - (cur.left||0)) > 0.3 || Math.abs(nextWidth - (cur.width||0)) > 0.3 || nextColor !== cur.color || Math.abs(nextGlow - (cur.glow||0)) > 0.01) {
        const next = { left: nextLeft, width: nextWidth, color: nextColor, glow: nextGlow };
        indicatorRef.current = next;
        setIndicator(next);
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    const onResize = () => updateIndicator(activeTab);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // update destination when activeTab changes
    updateIndicator(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customers.length]);
  // Content crossfade on tab change
  const [contentVisible, setContentVisible] = useState(true);
  useEffect(() => {
    // fade out then in for a soft transition
    setContentVisible(false);
    const t = setTimeout(() => setContentVisible(true), 140);
    return () => clearTimeout(t);
  }, [activeTab]);

  // Chart data processing functions
  const processRevenueData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = Array(12).fill(0);
    
    bills.forEach(bill => {
      const billDate = bill.billing_date;
      const amount = bill.amount_due ?? 0;

      if (billDate) {
        const month = new Date(billDate).getMonth();
        monthlyRevenue[month] += amount;
      }

    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Monthly Revenue',
          data: monthlyRevenue,
          borderColor: 'rgb(56, 189, 248)',
          backgroundColor: 'rgba(56, 189, 248, 0.5)',
          tension: 0.3,
        },
      ],
    };
  };

  const processConsumptionData = () => {
    const consumptionByType = {
      Residential: 0,
      Commercial: 0,
    };

    bills.forEach(bill => {
      const customer = customers.find(c => c.id === bill.customer_id || c.customer_id === bill.customer_id);
      if (customer) {
        const units = bill.units ?? 0;
        consumptionByType[customer.type] += units;
      }
    });

    return {
      labels: Object.keys(consumptionByType),
      datasets: [
        {
          data: Object.values(consumptionByType),
          backgroundColor: [
            'rgba(56, 189, 248, 0.8)',
            'rgba(168, 85, 247, 0.8)',
          ],
          borderColor: [
            'rgb(56, 189, 248)',
            'rgb(168, 85, 247)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const processPaymentStatusData = () => {
    const statusCount = {
      Paid: 0,
      Pending: 0,
      Overdue: 0,
    };

    bills.forEach(bill => {
      statusCount[bill.status]++;
    });

    return {
      labels: Object.keys(statusCount),
      datasets: [
        {
          data: Object.values(statusCount),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(234, 179, 8)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      y: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
      },
      x: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
          },
        },
      },
    },
  };

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-cyan-400" />
            Revenue Trend
          </h3>
          <div className="h-[300px]">
            <Line data={processRevenueData()} options={chartOptions} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" />
            Consumption by Type
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut data={processConsumptionData()} options={doughnutOptions} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Payment Status
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut data={processPaymentStatusData()} options={doughnutOptions} />
          </div>
        </div>
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
                    <p className="text-white font-medium">Meter #{reading.meter_id}</p>
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
              <div key={bill.bill_id} className="bg-gray-900 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">Bill #{bill.bill_id}</p>
                    <p className="text-gray-400 text-sm">
                      {bill.billing_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold"> ${ (bill.amount_due ?? 0).toFixed(2) } </p>
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
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50"
        >
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
            {customers.map((customer) => (
              <tr key={customer.customer_id ?? customer.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="py-4 px-4 text-white">{customer.customer_id ?? customer.id}</td>
                <td className="py-4 px-4 text-white font-medium">{customer?.customer_name || customer?.name || '—'}</td>
                <td className="py-4 px-4 text-gray-300">{customer.address}</td>
                <td className="py-4 px-4 text-gray-300">{customer.phone}</td>
                <td className="py-4 px-4">
                  <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm">
                    {customer.type || 'Residential'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button
                      className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                      onClick={() => { setViewPayload({ type: 'customer', item: customer }); setShowViewModal(true); }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                      onClick={() => {
                        const normalized = {
                          ...customer,
                          name: customer.customer_name ?? customer.name,
                          customer_name: customer.customer_name ?? customer.name,
                        };
                        setEditingCustomer(normalized);
                        setShowEditCustomer(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      onClick={() => handleDeleteCustomer(customer.customer_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Add New Customer</h3>
            </div>
            <form
  onSubmit={async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:5000/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: newCustomer.name, // ✅ match Flask key
          address: newCustomer.address,
          phone: newCustomer.phone,
          type: newCustomer.type || 'Residential',
        }),
      });

      if (!response.ok) throw new Error("Failed to add customer");
      const savedCustomer = await response.json();

      // update local state so UI refreshes immediately using backend keys
      setCustomers(prev => [...prev, savedCustomer]);

      setShowAddCustomer(false);
      setNewCustomer({ name: "", address: "", phone: "", type: "Residential" });
    } catch (err) {
      console.error("Error adding customer:", err);
      alert("Failed to save customer to database.");
    }
  }}
>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Address</label>
                  <input
                    type="text"
                    placeholder="Enter complete address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="text"
                    placeholder="Enter phone number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Customer Type</label>
                  <select
                    value={newCustomer.type}
                    onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all outline-none cursor-pointer"
                  >
                    <option>Residential</option>
                    <option>Commercial</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-cyan-500/50"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditCustomer && editingCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 rounded-lg">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Edit Customer</h3>
            </div>

            <form
              onSubmit={async (e) => {
  e.preventDefault();
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/customers/${editingCustomer.customer_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: editingCustomer.name || editingCustomer.customer_name,
        address: editingCustomer.address,
        phone: editingCustomer.phone,
        type: editingCustomer.type || editingCustomer?.type || 'Residential',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update customer");
    }

    const updated = await response.json();

    // ✅ Update local state with backend data
    setCustomers(prev =>
      prev.map(c =>
        c.customer_id === updated.customer_id
          ? {
              ...c,
              customer_name: updated.customer_name,
              address: updated.address,
              phone: updated.phone,
              type: updated.type,
            }
          : c
      )
    );

    setShowEditCustomer(false);
    setEditingCustomer(null);
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    alert("Failed to update customer.");
  }
}}

            >
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Address</label>
                  <input
                    type="text"
                    value={editingCustomer.address}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, address: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Phone</label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Type</label>
                  <select
                    value={editingCustomer.type}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, type: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none cursor-pointer"
                  >
                    <option>Residential</option>
                    <option>Commercial</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCustomer(false);
                    setEditingCustomer(null);
                  }}
                  className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-green-500/50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

    </div>
  );

const renderMeters = () => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Zap className="w-7 h-7 text-purple-400" />
        Meters
      </h2>
      <button
        onClick={() => setShowAddMeter(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50"
      >
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
          {meters.map((meter) => (
            <tr
              key={meter.meter_id}
              className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
            >
              <td className="py-4 px-4 text-white">{meter.meter_id}</td>
              <td className="py-4 px-4 text-white font-medium">{meter.meter_number}</td>
              <td className="py-4 px-4 text-gray-300">
                {meter.customer_name || "—"}
              </td>
              <td className="py-4 px-4 text-gray-300">{meter.installation_date}</td>
              <td className="py-4 px-4">
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  {meter.status}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <button
                    className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                    onClick={() => { setViewPayload({ type: 'meter', item: meter }); setShowViewModal(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                    onClick={() => {
                      setEditingMeter(meter);
                      setShowEditMeter(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    onClick={() => handleDeleteMeter(meter.meter_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* ---- Add Meter Modal ---- */}
    {showAddMeter && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Add New Meter</h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch("http://127.0.0.1:5000/api/meters", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customer_id: newMeter.customer_id,
                    meter_number: newMeter.meter_number,
                    installation_date: newMeter.installation_date,
                    status: newMeter.status,
                  }),
                });

                if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.error || "Failed to add meter");
                }

                const savedMeter = await response.json();
                const normalized = {
                  meter_id: savedMeter.meter_id,
                  meter_number: savedMeter.meter_number,
                  installation_date: savedMeter.installation_date,
                  status: savedMeter.status,
                  customer_id: savedMeter.customer_id,
                  customer_name: savedMeter.customer_name,
                };

                setMeters([...meters, normalized]);
                setShowAddMeter(false);
                setNewMeter({
                  meter_number: "",
                  customer_id: "",
                  installation_date: "",
                  status: "Active",
                });
              } catch (err) {
                console.error("❌ Error adding meter:", err);
                alert("Failed to save meter to database.");
              }
            }}
          >
            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Meter Number</label>
                <input
                  type="text"
                  placeholder="e.g., MTR-2024-004"
                  value={newMeter.meter_number}
                  onChange={(e) => setNewMeter({ ...newMeter, meter_number: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Customer</label>
                <select
                  value={newMeter.customer_id}
                  onChange={(e) => setNewMeter({ ...newMeter, customer_id: parseInt(e.target.value) })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none cursor-pointer"
                >
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Install Date</label>
                <input
                  type="date"
                  value={newMeter.installation_date}
                  onChange={(e) => setNewMeter({ ...newMeter, installation_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Status</label>
                <select
                  value={newMeter.status}
                  onChange={(e) => setNewMeter({ ...newMeter, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none cursor-pointer"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowAddMeter(false)}
                className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-purple-500/50"
              >
                Add Meter
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ---- Edit Meter Modal ---- */}
    {showEditMeter && editingMeter && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Edit Meter</h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await fetch(`http://127.0.0.1:5000/api/meters/${editingMeter.meter_id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customer_id: editingMeter.customer_id,
                    meter_number: editingMeter.meter_number,
                    installation_date: editingMeter.installation_date,
                    status: editingMeter.status,
                  }),
                });

                if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.error || "Failed to update meter");
                }

                const updated = await response.json();

                // Update in state
                setMeters((prev) =>
                  prev.map((m) => (m.meter_id === updated.meter_id ? updated : m))
                );

                setShowEditMeter(false);
                setEditingMeter(null);
              } catch (err) {
                console.error("❌ Error updating meter:", err);
                alert("Failed to update meter.");
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Meter Number</label>
                <input
                  type="text"
                  value={editingMeter.meter_number}
                  onChange={(e) => setEditingMeter({ ...editingMeter, meter_number: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Customer</label>
                <select
                  value={editingMeter.customer_id}
                  onChange={(e) => setEditingMeter({ ...editingMeter, customer_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Install Date</label>
                <input
                  type="date"
                  value={editingMeter.installation_date}
                  onChange={(e) => setEditingMeter({ ...editingMeter, installation_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Status</label>
                <select
                  value={editingMeter.status}
                  onChange={(e) => setEditingMeter({ ...editingMeter, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none cursor-pointer"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowEditMeter(false);
                  setEditingMeter(null);
                }}
                className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-purple-500/50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);


const renderReadings = () => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Activity className="w-7 h-7 text-green-400" />
        Meter Readings
      </h2>
      <button
        onClick={() => setShowAddReading(true)}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
      >
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
            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Units (kWh)</th>
            <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={reading.reading_id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
              <td className="py-4 px-4 text-white">{reading.reading_id}</td>
              <td className="py-4 px-4 text-white font-medium">MTR-{reading.meter_id}</td>
              <td className="py-4 px-4 text-gray-300">{reading.reading_date}</td>
              <td className="py-4 px-4">
                <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold">
                  {reading.units_consumed} kWh
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <button
                    className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                    onClick={() => { setViewPayload({ type: 'reading', item: reading }); setShowViewModal(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                    onClick={() => {
                      // ensure editingReading shape matches backend keys
                      setEditingReading({
                        reading_id: reading.reading_id,
                        meter_id: reading.meter_id,
                        reading_date: reading.reading_date,
                        units_consumed: reading.units_consumed,
                      });
                      setShowEditReading(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    onClick={() => handleDeleteReading(reading.reading_id || reading.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* ---- Add Reading Modal ---- */}
    {showAddReading && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Add New Reading</h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Normalize payload to backend fields
                const payload = {
                  meter_id: parseInt(newReading.meter_id),
                  reading_date: newReading.reading_date,
                  units_consumed: parseFloat(newReading.units_consumed),
                };

                const response = await fetch("http://127.0.0.1:5000/api/readings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.error || "Failed to add reading");
                }

                const saved = await response.json();

                // ensure local state uses backend keys
                setReadings((prev) => [...prev, {
                  reading_id: saved.reading_id,
                  meter_id: saved.meter_id,
                  reading_date: saved.reading_date,
                  units_consumed: saved.units_consumed,
                }]);

                setShowAddReading(false);
                setNewReading({ meter_id: "", reading_date: "", units_consumed: "" });
              } catch (err) {
                console.error("❌ Error adding reading:", err);
                alert("Failed to save reading.");
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Meter</label>
                <select
                  value={newReading.meter_id || ""}
                  onChange={(e) => setNewReading({ ...newReading, meter_id: parseInt(e.target.value) || "" })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none cursor-pointer"
                >
                  <option value="">Select a meter</option>
                  {meters.map((meter) => (
                    <option key={meter.meter_id} value={meter.meter_id}>
                      MTR-{meter.meter_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Reading Date</label>
                <input
                  type="date"
                  value={newReading.reading_date || ""}
                  onChange={(e) => setNewReading({ ...newReading, reading_date: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Units Consumed (kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newReading.units_consumed || ""}
                  onChange={(e) => setNewReading({ ...newReading, units_consumed: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowAddReading(false);
                  setNewReading({ meter_id: "", reading_date: "", units_consumed: "" });
                }}
                className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-green-500/50"
              >
                Add Reading
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ---- Edit Reading Modal ---- */}
    {showEditReading && editingReading && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Edit Reading</h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  meter_id: parseInt(editingReading.meter_id),
                  reading_date: editingReading.reading_date,
                  units_consumed: parseFloat(editingReading.units_consumed),
                };

                const response = await fetch(`http://127.0.0.1:5000/api/readings/${editingReading.reading_id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  throw new Error(errData.error || "Failed to update reading");
                }

                const updated = await response.json();

                setReadings((prev) =>
                  prev.map((r) => (r.reading_id === updated.reading_id ? updated : r))
                );

                setShowEditReading(false);
                setEditingReading(null);
              } catch (err) {
                console.error("❌ Error updating reading:", err);
                alert("Failed to update reading.");
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Meter</label>
                <select
                  value={editingReading.meter_id || ""}
                  onChange={(e) =>
                    setEditingReading({ ...editingReading, meter_id: parseInt(e.target.value) || "" })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none cursor-pointer"
                >
                  {meters.map((meter) => (
                    <option key={meter.meter_id} value={meter.meter_id}>
                      MTR-{meter.meter_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Reading Date</label>
                <input
                  type="date"
                  value={editingReading.reading_date || ""}
                  onChange={(e) => setEditingReading({ ...editingReading, reading_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Units Consumed (kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingReading.units_consumed || ""}
                  onChange={(e) => setEditingReading({ ...editingReading, units_consumed: e.target.value })}
                  min="0"
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowEditReading(false);
                  setEditingReading(null);
                }}
                className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-green-500/50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);


  const renderBills = () => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-orange-400" />
          Bills
        </h2>
        <button 
          onClick={() => setShowGenerateBill(true)}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/50"
        >
          <Plus className="w-5 h-5" />
          Generate Bill
        </button>
      </div>

      {showGenerateBill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Generate New Bill</h3>
            </div>
            <form
  onSubmit={async (e) => {
  e.preventDefault();

  try {
    const today = new Date();

    // billing_date: prefer reading's date if a reading was selected
    let billingDate = today.toISOString().split("T")[0];
    if (newBill.reading_id) {
      const reading = readings.find(r => String(r.reading_id || r.id) === String(newBill.reading_id));
      if (reading) {
        billingDate = reading.reading_date || reading.date || billingDate;
      }
    }

    // due_date: use user input if set; otherwise default to 15th of current month
    const dueDate = newBill.due_date && newBill.due_date.length ? newBill.due_date : new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];

    // Require a reading selection now
    if (!newBill.reading_id) {
      alert('Please select a reading.');
      return;
    }

    const reading = readings.find(r => String(r.reading_id || r.id) === String(newBill.reading_id));
    if (!reading) {
      alert('Selected reading not found.');
      return;
    }

    const unitsVal = parseFloat(reading.units_consumed ?? reading.consumed ?? reading.units ?? 0) || 0;
    const rateVal = parseFloat(newBill.rate) || 0;
    const amountDueVal = unitsVal * rateVal;

    const payload = {
      customer_id: parseInt(newBill.customer_id),
      billing_date: billingDate,
      due_date: dueDate,
      reading_id: newBill.reading_id || null,
      units: unitsVal,
      amount_due: amountDueVal,
      status: newBill.status,
    };

    const response = await fetch("http://127.0.0.1:5000/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to generate bill");
    }

    const savedBill = await response.json();
    // normalize saved bill shape before adding
    setBills((prev) => [...prev, normalizeBill(savedBill)]);
    setShowGenerateBill(false);
  setNewBill({ customer_id: "", reading_id: "", billing_date: "", due_date: "", units: "", rate: "", status: "Pending" });
  } catch (err) {
    console.error("❌ Error generating bill:", err);
    alert("Failed to generate bill.");
  }
 }}
>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Customer</label>
                  <select
  value={newBill.customer_id}
  onChange={(e) => setNewBill({ ...newBill, customer_id: e.target.value })}
  required
  className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all outline-none cursor-pointer"
>
  <option value="">Select a customer</option>
  {customers.map((customer) => (
    <option key={customer.customer_id} value={customer.customer_id}>
      {customer.customer_name}
    </option>
  ))}
</select>

                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Reading (required)</label>
                  <select
                    value={newBill.reading_id}
                    required
                    onChange={(e) => {
                      const rid = e.target.value;
                      const reading = readings.find(r => String(r.reading_id || r.id) === String(rid));
                      setNewBill({
                        ...newBill,
                        reading_id: rid,
                        billing_date: reading ? (reading.reading_date || reading.date) : newBill.billing_date
                      });
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all outline-none cursor-pointer"
                  >
                    <option value="">Select a reading</option>
                    {readings.map(r => (
                      <option key={r.reading_id || r.id} value={r.reading_id || r.id}>
                        {`Reading #${r.reading_id || r.id} — ${ (r.reading_date || r.date) || '—' }`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newBill.due_date || ''}
                    onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all outline-none"
                  />
                </div>
                {/* units input removed - units are imported from selected reading */}
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Rate per Unit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter rate per unit"
                    value={newBill.rate}
                    onChange={(e) => setNewBill({ ...newBill, rate: e.target.value })}
                    required
                    min="0"
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2">Status</label>
                  <select
                    value={newBill.status}
                    onChange={(e) => setNewBill({ ...newBill, status: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all outline-none cursor-pointer"
                  >
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowGenerateBill(false)}
                  className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all duration-300 font-medium shadow-lg hover:shadow-orange-500/50"
                >
                  Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            {bills.map((bill) => {
              const customer = customers.find((c) => c.customer_id === bill.customer_id || c.id === bill.customer_id);
              return (
                <tr key={bill.bill_id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="py-4 px-4 text-white">{bill.bill_id}</td>
                  <td className="py-4 px-4 text-white font-medium">{customer?.customer_name || customer?.name || "—"}</td>
                  <td className="py-4 px-4 text-gray-300">{bill.billing_date}</td>
                  <td className="py-4 px-4 text-gray-300">{bill.due_date || '—'}</td>
                  <td className="py-4 px-4 text-white">{(bill.units ?? 0)}</td>
                  <td className="py-4 px-4 text-green-400 font-bold">${((bill.amount_due ?? 0)).toFixed(2)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bill.status === 'Paid'
                        ? 'bg-green-500/20 text-green-400'
                        : bill.status === 'Pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                                    <button
                                      className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
                                      onClick={() => { setViewPayload({ type: 'bill', item: bill }); setShowViewModal(true); }}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingBill(bill);
                                        setShowEditBill(true);
                                      }}
                                      className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBill(bill.bill_id)}
                                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                    >
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

  {/* ---- Edit Bill Modal ---- */}
  const renderEditBillModal = () => (
    showEditBill && editingBill ? (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-2 rounded-lg">
              <Edit className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Edit Bill</h3>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const payload = {
                billing_date: editingBill.billing_date,
                due_date: editingBill.due_date,
                reading_id: editingBill.reading_id || null,
                units: parseFloat(editingBill.units) || 0,
                amount_due: parseFloat(editingBill.amount_due ?? editingBill.amount_due) || 0,
                status: editingBill.status,
              };

              const res = await fetch(`http://127.0.0.1:5000/api/bills/${editingBill.bill_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update bill');
              }

              const updated = await res.json();
              setBills(prev => prev.map(b => (b.bill_id === updated.bill_id ? normalizeBill(updated) : b)));
              setShowEditBill(false);
              setEditingBill(null);
            } catch (err) {
              console.error('❌ Error updating bill:', err);
              alert('Failed to update bill.');
            }
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Billing Date</label>
                <input type="date" value={editingBill.billing_date || ''} onChange={(e)=>setEditingBill({...editingBill, billing_date: e.target.value})} className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Due Date</label>
                <input type="date" value={editingBill.due_date || ''} onChange={(e)=>setEditingBill({...editingBill, due_date: e.target.value})} className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Units</label>
                <input type="number" step="0.01" value={editingBill.units ?? ''} onChange={(e)=>setEditingBill({...editingBill, units: e.target.value})} className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Amount Due</label>
                <input type="number" step="0.01" value={(editingBill.amount_due ?? '')} onChange={(e)=>setEditingBill({...editingBill, amount_due: e.target.value})} className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Status</label>
                <select value={editingBill.status} onChange={(e)=>setEditingBill({...editingBill, status: e.target.value})} className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 outline-none cursor-pointer">
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={()=>{setShowEditBill(false); setEditingBill(null);}} className="px-6 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600">Cancel</button>
              <button type="submit" className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-white">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    ) : null
  );

  const renderViewModal = () => (
    showViewModal && viewPayload && viewPayload.item ? (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">{viewPayload.type?.toUpperCase()} Details</h3>
            <button className="text-gray-400 hover:text-white" onClick={() => { setShowViewModal(false); setViewPayload({ type: null, item: null }); }}>
              Close
            </button>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            {viewPayload.type === 'customer' && (
              <div>
                <p className="text-white font-medium">{viewPayload.item.customer_name || viewPayload.item.name}</p>
                <p>Address: {viewPayload.item.address || '—'}</p>
                <p>Phone: {viewPayload.item.phone || '—'}</p>
                <p>Type: {viewPayload.item.type || 'Residential'}</p>
              </div>
            )}

            {viewPayload.type === 'meter' && (
              <div>
                <p className="text-white font-medium">Meter #{viewPayload.item.meter_id}</p>
                <p>Number: {viewPayload.item.meter_number}</p>
                <p>Customer: {viewPayload.item.customer_name || viewPayload.item.customer_id}</p>
                <p>Install Date: {viewPayload.item.installation_date || '—'}</p>
                <p>Status: {viewPayload.item.status || '—'}</p>
              </div>
            )}

            {viewPayload.type === 'reading' && (
              <div>
                <p className="text-white font-medium">Reading #{viewPayload.item.reading_id}</p>
                <p>Meter ID: {viewPayload.item.meter_id}</p>
                <p>Date: {viewPayload.item.reading_date || viewPayload.item.date}</p>
                <p>Units: {viewPayload.item.units_consumed ?? viewPayload.item.consumed ?? '—'}</p>
              </div>
            )}

            {viewPayload.type === 'bill' && (
              <div>
                <p className="text-white font-medium">Bill #{viewPayload.item.bill_id}</p>
                <p>Customer ID: {viewPayload.item.customer_id}</p>
                <p>Bill Date: {viewPayload.item.billing_date}</p>
                <p>Due Date: {viewPayload.item.due_date || '—'}</p>
                <p>Units: {viewPayload.item.units ?? 0}</p>
                <p>Amount: ${((viewPayload.item.amount_due ?? viewPayload.item.amount) || 0).toFixed ? ((viewPayload.item.amount_due ?? viewPayload.item.amount) || 0).toFixed(2) : (viewPayload.item.amount_due ?? viewPayload.item.amount)}</p>
                <p>Status: {viewPayload.item.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 group hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur rounded-xl"></div>
                  <Zap className="w-8 h-8 text-white relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
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
          <div className="flex gap-1 justify-center">
            <div ref={navRef} className="relative w-full max-w-4xl">
              <div className="flex justify-center gap-1 relative">
                {navTabs.map(tab => {
                  const activeClass = activeTab === tab.id
                    ? (
                      tab.id === 'dashboard' ? 'text-white bg-gray-800/50' :
                      tab.id === 'customers' ? 'text-cyan-400 bg-gray-800/50' :
                      tab.id === 'meters' ? 'text-purple-400 bg-gray-800/50' :
                      tab.id === 'readings' ? 'text-green-400 bg-gray-800/50' :
                      'text-orange-400 bg-gray-800/50'
                    )
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/30';

                  return (
                    <button
                      key={tab.id}
                      data-tab={tab.id}
                      ref={(el) => (btnRefs.current[tab.id] = el)}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 transform ${activeClass} rounded-t-md`}
                    >
                      <tab.icon className={`w-5 h-5 transition-transform transition-colors duration-300 ${activeTab === tab.id ? 'scale-110 -translate-y-0.5 text-current' : 'text-gray-300'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Futuristic sliding indicator: blurred glow + core bar (animated via RAF loop) */}
              <div
                aria-hidden
                className="absolute bottom-0 rounded-full pointer-events-none"
                style={{
                  left: `${indicator.left - 8}px`,
                  width: `${indicator.width + 16}px`,
                  height: '14px',
                  background: `radial-gradient(ellipse at center, ${indicator.color} 0%, rgba(0,0,0,0) 60%)`,
                  filter: `blur(${Math.max(8, (1 - (indicator.glow||0.9)) * 20)}px)`,
                  opacity: Math.min(1, indicator.glow || 0.9),
                  transition: 'filter 300ms linear, opacity 250ms linear',
                }}
              />

              <div
                aria-hidden
                className="absolute bottom-1.5 h-1.5 rounded-full pointer-events-none"
                style={{
                  left: `${indicator.left}px`,
                  width: `${indicator.width}px`,
                  background: `linear-gradient(90deg, ${indicator.color}, rgba(255,255,255,0.08))`,
                  boxShadow: `0 6px 20px ${indicator.color}44, 0 2px 6px ${indicator.color}33`,
                  transform: 'translateZ(0)',
                }}
              />

              {/* mouse-follow orb removed per user request */}
            </div>
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
      {renderEditBillModal()}
      {renderViewModal()}
    </div>
  );
}