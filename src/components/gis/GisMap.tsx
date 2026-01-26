'use client';

/**
 * GIS Map Component
 * 
 * Professional GIS map viewer with:
 * - Multiple layer support with checkboxes
 * - Filter by District/Tehsil/UC
 * - Search functionality
 * - Dynamic layer loading from shapefiles
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LayerInfo, ViewBy, FilterState, GeoJSONFeatureCollection } from '@/lib/gis/types';

interface GisMapProps {
  className?: string;
}

interface LayerData {
  info: LayerInfo;
  geoJson: GeoJSONFeatureCollection | null;
  loading: boolean;
  error: string | null;
}

// Helper to get attribute values from GeoJSON
function getAttributeValues(
  geoJson: GeoJSONFeatureCollection,
  attributeName: string
): string[] {
  const values = new Set<string>();
  
  geoJson.features.forEach((feature) => {
    if (feature.properties && feature.properties[attributeName]) {
      const value = String(feature.properties[attributeName]).trim();
      if (value) {
        values.add(value);
      }
    }
  });
  
  return Array.from(values).sort();
}

// Try common attribute name variants
function findAttributeName(
  geoJson: GeoJSONFeatureCollection,
  variants: string[]
): string | null {
  for (const variant of variants) {
    const values = getAttributeValues(geoJson, variant);
    if (values.length > 0) {
      return variant;
    }
  }
  return null;
}

// Get layer style based on type
function getLayerStyle(layerName: string): {
  color: string;
  weight: number;
  fillColor?: string;
  fillOpacity: number;
  opacity: number;
} {
  const nameLower = layerName.toLowerCase();
  
  if (nameLower.includes('district')) {
    return {
      color: '#1e40af',
      weight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      opacity: 0.8
    };
  } else if (nameLower.includes('tehsil')) {
    return {
      color: '#059669',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.15,
      opacity: 0.8
    };
  } else if (nameLower.includes('uc') || nameLower.includes('union')) {
    return {
      color: '#7c3aed',
      weight: 1.5,
      fillColor: '#8b5cf6',
      fillOpacity: 0.1,
      opacity: 0.7
    };
  } else if (nameLower.includes('village')) {
    return {
      color: '#dc2626',
      weight: 1,
      fillColor: '#ef4444',
      fillOpacity: 0.1,
      opacity: 0.6
    };
  } else if (nameLower.includes('road')) {
    return {
      color: '#f59e0b',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0
    };
  } else if (nameLower.includes('water')) {
    return {
      color: '#0284c7',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.2,
      opacity: 0.8
    };
  }
  
  // Default style
  return {
    color: '#6b7280',
    weight: 2,
    fillColor: '#9ca3af',
    fillOpacity: 0.1,
    opacity: 0.7
  };
}

export default function GisMap({ className = '' }: GisMapProps) {
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [layerData, setLayerData] = useState<Map<string, LayerData>>(new Map());
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterState, setFilterState] = useState<FilterState>({
    viewBy: 'District',
    district: undefined,
    tehsil: undefined,
    uc: undefined,
    searchQuery: ''
  });

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [tehsilOptions, setTehsilOptions] = useState<string[]>([]);
  const [ucOptions, setUcOptions] = useState<string[]>([]);
  
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Map<string, any>>(new Map());

  // Load layer list
  useEffect(() => {
    async function loadLayers() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/gis/list');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to load layers');
        }
        
        setLayers(data.layers || []);
        
        // Initialize layer data map
        const newLayerData = new Map<string, LayerData>();
        (data.layers || []).forEach((layer: LayerInfo) => {
          newLayerData.set(layer.name, {
            info: layer,
            geoJson: null,
            loading: false,
            error: null
          });
        });
        setLayerData(newLayerData);
        
        setError(null);
      } catch (err) {
        console.error('Error loading layers:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load layers';
        setError(errorMessage);
        // Still show the UI even if there's an error
        setLayers([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadLayers();
  }, []);

  // Load GeoJSON for active layers
  useEffect(() => {
    async function loadLayerGeoJson(layerName: string) {
      setLayerData(prev => {
        const current = prev.get(layerName);
        if (!current || current.geoJson || current.loading) {
          return prev; // Already loaded or loading
        }

        const updated = new Map(prev);
        const layer = updated.get(layerName);
        if (layer) {
          updated.set(layerName, { ...layer, loading: true, error: null });
        }
        return updated;
      });

      try {
        const response = await fetch(`/api/gis/layers?name=${encodeURIComponent(layerName)}`);
        if (!response.ok) {
          throw new Error(`Failed to load layer: ${response.statusText}`);
        }
        
        const geoJson: GeoJSONFeatureCollection = await response.json();
        
        setLayerData(prev => {
          const updated = new Map(prev);
          const layer = updated.get(layerName);
          if (layer) {
            updated.set(layerName, { ...layer, geoJson, loading: false });
          }
          return updated;
        });
      } catch (err) {
        console.error(`Error loading layer ${layerName}:`, err);
        setLayerData(prev => {
          const updated = new Map(prev);
          const layer = updated.get(layerName);
          if (layer) {
            updated.set(layerName, {
              ...layer,
              loading: false,
              error: err instanceof Error ? err.message : 'Failed to load'
            });
          }
          return updated;
        });
      }
    }

    activeLayers.forEach(layerName => {
      loadLayerGeoJson(layerName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers]);

  // Update filter options based on loaded layers
  useEffect(() => {
    const districtLayer = Array.from(layerData.values()).find(
      ld => ld.info.name.toLowerCase().includes('district') && ld.geoJson
    );
    const tehsilLayer = Array.from(layerData.values()).find(
      ld => ld.info.name.toLowerCase().includes('tehsil') && ld.geoJson
    );
    const ucLayer = Array.from(layerData.values()).find(
      ld => (ld.info.name.toLowerCase().includes('uc') || ld.info.name.toLowerCase().includes('union')) && ld.geoJson
    );

    if (districtLayer?.geoJson) {
      const attrName = findAttributeName(districtLayer.geoJson, [
        'DISTRICT', 'District', 'district', 'NAME', 'Name', 'name', 'ADM2_EN'
      ]);
      if (attrName) {
        setDistrictOptions(getAttributeValues(districtLayer.geoJson, attrName));
      }
    }

    if (tehsilLayer?.geoJson) {
      const attrName = findAttributeName(tehsilLayer.geoJson, [
        'TEHSIL', 'Tehsil', 'tehsil', 'NAME', 'Name', 'name'
      ]);
      if (attrName) {
        let tehsils = getAttributeValues(tehsilLayer.geoJson, attrName);
        // Filter by district if selected
        if (filterState.district && tehsilLayer.geoJson) {
          const districtAttr = findAttributeName(tehsilLayer.geoJson, [
            'DISTRICT', 'District', 'district'
          ]);
          if (districtAttr) {
            tehsils = tehsilLayer.geoJson.features
              .filter(f => f.properties?.[districtAttr] === filterState.district)
              .map(f => String(f.properties?.[attrName || '']).trim())
              .filter(Boolean);
            tehsils = Array.from(new Set(tehsils)).sort();
          }
        }
        setTehsilOptions(tehsils);
      }
    }

    if (ucLayer?.geoJson) {
      const attrName = findAttributeName(ucLayer.geoJson, [
        'UC', 'uc', 'UNION', 'Union', 'union', 'NAME', 'Name', 'name'
      ]);
      if (attrName) {
        let ucs = getAttributeValues(ucLayer.geoJson, attrName);
        // Filter by tehsil if selected
        if (filterState.tehsil && ucLayer.geoJson) {
          const tehsilAttr = findAttributeName(ucLayer.geoJson, [
            'TEHSIL', 'Tehsil', 'tehsil'
          ]);
          if (tehsilAttr) {
            ucs = ucLayer.geoJson.features
              .filter(f => f.properties?.[tehsilAttr] === filterState.tehsil)
              .map(f => String(f.properties?.[attrName || '']).trim())
              .filter(Boolean);
            ucs = Array.from(new Set(ucs)).sort();
          }
        }
        setUcOptions(ucs);
      }
    }
  }, [layerData, filterState.district, filterState.tehsil]);

  // Filter and highlight features based on filter state
  const getFilteredFeatures = (geoJson: GeoJSONFeatureCollection, layerName: string) => {
    if (!filterState.district && !filterState.tehsil && !filterState.uc && !filterState.searchQuery) {
      return geoJson.features;
    }

    const nameLower = layerName.toLowerCase();
    let filtered = geoJson.features;

    // Filter by district
    if (filterState.district) {
      const districtAttr = findAttributeName(geoJson, [
        'DISTRICT', 'District', 'district', 'ADM2_EN'
      ]);
      if (districtAttr) {
        filtered = filtered.filter(f => f.properties?.[districtAttr] === filterState.district);
      }
    }

    // Filter by tehsil
    if (filterState.tehsil) {
      const tehsilAttr = findAttributeName(geoJson, [
        'TEHSIL', 'Tehsil', 'tehsil', 'NAME', 'Name', 'name'
      ]);
      if (tehsilAttr) {
        filtered = filtered.filter(f => f.properties?.[tehsilAttr] === filterState.tehsil);
      }
    }

    // Filter by UC
    if (filterState.uc) {
      const ucAttr = findAttributeName(geoJson, [
        'UC', 'uc', 'UNION', 'Union', 'union', 'NAME', 'Name', 'name'
      ]);
      if (ucAttr) {
        filtered = filtered.filter(f => f.properties?.[ucAttr] === filterState.uc);
      }
    }

    // Search filter
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(f => {
        if (!f.properties) return false;
        return Object.values(f.properties).some(val =>
          String(val).toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  // Toggle layer visibility
  const toggleLayer = (layerName: string) => {
    setActiveLayers(prev => {
      const updated = new Set(prev);
      if (updated.has(layerName)) {
        updated.delete(layerName);
      } else {
        updated.add(layerName);
      }
      return updated;
    });
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof FilterState, value: any) => {
    setFilterState(prev => {
      const updated = { ...prev, [field]: value };
      // Reset dependent filters
      if (field === 'viewBy') {
        updated.district = undefined;
        updated.tehsil = undefined;
        updated.uc = undefined;
      } else if (field === 'district') {
        updated.tehsil = undefined;
        updated.uc = undefined;
      } else if (field === 'tehsil') {
        updated.uc = undefined;
      }
      return updated;
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let linkElement: HTMLLinkElement | null = null;
    let scriptElement: HTMLScriptElement | null = null;
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    // Wait a bit for the container to be rendered
    timer = setTimeout(() => {
      const mapContainer = document.getElementById('gis-map-container');
      if (!mapContainer) {
        console.warn('GIS map container not found');
        return;
      }

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

        // Initialize map
        const map = L.map(mapContainer, {
          center: [32.0, 70.5],
          zoom: 8,
          zoomControl: true,
          attributionControl: true
        });

        mapRef.current = map;

        // Add base layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        map.whenReady(() => {
          if (isMounted && mapRef.current) {
            mapRef.current.invalidateSize();
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
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapRef.current = null;
      }
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
      layerRefs.current.clear();
    };
  }, []);

  // Update map layers when active layers or filter state changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapRef.current;

    // Remove all existing layers except base layer
    layerRefs.current.forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    layerRefs.current.clear();

    // Add active layers
    activeLayers.forEach((layerName) => {
      const layer = layerData.get(layerName);
      if (!layer?.geoJson) return;

      const filteredFeatures = getFilteredFeatures(layer.geoJson, layerName);
      const style = getLayerStyle(layerName);

      const geoJsonLayer = L.geoJSON(
        {
          type: 'FeatureCollection',
          features: filteredFeatures
        },
        {
          style: (feature: any) => {
            const isHighlighted =
              (filterState.district && feature?.properties?.DISTRICT === filterState.district) ||
              (filterState.tehsil && feature?.properties?.TEHSIL === filterState.tehsil) ||
              (filterState.uc && feature?.properties?.UC === filterState.uc);

            return {
              ...style,
              weight: isHighlighted ? style.weight + 1 : style.weight,
              color: isHighlighted ? '#dc2626' : style.color,
              fillOpacity: isHighlighted ? 0.3 : style.fillOpacity || 0.1
            };
          },
          pointToLayer: (feature: any, latlng: any) => {
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: style.color,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            });
          },
          onEachFeature: (feature: any, layer: any) => {
            if (feature.properties) {
              const props = feature.properties;
              const name =
                props.NAME || props.Name || props.name || props.DISTRICT || props.TEHSIL || props.UC || 'Feature';
              const popupContent = `
                <div style="font-weight: bold; margin-bottom: 5px;">${name}</div>
                <div style="font-size: 12px; line-height: 1.4;">
                  ${Object.entries(props)
                    .slice(0, 5)
                    .map(([key, val]) => `<div><strong>${key}:</strong> ${val}</div>`)
                    .join('')}
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }
        }
      );

      geoJsonLayer.addTo(map);
      layerRefs.current.set(layerName, geoJsonLayer);
    });

    // Fit bounds to visible features
    const visibleLayers = Array.from(layerRefs.current.values()).filter(
      (layer) => layer.getBounds
    );

    if (visibleLayers.length > 0) {
      const group = L.featureGroup(visibleLayers);
      if (group.getBounds && group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, [activeLayers, layerData, filterState]);

  const filteredLayers = useMemo(() => {
    return layers.filter(layer => {
      if (!filterState.searchQuery) return true;
      return layer.name.toLowerCase().includes(filterState.searchQuery.toLowerCase());
    });
  }, [layers, filterState.searchQuery]);

  return (
    <div className={`flex h-[calc(100vh-12rem)] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 bg-gray-50 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#0b4d2b]" />
            Layer Control
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
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
                value={filterState.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                placeholder="Search layers..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
              />
            </div>
          </div>

          {/* View By Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View By
            </label>
            <select
              value={filterState.viewBy}
              onChange={(e) => handleFilterChange('viewBy', e.target.value as ViewBy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
            >
              <option value="District">District</option>
              <option value="Tehsil">Tehsil</option>
              <option value="UC">UC</option>
            </select>
          </div>

          {/* District Filter */}
          {filterState.viewBy === 'District' && districtOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <select
                value={filterState.district || ''}
                onChange={(e) => handleFilterChange('district', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
              >
                <option value="">All Districts</option>
                {districtOptions.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tehsil Filter */}
          {filterState.viewBy === 'Tehsil' && tehsilOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tehsil
              </label>
              <select
                value={filterState.tehsil || ''}
                onChange={(e) => handleFilterChange('tehsil', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
              >
                <option value="">All Tehsils</option>
                {tehsilOptions.map(tehsil => (
                  <option key={tehsil} value={tehsil}>{tehsil}</option>
                ))}
              </select>
            </div>
          )}

          {/* UC Filter */}
          {filterState.viewBy === 'UC' && ucOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UC
              </label>
              <select
                value={filterState.uc || ''}
                onChange={(e) => handleFilterChange('uc', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0b4d2b]"
              >
                <option value="">All UCs</option>
                {ucOptions.map(uc => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm font-medium text-red-800 mb-1">Error Loading Layers</div>
              <div className="text-xs text-red-600">{error}</div>
              {error.includes('GIS_SHAPEFILES_DIR') && (
                <div className="text-xs text-red-600 mt-2">
                  Please set the GIS_SHAPEFILES_DIR environment variable in .env.local
                </div>
              )}
            </div>
          )}

          {/* Layer List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layers ({activeLayers.size} active)
            </label>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-gray-500">Loading layers...</div>
              ) : !error && filteredLayers.length === 0 ? (
                <div className="text-sm text-gray-500">No layers found</div>
              ) : !error ? (
                filteredLayers.map((layer) => {
                  const layerDataItem = layerData.get(layer.name);
                  const isActive = activeLayers.has(layer.name);
                  const isLoading = layerDataItem?.loading;
                  const hasError = layerDataItem?.error;

                  return (
                    <label
                      key={layer.name}
                      className="flex items-start space-x-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleLayer(layer.name)}
                        className="mt-1 h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {layer.name}
                        </div>
                        {isLoading && (
                          <div className="text-xs text-gray-500">Loading...</div>
                        )}
                        {hasError && (
                          <div className="text-xs text-red-600">{hasError}</div>
                        )}
                        {layer.geometryType && (
                          <div className="text-xs text-gray-500 capitalize">
                            {layer.geometryType}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000] bg-white border border-gray-300 rounded-r-lg p-2 shadow-md hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Map Area */}
      <div className="flex-1 relative min-h-[400px]">
        <div 
          id="gis-map-container" 
          className="w-full h-full absolute inset-0" 
          style={{ zIndex: 1, minHeight: '400px' }} 
        />
        {!mapRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
