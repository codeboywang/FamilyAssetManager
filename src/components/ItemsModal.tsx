import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ItemsModalProps {
  account: any;
  initialItems: any[];
  onSave: (items: any[]) => void;
  onClose: () => void;
}

export default function ItemsEditor({ account, initialItems, onSave, onClose }: ItemsModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>(initialItems || []);

  // Update items when initialItems changes
  useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);

  const handleAddItem = () => {
    const newItem: any = { id: Date.now(), currency: account.currency };
    
    // Inherit fields from main account if applicable
    if (account.category_name === 'Loans') {
      newItem.lender = account.name || '';
      newItem.interest_rate = account.loan_interest_rate || '';
      newItem.terms = account.loan_term_months || '';
      newItem.start_date = account.loan_start_date || '';
    }
    
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    onSave(newItems); // Auto-save on remove
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto calculate amount for loans
    if (account.category_name === 'Loans' && (field === 'repayment_principal' || field === 'repayment_interest')) {
      const principal = parseFloat(newItems[index].repayment_principal || '0');
      const interest = parseFloat(newItems[index].repayment_interest || '0');
      newItems[index].amount = (principal + interest).toString();
    }
    
    setItems(newItems);
    onSave(newItems); // Auto-save on change
  };

  const handleSave = () => {
    onSave(items);
  };

  const renderFields = (item: any, index: number) => {
    const category = account.category_name;
    
    const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm";
    
    // Default fields for all
    let fields = (
      <>
        <div className="col-span-1">
          <label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label>
          <input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} placeholder="CNY" />
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-gray-500 mb-1">{t('common.amount') || 'Amount'}</label>
          <input type="number" className={inputClass} value={item.amount || ''} onChange={e => handleChange(index, 'amount', e.target.value)} placeholder="0.00" />
        </div>
      </>
    );

    if (category === 'Time Deposits') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.platform') || 'Platform'}</label><input type="text" className={inputClass} value={item.platform || ''} onChange={e => handleChange(index, 'platform', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label><input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.interestRate') || 'Interest Rate'}</label><input type="text" className={inputClass} value={item.interest_rate || ''} onChange={e => handleChange(index, 'interest_rate', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.startDate') || 'Start Date'}</label><input type="date" className={inputClass} value={item.start_date || ''} onChange={e => handleChange(index, 'start_date', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.term') || 'Term'}</label><input type="text" className={inputClass} value={item.term || ''} onChange={e => handleChange(index, 'term', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('common.amount') || 'Amount'}</label><input type="number" className={inputClass} value={item.amount || ''} onChange={e => handleChange(index, 'amount', e.target.value)} /></div>
        </>
      );
    } else if (category === 'Investment Insurance') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('insurance.company') || 'Company'}</label><input type="text" className={inputClass} value={item.company || ''} onChange={e => handleChange(index, 'company', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('insurance.productName') || 'Product Name'}</label><input type="text" className={inputClass} value={item.product_name || ''} onChange={e => handleChange(index, 'product_name', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('insurance.productType') || 'Product Type'}</label><input type="text" className={inputClass} value={item.product_type || ''} onChange={e => handleChange(index, 'product_type', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('common.amount') || 'Amount'}</label><input type="number" className={inputClass} value={item.amount || ''} onChange={e => handleChange(index, 'amount', e.target.value)} /></div>
        </>
      );
    } else if (category === 'Funds') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.platform') || 'Platform'}</label><input type="text" className={inputClass} value={item.platform || ''} onChange={e => handleChange(index, 'platform', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.productName') || 'Product Name'}</label><input type="text" className={inputClass} value={item.product_name || ''} onChange={e => handleChange(index, 'product_name', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('record.units') || 'Shares/Units'}</label><input type="number" className={inputClass} value={item.shares || ''} onChange={e => handleChange(index, 'shares', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label><input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.currentValue') || 'Current Value'}</label><input type="number" className={inputClass} value={item.current_value || ''} onChange={e => handleChange(index, 'current_value', e.target.value)} /></div>
        </>
      );
    } else if (category === 'Stocks') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.broker') || 'Broker'}</label><input type="text" className={inputClass} value={item.broker || ''} onChange={e => handleChange(index, 'broker', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.stockCode') || 'Stock Code'}</label><input type="text" className={inputClass} value={item.stock_code || ''} onChange={e => handleChange(index, 'stock_code', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('record.shares') || 'Shares'}</label><input type="number" className={inputClass} value={item.shares || ''} onChange={e => handleChange(index, 'shares', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label><input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.currentValue') || 'Current Value'}</label><input type="number" className={inputClass} value={item.current_value || ''} onChange={e => handleChange(index, 'current_value', e.target.value)} /></div>
        </>
      );
    } else if (category === 'Loans') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.lender') || 'Lender'}</label><input type="text" className={inputClass} value={item.lender || ''} onChange={e => handleChange(index, 'lender', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.startDate') || 'Start Date'}</label><input type="date" className={inputClass} value={item.start_date || ''} onChange={e => handleChange(index, 'start_date', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.repaymentDay') || 'Repayment Day'}</label><input type="number" min="1" max="31" className={inputClass} value={item.repayment_day || ''} onChange={e => handleChange(index, 'repayment_day', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.terms') || 'Terms'}</label><input type="text" className={inputClass} value={item.terms || ''} onChange={e => handleChange(index, 'terms', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.interestRate') || 'Interest Rate'}</label><input type="text" className={inputClass} value={item.interest_rate || ''} onChange={e => handleChange(index, 'interest_rate', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label><input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.totalAmount') || 'Total Amount'}</label><input type="number" className={inputClass} value={item.total_amount || ''} onChange={e => handleChange(index, 'total_amount', e.target.value)} /></div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">{t('assets.repaymentMethod') || 'Repayment Method'}</label>
            <select className={inputClass} value={item.repayment_method || ''} onChange={e => handleChange(index, 'repayment_method', e.target.value)}>
              <option value="">{t('common.select') || 'Select...'}</option>
              <option value="equalPrincipal">{t('assets.methods.equalPrincipal') || 'Equal Principal'}</option>
              <option value="equalInstallment">{t('assets.methods.equalInstallment') || 'Equal Installment'}</option>
            </select>
          </div>
          
          <div className="col-span-4 mt-2 mb-1 border-t pt-2"><span className="text-xs font-semibold text-gray-700">{t('record.inventoryDetails') || 'Inventory Details'}</span></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('record.repaymentPrincipal') || 'Principal'}</label><input type="number" className={inputClass} value={item.repayment_principal || ''} onChange={e => handleChange(index, 'repayment_principal', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('record.repaymentInterest') || 'Interest'}</label><input type="number" className={inputClass} value={item.repayment_interest || ''} onChange={e => handleChange(index, 'repayment_interest', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('record.monthlyRepayment') || 'Monthly Repayment'}</label><input type="number" className={cn(inputClass, "bg-gray-50")} value={(parseFloat(item.repayment_principal || '0') + parseFloat(item.repayment_interest || '0')) || ''} readOnly /></div>
        </>
      );
    } else if (category === 'Receivables') {
      fields = (
        <>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.borrower') || 'Borrower'}</label><input type="text" className={inputClass} value={item.borrower || ''} onChange={e => handleChange(index, 'borrower', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.currency') || 'Currency'}</label><input type="text" className={inputClass} value={item.currency || ''} onChange={e => handleChange(index, 'currency', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('common.amount') || 'Amount'}</label><input type="number" className={inputClass} value={item.amount || ''} onChange={e => handleChange(index, 'amount', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.interestRate') || 'Interest Rate'}</label><input type="text" className={inputClass} value={item.interest_rate || ''} onChange={e => handleChange(index, 'interest_rate', e.target.value)} /></div>
          <div className="col-span-1"><label className="block text-xs text-gray-500 mb-1">{t('assets.startDate') || 'Start Date'}</label><input type="date" className={inputClass} value={item.start_date || ''} onChange={e => handleChange(index, 'start_date', e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('assets.endDate') || 'End Date'}</label><input type="date" className={inputClass} value={item.end_date || ''} onChange={e => handleChange(index, 'end_date', e.target.value)} /></div>
        </>
      );
    }

    return (
      <div key={item.id || index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
        <button 
          onClick={() => handleRemoveItem(index)}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={16} />
        </button>
        <div className="grid grid-cols-4 gap-4 pr-8">
          {fields}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{t('common.editDetails') || 'Details'}</h3>
        </div>
        <button
          onClick={handleAddItem}
          className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          {t('common.add') || 'Add'}
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => renderFields(item, index))}
        {items.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-lg border border-dashed border-gray-200">
            {t('common.noRecords') || 'No records found.'}
          </div>
        )}
      </div>
    </div>
  );
}
