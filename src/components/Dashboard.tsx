import { useEffect, useState } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, CreditCard, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export function Dashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [viewDimension, setViewDimension] = useState<'family' | 'member'>('family');
  const [viewMetric, setViewMetric] = useState<'netWorth' | 'assets' | 'liabilities' | 'overview'>('overview');
  const [viewPeriod, setViewPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [eventsData, setEventsData] = useState<{events: any[], renqing: any[], benefitUsages: any[], insurancePayments: any[]}>({events: [], renqing: [], benefitUsages: [], insurancePayments: []});

  useEffect(() => {
    fetch('/api/families').then(res => res.json()).then(setFamilies);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({ month: selectedMonth });
    if (selectedFamily) query.append('familyId', selectedFamily);
    fetch(`/api/dashboard/summary?${query.toString()}`).then(res => res.json()).then(setSummary);
    
    fetch(`/api/dashboard/events?month=${selectedMonth}`).then(res => res.json()).then(setEventsData);
  }, [selectedMonth, selectedFamily]);

  useEffect(() => {
    const query = new URLSearchParams({ groupBy: viewDimension, period: viewPeriod });
    if (selectedFamily) query.append('familyId', selectedFamily);
    fetch(`/api/dashboard/trend?${query.toString()}`)
      .then(res => res.json())
      .then(setTrend);
  }, [viewDimension, viewPeriod, selectedFamily]);

  const changeMonth = (delta: number) => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + delta);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  if (!summary) return <div>{t('common.loading')}</div>;

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
  
  // Group assets by category for pie chart
  const assetsByCategory = summary.breakdown
    .filter((r: any) => r.type === 'ASSET')
    .reduce((acc: any, curr: any) => {
      const existing = acc.find((a: any) => a.name === curr.category_name);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category_name, value: curr.amount });
      }
      return acc;
    }, []);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.fill }} />
              <span className="text-gray-600">{t(`categories.${data.name}`, { defaultValue: data.name }) as string}</span>
            </div>
            <span className="font-mono font-medium text-gray-900">
              {formatCurrency(data.value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}</span>
                </div>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (viewDimension === 'family') {
      if (viewMetric === 'overview') {
        return (
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `¥${val/1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="assets" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" name={t('dashboard.assets')} />
            <Area type="monotone" dataKey="liabilities" stroke="#EF4444" strokeWidth={2} fill="none" name={t('dashboard.liabilities')} />
          </AreaChart>
        );
      } else {
        // Single line for specific metric
        const dataKey = viewMetric === 'netWorth' ? 'net_worth' : viewMetric;
        const color = viewMetric === 'liabilities' ? '#EF4444' : '#4F46E5';
        const name = t(`dashboard.${viewMetric === 'netWorth' ? 'netWorth' : viewMetric}`);
        
        return (
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `¥${val/1000}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{r: 4}} name={name} />
          </LineChart>
        );
      }
    } else {
      // Member view
      // Get all member names from the first data point keys
      const memberNames = trend.length > 0 
        ? Object.keys(trend[0])
            .filter(key => key !== 'month' && key !== 'name' && key !== 'time_period')
            .map(key => key.split('_')[0])
            .filter((value, index, self) => self.indexOf(value) === index) // Unique names
        : [];

      const suffix = viewMetric === 'overview' ? '_net_worth' : (viewMetric === 'netWorth' ? '_net_worth' : `_${viewMetric}`);

      return (
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `¥${val/1000}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {memberNames.map((member, index) => (
            <Line 
              key={member} 
              type="monotone" 
              dataKey={`${member}${suffix}`} 
              stroke={COLORS[index % COLORS.length]} 
              strokeWidth={2}
              dot={{r: 4}}
              name={member}
            />
          ))}
        </LineChart>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h2>
          <p className="text-gray-500">{t('dashboard.subtitle')}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Family Selector */}
          {families.length > 0 && (
            <div className="relative">
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="appearance-none bg-white pl-10 pr-8 py-2 rounded-xl shadow-sm border border-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('families.allFamilies')}</option>
                {families.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          )}

          {/* Month Picker for Snapshot */}
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-mono font-medium text-lg w-32 text-center">
              {format(new Date(selectedMonth + '-01'), 'MMM yyyy')}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ... (KPI Cards content remains same, just ensuring context) ... */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm font-medium text-gray-400">{t('dashboard.netWorth')}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(summary.netWorth)}</div>
          <div className="mt-2 text-sm text-gray-500">{t('dashboard.totalAssets')} - {t('dashboard.totalLiabilities')}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Wallet size={20} />
            </div>
            <span className="text-sm font-medium text-gray-400">{t('dashboard.totalAssets')}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalAssets)}</div>
          <div className="mt-2 text-sm text-emerald-600 flex items-center">
            <ArrowUpRight size={16} className="mr-1" />
            {t('dashboard.assets')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <CreditCard size={20} />
            </div>
            <span className="text-sm font-medium text-gray-400">{t('dashboard.totalLiabilities')}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalLiabilities)}</div>
          <div className="mt-2 text-sm text-red-600 flex items-center">
            <ArrowDownRight size={16} className="mr-1" />
            {t('dashboard.liabilities')}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.trend')}</h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Period Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex items-center self-start">
                  <button 
                    onClick={() => setViewPeriod('week')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewPeriod === 'week' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('common.week') || 'Week'}
                  </button>
                  <button 
                    onClick={() => setViewPeriod('month')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewPeriod === 'month' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('common.month') || 'Month'}
                  </button>
                  <button 
                    onClick={() => setViewPeriod('quarter')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewPeriod === 'quarter' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('common.quarter') || 'Quarter'}
                  </button>
                  <button 
                    onClick={() => setViewPeriod('year')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewPeriod === 'year' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('common.year') || 'Year'}
                  </button>
                </div>

                {/* Dimension Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex items-center self-start">
                  <button 
                    onClick={() => setViewDimension('family')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewDimension === 'family' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('dashboard.viewFamily')}
                  </button>
                  <button 
                    onClick={() => setViewDimension('member')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all", 
                      viewDimension === 'member' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {t('dashboard.viewMember')}
                  </button>
                </div>
              </div>
            </div>

            {/* Metric Toggle - Full width on mobile */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center self-start overflow-x-auto max-w-full">
              <button 
                onClick={() => setViewMetric('overview')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap", 
                  viewMetric === 'overview' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t('common.overview') || 'Overview'}
              </button>
              <button 
                onClick={() => setViewMetric('netWorth')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap", 
                  viewMetric === 'netWorth' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t('dashboard.viewNetWorth')}
              </button>
              <button 
                onClick={() => setViewMetric('assets')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap", 
                  viewMetric === 'assets' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t('dashboard.viewTotalAssets')}
              </button>
              <button 
                onClick={() => setViewMetric('liabilities')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap", 
                  viewMetric === 'liabilities' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t('dashboard.viewTotalLiabilities')}
              </button>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.allocation')}</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetsByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {assetsByCategory.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {t(`categories.${entry.name}`, { defaultValue: entry.name }) as string}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Events & Renqing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('record.events')}</h3>
          {eventsData.events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('record.noEvents')}</p>
          ) : (
            <div className="space-y-4">
              {eventsData.events.map((event: any) => (
                <div key={event.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <p className="text-xs text-gray-500">{event.event_date}</p>
                  {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Renqing */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('record.renqingRecords')}</h3>
          {eventsData.renqing.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('record.noRenqing')}</p>
          ) : (
            <div className="space-y-4">
              {eventsData.renqing.map((r: any) => (
                <div key={r.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        r.type === 'IN' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {r.type === 'IN' ? t('renqing.received') : t('renqing.given')}
                      </span>
                      <span className="font-medium text-gray-900">{r.person}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{r.event} - {r.item}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-mono font-medium",
                      r.type === 'IN' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {r.type === 'IN' ? '+' : '-'}¥{r.amount}
                    </div>
                    <div className="text-xs text-gray-400">{r.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Benefit Usages */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('benefits.usages') || 'Benefit Usages'}</h3>
          {eventsData.benefitUsages?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('benefits.noUsages') || 'No benefit usages this month'}</p>
          ) : (
            <div className="space-y-4">
              {eventsData.benefitUsages?.map((u: any) => (
                <div key={u.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <h4 className="font-medium text-gray-900">{u.benefit_name}</h4>
                  <p className="text-xs text-gray-500">{u.usage_date}</p>
                  {u.notes && <p className="text-sm text-gray-600 mt-1">{u.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insurance Payments */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('insurance.payments') || 'Insurance Payments'}</h3>
          {eventsData.insurancePayments?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('insurance.noPayments') || 'No insurance payments this month'}</p>
          ) : (
            <div className="space-y-4">
              {eventsData.insurancePayments?.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <h4 className="font-medium text-gray-900">{p.policy_name}</h4>
                    <p className="text-xs text-gray-500">{p.payment_date}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium text-red-600">
                      -{p.currency} {p.amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
