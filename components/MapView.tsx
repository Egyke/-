
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

interface City {
  name: string;
  lat: number;
  lng: number;
  note?: string;
}

interface MapViewProps {
  selectedCountryIds: Set<string>;
  onCountryClick: (id: string) => void;
  cities: City[];
  config: {
    countryColor: string;
    cityPointColor: string;
    textColor: string;
    fontFamily: string;
    fontSize: number;
  };
}

export interface MapViewHandle {
  exportToPng: () => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ selectedCountryIds, onCountryClick, cities, config }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    exportToPng: () => {
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgSize = svgRef.current.getBoundingClientRect();
      const scale = 2; 
      canvas.width = svgSize.width * scale;
      canvas.height = svgSize.height * scale;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `world-travel-map-${new Date().getTime()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        }
      };
      img.src = url;
    }
  }));

  useEffect(() => {
    Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(res => res.json()),
      fetch('https://restcountries.com/v3.1/all?fields=name,cca3,translations').then(res => res.json())
    ])
      .then(([atlasData, metaData]) => {
        const countries = feature(atlasData, atlasData.objects.countries) as any;
        countries.features = countries.features.filter((f: any) => f.id !== "010" && f.properties.name !== "Antarctica");
        const mapping: Record<string, string> = {};
        countries.features.forEach((f: any) => {
          const englishName = f.properties.name;
          const meta = metaData.find((m: any) => m.name.common === englishName || m.name.official === englishName);
          mapping[f.id] = meta?.translations?.zho?.common || englishName;
        });
        setNameMap(mapping);
        setWorldData(countries);
      });
  }, []);

  useEffect(() => {
    if (!worldData || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
      
    svg.selectAll('*').remove();

    const projection = d3.geoEquirectangular()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2 + (height * 0.1)]);

    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    // 背景
    g.append('rect')
      .attr('width', width * 5)
      .attr('height', height * 5)
      .attr('x', -width * 2)
      .attr('y', -height * 2)
      .attr('fill', '#ffffff');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // 绘制国家
    g.selectAll<SVGPathElement, any>('.country')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path as any)
      .attr('fill', (d: any) => selectedCountryIds.has(String(d.id)) ? config.countryColor : '#e2e8f0')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', '0.5px')
      .style('cursor', 'pointer')
      .on('mousemove', function(event, d: any) {
        d3.select(this).attr('opacity', 0.8);
        if (tooltipRef.current) {
          const zhName = nameMap[d.id] || d.properties.name;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = (event.pageX + 15) + 'px';
          tooltipRef.current.style.top = (event.pageY + 15) + 'px';
          tooltipRef.current.innerText = zhName;
        }
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      })
      .on('click', (event, d: any) => onCountryClick(String(d.id)));

    // 绘制城市标注
    const cityGroups = g.selectAll('.city-label')
      .data(cities)
      .enter()
      .append('g')
      .attr('class', 'city-label');

    cityGroups.append('circle')
      .attr('cx', d => projection([d.lng, d.lat])?.[0] || 0)
      .attr('cy', d => projection([d.lng, d.lat])?.[1] || 0)
      .attr('r', 3.5)
      .attr('fill', config.cityPointColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    const labels = cityGroups.append('text')
      .attr('x', d => (projection([d.lng, d.lat])?.[0] || 0) + 7)
      .attr('y', d => (projection([d.lng, d.lat])?.[1] || 0) + 4)
      .attr('fill', config.textColor)
      .style('font-family', config.fontFamily)
      .style('font-weight', 'bold')
      .style('font-size', `${config.fontSize}px`)
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 4px rgba(255,255,255,0.8)');

    labels.each(function(d) {
      const el = d3.select(this);
      el.append('tspan').text(d.name);
      if (d.note) {
        el.append('tspan')
          .attr('x', (projection([d.lng, d.lat])?.[0] || 0) + 7)
          .attr('dy', config.fontSize)
          .attr('font-weight', 'normal')
          .attr('font-size', `${config.fontSize * 0.8}px`)
          .attr('opacity', 0.7)
          .style('font-style', 'italic')
          .text(`(${d.note})`);
      }
    });

    svg.call(zoom as any);

    const handleResize = () => {
      if (!containerRef.current) return;
      svg.attr('width', containerRef.current.clientWidth)
         .attr('height', containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [worldData, selectedCountryIds, cities, config, nameMap, onCountryClick]);

  return (
    <div ref={containerRef} className="w-full max-w-full aspect-video bg-white overflow-hidden shadow-2xl rounded-xl border border-slate-200 relative">
      <svg ref={svgRef} className="w-full h-full touch-none focus:outline-none" />
      <div ref={tooltipRef} className="fixed hidden pointer-events-none bg-slate-800 text-white px-2 py-1 rounded text-xs z-50 shadow-lg border border-slate-700" />
      {!worldData && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mb-2"></div>
            <p className="text-slate-400 text-[10px] tracking-widest font-bold">同步地理信息...</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default MapView;
