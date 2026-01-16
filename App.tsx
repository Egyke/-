
import React, { useState, useRef } from 'react';
import MapView, { MapViewHandle } from './components/MapView';
import CountrySelector from './components/CountrySelector';
import { GoogleGenAI, Type } from "@google/genai";

interface City {
  name: string;
  lat: number;
  lng: number;
  note?: string;
}

const App: React.FC = () => {
  const [selectedCountryIds, setSelectedCountryIds] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<City[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // 视觉配置
  const [countryColor, setCountryColor] = useState('#f97316');
  const [cityColor, setCityColor] = useState('#ef4444');
  const [textColor, setTextColor] = useState('#1e293b');
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [fontSize, setFontSize] = useState(12);

  const mapRef = useRef<MapViewHandle>(null);

  const handleToggleCountry = (id: string) => {
    setSelectedCountryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim() || isLocating) return;

    setIsLocating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `查找 "${cityInput}" 的经纬度坐标。如果输入包含备注信息（例如：上海 - 出差），请将城市名和备注分开。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "城市中文名" },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              note: { type: Type.STRING, description: "备注内容" }
            },
            required: ["name", "lat", "lng"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setCities(prev => [...prev, result]);
      setCityInput('');
    } catch (err) {
      console.error("定位失败:", err);
      alert("无法解析。请尝试格式: '城市名' 或 '城市名 - 备注'");
    } finally {
      setIsLocating(false);
    }
  };

  const removeCity = (index: number) => {
    setCities(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white font-sans text-slate-900 overflow-hidden">
      <aside className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col z-10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            全球探索地图
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {/* 视觉自定义 */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">视觉自定义</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>国家颜色</span>
                <input type="color" value={countryColor} onChange={(e) => setCountryColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>标注点颜色</span>
                <input type="color" value={cityColor} onChange={(e) => setCityColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>文字颜色</span>
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">字体家族</span>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white outline-none"
                >
                  <option value="sans-serif">无衬线 (Sans-serif)</option>
                  <option value="serif">衬线 (Serif)</option>
                  <option value="monospace">等宽 (Monospace)</option>
                  <option value="cursive">手写 (Cursive)</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>字体大小</span>
                  <span>{fontSize}px</span>
                </div>
                <input 
                  type="range" min="8" max="24" step="1" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </section>

          {/* 城市备注 */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">城市与备注</h3>
            <form onSubmit={handleAddCity} className="flex flex-col gap-2">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="城市 - 备注"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              />
              <button
                disabled={isLocating}
                className="w-full py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 disabled:opacity-50"
              >
                {isLocating ? '正在查询...' : '添加位置标注'}
              </button>
            </form>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {cities.map((city, i) => (
                <div key={i} className="flex justify-between items-start p-2 bg-white border border-slate-200 rounded text-[10px]">
                  <div>
                    <div className="font-bold text-slate-700">{city.name}</div>
                    {city.note && <div className="text-slate-400 italic mt-0.5">{city.note}</div>}
                  </div>
                  <button onClick={() => removeCity(i)} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                </div>
              ))}
            </div>
          </section>

          {/* 国家列表 */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">选择国家区域</h3>
            <CountrySelector selectedIds={selectedCountryIds} onToggle={handleToggleCountry} />
          </section>
        </div>

        <div className="p-5 border-t border-slate-200 space-y-2 bg-slate-100/30">
          <button 
            onClick={mapRef.current?.exportToPng}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            导出高清 PNG 地图
          </button>
          <button 
            onClick={() => { setSelectedCountryIds(new Set()); setCities([]); }}
            className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-medium transition-colors"
          >
            清空所有图层
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 relative overflow-hidden flex items-center justify-center p-6">
        <MapView 
          ref={mapRef} 
          selectedCountryIds={selectedCountryIds} 
          onCountryClick={handleToggleCountry}
          cities={cities}
          config={{
            countryColor,
            cityPointColor: cityColor,
            textColor,
            fontFamily,
            fontSize
          }}
        />
        
        <div className="absolute top-4 right-4 flex gap-4 text-[10px] bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: countryColor}}></div>
            <span className="text-slate-500">已点亮</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: cityColor}}></div>
            <span className="text-slate-500">地点标注</span>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;
