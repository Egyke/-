
import React, { useState, useEffect, useMemo } from 'react';
import { CountryData } from '../types';

interface CountrySelectorProps {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

const CONTINENT_ZH: Record<string, string> = {
  'Africa': '非洲',
  'Americas': '美洲',
  'Asia': '亚洲',
  'Europe': '欧洲',
  'Oceania': '大洋洲',
  'Other': '其他'
};

const CountrySelector: React.FC<CountrySelectorProps> = ({ selectedIds, onToggle }) => {
  const [countries, setCountries] = useState<(CountryData & { continent: string })[]>([]);
  const [search, setSearch] = useState('');
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set(['Asia']));

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(res => res.json()),
      // 使用带翻译的数据源
      fetch('https://restcountries.com/v3.1/all?fields=name,cca3,region,translations').then(res => res.json())
    ]).then(([atlasData, metaData]) => {
      if (!isMounted) return;
      
      const geometries = atlasData.objects.countries.geometries;
      const list = geometries
        .filter((g: any) => g.id !== "010" && g.properties.name !== "Antarctica")
        .map((g: any) => {
          const englishName = g.properties.name;
          // 查找匹配的元数据以获取中文翻译
          const meta = metaData.find((m: any) => 
            m.name.common === englishName || 
            m.name.official === englishName
          );
          
          // 优先使用中文名称 (common zh)，如果没有则回退到原名
          const chineseName = meta?.translations?.zho?.common || meta?.name?.nativeName?.zho?.common || englishName;
          const continent = meta?.region || 'Other';
          
          return {
            id: String(g.id),
            name: chineseName,
            continent: continent
          };
        }).sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
      
      setCountries(list);
    }).catch(err => {
      console.error("加载国家列表出错:", err);
    });
    
    return () => { isMounted = false; };
  }, []);

  const groupedCountries = useMemo(() => {
    const groups: Record<string, typeof countries> = {};
    countries.forEach(c => {
      const continentKey = c.continent;
      if (!groups[continentKey]) groups[continentKey] = [];
      if (search === '' || c.name.toLowerCase().includes(search.toLowerCase())) {
        groups[continentKey].push(c);
      }
    });
    return groups;
  }, [countries, search]);

  const toggleContinent = (continent: string) => {
    setExpandedContinents(prev => {
      const next = new Set(prev);
      if (next.has(continent)) next.delete(continent);
      else next.add(continent);
      return next;
    });
  };

  const continents = Object.keys(groupedCountries).sort();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="relative">
        <input 
          type="text"
          placeholder="搜索国家名称..."
          className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {continents.length === 0 && countries.length > 0 && search !== '' && (
          <div className="text-center py-10 text-slate-400 text-sm">无搜索结果</div>
        )}
        {continents.map(continent => {
          const continentCountries = groupedCountries[continent];
          if (continentCountries.length === 0) return null;
          const isExpanded = expandedContinents.has(continent);
          const continentName = CONTINENT_ZH[continent] || continent;

          return (
            <div key={continent} className="group/continent">
              <button 
                onClick={() => toggleContinent(continent)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded ${
                  isExpanded ? 'text-orange-600 bg-orange-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span>{continentName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-70 px-1.5 py-0.5 bg-white border border-slate-100 rounded-full">{continentCountries.length}</span>
                  <svg 
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {isExpanded && (
                <div className="mt-1 ml-1 pl-2 border-l border-slate-200 space-y-0.5 transition-all">
                  {continentCountries.map(country => (
                    <button
                      key={country.id}
                      onClick={() => onToggle(country.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-all flex items-center justify-between group ${
                        selectedIds.has(country.id) 
                          ? 'bg-orange-100 text-orange-700 font-medium' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{country.name}</span>
                      {selectedIds.has(country.id) && (
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default CountrySelector;
