import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gift, Cake, Heart, Calendar as CalendarIcon, List, CalendarDays,
  Search, Maximize2, MapPin, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';

const TABS = [
  { id: 'all',       label: 'All'       },
  { id: 'customers', label: 'Customers' },
  { id: 'staff',     label: 'Staff'     },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Local YYYY-MM-DD (not UTC) so "today" matches the user's calendar day
const localISO = (d) => d.toLocaleDateString('en-CA');
const pad = (n) => String(n).padStart(2, '0');

const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase();

export default function CelebrationHubPage() {
  const { lookups } = useLookups();

  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [occasion, setOccasion] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [view, setView]         = useState('list');
  const [month, setMonth]       = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });

  const [data, setData]       = useState([]);
  const [stats, setStats]     = useState({ today: 0, upcoming: 0 });
  const [counts, setCounts]   = useState({ all: 0, customers: 0, staff: 0 });
  const [range, setRange]     = useState({ custom: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { type: tab, search, occasion, branchId, today: localISO(new Date()) };
      if (view === 'calendar') {
        const last = new Date(month.y, month.m + 1, 0).getDate();
        params.dateFrom = `${month.y}-${pad(month.m + 1)}-01`;
        params.dateTo   = `${month.y}-${pad(month.m + 1)}-${pad(last)}`;
      } else {
        params.dateFrom = dateFrom;
        params.dateTo   = dateTo;
      }
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/celebrations', { params });
      setData(res.data.data);
      setStats(res.data.stats);
      setCounts(res.data.counts);
      setRange(res.data.range);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load celebrations');
    } finally { setLoading(false); }
  }, [tab, search, occasion, branchId, dateFrom, dateTo, view, month]);

  // Debounce so typing in search doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const todayItems    = useMemo(() => data.filter((e) => e.daysAway === 0), [data]);
  const upcomingItems = useMemo(() => data.filter((e) => e.daysAway !== 0), [data]);

  const shiftMonth = (delta) =>
    setMonth(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Celebration Hub</h1>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Milestones &amp; Wishes
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Customer birthdays, wedding anniversaries &amp; festive engagement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TODAY'S CELEBRATIONS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{stats.today}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center">
              <Cake className="w-3.5 h-3.5 text-pink-500" />
            </span>
          </div>

          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={List} label="List" />
            <ViewButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarDays} label="Calendar" />
          </div>

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={Cake} tint="bg-pink-50 text-pink-500"
          label="Today" value={`${stats.today} ${stats.today === 1 ? 'Celebration' : 'Celebrations'}`}
        />
        <SummaryCard
          icon={CalendarIcon} tint="bg-blue-50 text-blue-500"
          label="Next 7 Days" value={`${stats.upcoming} Upcoming`}
        />
        <SummaryCard
          icon={Gift} tint="bg-amber-50 text-amber-500"
          label="Wishes Status" value="WhatsApp not connected" small
        />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.label}{t.id === 'all' ? ` (${counts.all})` : ''}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or code..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className={SELECT}>
          <option value="">All Occasions</option>
          <option value="BIRTHDAY">Birthday</option>
          <option value="ANNIVERSARY">Anniversary</option>
        </select>

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${SELECT} min-w-[180px]`}>
          <option value="">All Branches</option>
          {lookups.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {view === 'list' && (
          <>
            <DateBox label="FROM" value={dateFrom} onChange={setDateFrom} />
            <DateBox label="TO"   value={dateTo}   onChange={setDateTo} />
          </>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {/* List view */}
      {view === 'list' && !loading && (
        <>
          {data.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">No celebrations found</p>
          )}
          {todayItems.length > 0 && <Section title="TODAY" items={todayItems} />}
          {upcomingItems.length > 0 && (
            <Section title={range.custom ? 'IN RANGE' : 'UPCOMING (7 DAYS)'} items={upcomingItems} />
          )}
        </>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <MonthGrid month={month} items={data} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
      )}
    </div>
  );
}

function Section({ title, items }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-l-4 border-pink-500 pl-3">
        <h2 className="text-xs font-bold text-gray-800 tracking-[0.2em]">{title}</h2>
        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((e) => <CelebrationCard key={e.id} entry={e} />)}
      </div>
    </section>
  );
}

function CelebrationCard({ entry }) {
  const Icon = entry.occasion === 'BIRTHDAY' ? Cake : Heart;
  const isCustomer = entry.kind === 'CUSTOMER';
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 min-h-[170px]">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-md shadow-pink-200">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-[10px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border ${
          isCustomer ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-indigo-600 bg-indigo-50 border-indigo-200'
        }`}>
          {entry.kind}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 uppercase truncate">{entry.name}</p>
        {entry.branch && (
          <p className="flex items-center gap-1 text-[11px] text-gray-400 uppercase mt-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" /> {entry.branch}
          </p>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 mt-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-pink-600" />
        {dayLabel(entry.date)}
        <span className="font-semibold text-gray-400 tracking-wide">· {entry.occasion}</span>
      </p>
    </div>
  );
}

function MonthGrid({ month, items, onPrev, onNext }) {
  const first    = new Date(month.y, month.m, 1);
  const daysIn   = new Date(month.y, month.m + 1, 0).getDate();
  const offset   = first.getDay();
  const todayStr = localISO(new Date());

  const byDay = useMemo(() => {
    const map = {};
    for (const e of items) {
      const d = new Date(e.date).getUTCDate();
      (map[d] ||= []).push(e);
    }
    return map;
  }, [items]);

  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <button onClick={onPrev} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-gray-900">{MONTHS[month.m]} {month.y}</h3>
        <button onClick={onNext} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-gray-400 tracking-wide uppercase text-center py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayItems = day ? byDay[day] || [] : [];
          const isToday = day && `${month.y}-${pad(month.m + 1)}-${pad(day)}` === todayStr;
          return (
            <div key={i} className="min-h-[92px] border-b border-r border-gray-100 p-1.5">
              {day && (
                <>
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-pink-500 text-white font-bold' : 'text-gray-500'
                  }`}>{day}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayItems.slice(0, 3).map((e) => (
                      <p key={e.id} title={`${e.name} · ${e.occasion}`}
                        className="text-[10px] truncate rounded px-1 py-0.5 bg-pink-50 text-pink-700 font-medium">
                        {e.name}
                      </p>
                    ))}
                    {dayItems.length > 3 && <p className="text-[10px] text-gray-400 px-1">+{dayItems.length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, tint, label, value, small }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`font-bold text-gray-900 ${small ? 'text-sm mt-0.5' : 'text-lg font-mono'}`}>{value}</p>
      </div>
    </div>
  );
}

function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function DateBox({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <span className="text-[10px] font-bold text-gray-400 tracking-wide">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs text-gray-700 focus:outline-none" />
    </label>
  );
}

const SELECT = 'rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400';
