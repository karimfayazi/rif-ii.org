'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layers, Search, Loader2 } from 'lucide-react';

interface LayerManifest {
  key: string;
  name: string;
  file: string;
  type: string;
}

interface Manifest {
  layers: LayerManifest[];
}

export default function TestingGisPage() {
  const router = useRouter();
  const [layers, setLayers] = useState<LayerManifest[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [layerData, setLayerData] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerRefsRef = useRef<Map<string, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load layers manifest
  useEffect(() => {
    async function loadLayers() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/gis/layers');
        
        if (!response.ok) {
          throw new Error(`Failed to load layers: ${response.statusText}`);
        }
        
        const manifest: Manifest = await response.json();
        setLayers(manifest.layers || []);
      } catch (err) {
        console.error('Error loading layers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load layers');
      } finally {
        setLoading(false);
      }
    }
    
    loadLayers();
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let linkElement: HTMLLinkElement | null = null;
    let scriptElement: HTMLScriptElement | null = null;
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    timer = setTimeout(() => {
      const mapContainer = document.getElementById('gis-map-container');
      if (!mapContainer || !isMounted) return;

      const initializeMap = () => {
        if (!isMounted || !mapContainer) return;

        const L = (window as any).L;
        if (!L) return;

        // Check if map already initialized
        if ((mapContainer as any)._leaflet_id) {
          return;
        }

        // Fix Leaflet icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map centered on Pakistan
        const map = L.map(mapContainer, {
          center: [30.3753, 69.3451],
          zoom: 7,
          zoomControl: true,
          attributionControl: true
        });

        mapInstanceRef.current = map;
        mapRef.current = mapContainer;

        // Add OpenStreetMap base layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        map.whenReady(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            setMapLoaded(true);
          }
        });
      };

      // Load Leaflet CSS and JS
      if (!(window as any).L) {
        const existingCSS = document.querySelector('link[href*="leaflet"]');
        if (!existingCSS) {
          linkElement = document.createElement('link');
          linkElement.rel = 'stylesheet';
          linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
          document.head.appendChild(linkElement);
        }

        scriptElement = document.createElement('script');
        scriptElement.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        scriptElement.async = true;
        scriptElement.onload = () => {
          if (isMounted) {
            setTimeout(initializeMap, 100);
          }
        };
        document.body.appendChild(scriptElement);
      } else {
        initializeMap();
      }
    }, 100);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
      layerRefsRef.current.clear();
    };
  }, []);

  // Load GeoJSON for active layers
  useEffect(() => {
    async function loadLayerGeoJson(key: string) {
      // Check if already loaded
      if (layerData.has(key)) return;

      try {
        const response = await fetch(`/api/gis/layer/${key}`);
        if (!response.ok) {
          throw new Error(`Failed to load layer: ${response.statusText}`);
        }
        
        const geoJson = await response.json();
        
        setLayerData(prev => {
          const updated = new Map(prev);
          updated.set(key, geoJson);
          return updated;
        });
      } catch (err) {
        console.error(`Error loading layer ${key}:`, err);
        setLayerData(prev => {
          const updated = new Map(prev);
          updated.set(key, null); // Mark as failed
          return updated;
        });
      }
    }

    activeLayers.forEach(key => {
      loadLayerGeoJson(key);
    });
  }, [activeLayers, layerData]);

  // Update map layers when active layers or layer data changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;

    // Remove all existing layers except base layer
    layerRefsRef.current.forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    layerRefsRef.current.clear();

    // Add active layers
    activeLayers.forEach((key) => {
      const geoJson = layerData.get(key);
      if (!geoJson) return; // Not loaded yet or failed

      // Get layer style based on type
      const layerInfo = layers.find(l => l.key === key);
      const layerType = layerInfo?.type || 'polygon';
      
      let defaultStyle: any = {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.2
      };

      if (layerType === 'polygon') {
        defaultStyle = {
          color: '#3388ff',
          weight: 2,
          opacity: 0.8,
          fillColor: '#3388ff',
          fillOpacity: 0.2
        };
      } else if (layerType === 'line') {
        defaultStyle = {
          color: '#ff7800',
          weight: 3,
          opacity: 0.8
        };
      } else if (layerType === 'point') {
        defaultStyle = {
          color: '#ff0000',
          weight: 1,
          opacity: 1,
          fillColor: '#ff0000',
          fillOpacity: 0.8,
          radius: 5
        };
      }

      const geoJsonLayer = L.geoJSON(geoJson, {
        style: defaultStyle,
        pointToLayer: (feature: any, latlng: any) => {
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: defaultStyle.fillColor || '#ff0000',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: (feature: any, layer: any) => {
          // Hover highlight
          layer.on({
            mouseover: (e: any) => {
              const layer = e.target;
              layer.setStyle({
                weight: 4,
                color: '#ff0000',
                fillOpacity: 0.4
              });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
              }
            },
            mouseout: (e: any) => {
              geoJsonLayer.resetStyle(e.target);
            }
          });

          // Popup on click
          if (feature.properties) {
            const props = feature.properties;
            const nameFields = ['NAME', 'Name', 'name', 'DISTRICT', 'District', 'TEHSIL', 'Tehsil', 'UC', 'uc'];
            let name = 'Feature';
            
            for (const field of nameFields) {
              if (props[field]) {
                name = String(props[field]);
                break;
              }
            }

            let popupContent = `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${name}</div>`;
            popupContent += '<div style="font-size: 12px; line-height: 1.6;">';
            
            // Show first 8 properties
            const propEntries = Object.entries(props).slice(0, 8);
            propEntries.forEach(([key, val]) => {
              if (!nameFields.includes(key)) {
                popupContent += `<div><strong>${key}:</strong> ${val}</div>`;
              }
            });
            popupContent += '</div>';
            
            layer.bindPopup(popupContent);
          }
        }
      });

      geoJsonLayer.addTo(map);
      layerRefsRef.current.set(key, geoJsonLayer);

      // Fit bounds to layer when first added
      if (geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });
      }
    });

    // Fit bounds to all visible layers
    const visibleLayers = Array.from(layerRefsRef.current.values()).filter(
      (layer) => layer.getBounds
    );

    if (visibleLayers.length > 0) {
      const group = L.featureGroup(visibleLayers);
      if (group.getBounds && group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, [activeLayers, layerData, layers]);

  // Toggle layer
  const toggleLayer = (key: string) => {
    setActiveLayers(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  // Filter layers by search
  const filteredLayers = layers.filter(layer =>
    layer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    layer.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testing GIS Maps</h1>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 mb-1">Error</div>
          <div className="text-sm text-red-600">{error}</div>
          {error.includes('Manifest not found') && (
            <div className="text-sm text-red-600 mt-2">
              Please run <code className="bg-red-100 px-1 rounded">npm run gis:convert</code> to generate GeoJSON files.
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex h-[calc(100vh-12rem)]">
          {/* Left Panel - Layer Control */}
          <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0b4d2b]" />
                Layer Control
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Layers
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search layers..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
                  />
                </div>
              </div>

              {/* Layer List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layers ({activeLayers.size} active)
                </label>
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#0b4d2b]" />
                      <span className="ml-2 text-sm text-gray-600">Loading layers...</span>
                    </div>
                  ) : filteredLayers.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No layers found</div>
                  ) : (
                    filteredLayers.map((layer) => {
                      const isActive = activeLayers.has(layer.key);
                      const isLoaded = layerData.has(layer.key);
                      const isLoading = activeLayers.has(layer.key) && !isLoaded && layerData.get(layer.key) !== null;

                      return (
                        <label
                          key={layer.key}
                          className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleLayer(layer.key)}
                            className="mt-1 h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {layer.name}
                            </div>
                            {isLoading && (
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Loading...
                              </div>
                            )}
                            <div className="text-xs text-gray-500 capitalize mt-0.5">
                              {layer.type}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative min-h-[400px]">
            <div 
              id="gis-map-container" 
              className="w-full h-full absolute inset-0" 
              style={{ zIndex: 1, minHeight: '400px' }} 
            />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b] mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
