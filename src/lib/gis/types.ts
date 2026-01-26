/**
 * GIS Map Types
 * 
 * Type definitions for GIS map layers, features, and filters
 */

export interface LayerInfo {
  name: string;
  fileBase: string;
  geometryType?: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  featureCount?: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export type ViewBy = 'District' | 'Tehsil' | 'UC';

export interface FilterState {
  viewBy: ViewBy;
  district?: string;
  tehsil?: string;
  uc?: string;
  searchQuery?: string;
}

export interface LayerStyle {
  color: string;
  weight: number;
  opacity: number;
  fillColor?: string;
  fillOpacity?: number;
}

export interface LayerConfig {
  id: string;
  name: string;
  fileBase: string;
  type: 'district' | 'tehsil' | 'uc' | 'village' | 'road' | 'water' | 'other';
  style: LayerStyle;
  visible: boolean;
}
