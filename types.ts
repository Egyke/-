
export interface CountryData {
  id: string;
  name: string;
}

export interface MapFeature {
  type: string;
  id: string;
  properties: {
    name: string;
  };
  geometry: any;
}
