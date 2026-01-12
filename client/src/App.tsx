import React, { useState, useEffect } from 'react';
import HomePage from './components/homePage';
import CustomerPage from './components/customerPage';
import StartScreen from './components/startScreen';
import CashierPage from './components/cashierPage';
import ManagerPage from './components/managerPage';
import EmployeesPage from './components/employees';
import InventoryPage from './components/inventoryPage';
import OrderHistoryPage from './components/orderHistoryPage';
import ReportsPage from './components/generateReportPage';
import HappyHourPage from './components/happyHourPage';
import { useAuth } from './auth';

const API = 'http://localhost:8080';

type Role = 'cashier' | 'customer' | 'manager' | null;
export type ManagerOption = 'generateReport' | 'orderHistory' | 'employees' | 'inventory' | 'happyHour' | null;

const App: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [showOrder, setShowOrder] = useState(false);
  const [managerOption, setManagerOption] = useState<ManagerOption>(null);

  const { user, loading } = useAuth();

  useEffect(() => {
    const p = window.location.pathname.replace(/^\/+/, ''); 
    if (p === 'cashier' || p === 'customer' || p === 'manager') {
      setSelectedRole(p as Role);
      if (p === 'customer') setShowOrder(true);
    }
  }, []);


  const handleSelectRole = (role: 'cashier' | 'customer' | 'manager') => {
    setSelectedRole(role);
    window.history.replaceState(null, '', `/${role}`);
  };

  const handleStartOrder = () => {
    setShowOrder(true);
  };

  const handleManagerOption = (option: ManagerOption) => {
    setManagerOption(option);
  };

  // Show StartScreen 
  if (!selectedRole) {
    return <StartScreen onSelectRole={handleSelectRole} />;
  }

  // Customer flow
  if (selectedRole === 'customer') {
    if (!showOrder) {
      return <HomePage onStartOrder={handleStartOrder} />;
    }
    return <CustomerPage onOrderComplete={() => setShowOrder(false)} />;
  }

  // Cashier flow
  if (selectedRole === 'cashier') {
    return <CashierPage />;
  }

  // Manager flow
  if (selectedRole === 'manager') {
    if (loading) {
      return <div style={{ padding: 20 }}>Checking manager login…</div>;
    }

    if (!user) {
      window.location.href = `${API}/auth/google`;
      return null;
    }

    if (!user.isManager) {
      return (
        <div style={{ padding: 20 }}>
          <p>Access denied: you are not authorized as a manager.</p>
          <p>Signed in as {user.email}</p>
        </div>
      );
    }

    if (!managerOption) {
      return <ManagerPage onSelectOption={handleManagerOption} />;
    }

    if (managerOption === 'generateReport') {
      return <ReportsPage />;
    }
    if (managerOption === 'orderHistory') {
      return <OrderHistoryPage/>;
    }
    if (managerOption === 'employees') {
      return <EmployeesPage onSelectOption={handleManagerOption} />;
    }
    if (managerOption === 'inventory') {
      return <InventoryPage />;
    }

    if (managerOption == 'happyHour') {
      return <HappyHourPage onSelectOption={handleManagerOption}/>
    }
  }

  return null;
};

export default App;
