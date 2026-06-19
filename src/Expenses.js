import React, { useState } from 'react';

const Expenses = () => {
    const [expense, setExpense] = useState({
        category: '',
        amount: '',
        date: '',
        description: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Yahan aap API call karenge
        console.log("Saving Expense:", expense);
    };

    return (
        <div className="p-6 bg-white shadow rounded">
            <h2 className="text-xl font-bold mb-4">Expense Entry Form</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <input 
                    type="text" 
                    placeholder="Expense Category" 
                    className="border p-2"
                    onChange={(e) => setExpense({...expense, category: e.target.value})}
                />
                <input 
                    type="number" 
                    placeholder="Amount" 
                    className="border p-2"
                    onChange={(e) => setExpense({...expense, amount: e.target.value})}
                />
                <button className="bg-blue-600 text-white p-2 rounded">Save Expense</button>
            </form>
        </div>
    );
};

export default Expenses;